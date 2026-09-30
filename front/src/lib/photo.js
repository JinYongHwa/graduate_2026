// 두 예제에서 공통으로 사용하는 사진 읽기와 Canvas 그리기입니다.
import * as tf from '@tensorflow/tfjs'

export async function prepareTensorFlow() {
  // GPU를 사용할 수 없는 브라우저에서는 CPU로 계산합니다.
  if (!tf.getBackend()) {
    try {
      if (!await tf.setBackend('webgl')) await tf.setBackend('cpu')
    } catch { await tf.setBackend('cpu') }
  }
  await tf.ready()
}

export async function readPhoto(file) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('JPG, PNG 또는 WebP 사진을 선택해 주세요.')
  }
  if (!file.size || file.size > 20 * 1024 * 1024) {
    throw new Error('사진은 내용이 있는 20MB 이하 파일로 선택해 주세요.')
  }
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    return image
  } catch {
    throw new Error('사진을 읽을 수 없습니다. 다른 파일로 시도해 주세요.')
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function drawPhoto(image, canvas) {
  // 큰 사진은 비율을 유지하면서 줄입니다. 추론과 표시가 같은 좌표계를 사용합니다.
  const scale = Math.min(1, 1200 / Math.max(image.naturalWidth, image.naturalHeight))
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
  canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height)
}

export function drawPoint(context, point, color, radius = 3) {
  context.fillStyle = color
  context.beginPath()
  context.arc(point.x, point.y, radius, 0, 2 * Math.PI)
  context.fill()
}

export function savePhoto(canvas, filename) {
  const link = document.createElement('a')
  link.download = filename
  link.href = canvas.toDataURL('image/png')
  link.click()
}
