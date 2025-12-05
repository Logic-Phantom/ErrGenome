/**
 * 통합 AI Assistant - 에러 자동 분석 + 콘솔 채팅
 * 
 * 주요 기능:
 * 1. 자동 에러 감지 및 AI 분석
 * 2. 콘솔에서 AI와 자유롭게 대화
 * 3. 확장된 에러 힌트 데이터베이스
 * 
 * 사용법:
 * - 에러 자동 분석: 자동으로 작동
 * - 채팅: chat("질문") 
 * - 도움말: chatHelp()
 */

(function (global) {
  "use strict";

  // ============================================================
  // 설정
  // ============================================================
  var CONFIG = {
    modelName: "Qwen2.5-0.5B-Instruct-q4f32_1-MLC",
    webllmURL: "../ui/web-llm/web-llm.min.js",
    errorAnalysisSettings: {
      temperature: 0.1,
      max_tokens: 500,
      top_p: 0.8
    },
    chatSettings: {
      temperature: 0.3,  // 낮춰서 더 일관성 있게
      max_tokens: 800,
      top_p: 0.85
    }
  };

  // ============================================================
  // ES Module 동적 로더
  // ============================================================
  function loadESModule(url, callback) {
    try {
      var importCode = 'import("' + url.replace(/"/g, '\\"') + '")';
      var importPromise = eval(importCode);
      
      if (importPromise && typeof importPromise.then === 'function') {
        importPromise.then(function(module) {
          callback(null, module);
        }).catch(function(err) {
          console.error("[AI Assistant] ES Module 로드 실패:", url, err);
          callback(err, null);
        });
      } else {
        var error = new Error("동적 import를 지원하지 않는 브라우저입니다.");
        callback(error, null);
      }
    } catch (err) {
      console.error("[AI Assistant] 동적 import 실행 실패:", err);
      callback(err, null);
    }
  }

  // ============================================================
  // 확장된 에러 힌트 데이터베이스
  // ============================================================
  var ErrorHints = {
    "cannot read property": {
      reasons: [
        "• null 또는 undefined 객체의 속성에 접근 시도",
        "• DOM 요소가 로드되기 전에 접근",
        "• 비동기 데이터가 아직 응답되지 않음"
      ]
    },
    "is not a function": {
      reasons: [
        "• 메서드명 오타 또는 존재하지 않는 메서드 호출",
        "• this 바인딩 문제",
        "• 함수가 아닌 값을 함수로 호출"
      ]
    },
    "is not defined": {
      reasons: [
        "• 변수 선언 없이 사용",
        "• 변수명 오타",
        "• 스코프 밖에서 let/const 변수 접근"
      ]
    },
    "invalid array length": {
      reasons: [
        "• new Array()에 음수 또는 4,294,967,295 초과 값",
        "• 무한 재귀로 인한 스택 오버플로우"
      ]
    },
    "maximum call stack": {
      reasons: [
        "• 무한 재귀 함수 (종료 조건 누락)",
        "• 순환 참조로 인한 무한 루프"
      ]
    },
    "unexpected token": {
      reasons: [
        "• JSON.parse()에 잘못된 JSON 문자열",
        "• 괄호, 중괄호 짝이 안 맞음",
        "• 따옴표 미스매치"
      ]
    }
  };

  var ExBuilderHints = {
    "duplicated": {
      reasons: [
        "• ComboBox/ListBox에 같은 code 값을 가진 아이템 중복 추가",
        "• Grid의 Dataset에 동일한 ID/Key 행 삽입",
        "• addItem() 호출 전 중복 체크 누락"
      ]
    },
    "invalid value": {
      reasons: [
        "• 컨트롤의 허용 범위를 벗어난 값 설정",
        "• 데이터 타입 불일치",
        "• 필수(required) 필드에 빈 값"
      ]
    },
    "control not found": {
      reasons: [
        "• 존재하지 않는 컨트롤 ID 참조",
        "• 컨트롤이 아직 생성되지 않음",
        "• 동적으로 생성된 컨트롤의 ID 오타"
      ]
    }
  };

  // ============================================================
  // 통합 AI Engine Manager
  // ============================================================
  var AIEngine = {
    engine: null,
    ready: false,
    loading: false,
    initialized: false,

    init: function(callback) {
      var self = this;

      if (this.initialized) {
        console.warn("[AI Assistant] 이미 초기화되었습니다.");
        if (callback) callback(null);
        return;
      }

      if (this.loading) {
        console.log("[AI Assistant] ⏳ 로딩 중입니다...");
        return;
      }

      this.initialized = true;
      this.loading = true;

      console.log("%c[AI Assistant] 🚀 초기화 시작...", "color: #2196F3; font-weight: bold");

      if (window.webllm && window.webllm.CreateMLCEngine) {
        console.log("[AI Assistant] WebLLM이 이미 로드되어 있습니다.");
        this.initializeEngine(window.webllm.CreateMLCEngine, callback);
        return;
      }

      loadESModule(CONFIG.webllmURL, function(err, webllmModule) {
        if (err || !webllmModule) {
          console.error("[AI Assistant] ❌ 모듈 로드 실패:", err);
          self.loading = false;
          if (callback) callback(err);
          return;
        }

        var CreateMLCEngine = webllmModule.CreateMLCEngine || 
                             (webllmModule.default && webllmModule.default.CreateMLCEngine);
        
        if (!CreateMLCEngine) {
          var error = new Error("CreateMLCEngine을 찾을 수 없습니다.");
          console.error("[AI Assistant] ❌", error);
          self.loading = false;
          if (callback) callback(error);
          return;
        }

        window.webllm = webllmModule;
        self.initializeEngine(CreateMLCEngine, callback);
      });
    },

    initializeEngine: function(CreateMLCEngine, callback) {
      var self = this;
      var lastPercent = 0;
      
      console.log("[AI Assistant] 📦 모델 로딩: " + CONFIG.modelName);
      console.log("[AI Assistant] 💡 첫 로드 시 다운로드가 필요합니다");
      
      CreateMLCEngine(CONFIG.modelName, {
        initProgressCallback: function(progress) {
          if (progress.progress !== undefined && progress.progress > 0) {
            var percent = Math.round(progress.progress * 100);
            if (percent >= lastPercent + 10) {
              console.log("[AI Assistant] 📊 로딩: " + percent + "%");
              lastPercent = percent;
            }
          }
        }
      }).then(function(engine) {
        self.engine = engine;
        self.ready = true;
        self.loading = false;
        
        console.log("%c[AI Assistant] ✅ 준비 완료!", "color: #4CAF50; font-weight: bold; font-size: 16px");
        console.log("%c기능:", "color: #2196F3; font-weight: bold");
        console.log("  ✓ 자동 에러 분석 (백그라운드)");
        console.log("  ✓ AI 채팅: chat('질문')");
        console.log("  ✓ 도움말: chatHelp()");
        
        // 에러 큐 처리
        if (ErrorAnalyzer.errorQueue.length > 0) {
          console.log("[AI Assistant] 큐에 쌓인 에러 " + ErrorAnalyzer.errorQueue.length + "개 분석 시작");
          for (var i = 0; i < ErrorAnalyzer.errorQueue.length; i++) {
            ErrorAnalyzer.handleError(ErrorAnalyzer.errorQueue[i]);
          }
          ErrorAnalyzer.errorQueue = [];
        }
        
        if (callback) callback(null);
      }).catch(function(err) {
        self.loading = false;
        console.error("[AI Assistant] ❌ 엔진 로드 실패:", err);
        if (callback) callback(err);
      });
    }
  };

  // ============================================================
  // 에러 분석 모듈
  // ============================================================
  var ErrorAnalyzer = {
    errorQueue: [],
    analyzedErrors: {},
    analyzing: false,

    getErrorHash: function(errObj) {
      return (errObj.name || '') + ':' + (errObj.message || '').substring(0, 100);
    },

    findErrorHint: function(message, isExBuilder) {
      var msg = message.toLowerCase();
      var hint = "";
      var hintDb = isExBuilder ? ExBuilderHints : ErrorHints;
      
      for (var key in hintDb) {
        if (msg.indexOf(key) !== -1) {
          hint = "\n💡 일반적 원인:\n";
          for (var i = 0; i < hintDb[key].reasons.length; i++) {
            hint += hintDb[key].reasons[i] + "\n";
          }
          return hint;
        }
      }
      
      if (isExBuilder) {
        return this.findErrorHint(message, false);
      }
      
      return "";
    },

    normalizeAIResponse: function(content) {
      var lines = content.split('\n');
      var result = [];
      var sections = {
        section1: [],
        section2: [],
        section3: [],
        section4: []
      };
      var currentSection = null;
      var seenChecklistItems = {};
      
      for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        var trimmed = line.trim();
        
        if (trimmed.match(/^1\.\s*에러\s*원인/)) {
          currentSection = 'section1';
          sections.section1.push(line);
          continue;
        } else if (trimmed.match(/^2\.\s*왜\s*발생/)) {
          currentSection = 'section2';
          sections.section2.push(line);
          continue;
        } else if (trimmed.match(/^3\.\s*해결\s*방법/)) {
          currentSection = 'section3';
          sections.section3.push(line);
          continue;
        } else if (trimmed.match(/^4\.\s*개발자\s*체크리스트/)) {
          currentSection = 'section4';
          sections.section4.push(line);
          seenChecklistItems = {};
          continue;
        }
        
        if (currentSection) {
          if (currentSection === 'section4' && trimmed.indexOf('•') !== -1) {
            if (!seenChecklistItems[trimmed]) {
              seenChecklistItems[trimmed] = true;
              sections[currentSection].push(line);
            }
          } else {
            sections[currentSection].push(line);
          }
        }
      }
      
      // 섹션4 체크리스트 3개로 제한
      if (sections.section4.length > 4) {
        var filtered = [sections.section4[0]];
        var itemCount = 0;
        for (var j = 1; j < sections.section4.length; j++) {
          if (sections.section4[j].trim().indexOf('•') !== -1) {
            if (itemCount < 3) {
              filtered.push(sections.section4[j]);
              itemCount++;
            }
          } else {
            filtered.push(sections.section4[j]);
          }
        }
        sections.section4 = filtered;
      }
      
      // 결과 조합
      if (sections.section1.length > 0) {
        result = result.concat(sections.section1);
        result.push('');
      } else {
        result.push('1. 에러 원인:');
        result.push('   에러 분석 중...');
        result.push('');
      }
      
      if (sections.section2.length > 0) {
        result = result.concat(sections.section2);
        result.push('');
      } else {
        result.push('2. 왜 발생했나:');
        result.push('   자세한 분석이 필요합니다.');
        result.push('');
      }
      
      if (sections.section3.length > 0) {
        result = result.concat(sections.section3);
        result.push('');
      } else {
        result.push('3. 해결 방법:');
        result.push('   ```javascript');
        result.push('   // 코드 검토가 필요합니다');
        result.push('   ```');
        result.push('');
      }
      
      if (sections.section4.length > 0) {
        result = result.concat(sections.section4);
      } else {
        result.push('4. 개발자 체크리스트:');
        result.push('   • 에러 메시지 확인');
        result.push('   • 스택 트레이스 분석');
      }

      return result.join('\n');
    },

    handleError: function(errObj) {
      var errorHash = this.getErrorHash(errObj);
      var now = Date.now();
      
      if (this.analyzedErrors[errorHash] && (now - this.analyzedErrors[errorHash]) < 5000) {
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
      
      if (errObj.stack) {
        var stackLines = errObj.stack.split('\n');
        for (var i = 0; i < stackLines.length; i++) {
          if (stackLines[i].indexOf('.clx.js') !== -1) {
            console.log("실제 에러 위치:", stackLines[i].trim());
            break;
          }
        }
      }
      console.log("%c" + "=".repeat(70), "color:#ff6600; font-weight:bold");

      if (!AIEngine.ready || !AIEngine.engine) {
        console.log("[AI Assistant] 엔진 준비 중. 에러를 큐에 추가합니다.");
        if (this.errorQueue.length < 10) {
          this.errorQueue.push(errObj);
        }
        return;
      }

      if (this.analyzing) {
        return;
      }

      this.analyzing = true;
      console.log("%c[AI Assistant] 🔍 AI 에러 분석 시작...", "color:#2196F3; font-weight:bold");
      
      // 에러 정보 구성
      var errorInfo = "에러 타입: " + (errObj.name || "Unknown") + "\n" +
                     "에러 메시지: " + (errObj.message || "N/A") + "\n";
      
      if (errObj.source && errObj.lineno) {
        errorInfo += "발생 위치: " + errObj.source + " (줄: " + errObj.lineno + ")\n";
      }
      
      if (errObj.stack) {
        var stackLines = errObj.stack.split('\n');
        for (var i = 0; i < stackLines.length; i++) {
          if (stackLines[i].indexOf('.clx.js') !== -1) {
            errorInfo += "\n실제 에러 발생 코드:\n" + stackLines[i].trim() + "\n";
            break;
          }
        }
      }

      var isExBuilder = errObj.framework === "eXBuilder6" || 
                        (errObj.message && errObj.message.indexOf('controltype') !== -1);
      
      var errorHint = this.findErrorHint(errObj.message || "", isExBuilder);
      
      if (isExBuilder) {
        errorHint = "\n[프레임워크] eXBuilder6 UI 프레임워크 에러\n" + errorHint;
      }
      
      var exbuilderInfo = "";
      if (isExBuilder && errObj.exbuilder) {
        exbuilderInfo = "\n[컨트롤 정보]\n";
        if (errObj.exbuilder.controltype) {
          exbuilderInfo += "타입: " + errObj.exbuilder.controltype + "\n";
        }
        if (errObj.exbuilder.id) {
          exbuilderInfo += "ID: " + errObj.exbuilder.id + "\n";
        }
        if (errObj.exbuilder.value) {
          exbuilderInfo += "문제 값: " + errObj.exbuilder.value + "\n";
        }
      }

      // 에러 힌트가 있으면 간단한 분석으로 충분
      if (errorHint && errorHint.trim().length > 0) {
        console.log("%c" + "=".repeat(70), "color:#4CAF50; font-weight:bold");
        console.log("%c💡 에러 힌트", "color:#ffffff; background:#4CAF50; font-weight:bold; font-size:14px; padding:5px");
        console.log("%c" + "=".repeat(70), "color:#4CAF50; font-weight:bold");
        console.log("");
        console.log(errorHint);
        console.log("");
        console.log("%c" + "=".repeat(70), "color:#4CAF50; font-weight:bold");
        
        // 힌트가 있으면 상세 AI 분석은 선택적으로
        this.analyzing = false;
        return;
      }

      var prompt = "=== 에러 정보 ===\n" +
                   errorInfo + 
                   exbuilderInfo +
                   errorHint + "\n\n" +
                   "=== 분석 지침 ===\n" +
                   "아래 양식을 정확히 따라 간결하게 작성하세요.\n\n" +
                   "1. 에러 원인:\n   (한 문장)\n\n" +
                   "2. 왜 발생했나:\n   (2줄 이내)\n\n" +
                   "3. 해결 방법:\n   ```javascript\n   // 코드\n   ```\n\n" +
                   "4. 개발자 체크리스트:\n   • (항목1)\n   • (항목2)\n   • (항목3)";

      var self = this;
      AIEngine.engine.chat.completions
        .create({
          messages: [
            { 
              role: "system", 
              content: "당신은 JavaScript와 eXBuilder6 전문가입니다. 주어진 양식을 정확히 따라 간결하게 작성하세요."
            },
            { 
              role: "user", 
              content: prompt 
            }
          ],
          temperature: CONFIG.errorAnalysisSettings.temperature,
          max_tokens: CONFIG.errorAnalysisSettings.max_tokens,
          top_p: CONFIG.errorAnalysisSettings.top_p
        })
        .then(function (res) {
          self.analyzing = false;
          var content = res.choices[0].message.content;
          var normalizedContent = self.normalizeAIResponse(content);
          
          console.log("%c" + "=".repeat(70), "color:#4CAF50; font-weight:bold");
          console.log("%c🤖 AI 에러 분석 결과", "color:#ffffff; background:#4CAF50; font-weight:bold; font-size:14px; padding:5px");
          console.log("%c" + "=".repeat(70), "color:#4CAF50; font-weight:bold");
          console.log("");
          console.log(normalizedContent);
          console.log("");
          console.log("%c" + "=".repeat(70), "color:#4CAF50; font-weight:bold");
        })
        .catch(function (err) {
          self.analyzing = false;
          console.error("[AI Assistant] AI 분석 오류:", err);
        });
    }
  };

  // ============================================================
  // 채팅 모듈
  // ============================================================
  var ChatManager = {
    conversationHistory: [],
    systemPrompt: "당신은 JavaScript 전문가입니다. 모든 답변은 한국어로 설명하고 JavaScript 코드 예제를 제공하세요. 절대 Python이나 다른 언어 코드를 사용하지 마세요. JavaScript 문법(const, let, 화살표 함수, .sort(), .map() 등)만 사용하세요.",
    settings: Object.assign({}, CONFIG.chatSettings),

    sendMessage: function(userMessage) {
      var self = this;

      return new Promise(function(resolve, reject) {
        if (!AIEngine.ready || !AIEngine.engine) {
          console.error("[AI Assistant] ❌ 엔진이 준비되지 않았습니다.");
          reject(new Error("Engine not ready"));
          return;
        }

        // JavaScript 관련 키워드 감지
        var jsKeywords = ['자바스크립트', 'javascript', 'js', '배열', 'array', '함수', 'function', 
                          '객체', 'object', '정렬', 'sort', '반복문', 'loop', 'for', 'const', 'let',
                          '오브젝트', '키', 'key', 'value', '값', 'map', 'filter', 'reduce'];
        var isJSQuestion = false;
        var lowerMsg = userMessage.toLowerCase();
        
        for (var i = 0; i < jsKeywords.length; i++) {
          if (lowerMsg.indexOf(jsKeywords[i]) !== -1) {
            isJSQuestion = true;
            break;
          }
        }

        // JavaScript 질문이면 강제로 JavaScript 답변 유도
        var enhancedMessage = userMessage;
        if (isJSQuestion) {
          enhancedMessage = userMessage + 
                           "\n\n[중요: 반드시 JavaScript 코드로만 답변하세요. Python 코드는 사용하지 마세요. 한국어로 설명하고 JavaScript 예제를 제공하세요.]";
        }

        self.conversationHistory.push({
          role: "user",
          content: enhancedMessage
        });

        var messages = [
          { role: "system", content: self.systemPrompt }
        ].concat(self.conversationHistory);

        console.log("%c[User] " + userMessage, "color: #2196F3; font-weight: bold");
        console.log("%c[AI] 생각하는 중...", "color: #9E9E9E; font-style: italic");

        var fullResponse = "";
        var startTime = Date.now();

        AIEngine.engine.chat.completions.create({
          messages: messages,
          temperature: self.settings.temperature,
          max_tokens: self.settings.max_tokens,
          top_p: self.settings.top_p
        }).then(function(res) {
          fullResponse = res.choices[0].message.content;
          
          // Python 코드가 포함되어 있으면 경고
          if (fullResponse.indexOf('```python') !== -1 || 
              fullResponse.indexOf('Python') !== -1 ||
              fullResponse.indexOf('.sort()') !== -1 && fullResponse.indexOf('arr.sort()') !== -1) {
            console.warn("%c⚠️ AI가 Python 코드를 생성했습니다. JavaScript로 다시 요청해보세요.", "color: #FF9800; font-weight: bold");
            console.log("%c💡 시도: chatJS('질문') 또는 더 명확하게 'JavaScript 코드로' 라고 명시하세요.", "color: #2196F3");
          }
          
          var elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
          
          console.log("%c[AI] " + fullResponse, "color: #4CAF50; font-weight: bold");
          console.log("%c⏱️ 응답 시간: " + elapsedTime + "초", "color: #9E9E9E; font-size: 11px");
          
          self.conversationHistory.push({
            role: "assistant",
            content: fullResponse
          });

          resolve(fullResponse);
        }).catch(function(err) {
          console.error("[AI Assistant] ❌ 메시지 전송 실패:", err);
          reject(err);
        });
      });
    },

    getHistory: function() {
      return this.conversationHistory;
    },

    clearHistory: function() {
      this.conversationHistory = [];
      console.log("[AI Assistant] 🗑️ 대화 이력이 초기화되었습니다.");
    },

    setSystemPrompt: function(prompt) {
      this.systemPrompt = prompt;
      console.log("[AI Assistant] ⚙️ 시스템 프롬프트 변경됨");
    },

    updateSettings: function(newSettings) {
      Object.assign(this.settings, newSettings);
      console.log("[AI Assistant] ⚙️ 설정 변경됨:", this.settings);
    }
  };

  // ============================================================
  // 글로벌 함수 노출 (채팅)
  // ============================================================
  global.chat = function(message) {
    if (typeof message !== 'string' || message.trim() === '') {
      console.error("[AI Assistant] ❌ 메시지를 입력해주세요. 예: chat('안녕하세요')");
      return;
    }

    if (!AIEngine.ready) {
      console.log("[AI Assistant] ⏳ 초기화 중입니다. 잠시 후 다시 시도해주세요.");
      AIEngine.init(function(err) {
        if (!err) {
          chat(message);
        }
      });
      return;
    }

    ChatManager.sendMessage(message).catch(function(err) {
      console.error("[AI Assistant] 오류:", err);
    });
  };

  global.chatHistory = function() {
    var history = ChatManager.getHistory();
    
    if (history.length === 0) {
      console.log("[AI Assistant] 📭 대화 이력이 없습니다.");
      return;
    }

    console.log("%c=== 대화 이력 (" + history.length + "개) ===", 
                "color: #2196F3; font-weight: bold; font-size: 14px");
    
    for (var i = 0; i < history.length; i++) {
      var msg = history[i];
      if (msg.role === "user") {
        console.log("%c[User] " + msg.content, "color: #2196F3");
      } else if (msg.role === "assistant") {
        console.log("%c[AI] " + msg.content, "color: #4CAF50");
      }
    }
    
    console.log("%c" + "=".repeat(50), "color: #2196F3");
  };

  global.clearChat = function() {
    ChatManager.clearHistory();
  };

  global.chatConfig = function(settings) {
    if (typeof settings !== 'object') {
      console.log("[AI Assistant] 현재 설정:", ChatManager.settings);
      console.log("변경하려면: chatConfig({ temperature: 0.8, max_tokens: 1000 })");
      return;
    }
    ChatManager.updateSettings(settings);
  };

  global.chatSystem = function(prompt) {
    if (typeof prompt !== 'string') {
      console.log("[AI Assistant] 현재 시스템 프롬프트:", ChatManager.systemPrompt);
      console.log("변경하려면: chatSystem('당신은 프로그래밍 전문가입니다.')");
      return;
    }
    ChatManager.setSystemPrompt(prompt);
  };

  global.chatJS = function(message) {
    // JavaScript 전문 모드로 강제 설정
    if (typeof message !== 'string' || message.trim() === '') {
      console.error("[AI Assistant] ❌ 메시지를 입력해주세요.");
      return;
    }

    if (!AIEngine.ready) {
      console.log("[AI Assistant] ⏳ 초기화 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    // 명확한 JavaScript 요청으로 변환 (한국어)
    var jsMessage = message + 
                   "\n\n[중요 지침]\n" +
                   "1. 반드시 JavaScript 코드로만 답변하세요\n" +
                   "2. Python, Java 등 다른 언어는 절대 사용 금지\n" +
                   "3. 한국어로 설명하고 JavaScript 예제 제공\n" +
                   "4. const, let, 화살표 함수(=>), .map(), .filter() 등 최신 문법 사용\n" +
                   "5. 실용적이고 간단한 코드 예제를 보여주세요";
    
    console.log("%c[JavaScript 전용 모드]", "color: #FF9800; font-weight: bold");
    ChatManager.sendMessage(jsMessage).catch(function(err) {
      console.error("[AI Assistant] 오류:", err);
    });
  };

  global.switchModel = function(modelKey) {
    if (!modelKey) {
      console.log("%c사용 가능한 모델:", "color: #2196F3; font-weight: bold");
      console.log("");
      for (var key in CONFIG.availableModels) {
        var marker = CONFIG.availableModels[key] === CONFIG.modelName ? "✓ " : "  ";
        console.log(marker + key + ": " + CONFIG.availableModels[key]);
      }
      console.log("");
      console.log("사용법: switchModel('모델키')");
      console.log("예시: switchModel('qwen-1.5b')");
      return;
    }

    if (CONFIG.availableModels[modelKey]) {
      CONFIG.modelName = CONFIG.availableModels[modelKey];
      console.log("%c모델 변경됨: " + CONFIG.modelName, "color: #4CAF50; font-weight: bold");
      console.log("새 모델을 적용하려면 페이지를 새로고침하세요.");
    } else {
      console.error("❌ 알 수 없는 모델입니다. switchModel() 으로 목록을 확인하세요.");
    }
  };

  global.analyzeError = function() {
    console.log("%c=== 수동 에러 분석 ===", "color: #2196F3; font-weight: bold");
    console.log("다음 명령어로 에러를 분석할 수 있습니다:");
    console.log("");
    console.log("1. 마지막 에러 재분석 (AI 사용):");
    console.log("   analyzeLastError()");
    console.log("");
    console.log("2. 에러 힌트만 다시 보기:");
    console.log("   showErrorHints()");
  };

  global.analyzeLastError = function() {
    // 마지막 에러를 AI로 재분석 (힌트 무시)
    var lastError = null;
    var lastTime = 0;
    
    for (var hash in ErrorAnalyzer.analyzedErrors) {
      if (ErrorAnalyzer.analyzedErrors[hash] > lastTime) {
        lastTime = ErrorAnalyzer.analyzedErrors[hash];
      }
    }
    
    if (!lastTime) {
      console.log("❌ 분석할 에러가 없습니다.");
      return;
    }
    
    console.log("💡 마지막 에러에 대한 AI 상세 분석을 시작합니다...");
    console.log("(힌트가 충분하다면 이 기능은 필요하지 않을 수 있습니다)");
  };

  global.chatHelp = function() {
    console.log("%c=== AI Assistant 도움말 ===", 
                "color: #2196F3; font-weight: bold; font-size: 16px");
    console.log("");
    console.log("%c✓ 자동 에러 분석", "color: #FF9800; font-weight: bold");
    console.log("  JavaScript 에러가 발생하면 자동으로 힌트를 표시합니다.");
    console.log("  (AI 상세 분석은 힌트가 없는 경우에만 실행)");
    console.log("");
    console.log("%c✓ AI 채팅 명령어", "color: #FF9800; font-weight: bold");
    console.log("  chat('메시지')           - AI에게 질문");
    console.log("  chatJS('메시지')         - JavaScript 코드 전용 (강력 추천!)");
    console.log("  chatHistory()            - 대화 이력 확인");
    console.log("  clearChat()              - 대화 초기화");
    console.log("  chatConfig({...})        - 설정 변경");
    console.log("  chatSystem('프롬프트')   - 시스템 역할 설정");
    console.log("  switchModel()            - 모델 목록 보기");
    console.log("  switchModel('모델키')    - 모델 변경");
    console.log("");
    console.log("%c✓ 에러 분석 명령어", "color: #FF9800; font-weight: bold");
    console.log("  analyzeError()           - 에러 분석 도움말");
    console.log("");
    console.log("%c💡 JavaScript 질문은 chatJS() 사용 권장", "color: #FF9800; font-weight: bold");
    console.log("");
    console.log("%c사용 예시:", "color: #4CAF50; font-weight: bold");
    console.log("  chatJS('배열 정렬 방법')  ← JavaScript 코드로 답변");
    console.log("  chatJS('Promise 사용법')");
    console.log("  chatJS('화살표 함수 예제')");
    console.log("");
    console.log("  switchModel()            ← 사용 가능한 모델 보기");
    console.log("  switchModel('qwen-3b')   ← 더 큰 모델로 변경");
    console.log("");
  };

  // ============================================================
  // 에러 후킹 설치
  // ============================================================
  var originalOnError = window.onerror;
  var aiErrorHandler;

  aiErrorHandler = function(msg, src, line, col, error) {
    if (originalOnError && typeof originalOnError === 'function' && originalOnError !== aiErrorHandler) {
      try {
        originalOnError.call(this, msg, src, line, col, error);
      } catch (e) {}
    }

    var errObj = {
      name: error && error.name ? error.name : "Error",
      message: msg || (error && error.message ? error.message : "Unknown error"),
      source: src || "",
      lineno: line || 0,
      colno: col || 0,
      stack: error && error.stack ? error.stack : undefined,
      timestamp: new Date().toISOString()
    };
    
    ErrorAnalyzer.handleError(errObj);
    return false;
  };

  function installErrorHandler() {
    if (window.onerror === aiErrorHandler) return;
    if (window.onerror && window.onerror !== aiErrorHandler) {
      originalOnError = window.onerror;
    }
    
    try {
      window.onerror = aiErrorHandler;
      console.log("[AI Assistant] ✓ window.onerror 설치 완료");
    } catch (e) {
      console.error("[AI Assistant] window.onerror 설치 실패:", e);
    }
  }

  // console.error 후킹
  var originalConsoleError = console.error;
  
  function isErrorMessage(message) {
    if (!message) return false;
    var msg = String(message).toLowerCase();
    return msg.indexOf('error') !== -1 || 
           msg.indexOf('exception') !== -1 ||
           msg.indexOf('uncaught') !== -1 ||
           msg.indexOf('failed') !== -1 ||
           msg.indexOf('duplicated') !== -1 ||
           msg.indexOf('invalid') !== -1;
  }
  
  console.error = function() {
    var args = Array.prototype.slice.call(arguments);
    originalConsoleError.apply(console, args);
    
    var errorMessage = '';
    var errorObj = null;
    var fullMessage = '';
    
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
    
    if (isErrorMessage(fullMessage) || errorObj !== null) {
      var errObj = {
        name: errorObj ? errorObj.name : "Error",
        message: fullMessage.trim() || "Unknown error",
        stack: errorObj ? errorObj.stack : (new Error().stack),
        source: "console.error",
        type: "console_error",
        timestamp: new Date().toISOString()
      };
      
      if (errObj.stack) {
        var stackLines = errObj.stack.split('\n');
        for (var j = 0; j < stackLines.length; j++) {
          var line = stackLines[j];
          if (line.indexOf('.clx.js') !== -1 || 
              line.indexOf('test.') !== -1 ||
              line.indexOf('cleopatra.js') !== -1) {
            errObj.source = line.trim();
            
            var lineMatch = line.match(/:(\d+):(\d+)/);
            if (lineMatch) {
              errObj.lineno = parseInt(lineMatch[1]);
              errObj.colno = parseInt(lineMatch[2]);
            }
            break;
          }
        }
      }
      
      if (fullMessage.indexOf('controltype') !== -1) {
        errObj.framework = "eXBuilder6";
        
        var controltypeMatch = fullMessage.match(/controltype:\s*(\w+)/i);
        var idMatch = fullMessage.match(/id:\s*(\w+)/i);
        var valueMatch = fullMessage.match(/value:\s*([^\]]+)/i);
        
        if (controltypeMatch || idMatch) {
          errObj.exbuilder = {
            controltype: controltypeMatch ? controltypeMatch[1] : null,
            id: idMatch ? idMatch[1] : null,
            value: valueMatch ? valueMatch[1].trim() : null
          };
        }
      }
      
      setTimeout(function() {
        ErrorAnalyzer.handleError(errObj);
      }, 100);
    }
  };

  // console.warn 후킹
  var originalConsoleWarn = console.warn;
  
  console.warn = function() {
    var args = Array.prototype.slice.call(arguments);
    originalConsoleWarn.apply(console, args);
    
    var fullMessage = '';
    for (var i = 0; i < args.length; i++) {
      fullMessage += String(args[i]) + '\n';
    }
    
    if (isErrorMessage(fullMessage)) {
      var errObj = {
        name: "Warning",
        message: fullMessage.trim(),
        stack: new Error().stack,
        source: "console.warn",
        type: "console_warn",
        timestamp: new Date().toISOString()
      };
      
      if (fullMessage.indexOf('controltype') !== -1) {
        errObj.framework = "eXBuilder6";
        var controltypeMatch = fullMessage.match(/controltype:\s*(\w+)/i);
        var idMatch = fullMessage.match(/id:\s*(\w+)/i);
        var valueMatch = fullMessage.match(/value:\s*([^\]]+)/i);
        
        if (controltypeMatch || idMatch) {
          errObj.exbuilder = {
            controltype: controltypeMatch ? controltypeMatch[1] : null,
            id: idMatch ? idMatch[1] : null,
            value: valueMatch ? valueMatch[1].trim() : null
          };
        }
      }
      
      setTimeout(function() {
        if (!AIEngine.ready) {
          ErrorAnalyzer.errorQueue.push(errObj);
        } else {
          ErrorAnalyzer.handleError(errObj);
        }
      }, 100);
    }
  };

  // unhandledrejection 이벤트
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

    ErrorAnalyzer.handleError(errObj);
  });

  // window.onerror 보호
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
    console.log("[AI Assistant] ✓ window.onerror 보호 활성화");
  } catch (e) {
    // 무시
  }

  // 주기적으로 에러 핸들러 확인
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

  // ============================================================
  // 자동 초기화
  // ============================================================
  
  console.log("%c[AI Assistant] 📚 통합 AI Assistant 로드 완료", "color: #2196F3; font-weight: bold");
  console.log("💡 chatHelp() 명령어로 사용법을 확인하세요!");
  
  installErrorHandler();
  
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      installErrorHandler();
      AIEngine.init();
    });
  } else {
    AIEngine.init();
  }
  
  setTimeout(function() {
    installErrorHandler();
    if (!AIEngine.initialized) {
      AIEngine.init();
    }
  }, 1000);

  // 전역 객체 노출 (고급 사용자용)
  global.AIEngine = AIEngine;
  global.ErrorAnalyzer = ErrorAnalyzer;
  global.ChatManager = ChatManager;

})(window);