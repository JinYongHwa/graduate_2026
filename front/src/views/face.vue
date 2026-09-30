<template>
  <v-container style="max-width: 900px">
    <input id="face-photo" class="d-block mb-4" type="file" aria-label="파일 선택"
      accept="image/jpeg,image/png,image/webp" :disabled="loading" @change="selectPhoto" />
    <div class="d-flex" style="gap: 12px">
      <v-btn color="primary" :disabled="!photo || loading" @click="analyze('detection')">얼굴 분석</v-btn>
      <v-btn color="primary" :disabled="!photo || loading" @click="analyze('landmarks')">얼굴 랜드마크 분석</v-btn>
    </div>
    <p v-if="error" class="mt-4" role="alert">{{ error }}</p>
    <canvas v-show="finished" ref="canvas" class="mt-4" aria-label="분석된 사진"
      style="display: block; max-width: 100%; height: auto; border-radius: 8px" />
  </v-container>
</template>

<script>
import { markRaw } from 'vue'
import * as faceDetection from '@tensorflow-models/face-detection'
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection'
import { prepareTensorFlow, readPhoto, drawPhoto, drawPoint } from '../lib/photo'
import { estimatePhotoFaces } from '../lib/face'

// 모델은 한 번만 읽고 다음 사진에서도 재사용합니다.
let faceDetector, landmarkDetector

export default {
  data() {
    return { photo: null, loading: false, finished: false, error: '', disposed: false }
  },
  methods: {
    async selectPhoto(event) {
      this.photo = null
      this.finished = false
      this.error = ''
      const file = event.target.files[0]
      if (!file) return
      this.loading = true
      try {
        const image = await readPhoto(file)
        if (this.disposed) return
        this.photo = markRaw(image)
      } catch (error) {
        this.error = error.message
      }
      finally { this.loading = false }
    },
    async analyze(mode) {
      this.loading = true
      this.error = ''
      this.finished = false
      try {
        await prepareTensorFlow()
        // 1. 분석 방법에 맞는 TensorFlow.js 모델을 준비합니다.
        if (!faceDetector) {
          faceDetector = await faceDetection.createDetector(faceDetection.SupportedModels.MediaPipeFaceDetector, {
            runtime: 'tfjs', modelType: 'short', maxFaces: 5,
            detectorModelUrl: '/models/face-detector/model.json'
          })
        }
        if (mode === 'landmarks' && !landmarkDetector) {
          landmarkDetector = await faceLandmarksDetection.createDetector(faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh, {
            runtime: 'tfjs', maxFaces: 5, refineLandmarks: false,
            detectorModelUrl: '/models/face-detector/model.json',
            landmarkModelUrl: '/models/face-landmarks/model.json'
          })
        }
        if (this.disposed) return
        const canvas = this.$refs.canvas
        drawPhoto(this.photo, canvas)
        // 2. 전체 사진에서 찾은 얼굴을 확대 분석하고 사진 좌표로 되돌립니다.
        const faces = await estimatePhotoFaces(canvas, faceDetector,
          mode === 'landmarks' ? landmarkDetector : null)
        if (this.disposed) return
        // 3. 반환된 좌표를 사진 위에 표시합니다.
        const context = canvas.getContext('2d')
        for (const face of faces) {
          context.strokeStyle = '#00e676'
          context.lineWidth = 3
          context.strokeRect(face.box.xMin, face.box.yMin, face.box.width, face.box.height)
          if (mode === 'landmarks') {
            context.strokeStyle = 'rgba(0, 229, 255, 0.45)'
            context.lineWidth = 1
            for (const [a, b] of faceLandmarksDetection.util.getAdjacentPairs(faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh)) {
              const start = face.keypoints[a], end = face.keypoints[b]
              context.beginPath()
              context.moveTo(start.x, start.y)
              context.lineTo(end.x, end.y)
              context.stroke()
            }
          }
          face.keypoints.forEach(point => drawPoint(context, point, '#ff4081', mode === 'detection' ? 4 : 1.5))
        }
        this.finished = true
        if (!faces.length) this.error = '얼굴을 찾지 못했습니다. 다른 사진으로 시도해 주세요.'
      } catch (error) {
        console.error(error)
        this.error = '얼굴 분석에 실패했습니다. 모델 파일과 브라우저의 그래픽 지원을 확인해 주세요.'
      } finally { this.loading = false }
    }
  },
  beforeUnmount() { this.disposed = true }
}
</script>
