# AI Error Assistant 기능 분석 및 테스트 가이드

## 🎯 기능 분석

### 1. 자동 에러 캡처
- **window.onerror**: 일반 JavaScript 에러 자동 캡처
- **unhandledrejection**: Promise rejection 자동 캡처
- 모든 에러가 자동으로 큐에 저장되어 WebLLM이 준비되면 분석

### 2. 수동 에러 분석
- `AISupport.analyze(error)`: 수동으로 에러 분석 요청
- Error 객체, 문자열, 커스텀 객체 모두 지원

### 3. 에러 큐잉
- WebLLM 엔진 로딩 중 발생한 에러는 큐에 저장
- 엔진 준비 완료 후 자동으로 분석

## 📋 테스트 가능한 기능들

### 기본 기능
1. ✅ 자동 에러 캡처 및 분석
2. ✅ 수동 에러 분석 요청
3. ✅ 에러 큐잉 (엔진 로딩 중)
4. ✅ 다양한 에러 타입 지원

### 지원하는 에러 타입
- ReferenceError (정의되지 않은 변수/함수)
- TypeError (잘못된 타입 사용)
- SyntaxError (문법 오류)
- RangeError (범위 오류)
- URIError (URI 처리 오류)
- Promise Rejection
- 커스텀 에러

## 🧪 테스트 방법

### 방법 1: test.js 파일 사용

1. HTML에 스크립트 포함:
```html
<script src="tsSupportAI.js"></script>
<script src="test.js"></script>
```

2. 브라우저 콘솔에서 함수 호출:
```javascript
// 기본 에러 테스트
testReferenceError();
testTypeError();
testNullPointer();

// 모든 기본 테스트 실행
runAllBasicTests();

// 모든 시나리오 테스트 실행
runAllScenarioTests();
```

### 방법 2: 직접 코드 실행

브라우저 콘솔에서 직접 실행:
```javascript
// 에러 발생시키기
undefinedVariable++;

// 또는 수동 분석
try {
    JSON.parse("invalid");
} catch(err) {
    AISupport.analyze(err);
}
```

## 📝 test.js 파일 사용 예시

### 기본 에러 테스트
```javascript
// 1. ReferenceError
testReferenceError(); // 정의되지 않은 함수 호출

// 2. TypeError  
testTypeError(); // null 객체의 메서드 호출

// 3. SyntaxError
testSyntaxError(); // 잘못된 JSON 구문

// 4. Null 참조
testNullPointer(); // null 객체 접근

// 5. Promise Rejection
testPromiseRejection(); // 처리되지 않은 Promise 거부
```

### 실전 시나리오 테스트
```javascript
// API 응답 처리 에러
testAPIResponseError();

// DOM 조작 에러
testDOMError();

// 비동기 코드 에러
testAsyncError();

// JSON 파싱 에러
testJSONParseError();
```

### 수동 분석 테스트
```javascript
// Error 객체로 분석
manualAnalyzeError();

// 커스텀 에러 객체로 분석
manualAnalyzeCustomError();

// 문자열로 분석
manualAnalyzeString();
```

### 일괄 테스트
```javascript
// 모든 기본 에러 테스트 실행
runAllBasicTests();

// 모든 실전 시나리오 테스트 실행
runAllScenarioTests();
```

## ⚠️ 주의사항

### 브라우저가 멈출 수 있는 테스트
다음 함수들은 **실제로 실행하지 마세요**:
- `testStackOverflow()` - 재귀 호출로 브라우저 멈춤
- `testInfiniteLoop()` - 무한 루프로 브라우저 멈춤
- `testMemoryError()` - 메모리 부족으로 브라우저 멈춤

### 시크릿 모드 권장
캐시 문제를 피하기 위해 **시크릿 모드(Ctrl+Shift+N)**에서 테스트하는 것을 권장합니다.

## 📚 테스트 시나리오 예시

### 시나리오 1: 일반적인 개발 오류
```javascript
// 1. ReferenceError
testReferenceError();

// 2. TypeError
testNullPointer();

// 3. 배열 접근
testArrayAccessError();
```

### 시나리오 2: 비동기 코드 오류
```javascript
// 1. Promise Rejection
testPromiseRejection();

// 2. 비동기 에러
testAsyncError();

// 3. 타임아웃 에러
testTimeoutError();
```

### 시나리오 3: API/네트워크 오류
```javascript
// 1. 네트워크 에러
testNetworkError();

// 2. API 응답 처리
testAPIResponseError();

// 3. JSON 파싱
testJSONParseError();
```

## 🎯 빠른 시작

1. **HTML 파일 생성**:
```html
<!DOCTYPE html>
<html>
<head>
    <title>Error Test</title>
</head>
<body>
    <h1>에러 테스트 페이지</h1>
    <button onclick="testReferenceError()">ReferenceError 테스트</button>
    <button onclick="testTypeError()">TypeError 테스트</button>
    <button onclick="runAllBasicTests()">모든 기본 테스트</button>
    
    <script src="tsSupportAI.js"></script>
    <script src="test.js"></script>
</body>
</html>
```

2. **시크릿 모드에서 열기** (Ctrl+Shift+N)

3. **브라우저 콘솔 열기** (F12)

4. **버튼 클릭하거나 콘솔에서 함수 호출**

5. **AI 분석 결과 확인**

## 💡 팁

- 콘솔을 열어두고 테스트하세요
- WebLLM이 로드될 때까지 기다리세요 (몇 초 소요)
- 여러 에러를 연속으로 테스트할 수 있습니다
- 수동 분석은 즉시 가능합니다 (엔진 준비 후)

