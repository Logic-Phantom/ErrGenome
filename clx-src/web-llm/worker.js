/**
 * WebLLM Web Worker 진입점 (ES Module Worker)
 *
 * tsSupportAI.js 가 new Worker(".../web-llm/worker.js", { type: "module" }) 로 생성한다.
 * 모델 로딩/추론을 이 워커에서 수행하므로 메인(UI) 스레드가 멈추지 않는다.
 * web-llm.min.js 와 같은 폴더에 있어야 한다.
 */
import { WebWorkerMLCEngineHandler } from "./web-llm.min.js";

const handler = new WebWorkerMLCEngineHandler();
self.onmessage = (msg) => {
  handler.onmessage(msg);
};
