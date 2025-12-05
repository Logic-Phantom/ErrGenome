# WebLLM 엔진 파일 다운로드 가이드

이 가이드는 WebLLM 엔진 파일을 다운로드하고 설정하는 방법을 설명합니다.

## 방법 1: npm을 사용한 설치 (권장)

### 1단계: Node.js 설치 확인

```bash
node --version
npm --version
```

Node.js가 설치되어 있지 않다면 [Node.js 공식 사이트](https://nodejs.org/)에서 다운로드하세요.

### 2단계: 임시 프로젝트 생성 및 WebLLM 설치

```bash
# 임시 디렉토리 생성
mkdir webllm-temp
cd webllm-temp

# npm 프로젝트 초기화
npm init -y

# WebLLM 패키지 설치
npm install @mlc-ai/web-llm
```

### 3단계: 빌드된 파일 찾기 및 복사

설치 후 다음 경로에서 파일들을 찾을 수 있습니다:

```
webllm-temp/
└── node_modules/
    └── @mlc-ai/
        └── web-llm/
            ├── dist/           ← 여기에 빌드된 파일들이 있습니다
            │   ├── index.js
            │   ├── worker.js
            │   └── ...
            └── ...
```

### 4단계: 프로젝트로 파일 복사

필요한 파일들을 프로젝트의 `/web-llm/` 폴더로 복사합니다.

```bash
# 프로젝트 루트로 돌아가기
cd ..

# web-llm 디렉토리 생성
mkdir -p web-llm

# 필수 파일들 복사
cp webllm-temp/node_modules/@mlc-ai/web-llm/dist/index.js web-llm/web-llm.min.js
cp webllm-temp/node_modules/@mlc-ai/web-llm/dist/worker.js web-llm/worker.js

# wasm 파일들도 복사 (필요한 경우)
cp -r webllm-temp/node_modules/@mlc-ai/web-llm/dist/wasm web-llm/
```

### 5단계: 임시 디렉토리 정리

```bash
rm -rf webllm-temp
```

---

## 방법 2: CDN에서 직접 다운로드 (빠른 방법)

WebLLM은 CDN을 통해 제공되기도 하지만, 우리는 CDN을 사용하지 않는 방식으로 구성했습니다. 
대신 다음과 같이 파일을 직접 다운로드할 수 있습니다:

### unpkg CDN에서 파일 다운로드

```bash
# web-llm 디렉토리 생성
mkdir -p web-llm

# 주요 파일 다운로드 (curl 또는 wget 사용)
# 최신 버전 확인 후 다운로드
curl -o web-llm/web-llm.min.js https://unpkg.com/@mlc-ai/web-llm@latest/dist/index.js
curl -o web-llm/worker.js https://unpkg.com/@mlc-ai/web-llm@latest/dist/worker.js
```

**주의**: CDN에서 다운로드한 파일은 최신 버전이 아닐 수 있고, 
필요한 모든 의존성 파일을 포함하지 않을 수 있습니다.

---

## 방법 3: GitHub Release에서 다운로드

### 1단계: GitHub Releases 페이지 방문

[WebLLM GitHub Releases](https://github.com/mlc-ai/web-llm/releases) 페이지로 이동

### 2단계: 최신 릴리스 확인

최신 버전의 Source code (zip) 또는 빌드된 파일을 다운로드

### 3단계: 파일 압축 해제 및 복사

다운로드한 파일을 압축 해제하고 필요한 파일들을 `/web-llm/` 폴더로 복사

---

## 방법 4: 자동 다운로드 스크립트 사용

프로젝트에 포함된 자동 다운로드 스크립트를 사용할 수 있습니다:

### Windows (PowerShell)

```powershell
.\download-webllm.ps1
```

### Linux/Mac (Bash)

```bash
chmod +x download-webllm.sh
./download-webllm.sh
```

---

## 필수 파일 목록

다음 파일들이 `/web-llm/` 디렉토리에 있어야 합니다:

```
web-llm/
├── web-llm.min.js      (또는 index.js)
├── worker.js
└── wasm/               (필요한 경우)
    └── ...
```

---

## 설치 확인

파일이 올바르게 설치되었는지 확인:

1. `/web-llm/web-llm.min.js` 파일 존재 확인
2. `/web-llm/worker.js` 파일 존재 확인
3. 브라우저 콘솔에서 다음 코드로 테스트:

```javascript
console.log('WebLLM 파일 확인 중...');
// 파일이 올바르게 로드되면 에러가 발생하지 않음
```

---

## 문제 해결

### 파일을 찾을 수 없는 경우

1. 파일 경로 확인: `/web-llm/` 경로가 프로젝트 루트에 있는지 확인
2. 파일명 확인: `web-llm.min.js` 또는 `index.js` 확인
3. 서버 재시작: 파일을 추가한 후 웹 서버를 재시작

### Worker 파일 로드 실패

1. CORS 설정 확인: 웹 서버를 통해 접근해야 함 (file:// 프로토콜 불가)
2. 파일 경로 확인: `worker.js` 파일이 올바른 위치에 있는지 확인

### 모델 로드 실패

1. 모델 파일 크기가 크므로 초기 로딩에 시간이 걸릴 수 있음
2. 브라우저 콘솔에서 상세 오류 메시지 확인
3. WebGPU 지원 브라우저인지 확인 (Chrome, Edge 등)

---

## 추가 리소스

- [WebLLM 공식 문서](https://webllm.mlc.ai/)
- [WebLLM GitHub 저장소](https://github.com/mlc-ai/web-llm)
- [npm 패키지 페이지](https://www.npmjs.com/package/@mlc-ai/web-llm)

