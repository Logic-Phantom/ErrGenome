# WebLLM 빠른 다운로드 가이드

## 가장 빠른 방법 (npm 사용)

### Windows

1. **PowerShell 열기** (프로젝트 루트에서)

2. **다운로드 스크립트 실행**:
   ```powershell
   .\download-webllm.ps1
   ```

### Linux / Mac

1. **터미널 열기** (프로젝트 루트에서)

2. **스크립트 실행 권한 부여**:
   ```bash
   chmod +x download-webllm.sh
   ```

3. **다운로드 스크립트 실행**:
   ```bash
   ./download-webllm.sh
   ```

---

## 수동 설치 방법

### 1. Node.js 설치 확인

```bash
node --version
npm --version
```

설치되어 있지 않다면: https://nodejs.org/

### 2. 명령어로 직접 설치

프로젝트 루트에서 다음 명령어 실행:

```bash
# 임시 디렉토리 생성 및 이동
mkdir webllm-temp && cd webllm-temp

# npm 프로젝트 초기화
npm init -y

# WebLLM 설치
npm install @mlc-ai/web-llm

# 상위 디렉토리로 돌아가기
cd ..

# web-llm 폴더 생성
mkdir -p web-llm

# 파일 복사 (Windows)
copy webllm-temp\node_modules\@mlc-ai\web-llm\dist\index.js web-llm\web-llm.min.js
copy webllm-temp\node_modules\@mlc-ai\web-llm\dist\worker.js web-llm\worker.js

# 파일 복사 (Linux/Mac)
cp webllm-temp/node_modules/@mlc-ai/web-llm/dist/index.js web-llm/web-llm.min.js
cp webllm-temp/node_modules/@mlc-ai/web-llm/dist/worker.js web-llm/worker.js

# 임시 디렉토리 삭제
rm -rf webllm-temp  # Linux/Mac
rmdir /s webllm-temp  # Windows
```

### 3. 완료!

`web-llm/` 폴더에 다음 파일이 있어야 합니다:
- `web-llm.min.js`
- `worker.js`

---

## 확인 방법

1. `web-llm/` 폴더가 프로젝트 루트에 있는지 확인
2. `web-llm.min.js` 파일이 있는지 확인
3. `worker.js` 파일이 있는지 확인

---

## 문제 해결

### "node: command not found" 오류

→ Node.js가 설치되어 있지 않습니다. https://nodejs.org/ 에서 설치하세요.

### npm install 실패

→ 인터넷 연결을 확인하고 다시 시도하세요.

### 파일을 찾을 수 없음

→ `webllm-temp/node_modules/@mlc-ai/web-llm/dist/` 경로를 확인하세요.
   버전에 따라 경로가 다를 수 있습니다.

---

## 다음 단계

파일이 준비되면:

1. `tsSupportAI.js` 파일이 올바른 경로를 가리키는지 확인
2. HTML에 스크립트 추가: `<script src="/clx-src/tsSupportAI.js"></script>`
3. `tsSupportAI-test.html` 파일로 테스트

