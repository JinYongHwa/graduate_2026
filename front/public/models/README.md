# 로컬 사진 분석 모델

`npm run models:download`로 공식 TensorFlow Hub 모델의 JSON과 가중치를 저장합니다.
이 폴더는 Vue가 그대로 제공하므로 브라우저는 모델을 `/models/.../model.json`에서 읽습니다.
저장 후 얼굴·포즈 추론에는 외부 모델 서버가 필요하지 않습니다.

| 폴더 | 모델 출처 |
| --- | --- |
| `face-detector` | [MediaPipe Face Detection short v1](https://tfhub.dev/mediapipe/tfjs-model/face_detection/short/1) |
| `face-landmarks` | [MediaPipe Face Mesh v1](https://tfhub.dev/mediapipe/tfjs-model/face_landmarks_detection/face_mesh/1) |
| `pose` | [MoveNet SinglePose Lightning v4](https://tfhub.dev/google/tfjs-model/movenet/singlepose/lightning/4) |
