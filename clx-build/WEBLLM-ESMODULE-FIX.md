# WebLLM ES Module 오류 해결 방법

## 발생한 오류

```
SyntaxError: Unexpected token 'export'
web-llm.min.js:12829 Uncaught SyntaxError: Unexpected token 'export'
[AI Error Assistant] webllm 객체를 찾을 수 없습니다.
```

## 문제 원인

WebLLM은 **ES Module 형식**으로 빌드되어 있어서, 일반 `<script>` 태그로는 로드할 수 없습니다.

- ❌ 일반 스크립트: `<script src="web-llm.min.js"></script>` → 작동 안 함
- ✅ ES Module: 동적 `import()` 또는 `<script type="module">` 필요

## 해결 방법

### 방법 1: HTML에서 ES Module 방식으로 로드 (가장 간단)

HTML 파일에서 WebLLM을 ES Module로 직접 로드:

```html
<!DOCTYPE html>
<html>
<head>
    <title>My App</title>
</head>
<body>
    <!-- 다른 스크립트들... -->
    
    <!-- tsSupportAI.js 로드 (ES5 호환) -->
    <script src="/clx-src/tsSupportAI.js"></script>
    
    <!-- WebLLM을 ES Module로 직접 로드 -->
    <script type="module">
        import * as webllm from '/web-llm/web-llm.min.js';
        
        // 전역 객체로 노출 (tsSupportAI.js에서 사용 가능하도록)
        window.webllm = webllm;
        
        console.log('WebLLM 로드 완료:', webllm);
    </script>
</body>
</html>
```

### 방법 2: tsSupportAI.js에서 동적 import 사용 (현재 구현)

현재 `tsSupportAI.js`는 이미 동적 import를 사용하도록 수정되어 있습니다.
하지만 동적 import는 최신 브라우저에서만 지원됩니다.

**브라우저 호환성:**
- ✅ Chrome 63+
- ✅ Firefox 67+
- ✅ Safari 11.1+
- ✅ Edge 79+
- ❌ IE 11 (지원 안 함)

### 방법 3: CDN에서 직접 로드 (권장)

WebLLM을 CDN에서 ES Module로 직접 로드:

```html
<script type="module">
    import * as webllm from 'https://esm.run/@mlc-ai/web-llm';
    window.webllm = webllm;
</script>
```

## 현재 코드 수정 필요 사항

### 1. 경로 확인

`tsSupportAI.js`의 WebLLM 경로가 올바른지 확인:

```javascript
var WebLLM_URL = "/web-llm/web-llm.min.js";  // 절대 경로
// 또는
var WebLLM_URL = "../web-llm/web-llm.min.js";  // 상대 경로 (프로젝트 구조에 맞게)
```

### 2. 파일 존재 확인

다음 파일들이 있는지 확인:
- `/web-llm/web-llm.min.js` (또는 상대 경로)
- `/web-llm/worker.js` (Worker 사용 시)

### 3. 서버 설정 확인

ES Module은 **HTTP/HTTPS 프로토콜**로만 로드 가능합니다.
- ✅ `http://localhost:52194/...` → 작동
- ❌ `file:///C:/...` → 작동 안 함

## 빠른 테스트

다음 HTML로 테스트해보세요:

```html
<!DOCTYPE html>
<html>
<head>
    <title>WebLLM 테스트</title>
</head>
<body>
    <h1>WebLLM 로드 테스트</h1>
    <script type="module">
        // WebLLM 로드
        import * as webllm from '/web-llm/web-llm.min.js';
        
        console.log('✅ WebLLM 로드 성공!');
        console.log('사용 가능한 함수:', Object.keys(webllm));
        
        // 전역으로 노출
        window.webllm = webllm;
        
        // CreateMLCEngine 확인
        if (webllm.CreateMLCEngine) {
            console.log('✅ CreateMLCEngine 함수 발견!');
        } else {
            console.error('❌ CreateMLCEngine 함수를 찾을 수 없음');
        }
    </script>
    
    <!-- tsSupportAI.js는 일반 스크립트로 로드 가능 -->
    <script src="/clx-src/tsSupportAI.js"></script>
</body>
</html>
```

## 권장 해결책

**가장 간단한 방법:** HTML에서 WebLLM을 ES Module로 먼저 로드하고, 
그 다음 `tsSupportAI.js`를 로드하세요.

```html
<!-- 1. WebLLM을 ES Module로 먼저 로드 -->
<script type="module">
    import * as webllm from '/web-llm/web-llm.min.js';
    window.webllm = webllm;
    window.webllmReady = true;
</script>

<!-- 2. tsSupportAI.js는 일반 스크립트로 로드 -->
<script src="/clx-src/tsSupportAI.js"></script>
```

그리고 `tsSupportAI.js`에서 `window.webllm`을 직접 사용하도록 수정:

```javascript
// WebLLM이 이미 로드되어 있는지 확인
if (window.webllm) {
    var CreateMLCEngine = window.webllm.CreateMLCEngine;
    // ... 나머지 코드
} else {
    console.error("WebLLM이 로드되지 않았습니다. HTML에서 먼저 로드하세요.");
}
```

## 추가 참고사항

- WebLLM 공식 문서: https://webllm.mlc.ai/
- ES Module 지원 브라우저: https://caniuse.com/es6-module
- 동적 import 지원 브라우저: https://caniuse.com/es6-module-dynamic-import

