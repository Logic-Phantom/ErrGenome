/**
 * AI Error Assistant 기능 테스트 파일
 * 
 * 이 파일에는 다양한 JavaScript 오류를 발생시켜
 * AI Error Assistant의 기능을 테스트할 수 있는 예제들이 포함되어 있습니다.
 * 
 * 사용 방법:
 * 1. HTML 파일에 이 스크립트를 포함
 * 2. 브라우저 콘솔에서 함수 호출
 * 3. 또는 버튼 클릭으로 테스트
 */

// ============================================================
// 1. 기본 에러 유형 테스트
// ============================================================

/**
 * ReferenceError 테스트
 * 정의되지 않은 변수나 함수를 사용할 때 발생
 */
function testReferenceError() {
    console.log("[테스트] ReferenceError 발생 시도...");
    
    // 정의되지 않은 함수 호출
    undefinedFunction();
    
    // 또는
    // var result = undefinedVariable;
}

/**
 * TypeError 테스트
 * 잘못된 타입의 값에 접근하거나 메서드를 호출할 때 발생
 */
function testTypeError() {
    console.log("[테스트] TypeError 발생 시도...");
    
    // null 객체의 메서드 호출
    var obj = null;
    obj.someMethod();
    
    // 또는
    // var num = 123;
    // num.split(","); // 숫자에 문자열 메서드 사용
}

/**
 * SyntaxError 테스트
 * JavaScript 문법 규칙을 위반할 때 발생
 */
function testSyntaxError() {
    console.log("[테스트] SyntaxError 발생 시도...");
    
    // 잘못된 JSON 구문
    eval('var x = { invalid json };');
    
    // 또는
    // eval('var x = "문자열이 닫히지 않음;');
}

/**
 * RangeError 테스트
 * 유효하지 않은 숫자 값이 사용될 때 발생
 */
function testRangeError() {
    console.log("[테스트] RangeError 발생 시도...");
    
    var arr = new Array(-1); // 음수 길이 배열
    // 또는
    // (10).toFixed(-1); // 잘못된 소수점 자릿수
}

/**
 * URIError 테스트
 * URI 처리 함수에 잘못된 인자가 전달될 때 발생
 */
function testURIError() {
    console.log("[테스트] URIError 발생 시도...");
    
    decodeURIComponent('%');
    // 또는
    // encodeURI('\uD800'); // 잘못된 유니코드
}

// ============================================================
// 2. 실제 개발에서 자주 발생하는 에러들
// ============================================================

/**
 * Null/Undefined 참조 에러
 * 가장 흔한 실수 중 하나
 */
function testNullPointer() {
    console.log("[테스트] Null 참조 에러 발생 시도...");
    
    var user = null;
    console.log(user.name); // Cannot read property 'name' of null
    
    // 또는 중첩된 객체
    var data = { user: null };
    var email = data.user.email; // 에러 발생
}

/**
 * 배열/객체 접근 에러
 */
function testArrayAccessError() {
    console.log("[테스트] 배열 접근 에러 발생 시도...");
    
    var arr = null;
    var first = arr[0]; // 에러 발생
    
    // 또는
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
    
    // 또는
    setInterval(function() {
        throw new Error("주기적으로 발생하는 에러");
    }, 2000);
}

/**
 * Promise Rejection 에러
 */
function testPromiseRejection() {
    console.log("[테스트] Promise Rejection 발생 시도...");
    
    Promise.reject(new Error("Promise가 거부되었습니다"));
    
    // 또는
    new Promise(function(resolve, reject) {
        setTimeout(function() {
            reject(new Error("비동기 작업 실패"));
        }, 500);
    });
}

/**
 * Fetch/AJAX 에러
 */
function testNetworkError() {
    console.log("[테스트] 네트워크 에러 시뮬레이션...");
    
    // 존재하지 않는 URL
    fetch('/api/nonexistent-endpoint')
        .then(function(response) {
            if (!response.ok) {
                throw new Error('HTTP ' + response.status + ': ' + response.statusText);
            }
            return response.json();
        })
        .catch(function(error) {
            // 에러는 자동으로 캡처됨 (unhandledrejection)
            console.error("네트워크 에러:", error);
            throw error; // 다시 throw하면 AI가 분석
        });
}

/**
 * JSON 파싱 에러
 */
function testJSONParseError() {
    console.log("[테스트] JSON 파싱 에러 발생 시도...");
    
    try {
        var data = JSON.parse('{ invalid json }');
    } catch (err) {
        // 수동으로 분석 요청
        if (window.AISupport) {
            AISupport.analyze(err);
        }
    }
    
    // 또는 자동 캡처를 위해
    var badJSON = '{ "name": "test", "value": }'; // 잘못된 JSON
    var parsed = JSON.parse(badJSON);
}

/**
 * 함수 호출 에러
 */
function testFunctionCallError() {
    console.log("[테스트] 함수 호출 에러 발생 시도...");
    
    var func = null;
    func(); // TypeError: func is not a function
    
    // 또는
    var obj = { method: "not a function" };
    obj.method(); // TypeError: obj.method is not a function
}

/**
 * 스코프 관련 에러
 */
