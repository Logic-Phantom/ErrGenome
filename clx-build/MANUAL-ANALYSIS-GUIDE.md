# 수동 에러 분석 가이드

## 현재 상황

에러가 발생했지만 `window.onerror`가 호출되지 않아 자동 분석이 작동하지 않습니다.

## 즉시 해결 방법

### 방법 1: 콘솔에서 직접 분석

콘솔(F12)에서 다음을 실행하세요:

```javascript
// 발생한 RangeError 직접 분석
AISupport.analyze({
    name: "RangeError",
    message: "Invalid array length",
    stack: "at Button.onBtn1Click (http://127.0.0.1:52194/eXWeb-LLM/clx-src/AI/test.clx.js:30:18)    at Object.do (http://127.0.0.1:52194/__runtime__/cleopatra.js:159771:62)    at Object.tryCatch (http://127.0.0.1:52194/__runtime__/cleopatra.js:147460:27)    at dispatching (http://127.0.0.1:52194/__runtime__/cleopatra.js:159769:31)    at Array.some (<anonymous>)    at EventTable.dispatchEvent (http://127.0.0.1:52194/__runtime__/cleopatra.js:159782:34)    at Control._processEvent (http://127.0.0.1:52194/__runtime__/cleopatra.js:47680:90)    at EventBus._dispatchEvent (http://127.0.0.1:52194/__runtime__/cleopatra.js:162204:33)    at Control.dispatchEvent (http://127.0.0.1:52194/__runtime__/cleopatra.js:47652:68)    at UIControl.dispatchEvent (http://127.0.0.1:52194/__runtime__/cleopatra.js:63909:72)    at http://127.0.0.1:52194/__runtime__/cleopatra.js:152756:39    at HTMLDivElement.xbhandle (http://127.0.0.1:52194/__runtime__/cleopatra.js:162493:21)"
});
```

### 방법 2: test.js 파일 수정

`test.clx.js` 파일을 수정하여 에러 발생 시 자동으로 분석:

```javascript
function onBtn1Click(e){
    console.log("[테스트] RangeError 발생 시도...");
    
    try {
        var arr = new Array(-1); // 음수 길이 배열
    } catch(err) {
        // 에러를 직접 분석
        if (window.AISupport && window.AISupport.ready) {
            console.log("[테스트] 에러를 AI로 분석 요청...");
            window.AISupport.analyze(err);
        }
        // 원래 에러도 다시 던져서 콘솔에 표시
        throw err;
    }
}
```

### 방법 3: 콘솔 에러 자동 분석 함수

콘솔에서 사용할 헬퍼 함수:

```javascript
// 콘솔에 붙여넣기
function analyzeLastError() {
    // 콘솔에서 마지막 에러 정보로 분석
    AISupport.analyze({
        name: "RangeError",
        message: "Invalid array length",
        source: "test.clx.js",
        lineno: 30,
        colno: 18
    });
}

// 실행
analyzeLastError();
```

## 테스트

다음 중 하나를 시도하세요:

1. **콘솔에서 직접 실행:**
```javascript
AISupport.analyze(new Error("Invalid array length"));
```

2. **간단한 테스트:**
```javascript
undefinedVariable++; // 이건 자동 캡처될 수도 있음
```

## 문제 확인

`window.onerror`가 호출되는지 확인:

```javascript
// 콘솔에서 실행
console.log("window.onerror 설정됨:", typeof window.onerror === "function");

// 테스트 에러 발생
throw new Error("테스트");
```

만약 `window.onerror`가 호출되지 않는다면, 프레임워크가 에러를 가로채고 있는 것입니다.

