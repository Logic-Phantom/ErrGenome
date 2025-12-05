/**
 * AI Error Assistant - 기술 지원용 에러 분석 라이브러리
 * 
 * 사용법:
 * <script src="/clx-src/tsSupportAI.js"></script>
 * 
 * 브라우저에서 발생한 JavaScript 에러를 자동으로 캡처하여
 * WebLLM을 통해 분석하고 콘솔에 원인과 해결방법을 출력합니다.
 * 
 * 요구사항:
 * - WebLLM 엔진 파일이 /web-llm/ 경로에 있어야 함
 * - ES5 호환 환경
 */

(function (global) {
  "use strict";

  // ============================================================
  // 1. WebLLM Loader (ES Module 방식)
  // ============================================================
  // 절대 경로 또는 상대 경로 설정 (프로젝트 구조에 맞게 수정)
  var WebLLM_URL = "../ui/web-llm/web-llm.min.js";  // 또는 "../web-llm/web-llm.min.js"
  var WebLLM_WORKER_URL = "../ui/web-llm/worker.js";  // 또는 "../web-llm/worker.js"

  /**
   * ES Module 동적 로드 함수
   * @param {string} url - 로드할 모듈 URL
   * @param {Function} callback - 로드 완료 콜백 (에러, 모듈 객체)
   */
  function loadESModule(url, callback) {
    // 동적 import()는 최신 브라우저에서만 지원
    // eval을 사용하여 동적 import 실행 (ES5 환경에서 동적 import 사용)
    try {
      // 문자열로 import()를 구성하고 eval로 실행
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
        var error = new Error("동적 import를 지원하지 않는 브라우저입니다. 최신 Chrome, Firefox, Safari, Edge를 사용해주세요.");
        console.error("[AI Error Assistant]", error.message);
        callback(error, null);
      }
    } catch (err) {
      console.error("[AI Error Assistant] 동적 import 실행 실패:", err);
      console.error("[AI Error Assistant] 참고: 최신 브라우저가 필요합니다 (Chrome 63+, Firefox 67+, Safari 11.1+, Edge 79+)");
      callback(err, null);
    }
  }

  // ============================================================
  // 2. AI Engine Wrapper (ES5 호환)
  // ============================================================
  var AISupport = {
    engine: null,
    ready: false,
    initialized: false,
    errorQueue: [], // 엔진 준비 전 에러 큐

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

      // WebLLM이 이미 전역으로 로드되어 있는지 확인
      if (window.webllm && window.webllm.CreateMLCEngine) {
        console.log("[AI Error Assistant] WebLLM이 이미 로드되어 있습니다.");
        this.initializeEngine(window.webllm.CreateMLCEngine);
        return;
      }

      // WebLLM ES Module 로드
      loadESModule(WebLLM_URL, function (err, webllmModule) {
        if (err || !webllmModule) {
          console.error("[AI Error Assistant] WebLLM 모듈 로드 실패:", err);
          console.error("[AI Error Assistant] 경로를 확인해주세요: " + WebLLM_URL);
          console.error("[AI Error Assistant] 참고: ES Module을 지원하는 브라우저가 필요합니다.");
          return;
        }

        // WebLLM 모듈에서 필요한 함수 추출
        // WebLLM은 여러 함수를 export하므로 모두 확인
        var CreateMLCEngine = webllmModule.CreateMLCEngine || 
                             (webllmModule.default && webllmModule.default.CreateMLCEngine) ||
                             null;
        
        // 모듈 구조 디버깅
        if (!CreateMLCEngine) {
          console.warn("[AI Error Assistant] CreateMLCEngine을 찾을 수 없습니다. 모듈 구조 확인 중...");
          console.log("[AI Error Assistant] WebLLM 모듈 키:", Object.keys(webllmModule));
          console.log("[AI Error Assistant] default 키:", webllmModule.default ? Object.keys(webllmModule.default) : "없음");
          
          // 다른 가능한 경로 시도
          if (webllmModule.default) {
            CreateMLCEngine = webllmModule.default.CreateMLCEngine;
          }
          
          if (!CreateMLCEngine) {
            console.error("[AI Error Assistant] CreateMLCEngine을 찾을 수 없습니다.");
            return;
          }
        }
        
        console.log("[AI Error Assistant] CreateMLCEngine 함수 찾음:", typeof CreateMLCEngine);

        // 전역 객체로도 저장 (다른 스크립트에서 사용 가능)
        window.webllm = webllmModule;
        
        // 엔진 초기화
        AISupport.initializeEngine(CreateMLCEngine);
      });
    },

    /**
     * WebLLM 엔진 초기화 (내부 함수)
     * @param {Function} CreateMLCEngine - CreateMLCEngine 함수
     */
    initializeEngine: function(CreateMLCEngine) {
      // 더 작은 모델 사용 (빠른 로딩과 낮은 리소스 사용)
      // 지원 모델 목록: https://mlc.ai/models
      var modelName = "Qwen2.5-0.5B-Instruct-q4f32_1-MLC";  // 매우 작은 모델 (약 0.5B 파라미터)
      // 대안: "Phi-3-mini-4k-instruct-q4f32_1-MLC", "TinyLlama-1.1B-Chat-v1.0-q4f32_1-MLC" ,"Qwen2.5-0.5B-Instruct-q4f32_1-MLC";  // 매우 작은 모델 (약 0.5B 파라미터)
      
      console.log("[AI Error Assistant] 모델 로드 시작: " + modelName);
      console.log("[AI Error Assistant] 첫 로드 시 다운로드가 필요할 수 있습니다 (시간이 걸릴 수 있음)");
      
      // WebLLM 엔진 생성 (Web Worker 없이 직접 생성)
      // 주의: Web Worker를 사용하려면 별도의 worker 파일이 ES Module 형식이어야 함
      CreateMLCEngine(modelName, {
        initProgressCallback: function(progress) {
          if (progress.progress !== undefined && progress.progress > 0) {
            var percent = Math.round(progress.progress * 100);
            console.log("[AI Error Assistant] 모델 로딩 중: " + percent + "%");
            
            if (progress.text) {
              console.log("[AI Error Assistant] " + progress.text);
            }
          }
        }
      }).then(function (eng) {
        AISupport.engine = eng;
        AISupport.ready = true;
        console.log("[AI Error Assistant] ✓ WebLLM 엔진 로드 완료");
        console.log("[AI Error Assistant] 이제 에러 분석이 가능합니다.");
        
        // 큐에 쌓인 에러 처리
        if (AISupport.errorQueue.length > 0) {
          console.log("[AI Error Assistant] 큐에 쌓인 에러 " + AISupport.errorQueue.length + "개 분석 시작...");
          for (var i = 0; i < AISupport.errorQueue.length; i++) {
            AISupport.handleError(AISupport.errorQueue[i]);
          }
          AISupport.errorQueue = [];
        }
      }).catch(function (err) {
        console.error("[AI Error Assistant] 엔진 로드 오류:", err);
        console.error("[AI Error Assistant] 오류 타입:", err.name || "Unknown");
        console.error("[AI Error Assistant] 오류 메시지:", err.message || String(err));
        
        // 구체적인 오류 메시지 제공
        if (err.message && err.message.includes("Cache")) {
          console.warn("%c[AI Error Assistant] 캐시 오류 발생!", "color:#ff6600; font-weight:bold");
          console.warn("해결 방법:");
          console.warn("1. F12 → Application 탭 → Cache Storage");
          console.warn("2. 'mlc-ai', 'webllm', 'model' 관련 항목 모두 삭제");
          console.warn("3. 또는 'Clear site data' 버튼으로 전체 삭제");
          console.warn("4. IndexedDB에서도 WebLLM 관련 항목 삭제");
          console.warn("5. 페이지 완전 새로고침 (Ctrl+F5)");
          console.warn("");
          console.warn("💡 팁: 시크릿 모드(Ctrl+Shift+N)에서 테스트하면 캐시 없이 실행됩니다");
          console.warn("상세 가이드: CACHE-CLEANUP-GUIDE.md 파일 참고");
        } else if (err.message && (err.message.includes("network") || err.message.includes("Network"))) {
          console.warn("[AI Error Assistant] 네트워크 오류 발생. 다음을 확인하세요:");
          console.warn("1. 인터넷 연결 상태");
          console.warn("2. 방화벽 또는 보안 소프트웨어 설정");
          console.warn("3. HuggingFace 접근 가능 여부 (https://mlc.ai/models)");
        } else {
          console.warn("[AI Error Assistant] 다른 원인으로 인한 오류입니다.");
          console.warn("[AI Error Assistant] 모델 이름: " + modelName);
          console.warn("[AI Error Assistant] 지원 모델 목록: https://mlc.ai/models");
        }
        
        // 사용자에게 친절한 메시지
        console.log("%c" + "=".repeat(60), "color:#ff6600; font-weight:bold");
        console.log("%c[AI Error Assistant] 모델 로드 실패", "color:#ff6600; font-weight:bold; font-size:14px");
        console.log("%c" + "=".repeat(60), "color:#ff6600; font-weight:bold");
        console.log("WebLLM 모델 로드에 실패했습니다.");
        console.log("");
        console.log("다음 단계를 시도해보세요:");
        console.log("1. F12 → Application → Service Workers → Unregister");
        console.log("2. 다른 브라우저에서 테스트 (Firefox, Edge 등)");
        console.log("3. 시크릿 모드(Ctrl+Shift+N)에서 테스트");
        console.log("4. 브라우저 확장 프로그램 비활성화");
        console.log("");
        console.log("💡 참고: 기본 에러 분석 기능은 계속 작동합니다 (규칙 기반)");
        console.log("상세 해결 방법: DEEP-CACHE-ISSUE-FIX.md 참고");
        console.log("%c" + "=".repeat(60), "color:#ff6600; font-weight:bold");
        
        // WebLLM 실패 시에도 기본 에러 분석은 계속 작동하도록
        // (이미 handleError 함수가 있으므로 기본 분석은 가능)
        console.log("[AI Error Assistant] 기본 에러 분석 모드로 전환되었습니다.");
      });
    },

    /**
     * 에러 분석 처리
     * @param {Object} errObj - 에러 객체
     */
    handleError: function (errObj) {
      // 먼저 기본 에러 정보는 항상 출력
      console.log("%c" + "=".repeat(70), "color:#ff6600; font-weight:bold; font-size:14px");
      console.log("%c" + " ".repeat(25) + "⚠️ 에러 발생" + " ".repeat(25), "color:#ffffff; background:#ff6600; font-weight:bold; font-size:16px; padding:10px");
      console.log("%c" + "=".repeat(70), "color:#ff6600; font-weight:bold; font-size:14px");
      console.log("[AI Error Assistant] 에러 타입:", errObj.name || "Unknown");
      console.log("[AI Error Assistant] 에러 메시지:", errObj.message || "N/A");
      
      if (errObj.source) {
        console.log("[AI Error Assistant] 파일:", errObj.source);
      }
      if (errObj.lineno) {
        console.log("[AI Error Assistant] 줄 번호:", errObj.lineno);
      }
      if (errObj.stack) {
        console.log("[AI Error Assistant] 스택 트레이스:", errObj.stack);
      }
      console.log("%c" + "=".repeat(70), "color:#ff6600; font-weight:bold; font-size:14px");
      
      // 엔진이 준비되지 않았으면 큐에 추가하고 기본 정보만 출력
      if (!this.ready || !this.engine) {
        console.log("[AI Error Assistant] 엔진 준비 중. 에러를 큐에 추가합니다.");
        this.errorQueue.push(errObj);
        
        // 큐가 너무 많이 쌓이면 경고
        if (this.errorQueue.length > 10) {
          console.warn("[AI Error Assistant] 에러 큐가 10개를 초과했습니다. 일부 에러가 누락될 수 있습니다.");
        }
        console.log("[AI Error Assistant] 엔진 로드 완료 후 자동으로 분석됩니다.");
        return;
      }

      // AI 분석 시작
      console.log("%c[AI Error Assistant] 🔍 AI 에러 분석 시작...", "color:#2196F3; font-weight:bold");
      console.log("[AI Error Assistant] AI가 분석 중입니다. (몇 초 소요될 수 있음)");
      
      var prompt =
        "브라우저에서 발생한 자바스크립트 에러 로그입니다.\n" +
        "기술지원 엔지니어 관점에서 원인과 해결방법을 명확하고 간결하게 설명해주세요.\n\n" +
        "에러 로그:\n" +
        JSON.stringify(errObj, null, 2) +
        "\n\n" +
        "출력 형식:\n" +
        "1) 에러 원인\n" +
        "2) 왜 발생했는가\n" +
        "3) 해결방법 (코드 예시 포함)\n" +
        "4) 고객 안내 멘트\n" +
        "\n한국어로 답변해주세요.";

      var self = this;
      this.engine.chat.completions
        .create({
          messages: [{ role: "user", content: prompt }]
        })
        .then(function (res) {
          var content = res.choices[0].message.content;
          
          // 콘솔에 포맷팅된 출력 (더 눈에 띄게)
          console.log("%c" + "=".repeat(70), "color:#4CAF50; font-weight:bold; font-size:14px");
          console.log("%c" + " ".repeat(20) + "🤖 AI 에러 분석 결과" + " ".repeat(20), "color:#ffffff; background:#4CAF50; font-weight:bold; font-size:16px; padding:10px");
          console.log("%c" + "=".repeat(70), "color:#4CAF50; font-weight:bold; font-size:14px");
          console.log("");
          console.log(content);
          console.log("");
          console.log("%c" + "=".repeat(70), "color:#4CAF50; font-weight:bold; font-size:14px");
          console.log("%c💡 팁: 브라우저 개발자 도구(F12) → Console 탭에서 이 메시지를 확인할 수 있습니다.", "color:#666; font-style:italic");
          console.log("%c" + "=".repeat(70), "color:#4CAF50; font-weight:bold; font-size:14px");
        })
        .catch(function (err) {
          console.error("[AI Error Assistant] LLM 분석 오류:", err);
          console.log("[AI Error Assistant] 기본 에러 정보는 위에 표시되었습니다.");
        });
    },

    /**
     * 수동으로 에러 분석 요청
     * @param {Error|Object|string} error - 분석할 에러
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

  // 글로벌 객체에 노출
  window.AISupport = AISupport;

  // ============================================================
  // 3. 글로벌 에러 후킹 (내부 엔진이 덮어쓰는 것을 방지)
  // ============================================================
  
  // 기존 에러 핸들러 저장
  var originalOnError = window.onerror;
  var originalOnUnhandledRejection = window.onunhandledrejection;
  var aiErrorHandlerInstalled = false;
  var aiErrorHandlerId = 'AISupport_ErrorHandler_' + Date.now();
  
  // console.error 후킹 (cleopatra 내부 에러 캡처용)
  var originalConsoleError = console.error;
  var originalConsoleWarn = console.warn;

  /**
   * AI Error Handler 함수
   */
  function aiErrorHandler(msg, src, line, col, error) {
    console.log("%c[AI Error Assistant] window.onerror 호출됨!", "color:#ff0000; font-weight:bold");
    console.log("[AI Error Assistant] 메시지:", msg);
    console.log("[AI Error Assistant] 소스:", src);
    console.log("[AI Error Assistant] 줄:", line, "컬럼:", col);
    console.log("[AI Error Assistant] 에러 객체:", error);
    
    // 기존 핸들러가 있으면 먼저 실행 (단, 우리 자신이 아닌 경우만)
    if (originalOnError && typeof originalOnError === 'function' && originalOnError !== aiErrorHandler) {
      try {
        originalOnError.call(this, msg, src, line, col, error);
      } catch (e) {
        console.error("[AI Error Assistant] 기존 에러 핸들러 실행 중 오류:", e);
      }
    }

    // AI 분석 요청
    var errObj = {
      name: error && error.name ? error.name : "Error",
      message: msg || (error && error.message ? error.message : "Unknown error"),
      source: src || "",
      lineno: line || 0,
      colno: col || 0,
      stack: error && error.stack ? error.stack : undefined,
      timestamp: new Date().toISOString()
    };
    
    console.log("[AI Error Assistant] 에러 객체 생성 완료:", errObj);
    
    // AISupport가 초기화되었는지 확인
    if (window.AISupport) {
      AISupport.handleError(errObj);
    } else {
      console.error("[AI Error Assistant] AISupport가 아직 초기화되지 않았습니다!");
      console.log("[AI Error Assistant] 기본 에러 정보:", errObj);
    }
    
    // false를 반환하면 기본 에러 핸들링도 계속됨
    return false;
  }

  /**
   * window.onerror 강제 재등록 (내부 엔진이 덮어쓴 경우 대비)
   */
  function installErrorHandler() {
    // 현재 window.onerror가 우리 핸들러인지 확인
    if (window.onerror === aiErrorHandler) {
      return; // 이미 설치됨
    }
    
    // 기존 핸들러를 저장 (우리 핸들러가 아닌 경우만)
    if (window.onerror && window.onerror !== aiErrorHandler) {
      originalOnError = window.onerror;
      console.log("[AI Error Assistant] 기존 에러 핸들러 저장:", typeof originalOnError);
    }
    
    // 우리 핸들러로 교체
    try {
      window.onerror = aiErrorHandler;
      aiErrorHandlerInstalled = true;
      console.log("%c[AI Error Assistant] ✓ window.onerror 핸들러 설치 완료", "color:#4CAF50; font-weight:bold");
    } catch (e) {
      console.error("[AI Error Assistant] window.onerror 설치 실패:", e);
    }
  }

  // 즉시 설치
  installErrorHandler();
  
  // ============================================================
  // 3-1. console.error/warn 후킹 (cleopatra 내부 에러 캡처)
  // ============================================================
  // cleopatra가 try-catch로 에러를 잡아서 console.error로 출력하는 경우를 캡처
  
  console.error = function() {
    var args = Array.prototype.slice.call(arguments);
    
    // 원래 console.error 실행
    originalConsoleError.apply(console, args);
    
    // 에러 메시지 추출
    var errorMessage = '';
    var errorObj = null;
    
    for (var i = 0; i < args.length; i++) {
      if (args[i] instanceof Error) {
        errorObj = args[i];
        errorMessage = args[i].message || String(args[i]);
        break;
      } else if (typeof args[i] === 'string' && args[i].length > 0) {
        errorMessage = args[i];
      }
    }
    
    // 에러 패턴 감지 (cleopatra 에러인지 확인)
    if (errorMessage && (
        errorMessage.indexOf('Error') !== -1 ||
        errorMessage.indexOf('TypeError') !== -1 ||
        errorMessage.indexOf('ReferenceError') !== -1 ||
        errorMessage.indexOf('RangeError') !== -1 ||
        errorMessage.indexOf('SyntaxError') !== -1 ||
        errorObj !== null
    )) {
      console.log("%c[AI Error Assistant] console.error에서 에러 감지!", "color:#ff6600; font-weight:bold");
      
      var errObj = {
        name: errorObj ? errorObj.name : "Error",
        message: errorMessage || "Unknown error",
        stack: errorObj ? errorObj.stack : (new Error().stack),
        source: "console.error",
        type: "console_error",
        timestamp: new Date().toISOString(),
        originalArgs: args
      };
      
      // 스택에서 cleopatra 관련 정보 추출
      if (errObj.stack) {
        var stackLines = errObj.stack.split('\n');
        for (var j = 0; j < stackLines.length; j++) {
          if (stackLines[j].indexOf('cleopatra') !== -1 || 
              stackLines[j].indexOf('.clx.js') !== -1 ||
              stackLines[j].indexOf('test.clx') !== -1) {
            errObj.source = stackLines[j].trim();
            break;
          }
        }
      }
      
      // AI 분석 요청
      if (window.AISupport) {
        setTimeout(function() {
          AISupport.handleError(errObj);
        }, 100); // 약간의 지연으로 원래 에러 출력 후 분석
      }
    }
  };
  
  console.warn = function() {
    var args = Array.prototype.slice.call(arguments);
    
    // 원래 console.warn 실행
    originalConsoleWarn.apply(console, args);
    
    // 경고 메시지도 에러로 간주할 수 있는 경우 캡처
    var message = '';
    for (var i = 0; i < args.length; i++) {
      if (typeof args[i] === 'string' && args[i].length > 0) {
        message = args[i];
        break;
      }
    }
    
    // 에러 관련 경고인지 확인
    if (message && (
        message.indexOf('Error') !== -1 ||
        message.indexOf('Exception') !== -1 ||
        message.indexOf('Failed') !== -1
    )) {
      console.log("%c[AI Error Assistant] console.warn에서 에러 관련 경고 감지!", "color:#ffaa00; font-weight:bold");
      
      var errObj = {
        name: "Warning",
        message: message,
        stack: new Error().stack,
        source: "console.warn",
        type: "console_warn",
        timestamp: new Date().toISOString()
      };
      
      // AI 분석 요청 (경고는 선택적으로)
      if (window.AISupport) {
        setTimeout(function() {
          // 경고는 큐에만 추가 (엔진 준비되면 분석)
          if (!AISupport.ready) {
            AISupport.errorQueue.push(errObj);
          } else {
            AISupport.handleError(errObj);
          }
        }, 100);
      }
    }
  };
  
  console.log("%c[AI Error Assistant] ✓ console.error/warn 후킹 완료", "color:#4CAF50; font-weight:bold");

  // Object.defineProperty로 덮어쓰기 방지 시도
  try {
    var currentOnError = window.onerror;
    Object.defineProperty(window, 'onerror', {
      get: function() {
        return aiErrorHandler;
      },
      set: function(value) {
        // 다른 핸들러가 설정하려고 하면 우리 핸들러를 유지하고 기존 핸들러로 저장
        if (value !== aiErrorHandler && typeof value === 'function') {
          originalOnError = value;
          console.log("[AI Error Assistant] 다른 에러 핸들러가 설정되었지만, 우리 핸들러를 유지합니다.");
        }
        // 실제로는 설정하지 않고 우리 핸들러를 유지
      },
      configurable: true
    });
    console.log("[AI Error Assistant] ✓ window.onerror 보호 활성화 (defineProperty)");
  } catch (e) {
    console.warn("[AI Error Assistant] window.onerror 보호 실패 (defineProperty 사용 불가):", e);
    // defineProperty가 실패하면 주기적으로 체크하는 방식 사용
  }

  // 주기적으로 window.onerror가 우리 핸들러인지 확인하고 재설치
  var checkInterval = setInterval(function() {
    if (window.onerror !== aiErrorHandler) {
      console.warn("[AI Error Assistant] ⚠️ window.onerror가 덮어써졌습니다! 재설치 중...");
      installErrorHandler();
    }
    
    // cleopatra 객체가 로드되었는지 확인하고 에러 핸들러 후킹 시도
    if (window.cpr && window.cpr.core && !window._aiCleopatraHooked) {
      try {
        hookCleopatraErrorHandlers();
        window._aiCleopatraHooked = true;
      } catch (e) {
        // 무시
      }
    }
  }, 500); // 0.5초마다 체크

  // 페이지 언로드 시 인터벌 정리
  window.addEventListener('beforeunload', function() {
    if (checkInterval) {
      clearInterval(checkInterval);
    }
  });
  
  /**
   * Cleopatra 에러 핸들러 후킹
   */
  function hookCleopatraErrorHandlers() {
    if (!window.cpr || !window.cpr.core) {
      return;
    }
    
    console.log("[AI Error Assistant] Cleopatra 객체 감지. 에러 핸들러 후킹 시도...");
    
    // cleopatra의 이벤트 시스템 후킹 시도
    try {
      // cpr.events.EventBus 후킹
      if (window.cpr && window.cpr.events && window.cpr.events.EventBus) {
        var originalDispatch = window.cpr.events.EventBus.prototype.dispatchEvent;
        if (originalDispatch && typeof originalDispatch === 'function') {
          window.cpr.events.EventBus.prototype.dispatchEvent = function(event) {
            try {
              return originalDispatch.call(this, event);
            } catch (err) {
              console.log("%c[AI Error Assistant] Cleopatra 이벤트 디스패치 중 에러!", "color:#ff0000; font-weight:bold");
              if (window.AISupport) {
                AISupport.handleError({
                  name: err.name || "Error",
                  message: err.message || String(err),
                  stack: err.stack,
                  source: "cleopatra.EventBus.dispatchEvent",
                  type: "cleopatra_internal",
                  timestamp: new Date().toISOString()
                });
              }
              throw err; // 원래 에러 다시 던지기
            }
          };
          console.log("[AI Error Assistant] ✓ Cleopatra EventBus 후킹 완료");
        }
      }
    } catch (e) {
      console.warn("[AI Error Assistant] Cleopatra 후킹 실패:", e);
    }
    
    // cleopatra의 tryCatch 함수 후킹 시도
    try {
      if (window.cpr && window.cpr.utils) {
        var originalTryCatch = window.cpr.utils.tryCatch;
        if (originalTryCatch && typeof originalTryCatch === 'function') {
          window.cpr.utils.tryCatch = function(fn, context) {
            try {
              return originalTryCatch.call(this, fn, context);
            } catch (err) {
              console.log("%c[AI Error Assistant] Cleopatra tryCatch에서 에러!", "color:#ff0000; font-weight:bold");
              if (window.AISupport) {
                AISupport.handleError({
                  name: err.name || "Error",
                  message: err.message || String(err),
                  stack: err.stack,
                  source: "cleopatra.utils.tryCatch",
                  type: "cleopatra_internal",
                  timestamp: new Date().toISOString()
                });
              }
              throw err;
            }
          };
          console.log("[AI Error Assistant] ✓ Cleopatra tryCatch 후킹 완료");
        }
      }
    } catch (e) {
      console.warn("[AI Error Assistant] Cleopatra tryCatch 후킹 실패:", e);
    }
  }

  /**
   * Promise rejection 후킹
   */
  if (window.addEventListener) {
    window.addEventListener("unhandledrejection", function (event) {
      console.log("%c[AI Error Assistant] Promise rejection 캡처됨!", "color:#ff0000; font-weight:bold");
      
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

      console.log("[AI Error Assistant] Promise rejection 에러 객체:", errObj);
      
      // AISupport가 초기화되었는지 확인
      if (window.AISupport) {
        AISupport.handleError(errObj);
      } else {
        console.error("[AI Error Assistant] AISupport가 아직 초기화되지 않았습니다!");
        console.log("[AI Error Assistant] 기본 에러 정보:", errObj);
      }
    });
  }

  // ============================================================
  // 4. 자동 초기화
  // ============================================================
  
  console.log("[AI Error Assistant] 스크립트 로드 완료");
  console.log("[AI Error Assistant] AISupport 객체 생성됨:", typeof AISupport);
  console.log("[AI Error Assistant] 에러 핸들러 설치 상태:", aiErrorHandlerInstalled);
  
  // DOM 로드 완료 후 초기화
  if (document.readyState === "loading") {
    console.log("[AI Error Assistant] DOM 로딩 중. DOMContentLoaded 이벤트 대기...");
    document.addEventListener("DOMContentLoaded", function () {
      console.log("[AI Error Assistant] DOMContentLoaded 이벤트 발생. 초기화 시작...");
      // 에러 핸들러 재확인
      installErrorHandler();
      AISupport.init();
    });
  } else {
    // 이미 로드되어 있으면 즉시 초기화
    console.log("[AI Error Assistant] DOM 이미 로드됨. 즉시 초기화 시작...");
    installErrorHandler();
    AISupport.init();
  }
  
  // 스크립트 로드 후 에러 핸들러 재확인 (내부 엔진이 로드된 후)
  setTimeout(function() {
    console.log("[AI Error Assistant] 스크립트 로드 후 에러 핸들러 재확인...");
    installErrorHandler();
    if (!AISupport.initialized) {
      console.log("[AI Error Assistant] 타임아웃 후 초기화 재시도...");
      AISupport.init();
    }
  }, 1000); // 1초 후 재확인 (내부 엔진 로드 대기)
  
  // 추가 재확인 (더 늦게 로드되는 경우 대비)
  setTimeout(function() {
    console.log("[AI Error Assistant] 추가 에러 핸들러 재확인...");
    installErrorHandler();
  }, 3000); // 3초 후 재확인

})(window);

