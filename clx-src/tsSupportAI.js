/**
 * 통합 AI Assistant - 에러 자동 분석 + 콘솔 채팅 + API 검색
 * 
 * 주요 기능:
 * 1. 자동 에러 감지 및 AI 분석
 * 2. 콘솔에서 AI와 자유롭게 대화
 * 3. 확장된 에러 힌트 데이터베이스
 * 4. eXBuilder6 API 검색 도우미 (Web-LLM 기반)
 */

(function (global) {
  "use strict";

  // ============================================================
  // 설정
  // ============================================================
  var CONFIG = {
    modelName: "Qwen2.5-0.5B-Instruct-q4f32_1-MLC",
    
    availableModels: {
      "qwen-0.5b": "Qwen2.5-0.5B-Instruct-q4f32_1-MLC",
      "qwen-1.5b": "Qwen2.5-1.5B-Instruct-q4f32_1-MLC",
      "qwen-3b":   "Qwen2.5-3B-Instruct-q4f32_1-MLC",
      "phi-3-mini": "Phi-3-mini-4k-instruct-q4f32_1-MLC",
      "llama-3.2-1b": "Llama-3.2-1B-Instruct-q4f32_1-MLC",
      "llama-3.2-3b": "Llama-3.2-3B-Instruct-q4f32_1-MLC"
    },
    
    webllmURL: "../ui/web-llm/web-llm.min.js",
    
    errorAnalysisSettings: {
      temperature: 0.1,
      max_tokens: 500,
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
  // API 데이터베이스 관리자
  // ============================================================
  var APIDatabase = {
    data: [],
    loaded: false,
    summaryContext: "",
    
    // 한글-영어 컨트롤 매핑 (확장)
    controlNameMapping: {
      // 원본 매핑
      '인풋박스': 'inputbox',
      '입력박스': 'inputbox',
      '콤보박스': 'combobox',
      '리스트박스': 'listbox',
      '버튼': 'button',
      '그리드': 'grid',
      '캘린더': 'calendar',
      '데이트인풋': 'dateinput',
      '체크박스': 'checkbox',
      '라디오버튼': 'radiobutton',
      '텍스트에리어': 'textarea',
      
      // 확장 매핑 (요구사항 반영)
      '스니펫': 'htmlsnippet',
      'mdi': 'mdifolder',
      '그룹': 'group',
      '넘버에디터': 'numbereditor',
      '내비게이션바': 'navigationbar',
      '내비게이션': 'navigationbar',
      '라디오': 'radiobutton',
      '리스트': 'listbox',
      '링크드리스트박스': 'linkedlistbox',
      '링크드콤보박스': 'linkedcombobox',
      '마스크에디터': 'maskeditor',
      '메뉴': 'menu',
      '비디오': 'video',
      '사이드내비게이션': 'sidenavigation',
      '서치인풋': 'searchinput',
      '쉘': 'shell',
      '슬라이더': 'slider',
      '아웃풋': 'output',
      '아코디언': 'accordion',
      '알림': 'notification',
      '오디오': 'audio',
      '이미지': 'image',
      '임베디드앱': 'embeddedapp',
      '임베디드페이지': 'embeddedpage',
      '체크박스그룹': 'checkboxgroup',
      '탭폴더': 'tabfolder',
      '트리': 'tree',
      '파일업로더': 'fileupload',
      '파일인풋': 'fileinput',
      '페이지인덱서': 'pageindexer',
      '페이지': 'pageindexer',
      '프로그레스': 'progress',
      '트리셀': 'treecell',
      
      // API 관련 용어
      '속성': 'property',
      '함수': 'api',
      '메서드': 'api',
      '이벤트': 'event',
      '추가': 'add',
      '아이템': 'item',
      '추가방법': 'additem',
      '아이템추가': 'additem'
    },
    
    // API 데이터 로드
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
    
    // 전체 API 요약 컨텍스트 생성 (Web-LLM이 이해할 수 있는 형태) - 간결 버전
    buildSummaryContext: function() {
      var controlGroups = {};
      
      // 컨트롤별로 그룹화
      for (var i = 0; i < this.data.length; i++) {
        var item = this.data[i];
        var ctrl = item.CTRL_RCD;
        
        if (!controlGroups[ctrl]) {
          controlGroups[ctrl] = {
            apis: [],
            properties: []
          };
        }
        
        var info = {
          name: item.PRO_NM_RCD,
          type: item.CAT_RCD
        };
        
        if (item.CAT_RCD === 'API') {
          controlGroups[ctrl].apis.push(info.name);
        } else {
          controlGroups[ctrl].properties.push(info.name);
        }
      }
      
      // 매우 간결한 요약 컨텍스트 생성 (토큰 절약)
      var summary = "eXBuilder6 컨트롤 목록:\n";
      var controlList = [];
      
      for (var control in controlGroups) {
        controlList.push(control);
      }
      
      summary += controlList.join(", ") + "\n";
      
      this.summaryContext = summary;
    },
    
    // 한글 키워드를 영어로 변환
    translateKeywords: function(keywords) {
      var translatedKeywords = [];
      
      for (var i = 0; i < keywords.length; i++) {
        var keyword = keywords[i].toLowerCase();
        translatedKeywords.push(keyword);
        
        // 직접 매핑 확인
        if (this.controlNameMapping[keyword]) {
          translatedKeywords.push(this.controlNameMapping[keyword]);
        }
        
        // 부분 매핑 확인 (예: "콤보박스아이템" -> "combobox", "item")
        for (var korKey in this.controlNameMapping) {
          if (keyword.indexOf(korKey) !== -1) {
            translatedKeywords.push(this.controlNameMapping[korKey]);
          }
        }
      }
      
      return translatedKeywords;
    },
    
    // 키워드로 관련 데이터 검색 (개선된 버전)
    searchRelevantData: function(query) {
      var keywords = query.toLowerCase().split(/\s+/);
      
      // 한글 키워드를 영어로 변환
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
          
          // 정확히 일치하는 경우 매우 높은 점수
          if (apiName === keyword) {
            score += 200;
          }
          if (ctrlName === keyword) {
            score += 150;
          }
          
          // API 이름에 키워드 포함 (높은 우선순위)
          if (apiName.indexOf(keyword) !== -1) {
            score += 100;
          }
          
          // 컨트롤 이름에 키워드 포함
          if (ctrlName.indexOf(keyword) !== -1) {
            score += 80;
          }
          
          // 카테고리 매칭
          if (category.indexOf(keyword) !== -1) {
            score += 50;
          }
          
          // 설명에 키워드 포함
          if (explanation.indexOf(keyword) !== -1) {
            score += 10;
          }
        }
        
        // 특정 조합 보너스 점수
        // 예: "콤보박스" + "추가" + "아이템" 조합
        var hasControl = false;
        var hasAction = false;
        var hasTarget = false;
        
        for (var k = 0; k < translatedKeywords.length; k++) {
          var kw = translatedKeywords[k];
          if (ctrlName.indexOf(kw) !== -1) hasControl = true;
          if (kw === 'add' || kw === 'additem' || kw === '추가') hasAction = true;
          if (kw === 'item' || kw === 'additem' || kw === '아이템') hasTarget = true;
        }
        
        if (hasControl && hasAction && hasTarget && apiName.indexOf('additem') !== -1) {
          score += 300; // 매우 높은 보너스
        }
        
        if (score > 0) {
          results.push({
            item: item,
            score: score
          });
        }
      }
      
      // 점수순으로 정렬
      results.sort(function(a, b) {
        return b.score - a.score;
      });
      
      // 디버그 로그 (개발 중에만 사용)
      if (results.length > 0) {
        console.log("[API Search] 검색 결과 상위 3개:");
        for (var idx = 0; idx < Math.min(3, results.length); idx++) {
          console.log("  " + (idx+1) + ". " + results[idx].item.CTRL_RCD + "." + 
                     results[idx].item.PRO_NM_RCD + " (점수: " + results[idx].score + ")");
        }
      }
      
      // 상위 10개로 증가 (더 많은 정보 제공)
      return results.slice(0, 10).map(function(r) { return r.item; });
    },
    
    // 검색 결과를 상세 컨텍스트로 변환 (간결 버전)
    buildDetailedContext: function(results) {
      if (results.length === 0) {
        return "검색 결과가 없습니다.";
      }
      
      var context = "";
      
      for (var i = 0; i < results.length; i++) {
        var item = results[i];
        context += "【" + item.CTRL_RCD + "." + item.PRO_NM_RCD + "】\n";
        context += "타입: " + item.CAT_RCD + "\n";
        
        // 설명을 200자로 제한
        var explanation = (item.EXPL || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
        if (explanation.length > 200) {
          explanation = explanation.substring(0, 200) + "...";
        }
        context += "설명: " + explanation + "\n";
        
        // 파라미터 정보 간결화
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
             "- 주의사항 (있는 경우)\n\n" +
             "예시:\n" +
             "ComboBox의 addItem은 콤보박스에 아이템을 추가합니다.\n" +
             "```javascript\n" +
             "var combo = app.lookup('cmbTest');\n" +
             "combo.addItem(new cpr.controls.Item('표시값', '실제값'));\n" +
             "```";
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

      var prompt = "=== 에러 정보 ===\n" +
                   errorInfo + 
                   exbuilderInfo +
                   errorHint + "\n\n" +
                   "=== 분석 지침 ===\n" +
                   "위의 에러 정보와 💡 힌트를 참고하여 아래 양식으로 분석하세요.\n\n" +
                   "1. 에러 원인:\n" +
                   "   (한 문장으로 핵심 원인)\n\n" +
                   "2. 왜 발생했나:\n" +
                   (errorHint ? "   (위 💡 일반적 원인을 바탕으로 2줄 이내로 구체적 설명)\n\n" : "   (2줄 이내로 설명)\n\n") +
                   "3. 해결 방법:\n" +
                   "   ```javascript\n" +
                   "   // ❌ 문제 코드 (예상되는 오류 원인)\n" +
                   "   \n" +
                   "   // ✅ 수정 코드 (올바른 방법)\n" +
                   "   ```\n\n" +
                   "4. 개발자 체크리스트:\n" +
                   "   • (확인할 사항 1)\n" +
                   "   • (확인할 사항 2)\n" +
                   "   • (확인할 사항 3)\n\n" +
                   "⚠️ 중요: 체크리스트는 정확히 3개만 작성. 같은 내용 반복 금지.";

      var self = this;
      AIEngine.engine.chat.completions
        .create({
          messages: [
            { 
              role: "system", 
              content: "당신은 JavaScript와 eXBuilder6 전문가입니다.\n\n" +
                       "**중요 규칙**:\n" +
                       "1. 반드시 아래 양식 그대로 작성\n" +
                       "2. 💡 힌트가 제공되면 이를 적극 활용하여 '왜 발생했나' 섹션 작성\n" +
                       "3. 각 섹션은 간결하게 (섹션2는 2줄 이내)\n" +
                       "4. 체크리스트는 정확히 3개 항목만\n" +
                       "5. 같은 내용 반복 절대 금지\n" +
                       "6. 한국어로만 작성\n\n" +
                       "출력 양식:\n" +
                       "1. 에러 원인:\n   (1줄)\n\n" +
                       "2. 왜 발생했나:\n   (2줄, 💡 힌트 활용)\n\n" +
                       "3. 해결 방법:\n   ```javascript\n   코드\n   ```\n\n" +
                       "4. 개발자 체크리스트:\n   • 항목1\n   • 항목2\n   • 항목3"
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
  // API 검색 모듈 (Web-LLM 기반)
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
      
      // 관련 데이터 검색
      var relevantData = APIDatabase.searchRelevantData(query);
      
      if (relevantData.length === 0) {
        console.log("%c[API Search] ℹ️ 검색 결과가 없습니다.", "color:#FF9800");
        this.searching = false;
        return;
      }
      
      var detailedContext = APIDatabase.buildDetailedContext(relevantData);
      
      // Web-LLM에게 질문 (명확한 프롬프트)
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
  // 글로벌 함수 노출
  // ============================================================
  
  // API 데이터 로드
  global.loadAPI = function(jsonData) {
    if (APIDatabase.loadData(jsonData)) {
      console.log("%c[API Search] ✅ API 데이터베이스 준비 완료!", "color: #4CAF50; font-weight: bold");
      console.log("%c💡 사용 예시:", "color: #2196F3; font-weight: bold");
      console.log("  search('콤보박스 아이템 추가방법')");
      console.log("  search('InputBox에서 사용 가능한 속성')");
      console.log("  search('setValue 사용법')");
    }
  };
  
  // API 검색 (Web-LLM이 직접 답변)
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
  
  // AI 채팅
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

  global.chatHelp = function() {
    console.log("%c=== AI Assistant 도움말 ===", "color: #2196F3; font-weight: bold; font-size: 16px");
    console.log("");
    console.log("%c✓ 자동 에러 분석", "color: #FF9800; font-weight: bold");
    console.log("  JavaScript 에러 발생 시 자동으로 분석합니다.");
    console.log("");
    console.log("%c✓ API 검색 명령어 (Web-LLM 기반)", "color: #FF9800; font-weight: bold");
    console.log("  loadAPI([...])          - API 데이터 로드");
    console.log("  search('검색어')         - API 검색 (AI가 답변)");
    console.log("");
    console.log("%c  예시:", "color: #9E9E9E");
    console.log("    search('콤보박스 아이템 추가방법')");
    console.log("    search('InputBox에서 사용 가능한 속성')");
    console.log("    search('setValue와 getValue 차이')");
    console.log("");
    console.log("%c✓ AI 채팅 명령어", "color: #FF9800; font-weight: bold");
    console.log("  chat('메시지')          - AI에게 일반 질문");
    console.log("  clearChat()             - 대화 초기화");
    console.log("  chatHelp()              - 도움말");
    console.log("");
    console.log("%c  예시:", "color: #9E9E9E");
    console.log("    chat('JavaScript 배열 정렬 방법')");
    console.log("    chat('async/await 사용법')");
    console.log("");
  };

  // ============================================================
  // 에러 후킹
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

  var originalConsoleError = console.error;
  var originalConsoleWarn = console.warn;
  
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
  // API 데이터 자동 로드
  // ============================================================
  function loadAPIDataFromFile() {
    var dataPath = "../ui/web-llm/data.json";
    
    fetch(dataPath)
      .then(function(response) {
        if (!response.ok) {
          throw new Error("data.json 로드 실패: HTTP " + response.status);
        }
        return response.text();
      })
      .then(function(text) {
        try {
          var jsonData = JSON.parse(text);
          
          if (APIDatabase.loadData(jsonData)) {
            console.log("%c[API Search] ✅ data.json 자동 로드 완료!", "color: #4CAF50; font-weight: bold");
            console.log("💡 search('검색어') 명령어로 API를 검색하세요!");
          }
        } catch (parseError) {
          console.error("[API Search] ❌ JSON 파싱 실패:", parseError.message);
          console.log("%c[API Search] data.json 파일 형식 확인이 필요합니다:", "color: #FF9800; font-weight: bold");
          console.log("1. 파일이 유효한 JSON 배열인지 확인");
          console.log("2. 주석이나 trailing comma가 없는지 확인");
          console.log("3. 파일 인코딩이 UTF-8인지 확인");
          console.log("");
          console.log("파일 내용 미리보기 (첫 200자):");
          console.log(text.substring(0, 200));
          console.log("");
          console.log("%c💡 해결 방법:", "color: #2196F3; font-weight: bold");
          console.log("• JSON 유효성 검사: https://jsonlint.com");
          console.log("• 수동 로드: loadAPI([...jsonData])");
        }
      })
      .catch(function(err) {
        console.warn("[API Search] ⚠️ data.json 로드 실패:", err.message);
        console.log("%c💡 해결 방법:", "color: #2196F3; font-weight: bold");
        console.log("1. 파일 경로 확인: ../ui/web-llm/data.json");
        console.log("2. 파일 존재 여부 확인");
        console.log("3. 수동 로드: loadAPI([...jsonData])");
      });
  }

  // ============================================================
  // 자동 초기화
  // ============================================================
  
  console.log("%c[AI Assistant] 📚 통합 AI Assistant 로드 완료", "color: #2196F3; font-weight: bold");
  console.log("💡 chatHelp() 명령어로 사용법을 확인하세요!");
  
  installErrorHandler();
  
  // API 데이터 자동 로드 시작
  loadAPIDataFromFile();
  
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
  global.APIDatabase = APIDatabase;
  global.APISearchManager = APISearchManager;

})(window);