// 전체 사진에서는 얼굴 위치만 찾고, 얼굴 영역을 다시 분석해 정확도를 높입니다.
export function faceRegion(box) {
  const size = Math.max(box.width, box.height) * 1.5
  return {
    x: (box.xMin + box.xMax - size) / 2,
    y: (box.yMin + box.yMax - size) / 2,
    size
  }
}

export function projectFace(face, region, canvasSize) {
  const scale = region.size / canvasSize
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
      y: region.y + point.y * scale,
      ...(point.z == null ? {} : { z: point.z * scale })
    }))
  }
}

async function detectPhotoFaces(photo, detector) {
  const whole = await detector.estimateFaces(photo, { flipHorizontal: false })
  const size = Math.min(photo.width, photo.height)
  const length = Math.max(photo.width, photo.height)
  if (length / size <= 1.5) return whole
  // 가로·세로로 긴 사진은 정사각형 영역을 겹쳐 탐지합니다.
  // 전체 사진을 정사각형 입력으로 줄일 때 작은 얼굴이 사라지는 것을 방지합니다.
  const tile = document.createElement('canvas')
  tile.width = tile.height = size
  const steps = Math.ceil((length - size) / (size * 0.75))
  const candidates = []
  for (let i = 0; i <= steps; i++) {
    const offset = (length - size) * i / steps
    const x = photo.width > photo.height ? offset : 0
    const y = photo.height > photo.width ? offset : 0
    tile.getContext('2d').drawImage(photo, x, y, size, size, 0, 0, size, size)
    const results = await detector.estimateFaces(tile, { flipHorizontal: false })
    candidates.push(...results.map(face => projectFace(face, { x, y, size }, size)))
  }
  const unique = []
  for (const face of [...candidates, ...whole]) {
    const duplicate = unique.some(other => {
      const a = face.box, b = other.box
      const intersection = Math.max(0, Math.min(a.xMax, b.xMax) - Math.max(a.xMin, b.xMin))
        * Math.max(0, Math.min(a.yMax, b.yMax) - Math.max(a.yMin, b.yMin))
      return intersection / Math.min(a.width * a.height, b.width * b.height) > 0.6
    })
    if (!duplicate) unique.push(face)
  }
  return unique.slice(0, 5)
}

export async function estimatePhotoFaces(photo, faceDetector, landmarkDetector = null) {
  const candidates = await detectPhotoFaces(photo, faceDetector)
  const crop = document.createElement('canvas')
  const faces = []
  for (const candidate of candidates) {
    const region = faceRegion(candidate.box)
    // 사진 끝에서도 정사각형을 유지하고 이미지 밖의 부분은 검정으로 채웁니다.
    crop.width = crop.height = Math.max(1, Math.min(512, Math.ceil(region.size)))
    const context = crop.getContext('2d')
    context.fillStyle = '#000'
    context.fillRect(0, 0, crop.width, crop.height)
    const scale = crop.width / region.size
    context.drawImage(photo, -region.x * scale, -region.y * scale,
      photo.width * scale, photo.height * scale)
    const detector = landmarkDetector || faceDetector
    const results = await detector.estimateFaces(crop, {
      flipHorizontal: false, staticImageMode: true
    })
    // 이웃 얼굴이 포함돼도 원래 후보에 가장 가까운 얼굴 하나만 선택합니다.
    const projected = results.map(face => projectFace(face, region, crop.width))
    const centerX = (candidate.box.xMin + candidate.box.xMax) / 2
    const centerY = (candidate.box.yMin + candidate.box.yMax) / 2
    const distance = face => {
      const box = face.box
      return ((box.xMin + box.xMax) / 2 - centerX) ** 2
        + ((box.yMin + box.yMax) / 2 - centerY) ** 2
    }
    const matches = projected.filter(({ box }) => {
      const x = (box.xMin + box.xMax) / 2, y = (box.yMin + box.yMax) / 2
      return x >= candidate.box.xMin && x <= candidate.box.xMax
        && y >= candidate.box.yMin && y <= candidate.box.yMax
    })
    matches.sort((a, b) => distance(a) - distance(b))
    if (matches.length) faces.push(matches[0])
    else if (!landmarkDetector) faces.push(candidate)
  }
  return faces
}
