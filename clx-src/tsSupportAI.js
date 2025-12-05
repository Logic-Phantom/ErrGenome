/**
 * AI Error Assistant - 기술 지원용 에러 분석 라이브러리
 * 
 * 사용법:
 * <script src="/clx-src/tsSupportAI.js"></script>
 * 
 * 브라우저에서 발생한 JavaScript 에러를 자동으로 캡처하여
 * WebLLM을 통해 분석하고, 원인과 해결방법을 콘솔에 출력합니다.
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
      console.error("[AI Error Assistant] ES Module 로드 중 오류:", err);
      callback(err, null);
    }
  }

  // ============================================================
  // 2. AI Error Assistant 메인 객체
  // ============================================================
  var AISupport = {
    ready: false,
    engine: null,
    errorQueue: [],
    maxQueueSize: 10,
    modelName: "Qwen2.5-0.5B-Instruct-q4f32_1-MLC",  // 작은 모델 사용 (빠른 로딩)
    
    /**
     * WebLLM 엔진 초기화
     */
    init: function() {
      var self = this;
      
      console.log("[AI Error Assistant] WebLLM 로드 시작...");
      
      // window.webllm이 이미 로드되어 있는지 확인
      if (window.webllm && window.webllm.CreateMLCEngine) {
        console.log("[AI Error Assistant] WebLLM이 이미 로드되어 있습니다.");
        this.createEngine();
        return;
      }
      
      // WebLLM을 동적으로 로드
      loadESModule(WebLLM_URL, function(err, webllmModule) {
        if (err || !webllmModule) {
          console.error("[AI Error Assistant] WebLLM 로딩 실패:", err);
          console.warn("[AI Error Assistant] 기본 에러 분석 모드로 전환합니다.");
          return;
        }
        
        // 전역 객체로 저장
        window.webllm = webllmModule;
        console.log("[AI Error Assistant] WebLLM 모듈 로드 완료");
        
        // 엔진 생성
        self.createEngine();
      });
    },
    
    /**
     * WebLLM 엔진 생성
     */
    createEngine: function() {
      var self = this;
      
      if (!window.webllm || !window.webllm.CreateMLCEngine) {
        console.error("[AI Error Assistant] CreateMLCEngine을 찾을 수 없습니다.");
        return;
      }
      
      console.log("[AI Error Assistant] 모델 로드 시작:", this.modelName);
      
      try {
        // Web Worker 생성
        var worker = new Worker(WebLLM_WORKER_URL);
        
        // 엔진 생성 옵션
        var engineConfig = {
          model: this.modelName,
          initProgressCallback: function(report) {
            if (report.progress) {
              var percent = Math.round(report.progress * 100);
              console.log("[AI Error Assistant] 모델 로딩 중: " + percent + "%");
            }
          }
        };
        
        // CreateMLCEngine 호출
        window.webllm.CreateMLCEngine(worker, engineConfig).then(function(engine) {
          self.engine = engine;
          self.ready = true;
          console.log("[AI Error Assistant] ✓ WebLLM 엔진 로드 완료");
          
          // 큐에 쌓인 에러 처리
          self.processErrorQueue();
        }).catch(function(err) {
          console.error("[AI Error Assistant] 엔진 로드 오류:", err);
        });
        
      } catch (err) {
        console.error("[AI Error Assistant] Web Worker 생성 실패:", err);
      }
    },
    
    /**
     * 에러 큐 처리
     */
    processErrorQueue: function() {
      if (this.errorQueue.length === 0) {
        return;
      }
      
      console.log("[AI Error Assistant] 큐에 쌓인 에러 " + this.errorQueue.length + "개 처리 시작");
      
      var self = this;
      var queue = this.errorQueue.slice(); // 복사
      this.errorQueue = []; // 큐 비우기
      
      // 순차적으로 처리
      queue.forEach(function(errorInfo) {
        self.analyzeError(errorInfo);
      });
    },
    
    /**
     * 에러를 큐에 추가
     */
    addToQueue: function(errorInfo) {
      if (this.errorQueue.length >= this.maxQueueSize) {
        console.warn("[AI Error Assistant] 에러 큐가 가득 찼습니다. 일부 에러가 무시될 수 있습니다.");
        return;
      }
      
      this.errorQueue.push(errorInfo);
      console.log("[AI Error Assistant] 에러를 큐에 추가했습니다. (큐 크기: " + this.errorQueue.length + ")");
    },
    
    /**
     * 에러 분석 (메인 함수)
     * @param {Error|string|Object} error - 분석할 에러
     */
    analyze: function(error) {
      var errorInfo = this.normalizeError(error);
      
      if (!errorInfo) {
        console.warn("[AI Error Assistant] 유효하지 않은 에러 정보입니다.");
        return;
      }
      
      // 엔진이 준비되지 않았으면 큐에 추가
      if (!this.ready || !this.engine) {
        console.log("[AI Error Assistant] 엔진이 아직 준비되지 않았습니다. 큐에 추가합니다.");
        this.addToQueue(errorInfo);
        return;
      }
      
      // 즉시 분석
      this.analyzeError(errorInfo);
    },
    
    /**
     * 에러 정보 정규화
     */
    normalizeError: function(error) {
      var errorInfo = {
        name: "Error",
        message: "",
        stack: "",
        source: "",
        lineno: 0,
        colno: 0,
        timestamp: new Date().toISOString()
      };
      
      if (error instanceof Error) {
        errorInfo.name = error.name || "Error";
        errorInfo.message = error.message || "";
        errorInfo.stack = error.stack || "";
      } else if (typeof error === "string") {
        errorInfo.message = error;
      } else if (typeof error === "object" && error !== null) {
        errorInfo.name = error.name || error.type || "Error";
        errorInfo.message = error.message || error.msg || "";
        errorInfo.stack = error.stack || "";
        errorInfo.source = error.source || error.filename || "";
        errorInfo.lineno = error.lineno || error.line || 0;
        errorInfo.colno = error.colno || error.column || 0;
      } else {
        return null;
      }
      
      return errorInfo;
    },
    
    /**
     * 에러 분석 실행
     */
    analyzeError: function(errorInfo) {
      var self = this;
      
      if (!this.engine) {
        console.error("[AI Error Assistant] 엔진이 초기화되지 않았습니다.");
        return;
      }
      
      console.log("[AI Error Assistant] 🔍 에러 분석 시작...");
      console.log("[AI Error Assistant] 에러 타입:", errorInfo.name);
      console.log("[AI Error Assistant] 에러 메시지:", errorInfo.message);
      
      // 프롬프트 생성
      var prompt = this.createPrompt(errorInfo);
      
      // AI 분석 요청
      this.engine.chat.completions.create({
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        top_p: 0.9
      }).then(function(response) {
        var analysis = response.choices[0].message.content;
        self.displayResult(errorInfo, analysis);
      }).catch(function(err) {
        console.error("[AI Error Assistant] 분석 중 오류:", err);
        self.displayFallbackResult(errorInfo);
      });
    },
    
    /**
     * 프롬프트 생성
     */
    createPrompt: function(errorInfo) {
      var prompt = "다음 JavaScript 에러를 분석해주세요.\n\n";
      prompt += "에러 타입: " + errorInfo.name + "\n";
      prompt += "에러 메시지: " + errorInfo.message + "\n";
      
      if (errorInfo.stack) {
        prompt += "스택 트레이스:\n" + errorInfo.stack + "\n";
      }
      
      if (errorInfo.source) {
        prompt += "파일: " + errorInfo.source;
        if (errorInfo.lineno) {
          prompt += " (줄 " + errorInfo.lineno;
          if (errorInfo.colno) {
            prompt += ", 컬럼 " + errorInfo.colno;
          }
          prompt += ")";
        }
        prompt += "\n";
      }
      
      prompt += "\n다음 형식으로 답변해주세요:\n";
      prompt += "1) 에러 원인\n";
      prompt += "2) 왜 발생했는가\n";
      prompt += "3) 해결방법 (코드 예시 포함)\n";
      prompt += "4) 고객 안내 멘트\n";
      
      return prompt;
    },
    
    /**
     * 분석 결과 출력
     */
    displayResult: function(errorInfo, analysis) {
      var separator = "======================================================================";
      
      console.log("\n" + separator);
      console.log("                    🤖 AI 에러 분석 결과                    ");
      console.log(separator);
      console.log("\n" + analysis);
      console.log("\n" + separator);
      console.log("💡 팁: 브라우저 개발자 도구(F12) → Console 탭에서 이 메시지를 확인할 수 있습니다.");
      console.log(separator + "\n");
    },
    
    /**
     * 폴백 결과 출력 (AI 분석 실패 시)
     */
    displayFallbackResult: function(errorInfo) {
      var separator = "======================================================================";
      
      console.log("\n" + separator);
      console.log("                    ⚠️ 에러 정보                    ");
      console.log(separator);
      console.log("\n에러 타입: " + errorInfo.name);
      console.log("에러 메시지: " + errorInfo.message);
      
      if (errorInfo.stack) {
        console.log("\n스택 트레이스:");
        console.log(errorInfo.stack);
      }
      
      if (errorInfo.source) {
        console.log("\n파일: " + errorInfo.source);
        if (errorInfo.lineno) {
          console.log("줄 번호: " + errorInfo.lineno);
        }
      }
      
      console.log("\n" + separator + "\n");
    }
  };

  // ============================================================
  // 3. 자동 에러 캡처 설정
  // ============================================================
  
  /**
   * window.onerror 핸들러
   */
  window.onerror = function(message, source, lineno, colno, error) {
    console.log("[AI Error Assistant] 에러 캡처됨:", message);
    
    var errorInfo = {
      name: error ? error.name : "Error",
      message: message || "",
      stack: error ? error.stack : "",
      source: source || "",
      lineno: lineno || 0,
      colno: colno || 0
    };
    
    // AI 분석 요청
    AISupport.analyze(errorInfo);
    
    // 원래 에러 핸들러도 실행 (false 반환 시 기본 동작 유지)
    return false;
  };
  
  /**
   * unhandledrejection 핸들러 (Promise rejection)
   */
  window.addEventListener('unhandledrejection', function(event) {
    console.log("[AI Error Assistant] Promise rejection 캡처됨");
    
    var error = event.reason;
    var errorInfo = {
      name: error instanceof Error ? error.name : "PromiseRejection",
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : ""
    };
    
    // AI 분석 요청
    AISupport.analyze(errorInfo);
  });

  // ============================================================
  // 4. 전역 객체로 노출
  // ============================================================
  window.AISupport = AISupport;

  // ============================================================
  // 5. 자동 초기화
  // ============================================================
  // DOM이 로드된 후 초기화
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      AISupport.init();
    });
  } else {
    // 이미 로드된 경우 즉시 초기화
    AISupport.init();
  }

})(window);
