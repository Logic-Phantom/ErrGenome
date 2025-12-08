/**
 * 실시간 코드 실행기 - REPL 모드
 * 
 * 주요 기능:
 * 1. JSMode("on") - 콘솔을 JavaScript 실행 모드로 전환
 * 2. 직접 코드 입력 시 자동 실행
 * 3. JSMode("off") - 일반 모드로 복귀
 * 4. 실행 히스토리 관리
 */

(function (global) {
  "use strict";

  // ============================================================
  // 설정
  // ============================================================
  var CONFIG = {
    // eXBuilder6 앱 경로 설정 (필요시 수정)
    appPath: "AI/test",  // ⭐ 여기를 수정하세요!
    
    // 자동 실행 코드 템플릿
    getInitCode: function() {
      return 'var app = cpr.core.Platform.INSTANCE.lookup("' + this.appPath + '").getInstances()[0];';
    }
  };

  // ============================================================
  // 코드 실행 엔진
  // ============================================================
  var CodeExecutor = {
    history: [],
    maxHistory: 50,
    
    // 안전한 코드 실행
    execute: function(code, context) {
      context = context || {};
      
      try {
        var startTime = Date.now();
        
        // 전역 스코프에서 직접 실행 (eXBuilder6 객체 접근을 위해)
        // eval을 사용하되, 간접 호출로 전역 스코프에서 실행
        var result = (0, eval)(code);
        
        var elapsedTime = Date.now() - startTime;
        
        // 히스토리에 저장
        this.addToHistory({
          code: code,
          result: result,
          success: true,
          timestamp: new Date().toISOString(),
          elapsed: elapsedTime
        });
        
        return {
          success: true,
          result: result,
          elapsed: elapsedTime
        };
        
      } catch (error) {
        this.addToHistory({
          code: code,
          error: error.message,
          success: false,
          timestamp: new Date().toISOString()
        });
        
        return {
          success: false,
          error: error.message,
          stack: error.stack
        };
      }
    },
    
    // 히스토리 관리
    addToHistory: function(entry) {
      this.history.push(entry);
      if (this.history.length > this.maxHistory) {
        this.history.shift();
      }
    },
    
    // 히스토리 조회
    getHistory: function(count) {
      count = count || 10;
      return this.history.slice(-count);
    },
    
    // 히스토리 초기화
    clearHistory: function() {
      this.history = [];
      console.log("[JS Mode] 히스토리가 초기화되었습니다.");
    }
  };

  // ============================================================
  // REPL 모드 관리자
  // ============================================================
  var REPLMode = {
    enabled: false,
    originalConsoleLog: null,
    buffer: "",
    multilineMode: false,
    
    // REPL 모드 활성화
    enable: function() {
      if (this.enabled) {
        console.warn("[JS Mode] 이미 활성화되어 있습니다.");
        return;
      }
      
      this.enabled = true;
      
      var self = this;
      this.installInterceptor();
      
      // 인터셉터 설치 전에 안내 메시지 출력
      if (REPLMode.originalConsoleLog) {
        REPLMode.originalConsoleLog.call(console, "%c" + "=".repeat(70), "color: #4CAF50; font-weight: bold");
        REPLMode.originalConsoleLog.call(console, "%c🚀 JavaScript 모드를 시작하겠습니다", "color: #ffffff; background: #4CAF50; font-weight: bold; font-size: 14px; padding: 5px");
        REPLMode.originalConsoleLog.call(console, "%c" + "=".repeat(70), "color: #4CAF50; font-weight: bold");
        REPLMode.originalConsoleLog.call(console, "");
        
        // 자동 초기화 코드 실행
        var initCode = CONFIG.getInitCode();
        REPLMode.originalConsoleLog.call(console, "%c▶ 자동 초기화:", "color: #9C27B0; font-weight: bold");
        REPLMode.originalConsoleLog.call(console, "%c  " + initCode, "color: #9E9E9E");
        
        try {
          (0, eval)(initCode);
          REPLMode.originalConsoleLog.call(console, "%c✓ 초기화 완료", "color: #4CAF50");
        } catch (error) {
          REPLMode.originalConsoleLog.call(console, "%c✗ 초기화 실패: " + error.message, "color: #F44336");
          REPLMode.originalConsoleLog.call(console, "%c💡 앱 경로 확인: CONFIG.appPath = '" + CONFIG.appPath + "'", "color: #FF9800");
        }
        
        REPLMode.originalConsoleLog.call(console, "");
        REPLMode.originalConsoleLog.call(console, "%c💡 사용법:", "color: #2196F3; font-weight: bold");
        REPLMode.originalConsoleLog.call(console, "  • 콘솔에 JavaScript 코드를 입력하면 자동으로 실행됩니다");
        REPLMode.originalConsoleLog.call(console, "  • 여러 줄 입력: 끝에 \\\\ 를 추가하세요");
        REPLMode.originalConsoleLog.call(console, "  • 모드 종료: JSMode('off')");
        REPLMode.originalConsoleLog.call(console, "");
        REPLMode.originalConsoleLog.call(console, "%c예시:", "color: #9E9E9E");
        REPLMode.originalConsoleLog.call(console, "  var combo = app.lookup('cmb1');");
        REPLMode.originalConsoleLog.call(console, "  combo.addItem(new cpr.controls.Item('테스트', '1'));");
        REPLMode.originalConsoleLog.call(console, "");
        REPLMode.originalConsoleLog.call(console, "%c⚡ JavaScript 코드를 입력하세요:", "color: #FF9800; font-weight: bold");
        REPLMode.originalConsoleLog.call(console, "");
      }
      
      //this.installInterceptor();
    },
    
    // REPL 모드 비활성화
    disable: function() {
      if (!this.enabled) {
        console.warn("[JS Mode] 이미 비활성화되어 있습니다.");
        return;
      }
      
      this.enabled = false;
      this.buffer = "";
      this.multilineMode = false;
      
      console.log("");
      console.log("%c" + "=".repeat(70), "color: #FF9800; font-weight: bold");
      console.log("%c🛑 JavaScript 실행 모드 비활성화", "color: #ffffff; background: #FF9800; font-weight: bold; font-size: 14px; padding: 5px");
      console.log("%c" + "=".repeat(70), "color: #FF9800; font-weight: bold");
      console.log("");
    },
    
    // 콘솔 인터셉터 설치
    installInterceptor: function() {
      var self = this;
      
      // console.log 가로채기 (처음 한 번만)
      if (!this.originalConsoleLog) {
        this.originalConsoleLog = console.log;
        
        console.log = function() {
          // REPL 모드가 아니면 원본 실행
          if (!self.enabled) {
            return self.originalConsoleLog.apply(console, arguments);
          }
          
          // 인자가 없으면 무시
          if (arguments.length === 0) {
            return;
          }
          
          var input = String(arguments[0]);
          
          // 시스템 메시지는 그대로 출력
          if (input.indexOf('[') === 0 || input.indexOf('%c') === 0) {
            return self.originalConsoleLog.apply(console, arguments);
          }
          
          // 빈 줄은 무시
          if (input.trim() === '') {
            return;
          }
          
          // JSMode 명령어 체크
          if (input.indexOf('JSMode') !== -1) {
            return self.originalConsoleLog.apply(console, arguments);
          }
          
          // 여러 줄 모드 처리
          if (input.endsWith('\\')) {
            self.buffer += input.slice(0, -1) + '\n';
            self.multilineMode = true;
            self.originalConsoleLog.call(console, "%c... (계속 입력)", "color: #9E9E9E; font-style: italic");
            return;
          }
          
          // 버퍼에 코드가 있으면 합치기
          if (self.multilineMode) {
            input = self.buffer + input;
            self.buffer = "";
            self.multilineMode = false;
          }
          
          // JavaScript 코드로 인식되면 실행
          if (self.isJavaScriptCode(input)) {
            self.executeCode(input);
          } else {
            // 일반 로그는 그대로 출력
            self.originalConsoleLog.apply(console, arguments);
          }
        };
      }
    },
    
    // JavaScript 코드인지 판별
    isJavaScriptCode: function(input) {
      // 명백한 JavaScript 패턴
      var jsPatterns = [
        /^(var|let|const)\s+\w+/,           // 변수 선언
        /^function\s+\w+/,                   // 함수 선언
        /^\w+\s*=\s*.+/,                     // 할당
        /^(if|for|while|switch|return)\s*\(/, // 제어문
        /^\w+\([^\)]*\)/,                    // 함수 호출
        /^app\.lookup/,                      // eXBuilder6
        /^cpr\./,                            // eXBuilder6
        /^\{.*\}$/,                          // 객체 리터럴
        /^\[.*\]$/,                          // 배열 리터럴
        /^\/\//,                             // 주석
        /^\/\*/,                             // 블록 주석
        /\=\>/,                              // 화살표 함수
        /^console\./,                        // console 메서드
        /^document\./,                       // DOM 접근
        /^window\./                          // window 접근
      ];
      
      for (var i = 0; i < jsPatterns.length; i++) {
        if (jsPatterns[i].test(input.trim())) {
          return true;
        }
      }
      
      // 세미콜론으로 끝나는 경우
      if (input.trim().endsWith(';')) {
        return true;
      }
      
      // 점(.) 표기법 (메서드 체이닝)
      if (input.indexOf('.') !== -1 && (input.indexOf('(') !== -1 || input.indexOf('=') !== -1)) {
        return true;
      }
      
      return false;
    },
    
    // 코드 실행
    executeCode: function(code) {
      var self = this;
      
      self.originalConsoleLog.call(console, "%c▶ " + code, "color: #2196F3; font-weight: bold");
      
      var result = CodeExecutor.execute(code);
      
      if (result.success) {
        if (result.result !== undefined) {
          self.originalConsoleLog.call(console, "%c◀ ", "color: #4CAF50; font-weight: bold", result.result);
        } else {
          self.originalConsoleLog.call(console, "%c✓ 실행 완료 (" + result.elapsed + "ms)", "color: #4CAF50");
        }
      } else {
        self.originalConsoleLog.call(console, "%c✗ 에러: " + result.error, "color: #F44336; font-weight: bold");
        if (result.stack) {
          self.originalConsoleLog.call(console, "%c" + result.stack, "color: #F44336; font-size: 11px");
        }
      }
      
      self.originalConsoleLog.call(console, "");
    }
  };

  // ============================================================
  // AI 코드 추출기
  // ============================================================
  var CodeExtractor = {
    // 응답에서 JavaScript 코드 추출
    extractCode: function(text) {
      var codes = [];
      
      // ```javascript ... ``` 형식
      var jsBlockRegex = /```(?:javascript|js)\s*\n([\s\S]*?)\n```/gi;
      var match;
      
      while ((match = jsBlockRegex.exec(text)) !== null) {
        codes.push({
          type: 'javascript',
          code: match[1].trim(),
          raw: match[0]
        });
      }
      
      // 일반 ``` ... ``` 형식도 확인
      if (codes.length === 0) {
        var genericBlockRegex = /```\s*\n([\s\S]*?)\n```/g;
        while ((match = genericBlockRegex.exec(text)) !== null) {
          var code = match[1].trim();
          // JavaScript로 보이는지 확인
          if (this.looksLikeJavaScript(code)) {
            codes.push({
              type: 'unknown',
              code: code,
              raw: match[0]
            });
          }
        }
      }
      
      return codes;
    },
    
    // JavaScript 코드인지 판별
    looksLikeJavaScript: function(code) {
      var jsKeywords = [
        'var ', 'let ', 'const ', 'function', 'return',
        'app.lookup', 'cpr.controls', '=>', 'console.',
        'if ', 'for ', 'while ', 'switch'
      ];
      
      for (var i = 0; i < jsKeywords.length; i++) {
        if (code.indexOf(jsKeywords[i]) !== -1) {
          return true;
        }
      }
      
      return false;
    }
  };

  // ============================================================
  // AI 통합 실행기
  // ============================================================
  var AICodeRunner = {
    // AI 응답에서 코드 추출 및 실행
    processAIResponse: function(response) {
      var codes = CodeExtractor.extractCode(response);
      
      if (codes.length === 0) {
        console.log("%c[AI Runner] 실행 가능한 코드가 없습니다.", "color: #FF9800");
        return [];
      }
      
      console.log("%c[AI Runner] " + codes.length + "개의 코드 블록 발견", "color: #2196F3; font-weight: bold");
      console.log("");
      
      for (var i = 0; i < codes.length; i++) {
        var codeBlock = codes[i];
        console.log("%c" + "─".repeat(70), "color: #E0E0E0");
        console.log("%c코드 블록 #" + (i + 1), "color: #9C27B0; font-weight: bold");
        console.log("%c" + "─".repeat(70), "color: #E0E0E0");
        console.log(codeBlock.code);
        console.log("");
      }
      
      console.log("%c💡 실행하려면:", "color: #FF9800; font-weight: bold");
      console.log("  1. JSMode('on') - JavaScript 모드 활성화");
      console.log("  2. 위 코드를 복사해서 콘솔에 입력");
      console.log("  3. JSMode('off') - 모드 종료");
      console.log("");
      
      // 마지막 코드 블록들을 전역 변수에 저장
      global._lastAICodes = codes;
      
      return codes;
    }
  };

  // ============================================================
  // 글로벌 함수 노출
  // ============================================================
  
  /**
   * JavaScript 실행 모드 토글
   * @param {string} mode - "on" 또는 "off"
   * @example JSMode("on")
   * @example JSMode("off")
   */
  global.JSMode = function(mode) {
    if (!mode) {
      console.error("[JS Mode] 사용법: JSMode('on') 또는 JSMode('off')");
      return;
    }
    
    mode = String(mode).toLowerCase();
    
    if (mode === "on" || mode === "1" || mode === "true") {
      REPLMode.enable();
    } else if (mode === "off" || mode === "0" || mode === "false") {
      REPLMode.disable();
    } else {
      console.error("[JS Mode] 잘못된 모드입니다. 'on' 또는 'off'를 입력하세요.");
    }
  };
  
  /**
   * AI 응답에서 코드 추출
   * @param {string} response - AI 응답 텍스트
   * @example aicode("AI가 생성한 코드...")
   */
  global.aicode = function(response) {
    if (typeof response !== 'string') {
      console.error("[AI Code] AI 응답 텍스트를 입력해주세요.");
      return;
    }
    
    return AICodeRunner.processAIResponse(response);
  };
  
  /**
   * 실행 히스토리 조회
   * @param {number} count - 조회할 개수 (기본: 10)
   * @example execHistory()
   */
  global.execHistory = function(count) {
    var hist = CodeExecutor.getHistory(count);
    
    console.log("%c=== 실행 히스토리 ===", "color: #2196F3; font-weight: bold");
    console.log("");
    
    for (var i = 0; i < hist.length; i++) {
      var entry = hist[i];
      var statusIcon = entry.success ? "✓" : "✗";
      var statusColor = entry.success ? "#4CAF50" : "#F44336";
      
      console.log("%c[" + (i + 1) + "] " + statusIcon, "color: " + statusColor + "; font-weight: bold");
      console.log("시간:", new Date(entry.timestamp).toLocaleTimeString());
      console.log("코드:", entry.code.substring(0, 60) + (entry.code.length > 60 ? "..." : ""));
      
      if (entry.success) {
        if (entry.result !== undefined) {
          console.log("결과:", entry.result);
        }
        console.log("소요:", entry.elapsed + "ms");
      } else {
        console.log("에러:", entry.error);
      }
      
      console.log("");
    }
    
    return hist;
  };
  
  /**
   * 히스토리 초기화
   * @example execClear()
   */
  global.execClear = function() {
    CodeExecutor.clearHistory();
  };
  
  /**
   * 도움말 출력
   */
  global.execHelp = function() {
    console.log("%c=== JavaScript 실행 모드 도움말 ===", "color: #2196F3; font-weight: bold; font-size: 16px");
    console.log("");
    console.log("%c✓ 기본 사용법", "color: #FF9800; font-weight: bold");
    console.log("  JSMode('on')           - JavaScript 모드 활성화");
    console.log("  // 코드 입력...        - 자동으로 실행됨");
    console.log("  JSMode('off')          - 모드 비활성화");
    console.log("");
    console.log("%c✓ 여러 줄 입력", "color: #FF9800; font-weight: bold");
    console.log("  줄 끝에 \\\\ 를 추가하면 다음 줄에 계속 입력할 수 있습니다.");
    console.log("");
    console.log("%c✓ AI 코드 추출", "color: #FF9800; font-weight: bold");
    console.log("  aicode('AI 응답')      - AI 응답에서 코드 추출");
    console.log("");
    console.log("%c✓ 히스토리", "color: #FF9800; font-weight: bold");
    console.log("  execHistory()          - 실행 히스토리 조회");
    console.log("  execClear()            - 히스토리 초기화");
    console.log("");
    console.log("%c✓ 사용 예시", "color: #FF9800; font-weight: bold");
    console.log("");
    console.log("%c  // 1. JavaScript 모드 활성화", "color: #9E9E9E");
    console.log("  JSMode('on')");
    console.log("");
    console.log("%c  // 2. 코드 입력 (자동 실행)", "color: #9E9E9E");
    console.log("  var combo = app.lookup('cmb1');");
    console.log("  combo.addItem(new cpr.controls.Item('테스트', '1'));");
    console.log("");
    console.log("%c  // 3. 여러 줄 입력", "color: #9E9E9E");
    console.log("  for (var i = 0; i < 5; i++) {\\");
    console.log("    console.log(i);\\");
    console.log("  }");
    console.log("");
    console.log("%c  // 4. 모드 종료", "color: #9E9E9E");
    console.log("  JSMode('off')");
    console.log("");
  };

  // ============================================================
  // search 명령어와 통합
  // ============================================================
  
  if (global.search) {
    var originalSearch = global.search;
    
    global.search = function(query) {
      originalSearch(query);
      
      console.log("");
      console.log("%c💡 AI 응답이 나온 후:", "color: #FF9800; font-weight: bold");
      console.log("   1. JSMode('on') - JavaScript 모드 활성화");
      console.log("   2. AI가 생성한 코드를 복사해서 콘솔에 입력");
      console.log("   3. 자동으로 실행됩니다!");
    };
  }

  // ============================================================
  // 초기화
  // ============================================================
  
  console.log("%c[JS Mode] 실시간 JavaScript 실행 모드 로드 완료", "color: #4CAF50; font-weight: bold");
  console.log("💡 execHelp() 명령어로 사용법을 확인하세요!");
  console.log("💡 JSMode('on') 으로 JavaScript 모드를 시작하세요!");
  
  // 전역 객체 노출
  global.CodeExecutor = CodeExecutor;
  global.CodeExtractor = CodeExtractor;
  global.AICodeRunner = AICodeRunner;
  global.REPLMode = REPLMode;

})(window);