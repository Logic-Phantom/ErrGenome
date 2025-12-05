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
      if (global.webllm && global.webllm.CreateMLCEngine) {
        console.log("[AI Error Assistant] WebLLM이 이미 로드되어 있습니다.");
        this.initializeEngine(global.webllm.CreateMLCEngine);
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
        global.webllm = webllmModule;
        
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
      // 대안: "Phi-3-mini-4k-instruct-q4f32_1-MLC", "TinyLlama-1.1B-Chat-v1.0-q4f32_1-MLC"
      
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
      if (!this.ready) {
        console.warn("[AI Error Assistant] 엔진 준비 중. 에러를 큐에 추가합니다.");
        this.errorQueue.push(errObj);
        
        // 큐가 너무 많이 쌓이면 경고
        if (this.errorQueue.length > 10) {
          console.warn("[AI Error Assistant] 에러 큐가 10개를 초과했습니다. 일부 에러가 누락될 수 있습니다.");
        }
        return;
      }

      console.log("%c[AI Error Assistant] 🔍 에러 분석 시작...", "color:#2196F3; font-weight:bold");
      console.log("[AI Error Assistant] 에러 타입:", errObj.name || "Unknown");
      console.log("[AI Error Assistant] 에러 메시지:", errObj.message || "N/A");
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
  global.AISupport = AISupport;

  // ============================================================
  // 3. 글로벌 에러 후킹
  // ============================================================
  
  // 기존 에러 핸들러 저장
  var originalOnError = window.onerror;
  var originalOnUnhandledRejection = window.onunhandledrejection;

  /**
   * window.onerror 후킹
   */
  window.onerror = function (msg, src, line, col, error) {
    console.log("[AI Error Assistant] window.onerror 호출됨:", msg, src, line, col);
    
    // 기존 핸들러가 있으면 먼저 실행
    if (originalOnError) {
      originalOnError.call(this, msg, src, line, col, error);
    }

    // AI 분석 요청
    var errObj = {
      name: error && error.name ? error.name : "Error",
      message: msg || (error && error.message ? error.message : "Unknown error"),
      source: src,
      lineno: line,
      colno: col,
      stack: error && error.stack ? error.stack : undefined,
      timestamp: new Date().toISOString()
    };
    
    console.log("[AI Error Assistant] 에러 객체 생성:", errObj);
    AISupport.handleError(errObj);
    
    // false를 반환하면 기본 에러 핸들링도 계속됨
    return false;
  };

  /**
   * Promise rejection 후킹
   */
  if (window.addEventListener) {
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

      AISupport.handleError(errObj);
    });
  }

  // ============================================================
  // 4. 자동 초기화
  // ============================================================
  
  // DOM 로드 완료 후 초기화
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      AISupport.init();
    });
  } else {
    // 이미 로드되어 있으면 즉시 초기화
    AISupport.init();
  }

})(window);

