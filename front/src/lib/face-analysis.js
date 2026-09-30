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
