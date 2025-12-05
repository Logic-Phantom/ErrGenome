/**
 * AI Error Assistant - 기술 지원용 에러 분석 라이브러리 (수정 버전)
 * 
 * 주요 수정 사항:
 * 1. 한국어 프롬프트 개선 (시스템 프롬프트 추가)
 * 2. 에러 정보 포맷 개선
 * 3. 중복 에러 분석 방지
 * 4. 분석 결과 캐싱
 */

(function (global) {
  "use strict";

  // ============================================================
  // WebLLM Loader
  // ============================================================
  var WebLLM_URL = "../ui/web-llm/web-llm.min.js";

  function loadESModule(url, callback) {
    try {
      var importCode = 'import("' + url.replace(/"/g, '\\"') + '")';
      var importPromise = eval(importCode);
      
      if (importPromise && typeof importPromise.then === 'function') {
        importPromise.then(function(module) {
          callback(null, module);
        }).catch(function(err) {
          console.error("[AI Error Assistant] ES Module 로드 실패:", url, err);
          callback(err, null);
        });
      } else {
        var error = new Error("동적 import를 지원하지 않는 브라우저입니다.");
        callback(error, null);
      }
    } catch (err) {
      console.error("[AI Error Assistant] 동적 import 실행 실패:", err);
      callback(err, null);
    }
  }

  // ============================================================
  // AI Engine Wrapper
  // ============================================================
  var AISupport = {
    engine: null,
    ready: false,
    initialized: false,
    errorQueue: [],
    analyzedErrors: {}, // 중복 에러 방지용 캐시
    analyzing: false, // 분석 중 플래그

    /**
     * 에러 해시 생성 (중복 체크용)
     */
    getErrorHash: function(errObj) {
      return (errObj.name || '') + ':' + (errObj.message || '').substring(0, 100);
    },

    /**
     * WebLLM 엔진 초기화
     */
    init: function () {
      if (this.initialized) {
        console.warn("[AI Error Assistant] 이미 초기화되었습니다.");
        return;
      }
      this.initialized = true;

      console.log("[AI Error Assistant] WebLLM 로드 시작...");

      if (window.webllm && window.webllm.CreateMLCEngine) {
        console.log("[AI Error Assistant] WebLLM이 이미 로드되어 있습니다.");
        this.initializeEngine(window.webllm.CreateMLCEngine);
        return;
      }

      loadESModule(WebLLM_URL, function (err, webllmModule) {
        if (err || !webllmModule) {
          console.error("[AI Error Assistant] WebLLM 모듈 로드 실패:", err);
          return;
        }

        var CreateMLCEngine = webllmModule.CreateMLCEngine || 
                             (webllmModule.default && webllmModule.default.CreateMLCEngine);
        
        if (!CreateMLCEngine) {
          console.error("[AI Error Assistant] CreateMLCEngine을 찾을 수 없습니다.");
          return;
        }

        window.webllm = webllmModule;
        AISupport.initializeEngine(CreateMLCEngine);
      });
    },

    /**
     * WebLLM 엔진 초기화 (내부 함수)
     */
    initializeEngine: function(CreateMLCEngine) {
      var modelName = "Qwen2.5-0.5B-Instruct-q4f32_1-MLC";
      
      console.log("[AI Error Assistant] 모델 로드 시작: " + modelName);
      console.log("[AI Error Assistant] 첫 로드 시 다운로드가 필요할 수 있습니다");
      
      CreateMLCEngine(modelName, {
        initProgressCallback: function(progress) {
          if (progress.progress !== undefined && progress.progress > 0) {
            var percent = Math.round(progress.progress * 100);
            if (percent % 10 === 0) { // 10%마다만 로그
              console.log("[AI Error Assistant] 모델 로딩: " + percent + "%");
            }
          }
        }
      }).then(function (eng) {
        AISupport.engine = eng;
        AISupport.ready = true;
        console.log("[AI Error Assistant] ✓ WebLLM 엔진 로드 완료");
        
        // 큐에 쌓인 에러 처리
        if (AISupport.errorQueue.length > 0) {
          console.log("[AI Error Assistant] 큐에 쌓인 에러 " + AISupport.errorQueue.length + "개 분석 시작");
          for (var i = 0; i < AISupport.errorQueue.length; i++) {
            AISupport.handleError(AISupport.errorQueue[i]);
          }
          AISupport.errorQueue = [];
        }
      }).catch(function (err) {
        console.error("[AI Error Assistant] 엔진 로드 오류:", err);
        console.log("[AI Error Assistant] 기본 에러 분석 모드로 전환되었습니다.");
      });
    },

    /**
     * 에러 분석 처리 (개선된 버전)
     */
    handleError: function (errObj) {
      // 중복 에러 체크
      var errorHash = this.getErrorHash(errObj);
      var now = Date.now();
      
      if (this.analyzedErrors[errorHash] && (now - this.analyzedErrors[errorHash]) < 5000) {
        console.log("[AI Error Assistant] 중복 에러 감지 - 분석 생략");
        return;
      }
      this.analyzedErrors[errorHash] = now;

      // 기본 에러 정보 출력
      console.log("%c" + "=".repeat(70), "color:#ff6600; font-weight:bold");
      console.log("%c⚠️ JavaScript 에러 발생", "color:#ffffff; background:#ff6600; font-weight:bold; font-size:14px; padding:5px");
      console.log("%c" + "=".repeat(70), "color:#ff6600; font-weight:bold");
      console.log("타입:", errObj.name || "Unknown");
      console.log("메시지:", errObj.message || "N/A");
      
      if (errObj.source && errObj.lineno) {
        console.log("위치:", errObj.source + ":" + errObj.lineno);
      }
      
      // 스택 트레이스에서 실제 에러 위치 추출
      if (errObj.stack) {
        var stackLines = errObj.stack.split('\n');
        var relevantLine = null;
        for (var i = 0; i < stackLines.length; i++) {
          if (stackLines[i].indexOf('test.clx.js') !== -1 || 
              stackLines[i].indexOf('.clx.js') !== -1) {
            relevantLine = stackLines[i].trim();
            break;
          }
        }
        if (relevantLine) {
          console.log("실제 에러 위치:", relevantLine);
        }
      }
      console.log("%c" + "=".repeat(70), "color:#ff6600; font-weight:bold");

      // 엔진이 준비되지 않았으면 큐에 추가
      if (!this.ready || !this.engine) {
        console.log("[AI Error Assistant] 엔진 준비 중. 에러를 큐에 추가합니다.");
        if (this.errorQueue.length < 10) {
          this.errorQueue.push(errObj);
        }
        return;
      }

      // 이미 분석 중이면 대기
      if (this.analyzing) {
        console.log("[AI Error Assistant] 이미 분석 중입니다. 완료 후 다시 시도하세요.");
        return;
      }

      // AI 분석 시작
      this.analyzing = true;
      console.log("%c[AI Error Assistant] 🔍 AI 에러 분석 시작...", "color:#2196F3; font-weight:bold");
      
      // 개선된 프롬프트 - 실제 코드 컨텍스트 포함
      var errorInfo = "에러 타입: " + (errObj.name || "Unknown") + "\n" +
                     "에러 메시지: " + (errObj.message || "N/A") + "\n";
      
      if (errObj.source && errObj.lineno) {
        errorInfo += "발생 위치: " + errObj.source + " (줄: " + errObj.lineno + ")\n";
      }
      
      // 스택에서 실제 에러 위치 강조
      if (errObj.stack) {
        var stackLines = errObj.stack.split('\n');
        var actualErrorLine = null;
        
        for (var i = 0; i < stackLines.length; i++) {
          if (stackLines[i].indexOf('.clx.js') !== -1 || 
              stackLines[i].indexOf('test.') !== -1) {
            actualErrorLine = stackLines[i].trim();
            break;
          }
        }
        
        if (actualErrorLine) {
          errorInfo += "\n실제 에러 발생 코드:\n" + actualErrorLine + "\n";
        }
        
        errorInfo += "\n전체 스택:\n" + stackLines.slice(0, 3).join('\n') + "\n";
      }

      // 에러 타입별 힌트 추가 (eXBuilder6 포함)
      var errorHint = "";
      var isExBuilder = errObj.framework === "eXBuilder6" || 
                        (errObj.message && errObj.message.indexOf('controltype') !== -1);
      
      if (isExBuilder) {
        errorHint = "\n[프레임워크] eXBuilder6 UI 프레임워크 에러입니다.\n";
        
        if (errObj.exbuilder) {
          errorHint += "[컨트롤 정보]\n";
          if (errObj.exbuilder.controltype) {
            errorHint += "- 타입: " + errObj.exbuilder.controltype + "\n";
          }
          if (errObj.exbuilder.id) {
            errorHint += "- ID: " + errObj.exbuilder.id + "\n";
          }
          if (errObj.exbuilder.value) {
            errorHint += "- 값: " + errObj.exbuilder.value + "\n";
          }
        }
        
        // eXBuilder6 에러 패턴별 힌트
        if (errObj.message.indexOf('duplicated') !== -1) {
          errorHint += "\n[eXBuilder6 힌트] 중복된 값(duplicated)은 주로:\n" +
                      "- ComboBox에 같은 value를 가진 item을 여러 번 추가\n" +
                      "- ListBox나 Grid에 동일한 key 값 중복\n" +
                      "- Dataset에 중복된 컬럼명\n";
        }
      } else if (errObj.message) {
        var msg = errObj.message.toLowerCase();
        if (msg.indexOf('rangeerror') !== -1 || msg.indexOf('invalid array length') !== -1) {
          errorHint = "\n[힌트] RangeError는 주로 다음 경우에 발생합니다:\n" +
                     "- new Array(음수) 또는 너무 큰 수\n" +
                     "- Array.from()에 잘못된 길이\n" +
                     "- 재귀 호출 깊이 초과\n";
        } else if (msg.indexOf('typeerror') !== -1) {
          errorHint = "\n[힌트] TypeError는 타입이 예상과 다를 때 발생합니다.\n";
        } else if (msg.indexOf('referenceerror') !== -1) {
          errorHint = "\n[힌트] ReferenceError는 변수를 찾을 수 없을 때 발생합니다.\n";
        }
      }

      var prompt = "당신은 JavaScript와 eXBuilder6 UI 프레임워크 전문가입니다. 아래 에러를 분석하고 한국어로 명확하게 설명해주세요.\n\n" +
                   "=== 에러 정보 ===\n" +
                   errorInfo + 
                   errorHint + "\n" +
                   "=== 분석 요청 ===\n" +
                   "다음 형식으로 한국어로 답변해주세요:\n\n" +
                   "1. 에러 원인:\n" +
                   "   이 에러가 무엇인지 간단명료하게 설명" +
                   (isExBuilder ? " (eXBuilder6 관점에서)" : "") + "\n\n" +
                   "2. 왜 발생했나:\n" +
                   "   코드에서 어떤 상황일 때 이런 에러가 나는지 구체적으로 설명\n\n" +
                   "3. 해결 방법:\n" +
                   "   실제로 고칠 수 있는 방법을 코드 예시와 함께 제시\n" +
                   "   ```javascript\n" +
                   "   // 잘못된 예\n" +
                   "   // 올바른 예\n" +
                   "   ```\n\n" +
                   "4. 개발자 조치:\n" +
                   "   개발자가 즉시 확인해야 할 사항\n\n" +
                   "주의: 반드시 JavaScript" + (isExBuilder ? "/eXBuilder6" : "") + " 관점에서 분석하고, 파이썬이나 다른 언어를 언급하지 마세요.";

      var self = this;
      this.engine.chat.completions
        .create({
          messages: [
            { 
              role: "system", 
              content: "당신은 10년 경력의 JavaScript 전문 개발자입니다. 에러를 분석하고 실용적인 해결책을 제시합니다. 항상 한국어로만 답변하며, 파이썬이나 다른 언어는 절대 언급하지 않습니다. 간결하고 명확하게 답변합니다." 
            },
            { 
              role: "user", 
              content: prompt 
            }
          ],
          temperature: 0.3,
          max_tokens: 600,
          top_p: 0.9
        })
        .then(function (res) {
          self.analyzing = false;
          var content = res.choices[0].message.content;
          
          console.log("%c" + "=".repeat(70), "color:#4CAF50; font-weight:bold");
          console.log("%c🤖 AI 에러 분석 결과", "color:#ffffff; background:#4CAF50; font-weight:bold; font-size:14px; padding:5px");
          console.log("%c" + "=".repeat(70), "color:#4CAF50; font-weight:bold");
          console.log("");
          console.log(content);
          console.log("");
          console.log("%c" + "=".repeat(70), "color:#4CAF50; font-weight:bold");
          console.log("%c💡 개발자 도구(F12) Console에서 확인하세요", "color:#666; font-style:italic");
          console.log("%c" + "=".repeat(70), "color:#4CAF50; font-weight:bold");
        })
        .catch(function (err) {
          self.analyzing = false;
          console.error("[AI Error Assistant] AI 분석 오류:", err);
        });
    },

    /**
     * 수동 에러 분석
     */
    analyze: function (error) {
      var errObj;
      
      if (error instanceof Error) {
        errObj = {
          name: error.name,
          message: error.message,
          stack: error.stack
        };
      } else if (typeof error === "string") {
        errObj = {
          message: error
        };
      } else if (typeof error === "object") {
        errObj = error;
      } else {
        console.error("[AI Error Assistant] 잘못된 에러 형식입니다.");
        return;
      }

      this.handleError(errObj);
    }
  };

  window.AISupport = AISupport;

  // ============================================================
  // 글로벌 에러 후킹
  // ============================================================
  
  var originalOnError = window.onerror;
  var originalConsoleError = console.error;
  var aiErrorHandler;

  /**
   * AI Error Handler
   */
  aiErrorHandler = function(msg, src, line, col, error) {
    // 기존 핸들러 실행
    if (originalOnError && typeof originalOnError === 'function' && originalOnError !== aiErrorHandler) {
      try {
        originalOnError.call(this, msg, src, line, col, error);
      } catch (e) {
        // 무시
      }
    }

    // 에러 객체 생성
    var errObj = {
      name: error && error.name ? error.name : "Error",
      message: msg || (error && error.message ? error.message : "Unknown error"),
      source: src || "",
      lineno: line || 0,
      colno: col || 0,
      stack: error && error.stack ? error.stack : undefined,
      timestamp: new Date().toISOString()
    };
    
    if (window.AISupport) {
      AISupport.handleError(errObj);
    }
    
    return false;
  };

  /**
   * 에러 핸들러 설치
   */
  function installErrorHandler() {
    if (window.onerror === aiErrorHandler) {
      return;
    }
    
    if (window.onerror && window.onerror !== aiErrorHandler) {
      originalOnError = window.onerror;
    }
    
    try {
      window.onerror = aiErrorHandler;
      console.log("[AI Error Assistant] ✓ window.onerror 설치 완료");
    } catch (e) {
      console.error("[AI Error Assistant] window.onerror 설치 실패:", e);
    }
  }

  installErrorHandler();

  // ============================================================
  // console.error/warn/log 후킹 (모든 에러 캡처)
  // ============================================================
  var originalConsoleWarn = console.warn;
  var originalConsoleLog = console.log;
  
  /**
   * 에러 메시지 감지 함수 (개선됨)
   */
  function isErrorMessage(message) {
    if (!message) return false;
    var msg = String(message).toLowerCase();
    
    // JavaScript 기본 에러
    if (msg.indexOf('error') !== -1 ||
        msg.indexOf('exception') !== -1 ||
        msg.indexOf('uncaught') !== -1 ||
        msg.indexOf('failed') !== -1) {
      return true;
    }
    
    // eXBuilder6 특화 에러 패턴
    if (msg.indexOf('duplicated') !== -1 ||
        msg.indexOf('invalid') !== -1 ||
        msg.indexOf('cannot') !== -1 ||
        msg.indexOf('undefined') !== -1 ||
        msg.indexOf('null') !== -1) {
      return true;
    }
    
    return false;
  }
  
  console.error = function() {
    var args = Array.prototype.slice.call(arguments);
    originalConsoleError.apply(console, args);
    
    var errorMessage = '';
    var errorObj = null;
    var fullMessage = '';
    
    // 모든 인자를 문자열로 합침
    for (var i = 0; i < args.length; i++) {
      if (args[i] instanceof Error) {
        errorObj = args[i];
        errorMessage = args[i].message || String(args[i]);
        fullMessage += errorMessage + '\n';
      } else {
        var argStr = String(args[i]);
        fullMessage += argStr + '\n';
        if (!errorMessage && argStr.length > 0) {
          errorMessage = argStr;
        }
      }
    }
    
    // 모든 에러 메시지 캡처 (조건 완화)
    if (isErrorMessage(fullMessage) || errorObj !== null) {
      var errObj = {
        name: errorObj ? errorObj.name : "Error",
        message: fullMessage.trim() || "Unknown error",
        stack: errorObj ? errorObj.stack : (new Error().stack),
        source: "console.error",
        type: "console_error",
        timestamp: new Date().toISOString(),
        fullArgs: args
      };
      
      // 스택에서 실제 소스 추출 (eXBuilder6 패턴 포함)
      if (errObj.stack) {
        var stackLines = errObj.stack.split('\n');
        for (var j = 0; j < stackLines.length; j++) {
          var line = stackLines[j];
          // .clx.js 또는 eXBuilder 관련 파일 찾기
          if (line.indexOf('.clx.js') !== -1 || 
              line.indexOf('test.') !== -1 ||
              line.indexOf('cleopatra.js') !== -1) {
            errObj.source = line.trim();
            
            // 줄 번호 추출
            var lineMatch = line.match(/:(\d+):(\d+)/);
            if (lineMatch) {
              errObj.lineno = parseInt(lineMatch[1]);
              errObj.colno = parseInt(lineMatch[2]);
            }
            break;
          }
        }
      }
      
      // eXBuilder6 특화 정보 추출
      if (fullMessage.indexOf('controltype') !== -1) {
        errObj.framework = "eXBuilder6";
        
        // controltype, id, value 추출
        var controltypeMatch = fullMessage.match(/controltype:\s*(\w+)/);
        var idMatch = fullMessage.match(/id:\s*(\w+)/);
        var valueMatch = fullMessage.match(/value:\s*([^\]]+)/);
        
        if (controltypeMatch || idMatch) {
          errObj.exbuilder = {
            controltype: controltypeMatch ? controltypeMatch[1] : null,
            id: idMatch ? idMatch[1] : null,
            value: valueMatch ? valueMatch[1] : null
          };
        }
      }
      
      if (window.AISupport) {
        setTimeout(function() {
          AISupport.handleError(errObj);
        }, 100);
      }
    }
  };
  
  // console.warn도 후킹 (eXBuilder6 경고 캡처)
  console.warn = function() {
    var args = Array.prototype.slice.call(arguments);
    originalConsoleWarn.apply(console, args);
    
    var fullMessage = '';
    for (var i = 0; i < args.length; i++) {
      fullMessage += String(args[i]) + '\n';
    }
    
    // 에러 관련 경고만 캡처
    if (isErrorMessage(fullMessage)) {
      var errObj = {
        name: "Warning",
        message: fullMessage.trim(),
        stack: new Error().stack,
        source: "console.warn",
        type: "console_warn",
        timestamp: new Date().toISOString()
      };
      
      // eXBuilder6 정보 추출
      if (fullMessage.indexOf('controltype') !== -1) {
        errObj.framework = "eXBuilder6";
        var controltypeMatch = fullMessage.match(/controltype:\s*(\w+)/);
        var idMatch = fullMessage.match(/id:\s*(\w+)/);
        if (controltypeMatch || idMatch) {
          errObj.exbuilder = {
            controltype: controltypeMatch ? controltypeMatch[1] : null,
            id: idMatch ? idMatch[1] : null
          };
        }
      }
      
      if (window.AISupport) {
        setTimeout(function() {
          if (!AISupport.ready) {
            AISupport.errorQueue.push(errObj);
          } else {
            AISupport.handleError(errObj);
          }
        }, 100);
      }
    }
  };
  
  console.log("[AI Error Assistant] ✓ console.error/warn 후킹 완료");

  // defineProperty로 보호
  try {
    Object.defineProperty(window, 'onerror', {
      get: function() {
        return aiErrorHandler;
      },
      set: function(value) {
        if (value !== aiErrorHandler && typeof value === 'function') {
          originalOnError = value;
        }
      },
      configurable: true
    });
    console.log("[AI Error Assistant] ✓ window.onerror 보호 활성화");
  } catch (e) {
    // 무시
  }

  // 주기적 체크
  var checkInterval = setInterval(function() {
    if (window.onerror !== aiErrorHandler) {
      installErrorHandler();
    }
  }, 1000);

  window.addEventListener('beforeunload', function() {
    if (checkInterval) {
      clearInterval(checkInterval);
    }
  });

  /**
   * Promise rejection 후킹
   */
  window.addEventListener("unhandledrejection", function (event) {
    var error = event.reason;
    var errObj;

    if (error instanceof Error) {
      errObj = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        type: "unhandledrejection",
        timestamp: new Date().toISOString()
      };
    } else {
      errObj = {
        message: String(error),
        type: "unhandledrejection",
        timestamp: new Date().toISOString()
      };
    }

    if (window.AISupport) {
      AISupport.handleError(errObj);
    }
  });

  // ============================================================
  // 자동 초기화
  // ============================================================
  
  console.log("[AI Error Assistant] 스크립트 로드 완료");
  
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      installErrorHandler();
      AISupport.init();
    });
  } else {
    installErrorHandler();
    AISupport.init();
  }
  
  setTimeout(function() {
    installErrorHandler();
    if (!AISupport.initialized) {
      AISupport.init();
    }
  }, 1000);

})(window);