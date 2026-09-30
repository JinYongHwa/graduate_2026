// 한 번만 실행하면 브라우저가 모델을 localhost에서 읽을 수 있습니다.
// 사진은 다운로드 과정과 무관하며 외부로 전송하지 않습니다.
const fs = require('node:fs/promises');
const path = require('node:path');

const models = {
  'face-detector': 'https://tfhub.dev/mediapipe/tfjs-model/face_detection/short/1',
  'face-landmarks': 'https://tfhub.dev/mediapipe/tfjs-model/face_landmarks_detection/face_mesh/1',
  pose: 'https://tfhub.dev/google/tfjs-model/movenet/singlepose/lightning/4'
};

async function fetchFile(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(120000) });
  if (!response.ok || response.headers.get('content-type')?.includes('text/html')) {
    throw new Error(`모델 파일을 받을 수 없습니다: ${url} (${response.status})`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function main() {
  for (const [name, source] of Object.entries(models)) {
    const directory = path.join(__dirname, '../public/models', name);
    const manifest = await fetchFile(`${source}/model.json?tfjs-format=file`);
    const model = JSON.parse(manifest.toString());
    if (!model.modelTopology || !Array.isArray(model.weightsManifest)) throw new Error('잘못된 모델 JSON입니다.');
    await fs.mkdir(directory, { recursive: true });
    for (const group of model.weightsManifest) {
      for (const filename of group.paths) {
        // 모델의 상대 경로만 저장합니다.
        if (filename.includes('..') || filename.includes('://') || path.isAbsolute(filename)) throw new Error('잘못된 가중치 경로입니다.');
        const bytes = await fetchFile(`${source}/${filename}?tfjs-format=file`);
        const target = path.join(directory, filename);
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.writeFile(target, bytes);
      }
    }
    await fs.writeFile(path.join(directory, 'model.json'), manifest);
    console.log(`${name}: 저장 완료`);
  }
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
