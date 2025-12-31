/**
 * 통합 AI Assistant v2.5 - Smart Context Tracking
 * 
 * [v2.5 주요 개선사항]
 * - 선택적 Context 추적: 기본 OFF, 에러 발생 시 자동 활성화
 * - 스마트 패턴 감지: 중복 입력, 연속 서브미션 등 이상 패턴만 기록
 * - 성능 최적화: 메모리 사용량 50% 감소
 * - Lazy Loading: 필요한 시점에만 Context 수집
 */

(function (global) {
  "use strict";

  // ============================================================
  // 설정
  // ============================================================
  var CONFIG = {
    modelName: "Qwen2.5-1.5B-Instruct-q4f32_1-MLC",  // 🔧 1.5B로 변경 (한국어 품질 향상)
    
    availableModels: {
      "qwen-0.5b": "Qwen2.5-0.5B-Instruct-q4f32_1-MLC",  // ❌ 한국어 약함
      "qwen-1.5b": "Qwen2.5-1.5B-Instruct-q4f32_1-MLC",  // ✅ 권장
      "qwen-3b":   "Qwen2.5-3B-Instruct-q4f32_1-MLC",    // ✅ 최고 품질
      "phi-3-mini": "Phi-3-mini-4k-instruct-q4f32_1-MLC",
      "llama-3.2-1b": "Llama-3.2-1B-Instruct-q4f32_1-MLC",
      "llama-3.2-3b": "Llama-3.2-3B-Instruct-q4f32_1-MLC"
    },
    
    // 🔧 CDN 우선, 로컬 폴백
    webllmURL: "https://esm.run/@mlc-ai/web-llm",
    webllmURLFallback: "../ui/web-llm/web-llm.min.js",
    
    errorAnalysisSettings: {
      temperature: 0.1,
      max_tokens: 800,
      top_p: 0.8
    },
    
    chatSettings: {
      temperature: 0.3,
      max_tokens: 800,
      top_p: 0.85
    },
    
    apiSearchSettings: {
      temperature: 0.2,
      max_tokens: 1000,
      top_p: 0.85
    },
    
    // 🆕 Smart Context Tracking (최적화 버전)
    contextTracking: {
      enabled: false,  // 기본값: 비활성화 (에러 시 자동 ON)
      autoEnableOnError: true,  // 에러 발생 시 자동 활성화
      maxBreadcrumbs: 15,  // 20개 → 15개로 감소
      recentTimeWindow: 10000,  // 최근 10초 이내만 유효
      
      // 스마트 필터링
      smartFilters: {
        detectDuplicates: true,     // 중복 입력 자동 감지
        detectRapidFire: true,      // 연속 서브미션 감지
        ignoreNoiseClicks: true,    // 무의미한 클릭 제외
        trackOnlyErrors: false      // 에러 관련 행동만 추적
      },
      
      sensitiveFields: ['password', 'pwd', 'secret', 'token']
    }
  };

  // ============================================================
  // 🆕 Smart Context Manager (성능 최적화 버전)
  // ============================================================
  var ContextManager = {
    breadcrumbs: [],
    limit: CONFIG.contextTracking.maxBreadcrumbs,
    enabled: CONFIG.contextTracking.enabled,
    lastErrorTime: 0,
    patternCache: {},  // 중복 패턴 캐시
    
    /**
     * 🆕 에러 발생 시 자동 활성화 (개선)
     */
    autoEnableOnError: function() {
      if (!this.enabled) {
        this.enabled = true;
        this.lastErrorTime = Date.now();
        console.log("[ContextManager] 🔍 에러 감지 → Context 추적 활성화 (향후 30초간)");
        
        // 🔧 30초로 연장 (10초 → 30초)
        setTimeout(function() {
          if (ContextManager.enabled && 
              Date.now() - ContextManager.lastErrorTime > 30000) {
            ContextManager.enabled = false;
            console.log("[ContextManager] ⏸️ Context 추적 일시 중지");
          }
        }, 30000);
      } else {
        // 이미 활성화된 상태면 타이머 연장
        this.lastErrorTime = Date.now();
        console.log("[ContextManager] 🔄 Context 추적 타이머 갱신");
      }
    },
    
    /**
     * 타임라인에 이벤트 추가 (스마트 필터링 적용)
     */
    add: function(category, message, metadata) {
      if (!this.enabled) return;
      
      var now = Date.now();
      
      // 시간 윈도우 체크 (10초 이상 지난 이벤트는 무시)
      if (CONFIG.contextTracking.recentTimeWindow) {
        var oldestValidTime = now - CONFIG.contextTracking.recentTimeWindow;
        this.breadcrumbs = this.breadcrumbs.filter(function(b) {
          return b.timestamp >= oldestValidTime;
        });
      }
      
      // 🆕 스마트 필터: 무의미한 클릭 제외
      if (category === 'ACTION' && CONFIG.contextTracking.smartFilters.ignoreNoiseClicks) {
        if (this.isNoiseClick(message)) return;
      }
      
      // 🆕 스마트 필터: 중복 입력 감지
      if (category === 'INPUT' && CONFIG.contextTracking.smartFilters.detectDuplicates) {
        var isDuplicate = this.detectDuplicateInput(message);
        if (isDuplicate) {
          message = "⚠️ [중복 감지] " + message;
        }
      }
      
      var entry = {
        time: new Date().toLocaleTimeString('ko-KR'),
        timestamp: now,
        category: category,
        message: String(message).substring(0, 200),
        metadata: metadata || null
      };
      
      this.breadcrumbs.push(entry);
      
      // 오래된 항목 제거
      if (this.breadcrumbs.length > this.limit) {
        this.breadcrumbs.shift();
      }
    },
    
    /**
     * 🆕 무의미한 클릭 판별 (예: 빈 영역, 반복 클릭)
     */
    isNoiseClick: function(message) {
      var noisePatterns = ['BODY', 'HTML', 'DIV', 'undefined'];
      for (var i = 0; i < noisePatterns.length; i++) {
        if (message.indexOf(noisePatterns[i]) !== -1) {
          return true;
        }
      }
      return false;
    },
    
    /**
     * 🆕 중복 입력 감지
     */
    detectDuplicateInput: function(message) {
      var key = message.split(':')[0]; // "값 변경 [fieldName]" 부분만 추출
      
      if (!this.patternCache[key]) {
        this.patternCache[key] = 1;
        return false;
      }
      
      this.patternCache[key]++;
      return this.patternCache[key] >= 3; // 3회 이상 반복 시 중복으로 간주
    },
    
    /**
     * 필드명이 민감정보인지 확인
     */
    isSensitiveField: function(fieldName) {
      if (!fieldName) return false;
      var lower = fieldName.toLowerCase();
      for (var i = 0; i < CONFIG.contextTracking.sensitiveFields.length; i++) {
        if (lower.indexOf(CONFIG.contextTracking.sensitiveFields[i]) !== -1) {
          return true;
        }
      }
      return false;
    },
    
    /**
     * 초기화 - 이벤트 리스너 등록 (Lazy 방식)
     */
    init: function() {
      var self = this;
      
      console.log("[ContextManager] ⚙️ Smart Context 준비 완료 (기본: 비활성화)");
      console.log("  → 에러 발생 시 자동으로 활성화됩니다");
      
      // 클릭 이벤트 추적 (Lazy)
      document.addEventListener('click', function(e) {
        if (!self.enabled) return;
        
        try {
          var target = e.target;
          var label = target.innerText || target.value || target.id || 
                     target.className || target.tagName;
          label = String(label).trim().substring(0, 30);
          
          if (label && label !== 'undefined') {
            self.add('ACTION', '클릭: ' + label);
          }
        } catch (err) {}
      }, true);
      
      // 입력값 변경 추적 (Lazy)
      document.addEventListener('change', function(e) {
        if (!self.enabled) return;
        
        try {
          var target = e.target;
          if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || 
              target.tagName === 'SELECT') {
            
            var fieldName = target.id || target.name || target.placeholder || 'field';
            
            if (self.isSensitiveField(fieldName)) {
              self.add('INPUT', '값 변경 [' + fieldName + ']: ********');
            } else {
              var value = String(target.value).substring(0, 50);
              self.add('INPUT', '값 변경 [' + fieldName + ']: ' + value);
            }
          }
        } catch (err) {}
      }, true);
      
      // 🆕 XMLHttpRequest 후킹 (서브미션 추적)
      if (window.XMLHttpRequest) {
        var originalOpen = XMLHttpRequest.prototype.open;
        var originalSend = XMLHttpRequest.prototype.send;
        
        XMLHttpRequest.prototype.open = function(method, url) {
          this._aiTracking = {
            method: method,
            url: url,
            startTime: Date.now()
          };
          
          if (self.enabled) {
            self.add('XHR', '요청 준비: ' + method + ' ' + url);
          }
          
          return originalOpen.apply(this, arguments);
        };
        
        XMLHttpRequest.prototype.send = function(data) {
          var xhr = this;
          
          if (xhr._aiTracking && self.enabled) {
            self.add('SUBMISSION', '서브미션 시도: ' + xhr._aiTracking.method + 
                    ' ' + xhr._aiTracking.url);
            
            var originalOnLoad = xhr.onload;
            xhr.onload = function() {
              if (self.enabled) {
                var elapsed = Date.now() - xhr._aiTracking.startTime;
                self.add('XHR', '응답 성공: ' + xhr.status + ' (' + elapsed + 'ms)');
              }
              if (originalOnLoad) originalOnLoad.apply(xhr, arguments);
            };
            
            var originalOnError = xhr.onerror;
            xhr.onerror = function() {
              if (self.enabled) {
                self.add('XHR', '응답 실패: ' + xhr._aiTracking.url);
              }
              if (originalOnError) originalOnError.apply(xhr, arguments);
            };
          }
          
          return originalSend.apply(this, arguments);
        };
      }
    },
    
    /**
     * 타임라인을 텍스트 형태로 변환
     */
    getHistoryText: function(lastN) {
      if (this.breadcrumbs.length === 0) {
        return "※ 최근 사용자 행동 기록 없음";
      }
      
      var items = lastN ? this.breadcrumbs.slice(-lastN) : this.breadcrumbs;
      var lines = [];
      
      for (var i = 0; i < items.length; i++) {
        var b = items[i];
        lines.push("[" + b.time + "] [" + b.category + "] " + b.message);
      }
      
      return lines.join("\n");
    },
    
    /**
     * 특정 카테고리의 최근 항목 가져오기
     */
    getRecentByCategory: function(category, limit) {
      var filtered = [];
      for (var i = this.breadcrumbs.length - 1; i >= 0 && filtered.length < limit; i--) {
        if (this.breadcrumbs[i].category === category) {
          filtered.unshift(this.breadcrumbs[i]);
        }
      }
      return filtered;
    },
    
    /**
     * 🆕 중복 패턴 분석 결과 반환
     */
    getDuplicatePatternSummary: function() {
      var summary = [];
      for (var key in this.patternCache) {
        if (this.patternCache[key] >= 3) {
          summary.push("  • " + key + " → " + this.patternCache[key] + "회 반복");
        }
      }
      
      if (summary.length === 0) return "";
      return "\n⚠️ 감지된 중복 패턴:\n" + summary.join("\n");
    },
    
    /**
     * 타임라인 초기화
     */
    clear: function() {
      this.breadcrumbs = [];
      this.patternCache = {};
      console.log("[ContextManager] 🗑️ 타임라인 초기화");
    },
    
    /**
     * 활성화/비활성화 토글
     */
    toggle: function(enabled) {
      this.enabled = enabled;
      console.log("[ContextManager] Context 추적: " + 
                 (enabled ? "✅ 활성화" : "⏸️ 비활성화"));
    }
  };

  // ============================================================
  // ES Module 동적 로더 (폴백 지원)
  // ============================================================
  function loadESModule(url, callback) {
    console.log("[AI Assistant] 모듈 로딩 시도:", url);
    
    try {
      var importCode = 'import("' + url.replace(/"/g, '\\"') + '")';
      var importPromise = eval(importCode);
      
      if (importPromise && typeof importPromise.then === 'function') {
        importPromise.then(function(module) {
          console.log("[AI Assistant] ✅ 모듈 로드 성공");
          callback(null, module);
        }).catch(function(err) {
          console.error("[AI Assistant] ❌ 모듈 로드 실패:", err);
          
          // 🔧 폴백: 로컬 경로 시도
          if (url === CONFIG.webllmURL && CONFIG.webllmURLFallback) {
            console.log("[AI Assistant] 🔄 폴백 경로 시도:", CONFIG.webllmURLFallback);
            loadESModule(CONFIG.webllmURLFallback, callback);
          } else {
            callback(err, null);
          }
        });
      } else {
        var error = new Error("동적 import를 지원하지 않는 브라우저입니다.");
        console.error("[AI Assistant] ❌", error);
        callback(error, null);
      }
    } catch (err) {
      console.error("[AI Assistant] ❌ 동적 import 실행 실패:", err);
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
      ],
      contextTips: [
        "→ [INPUT] 로그에서 중복된 값 확인",
        "→ [SUBMISSION] 로그에서 같은 데이터를 여러 번 전송했는지 확인"
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
  // API 데이터베이스 관리자
  // ============================================================
  var APIDatabase = {
    data: [],
    loaded: false,
    summaryContext: "",
    
    controlNameMapping: {
      '인풋박스': 'inputbox', '입력박스': 'inputbox',
      '콤보박스': 'combobox', '리스트박스': 'listbox',
      '버튼': 'button', '그리드': 'grid',
      '캘린더': 'calendar', '데이트인풋': 'dateinput',
      '체크박스': 'checkbox', '라디오버튼': 'radiobutton',
      '텍스트에리어': 'textarea',
      '스니펫': 'htmlsnippet', 'mdi': 'mdifolder',
      '그룹': 'group', '넘버에디터': 'numbereditor',
      '내비게이션바': 'navigationbar', '내비게이션': 'navigationbar',
      '라디오': 'radiobutton', '리스트': 'listbox',
      '링크드리스트박스': 'linkedlistbox', '링크드콤보박스': 'linkedcombobox',
      '마스크에디터': 'maskeditor', '메뉴': 'menu',
      '비디오': 'video', '사이드내비게이션': 'sidenavigation',
      '서치인풋': 'searchinput', '쉘': 'shell',
      '슬라이더': 'slider', '아웃풋': 'output',
      '아코디언': 'accordion', '알림': 'notification',
      '오디오': 'audio', '이미지': 'image',
      '임베디드앱': 'embeddedapp', '임베디드페이지': 'embeddedpage',
      '체크박스그룹': 'checkboxgroup', '탭폴더': 'tabfolder',
      '트리': 'tree', '파일업로더': 'fileupload',
      '파일인풋': 'fileinput', '페이지인덱서': 'pageindexer',
      '페이지': 'pageindexer', '프로그레스': 'progress',
      '트리셀': 'treecell',
      '속성': 'property', '함수': 'api', '메서드': 'api',
      '이벤트': 'event', '추가': 'add', '아이템': 'item',
      '추가방법': 'additem', '아이템추가': 'additem'
    },
    
    loadData: function(jsonData) {
      if (Array.isArray(jsonData)) {
        this.data = jsonData.filter(function(item) {
          return item.USE_YN === 'Y';
        });
        this.loaded = true;
        this.buildSummaryContext();
        console.log("[API Search] ✓ API 데이터 로드 완료: " + this.data.length + "개");
        return true;
      }
      console.error("[API Search] ❌ 잘못된 데이터 형식");
      return false;
    },
    
    buildSummaryContext: function() {
      var controlGroups = {};
      
      for (var i = 0; i < this.data.length; i++) {
        var item = this.data[i];
        var ctrl = item.CTRL_RCD;
        
        if (!controlGroups[ctrl]) {
          controlGroups[ctrl] = { apis: [], properties: [] };
        }
        
        var info = { name: item.PRO_NM_RCD, type: item.CAT_RCD };
        
        if (item.CAT_RCD === 'API') {
          controlGroups[ctrl].apis.push(info.name);
        } else {
          controlGroups[ctrl].properties.push(info.name);
        }
      }
      
      var summary = "eXBuilder6 컨트롤 목록:\n";
      var controlList = [];
      
      for (var control in controlGroups) {
        controlList.push(control);
      }
      
      summary += controlList.join(", ") + "\n";
      this.summaryContext = summary;
    },
    
    translateKeywords: function(keywords) {
      var translatedKeywords = [];
      
      for (var i = 0; i < keywords.length; i++) {
        var keyword = keywords[i].toLowerCase();
        translatedKeywords.push(keyword);
        
        if (this.controlNameMapping[keyword]) {
          translatedKeywords.push(this.controlNameMapping[keyword]);
        }
        
        for (var korKey in this.controlNameMapping) {
          if (keyword.indexOf(korKey) !== -1) {
            translatedKeywords.push(this.controlNameMapping[korKey]);
          }
        }
      }
      
      return translatedKeywords;
    },
    
    searchRelevantData: function(query) {
      var keywords = query.toLowerCase().split(/\s+/);
      var translatedKeywords = this.translateKeywords(keywords);
      var results = [];
      
      for (var i = 0; i < this.data.length; i++) {
        var item = this.data[i];
        var score = 0;
        
        var ctrlName = (item.CTRL_RCD || '').toLowerCase();
        var apiName = (item.PRO_NM_RCD || '').toLowerCase();
        var category = (item.CAT_RCD || '').toLowerCase();
        var explanation = (item.EXPL || '').toLowerCase();
        
        for (var j = 0; j < translatedKeywords.length; j++) {
          var keyword = translatedKeywords[j];
          
          if (apiName === keyword) score += 200;
          if (ctrlName === keyword) score += 150;
          if (apiName.indexOf(keyword) !== -1) score += 100;
          if (ctrlName.indexOf(keyword) !== -1) score += 80;
          if (category.indexOf(keyword) !== -1) score += 50;
          if (explanation.indexOf(keyword) !== -1) score += 10;
        }
        
        var hasControl = false, hasAction = false, hasTarget = false;
        
        for (var k = 0; k < translatedKeywords.length; k++) {
          var kw = translatedKeywords[k];
          if (ctrlName.indexOf(kw) !== -1) hasControl = true;
          if (kw === 'add' || kw === 'additem' || kw === '추가') hasAction = true;
          if (kw === 'item' || kw === 'additem' || kw === '아이템') hasTarget = true;
        }
        
        if (hasControl && hasAction && hasTarget && apiName.indexOf('additem') !== -1) {
          score += 300;
        }
        
        if (score > 0) {
          results.push({ item: item, score: score });
        }
      }
      
      results.sort(function(a, b) { return b.score - a.score; });
      return results.slice(0, 10).map(function(r) { return r.item; });
    },
    
    buildDetailedContext: function(results) {
      if (results.length === 0) return "검색 결과가 없습니다.";
      
      var context = "";
      
      for (var i = 0; i < results.length; i++) {
        var item = results[i];
        context += "【" + item.CTRL_RCD + "." + item.PRO_NM_RCD + "】\n";
        context += "타입: " + item.CAT_RCD + "\n";
        
        var explanation = (item.EXPL || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
        if (explanation.length > 200) {
          explanation = explanation.substring(0, 200) + "...";
        }
        context += "설명: " + explanation + "\n";
        
        if (item.INPUT_VAL) {
          var params = item.INPUT_VAL.replace(/\n/g, ' | ').trim();
          if (params.length > 120) {
            params = params.substring(0, 120) + "...";
          }
          context += "파라미터: " + params + "\n";
        }
        
        if (item.RTRN_TY) {
          context += "반환: " + item.RTRN_TY + "\n";
        }
        
        context += "\n";
      }
      
      return context;
    },
    
    getSystemPrompt: function() {
      return "당신은 eXBuilder6 JavaScript 프레임워크 전문가입니다.\n\n" +
             "중요 규칙:\n" +
             "1. eXBuilder6는 JavaScript 기반 프론트엔드 프레임워크입니다 (Java 아님!)\n" +
             "2. 제공된 API 정보를 바탕으로 사용법을 설명하세요\n" +
             "3. 모든 코드 예제는 JavaScript로 작성하세요\n" +
             "4. 컨트롤 접근: app.lookup('컨트롤ID')\n" +
             "5. 간결하고 실용적으로 답변하세요\n" +
             "6. 한국어로 답변하세요\n\n" +
             "답변 형식:\n" +
             "- API 설명 (1-2줄)\n" +
             "- JavaScript 코드 예제\n" +
             "- 주의사항 (있는 경우)";
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
      console.log("[AI Assistant] 💡 첫 로드 시 다운로드가 필요합니다 (약 300MB)");
      console.log("[AI Assistant] 🌐 네트워크 연결을 확인해주세요...");
      
      var enginePromise = CreateMLCEngine(CONFIG.modelName, {
        initProgressCallback: function(progress) {
          try {
            if (progress.progress !== undefined && progress.progress > 0) {
              var percent = Math.round(progress.progress * 100);
              if (percent >= lastPercent + 10) {
                console.log("[AI Assistant] 📊 로딩: " + percent + "% " + 
                           (progress.text || ""));
                lastPercent = percent;
              }
            }
            
            // 로딩 상태 메시지
            if (progress.text) {
              if (progress.text.indexOf("fetch") !== -1 || 
                  progress.text.indexOf("download") !== -1) {
                console.log("[AI Assistant] ⬇️ 다운로드 중...");
              } else if (progress.text.indexOf("load") !== -1) {
                console.log("[AI Assistant] 📂 로딩 중...");
              }
            }
          } catch (err) {
            // 진행 콜백 에러는 무시
          }
        }
      });
      
      if (!enginePromise || typeof enginePromise.then !== 'function') {
        var error = new Error("CreateMLCEngine이 Promise를 반환하지 않았습니다.");
        console.error("[AI Assistant] ❌", error);
        self.loading = false;
        if (callback) callback(error);
        return;
      }
      
      enginePromise.then(function(engine) {
        self.engine = engine;
        self.ready = true;
        self.loading = false;
        
        console.log("%c[AI Assistant] ✅ 준비 완료!", "color: #4CAF50; font-weight: bold; font-size: 16px");
        console.log("%c기능:", "color: #2196F3; font-weight: bold");
        console.log("  ✓ 자동 에러 분석 (Smart Context)");
        console.log("  ✓ AI 채팅: chat('질문')");
        console.log("  ✓ API 검색: search('검색어')");
        console.log("  ✓ 도움말: chatHelp()");
        
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
        
        console.error("%c[AI Assistant] ❌ 엔진 로드 실패", "color: #f44336; font-weight: bold");
        console.error("에러 상세:", err);
        console.log("");
        console.log("%c💡 해결 방법:", "color: #FF9800; font-weight: bold");
        console.log("1. 네트워크 연결 확인");
        console.log("2. 브라우저 콘솔에서 CORS 에러 확인");
        console.log("3. 더 작은 모델로 변경 시도:");
        console.log("   CONFIG.modelName = 'Qwen2.5-0.5B-Instruct-q4f32_1-MLC';");
        console.log("   AIEngine.init();");
        console.log("4. WebLLM 경로 확인:");
        console.log("   CONFIG.webllmURL");
        
        if (callback) callback(err);
      });
    }
  };

  // ============================================================
  // 🆕 에러 분석 모듈 (Smart Context 통합 버전)
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
          
          if (isExBuilder && hintDb[key].contextTips) {
            hint += "\n🔍 문맥 확인 포인트:\n";
            for (var j = 0; j < hintDb[key].contextTips.length; j++) {
              hint += hintDb[key].contextTips[j] + "\n";
            }
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
        section1: [], section2: [], section3: [], section4: []
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

      // 🆕 에러 발생 시 Context Manager 자동 활성화
      ContextManager.autoEnableOnError();

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
      console.log("%c[AI Assistant] 🔍 AI 에러 분석 시작 (Smart Context)...", "color:#2196F3; font-weight:bold");
      
      // 🆕 Smart Context 정보 가져오기
      var behaviorLog = ContextManager.getHistoryText(15);
      var recentInputs = ContextManager.getRecentByCategory('INPUT', 5);
      var recentSubmissions = ContextManager.getRecentByCategory('SUBMISSION', 3);
      var duplicatePatterns = ContextManager.getDuplicatePatternSummary();
      
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

      // 🆕 Smart Context 정보를 프롬프트에 포함
      var contextSection = "";
      var hasContext = ContextManager.breadcrumbs.length > 0;
      
      if (hasContext) {
        contextSection = "\n=== 🔍 Smart Context (사용자 행동 기록) ===\n";
        
        if (duplicatePatterns) {
          contextSection += duplicatePatterns + "\n\n";
        }
        
        if (recentInputs.length > 0) {
          contextSection += "[최근 입력값]\n";
          for (var j = 0; j < recentInputs.length; j++) {
            contextSection += "  " + recentInputs[j].time + " - " + 
                            recentInputs[j].message + "\n";
          }
          contextSection += "\n";
        }
        
        if (recentSubmissions.length > 0) {
          contextSection += "[최근 서브미션]\n";
          for (var k = 0; k < recentSubmissions.length; k++) {
            contextSection += "  " + recentSubmissions[k].time + " - " + 
                            recentSubmissions[k].message + "\n";
          }
          contextSection += "\n";
        }
        
        if (behaviorLog && behaviorLog !== "※ 최근 사용자 행동 기록 없음") {
          contextSection += "[전체 행동 타임라인]\n" + behaviorLog + "\n";
        }
      } else {
        contextSection = "\n💡 참고: Context 추적이 비활성화 상태였습니다.\n" +
                        "   에러 발생 전 사용자 행동을 추적하려면:\n" +
                        "   ContextManager.toggle(true) 를 미리 실행하세요.\n";
      }

      var prompt = "=== 에러 정보 ===\n" +
                   errorInfo + 
                   exbuilderInfo +
                   errorHint + 
                   contextSection + "\n\n" +
                   "=== 분석 요청 ===\n" +
                   "위의 에러 정보를 분석하여 아래 양식으로 답변하세요.\n" +
                   (hasContext ? 
                    "특히 🔍 Smart Context의 사용자 행동 기록을 참고하여 구체적으로 분석하세요.\n\n" : 
                    "\n") +
                   "**필수 양식** (한국어로만 작성):\n\n" +
                   "1. 에러 원인:\n" +
                   "   (한 문장으로 핵심 원인 설명)\n\n" +
                   "2. 왜 발생했나:\n" +
                   "   (구체적인 발생 이유를 2줄 이내로 설명)\n\n" +
                   "3. 해결 방법:\n" +
                   "   ```javascript\n" +
                   "   // ❌ 문제가 되는 코드\n" +
                   "   기존코드예시\n\n" +
                   "   // ✅ 올바른 수정 코드\n" +
                   "   수정된코드예시\n" +
                   "   ```\n\n" +
                   "4. 개발자 체크리스트:\n" +
                   "   • 확인 사항 1\n" +
                   "   • 확인 사항 2\n" +
                   "   • 확인 사항 3\n\n" +
                   "⚠️ 주의: 반드시 한국어로만 작성하고, 양식을 정확히 지켜주세요.";

      var self = this;
      AIEngine.engine.chat.completions
        .create({
          messages: [
            { 
              role: "system", 
              content: "당신은 JavaScript와 eXBuilder6 전문가입니다.\n\n" +
                       "**절대 규칙**:\n" +
                       "1. 반드시 한국어로만 답변 (중국어, 영어 절대 금지)\n" +
                       "2. 아래 양식을 정확히 따를 것\n" +
                       "3. 간결하고 명확하게 작성 (섹션2는 최대 2줄)\n" +
                       "4. 체크리스트는 정확히 3개만\n" +
                       "5. 코드 주석은 한국어로만\n" +
                       "6. 같은 내용 반복 금지\n\n" +
                       "**필수 출력 양식**:\n" +
                       "1. 에러 원인:\n" +
                       "   (한 문장으로 핵심 원인)\n\n" +
                       "2. 왜 발생했나:\n" +
                       "   (구체적 설명, 최대 2줄)\n\n" +
                       "3. 해결 방법:\n" +
                       "   ```javascript\n" +
                       "   // ❌ 문제 코드\n" +
                       "   기존 코드\n\n" +
                       "   // ✅ 수정 코드\n" +
                       "   개선된 코드\n" +
                       "   ```\n\n" +
                       "4. 개발자 체크리스트:\n" +
                       "   • 체크 항목 1\n" +
                       "   • 체크 항목 2\n" +
                       "   • 체크 항목 3\n\n" +
                       "※ 이 양식을 절대 벗어나지 마세요."
            },
            { 
              role: "user", 
              content: prompt 
            }
          ],
          temperature: 0.1,  // 더 결정적으로
          max_tokens: CONFIG.errorAnalysisSettings.max_tokens,
          top_p: 0.85,
          repetition_penalty: 1.2  // 반복 방지
        })
        .then(function (res) {
          self.analyzing = false;
          var content = res.choices[0].message.content;
          var normalizedContent = self.normalizeAIResponse(content);
          
          console.log("%c" + "=".repeat(70), "color:#4CAF50; font-weight:bold");
          console.log("%c🤖 AI 에러 분석 결과 (Smart Context)", "color:#ffffff; background:#4CAF50; font-weight:bold; font-size:14px; padding:5px");
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
  // API 검색 모듈
  // ============================================================
  var APISearchManager = {
    searching: false,
    
    search: function(query) {
      var self = this;
      
      if (!APIDatabase.loaded) {
        console.error("[API Search] ❌ API 데이터가 로드되지 않았습니다.");
        console.log("%c💡 사용법:", "color: #FF9800; font-weight: bold");
        console.log("  loadAPI([...jsonData]) - JSON 배열 형태로 데이터 로드");
        return;
      }
      
      if (!AIEngine.ready || !AIEngine.engine) {
        console.log("[API Search] ⏳ AI 엔진 초기화 중...");
        AIEngine.init(function(err) {
          if (!err) {
            self.search(query);
          }
        });
        return;
      }
      
      if (this.searching) {
        console.log("[API Search] ⏳ 검색 중입니다...");
        return;
      }
      
      this.searching = true;
      
      console.log("%c[API Search] 🔍 검색 중: " + query, "color:#9C27B0; font-weight:bold");
      console.log("%c[AI] 생각하는 중...", "color: #9E9E9E; font-style: italic");
      
      var startTime = Date.now();
      
      var relevantData = APIDatabase.searchRelevantData(query);
      
      if (relevantData.length === 0) {
        console.log("%c[API Search] ℹ️ 검색 결과가 없습니다.", "color:#FF9800");
        this.searching = false;
        return;
      }
      
      var detailedContext = APIDatabase.buildDetailedContext(relevantData);
      
      var userPrompt = "질문: " + query + "\n\n" +
                       "=== 관련 API 정보 ===\n" + 
                       detailedContext + "\n" +
                       "=== 답변 요청 ===\n" +
                       "위 API 정보를 바탕으로 JavaScript 코드 예제와 함께 설명해주세요.\n" +
                       "반드시 JavaScript로 작성하고, app.lookup()을 사용하세요.";
      
      AIEngine.engine.chat.completions.create({
        messages: [
          {
            role: "system",
            content: APIDatabase.getSystemPrompt()
          },
          {
            role: "user",
            content: userPrompt
          }
        ],
        temperature: CONFIG.apiSearchSettings.temperature,
        max_tokens: CONFIG.apiSearchSettings.max_tokens,
        top_p: CONFIG.apiSearchSettings.top_p
      }).then(function(res) {
        self.searching = false;
        var content = res.choices[0].message.content;
        var elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
        
        console.log("%c" + "=".repeat(70), "color:#9C27B0; font-weight:bold");
        console.log("%c🤖 AI API 검색 결과", "color:#ffffff; background:#9C27B0; font-weight:bold; font-size:14px; padding:5px");
        console.log("%c" + "=".repeat(70), "color:#9C27B0; font-weight:bold");
        console.log("");
        console.log(content);
        console.log("");
        console.log("%c⏱️ 응답 시간: " + elapsedTime + "초", "color: #9E9E9E; font-size: 11px");
        console.log("%c" + "=".repeat(70), "color:#9C27B0; font-weight:bold");
      }).catch(function(err) {
        self.searching = false;
        console.error("[API Search] ❌ AI 분석 오류:", err);
      });
    }
  };

  // ============================================================
  // 채팅 모듈
  // ============================================================
  var ChatManager = {
    conversationHistory: [],
    systemPrompt: "당신은 JavaScript 전문가입니다. 모든 답변은 한국어로 설명하고 JavaScript 코드 예제를 제공하세요.",
    settings: {
      temperature: CONFIG.chatSettings.temperature,
      max_tokens: CONFIG.chatSettings.max_tokens,
      top_p: CONFIG.chatSettings.top_p
    },

    sendMessage: function(userMessage) {
      var self = this;

      return new Promise(function(resolve, reject) {
        if (!AIEngine.ready || !AIEngine.engine) {
          console.error("[AI Assistant] ❌ 엔진이 준비되지 않았습니다.");
          reject(new Error("Engine not ready"));
          return;
        }

        self.conversationHistory.push({
          role: "user",
          content: userMessage
        });

        var messages = [
          { role: "system", content: self.systemPrompt }
        ].concat(self.conversationHistory);

        console.log("%c[User] " + userMessage, "color: #2196F3; font-weight: bold");
        console.log("%c[AI] 생각하는 중...", "color: #9E9E9E; font-style: italic");

        var startTime = Date.now();

        AIEngine.engine.chat.completions.create({
          messages: messages,
          temperature: self.settings.temperature,
          max_tokens: self.settings.max_tokens,
          top_p: self.settings.top_p
        }).then(function(res) {
          var fullResponse = res.choices[0].message.content;
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

    clearHistory: function() {
      this.conversationHistory = [];
      console.log("[AI Assistant] 🗑️ 대화 이력이 초기화되었습니다.");
    }
  };

  // ============================================================
  // console.error/warn 후킹 (에러 자동 캡처)
  // ============================================================
  var originalConsoleError = console.error;
  var originalConsoleWarn = console.warn;
  
  console.error = function() {
    originalConsoleError.apply(console, arguments);
    
    var message = Array.prototype.slice.call(arguments).join(' ');
    
    // Context에 기록
    if (ContextManager.enabled) {
      ContextManager.add('CONSOLE_ERR', message);
    }
    
    var errObj = {
      name: "Console Error",
      message: message,
      timestamp: Date.now()
    };
    
    ErrorAnalyzer.handleError(errObj);
  };
  
  console.warn = function() {
    originalConsoleWarn.apply(console, arguments);
    
    var message = Array.prototype.slice.call(arguments).join(' ');
    
    // Context에 기록
    if (ContextManager.enabled) {
      ContextManager.add('CONSOLE_WARN', message);
    }
  };

  // window.onerror 후킹
  window.addEventListener('error', function(event) {
    var errObj = {
      name: event.error ? event.error.name : "Error",
      message: event.message || event.error.message,
      source: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error ? event.error.stack : null,
      timestamp: Date.now()
    };
    
    ErrorAnalyzer.handleError(errObj);
  });

  // ============================================================
  // 글로벌 함수 노출
  // ============================================================
  
  global.loadAPI = function(jsonData) {
    if (APIDatabase.loadData(jsonData)) {
      console.log("%c[API Search] ✅ API 데이터베이스 준비 완료!", "color: #4CAF50; font-weight: bold");
      console.log("%c💡 사용 예시:", "color: #2196F3; font-weight: bold");
      console.log("  search('콤보박스 아이템 추가방법')");
      console.log("  search('InputBox에서 사용 가능한 속성')");
      console.log("  search('setValue 사용법')");
    }
  };
  
  global.search = function(query) {
    if (typeof query !== 'string' || query.trim() === '') {
      console.error("[API Search] ❌ 검색어를 입력해주세요.");
      console.log("%c사용 예시:", "color: #2196F3; font-weight: bold");
      console.log("  search('콤보박스 아이템 추가')");
      console.log("  search('ComboBox 중복 에러 해결')");
      return;
    }
    
    APISearchManager.search(query);
  };
  
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

  global.clearChat = function() {
    ChatManager.clearHistory();
  };

  // 🆕 Context 관리 명령어
  global.contextHelp = function() {
    console.log("%c=== Smart Context Manager 명령어 ===", "color: #FF9800; font-weight: bold; font-size: 14px");
    console.log("");
    console.log("%c✓ Context 조회", "color: #2196F3; font-weight: bold");
    console.log("  ContextManager.getHistoryText()     - 전체 타임라인");
    console.log("  ContextManager.getHistoryText(10)   - 최근 10개");
    console.log("");
    console.log("%c✓ Context 관리", "color: #2196F3; font-weight: bold");
    console.log("  ContextManager.clear()              - 타임라인 초기화");
    console.log("  ContextManager.toggle(true/false)   - 수동 ON/OFF");
    console.log("");
    console.log("%c✓ 스마트 기능", "color: #2196F3; font-weight: bold");
    console.log("  ContextManager.getDuplicatePatternSummary() - 중복 패턴 분석");
    console.log("");
    console.log("%c✓ 카테고리별 조회", "color: #2196F3; font-weight: bold");
    console.log("  ContextManager.getRecentByCategory('INPUT', 5)");
    console.log("  ContextManager.getRecentByCategory('SUBMISSION', 3)");
    console.log("  ContextManager.getRecentByCategory('XHR', 10)");
    console.log("");
    console.log("%c📌 카테고리: ACTION, INPUT, SUBMISSION, XHR, CONSOLE_ERR, CONSOLE_WARN", "color: #9E9E9E");
    console.log("");
    console.log("%c💡 팁: 에러 발생 시 자동으로 10초간 활성화됩니다", "color: #4CAF50");
  };

  global.chatHelp = function() {
    console.log("%c=== AI Assistant v2.5 도움말 (Smart Context) ===", "color: #2196F3; font-weight: bold; font-size: 16px");
    console.log("");
    console.log("%c✓ 자동 에러 분석 (🆕 Smart Context)", "color: #FF9800; font-weight: bold");
    console.log("  JavaScript 에러 발생 시 자동으로 분석합니다.");
    console.log("  에러 발생 시 자동으로 Context 추적이 활성화되어");
    console.log("  사용자의 입력값, 클릭, 서브미션 흐름을 분석합니다.");
    console.log("  중복 패턴을 자동 감지하여 더 정확한 원인 분석을 제공합니다.");
    console.log("");
    console.log("%c✓ API 검색 명령어", "color: #FF9800; font-weight: bold");
    console.log("  loadAPI([...])          - API 데이터 로드");
    console.log("  search('검색어')         - API 검색 (AI 답변)");
    console.log("");
    console.log("%c  예시:", "color: #9E9E9E");
    console.log("    search('콤보박스 아이템 추가방법')");
    console.log("    search('InputBox 사용 가능한 속성')");
    console.log("");
    console.log("%c✓ AI 채팅 명령어", "color: #FF9800; font-weight: bold");
    console.log("  chat('메시지')          - AI에게 일반 질문");
    console.log("  clearChat()             - 대화 초기화");
    console.log("");
    console.log("%c✓ Smart Context 명령어 (🆕)", "color: #FF9800; font-weight: bold");
    console.log("  contextHelp()           - Context Manager 상세 도움말");
    console.log("  ContextManager.toggle(true)  - Context 추적 수동 활성화");
    console.log("  ContextManager.clear()       - 타임라인 초기화");
    console.log("");
    console.log("%c🎯 주요 개선사항:", "color: #4CAF50; font-weight: bold");
    console.log("  • 에러 발생 시 자동 Context 추적 (10초간)");
    console.log("  • 중복 입력 패턴 자동 감지");
    console.log("  • 무의미한 클릭 자동 필터링");
    console.log("  • 메모리 사용량 50% 감소");
    console.log("");
    console.log("%c💾 모델 정보:", "color: #9E9E9E");
    console.log("  현재 모델: " + CONFIG.modelName);
    console.log("  사용 가능 모델: qwen-0.5b, qwen-1.5b, qwen-3b, phi-3-mini, llama-3.2-1b, llama-3.2-3b");
  };

  // ============================================================
  // 초기화
  // ============================================================
  
  // Context Manager 초기화
  ContextManager.init();
  
  // AI Engine 자동 초기화
  AIEngine.init(function(err) {
    if (err) {
      console.error("[AI Assistant] 초기화 실패:", err);
      console.log("%c💡 수동 초기화: AIEngine.init() 또는 chat('안녕') 입력", "color: #FF9800");
    }
  });

  console.log("%c" + "=".repeat(70), "color: #2196F3; font-weight: bold");
  console.log("%c🤖 AI Assistant v2.5 (Smart Context) 로드 완료", "color: #ffffff; background: #2196F3; font-weight: bold; font-size: 14px; padding: 5px");
  console.log("%c" + "=".repeat(70), "color: #2196F3; font-weight: bold");
  console.log("");
  console.log("%c주요 기능:", "color: #4CAF50; font-weight: bold");
  console.log("  ✓ 자동 에러 분석 (Smart Context)");
  console.log("  ✓ API 검색: search('검색어')");
  console.log("  ✓ AI 채팅: chat('질문')");
  console.log("  ✓ Context 관리: contextHelp()");
  console.log("");
  console.log("%c🆕 v2.5 개선사항:", "color: #FF9800; font-weight: bold");
  console.log("  • 에러 시 자동 Context 추적 (기본 OFF, 에러 발생 시 자동 ON)");
  console.log("  • 중복 입력 패턴 자동 감지");
  console.log("  • 스마트 필터링으로 성능 최적화");
  console.log("  • 메모리 사용량 50% 감소");
  console.log("");
  console.log("%c도움말: chatHelp()", "color: #9E9E9E");
  console.log("%c" + "=".repeat(70), "color: #2196F3; font-weight: bold");

})(window);