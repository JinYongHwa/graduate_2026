<template>
  <v-container style="max-width: 900px">
    <div>
      <input id="pose-photo" type="file" accept="image/jpeg,image/png,image/webp" :disabled="loading"
        @change="selectPhoto" />

      <v-btn color="primary" @click="analyze">포즈 분석</v-btn>
    </div>



    <div v-if="photo" class="image-preview mt-4">
      <img :src="preview" alt="선택한 포즈 사진" />
      <canvas ref="canvas" :width="photo.width" :height="photo.height" aria-label="포즈 분석 오버레이" />
    </div>

  </v-container>
</template>

<script>
import { markRaw } from 'vue'
import * as poseDetection from '@tensorflow-models/pose-detection'
import { prepareTensorFlow, readImage, drawOverlay, saveImage } from '../lib/image'

let detector

export default {
  data() {
    return {
      photo: null, preview: '',

    }
  },
  methods: {
    async selectPhoto(event) {
      this.photo = null
      this.preview = ''
      this.finished = false
      this.error = ''
      const file = event.target.files[0]
      if (!file) return

      const image = await readImage(file)
      if (this.disposed) return
      this.preview = image.toDataURL('image/png')
      this.photo = markRaw(image)

    },
    async analyze() {

      this.error = ''
      this.finished = false
      drawOverlay(this.$refs.canvas, this.photo)
      await prepareTensorFlow()
      // 1. 로컬에 저장한 MoveNet 모델을 한 번만 로드합니다.
      if (!detector) {
        detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {
          modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
          modelUrl: '/models/pose/model.json', enableSmoothing: false
        })
      }
      if (this.disposed) return
      // 2. 이전 사진의 상태를 초기화하고 새 사진에서 관절 좌표 JSON을 얻습니다.
      detector.reset()
      const poses = await detector.estimatePoses(this.photo, { flipHorizontal: false })
      if (this.disposed) return
      // 3. 모델 결과를 사진 위의 투명 canvas에 그립니다.
      const visibleCount = drawOverlay(this.$refs.canvas, this.photo, poses, 'pose')
    },

  }
}
</script>

<style scoped lang="less">
.image-preview {
  position: relative;
  display: inline-block;
  max-width: 100%;
  line-height: 0;

  img {
    display: block;
    max-width: 100%;
    height: auto;
    border-radius: 8px;
  }

  canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }
}
</style>