function testScopeError() {
    console.log("[테스트] 스코프 에러 발생 시도...");
    
    if (true) {
        var localVar = "로컬 변수";
    }
    
    // 블록 스코프 외부에서 접근 시도 (var는 작동하지만 let/const는 안 됨)
    console.log(localVar); // var는 작동
    
    // 하지만 함수 스코프에서는 다름
    function test() {
        var functionVar = "함수 내부";
    }
    // console.log(functionVar); // ReferenceError
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

/**
 * 재귀 호출로 인한 스택 오버플로우
 */
function testStackOverflow() {
    console.log("[테스트] 스택 오버플로우 발생 시도...");
    console.warn("이 테스트는 브라우저가 멈출 수 있습니다!");
    
    function recursive() {
        recursive();
    }
    
    // 주의: 실제로 실행하면 브라우저가 멈출 수 있음
    // recursive();
}

// ============================================================
// 4. 실전 시나리오 기반 테스트
// ============================================================

/**
 * API 응답 처리 에러
 */
function testAPIResponseError() {
    console.log("[테스트] API 응답 처리 에러 시뮬레이션...");
    
    // API 응답 시뮬레이션
    var apiResponse = {
        data: null,
        items: undefined
    };
    
    // 실제 코드에서 흔히 하는 실수
    var items = apiResponse.data.items; // TypeError
    var count = items.length; // 추가 에러
}

/**
 * 폼 유효성 검사 에러
 */
function testFormValidationError() {
    console.log("[테스트] 폼 유효성 검사 에러 시뮬레이션...");
    
    var formData = {
        name: "",
        email: null,
        age: "twenty"
    };
    
    // 유효성 검사 중 에러 발생
    if (formData.name.length > 0) { // 빈 문자열은 OK
        // 하지만 다른 필드에서 문제 발생 가능
    }
    
    var age = parseInt(formData.age);
    if (age < 18) { // NaN < 18은 항상 false
        // 논리적 오류 가능
    }
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
    
    // 클릭하면 에러 발생
    console.log("화면을 클릭하면 에러가 발생합니다.");
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
// 6. 특수 케이스 테스트
// ============================================================

/**
 * 타임아웃 에러
 */
function testTimeoutError() {
    console.log("[테스트] 타임아웃 에러 시뮬레이션...");
    
    setTimeout(function() {
        throw new Error("작업 타임아웃: 5초 이내에 완료되지 않음");
    }, 100);
}

/**
 * 무한 루프 (주의: 브라우저가 멈출 수 있음)
 */
function testInfiniteLoop() {
    console.log("[테스트] 무한 루프 시뮬레이션...");
    console.warn("⚠️ 주의: 실제로 실행하지 마세요!");
    
    // 주석 처리됨 - 실행하지 말 것
    /*
    while (true) {
        // 무한 루프
    }
    */
}

/**
 * 메모리 부족 에러 (주의: 브라우저가 멈출 수 있음)
 */
function testMemoryError() {
    console.log("[테스트] 메모리 부족 에러 시뮬레이션...");
    console.warn("⚠️ 주의: 실제로 실행하지 마세요!");
    
    // 주석 처리됨 - 실행하지 말 것
    /*
    var hugeArray = [];
    while (true) {
        hugeArray.push(new Array(1000000));
    }
    */
}

/**
 * CORS 에러 시뮬레이션
 */
function testCORSError() {
    console.log("[테스트] CORS 에러 시뮬레이션...");
    
    // 다른 도메인으로 요청 (CORS 에러 발생)
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
// 7. 실제 개발 시나리오 테스트
// ============================================================

/**
 * 비즈니스 로직 에러
 */
function testBusinessLogicError() {
    console.log("[테스트] 비즈니스 로직 에러 시뮬레이션...");
    
    function calculateDiscount(price, discountRate) {
        // discountRate가 undefined일 수 있음
        return price * (1 - discountRate);
    }
    
    var finalPrice = calculateDiscount(10000); // discountRate가 undefined
    console.log("최종 가격:", finalPrice); // NaN
}

/**
 * 데이터 변환 에러
 */
function testDataConversionError() {
    console.log("[테스트] 데이터 변환 에러 시뮬레이션...");
    
    var userInput = "abc123";
    var number = parseInt(userInput); // NaN
    
    if (number > 100) { // NaN > 100은 항상 false
        // 이 블록은 절대 실행되지 않음
    }
    
    // NaN을 사용하면 예상치 못한 결과
    var result = number + 10; // NaN
}

/**
 * 비동기 콜백 체인 에러
 */
function testAsyncChainError() {
    console.log("[테스트] 비동기 콜백 체인 에러 시뮬레이션...");
    
    setTimeout(function() {
        var data = { users: null };
        
        setTimeout(function() {
            var firstUser = data.users[0]; // TypeError
            
            setTimeout(function() {
                console.log(firstUser.name); // 추가 에러
            }, 100);
        }, 100);
    }, 100);
}

// ============================================================
// 8. 테스트 헬퍼 함수
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
// 9. 글로벌 객체로 노출
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
    window.manualAnalyzeError = manualAnalyzeError;
    window.manualAnalyzeCustomError = manualAnalyzeCustomError;
    window.manualAnalyzeString = manualAnalyzeString;
    window.runAllBasicTests = runAllBasicTests;
    window.runAllScenarioTests = runAllScenarioTests;
    
    console.log("%c[테스트 파일 로드 완료]", "color:#4CAF50; font-weight:bold");
    console.log("콘솔에서 다음 함수들을 사용할 수 있습니다:");
    console.log("- testReferenceError()");
    console.log("- testTypeError()");
    console.log("- testNullPointer()");
    console.log("- runAllBasicTests()");
    console.log("- runAllScenarioTests()");
    console.log("등등...");
}

