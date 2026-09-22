/**
 * 통합 AI Assistant - 에러 자동 분석 + 콘솔 채팅 + API 검색 (WebLLM 기반, 브라우저 내 실행)
 *
 * 구성
 *  1. CONFIG            : 설정 (window.AI_ASSISTANT_CONFIG 로 덮어쓰기 가능)
 *  2. Util              : 로그/경로/스토리지/BoundedMap 유틸
 *  3. Models            : 모델 프리셋, GPU 에 맞는 변형 선택, 폴백 체인
 *  4. AIEngine          : WebLLM 로드, Web Worker 엔진 생성, 요청 직렬화, 모델 교체
 *  5. SourceInspector   : 스택에서 사용자 코드 위치를 찾아 실제 소스 코드 조각을 수집
 *  6. ErrorCollector    : 여러 경로의 에러를 하나의 형태(info)로 정규화
 *  7. ErrorAnalyzer     : 중복/반복 처리, 대기열, 프롬프트 구성, 결과 출력
 *  8. ChatManager       : 콘솔 채팅
 *  9. APIDatabase/APISearchManager : eXBuilder6 API 검색
 * 10. Hooks             : eXBuilder Platform.onerror / window / console 후킹
 * 11. 공개 API          : AISupport.*, chat(), search(), loadAPI(), chatHelp() ...
 *
 * eXBuilder6 에서는 이벤트 리스너 안의 에러를 런타임이 try-catch 로 삼킨 뒤
 * console.log("%c...", "color: red") 로 출력하기 때문에 console.error 후킹만으로는 잡히지 않는다.
 * 그래서 런타임의 공식 전역 에러 훅(cpr.core.Platform.INSTANCE.onerror)을 1차 수집 경로로 사용한다.
 */
