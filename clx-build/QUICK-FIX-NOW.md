# 🔧 즉시 해결 방법

## 문제
에러가 발생했지만 `window.onerror`가 호출되지 않아 자동 분석이 작동하지 않습니다.

## ✅ 즉시 해결

### 브라우저 콘솔에서 실행:

```javascript
// 발생한 RangeError 분석
AISupport.analyze({
    name: "RangeError",
    message: "Invalid array length",
    stack: "at Button.onBtn1Click (http://127.0.0.1:52194/eXWeb-LLM/clx-src/AI/test.clx.js:30:18)"
});
```

또는 더 간단하게:

```javascript
// 간단한 테스트
AISupport.analyze(new Error("Invalid array length"));
```

## 📝 test.clx.js 파일 수정

에러 발생 시 자동으로 분석하도록 수정:

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

이렇게 하면 에러가 발생할 때마다 자동으로 AI 분석이 시작됩니다!

