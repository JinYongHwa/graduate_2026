// 사진 읽기와 분석 결과 그리기를 두 예제에서 함께 사용합니다.
import * as tf from '@tensorflow/tfjs'
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection'
import * as poseDetection from '@tensorflow-models/pose-detection'

const MIN_POSE_SCORE = 0.3

export async function prepareTensorFlow() {
    if (!tf.getBackend()) {
        try {
            if (!await tf.setBackend('webgl')) await tf.setBackend('cpu')
        } catch { await tf.setBackend('cpu') }
    }
    await tf.ready()
}

export async function readImage(file) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        throw new Error('JPG, PNG 또는 WebP 사진을 선택해 주세요.')
    }
    if (!file.size || file.size > 20 * 1024 * 1024) {
        throw new Error('사진은 내용이 있는 20MB 이하 파일로 선택해 주세요.')
    }
    const url = URL.createObjectURL(file)
    try {
        const photo = new Image()
        photo.src = url
        await photo.decode()
        // 모델 입력과 결과 화면이 같은 좌표를 사용하도록 한 번만 축소합니다.
        const scale = Math.min(1, 1200 / Math.max(photo.naturalWidth, photo.naturalHeight))
        const image = document.createElement('canvas')
        image.width = Math.max(1, Math.round(photo.naturalWidth * scale))
        image.height = Math.max(1, Math.round(photo.naturalHeight * scale))
        image.getContext('2d').drawImage(photo, 0, 0, image.width, image.height)
        return image
    } catch {
        throw new Error('사진을 읽을 수 없습니다. 다른 파일로 시도해 주세요.')
    } finally {
        URL.revokeObjectURL(url)
    }
}

function drawPoint(context, point, radius) {
    context.fillStyle = '#ff4081'
    context.beginPath()
    context.arc(point.x, point.y, radius, 0, 2 * Math.PI)
    context.fill()
}

// output은 estimateFaces() 또는 estimatePoses()가 반환한 배열입니다.
// kind: 'face', 'landmarks', 'pose'. 반환값은 포즈에서 표시한 점의 수입니다.
export function drawOverlay(canvas, image, output = [], kind = '') {
    canvas.width = image.width
    canvas.height = image.height
    const context = canvas.getContext('2d')

    if (kind === 'face' || kind === 'landmarks') {
        for (const face of output) {
            context.strokeStyle = '#00e676'
            context.lineWidth = 3
            context.strokeRect(face.box.xMin, face.box.yMin, face.box.width, face.box.height)
            if (kind === 'landmarks') {
                context.strokeStyle = 'rgba(0, 229, 255, 0.45)'
                context.lineWidth = 1
                for (const [a, b] of faceLandmarksDetection.util.getAdjacentPairs(
                    faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh
                )) {
                    const start = face.keypoints[a], end = face.keypoints[b]
                    context.beginPath()
                    context.moveTo(start.x, start.y)
                    context.lineTo(end.x, end.y)
                    context.stroke()
                }
            }
            face.keypoints.forEach(point => drawPoint(context, point, kind === 'face' ? 4 : 1.5))
        }
        return
    }

    if (kind === 'pose') {
        const pose = output[0]
        const visible = pose ? pose.keypoints.filter(point => point.score >= MIN_POSE_SCORE) : []
        if (visible.length < 5) return 0
        context.strokeStyle = '#00e676'
        context.lineWidth = 3
        for (const [a, b] of poseDetection.util.getAdjacentPairs(poseDetection.SupportedModels.MoveNet)) {
            const start = pose.keypoints[a], end = pose.keypoints[b]
            if (start.score < MIN_POSE_SCORE || end.score < MIN_POSE_SCORE) continue
            context.beginPath()
            context.moveTo(start.x, start.y)
            context.lineTo(end.x, end.y)
            context.stroke()
        }
        visible.forEach(point => drawPoint(context, point, 4))
        return visible.length
    }
}

export function saveImage(image, overlay, filename) {
    const canvas = document.createElement('canvas')
    canvas.width = image.width
    canvas.height = image.height
    const context = canvas.getContext('2d')
    context.drawImage(image, 0, 0)
    context.drawImage(overlay, 0, 0)
    const link = document.createElement('a')
    link.download = filename
    link.href = canvas.toDataURL('image/png')
    link.click()

}

