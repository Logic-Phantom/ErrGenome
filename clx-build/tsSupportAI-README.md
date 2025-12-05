# AI Error Assistant - 기술 지원용 에러 분석 라이브러리

브라우저에서 발생한 JavaScript 에러를 자동으로 캡처하여 WebLLM을 통해 분석하고, 원인과 해결방법을 콘솔에 출력하는 라이브러리입니다.

## 특징

- ✅ ES5 호환 (구형 브라우저 지원)
- ✅ CDN 미사용 (모든 파일 로컬 저장)
- ✅ 단일 JS 파일로 간편한 배포
- ✅ 자동 에러 캡처 및 분석
- ✅ 수동 분석 기능 제공

## 설치 방법

### 1. 파일 구조

프로젝트 루트에 다음과 같은 구조로 파일을 배치합니다:

```
프로젝트/
├── clx-src/
│   └── tsSupportAI.js          ← 이 파일
└── web-llm/                    ← WebLLM 엔진 파일
    ├── web-llm.min.js
    ├── worker.js
    └── [기타 WebLLM 파일들]
```

### 2. WebLLM 엔진 다운로드

WebLLM 엔진 파일은 다음 방법 중 하나로 준비할 수 있습니다:

#### 방법 1: GitHub Release에서 다운로드
1. [WebLLM GitHub Releases](https://github.com/mlc-ai/web-llm/releases) 방문
2. 최신 버전 다운로드
3. 빌드된 파일들을 `/web-llm/` 폴더에 압축 해제

#### 방법 2: npm으로 빌드
```bash
npm install @mlc-ai/web-llm
# 빌드 파일을 /web-llm/ 폴더로 복사
```

### 3. HTML에 스크립트 추가

```html
<!DOCTYPE html>
<html>
<head>
    <title>My App</title>
</head>
<body>
    <!-- 다른 스크립트들... -->
    
    <!-- AI Error Assistant 추가 -->
    <script src="/clx-src/tsSupportAI.js"></script>
</body>
</html>
```

## 사용 방법

### 자동 에러 분석

스크립트를 추가하면 자동으로 모든 JavaScript 에러를 캡처하고 분석합니다:

```javascript
// 이런 에러가 발생하면 자동으로 분석됨
nonexistentFunction(); // ReferenceError

// 또는
var obj = null;
obj.someMethod(); // TypeError
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

## 설정 변경

`tsSupportAI.js` 파일 내에서 다음 설정을 변경할 수 있습니다:

```javascript
// WebLLM 파일 경로 변경
var WebLLM_URL = "/web-llm/web-llm.min.js";
var WebLLM_WORKER_URL = "/web-llm/worker.js";

// 모델 설정 변경
global.webllm.CreateWebWorkerMLCEngine(worker, {
    model: "Llama-3-8B-Instruct-q4f32_1-MLC",  // 사용할 모델
    top_p: 0.9,                                 // 생성 다양성
    temperature: 0.7                            // 창의성 수준
});
```

## 출력 예시

콘솔에 다음과 같은 형식으로 분석 결과가 출력됩니다:

```
============================================================
[AI Error Assistant] 에러 분석 결과
============================================================

1) 에러 원인
ReferenceError: nonexistentFunction is not defined

2) 왜 발생했는가
존재하지 않는 함수를 호출하려고 했기 때문에 발생했습니다.
...

3) 해결방법 (코드 예시 포함)
함수를 정의하거나 올바른 함수명을 사용하세요:
...

4) 고객 안내 멘트
이 에러는 개발 과정에서 발생한 것으로, 곧 수정될 예정입니다.
...

============================================================
```

## 문제 해결

### WebLLM 로딩 실패

콘솔에 "WebLLM 로딩 실패" 메시지가 나타나는 경우:

1. `/web-llm/web-llm.min.js` 파일이 존재하는지 확인
2. 파일 경로가 올바른지 확인
3. 서버에서 해당 파일에 대한 접근 권한 확인

### Worker 생성 실패

"Web Worker 생성 실패" 메시지가 나타나는 경우:

1. `/web-llm/worker.js` 파일이 존재하는지 확인
2. CORS 설정 확인 (로컬 파일 시스템에서는 동작하지 않을 수 있음)
3. 웹 서버를 통해 접근해야 함 (file:// 프로토콜 사용 불가)

### 엔진 로드 오류

"엔진 로드 오류" 메시지가 나타나는 경우:

1. WebLLM 모델 파일이 올바른지 확인
2. 브라우저 콘솔에서 상세 오류 메시지 확인
3. 모델 파일 크기가 크므로 초기 로딩에 시간이 걸릴 수 있음

## 브라우저 호환성

- Chrome/Edge (권장)
- Firefox
- Safari
- ES5를 지원하는 기타 브라우저

**참고:** WebLLM은 WebGPU를 사용하므로 WebGPU를 지원하는 브라우저에서만 동작합니다.

## 라이센스

이 라이브러리는 프로젝트 내부 기술 지원 용도로 사용됩니다.

## 문의

기술 지원 관련 문의사항이 있으면 개발팀에 문의하세요.

