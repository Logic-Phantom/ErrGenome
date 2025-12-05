# WebLLM 모델 다운로드 오류 해결 가이드

## 발생한 오류

```
NetworkError: Failed to execute 'add' on 'Cache': Cache.add() encountered a network error
net::ERR_FAILED 200 (OK)
```

## 문제 원인

1. **모델 크기**: Llama-3.1-8B 모델은 매우 큽니다 (약 82개의 shard 파일, 수 GB)
2. **네트워크/캐시 문제**: 모델 다운로드 중 캐시 API 또는 네트워크 요청 실패
3. **CORS 또는 크기 제한**: 브라우저의 다운로드 크기 제한

## 해결 방법

### 방법 1: 더 작은 모델 사용 (권장)

현재 코드는 이미 더 작은 모델(`Qwen2.5-0.5B-Instruct`)로 변경되었습니다.

**다른 작은 모델 옵션:**
- `Qwen2.5-0.5B-Instruct-q4f32_1-MLC` ✅ (현재 사용 중)
- `Phi-3-mini-4k-instruct-q4f32_1-MLC` (약 3.8B 파라미터, 더 정확함)
- `TinyLlama-1.1B-Chat-v1.0-q4f32_1-MLC` (약 1.1B 파라미터)

### 방법 2: 모델 이름 변경

`tsSupportAI.js` 파일에서 모델 이름을 변경:

```javascript
// 134번 줄 근처
var modelName = "Phi-3-mini-4k-instruct-q4f32_1-MLC";  // 더 큰 모델 (더 정확)
// 또는
var modelName = "TinyLlama-1.1B-Chat-v1.0-q4f32_1-MLC";  // 중간 크기
```

### 방법 3: 브라우저 캐시 문제 해결

1. **브라우저 캐시 삭제**
   - Chrome: F12 → Application → Clear storage → Clear site data
   - Firefox: F12 → Storage → Clear All

2. **시크릿 모드에서 테스트**
   - 캐시 없이 깨끗한 상태로 테스트

### 방법 4: 네트워크 문제 해결

1. **인터넷 연결 확인**
   - HuggingFace 접근 가능 여부 확인
   - `https://mlc.ai/models` 접속 테스트

2. **방화벽/보안 소프트웨어 확인**
   - WebLLM이 모델을 다운로드하는 것을 차단하지 않는지 확인

3. **프록시 설정 확인**
   - 프록시가 WebLLM 모델 다운로드를 방해하지 않는지 확인

## 지원되는 모델 목록

전체 모델 목록: https://mlc.ai/models

**추천 작은 모델 (빠른 로딩):**
1. `Qwen2.5-0.5B-Instruct-q4f32_1-MLC` ✅ (현재 사용, 가장 작음)
2. `TinyLlama-1.1B-Chat-v1.0-q4f32_1-MLC` (약 1.1B)
3. `Phi-3-mini-4k-instruct-q4f32_1-MLC` (약 3.8B, 더 정확)

**중간 크기 모델:**
- `Qwen2.5-1.5B-Instruct-q4f32_1-MLC`
- `Phi-3-mini-128k-instruct-q4f32_1-MLC`

**큰 모델 (더 정확하지만 느림):**
- `Llama-3.1-8B-Instruct-q4f32_1-MLC` (원래 사용하던 모델)

## 모델 변경 방법

1. `clx-src/tsSupportAI.js` 파일 열기
2. 약 132번 줄의 `modelName` 변수 찾기
3. 원하는 모델 이름으로 변경

```javascript
var modelName = "Qwen2.5-0.5B-Instruct-q4f32_1-MLC";  // 변경할 모델 이름
```

## 첫 로드 시 주의사항

- 첫 로드 시 모델을 다운로드해야 하므로 시간이 걸릴 수 있습니다 (수 분)
- 다운로드된 모델은 브라우저 캐시에 저장되어 다음 로드는 더 빠릅니다
- 모델 크기에 따라 다운로드 시간이 달라집니다:
  - 0.5B 모델: 약 300MB
  - 1.5B 모델: 약 900MB
  - 8B 모델: 약 4-5GB

## 현재 설정

현재 코드는 가장 작은 모델(`Qwen2.5-0.5B-Instruct`)을 사용하도록 설정되어 있습니다.

- ✅ 빠른 로딩
- ✅ 낮은 메모리 사용
- ✅ 빠른 응답
- ⚠️ 정확도는 큰 모델보다 낮을 수 있음

## 추가 참고사항

- 모델은 HuggingFace에서 자동으로 다운로드됩니다
- 브라우저 캐시에 저장되므로 재사용 가능
- 오프라인에서는 사용할 수 없습니다 (모델 다운로드 필요)