// 긴 사진은 얼굴이 작게 축소되지 않도록 겹치는 정사각형 영역에서도 찾습니다.
function projectFace(face, region, cropSize) {
    const scale = region.size / cropSize
    const box = face.box
    return {
        ...face,
        box: {
            xMin: region.x + box.xMin * scale,
            yMin: region.y + box.yMin * scale,
            xMax: region.x + box.xMax * scale,
            yMax: region.y + box.yMax * scale,
            width: box.width * scale,
            height: box.height * scale
        },
        keypoints: face.keypoints.map(point => ({
            ...point,
            x: region.x + point.x * scale,
            y: region.y + point.y * scale
        }))
    }
}

function overlap(a, b) {
    const width = Math.max(0, Math.min(a.xMax, b.xMax) - Math.max(a.xMin, b.xMin))
    const height = Math.max(0, Math.min(a.yMax, b.yMax) - Math.max(a.yMin, b.yMin))
    return width * height / Math.min(a.width * a.height, b.width * b.height)
}

export async function estimatePhotoFaces(photo, faceDetector, landmarkDetector = null) {
    const shortSide = Math.min(photo.width, photo.height)
    const longSide = Math.max(photo.width, photo.height)
    const candidates = []

    if (longSide / shortSide > 1.5) {
        const tile = document.createElement('canvas')
        tile.width = tile.height = shortSide
        const context = tile.getContext('2d')
        const steps = Math.ceil((longSide - shortSide) / (shortSide * 0.75))
        for (let i = 0; i <= steps; i++) {
            const offset = (longSide - shortSide) * i / steps
            const x = photo.width > photo.height ? offset : 0
            const y = photo.height > photo.width ? offset : 0
            context.drawImage(photo, x, y, shortSide, shortSide, 0, 0, shortSide, shortSide)
            const found = await faceDetector.estimateFaces(tile, { flipHorizontal: false })
            candidates.push(...found.map(face => projectFace(face, { x, y, size: shortSide }, shortSide)))
        }
    }

    candidates.push(...await faceDetector.estimateFaces(photo, { flipHorizontal: false }))
    const unique = []
    for (const face of candidates) {
        if (!unique.some(other => overlap(face.box, other.box) > 0.6)) unique.push(face)
    }

    // 탐지된 얼굴 주변만 확대해 한 번 더 분석하고 원본 사진 좌표로 되돌립니다.
    const crop = document.createElement('canvas')
    const faces = []
    for (const candidate of unique.slice(0, 5)) {
        const box = candidate.box
        const size = Math.max(box.width, box.height) * 1.5
        const region = {
            x: (box.xMin + box.xMax - size) / 2,
            y: (box.yMin + box.yMax - size) / 2,
            size
        }
        crop.width = crop.height = Math.max(1, Math.min(512, Math.ceil(size)))
        const context = crop.getContext('2d')
        context.fillStyle = '#000'
        context.fillRect(0, 0, crop.width, crop.height)
        const scale = crop.width / size
        context.drawImage(photo, -region.x * scale, -region.y * scale,
            photo.width * scale, photo.height * scale)

        const detector = landmarkDetector || faceDetector
        const found = await detector.estimateFaces(crop, {
            flipHorizontal: false, staticImageMode: true
        })
        const centerX = (box.xMin + box.xMax) / 2
        const centerY = (box.yMin + box.yMax) / 2
        const matches = found.map(face => projectFace(face, region, crop.width))
            .filter(face => {
                const x = (face.box.xMin + face.box.xMax) / 2
                const y = (face.box.yMin + face.box.yMax) / 2
                return x >= box.xMin && x <= box.xMax && y >= box.yMin && y <= box.yMax
            })
            .sort((a, b) => {
                const distance = face => ((face.box.xMin + face.box.xMax) / 2 - centerX) ** 2
                    + ((face.box.yMin + face.box.yMax) / 2 - centerY) ** 2
                return distance(a) - distance(b)
            })
        if (matches.length) faces.push(matches[0])
        else if (!landmarkDetector) faces.push(candidate)
    }
    return faces
}
