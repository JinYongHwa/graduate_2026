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
