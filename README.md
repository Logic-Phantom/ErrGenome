# ErrGenome - AI Error Assistant 프로젝트

브라우저에서 발생한 JavaScript 에러를 자동으로 캡처하여 WebLLM을 통해 분석하고, 원인과 해결방법을 콘솔에 출력하는 기술 지원용 라이브러리입니다.

## 📋 목차

- [주요 기능](#주요-기능)
- [빠른 시작](#빠른-시작)
- [설치 방법](#설치-방법)
- [사용 방법](#사용-방법)
- [WebLLM 설정](#webllm-설정)
- [문제 해결](#문제-해결)
- [프로젝트 구조](#프로젝트-구조)

## 🎯 주요 기능

### 1. 자동 에러 캡처
- **window.onerror**: 모든 JavaScript 에러를 자동으로 캡처
- **unhandledrejection**: Promise rejection 자동 캡처
- 에러 정보 자동 수집 (메시지, 파일명, 줄 번호, 스택 트레이스)

### 2. 수동 에러 분석
- `AISupport.analyze(error)` - 원하는 에러만 분석
- Error 객체, 문자열, 커스텀 객체 모두 지원

### 3. AI 기반 분석
- WebLLM을 사용한 지능형 분석
- 에러 원인, 발생 이유, 해결방법 제공
- 기술 지원 엔지니어 관점의 설명
- 한국어 답변

### 4. 에러 큐잉 시스템
- WebLLM 엔진 로딩 중 발생한 에러는 큐에 저장
- 엔진 준비 완료 후 자동으로 순차 분석
- 최대 10개까지 큐에 저장

## 🚀 빠른 시작

### 기본 사용

HTML에 포함:
```html
<!-- WebLLM 먼저 로드 -->
<script type="module">
    import * as webllm from '../web-llm/web-llm.min.js';
    window.webllm = webllm;
</script>

<!-- AI Error Assistant -->
<script src="tsSupportAI.js"></script>

<!-- 테스트 함수들 -->
<script src="test.js"></script>
```

### 브라우저 콘솔에서 직접 호출

```javascript
// 기본 에러 테스트
testReferenceError();  // ReferenceError 발생
testTypeError();       // TypeError 발생
testNullPointer();     // Null 참조 에러

// 모든 기본 테스트 실행
runAllBasicTests();

// 수동 분석
AISupport.analyze(new Error("테스트 에러"));
```

## 📦 설치 방법

### 1. 파일 구조

프로젝트 루트에 다음과 같은 구조로 파일을 배치합니다:

```
프로젝트/
├── clx-src/
│   └── tsSupportAI.js          ← AI Error Assistant 라이브러리
└── web-llm/                    ← WebLLM 엔진 파일
    ├── web-llm.min.js
    ├── worker.js
    └── [기타 WebLLM 파일들]
```

### 2. WebLLM 엔진 다운로드

WebLLM 엔진 파일은 다음 방법 중 하나로 준비할 수 있습니다:

#### 방법 1: npm 사용 (권장)

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

#### 방법 2: GitHub Release에서 다운로드

1. [WebLLM GitHub Releases](https://github.com/mlc-ai/web-llm/releases) 방문
2. 최신 버전 다운로드
3. 빌드된 파일들을 `/web-llm/` 폴더에 압축 해제

#### 방법 3: CDN 사용

```html
<script type="module">
    import * as webllm from 'https://esm.run/@mlc-ai/web-llm';
    window.webllm = webllm;
    window.webllmReady = true;
</script>
```

### 3. HTML에 스크립트 추가

```html
<!DOCTYPE html>
<html>
<head>
    <title>My App</title>
</head>
<body>
    <!-- WebLLM을 ES Module로 먼저 로드 -->
    <script type="module">
        import * as webllm from '/web-llm/web-llm.min.js';
        window.webllm = webllm;
        window.webllmReady = true;
    </script>
    
    <!-- AI Error Assistant -->
    <script src="/clx-src/tsSupportAI.js"></script>
</body>
</html>
```

## 💻 사용 방법

### 자동 에러 분석

스크립트를 추가하면 자동으로 모든 JavaScript 에러를 캡처하고 분석합니다:

```javascript
// 이런 에러가 발생하면 자동으로 분석됨
undefinedVariable++; // ReferenceError - 자동 캡처됨
nullObject.method(); // TypeError - 자동 캡처됨
JSON.parse("invalid"); // SyntaxError - 자동 캡처됨
```

### 수동 에러 분석

`AISupport.analyze()` 메서드를 사용하여 수동으로 에러를 분석할 수 있습니다:

```javascript
// Error 객체 전달
try {
    riskyOperation();
} catch (err) {
    AISupport.analyze(err);
}

// 문자열 전달
AISupport.analyze("커스텀 에러 메시지");

// 객체 전달
AISupport.analyze({
    message: "커스텀 에러",
    code: "ERR001",
    context: "사용자 로그인 중"
});
```

### 지원하는 에러 타입

- **ReferenceError**: 정의되지 않은 변수/함수 사용
- **TypeError**: null/undefined 객체 접근, 잘못된 타입의 메서드 호출
- **SyntaxError**: JavaScript 문법 규칙 위반, 잘못된 JSON 구문
- **RangeError**: 잘못된 숫자 범위, 배열 길이 오류
- **URIError**: URI 처리 함수 오류
- **Promise Rejection**: 처리되지 않은 Promise 거부

## ⚙️ WebLLM 설정

### 모델 변경

`tsSupportAI.js` 파일 내에서 모델을 변경할 수 있습니다:

```javascript
// 모델 설정 변경
var modelName = "Qwen2.5-0.5B-Instruct-q4f32_1-MLC";  // 현재 사용 중 (가장 작음)
// 또는
var modelName = "Phi-3-mini-4k-instruct-q4f32_1-MLC";  // 더 정확함
// 또는
var modelName = "TinyLlama-1.1B-Chat-v1.0-q4f32_1-MLC";  // 중간 크기
```

### 지원되는 모델 목록

전체 모델 목록: https://mlc.ai/models

**추천 작은 모델 (빠른 로딩):**
1. `Qwen2.5-0.5B-Instruct-q4f32_1-MLC` ✅ (현재 사용, 가장 작음)
2. `TinyLlama-1.1B-Chat-v1.0-q4f32_1-MLC` (약 1.1B)
3. `Phi-3-mini-4k-instruct-q4f32_1-MLC` (약 3.8B, 더 정확)

**중간 크기 모델:**
- `Qwen2.5-1.5B-Instruct-q4f32_1-MLC`
- `Phi-3-mini-128k-instruct-q4f32_1-MLC`

**큰 모델 (더 정확하지만 느림):**
- `Llama-3.1-8B-Instruct-q4f32_1-MLC` (원래 사용하던 모델)

### 경로 설정

`tsSupportAI.js` 파일 내에서 WebLLM 경로를 변경할 수 있습니다:

```javascript
// WebLLM 파일 경로 변경
var WebLLM_URL = "/web-llm/web-llm.min.js";
var WebLLM_WORKER_URL = "/web-llm/worker.js";
```

## 🔍 분석 결과 확인

### 콘솔 확인 방법

1. **개발자 도구 열기**
   - Windows: `F12` 키 또는 `Ctrl + Shift + I`
   - Mac: `Cmd + Option + I`

2. **Console 탭 선택**
   - 개발자 도구가 열리면 상단의 **"Console"** 탭 클릭

3. **분석 결과 확인**
   - 에러 발생 후 약 5-10초 후 분석 결과가 콘솔에 출력됩니다

### 출력 형식

AI 분석 결과는 다음과 같은 형식으로 출력됩니다:

```
======================================================================
                    🤖 AI 에러 분석 결과                    
======================================================================

1) 에러 원인
RangeError: Invalid array length

2) 왜 발생했는가
배열의 길이로 음수(-1)를 지정하려고 했기 때문에 발생했습니다.
배열 길이는 0 이상의 정수여야 합니다.

3) 해결방법 (코드 예시 포함)
음수 대신 올바른 배열 길이를 사용하세요:
// 잘못된 예:
var arr = new Array(-1);

// 올바른 예:
var arr = new Array(10); // 10개 요소
// 또는
var arr = []; // 빈 배열

4) 고객 안내 멘트
이 오류는 개발 과정에서 발생한 것으로, 곧 수정될 예정입니다.

======================================================================
💡 팁: 브라우저 개발자 도구(F12) → Console 탭에서 이 메시지를 확인할 수 있습니다.
======================================================================
```

## 🛠️ 문제 해결

### WebLLM 로딩 실패

**문제:** 콘솔에 "WebLLM 로딩 실패" 메시지가 나타남

**해결 방법:**
1. `/web-llm/web-llm.min.js` 파일이 존재하는지 확인
2. 파일 경로가 올바른지 확인
3. 서버에서 해당 파일에 대한 접근 권한 확인
4. ES Module을 지원하는 브라우저 사용 (Chrome 63+, Firefox 67+, Safari 11.1+, Edge 79+)
5. HTTP 서버를 통해 접근 (file:// 프로토콜 사용 불가)

### ES Module 오류

**문제:** `SyntaxError: Unexpected token 'export'`

**해결 방법:**
HTML에서 WebLLM을 ES Module로 먼저 로드:

```html
<!-- WebLLM을 ES Module로 먼저 로드 -->
<script type="module">
    import * as webllm from '/web-llm/web-llm.min.js';
    window.webllm = webllm;
    window.webllmReady = true;
</script>

<!-- tsSupportAI.js는 일반 스크립트로 로드 -->
<script src="/clx-src/tsSupportAI.js"></script>
```

### Worker 생성 실패

**문제:** "Web Worker 생성 실패" 메시지가 나타남

**해결 방법:**
1. `/web-llm/worker.js` 파일이 존재하는지 확인
2. CORS 설정 확인 (로컬 파일 시스템에서는 동작하지 않을 수 있음)
3. 웹 서버를 통해 접근해야 함 (file:// 프로토콜 사용 불가)

### 캐시 오류

**문제:** `NetworkError: Failed to execute 'add' on 'Cache': Cache.add() encountered a network error`

**해결 방법:**

#### 방법 1: 브라우저 캐시 삭제 (가장 확실)

**Chrome/Edge:**
1. **F12** 키 눌러 개발자 도구 열기
2. **Application** 탭 클릭
3. 왼쪽 메뉴에서 **Storage** 확장
4. **Clear site data** 버튼 클릭
5. 페이지 **새로고침** (Ctrl+F5)

**Firefox:**
1. **F12** 키 눌러 개발자 도구 열기
2. **Storage** 탭 클릭
3. 왼쪽 메뉴에서 **Cache** 선택
4. 해당 사이트의 캐시 삭제
5. 페이지 **새로고침** (Ctrl+F5)

#### 방법 2: 시크릿 모드에서 테스트

캐시 없이 깨끗한 상태로 테스트:
- **Chrome**: Ctrl+Shift+N
- **Firefox**: Ctrl+Shift+P
- **Edge**: Ctrl+Shift+N

#### 방법 3: Service Worker 확인

Service Worker가 Cache API를 방해할 수 있습니다:

1. **F12** → **Application** 탭 → **Service Workers**
2. 등록된 모든 Service Worker 확인
3. 있으면 "Unregister" 클릭
4. 페이지 새로고침

### 모델 다운로드 오류

**문제:** 모델 다운로드 중 오류 발생

**해결 방법:**
1. 더 작은 모델 사용 (권장)
   - `Qwen2.5-0.5B-Instruct-q4f32_1-MLC` (현재 사용 중)
   - `TinyLlama-1.1B-Chat-v1.0-q4f32_1-MLC`
   - `Phi-3-mini-4k-instruct-q4f32_1-MLC`

2. 인터넷 연결 확인
   - HuggingFace 접근 가능 여부 확인
   - `https://mlc.ai/models` 접속 테스트

3. 첫 로드 시 주의사항
   - 첫 로드 시 모델을 다운로드해야 하므로 시간이 걸릴 수 있습니다 (수 분)
   - 다운로드된 모델은 브라우저 캐시에 저장되어 다음 로드는 더 빠릅니다
   - 모델 크기에 따라 다운로드 시간이 달라집니다:
     - 0.5B 모델: 약 300MB
     - 1.5B 모델: 약 900MB
     - 8B 모델: 약 4-5GB

### 에러 캡처 문제

**문제:** 에러가 발생했지만 AI 분석이 시작되지 않음

**해결 방법:**

#### 방법 1: 수동 분석 사용

콘솔에서 직접 분석:

```javascript
AISupport.analyze({
    name: "RangeError",
    message: "Invalid array length",
    stack: "at Button.onBtn1Click..."
});
```

#### 방법 2: 에러 발생 지점에서 직접 호출

에러가 발생하는 코드를 수정:

```javascript
function onBtn1Click(e){
    console.log("[테스트] RangeError 발생 시도...");
    
    try {
        var arr = new Array(-1); // 음수 길이 배열
    } catch(err) {
        // 에러를 직접 분석 요청
        if (window.AISupport && window.AISupport.ready) {
            console.log("[테스트] 에러를 AI로 분석 요청...");
            window.AISupport.analyze(err);
        }
        // 원래 에러도 다시 던져서 콘솔에 표시
        throw err;
    }
}
```

## 📁 프로젝트 구조

```
eXWeb-LLM/
├── clx-build/                    # 빌드된 파일들
│   ├── AI/                      # AI 관련 테스트 파일
│   ├── tsSupportAI.js           # AI Error Assistant 라이브러리
│   ├── test.js                  # 테스트 함수들
│   ├── test.html                # 테스트 HTML
│   └── web-llm/                 # WebLLM 엔진 파일
│       ├── web-llm.min.js
│       └── worker.js
├── clx-src/                     # 소스 파일들
│   ├── AI/                      # AI 관련 소스
│   ├── tsSupportAI.js           # AI Error Assistant 소스
│   └── web-llm/                 # WebLLM 엔진 파일
├── templates/                   # 템플릿 파일들
├── jsdocs/                      # JSDoc 파일들
└── README.md                    # 이 파일
```

## 🧪 테스트

### 테스트 가능한 에러 목록

#### 기본 에러 유형
- ✅ `testReferenceError()` - 정의되지 않은 변수/함수
- ✅ `testTypeError()` - null/undefined 객체 접근
- ✅ `testSyntaxError()` - 문법 오류
- ✅ `testRangeError()` - 범위 오류
- ✅ `testURIError()` - URI 처리 오류

#### 실전 시나리오
- ✅ `testNullPointer()` - Null 참조
- ✅ `testArrayAccessError()` - 배열/객체 접근
- ✅ `testAsyncError()` - 비동기 코드 에러
- ✅ `testPromiseRejection()` - Promise 거부
- ✅ `testNetworkError()` - 네트워크 에러
- ✅ `testJSONParseError()` - JSON 파싱 에러
- ✅ `testAPIResponseError()` - API 응답 처리
- ✅ `testDOMError()` - DOM 조작 에러
- ✅ `testEventHandlerError()` - 이벤트 핸들러 에러
- ✅ `testCORSError()` - CORS 에러

### 테스트 방법

1. **test.html 파일 사용**
   - `test.html` 파일을 브라우저로 엽니다
   - **시크릿 모드**로 열기 (Ctrl+Shift+N)
   - F12로 콘솔 열기
   - 버튼 클릭하거나 콘솔에서 함수 호출

2. **브라우저 콘솔 직접 사용**
   - 페이지에 스크립트 포함
   - F12로 콘솔 열기
   - 함수 직접 호출:
   ```javascript
   // 즉시 에러 발생 및 분석
   testReferenceError();
   
   // 모든 테스트 자동 실행
   runAllBasicTests();
   ```

## 🌐 브라우저 호환성

- ✅ Chrome/Edge (권장)
- ✅ Firefox
- ✅ Safari
- ✅ ES5를 지원하는 기타 브라우저

**참고:** WebLLM은 WebGPU를 사용하므로 WebGPU를 지원하는 브라우저에서만 동작합니다.

## 📚 참고 자료

- [WebLLM 공식 문서](https://webllm.mlc.ai/)
- [WebLLM GitHub](https://github.com/mlc-ai/web-llm)
- [WebLLM Models](https://mlc.ai/models)
- [WebLLM Chat 데모](https://chat.webllm.ai/)

## 📝 라이센스

이 라이브러리는 프로젝트 내부 기술 지원 용도로 사용됩니다.

## 💡 팁

- **시크릿 모드 사용**: 캐시 문제를 피하기 위해 시크릿 모드(Ctrl+Shift+N)에서 테스트하는 것을 권장합니다.
- **콘솔 열어두기**: 에러 발생 전에 콘솔을 열어두면 분석 결과를 놓치지 않습니다.
- **분석 시간**: 분석은 약 5-10초 정도 소요될 수 있습니다.
- **큐잉 시스템**: WebLLM 엔진 로딩 중 발생한 에러는 자동으로 큐에 저장되어 나중에 분석됩니다.

## 🔧 설정 변경

`tsSupportAI.js` 파일 내에서 다음 설정을 변경할 수 있습니다:

```javascript
// WebLLM 파일 경로 변경
var WebLLM_URL = "/web-llm/web-llm.min.js";
var WebLLM_WORKER_URL = "/web-llm/worker.js";

// 모델 설정 변경
var modelName = "Qwen2.5-0.5B-Instruct-q4f32_1-MLC";  // 사용할 모델
```

## 📞 문의

기술 지원 관련 문의사항이 있으면 개발팀에 문의하세요.

---

**프로젝트 이름:** ErrGenome  
**저장소:** https://github.com/Logic-Phantom/ErrGenome.git







