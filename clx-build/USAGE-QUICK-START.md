# 🚀 AI Error Assistant 빠른 시작 가이드

## ✅ 작동 확인 완료!

시크릿 모드에서 정상 작동합니다! 이제 모든 기능을 테스트할 수 있습니다.

## 🎯 주요 기능

### 1. 자동 에러 캡처
- 모든 JavaScript 에러를 자동으로 캡처
- Promise rejection도 자동 캡처
- 에러 정보 자동 수집 (메시지, 파일명, 줄 번호, 스택)

### 2. 수동 에러 분석
- `AISupport.analyze(error)` - 원하는 에러만 분석
- Error 객체, 문자열, 커스텀 객체 모두 지원

### 3. AI 기반 분석
- WebLLM을 사용한 지능형 분석
- 에러 원인, 발생 이유, 해결방법 제공
- 기술 지원 엔지니어 관점의 설명

## 📋 test.js 파일 사용법

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

// 모든 시나리오 테스트 실행
runAllScenarioTests();

// 수동 분석
AISupport.analyze(new Error("테스트 에러"));
```

## 🧪 테스트 가능한 에러 목록

### 기본 에러 유형
- ✅ `testReferenceError()` - 정의되지 않은 변수/함수
- ✅ `testTypeError()` - null/undefined 객체 접근
- ✅ `testSyntaxError()` - 문법 오류
- ✅ `testRangeError()` - 범위 오류
- ✅ `testURIError()` - URI 처리 오류

### 실전 시나리오
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

### 복합 시나리오
- ✅ `testMultipleErrors()` - 여러 에러 연속 발생
- ✅ `testNestedError()` - 중첩된 에러

### 수동 분석
- ✅ `manualAnalyzeError()` - Error 객체 분석
- ✅ `manualAnalyzeCustomError()` - 커스텀 에러 분석
- ✅ `manualAnalyzeString()` - 문자열 분석

## 🎨 빠른 테스트 방법

### 방법 1: test.html 사용

1. `test.html` 파일을 브라우저로 엽니다
2. **시크릿 모드**로 열기 (Ctrl+Shift+N)
3. F12로 콘솔 열기
4. 버튼 클릭하거나 콘솔에서 함수 호출

### 방법 2: 브라우저 콘솔 직접 사용

1. 페이지에 스크립트 포함
2. F12로 콘솔 열기
3. 함수 직접 호출:

```javascript
// 즉시 에러 발생 및 분석
testReferenceError();

// 모든 테스트 자동 실행
runAllBasicTests();
```

## 💡 실제 사용 예시

### 예시 1: 개발 중 에러 발생

```javascript
// 코드에서 에러 발생
undefinedVariable++; // 자동으로 캡처되어 AI가 분석
```

### 예시 2: 특정 에러만 분석

```javascript
try {
    riskyOperation();
} catch(err) {
    AISupport.analyze(err); // 이 에러만 AI로 분석
}
```

### 예시 3: 커스텀 에러 정보 추가

```javascript
AISupport.analyze({
    message: "사용자 로그인 실패",
    code: "AUTH_001",
    userId: "user123",
    timestamp: new Date().toISOString()
});
```

## 📝 출력 예시

AI 분석 결과는 다음과 같이 출력됩니다:

```
============================================================
[AI Error Assistant] 에러 분석 결과
============================================================

1) 에러 원인
ReferenceError: undefinedFunction is not defined

2) 왜 발생했는가
정의되지 않은 함수를 호출하려고 했기 때문에 발생했습니다.

3) 해결방법 (코드 예시 포함)
함수를 먼저 정의하거나 올바른 함수명을 사용하세요:
function undefinedFunction() {
    // 함수 내용
}
undefinedFunction();

4) 고객 안내 멘트
이 오류는 개발 과정에서 발생한 것으로, 곧 수정될 예정입니다.

============================================================
```

## 🎯 다음 단계

1. ✅ `test.js` 파일로 다양한 에러 테스트
2. ✅ `test.html`로 인터랙티브 테스트
3. ✅ 실제 프로젝트에 통합하여 사용

## 📚 관련 문서

- `FEATURE-ANALYSIS.md` - 기능 상세 분석
- `TEST-GUIDE.md` - 테스트 가이드
- `tsSupportAI-README.md` - 사용 설명서

