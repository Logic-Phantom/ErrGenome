/**
 * WebLLM Worker 파일
 * 
 * WebLLM을 Web Worker에서 실행하기 위한 핸들러입니다.
 * 
 * 주의: 최신 WebLLM(v0.2.80+)은 ES Module 기반이므로
 * 이 파일은 기본 구조만 제공하며, 실제 사용 시에는
 * WebLLM의 공식 Worker 예제를 참고하여 생성해야 합니다.
 * 
 * 참고: https://github.com/mlc-ai/web-llm/blob/main/examples/simple-chat/worker.ts
 */

// WebLLM Worker Handler를 사용하려면 ES Module 방식으로 import해야 합니다.
// 하지만 ES5 환경에서는 이것이 제한적이므로, 대안을 사용해야 할 수 있습니다.

console.log("[WebLLM Worker] Worker 파일이 로드되었습니다.");
console.log("[WebLLM Worker] 참고: 최신 WebLLM은 ES Module 기반이므로 별도 설정이 필요합니다.");

// 기본 Worker 메시지 핸들러
self.onmessage = function(event) {
  console.log("[WebLLM Worker] 메시지 수신:", event.data);
  
  // WebLLM Worker Handler는 ES Module 방식으로만 동작합니다.
  // 실제 구현을 위해서는 WebLLM의 공식 예제를 참고하세요.
  
  self.postMessage({
    type: "error",
    message: "WebLLM Worker는 ES Module 방식으로 구현되어야 합니다. " +
             "worker.ts 파일을 참고하여 TypeScript/ES Module로 빌드하세요."
  });
};

