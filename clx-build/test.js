/**
 * AI Error Assistant 기능 테스트 파일
 * 
 * 다양한 JavaScript 오류를 발생시켜
 * AI Error Assistant의 기능을 테스트할 수 있는 예제들
 * 
 * 사용 방법:
 * 1. HTML에 스크립트 포함: <script src="test.js"></script>
 * 2. 브라우저 콘솔에서 함수 호출
 * 3. 또는 버튼 클릭으로 테스트
 */

// ============================================================
// 1. 기본 에러 유형 테스트
// ============================================================

/**
 * ReferenceError 테스트 - 정의되지 않은 변수/함수
 */
function testReferenceError() {
    console.log("[테스트] ReferenceError 발생 시도...");
    undefinedFunction(); // 정의되지 않은 함수 호출
}

/**
 * TypeError 테스트 - null/undefined 객체 접근
 */
function testTypeError() {
    console.log("[테스트] TypeError 발생 시도...");
    var obj = null;
    obj.someMethod(); // null 객체의 메서드 호출
}

/**
 * SyntaxError 테스트 - 문법 오류
 */
function testSyntaxError() {
    console.log("[테스트] SyntaxError 발생 시도...");
    eval('var x = { invalid json };'); // 잘못된 JSON 구문
}

/**
 * RangeError 테스트 - 범위 오류
 */
function testRangeError() {
    console.log("[테스트] RangeError 발생 시도...");
    var arr = new Array(-1); // 음수 길이 배열
}

/**
 * URIError 테스트 - URI 처리 오류
 */
function testURIError() {
    console.log("[테스트] URIError 발생 시도...");
    decodeURIComponent('%'); // 잘못된 URI 인코딩
}

// ============================================================
// 2. 실제 개발에서 자주 발생하는 에러들
// ============================================================

/**
 * Null/Undefined 참조 에러
 */
function testNullPointer() {
    console.log("[테스트] Null 참조 에러 발생 시도...");
    var user = null;
    console.log(user.name); // Cannot read property 'name' of null
}

/**
 * 배열/객체 접근 에러
 */
function testArrayAccessError() {
    console.log("[테스트] 배열 접근 에러 발생 시도...");
    var arr = null;
    var first = arr[0]; // 에러 발생
    
    // 또는 중첩 객체
    var obj = {};
    var value = obj.nested.property; // Cannot read property 'property' of undefined
}

/**
 * 비동기 코드 에러
 */
function testAsyncError() {
    console.log("[테스트] 비동기 코드 에러 발생 시도...");
    setTimeout(function() {
        undefinedVariable++; // ReferenceError
    }, 1000);
}

/**
 * Promise Rejection 에러
 */
function testPromiseRejection() {
    console.log("[테스트] Promise Rejection 발생 시도...");
    Promise.reject(new Error("Promise가 거부되었습니다"));
}

/**
 * Fetch/AJAX 에러
 */
function testNetworkError() {
    console.log("[테스트] 네트워크 에러 시뮬레이션...");
    fetch('/api/nonexistent-endpoint')
        .then(function(response) {
            if (!response.ok) {
                throw new Error('HTTP ' + response.status);
            }
            return response.json();
        })
        .catch(function(error) {
            throw error; // 다시 throw하면 AI가 분석
        });
}

/**
 * JSON 파싱 에러
 */
function testJSONParseError() {
    console.log("[테스트] JSON 파싱 에러 발생 시도...");
    var badJSON = '{ "name": "test", "value": }'; // 잘못된 JSON
    var parsed = JSON.parse(badJSON); // 에러 발생
}

/**
 * 함수 호출 에러
 */
function testFunctionCallError() {
    console.log("[테스트] 함수 호출 에러 발생 시도...");
    var func = null;
    func(); // TypeError: func is not a function
}

// ============================================================
// 3. 복합적인 에러 시나리오
// ============================================================

/**
 * 여러 에러 연속 발생
 */
function testMultipleErrors() {
    console.log("[테스트] 여러 에러 연속 발생 시도...");
    
    setTimeout(function() {
        console.log("첫 번째 에러...");
        undefinedVar1();
    }, 100);
    
    setTimeout(function() {
        console.log("두 번째 에러...");
        var obj = null;
        obj.method();
    }, 200);
    
    setTimeout(function() {
        console.log("세 번째 에러...");
        JSON.parse("invalid");
    }, 300);
}

