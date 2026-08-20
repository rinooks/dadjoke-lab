# 🔬 국립 아재개그연구소 (The Dad Joke Lab)

▶ https://dadjoke-lab.vercel.app

아재개그를 학술 논문처럼 다루는 연구소 컨셉의 웹사이트.
논문(개그) 아카이브, 실전 임상 실험 일지, AI 수석연구원 생성기, 연구원 적성검사.

## 스택
- 프론트: Vue 3 (CDN) + Tailwind (CDN) — 단일 `public/index.html`
- API: Vercel Functions (`api/[...path].js`)
- DB: Turso (libSQL)

## 로컬 실행
```bash
npm install
cp .env.example .env      # TURSO_DATABASE_URL / TURSO_AUTH_TOKEN 채우기
node --env-file=.env setup.mjs   # 테이블 생성 + 초기 논문 시딩 (1회)
npx vercel dev
node test.mjs             # 스모크 테스트
```

## 환경변수
| 이름 | 필수 | 용도 |
|---|---|---|
| `TURSO_DATABASE_URL` | ✅ | `libsql://...` |
| `TURSO_AUTH_TOKEN` | ✅ | Turso DB 토큰 |
| `ANTHROPIC_API_KEY` | ⬜ | AI 수석연구원. 없으면 로컬 폴백 개그 반환 |

## API
| | |
|---|---|
| `GET /api/jokes` | 논문 목록 |
| `POST /api/jokes` | 논문 등록 (냉각 온도는 서버가 매김) |
| `PATCH /api/jokes` | `{id}` 🧊 카운트 +1 |
| `GET /api/logs` | 임상 실험 일지 |
| `POST /api/logs` | 일지 등록 |
| `POST /api/ai` | `{topic, temperature}` → 신규 개그 |
