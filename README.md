# 얼굴·포즈 사진 분석 예제

Python·Express·API 키 없이 **Vue와 브라우저만으로** 실행하는 사진 예제입니다.
사진을 선택하고 얼굴 분석 또는 얼굴 랜드마크 분석 버튼을 누르면 하단에 결과 사진이 표시됩니다. 포즈 화면에서는 결과를 PNG로 저장할 수 있습니다.

| 주소 | 분석 내용 | 코드 |
| --- | --- | --- |
| `/face` | 얼굴 탐지: 박스와 6개 점 / 얼굴 특징점: 468개 점과 연결선 | `front/src/views/face.vue` |
| `/pose` | 한 사람의 전신에서 17개 특징점과 뼈대 연결선 | `front/src/views/pose.vue` |

### 실행

사진 예제는 Vue 서버 하나만 켜면 됩니다. Node.js 22 이상을 사용하세요.
모델 파일은 이미 `front/public/models/`에 저장되어 있습니다.

```bash
cd front
npm install
npm run serve
```

[얼굴 분석](http://localhost:8080/face), [포즈 분석](http://localhost:8080/pose)을 열고 사진을 선택하세요.
JPG·PNG·WebP, 최대 20MB를 지원하며 사진을 최대 변 길이 1200px로 줄여 계산합니다.
얼굴은 정면이 크게 나온 사진, 포즈는 한 사람의 머리부터 발까지 보이는 사진을 준비하세요.
포즈는 신뢰도 30% 이상인 특징점만 표시합니다.

**사진은 서버로 업로드하지 않고 브라우저 안에서 읽고 분석합니다.** 모델도 localhost에서 읽습니다.
라이브러리 설치와 모델을 다시 다운로드할 때만 인터넷이 필요합니다.
모델을 다시 받으려면 `front`에서 `npm run models:download`를 실행하세요.

### 수업에서 읽을 순서

1. `readImage()`로 선택한 사진을 읽고 모델 입력 크기로 줄입니다 (`front/src/lib/image.js`).
2. `createDetector()`로 모델을 준비합니다.
3. 사진을 `estimateFaces()` 또는 `estimatePoses()`에 넣어 결과 배열을 받습니다 (`face.vue`, `pose.vue`).
4. 결과 배열을 `drawImage()`에 전달합니다. 사진 표시와 박스·점·연결선 그리기는 모두 `front/src/lib/image.js`에서 처리합니다.

얼굴 탐지와 특징점은 요청한 `@tensorflow-models/face-detection`,
`@tensorflow-models/face-landmarks-detection`을 사용합니다.
포즈는 `@tensorflow-models/pose-detection`의 MoveNet SinglePose Lightning을 사용합니다.
모델은 브라우저에서 WebGL로 계산하고, WebGL을 사용할 수 없으면 CPU로 실행합니다.

참고: [얼굴 탐지](https://github.com/tensorflow/tfjs-models/tree/master/face-detection),
[얼굴 특징점](https://github.com/tensorflow/tfjs-models/tree/master/face-landmarks-detection),
[포즈 탐지](https://github.com/tensorflow/tfjs-models/tree/master/pose-detection).
