/**
 * WebLLM 사용 불가 시 대체 에러 분석 시스템
 * 
 * WebLLM이 로드되지 않거나 캐시 오류가 발생할 때
 * 기본적인 규칙 기반 에러 분석을 제공합니다.
 */

(function (global) {
  "use strict";

  var SimpleErrorAnalyzer = {
    ready: true, // 항상 준비됨

    /**
     * 간단한 에러 분석
     */
    analyze: function (errObj) {
      var errorMsg = errObj.message || String(errObj);
      var errorName = errObj.name || "";
      var stack = errObj.stack || "";
      var source = errObj.source || "";
      
      console.log("%c" + "=".repeat(60), "color:#ff6600; font-weight:bold");
      console.log("%c[에러 분석] (기본 모드)", "color:#ff6600; font-weight:bold; font-size:14px");
      console.log("%c" + "=".repeat(60), "color:#ff6600; font-weight:bold");
      
      var analysis = this.getBasicAnalysis(errorMsg, errorName, stack, source);
      
      console.log("%c1) 에러 원인", "font-weight:bold");
      console.log(analysis.cause);
      console.log("");
      
      console.log("%c2) 왜 발생했는가", "font-weight:bold");
      console.log(analysis.reason);
      console.log("");
      
      console.log("%c3) 해결방법", "font-weight:bold");
      console.log(analysis.solution);
      console.log("");
      
      if (analysis.example) {
        console.log("%c코드 예시:", "font-weight:bold");
        console.log(analysis.example);
        console.log("");
      }
      
      console.log("%c4) 고객 안내", "font-weight:bold");
      console.log("이 오류는 개발 과정에서 발생한 것으로, 곧 수정될 예정입니다.");
      console.log("%c" + "=".repeat(60), "color:#ff6600; font-weight:bold");
    },

    /**
     * 기본 에러 분석 로직
     */
    getBasicAnalysis: function (message, name, stack, source) {
      var analysis = {
        cause: "",
        reason: "",
        solution: "",
        example: ""
      };

      // ReferenceError 분석
      if (name === "ReferenceError" || message.indexOf("is not defined") > -1) {
        analysis.cause = "정의되지 않은 변수나 함수를 사용하려고 했습니다.";
        analysis.reason = "변수나 함수가 선언되지 않았거나, 스코프 밖에서 접근하려고 했습니다.";
        analysis.solution = "변수나 함수를 먼저 선언하거나, 올바른 스코프에서 접근하세요.";
        analysis.example = "// 잘못된 예:\nvar result = undefinedVar;\n\n// 올바른 예:\nvar undefinedVar = 'value';\nvar result = undefinedVar;";
      }
      // TypeError 분석
      else if (name === "TypeError" || message.indexOf("Cannot read") > -1 || message.indexOf("is not a function") > -1) {
        analysis.cause = "타입 오류가 발생했습니다.";
        analysis.reason = "null이나 undefined 값에 접근하거나, 함수가 아닌 값에 함수 호출을 시도했습니다.";
        analysis.solution = "값이 null이나 undefined인지 확인하고, 올바른 타입인지 검증하세요.";
        analysis.example = "// 잘못된 예:\nvar obj = null;\nobj.method();\n\n// 올바른 예:\nvar obj = null;\nif (obj && obj.method) {\n  obj.method();\n}";
      }
      // SyntaxError 분석
      else if (name === "SyntaxError") {
        analysis.cause = "문법 오류가 발생했습니다.";
        analysis.reason = "JavaScript 문법 규칙을 위반했습니다.";
        analysis.solution = "코드 문법을 확인하고 수정하세요. 특히 괄호, 중괄호, 세미콜론을 확인하세요.";
        analysis.example = "// 문법 오류 확인:\n- 괄호가 맞는지\n- 중괄호가 맞는지\n- 따옴표가 닫혔는지";
      }
      // 일반적인 네트워크 오류
      else if (message.indexOf("network") > -1 || message.indexOf("Network") > -1 || message.indexOf("fetch") > -1) {
        analysis.cause = "네트워크 요청 오류가 발생했습니다.";
        analysis.reason = "서버에 연결할 수 없거나 요청이 실패했습니다.";
        analysis.solution = "인터넷 연결을 확인하고, 서버가 정상 작동하는지 확인하세요.";
      }
      // 일반 오류
      else {
        analysis.cause = "알 수 없는 오류가 발생했습니다.";
        analysis.reason = "오류의 정확한 원인을 파악하기 위해 상세 로그가 필요합니다.";
        analysis.solution = "에러 메시지와 스택 트레이스를 확인하여 원인을 파악하세요.";
      }

      // 스택 트레이스에서 추가 정보 추출
      if (stack) {
        var stackLines = stack.split("\n");
        if (stackLines.length > 1) {
          analysis.solution += "\n\n스택 트레이스를 확인하여 오류 발생 위치를 파악하세요:";
          for (var i = 0; i < Math.min(3, stackLines.length); i++) {
            analysis.solution += "\n" + stackLines[i].trim();
          }
        }
      }

      return analysis;
    }
  };

  // 글로벌 객체에 노출
  global.SimpleErrorAnalyzer = SimpleErrorAnalyzer;

})(window);

