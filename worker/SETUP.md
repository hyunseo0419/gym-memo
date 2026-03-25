# Cloudflare Worker 배포 가이드

## 1. Wrangler CLI 설치
```bash
npm install -g wrangler
wrangler login
```

## 2. Worker 배포
```bash
cd worker
wrangler deploy
```

## 3. Secrets 등록 (키 안전하게 저장)
```bash
wrangler secret put NOTION_API_KEY
# 입력: (발급받은 프라이빗 Notion API Key 입력, 예: ntn_...)

wrangler secret put NOTION_WORKOUT_DB_ID
# 입력: 32e5ab94ca99806ea4f5d1f7bc9b6e72

wrangler secret put NOTION_DIET_DB_ID
# 입력: 32e5ab94ca9980e087f5c53dae72042e

wrangler secret put GEMINI_API_KEY
# 입력: (Google AI Studio에서 발급받은 키)
```

## 4. PWA .env 업데이트
배포 후 나오는 Worker URL을 .env에 입력:
```
VITE_WORKER_URL=https://gym-memo.your-subdomain.workers.dev
```