/**
 * 중첩된 에러
 */
function testNestedError() {
    console.log("[테스트] 중첩된 에러 발생 시도...");
    
    function level1() {
        function level2() {
            function level3() {
                undefinedDeepVariable++;
            }
            level3();
        }
        level2();
    }
    level1();
}

// ============================================================
// 4. 실전 시나리오 기반 테스트
// ============================================================

/**
 * API 응답 처리 에러
 */
function testAPIResponseError() {
    console.log("[테스트] API 응답 처리 에러 시뮬레이션...");
    
    var apiResponse = {
        data: null,
        items: undefined
    };
    
    // 실제 코드에서 흔히 하는 실수
    var items = apiResponse.data.items; // TypeError
    var count = items.length; // 추가 에러
}

/**
 * DOM 조작 에러
 */
function testDOMError() {
    console.log("[테스트] DOM 조작 에러 발생 시도...");
    
    // 존재하지 않는 요소 접근
    var element = document.getElementById('nonexistent-element');
    element.innerHTML = "내용"; // TypeError
    
    // 또는
    var button = document.querySelector('.non-existent-button');
    button.addEventListener('click', function() {}); // TypeError
}

/**
 * 이벤트 핸들러 에러
 */
function testEventHandlerError() {
    console.log("[테스트] 이벤트 핸들러 에러 발생 시도...");
    
    window.addEventListener('click', function(event) {
        // 이벤트 핸들러 내부에서 에러 발생
        undefinedInHandler++;
    });
    
    console.log("화면을 클릭하면 에러가 발생합니다.");
}

/**
 * CORS 에러 시뮬레이션
 */
function testCORSError() {
    console.log("[테스트] CORS 에러 시뮬레이션...");
    
    fetch('https://example.com/api/data')
        .then(function(response) {
            return response.json();
        })
        .catch(function(error) {
            console.error("CORS 에러:", error);
            if (window.AISupport) {
                AISupport.analyze({
                    message: error.message,
                    type: "CORS Error",
                    details: "Cross-Origin Resource Sharing 정책 위반"
                });
            }
        });
}

// ============================================================
// 5. 수동 분석 테스트
// ============================================================

/**
 * 수동으로 에러 분석 요청 - Error 객체
 */
function manualAnalyzeError() {
    console.log("[테스트] 수동 에러 분석 시도...");
    
    try {
        var result = JSON.parse("invalid json string");
    } catch (err) {
        console.log("수동으로 에러 분석을 요청합니다...");
        if (window.AISupport) {
            AISupport.analyze(err);
        } else {
            console.error("AISupport 객체를 찾을 수 없습니다.");
        }
    }
}

/**
 * 수동으로 에러 분석 요청 - 커스텀 에러 객체
 */
function manualAnalyzeCustomError() {
    console.log("[테스트] 커스텀 에러 객체 분석 시도...");
    
    var customError = {
        message: "사용자 로그인 실패",
        code: "AUTH_001",
        context: {
            userId: "user123",
            timestamp: new Date().toISOString(),
            ip: "192.168.1.1"
        },
        details: "비밀번호가 5회 이상 틀렸습니다."
    };
    
    if (window.AISupport) {
        AISupport.analyze(customError);
    }
}

/**
 * 수동으로 에러 분석 요청 - 문자열
 */
function manualAnalyzeString() {
    console.log("[테스트] 문자열로 에러 분석 시도...");
    
    var errorMessage = "데이터베이스 연결 실패: Connection timeout after 30 seconds";
    
    if (window.AISupport) {
        AISupport.analyze({
            message: errorMessage,
            type: "DatabaseError",
            timestamp: new Date().toISOString()
        });
    }
}

/**
 * 수동으로 에러 분석 요청 - 스택 트레이스 포함
 */
