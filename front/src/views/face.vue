<template>
  <v-container style="max-width: 900px">
    <input id="face-photo" class="d-block mb-4" type="file" aria-label="파일 선택" accept="image/jpeg,image/png,image/webp"
      :disabled="loading" @change="selectPhoto" />
    <div class="d-flex" style="gap: 12px">
      <v-btn color="primary" :disabled="!photo || loading" @click="analyze('detection')">얼굴 분석</v-btn>
      <v-btn color="primary" :disabled="!photo || loading" @click="analyze('landmarks')">얼굴 랜드마크 분석</v-btn>
    </div>
    <v-alert v-if="error" type="error" class="mt-4">{{ error }}</v-alert>
    <div v-if="photo" class="image-preview mt-4">
      <img :src="preview" alt="선택한 얼굴 사진" />
      <canvas ref="canvas" :width="photo.width" :height="photo.height" aria-label="얼굴 분석 오버레이" />
    </div>
  </v-container>
</template>

<script>
import { markRaw } from 'vue'
import * as faceDetection from '@tensorflow-models/face-detection'
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection'
import { prepareTensorFlow, readImage, drawOverlay, estimatePhotoFaces } from '../lib/image'


// 모델은 한 번만 읽고 다음 사진에서도 재사용합니다.
let faceDetector, landmarkDetector

export default {
  data() {
    return { photo: null, preview: '' }
  },
  methods: {
    async selectPhoto(event) {

      const file = event.target.files[0]
      if (!file) return
      const image = await readImage(file)

      this.preview = image.toDataURL('image/png')
      this.photo = markRaw(image)
    },
    async analyze(mode) {
      if (!this.photo || this.loading) return
      const photo = this.photo
      await prepareTensorFlow()

      drawOverlay(this.$refs.canvas, photo)
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

      const faces = await estimatePhotoFaces(photo, faceDetector,
        mode === 'landmarks' ? landmarkDetector : null)
      console.log(faces)

      drawOverlay(this.$refs.canvas, photo, faces, mode === 'detection' ? 'face' : 'landmarks')
    }
  },

}
</script>

<style scoped>
.image-preview {
  position: relative;
  display: inline-block;
  max-width: 100%;
  line-height: 0;
}

.image-preview img {
  display: block;
  max-width: 100%;
  height: auto;
  border-radius: 8px;
}

.image-preview canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
</style>
