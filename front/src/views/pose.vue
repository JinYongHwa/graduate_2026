<template>
  <v-container style="max-width: 900px">

    <input id="pose-photo" type="file" accept="image/jpeg,image/png,image/webp" :disabled="loading"
      @change="selectPhoto" />

    <v-btn color="primary" :disabled="!photo || loading" @click="analyze">포즈 분석</v-btn>
    <v-btn v-if="finished" variant="outlined" class="ml-3" @click="download">결과 이미지 저장</v-btn>
    <canvas v-show="photo" ref="canvas" aria-label="포즈 분석 사진" style="max-width: 100%; height: auto; border-radius: 8px" />

  </v-container>
</template>

<script>
import { markRaw } from 'vue'
import * as poseDetection from '@tensorflow-models/pose-detection'
import { prepareTensorFlow, readPhoto, drawPhoto, drawPoint, savePhoto } from '../lib/photo'

let detector
const MIN_SCORE = 0.3

export default {
  data() {
    return {
      photo: null, loading: false, finished: false, error: '', disposed: false,
      message: '전신 사진을 선택하고 포즈 분석을 눌러 주세요.'
    }
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
        drawPhoto(image, this.$refs.canvas)

      } catch (error) {
        this.error = error.message
      }
      finally { this.loading = false }
    },
    async analyze() {
      this.loading = true
      this.error = ''
      this.finished = false
      try {
        await prepareTensorFlow()
        // 1. 로컬에 저장한 MoveNet 모델을 한 번만 로드합니다.
        if (!detector) {
          detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {
            modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
            modelUrl: '/models/pose/model.json', enableSmoothing: false
          })
        }
        if (this.disposed) return
        const canvas = this.$refs.canvas
        drawPhoto(this.photo, canvas)
        // 2. 이전 사진의 상태를 초기화하고 새 사진에서 관절 좌표를 얻습니다.
        detector.reset()
        const poses = await detector.estimatePoses(canvas, { flipHorizontal: false })
        if (this.disposed) return
        const pose = poses[0]
        const visible = pose ? pose.keypoints.filter(point => point.score >= MIN_SCORE) : []
        if (visible.length < 5) {
          this.message = '포즈를 찾지 못했습니다. 한 사람의 전신이 선명하게 보이는 사진으로 시도해 주세요.'
          return
        }
        // 3. 양쪽 점의 신뢰도가 충분한 관절만 연결해 뼈대를 그립니다.
        const context = canvas.getContext('2d')
        context.strokeStyle = '#00e676'
        context.lineWidth = 3
        for (const [a, b] of poseDetection.util.getAdjacentPairs(poseDetection.SupportedModels.MoveNet)) {
          const start = pose.keypoints[a], end = pose.keypoints[b]
          if (start.score < MIN_SCORE || end.score < MIN_SCORE) continue
          context.beginPath()
          context.moveTo(start.x, start.y)
          context.lineTo(end.x, end.y)
          context.stroke()
        }
        visible.forEach(point => drawPoint(context, point, '#ff4081', 4))
        this.finished = true
        this.message = `분석 완료 · 17개 특징점 중 ${visible.length}개 표시 · 초록색은 연결선, 분홍색은 관절 위치입니다.`
      } catch (error) {
        console.error(error)
        this.error = '포즈 분석에 실패했습니다. 모델 파일과 브라우저의 그래픽 지원을 확인해 주세요.'
        this.message = '분석을 완료하지 못했습니다.'
      } finally { this.loading = false }
    },
    download() { savePhoto(this.$refs.canvas, 'pose-result.png') }
  },
  beforeUnmount() { this.disposed = true }
}
</script>
