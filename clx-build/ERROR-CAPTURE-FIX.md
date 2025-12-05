# 에러 캡처 문제 해결 가이드

## 문제 상황

에러가 발생했지만 AI 분석이 시작되지 않습니다. `window.onerror`가 호출되지 않는 것 같습니다.

## 원인

일부 프레임워크(예: cleopatra.js)는 에러를 내부에서 처리하거나 `window.onerror`를 트리거하지 않을 수 있습니다.

## 해결 방법

### 방법 1: 디버깅 로그 확인

`window.onerror`가 호출되는지 확인:

```javascript
// 콘솔에서 확인
console.log("현재 window.onerror:", window.onerror);
```

### 방법 2: 수동 분석 사용

에러 발생 후 직접 분석 요청:

```javascript
// 콘솔에서 실행
AISupport.analyze({
    name: "RangeError",
    message: "Invalid array length",
    stack: "at Button.onBtn1Click..."
});
```

### 방법 3: 에러 발생 지점에서 직접 호출

에러가 발생하는 코드를 수정:

```javascript
function onBtn1Click(e){
    console.log("[테스트] RangeError 발생 시도...");
    
    try {
        var arr = new Array(-1); // 음수 길이 배열
    } catch(err) {
        // 에러를 직접 분석 요청
        if (window.AISupport) {
            AISupport.analyze(err);
        }
        throw err; // 원래 에러도 다시 던짐
    }
}
```

### 방법 4: 콘솔 에러 모니터링

콘솔에 출력된 에러를 직접 복사해서 분석:

```javascript
// 콘솔에서 실행
AISupport.analyze({
    name: "RangeError",
    message: "Invalid array length",
    stack: "at Button.onBtn1Click (http://127.0.0.1:52194/eXWeb-LLM/clx-src/AI/test.clx.js:30:18) ..."
});
```