function manualAnalyzeWithStack() {
    console.log("[테스트] 스택 트레이스 포함 에러 분석 시도...");
    
    try {
        function innerFunction() {
            function deeperFunction() {
                throw new Error("깊은 스택에서 발생한 에러");
            }
            deeperFunction();
        }
        innerFunction();
    } catch (err) {
        if (window.AISupport) {
            AISupport.analyze({
                name: err.name,
                message: err.message,
                stack: err.stack,
                context: "복잡한 함수 호출 체인에서 발생"
            });
        }
    }
}

// ============================================================
// 6. 테스트 헬퍼 함수
// ============================================================

/**
 * 모든 기본 에러 테스트 실행
 */
function runAllBasicTests() {
    console.log("%c=== 모든 기본 에러 테스트 시작 ===", "color:#4CAF50; font-weight:bold");
    
    var tests = [
        { name: "ReferenceError", func: testReferenceError },
        { name: "TypeError", func: testTypeError },
        { name: "SyntaxError", func: testSyntaxError },
        { name: "RangeError", func: testRangeError },
        { name: "URIError", func: testURIError }
    ];
    
    tests.forEach(function(test, index) {
        setTimeout(function() {
            console.log("\n[테스트 " + (index + 1) + "/" + tests.length + "] " + test.name);
            try {
                test.func();
            } catch (err) {
                console.log("예상된 에러:", err.message);
            }
        }, index * 500);
    });
}

/**
 * 모든 실전 시나리오 테스트 실행
 */
function runAllScenarioTests() {
    console.log("%c=== 모든 실전 시나리오 테스트 시작 ===", "color:#4CAF50; font-weight:bold");
    
    var tests = [
        { name: "Null 참조", func: testNullPointer },
        { name: "배열 접근", func: testArrayAccessError },
        { name: "비동기 에러", func: testAsyncError },
        { name: "Promise Rejection", func: testPromiseRejection },
        { name: "JSON 파싱", func: testJSONParseError },
        { name: "함수 호출", func: testFunctionCallError },
        { name: "API 응답", func: testAPIResponseError },
        { name: "DOM 조작", func: testDOMError }
    ];
    
    tests.forEach(function(test, index) {
        setTimeout(function() {
            console.log("\n[시나리오 테스트 " + (index + 1) + "/" + tests.length + "] " + test.name);
            try {
                test.func();
            } catch (err) {
                console.log("예상된 에러:", err.message);
            }
        }, index * 500);
    });
}

// ============================================================
// 7. 글로벌 객체로 노출
// ============================================================

// 브라우저 콘솔에서 쉽게 테스트할 수 있도록 글로벌로 노출
if (typeof window !== 'undefined') {
    window.testReferenceError = testReferenceError;
    window.testTypeError = testTypeError;
    window.testSyntaxError = testSyntaxError;
    window.testRangeError = testRangeError;
    window.testURIError = testURIError;
    window.testNullPointer = testNullPointer;
    window.testArrayAccessError = testArrayAccessError;
    window.testAsyncError = testAsyncError;
    window.testPromiseRejection = testPromiseRejection;
    window.testNetworkError = testNetworkError;
    window.testJSONParseError = testJSONParseError;
    window.testFunctionCallError = testFunctionCallError;
    window.testMultipleErrors = testMultipleErrors;
    window.testNestedError = testNestedError;
    window.testAPIResponseError = testAPIResponseError;
    window.testDOMError = testDOMError;
    window.testEventHandlerError = testEventHandlerError;
    window.testCORSError = testCORSError;
    window.manualAnalyzeError = manualAnalyzeError;
    window.manualAnalyzeCustomError = manualAnalyzeCustomError;
    window.manualAnalyzeString = manualAnalyzeString;
    window.manualAnalyzeWithStack = manualAnalyzeWithStack;
    window.runAllBasicTests = runAllBasicTests;
    window.runAllScenarioTests = runAllScenarioTests;
    
    console.log("%c[테스트 파일 로드 완료]", "color:#4CAF50; font-weight:bold");
    console.log("콘솔에서 다음 함수들을 사용할 수 있습니다:");
    console.log("- testReferenceError()");
    console.log("- testTypeError()");
    console.log("- testNullPointer()");
    console.log("- runAllBasicTests()");
    console.log("- runAllScenarioTests()");
    console.log("- AISupport.analyze(error)");
    console.log("등등...");
}
