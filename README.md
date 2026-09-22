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
- [작업 이력](#-작업-이력-changelog)

## 🎯 주요 기능

### 1. 자동 에러 캡처
- **eXBuilder6 `Platform.INSTANCE.onerror`**: 컨트롤 이벤트 핸들러, 서브미션, 익스프레션 에러 캡처
  (런타임이 이런 에러를 직접 처리한 뒤 `console.log`로만 출력하기 때문에 이 훅이 꼭 필요합니다)
- **window error / unhandledrejection**: 전역 에러와 Promise 거부 캡처
- **console.error / console.warn**: 에러 형태의 로그 캡처
- 여러 경로로 동시에 들어온 같은 에러는 한 번만 분석하고, 반복되는 에러는 다시 분석하지 않습니다
- 스택 트레이스에서 **사용자 코드 위치를 찾아 실제 소스 코드(에러 줄 ±3줄)를 AI에게 함께 전달**합니다

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

기본 모델은 **Qwen3-4B**(권장)입니다. GPU가 `shader-f16`을 지원하면 더 작고 빠른 q4f16 버전을, 지원하지 않으면 q4f32 버전을 자동으로 고릅니다.
로드에 실패하면(GPU 메모리 부족 등) **`qwen3-1.7b` → `qwen3-0.6b` 순서로 자동 다운그레이드**합니다.

브라우저 콘솔에서 바꿀 수 있고, 선택한 모델은 브라우저에 저장됩니다:

```javascript
AISupport.models();                      // 모델 목록
AISupport.setModel('qwen3-1.7b');        // 모델 교체 (즉시 적용, 다음 방문에도 유지)
AISupport.resetModel();                  // 기본값으로 (새로고침 후 적용)
AISupport.deleteModelCache('qwen2.5-0.5b'); // 더 이상 안 쓰는 모델 파일 삭제 (디스크 확보)
AISupport.status();                      // 현재 모델, 실행 모드(Web Worker/메인), 대기열 등
```

| 키 | 설명 |
|---|---|
| `qwen3-0.6b` | 가장 가벼움 (VRAM 약 1.4GB) |
| `qwen3-1.7b` | 경량, 저사양 PC 용 (약 2GB) |
| `qwen3-4b` | **기본값(권장)**, 한국어/코드 품질 (약 3.4GB, 첫 다운로드 약 2GB) |
| `qwen3-8b` | 최고 품질, 고사양 GPU (약 5.7GB) |
| `qwen2.5-coder-3b` | 코드 특화 (약 2.5GB) |
| `qwen2.5-1.5b`, `qwen2.5-0.5b`, `llama-3.2-3b` | 이전 세대 모델 |

프로젝트 전체의 기본값은 `tsSupportAI.js`를 로드하기 전에 지정합니다: `window.AI_ASSISTANT_CONFIG = { model: 'qwen3-1.7b' }`
(WebLLM의 model_id를 직접 쓰려면 `modelId: 'Qwen2.5-7B-Instruct-q4f16_1-MLC'`)

### 경로 설정

WebLLM 경로는 `tsSupportAI.js` **자신의 위치를 기준으로 자동 계산**됩니다 (`<tsSupportAI.js 폴더>/web-llm/web-llm.min.js`).
따라서 `/ui/` 등 배포 경로가 달라져도 별도 수정이 필요 없습니다. 로드 순서는 다음과 같습니다:

1. `window.AI_ASSISTANT_CONFIG.webllmURL` (지정한 경우)
2. `<tsSupportAI.js 폴더>/web-llm/web-llm.min.js`
3. CDN `https://esm.run/@mlc-ai/web-llm` (폐쇄망이면 `webllmCDN: null`)

다른 위치를 쓰려면 `tsSupportAI.js` 로드 **전에** 설정합니다:

```javascript
window.AI_ASSISTANT_CONFIG = {
    webllmURL: "/my-path/web-llm.min.js",  // 스크립트 기준 상대경로 또는 절대경로
    useWebWorker: true                      // false 면 메인 스레드에서 추론
};
```

모델 추론은 기본적으로 `web-llm/worker.js`(ES Module Worker)에서 실행되어 화면이 멈추지 않으며,
워커 생성이 실패하면 자동으로 메인 스레드 방식으로 전환됩니다.

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
1. 더 작은 모델 사용: `AISupport.setModel('qwen3-1.7b')` 또는 `AISupport.setModel('qwen3-0.6b')`
   (GPU 메모리 부족이면 자동으로 작은 모델로 내려갑니다)

2. 인터넷 연결 확인
   - HuggingFace 접근 가능 여부 확인
   - `https://mlc.ai/models` 접속 테스트

3. 첫 로드 시 주의사항
   - 첫 로드 시 모델을 다운로드해야 하므로 시간이 걸릴 수 있습니다 (수 분)
   - 다운로드된 모델은 브라우저 캐시에 저장되어 다음 로드는 더 빠릅니다
   - 모델 크기에 따라 다운로드 시간이 달라집니다:
     - Qwen3-0.6B: 약 0.5GB
     - Qwen3-1.7B: 약 1GB
     - Qwen3-4B (기본값): 약 2GB
     - Qwen3-8B: 약 4-5GB

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
        // 에러를 직접 분석 요청 (엔진 로딩 중이면 대기열에 들어갔다가 준비되면 분석)
        if (window.AISupport) {
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

`tsSupportAI.js`를 수정하지 않고, 로드하기 **전에** `window.AI_ASSISTANT_CONFIG`로 원하는 항목만 덮어씁니다
(전체 항목은 `tsSupportAI.js` 상단의 `CONFIG` 참고):

```javascript
window.AI_ASSISTANT_CONFIG = {
    model: "qwen3-1.7b",          // 모델 프리셋 키
    fallbackModels: ["qwen3-0.6b"], // 실패 시 시도할 모델
    webllmURL: null,              // web-llm.min.js 경로 (기본: 스크립트 폴더/web-llm/)
    webllmCDN: null,              // 폐쇄망이면 null (CDN 폴백 끔)
    useWebWorker: true,           // Web Worker 에서 추론
    preload: true,                // 페이지가 한가할 때 모델 미리 로드 (false: 첫 에러/채팅 시 로드)
    captureConsole: true,         // console.error/warn 도 수집
    fetchSourceSnippet: true      // 에러 위치의 소스 코드를 AI 에게 전달
};
```

## 📞 문의

기술 지원 관련 문의사항이 있으면 개발팀에 문의하세요.

## 📝 작업 이력 (Changelog)

작업할 때마다 아래에 최신 항목을 위에 추가합니다.

### 2026-09-22 (3차) 권장 모델 적용 · 리팩토링 · 최적화
**모델**
- 기본 모델 `qwen3-1.7b` → **`qwen3-4b`** (권장). 폴백 체인 `qwen3-4b → qwen3-1.7b → qwen3-0.6b` 자동 다운그레이드
- `AISupport.deleteModelCache('키')` 추가: 안 쓰는 모델 파일을 브라우저 저장소에서 삭제

**최적화**
- 엔진 요청 직렬화: 에러 분석·채팅·API 검색이 동시에 호출돼도 한 번에 하나씩 순서대로 실행 (동시 호출 충돌 방지)
- 모델 사전 로드를 `window.load` 이후 `requestIdleCallback`(브라우저가 한가할 때)으로 미룸 → eXBuilder 앱 초기 화면 로딩과 경쟁하지 않음
- 에러 기록(중복 판별·분석 결과·반복 횟수)을 하나의 `BoundedMap`(최대 100개)으로 통합 → 장시간 사용 시 메모리 증가 방지
- 소스 코드 캐시도 최대 30개 파일로 제한
- `console.log` 후킹 비용 최소화: 평소에는 인자만 보관하고 에러가 났을 때만 문자열로 변환
- API 검색 데이터는 로드할 때 검색용 소문자 필드를 미리 계산 (검색할 때마다 `toLowerCase` 반복 제거)
- 프롬프트 길이 상한(`maxPromptChars`)으로 모델 입력 한도(4K 토큰) 보호

**리팩토링**
- 초기화 흐름을 `loadLibrary → loadFirstModel → onReady` 단계로 분리하고, "준비되면 실행" 로직을 `AIEngine.whenReady()`로 통일 (chat/search 중복 코드 제거)
- 콘솔 출력은 `Log.block()`(그룹), `Log.elapsed()`(소요 시간), `STYLE` 상수로 통일
- 에러 정규화(`ErrorCollector.capture`)가 모든 수집 경로의 단일 입구가 되도록 정리
- 기존 전역 API(`chat`, `search`, `loadAPI`, `AIEngine`, `ErrorAnalyzer`, `ErrorAnalyzer.errorQueue`, `APIDatabase.getSystemPrompt` 등)는 호환 유지

### 2026-09-22 (2차) 에러 분석이 동작하지 않던 문제 수정 · 기능 개선
**원인**: eXBuilder6 런타임은 컨트롤 이벤트 핸들러 안의 에러를 직접 처리한 뒤 `console.error`가 아닌
`console.log("%c...", "color: red;")`로 출력한다 (콘솔의 `try-catch.ts:206` 로그). 기존에는 `console.error`만 가로채서 이 에러를 받지 못했다.
- 런타임 공식 전역 에러 훅 `cpr.core.Platform.INSTANCE.onerror`를 1차 수집 경로로 사용 (이벤트 핸들러·서브미션·익스프레션·Promise). 앱이 나중에 `onerror`를 지정해도 체이닝으로 유지
- `window.onerror` 강제 덮어쓰기 + 1초 주기 재설치 코드 제거 → `addEventListener("error"/"unhandledrejection")`로 변경 (런타임과 충돌 방지)
- 기본 모델 `Qwen2.5-0.5B` → `Qwen3-1.7B`, GPU `shader-f16` 지원 여부에 따라 q4f16/q4f32 자동 선택, Qwen3의 `<think>` 추론 비활성화
- 에러가 난 **사용자 코드 줄 앞뒤 3줄을 가져와 AI에게 전달** → 실제 코드를 근거로 한 수정안 제시
- 소형 모델이 없는 API(`addOption` 등)를 만들어내지 않도록, 런타임에서 존재를 확인한 eXBuilder6 핵심 API 요약을 프롬프트에 포함
- 같은 에러가 여러 경로로 들어오면 한 번만 분석, `setInterval` 등 반복 에러는 "반복 발생 (N회)" 한 줄로 요약
- `AISupport.analyze()` / `models()` / `setModel()` / `status()` 추가 (`testExam.js`와 README가 쓰던 `AISupport.analyze`가 실제로는 없었음)
- 채팅 이력은 최근 10개로 제한 (모델 입력 한도 보호)

### 2026-09-22 (1차) "AI 모듈 로드 실패" 수정
**원인**: WebLLM 경로가 `../ui/web-llm/web-llm.min.js`로 하드코딩되어 있어, 배포 경로가 `/ui/`가 아닌 환경
(eXBuilder 스튜디오 미리보기 `/eXWeb-LLM/clx-src/...` 등)에서 404 → 모듈 로드 실패.
- `tsSupportAI.js` 자신의 URL을 기준으로 절대 경로를 계산. 순서: `AI_ASSISTANT_CONFIG.webllmURL` → `스크립트 폴더/web-llm/web-llm.min.js` → CDN
- `web-llm/worker.js`를 실제 동작하는 ES Module Worker로 교체 → 모델 추론을 Web Worker에서 실행해 화면이 멈추지 않음 (실패 시 메인 스레드로 자동 전환)
- WebGPU 사전 확인 (미지원 브라우저에서 모델 다운로드 전에 안내)
- 어시스턴트가 자기 자신의 실패 로그를 다시 에러로 분석하던 루프 제거
- 분석 중에 들어온 에러가 버려지던 문제 → 대기열에 넣어 순차 분석
- 초기화 중 `chat()`/`search()` 호출이 무시되던 문제 → 초기화 완료 후 이어서 실행
- `data.json`(선택 사항)이 없을 때 경고 대신 안내 한 줄만 출력

---

**프로젝트 이름:** ErrGenome  
**저장소:** https://github.com/Logic-Phantom/ErrGenome.git







