# 🚀 WebLLM ES Module 오류 빠른 해결 가이드

## 현재 발생한 문제

```
SyntaxError: Unexpected token 'export'
web-llm.min.js:12829 Uncaught SyntaxError: Unexpected token 'export'
[AI Error Assistant] webllm 객체를 찾을 수 없습니다.
```

**원인:** WebLLM은 ES Module 형식이라 일반 `<script>` 태그로 로드할 수 없습니다.

## ✅ 가장 간단한 해결 방법

### 방법 1: HTML에서 WebLLM을 먼저 로드 (권장)

HTML 파일에서 WebLLM을 ES Module로 먼저 로드하고, `tsSupportAI.js`를 나중에 로드하세요:

```html
<!DOCTYPE html>
<html>
<head>
    <title>My App</title>
</head>
<body>
    <!-- 다른 스크립트들... -->
    
    <!-- 1단계: WebLLM을 ES Module로 먼저 로드 -->
    <script type="module">
        import * as webllm from '/web-llm/web-llm.min.js';
        
        // 전역 객체로 노출 (tsSupportAI.js에서 사용)
        window.webllm = webllm;
        
        console.log('✅ WebLLM 로드 완료');
        console.log('사용 가능한 함수:', Object.keys(webllm));
        
        // tsSupportAI.js가 사용할 수 있도록 플래그 설정
        window.webllmReady = true;
    </script>
    
    <!-- 2단계: tsSupportAI.js는 일반 스크립트로 로드 -->
    <script src="/clx-src/tsSupportAI.js"></script>
    
    <!-- 나머지 스크립트들... -->
</body>
</html>
```

### 방법 2: CDN 사용 (더 간단)

WebLLM을 CDN에서 직접 로드:

```html
<!-- WebLLM을 CDN에서 로드 -->
<script type="module">
    import * as webllm from 'https://esm.run/@mlc-ai/web-llm';
    window.webllm = webllm;
    window.webllmReady = true;
</script>

<!-- tsSupportAI.js 로드 -->
<script src="/clx-src/tsSupportAI.js"></script>
```

## 📝 경로 설정 확인

`tsSupportAI.js`의 경로가 올바른지 확인하세요:

```javascript
// 현재 설정 (21-22번 줄)
var WebLLM_URL = "/web-llm/web-llm.min.js";  // 절대 경로
var WebLLM_WORKER_URL = "/web-llm/worker.js";
```

프로젝트 구조에 맞게 수정:

```javascript
// 상대 경로 사용 시
var WebLLM_URL = "../web-llm/web-llm.min.js";
var WebLLM_WORKER_URL = "../web-llm/worker.js";
```

## 🔍 현재 파일 구조 확인

다음 파일들이 올바른 위치에 있는지 확인:

```
프로젝트/
├── web-llm/
│   ├── web-llm.min.js  ✅ (5.73 MB)
│   └── worker.js       ✅
└── clx-src/
    └── tsSupportAI.js  ✅
```

## ✅ 테스트 방법

1. HTML 파일을 브라우저로 엽니다
2. 개발자 도구 콘솔을 엽니다 (F12)
3. 다음 메시지가 보이는지 확인:
   - `✅ WebLLM 로드 완료`
   - `[AI Error Assistant] WebLLM 로드 시작...`
   - `[AI Error Assistant] ✓ WebLLM 엔진 로드 완료`

## ⚠️ 주의사항

1. **HTTP 서버 필요**: ES Module은 `file://` 프로토콜로는 작동하지 않습니다
   - ✅ `http://localhost:52194/...` → 작동
   - ❌ `file:///C:/...` → 작동 안 함

2. **최신 브라우저 필요**: ES Module을 지원하는 브라우저 필요
   - ✅ Chrome 63+
   - ✅ Firefox 67+
   - ✅ Safari 11.1+
   - ✅ Edge 79+

## 🔧 추가 문제 해결

### 문제: "webllm 객체를 찾을 수 없습니다"

**해결:** HTML에서 WebLLM을 먼저 로드하세요 (위의 방법 1 참고)

### 문제: "CreateMLCEngine을 찾을 수 없습니다"

**해결:** WebLLM 모듈이 올바르게 로드되었는지 확인:
```javascript
console.log('WebLLM 키:', Object.keys(window.webllm));
console.log('CreateMLCEngine:', typeof window.webllm.CreateMLCEngine);
```

### 문제: 모델 로드 실패

**해결:** 모델 이름 확인 및 네트워크 연결 확인
- 지원되는 모델: `Llama-3.1-8B-Instruct-q4f32_1-MLC`
- 첫 로드 시 모델 다운로드가 필요할 수 있음 (시간 소요)

## 📚 더 자세한 정보

- `WEBLLM-ESMODULE-FIX.md` - 상세한 해결 방법
- `WEBLLM-DOWNLOAD-GUIDE.md` - WebLLM 다운로드 가이드

## 💡 빠른 체크리스트

- [ ] HTML에서 WebLLM을 ES Module로 먼저 로드
- [ ] `window.webllm` 객체 확인
- [ ] `tsSupportAI.js` 경로 확인
- [ ] HTTP 서버로 접근 (file:// 아님)
- [ ] 최신 브라우저 사용
- [ ] 콘솔에서 오류 확인

