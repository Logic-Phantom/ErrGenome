# AI Error Assistant 기능 분석

## ✅ 작동 확인

시크릿 모드에서 정상 작동합니다! 이제 모든 기능을 테스트할 수 있습니다.

## 🎯 주요 기능

### 1. 자동 에러 캡처

#### window.onerror 후킹
- 모든 JavaScript 에러를 자동으로 캡처
- 에러 메시지, 파일명, 줄 번호, 컬럼 번호, 스택 트레이스 수집
- 타임스탬프 자동 추가

**자동 캡처되는 에러:**
```javascript
undefinedVariable++; // ReferenceError - 자동 캡처됨
nullObject.method(); // TypeError - 자동 캡처됨
JSON.parse("invalid"); // SyntaxError - 자동 캡처됨
```

#### unhandledrejection 후킹
- 처리되지 않은 Promise rejection 자동 캡처
- 비동기 코드에서 발생하는 에러도 자동 처리

**자동 캡처되는 에러:**
```javascript
Promise.reject(new Error("에러")); // 자동 캡처됨
fetch('/api').then().catch(...); // catch 없으면 자동 캡처됨
```

### 2. 수동 에러 분석

#### AISupport.analyze() 메서드
- Error 객체 분석
- 문자열 분석
- 커스텀 에러 객체 분석

**사용 예:**
```javascript
// Error 객체
try {
    riskyOperation();
} catch(err) {
    AISupport.analyze(err);
}

// 문자열
AISupport.analyze("에러 메시지");

// 커스텀 객체
AISupport.analyze({
    message: "커스텀 에러",
    code: "ERR001",
    context: "추가 정보"
});
```

### 3. 에러 큐잉 시스템

- WebLLM 엔진 로딩 중 발생한 에러는 큐에 저장
- 엔진 준비 완료 후 자동으로 순차 분석
- 최대 10개까지 큐에 저장 (초과 시 경고)

### 4. AI 기반 에러 분석

- WebLLM을 사용한 지능형 에러 분석
- 에러 원인, 발생 이유, 해결방법 제공
- 기술 지원 엔지니어 관점의 분석
- 한국어 답변

## 📋 지원하는 에러 타입

### 1. ReferenceError
- 정의되지 않은 변수/함수 사용
- 스코프 밖에서 접근

**예시:**
```javascript
undefinedFunction(); // ReferenceError
var x = undefinedVariable; // ReferenceError
```

### 2. TypeError
- null/undefined 객체 접근
- 잘못된 타입의 메서드 호출
- 함수가 아닌 값에 함수 호출

**예시:**
```javascript
null.method(); // TypeError
123.split(","); // TypeError
var func = null; func(); // TypeError
```

### 3. SyntaxError
- JavaScript 문법 규칙 위반
- 잘못된 JSON 구문
- 괄호/중괄호 불일치

**예시:**
```javascript
var x = { invalid json }; // SyntaxError
eval("var x = '문자열 안 닫힘;"); // SyntaxError
```

### 4. RangeError
- 잘못된 숫자 범위
- 배열 길이 오류

**예시:**
```javascript
new Array(-1); // RangeError
(10).toFixed(-1); // RangeError
```

### 5. URIError
- URI 처리 함수 오류

**예시:**
```javascript
decodeURIComponent('%'); // URIError
```

### 6. Promise Rejection
- 처리되지 않은 Promise 거부
- 비동기 코드 에러

**예시:**
```javascript
Promise.reject(new Error("에러")); // 자동 캡처
```

## 🧪 테스트 가능한 시나리오

### 시나리오 1: 일반적인 개발 오류
- ReferenceError
- TypeError
- Null 참조
- 배열 접근 오류

### 시나리오 2: 비동기 코드 오류
- Promise Rejection
- setTimeout/setInterval 에러
- 비동기 콜백 체인 에러

### 시나리오 3: API/네트워크 오류
- Fetch API 에러
- JSON 파싱 에러
- 네트워크 타임아웃

### 시나리오 4: DOM 조작 오류
- 존재하지 않는 요소 접근
- 이벤트 핸들러 에러
- DOM API 오류

### 시나리오 5: 비즈니스 로직 오류
- 데이터 변환 오류
- 유효성 검사 오류
- 계산 오류

## 🎨 출력 형식

AI 분석 결과는 다음 형식으로 출력됩니다:

```
============================================================
[AI Error Assistant] 에러 분석 결과
============================================================

1) 에러 원인
[AI가 분석한 에러 원인]

2) 왜 발생했는가
[발생 이유 설명]

3) 해결방법 (코드 예시 포함)
[구체적인 해결 방법과 코드 예시]

4) 고객 안내 멘트
[기술 지원에서 사용할 수 있는 안내 멘트]

============================================================
```

## 💡 사용 팁

### 1. 자동 분석 활용
- 페이지에 스크립트만 추가하면 모든 에러 자동 캡처
- 개발 중 실수로 발생한 에러도 자동으로 분석

### 2. 수동 분석 활용
- 특정 에러만 선택적으로 분석
- 커스텀 에러 정보 추가 가능
- 디버깅 중 특정 부분만 분석

### 3. 에러 큐잉 활용
- 페이지 로드 초기 에러도 놓치지 않음
- WebLLM 로딩 전 에러도 나중에 분석

## 📝 test.js 파일 사용법

자세한 테스트 예제는 `test.js` 파일에 포함되어 있습니다.

**사용 방법:**
1. HTML에 스크립트 포함
2. 브라우저 콘솔에서 함수 호출
3. 또는 버튼 클릭으로 테스트

**예시:**
```html
<script src="tsSupportAI.js"></script>
<script src="test.js"></script>
```

콘솔에서:
```javascript
testReferenceError();
testTypeError();
runAllBasicTests();
```

## 🔧 시크릿 모드에서 테스트

캐시 문제를 피하기 위해 시크릿 모드 사용 권장:
- **Ctrl+Shift+N** (Chrome/Edge)
- **Ctrl+Shift+P** (Firefox)

## 📚 참고 문서

- `TEST-GUIDE.md` - 상세 테스트 가이드
- `test.js` - 모든 테스트 예제 함수
- `tsSupportAI-README.md` - 사용 설명서