(function (global) {
  "use strict";

  if (global.AISupport && global.AISupport.__loaded) {
    return; // 중복 로드 방지
  }

  // ============================================================
  // 1. 설정
  // ============================================================
  var CONFIG = {
    // 모델 프리셋 키 (Models.presets 참고). AISupport.setModel('키') 로 변경하면 브라우저에 저장됨
    model: "qwen3-4b",
    // 기본 모델 로드 실패(GPU 메모리 부족 등) 시 순서대로 시도할 모델
    fallbackModels: ["qwen3-1.7b", "qwen3-0.6b"],
    // 프리셋 대신 WebLLM model_id 를 직접 지정할 때 사용 (예: "Qwen2.5-7B-Instruct-q4f16_1-MLC")
    modelId: null,

    // WebLLM 경로 (이 스크립트 위치 기준). webllmURL 을 지정하면 최우선으로 시도
    webllmURL: null,
    webllmDir: "web-llm/",
    webllmFile: "web-llm.min.js",
    workerFile: "worker.js",
    dataFile: "data.json",
    // 로컬 파일 로드 실패 시 마지막으로 시도할 CDN (폐쇄망이면 null)
    webllmCDN: "https://esm.run/@mlc-ai/web-llm",
    // 모델 추론을 Web Worker 에서 실행 (UI 멈춤 방지). 실패 시 메인 스레드로 자동 전환
    useWebWorker: true,
    // 모델 미리 로드: true = 페이지가 한가할 때(idle) 로드, false = 첫 에러/채팅 시점에 로드
    preload: true,

    // 에러 수집/분석
    captureConsole: true,        // console.error / console.warn 도 수집
    fetchSourceSnippet: true,    // 에러 위치의 실제 소스 코드를 가져와 AI 에게 전달
    snippetRadius: 3,            // 에러 줄 앞뒤로 포함할 줄 수
    maxQueue: 10,                // 분석 대기열 최대 크기
    maxRecords: 100,             // 기억할 에러 종류 수 (초과 시 오래된 것부터 삭제)
    duplicateWindowMs: 1000,     // 같은 에러가 여러 경로로 동시에 들어올 때 무시하는 시간
    repeatSummaryMs: 60000,      // 반복 에러의 분석 결과를 다시 보여주는 최소 간격
    maxPromptChars: 6000,        // 프롬프트 길이 상한 (모델 컨텍스트 4K 토큰 보호)

    errorAnalysisSettings: { temperature: 0.2, max_tokens: 700, top_p: 0.9 },
    chatSettings:          { temperature: 0.5, max_tokens: 900, top_p: 0.9 },
    apiSearchSettings:     { temperature: 0.2, max_tokens: 900, top_p: 0.9 }
  };

  var userConfig = global.AI_ASSISTANT_CONFIG || {};
  for (var cfgKey in userConfig) {
    if (Object.prototype.hasOwnProperty.call(userConfig, cfgKey)) {
      CONFIG[cfgKey] = userConfig[cfgKey];
    }
  }

  // ============================================================
  // 2. 유틸
  // ============================================================
  // 원본 console 을 보관해 두고 자체 로그는 원본으로 출력 → 후킹된 console 에 다시 잡히지 않음
  var nativeConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    group: console.group || console.log,
    groupEnd: console.groupEnd || function () {}
  };

  var TAG = "[AI Assistant]";
  var STYLE = {
    title:   "color:#2196F3; font-weight:bold",
    success: "color:#4CAF50; font-weight:bold",
    muted:   "color:#9E9E9E; font-size:11px",
    error:   "color:#fff; background:#ff6600; font-weight:bold; padding:2px 6px",
    result:  "color:#fff; background:#4CAF50; font-weight:bold; padding:2px 6px",
    search:  "color:#fff; background:#9C27B0; font-weight:bold; padding:2px 6px"
  };

  function toArray(args) {
    return Array.prototype.slice.call(args);
  }

  var Log = {
    info: function () { nativeConsole.log.apply(console, [TAG].concat(toArray(arguments))); },
    warn: function () { nativeConsole.warn.apply(console, [TAG].concat(toArray(arguments))); },
    error: function () { nativeConsole.error.apply(console, [TAG].concat(toArray(arguments))); },
    styled: function (text, style) { nativeConsole.log.call(console, "%c" + text, style); },
    plain: function () { nativeConsole.log.apply(console, arguments); },
    elapsed: function (startedAt, suffix) {
      this.styled("⏱️ " + ((Date.now() - startedAt) / 1000).toFixed(1) + "초" + (suffix ? " · " + suffix : ""), STYLE.muted);
    },
    // 제목 + 본문을 접을 수 있는 그룹으로 출력
    block: function (title, style, body) {
      nativeConsole.group.call(console, "%c" + title, style);
      try { body(); } finally { nativeConsole.groupEnd.call(console); }
    }
  };

  function errMsg(err) {
    return err && err.message ? err.message : String(err);
  }

  function truncate(text, max) {
    text = String(text == null ? "" : text);
    return text.length > max ? text.substring(0, max) + "…" : text;
  }

  // Qwen3 등 추론 모델의 <think> 블록 제거
  function cleanModelOutput(text) {
    return String(text || "").replace(/<think>[\s\S]*?<\/think>/g, "").replace(/^\s+|\s+$/g, "");
  }

  function withTimeout(promise, ms) {
    return new Promise(function (resolve, reject) {
      var timer = setTimeout(function () { reject(new Error("timeout")); }, ms);
      promise.then(function (v) { clearTimeout(timer); resolve(v); },
                   function (e) { clearTimeout(timer); reject(e); });
    });
  }

  var SCRIPT_URL = (function () {
    var cs = document.currentScript;
    if (cs && cs.src) return cs.src;
    var scripts = document.getElementsByTagName("script");
    for (var i = scripts.length - 1; i >= 0; i--) {
      if (/tsSupportAI[^\/]*\.js/.test(scripts[i].src)) return scripts[i].src;
    }
    return document.baseURI;
  })();

  function resolveURL(path) {
    return new URL(path, SCRIPT_URL).href;
  }

  var Store = {
    get: function (key) {
      try { return global.localStorage.getItem("aiAssistant." + key); } catch (e) { return null; }
    },
    set: function (key, value) {
      try {
        if (value == null) global.localStorage.removeItem("aiAssistant." + key);
        else global.localStorage.setItem("aiAssistant." + key, value);
      } catch (e) {}
    }
  };

  // 크기가 제한된 맵 (삽입 순서대로 오래된 항목 제거) - 장시간 사용 시 메모리 증가 방지
  function BoundedMap(limit) {
    this.limit = limit;
    this.map = Object.create(null);
    this.order = [];
  }
  BoundedMap.prototype.get = function (key) { return this.map[key]; };
  BoundedMap.prototype.set = function (key, value) {
    if (!(key in this.map)) {
      this.order.push(key);
      if (this.order.length > this.limit) delete this.map[this.order.shift()];
    }
    this.map[key] = value;
  };
  BoundedMap.prototype.remove = function (key) {
    if (key in this.map) {
      delete this.map[key];
      this.order.splice(this.order.indexOf(key), 1);
    }
  };
  BoundedMap.prototype.size = function () { return this.order.length; };

  var dynamicImport = null;
  try {
    // ES5 스크립트에서 import() 를 쓰기 위해 Function 으로 감싼다 (URL 은 항상 절대경로)
    dynamicImport = new Function("url", "return import(url);");
  } catch (e) {
    dynamicImport = null;
  }

  // ============================================================
  // 3. 모델 프리셋
  // ============================================================
  var Models = {
    // f16: shader-f16 지원 GPU 용(더 작고 빠름), f32: 미지원 GPU 용
    presets: {
      "qwen3-0.6b":       { f16: "Qwen3-0.6B-q4f16_1-MLC", f32: "Qwen3-0.6B-q4f32_1-MLC", desc: "가장 가벼움 (VRAM ~1.4GB)" },
      "qwen3-1.7b":       { f16: "Qwen3-1.7B-q4f16_1-MLC", f32: "Qwen3-1.7B-q4f32_1-MLC", desc: "경량 · 저사양 PC 용 (VRAM ~2GB)" },
      "qwen3-4b":         { f16: "Qwen3-4B-q4f16_1-MLC",   f32: "Qwen3-4B-q4f32_1-MLC",   desc: "권장 기본값 · 한국어/코드 품질 (VRAM ~3.4GB)" },
      "qwen3-8b":         { f16: "Qwen3-8B-q4f16_1-MLC",   f32: "Qwen3-8B-q4f32_1-MLC",   desc: "최고 품질, 고사양 GPU (VRAM ~5.7GB)" },
      "qwen2.5-coder-3b": { f16: "Qwen2.5-Coder-3B-Instruct-q4f16_1-MLC", f32: "Qwen2.5-Coder-3B-Instruct-q4f32_1-MLC", desc: "코드 특화 (VRAM ~2.5GB)" },
      "qwen2.5-1.5b":     { f16: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC", f32: "Qwen2.5-1.5B-Instruct-q4f32_1-MLC", desc: "이전 세대 경량 모델" },
      "qwen2.5-0.5b":     { f16: "Qwen2.5-0.5B-Instruct-q4f16_1-MLC", f32: "Qwen2.5-0.5B-Instruct-q4f32_1-MLC", desc: "최초 버전 기본값 (품질 낮음)" },
      "llama-3.2-3b":     { f16: "Llama-3.2-3B-Instruct-q4f16_1-MLC", f32: "Llama-3.2-3B-Instruct-q4f32_1-MLC", desc: "영어 위주" }
    },
    supportsF16: false,

    currentKey: function () {
      var saved = Store.get("model");
      return (saved && this.presets[saved]) ? saved : CONFIG.model;
    },

    toModelId: function (key) {
      var preset = this.presets[key];
      if (!preset) return key; // model_id 를 직접 넘긴 경우
      return this.supportsF16 ? preset.f16 : preset.f32;
    },

    // 시도할 모델 순서: 선택 모델 → 폴백 모델들 (중복 제거)
    candidates: function () {
      var ids = [CONFIG.modelId || this.toModelId(this.currentKey())];
      for (var i = 0; i < CONFIG.fallbackModels.length; i++) {
        var id = this.toModelId(CONFIG.fallbackModels[i]);
        if (ids.indexOf(id) === -1) ids.push(id);
      }
      return ids;
    },

    // Qwen3 는 기본적으로 <think> 추론을 길게 하므로 끈다 (다른 모델에 넘기면 오히려 프롬프트가 오염됨)
    requestExtras: function (modelId) {
      return /^Qwen3-/.test(modelId || "") ? { extra_body: { enable_thinking: false } } : null;
    },

    list: function () {
      var current = this.currentKey();
      Log.styled("사용 가능한 모델 (AISupport.setModel('키'))", STYLE.title);
      for (var key in this.presets) {
        Log.plain((key === current ? "  ▶ " : "    ") + key + "  - " + this.presets[key].desc);
      }
    }
  };

  // ============================================================
  // 4. AI 엔진
  // ============================================================
  function webllmCandidates() {
    var list = [];
    if (CONFIG.webllmURL) list.push(resolveURL(CONFIG.webllmURL));
    list.push(resolveURL(CONFIG.webllmDir + CONFIG.webllmFile));
    if (CONFIG.webllmCDN) list.push(CONFIG.webllmCDN);
    return list.filter(function (url, idx) { return list.indexOf(url) === idx; });
  }

  // 후보 URL 을 순서대로 import
  function importFirst(urls, lastErr) {
    if (!dynamicImport) return Promise.reject(new Error("동적 import를 지원하지 않는 브라우저입니다."));
    if (!urls.length) return Promise.reject(lastErr || new Error("WebLLM 모듈 경로가 없습니다."));

    Log.info("모듈 로딩: " + urls[0]);
    return dynamicImport(urls[0]).then(function (module) {
      var lib = module.CreateMLCEngine ? module : module.default;
      if (!lib || !lib.CreateMLCEngine) throw new Error("CreateMLCEngine을 찾을 수 없습니다.");
      return { lib: lib, url: urls[0] };
    }).catch(function (err) {
      Log.info("⚠️ 로드 불가 (" + errMsg(err) + ") → 다음 경로 시도");
      return importFirst(urls.slice(1), err);
    });
  }

  function checkWebGPU() {
    if (!navigator.gpu) {
      return Promise.reject(new Error("이 브라우저는 WebGPU를 지원하지 않습니다. (Chrome/Edge 113+ 권장, HTTPS 또는 localhost 필요)"));
    }
    return navigator.gpu.requestAdapter().then(function (adapter) {
      if (!adapter) throw new Error("사용 가능한 GPU 어댑터가 없습니다. (chrome://gpu 에서 WebGPU 상태 확인)");
      Models.supportsF16 = !!(adapter.features && adapter.features.has("shader-f16"));
    });
  }

  var AIEngine = {
    lib: null,
    libURL: null,
    engine: null,
    worker: null,
    modelId: null,
    mode: null,          // "worker" | "main"
    ready: false,
    loading: false,
    initialized: false,
    callbacks: [],
    tail: Promise.resolve(), // 요청 직렬화용 (에러 분석/채팅/검색이 동시에 들어와도 순서대로 처리)

    init: function (callback) {
      var self = this;
      if (this.ready) {
        if (callback) callback(null);
        return;
      }
      if (callback) this.callbacks.push(callback);
      if (this.loading) return;

      this.initialized = true;
      this.loading = true;
      Log.styled(TAG + " 🚀 초기화 시작...", STYLE.title);

      checkWebGPU().then(function () {
        return self.loadLibrary();
      }).then(function () {
        return self.loadFirstModel(Models.candidates());
      }).then(function () {
        self.onReady("준비 완료!");
        Log.plain("  ✓ 자동 에러 분석   ✓ chat('질문')   ✓ search('검색어')   ✓ chatHelp()");
      }).catch(function (err) {
        self.loading = false; // AISupport.init() 으로 수동 재시도 가능
        Log.error("❌ 엔진 초기화 실패: " + errMsg(err));
        self.flush(err);
      });
    },

    // 준비되면 action 실행 (준비 안 됐으면 초기화 후 실행)
    whenReady: function (action) {
      if (this.ready) {
        action();
        return;
      }
      Log.info("⏳ AI 엔진 준비 후 실행합니다...");
      this.init(function (err) { if (!err) action(); });
    },

    onReady: function (title) {
      this.ready = true;
      this.loading = false;
      Log.styled(TAG + " ✅ " + title + " (" + this.modelId + ", " + (this.mode === "worker" ? "Web Worker" : "메인 스레드") + ")",
                 STYLE.success + "; font-size:14px");
      this.flush(null);
      ErrorAnalyzer.drain();
    },

    flush: function (err) {
      var cbs = this.callbacks;
      this.callbacks = [];
      for (var i = 0; i < cbs.length; i++) {
        try { cbs[i](err); } catch (e) {}
      }
    },

    loadLibrary: function () {
      var self = this;
      if (this.lib) return Promise.resolve();
      if (global.webllm && global.webllm.CreateMLCEngine) {
        this.lib = global.webllm;
        return Promise.resolve();
      }
      return importFirst(webllmCandidates()).then(function (loaded) {
        Log.info("✅ 모듈 로드 성공: " + loaded.url);
        self.lib = global.webllm = loaded.lib;
        self.libURL = loaded.url;
      }, function (err) {
        Log.styled("💡 해결 방법", STYLE.title);
        Log.plain("  1. " + resolveURL(CONFIG.webllmDir + CONFIG.webllmFile) + " 가 브라우저에서 열리는지 확인");
        Log.plain("  2. 경로가 다르면 tsSupportAI.js 로드 전에 window.AI_ASSISTANT_CONFIG = { webllmURL: '/경로/web-llm.min.js' } 지정");
        throw err;
      });
    },

    // 후보 모델을 순서대로 시도 (GPU 메모리 부족 시 더 작은 모델로 자동 다운그레이드)
    loadFirstModel: function (ids, lastErr) {
      var self = this;
      if (!ids.length) return Promise.reject(lastErr || new Error("로드할 모델이 없습니다."));
      return this.loadModel(ids[0]).catch(function (err) {
        if (ids.length > 1) {
          Log.warn("⚠️ " + ids[0] + " 로드 실패 (" + errMsg(err) + ") → " + ids[1] + " 로 재시도");
        }
        return self.loadFirstModel(ids.slice(1), err);
      });
    },

    progressConfig: function () {
      var last = -10;
      return {
        initProgressCallback: function (progress) {
          if (!(progress.progress > 0)) return;
          var percent = Math.round(progress.progress * 100);
          if (percent >= last + 10 || (percent === 100 && last !== 100)) {
            Log.info("📊 로딩: " + percent + "%");
            last = percent;
          }
        }
      };
    },

    describeModel: function (modelId) {
      var lib = this.lib;
      var list = (lib.prebuiltAppConfig && lib.prebuiltAppConfig.model_list) || [];
      var info = list.filter(function (m) { return m.model_id === modelId; })[0];
      Log.info("📦 모델: " + modelId + (info && info.vram_required_MB ? " (VRAM 약 " + Math.round(info.vram_required_MB) + "MB)" : ""));
      if (lib.hasModelInCache) {
        lib.hasModelInCache(modelId).then(function (cached) {
          Log.info(cached ? "💾 브라우저 캐시에서 로드합니다" : "🌐 첫 로드 - 모델을 다운로드합니다 (수 분 소요, 이후 캐시 사용)");
        }, function () {});
      }
    },

    // 같은 출처의 로컬 web-llm 에서 로드됐을 때만 워커 사용 (CDN 은 cross-origin 워커 불가)
    createWorker: function () {
      if (!CONFIG.useWebWorker || !this.libURL || !this.lib.CreateWebWorkerMLCEngine || typeof Worker === "undefined") {
        return null;
      }
      try {
        var workerURL = new URL(CONFIG.workerFile, this.libURL);
        if (workerURL.origin !== location.origin) return null;
        return new Worker(workerURL.href, { type: "module" });
      } catch (e) {
        return null;
      }
    },

    dispose: function () {
      var old = this.engine;
      this.engine = null;
      this.ready = false;
      if (old && old.unload) {
        try { old.unload(); } catch (e) {}
      }
      if (this.worker) {
        try { this.worker.terminate(); } catch (e) {}
        this.worker = null;
      }
    },

    loadModel: function (modelId) {
      var self = this;
      var lib = this.lib;
      this.dispose();
      this.describeModel(modelId);

      var createOnMain = function () {
        self.mode = "main";
        return lib.CreateMLCEngine(modelId, self.progressConfig());
      };

      var worker = this.createWorker();
      var promise = !worker ? createOnMain() : new Promise(function (resolve, reject) {
        // 워커 스크립트 자체가 로드되지 않으면 CreateWebWorkerMLCEngine 이 영원히 대기하므로 별도 감지
        worker.addEventListener("error", function (e) {
          reject(new Error("Worker 로드 실패: " + (e.message || CONFIG.workerFile)));
        });
        lib.CreateWebWorkerMLCEngine(worker, modelId, self.progressConfig()).then(resolve, reject);
      }).then(function (engine) {
        self.worker = worker;
        self.mode = "worker";
        return engine;
      }, function (err) {
        try { worker.terminate(); } catch (e) {}
        // GPU 메모리 문제는 메인 스레드에서도 똑같이 실패하므로 바로 상위(폴백 모델)로 전달
        if (/memory|OOM|device lost|allocation/i.test(errMsg(err))) throw err;
        Log.info("⚠️ Web Worker 모드 실패 (" + errMsg(err) + ") → 메인 스레드로 전환");
        return createOnMain();
      });

      return promise.then(function (engine) {
        self.engine = engine;
        self.modelId = modelId;
      });
    },

    // OpenAI 호환 chat completion. 요청은 하나씩 순서대로 실행됨
    complete: function (messages, settings) {
      var self = this;
      var task = this.tail.then(function () {
        if (!self.ready || !self.engine) throw new Error("엔진이 준비되지 않았습니다.");
        var request = {
          messages: messages,
          temperature: settings.temperature,
          max_tokens: settings.max_tokens,
          top_p: settings.top_p
        };
        var extras = Models.requestExtras(self.modelId);
        for (var k in extras) request[k] = extras[k];
        return self.engine.chat.completions.create(request);
      }).then(function (res) {
        return cleanModelOutput(res.choices[0].message.content);
      });
      this.tail = task.catch(function () {});
      return task;
    },

    // 사용 중 모델 교체
    switchModel: function (key) {
      var self = this;
      if (!this.lib) {
        this.init();
        return;
      }
      if (this.loading) {
        Log.warn("현재 로딩 중입니다. 완료 후 다시 시도하세요.");
        return;
      }
      var modelId = Models.toModelId(key);
      this.loading = true;
      Log.info("🔄 모델 교체: " + modelId);
      // 진행 중인 요청이 끝난 뒤 교체
      this.tail.then(function () {
        return self.loadModel(modelId);
      }).then(function () {
        self.onReady("모델 교체 완료");
      }, function (err) {
        self.loading = false;
        Log.error("❌ 모델 교체 실패: " + errMsg(err) + " → AISupport.init() 으로 기본 모델 재시도 가능");
      });
    },

    // 브라우저 캐시(디스크)에 저장된 모델 삭제
    deleteModelCache: function (key) {
      var self = this;
      var modelId = Models.toModelId(key);
      return this.loadLibrary().then(function () {
        if (!self.lib.deleteModelAllInfoInCache) throw new Error("이 WebLLM 버전은 캐시 삭제를 지원하지 않습니다.");
        return self.lib.deleteModelAllInfoInCache(modelId);
      }).then(function () {
        Log.info("🗑️ 캐시 삭제 완료: " + modelId);
      }, function (err) {
        Log.error("캐시 삭제 실패: " + errMsg(err));
      });
    }
  };

  // ============================================================
  // 5. 소스 코드 조사
  // ============================================================
  var SourceInspector = {
    cache: new BoundedMap(30),
    // 프레임워크/라이브러리 코드는 제외하고 사용자 코드만 대상으로 함
    ignore: /cleopatra\.js|__runtime__|\/resource\/conf\/|tsSupportAI|web-llm|tsLiveCodeExecutor|<anonymous>|^native|extensions::|chrome-extension:/,
    // Chrome/Edge: "at fn (url:line:col)" 또는 "at url:line:col" / Firefox/Safari: "fn@url:line:col"
    chromeFrame: /^at\s+(?:(.*?)\s+\()?(.+?):(\d+):(\d+)\)?$/,
    geckoFrame: /^(.*?)@(.+?):(\d+):(\d+)$/,

    userFrames: function (stack) {
      var frames = [];
      var lines = String(stack || "").split("\n");
      for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        var m = line.match(this.chromeFrame) || line.match(this.geckoFrame);
        if (m && /^https?:/.test(m[2]) && !this.ignore.test(m[2])) {
          frames.push({ fn: m[1] || "(anonymous)", url: m[2], line: parseInt(m[3], 10) });
        }
      }
      return frames;
    },

    shortName: function (url) {
      return String(url).split("?")[0].split("/").slice(-2).join("/");
    },

    fetchLines: function (url) {
      var cached = this.cache.get(url);
      if (!cached) {
        cached = withTimeout(fetch(url, { credentials: "same-origin" }), 3000).then(function (res) {
          if (!res.ok) throw new Error("HTTP " + res.status);
          return res.text();
        }).then(function (text) {
          return text.split(/\r?\n/);
        });
        cached.catch(function () {});
        this.cache.set(url, cached);
      }
      return cached;
    },

    snippet: function (frame) {
      var radius = CONFIG.snippetRadius;
      var name = this.shortName(frame.url);
      return this.fetchLines(frame.url).then(function (lines) {
        var out = [];
        for (var i = Math.max(0, frame.line - 1 - radius), end = Math.min(lines.length, frame.line + radius); i < end; i++) {
          out.push((i === frame.line - 1 ? ">>" : "  ") + " " + (i + 1) + " | " + truncate(lines[i], 160));
        }
        return "[" + name + " - " + frame.fn + "]\n" + out.join("\n");
      }, function () {
        return null;
      });
    },

    // 최대 2개 사용자 프레임(에러 위치 + 호출한 곳)의 코드 조각
    collect: function (frames) {
      if (!CONFIG.fetchSourceSnippet || !frames.length) return Promise.resolve([]);
      var self = this;
      return Promise.all(frames.slice(0, 2).map(function (f) { return self.snippet(f); })).then(function (list) {
        return list.filter(Boolean);
      });
    }
  };

  // ============================================================
  // 6. 에러 수집/정규화
  // ============================================================
  var ErrorHints = {
    "cannot read propert": ["null 또는 undefined 객체의 속성에 접근", "컨트롤/데이터가 아직 준비되기 전에 접근", "app.lookup() 의 ID 오타로 null 반환"],
    "is not a function": ["메서드명 오타 또는 존재하지 않는 메서드 호출", "this 바인딩 문제", "함수가 아닌 값을 함수로 호출"],
    "is not defined": ["변수 선언 없이 사용", "변수/함수명 오타", "다른 스크립트가 아직 로드되지 않음"],
    "invalid array length": ["new Array()에 음수 또는 너무 큰 값 전달"],
    "maximum call stack": ["종료 조건 없는 재귀 호출", "이벤트 핸들러가 서로를 계속 호출"],
    "json": ["JSON.parse()에 올바르지 않은 JSON 문자열 전달 (값 누락, 작은따옴표, trailing comma)", "서버가 JSON 대신 HTML 에러 페이지를 반환"],
    "unexpected token": ["JSON 문법 오류 또는 괄호/따옴표 짝 불일치"],
    "duplicated": ["ComboBox/ListBox 등에 같은 value 의 아이템을 중복 추가", "addItem() 전에 중복 체크 누락"],
    "delimiter is used": ["아이템 value 에 다중선택 구분자(기본 ',')가 포함됨"],
    "invalid value": ["컨트롤 허용 범위를 벗어난 값", "데이터 타입 불일치"],
    "could not be null": ["eXBuilder6 API 필수 파라미터에 null/undefined 전달"],
    "must be": ["eXBuilder6 API 파라미터 타입이 잘못됨"]
  };

  // 소형 모델은 eXBuilder6 API 를 잘 모르므로 자주 쓰는 실제 API 를 프롬프트에 제공 (런타임에서 확인한 이름만)
  var EXB_API_SHEET =
    "[eXBuilder6 핵심 API - 이 목록 밖의 메서드는 만들어내지 말 것]\n" +
    "- 컨트롤 찾기: app.lookup('ID')  (없으면 null)\n" +
    "- ComboBox/ListBox: addItem(new cpr.controls.Item('라벨', '값')), selectItemByValue('값'), deleteAllItems(), value\n" +
    "- DataSet: getValue(row, '컬럼'), setValue(row, '컬럼', 값), addRowData({컬럼: 값}), getRowCount(), findFirstRow(\"컬럼 == '값'\")\n" +
    "- Grid: getSelectedRowIndex(), insertRow(row, true), dataSet\n" +
    "- Submission: app.lookup('sms1').send()\n" +
    "- 공통: control.redraw(), visible, enabled, readOnly\n" +
    "- 다이얼로그: app.openDialog('앱경로', {width: 400, height: 300}, function(dialog){ ... })";

  var CONTEXT_LABEL = {
    "event-listener": "컨트롤 이벤트 핸들러 실행 중",
    "rendering-fail": "컨트롤 렌더링 중 (잘못된 설정 가능성)",
    "deferred-task": "지연 실행 작업(async) 중",
    "notification-subscriber": "노티피케이션 구독 함수 실행 중",
    "expression": "바인딩 익스프레션 평가 중",
    "promise": "Promise 처리 중",
    "submission": "서브미션(서버 통신) 처리 중",
    "unknown": "알 수 없음"
  };

  // 최근 console.log 5개. 평소에는 인자만 보관하고 에러가 났을 때만 문자열로 변환 (console.log 오버헤드 최소화)
  var RecentLogs = {
    items: [],
    add: function (args) {
      if (typeof args[0] !== "string" || args[0].indexOf("%c") === 0) return;
      this.items.push(toArray(args));
      if (this.items.length > 5) this.items.shift();
    },
    snapshot: function () {
      return this.items.map(function (args) {
        return truncate(args.map(function (a) {
          if (typeof a === "string") return a;
          if (a instanceof Error) return a.message;
          try { return JSON.stringify(a); } catch (e) { return String(a); }
        }).join(" "), 150);
      });
    }
  };

  var ErrorCollector = {
    // "  SyntaxError: msg" 형태의 첫 줄을 이름/메시지로 분리
    splitFirstLine: function (text) {
      var first = String(text || "").replace(/^\s+/, "").split("\n")[0];
      var m = first.match(/^(?:Uncaught\s+)?([A-Za-z$_.]*(?:Error|Exception))(?::\s*(.*))?$/);
      return m ? { name: m[1], message: m[2] || "" } : { name: null, message: first };
    },

    // eXBuilder 메시지 예: "The value of the item is duplicated.: [controltype: combobox, id: cmb1, value: value1]"
    parseExBuilder: function (message) {
      var type = message.match(/control\s*type:\s*([\w.]+)/i);
      var id = message.match(/\bid:\s*([\w$-]+)/i);
      if (!type && !id) return null;
      var value = message.match(/\bvalue:\s*([^,\]]+)/i);
      return { controltype: type && type[1], id: id && id[1], value: value && value[1].trim() };
    },

    /**
     * 모든 수집 경로의 입구
     * @param {*} error Error 객체, 문자열(런타임 로그 포함), 또는 {name, message, stack}
     * @param {Object} meta { source, context }
     */
    capture: function (error, meta) {
      meta = meta || {};
      var name = null, message, stack = null;

      if (error && typeof error === "object" && (error.message || error.stack)) {
        name = error.name || null;
        message = String(error.message || "");
        stack = error.stack || null;
      } else {
        message = String(error);
        if (/\n\s+at\s|@\S+:\d+:\d+/.test(message)) stack = message; // 스택이 포함된 로그 문자열
      }
      // 이름이 없거나 일반 Error 면 "SyntaxError: ..." 같은 첫 줄에서 추출
      if (!name || name === "Error") {
        var parsed = this.splitFirstLine(message);
        if (parsed.name) {
          name = parsed.name;
          message = parsed.message;
        } else if (stack === message) {
          message = parsed.message;
        }
      }

      ErrorAnalyzer.handle({
        key: truncate(message, 150), // 같은 에러 판별 기준
        name: name || "Error",
        message: message,
        stack: stack,
        source: meta.source || "manual",
        context: meta.context || null,
        exbuilder: this.parseExBuilder(message),
        frames: SourceInspector.userFrames(stack),
        logs: RecentLogs.snapshot()
      });
    }
  };

  // ============================================================
  // 7. 에러 분석
  // ============================================================
  var ErrorAnalyzer = {
    queue: [],
    // key → { status: "queued"|"done", result, count, lastSeen, lastPrinted }
    records: new BoundedMap(CONFIG.maxRecords),
    analyzing: false,

    // 이전 버전 호환
    get errorQueue() { return this.queue; },

    handle: function (info) {
      var now = Date.now();
      var rec = this.records.get(info.key);

      if (rec) {
        // 같은 에러가 여러 경로(console + Platform.onerror + window error)로 동시에 들어온 경우
        if (now - rec.lastSeen < CONFIG.duplicateWindowMs) return;
        rec.lastSeen = now;
        rec.count++;
        if (rec.status !== "done") return; // 이미 대기열에 있음
        // 반복 에러(setInterval 등)는 결과를 다시 쏟아내지 않고 한 줄로 알림
        if (now - rec.lastPrinted < CONFIG.repeatSummaryMs) {
          Log.info("♻️ 반복 발생 (" + rec.count + "회): " + truncate(info.message, 80) + " → 위 분석 결과 참고");
          return;
        }
        rec.lastPrinted = now;
        this.printHeader(info);
        this.printResult(info, rec.result);
        return;
      }

      this.printHeader(info);
      if (this.queue.length >= CONFIG.maxQueue) {
        Log.info("분석 대기열이 가득 차 이 에러는 AI 분석을 생략합니다.");
        return;
      }
      this.records.set(info.key, { status: "queued", result: null, count: 1, lastSeen: now, lastPrinted: now });
      this.queue.push(info);

      if (AIEngine.ready) {
        this.drain();
      } else if (!AIEngine.initialized || AIEngine.loading) {
        Log.info("엔진 준비 중 → 준비되면 분석합니다. (대기 " + this.queue.length + "건)");
        AIEngine.init(); // preload: false 인 경우 첫 에러 시점에 로드
      } else {
        Log.info("AI 엔진을 사용할 수 없어 분석을 보류합니다. AISupport.init() 으로 재시도하세요.");
      }
    },

    // 대기열을 하나씩 순서대로 분석
    drain: function () {
      var self = this;
      if (this.analyzing || !AIEngine.ready || !this.queue.length) return;

      var info = this.queue.shift();
      var started = Date.now();
      this.analyzing = true;
      Log.styled(TAG + " 🔍 AI 분석 중: " + truncate(info.message, 80), STYLE.title);

      SourceInspector.collect(info.frames).then(function (snippets) {
        return AIEngine.complete([
          { role: "system", content: self.systemPrompt },
          { role: "user", content: self.buildPrompt(info, snippets) }
        ], CONFIG.errorAnalysisSettings);
      }).then(function (content) {
        var rec = self.records.get(info.key);
        if (rec) {
          rec.status = "done";
          rec.result = content;
        }
        self.printResult(info, content, started);
      }, function (err) {
        self.records.remove(info.key); // 다음에 같은 에러가 나면 다시 분석
        Log.error("AI 분석 오류: " + errMsg(err));
      }).then(function () {
        self.analyzing = false;
        self.drain();
      });
    },

    findHints: function (message) {
      var msg = message.toLowerCase();
      var hints = [];
      for (var key in ErrorHints) {
        if (msg.indexOf(key) !== -1) hints = hints.concat(ErrorHints[key]);
      }
      return hints.slice(0, 4);
    },

    systemPrompt:
      "당신은 JavaScript 와 eXBuilder6(토마토시스템 JavaScript UI 프레임워크) 전문 기술지원 엔지니어입니다.\n" +
      EXB_API_SHEET + "\n\n" +
      "반드시 한국어로, 제공된 소스 코드를 근거로 구체적으로 답하세요. 추측은 '추정'이라고 표시하세요.\n" +
      "아래 형식을 정확히 지키고 각 항목은 짧게 작성하세요.\n\n" +
      "1. 에러 원인:\n(한 문장)\n\n" +
      "2. 왜 발생했나:\n(2줄 이내, 소스의 >> 표시 줄을 근거로)\n\n" +
      "3. 해결 방법:\n```javascript\n// 수정 전\n...\n// 수정 후\n...\n```\n\n" +
      "4. 개발자 체크리스트:\n• 항목1\n• 항목2\n• 항목3",

    buildPrompt: function (info, snippets) {
      var parts = ["[에러]\n" + info.name + ": " + truncate(info.message, 400)];
      var ex = info.exbuilder;
      var hints = this.findHints(info.message);

      if (info.context) parts.push("[발생 상황]\n" + (CONTEXT_LABEL[info.context] || info.context));
      if (ex) parts.push("[eXBuilder6 컨트롤]\n타입: " + (ex.controltype || "-") + ", ID: " + (ex.id || "-") + ", 문제 값: " + (ex.value || "-"));
      if (info.frames.length) {
        parts.push("[호출 경로]\n" + info.frames.slice(0, 4).map(function (f) {
          return "- " + f.fn + " (" + SourceInspector.shortName(f.url) + ":" + f.line + ")";
        }).join("\n"));
      }
      if (snippets.length) parts.push("[소스 코드] (>> 가 에러 발생 줄)\n" + snippets.join("\n\n"));
      if (info.logs.length) parts.push("[직전 콘솔 로그]\n" + info.logs.join("\n"));
      if (hints.length) parts.push("[참고: 흔한 원인]\n- " + hints.join("\n- "));

      return truncate(parts.join("\n\n"), CONFIG.maxPromptChars);
    },

    printHeader: function (info) {
      Log.block("⚠️ " + info.name + ": " + truncate(info.message, 200), STYLE.error, function () {
        if (info.context) Log.plain("발생 상황: " + (CONTEXT_LABEL[info.context] || info.context));
        if (info.frames.length) {
          var f = info.frames[0];
          Log.plain("위치: " + SourceInspector.shortName(f.url) + ":" + f.line + " (" + f.fn + ")");
        }
        if (info.exbuilder) {
          var ex = info.exbuilder;
          Log.plain("컨트롤: " + [ex.controltype, ex.id, ex.value].filter(Boolean).join(" / "));
        }
      });
    },

    printResult: function (info, content, startedAt) {
      Log.block("🤖 AI 에러 분석 결과 - " + info.name, STYLE.result, function () {
        Log.plain(content);
        if (startedAt) Log.elapsed(startedAt, AIEngine.modelId);
      });
    },

    // 이전 버전 호환: handleError({name, message, stack, ...})
    handleError: function (errObj) {
      ErrorCollector.capture(errObj, { source: "manual" });
    }
  };

  // ============================================================
  // 8. 채팅
  // ============================================================
  var ChatManager = {
    conversationHistory: [],
    maxHistory: 10, // 컨텍스트(4K 토큰) 초과 방지
    systemPrompt: "당신은 JavaScript 와 eXBuilder6(토마토시스템 JavaScript UI 프레임워크) 전문가입니다. " +
                  "한국어로 간결하게 답하고 필요하면 JavaScript(ES5) 코드 예제를 제공하세요.\n\n" + EXB_API_SHEET,

    sendMessage: function (userMessage) {
      var self = this;
      var started = Date.now();
      this.conversationHistory.push({ role: "user", content: userMessage });
      if (this.conversationHistory.length > this.maxHistory) {
        this.conversationHistory = this.conversationHistory.slice(-this.maxHistory);
      }

      Log.styled("[User] " + userMessage, STYLE.title);
      Log.styled("[AI] 생각하는 중...", "color:#9E9E9E; font-style:italic");

      return AIEngine.complete(
        [{ role: "system", content: this.systemPrompt }].concat(this.conversationHistory),
        CONFIG.chatSettings
      ).then(function (answer) {
        Log.styled("[AI] " + answer, STYLE.success);
        Log.elapsed(started);
        self.conversationHistory.push({ role: "assistant", content: answer });
        return answer;
      }, function (err) {
        self.conversationHistory.pop();
        Log.error("❌ 메시지 전송 실패: " + errMsg(err));
        throw err;
      });
    },

    clearHistory: function () {
      this.conversationHistory = [];
      Log.info("🗑️ 대화 이력이 초기화되었습니다.");
    }
  };

  // ============================================================
  // 9. API 검색
  // ============================================================
  var APIDatabase = {
    data: [],
    loaded: false,

    controlNameMapping: {
      "인풋박스": "inputbox", "입력박스": "inputbox", "콤보박스": "combobox", "콤보": "combobox",
      "리스트박스": "listbox", "리스트": "listbox", "버튼": "button", "그리드": "grid", "캘린더": "calendar",
      "데이트인풋": "dateinput", "체크박스그룹": "checkboxgroup", "체크박스": "checkbox", "라디오버튼": "radiobutton",
      "라디오": "radiobutton", "텍스트에리어": "textarea", "스니펫": "htmlsnippet", "mdi": "mdifolder",
      "그룹": "group", "넘버에디터": "numbereditor", "내비게이션바": "navigationbar", "내비게이션": "navigationbar",
      "링크드리스트박스": "linkedlistbox", "링크드콤보박스": "linkedcombobox", "마스크에디터": "maskeditor",
      "메뉴": "menu", "비디오": "video", "사이드내비게이션": "sidenavigation", "서치인풋": "searchinput",
      "쉘": "shell", "슬라이더": "slider", "아웃풋": "output", "아코디언": "accordion", "알림": "notification",
      "오디오": "audio", "이미지": "image", "임베디드앱": "embeddedapp", "임베디드페이지": "embeddedpage",
      "탭폴더": "tabfolder", "트리셀": "treecell", "트리": "tree", "파일업로더": "fileupload",
      "파일인풋": "fileinput", "페이지인덱서": "pageindexer", "프로그레스": "progress",
      "속성": "property", "함수": "api", "메서드": "api", "이벤트": "event", "추가": "add",
      "아이템": "item", "추가방법": "additem", "아이템추가": "additem"
    },

    // 로드 시 검색용 소문자 필드를 미리 계산 (검색할 때마다 toLowerCase 반복 방지)
    loadData: function (jsonData) {
      if (!Array.isArray(jsonData)) {
        Log.error("[API Search] ❌ 잘못된 데이터 형식 (JSON 배열 필요)");
        return false;
      }
      this.data = jsonData.filter(function (item) { return item.USE_YN === "Y"; }).map(function (item) {
        return {
          item: item,
          ctrl: (item.CTRL_RCD || "").toLowerCase(),
          api: (item.PRO_NM_RCD || "").toLowerCase(),
          cat: (item.CAT_RCD || "").toLowerCase(),
          expl: (item.EXPL || "").toLowerCase()
        };
      });
      this.loaded = true;
      Log.info("[API Search] ✓ API 데이터 로드 완료: " + this.data.length + "개");
      return true;
    },

    translateKeywords: function (keywords) {
      var result = [];
      for (var i = 0; i < keywords.length; i++) {
        var keyword = keywords[i];
        if (!keyword) continue;
        result.push(keyword);
        for (var kor in this.controlNameMapping) {
          if (keyword.indexOf(kor) !== -1) result.push(this.controlNameMapping[kor]);
        }
      }
      return result;
    },

    searchRelevantData: function (query) {
      var keywords = this.translateKeywords(query.toLowerCase().split(/\s+/));
      var hasAction = keywords.indexOf("add") !== -1 || keywords.indexOf("additem") !== -1;
      var hasTarget = keywords.indexOf("item") !== -1 || keywords.indexOf("additem") !== -1;
      var results = [];

      for (var i = 0; i < this.data.length; i++) {
        var row = this.data[i];
        var score = 0, hasControl = false;
        for (var j = 0; j < keywords.length; j++) {
          var kw = keywords[j];
          if (row.api === kw) score += 200;
          if (row.ctrl === kw) score += 150;
          if (row.api.indexOf(kw) !== -1) score += 100;
          if (row.ctrl.indexOf(kw) !== -1) { score += 80; hasControl = true; }
          if (row.cat.indexOf(kw) !== -1) score += 50;
          if (row.expl.indexOf(kw) !== -1) score += 10;
        }
        if (hasControl && hasAction && hasTarget && row.api.indexOf("additem") !== -1) score += 300;
        if (score > 0) results.push({ item: row.item, score: score });
      }

      results.sort(function (a, b) { return b.score - a.score; });
      return results.slice(0, 8).map(function (r) { return r.item; });
    },

    buildDetailedContext: function (results) {
      return results.map(function (item) {
        var text = "【" + item.CTRL_RCD + "." + item.PRO_NM_RCD + "】 (" + item.CAT_RCD + ")\n";
        text += "설명: " + truncate((item.EXPL || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim(), 200) + "\n";
        if (item.INPUT_VAL) text += "파라미터: " + truncate(item.INPUT_VAL.replace(/\n/g, " | ").trim(), 120) + "\n";
        if (item.RTRN_TY) text += "반환: " + item.RTRN_TY + "\n";
        return text;
      }).join("\n");
    },

    systemPrompt:
      "당신은 eXBuilder6 JavaScript 프레임워크 전문가입니다. (Java 아님)\n" +
      "제공된 API 정보만 근거로 한국어로 간결하게 설명하고, JavaScript 예제는 app.lookup('컨트롤ID') 를 사용하세요.\n" +
      "형식: API 설명(1-2줄) → JavaScript 코드 예제 → 주의사항(있으면)\n\n" + EXB_API_SHEET,

    // 이전 버전 호환
    getSystemPrompt: function () { return this.systemPrompt; },

    loadFromFile: function () {
      var self = this;
      var dataPath = resolveURL(CONFIG.webllmDir + CONFIG.dataFile);
      fetch(dataPath).then(function (res) {
        if (res.status === 404) return null; // data.json 은 선택 사항
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      }).then(function (json) {
        if (json && self.loadData(json)) Log.info("[API Search] ✅ data.json 자동 로드 완료 → search('검색어')");
      }).catch(function (err) {
        Log.warn("[API Search] data.json 로드 실패 (" + errMsg(err) + "): " + dataPath);
      });
    }
  };

  var APISearchManager = {
    searching: false,

    search: function (query) {
      var self = this;
      if (!APIDatabase.loaded) {
        Log.error("[API Search] ❌ API 데이터가 로드되지 않았습니다. loadAPI([...]) 또는 " + resolveURL(CONFIG.webllmDir + CONFIG.dataFile) + " 배치");
        return;
      }
      if (this.searching) {
        Log.info("[API Search] ⏳ 이전 검색이 진행 중입니다...");
        return;
      }
      var relevant = APIDatabase.searchRelevantData(query);
      if (!relevant.length) {
        Log.info("[API Search] ℹ️ 관련 API 를 찾지 못했습니다.");
        return;
      }

      AIEngine.whenReady(function () {
        var started = Date.now();
        self.searching = true;
        Log.styled("[API Search] 🔍 " + query + "  (후보: " + relevant.slice(0, 3).map(function (r) {
          return r.CTRL_RCD + "." + r.PRO_NM_RCD;
        }).join(", ") + ")", "color:#9C27B0; font-weight:bold");

        AIEngine.complete([
          { role: "system", content: APIDatabase.systemPrompt },
          { role: "user", content: "질문: " + query + "\n\n=== 관련 API 정보 ===\n" + APIDatabase.buildDetailedContext(relevant) }
        ], CONFIG.apiSearchSettings).then(function (answer) {
          Log.block("🤖 AI API 검색 결과", STYLE.search, function () {
            Log.plain(answer);
            Log.elapsed(started);
          });
        }, function (err) {
          Log.error("[API Search] ❌ AI 분석 오류: " + errMsg(err));
        }).then(function () {
          self.searching = false;
        });
      });
    }
  };

  // ============================================================
  // 10. 에러 후킹
  // ============================================================
  var Hooks = {
    platformInstalled: false,

    // eXBuilder6 공식 전역 에러 훅: 이벤트 리스너/서브미션/익스프레션/Promise 에러가 모두 여기로 보고됨
    installPlatform: function () {
      var cpr = global.cpr;
      if (this.platformInstalled) return true;
      if (!cpr || !cpr.core || !cpr.core.Platform || !cpr.core.Platform.INSTANCE) return false;

      var platform = cpr.core.Platform.INSTANCE;
      var desc = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(platform), "onerror");
      if (!desc || !desc.set) return false;

      var userHandler = platform.onerror || null;
      desc.set.call(platform, function (report) {
        if (typeof userHandler === "function") {
          try { userHandler.call(platform, report); } catch (e) {}
        }
        try {
          ErrorCollector.capture(report.error || report.message, { source: "platform", context: report.context });
        } catch (e) {}
      });

      // 앱에서 나중에 Platform.INSTANCE.onerror 를 지정해도 AI 훅이 유지되도록 체이닝
      try {
        Object.defineProperty(platform, "onerror", {
          configurable: true,
          get: function () { return userHandler; },
          set: function (fn) { userHandler = fn; }
        });
      } catch (e) {}

      this.platformInstalled = true;
      Log.info("✓ eXBuilder6 에러 훅(Platform.onerror) 설치");
      return true;
    },

    installWindow: function () {
      // 런타임이 window.onerror 를 사용하므로 덮어쓰지 않고 리스너로 수집 (중복은 ErrorAnalyzer 가 제거)
      global.addEventListener("error", function (e) {
        if (e.error || e.message) ErrorCollector.capture(e.error || e.message, { source: "window" });
      });
      global.addEventListener("unhandledrejection", function (e) {
        var reason = e.reason;
        var cpr = global.cpr;
        if (!reason) return;
        // 런타임이 의도적으로 무시하는 거부 (취소, 서브미션 이벤트)
        if (cpr && cpr.exceptions && cpr.exceptions.CancelationException && reason instanceof cpr.exceptions.CancelationException) return;
        if (cpr && cpr.events && cpr.events.CSubmissionEvent && reason instanceof cpr.events.CSubmissionEvent) return;
        ErrorCollector.capture(reason, { source: "promise", context: "promise" });
      });
    },

    installConsole: function () {
      if (!CONFIG.captureConsole) return;

      var ERROR_TEXT = /(^|\s)[A-Za-z]*(Error|Exception)\b|controltype|duplicated|uncaught/i;
      function findError(args) {
        for (var i = 0; i < args.length; i++) {
          if (args[i] instanceof Error) return args[i];
        }
        var text = args.map(String).join(" ");
        return ERROR_TEXT.test(text) ? text : null;
      }
      function wrap(original, source) {
        return function () {
          original.apply(console, arguments);
          var err = findError(toArray(arguments));
          // setTimeout: 런타임은 로그 직후 Platform.onerror 로 더 자세한 리포트를 보내므로 그쪽이 먼저 기록되게 함
          if (err) setTimeout(function () { ErrorCollector.capture(err, { source: source }); }, 0);
        };
      }

      console.error = wrap(nativeConsole.error, "console.error");
      console.warn = wrap(nativeConsole.warn, "console.warn");
      console.log = function () {
        nativeConsole.log.apply(console, arguments);
        RecentLogs.add(arguments);
      };
    }
  };

  // ============================================================
  // 11. 공개 API
  // ============================================================
  var AISupport = {
    __loaded: true,
    config: CONFIG,

    /** 에러를 직접 분석 요청. Error 객체, 문자열, {message, stack} 모두 가능 */
    analyze: function (error) {
      ErrorCollector.capture(error, { source: "manual" });
    },

    /** 모델 목록 */
    models: function () {
      Models.list();
    },

    /** 모델 변경 (브라우저에 저장, 다음 방문에도 유지) 예: AISupport.setModel('qwen3-1.7b') */
    setModel: function (key) {
      if (!Models.presets[key]) {
        Log.error("알 수 없는 모델: " + key);
        Models.list();
        return;
      }
      Store.set("model", key);
      if (AIEngine.lib) AIEngine.switchModel(key);
      else Log.info("모델 설정 저장: " + key + " (다음 초기화 시 적용)");
    },

    /** 저장된 모델 설정 초기화 (기본값으로) */
    resetModel: function () {
      Store.set("model", null);
      Log.info("모델 설정 초기화 → 기본값 " + CONFIG.model + " (새로고침 후 적용)");
    },

    /** 브라우저에 저장된 모델 파일 삭제 (디스크 공간 확보) 예: AISupport.deleteModelCache('qwen2.5-0.5b') */
    deleteModelCache: function (key) {
      return AIEngine.deleteModelCache(key || Models.currentKey());
    },

    /** 현재 상태 */
    status: function () {
      var s = {
        ready: AIEngine.ready,
        loading: AIEngine.loading,
        model: AIEngine.modelId || Models.toModelId(Models.currentKey()),
        mode: AIEngine.mode,
        shaderF16: Models.supportsF16,
        eXBuilderHook: Hooks.platformInstalled,
        queue: ErrorAnalyzer.queue.length,
        knownErrors: ErrorAnalyzer.records.size(),
        webllm: AIEngine.libURL
      };
      Log.info("상태", s);
      return s;
    },

    /** 엔진 초기화/재시도 */
    init: function () {
      AIEngine.init();
    }
  };

  global.AISupport = AISupport;

  global.loadAPI = function (jsonData) {
    if (APIDatabase.loadData(jsonData)) {
      Log.info("[API Search] ✅ 준비 완료 → search('콤보박스 아이템 추가방법')");
    }
  };

  global.search = function (query) {
    if (typeof query !== "string" || !query.trim()) {
      Log.error("[API Search] ❌ 검색어를 입력해주세요. 예: search('콤보박스 아이템 추가')");
      return;
    }
    APISearchManager.search(query);
  };

  global.chat = function (message) {
    if (typeof message !== "string" || !message.trim()) {
      Log.error("❌ 메시지를 입력해주세요. 예: chat('안녕하세요')");
      return;
    }
    AIEngine.whenReady(function () {
      ChatManager.sendMessage(message).catch(function () {});
    });
  };

  global.clearChat = function () {
    ChatManager.clearHistory();
  };

  global.chatHelp = function () {
    Log.styled("=== AI Assistant 도움말 ===", STYLE.title + "; font-size:14px");
    Log.plain("✓ 자동 에러 분석 : eXBuilder6 이벤트/서브미션/Promise/전역 에러를 자동 분석 (에러 위치의 소스 코드 포함)");
    Log.plain("  AISupport.analyze(err)          - 직접 분석 요청");
    Log.plain("✓ AI 채팅          : chat('메시지') / clearChat()");
    Log.plain("✓ API 검색         : loadAPI([...]) / search('콤보박스 아이템 추가방법')");
    Log.plain("✓ 모델/상태");
    Log.plain("  AISupport.models()              - 모델 목록");
    Log.plain("  AISupport.setModel('qwen3-1.7b') - 모델 변경 (저장됨)");
    Log.plain("  AISupport.deleteModelCache('키') - 저장된 모델 파일 삭제");
    Log.plain("  AISupport.status()              - 현재 상태");
  };

  // 이전 버전 호환 (고급 사용자용)
  global.AIEngine = AIEngine;
  global.ErrorAnalyzer = ErrorAnalyzer;
  global.ChatManager = ChatManager;
  global.APIDatabase = APIDatabase;
  global.APISearchManager = APISearchManager;

  // ============================================================
  // 12. 시작
  // ============================================================
  Hooks.installConsole();
  Hooks.installWindow();
  if (!Hooks.installPlatform()) {
    // 런타임보다 먼저 로드된 경우 대비
    var tries = 0;
    var timer = setInterval(function () {
      if (Hooks.installPlatform() || ++tries > 20) clearInterval(timer);
    }, 250);
  }

  Log.styled(TAG + " 📚 로드 완료 - chatHelp() 로 사용법 확인", STYLE.title);
  APIDatabase.loadFromFile();

  // 앱 화면 초기화와 경쟁하지 않도록 브라우저가 한가할 때 모델 로드 시작
  if (CONFIG.preload) {
    var startPreload = function () {
      if (AIEngine.initialized) return;
      if (global.requestIdleCallback) global.requestIdleCallback(function () { AIEngine.init(); }, { timeout: 3000 });
      else setTimeout(function () { AIEngine.init(); }, 500);
    };
    if (document.readyState === "complete") startPreload();
    else global.addEventListener("load", startPreload);
  }

})(window);
