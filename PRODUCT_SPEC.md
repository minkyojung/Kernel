# Istanbul — 크리에이터를 위한 콘텐츠 성과 자동화 시스템

> Anthropic 그로스마케터 Austin Lau의 1인 마케팅 자동화 시스템에서 영감을 받아,
> **개인 크리에이터**가 자신의 콘텐츠 성과를 구조적으로 추적·분석·개선할 수 있는 제품

---

## 1. 배경: Austin Lau의 시스템은 무엇이었나

### 1.1 핵심 사실

| 항목 | 내용 |
|------|------|
| **인물** | Austin Lau — Anthropic 최초의 그로스 마케팅 담당 (이전: Dropbox, Webflow, Notion) |
| **기간** | ~10개월간 혼자서 Paid Search, Paid Social, ASO, Email, SEO 6개 채널 운영 |
| **도구** | Claude Code + Agent Skills + MCP Server |
| **코딩 경험** | 제로. "How to open Terminal on Mac"을 구글링한 데서 시작 |
| **성과** | 광고 카피 제작 2시간→15분, 크리에이티브 산출량 10배 증가, Anthropic ARR $9B→$19B 구간 지원 |

### 1.2 시스템 아키텍처 (오스틴의 원본)

```
┌─────────────────────────────────────────────────────┐
│  Claude Code (터미널 인터페이스)                       │
│                                                     │
│  /rsa ← 커스텀 슬래시 커맨드                          │
│    ├── 캠페인 데이터 입력 (CSV)                       │
│    ├── Agent Skills 참조                             │
│    │    ├── 브랜드 톤 & 보이스                        │
│    │    ├── 제품 정확성 가이드                         │
│    │    └── Google Ads RSA 베스트 프랙티스             │
│    ├── Sub-Agent 1: 헤드라인 전용 (30자 제한)         │
│    ├── Sub-Agent 2: 디스크립션 전용 (90자 제한)       │
│    └── Output: CSV (15 헤드라인 + 4 디스크립션)       │
│                                                     │
│  Memory System                                      │
│    ├── 가설 기록                                     │
│    ├── 실험 결과 로깅                                │
│    └── 다음 라운드에 자동 피드백                       │
│                                                     │
│  MCP Server → Meta Ads API                          │
│    └── 실시간 광고 성과 쿼리 (대시보드 불필요)         │
│                                                     │
│  Figma Plugin                                       │
│    └── 100개 광고 변형 0.5초 만에 생성                │
└─────────────────────────────────────────────────────┘
```

### 1.3 오스틴 시스템의 핵심 원리 (우리가 가져갈 것)

1. **Memory Loop** — 과거 실험 결과가 다음 실험에 자동으로 반영되는 피드백 루프
2. **Agent Skills** — 도메인 지식(톤, 규칙, 베스트 프랙티스)을 구조화해 AI에 주입
3. **Sub-Agent 분업** — 하나의 태스크를 전문화된 서브 에이전트들이 분담
4. **API 직결** — 대시보드를 열지 않고 데이터를 직접 쿼리
5. **비코더 친화** — 코딩 경험 없이도 전체 워크플로우 구축 가능

---

## 2. 우리가 만들 제품: Istanbul

### 2.1 한 줄 정의

> **크리에이터가 콘텐츠를 발행할 때마다, 성과를 자동 수집하고 구조적으로 분석해서, 다음 콘텐츠에 적용할 액션 아이템을 생성하는 시스템**

### 2.2 오스틴 시스템 vs Istanbul 매핑

| Austin의 시스템 | Istanbul (크리에이터 버전) |
|----------------|--------------------------|
| Google/Meta 광고 성과 추적 | YouTube/Instagram/TikTok/X/Newsletter 성과 추적 |
| 광고 카피 A/B 테스트 결과 기록 | 콘텐츠 요소별 성과 분석 (썸네일, 제목, 훅, CTA 등) |
| Agent Skills (브랜드 가이드) | Creator Profile (내 톤, 타겟 오디언스, 콘텐츠 전략) |
| Memory System (가설+결과 로깅) | Content Journal (콘텐츠별 가설→결과→인사이트 루프) |
| /rsa 슬래시 커맨드 | /analyze, /brief, /review 등 크리에이터 워크플로우 커맨드 |
| Sub-Agent (헤드라인/디스크립션) | Sub-Agent (제목 생성/썸네일 분석/스크립트 리뷰 등) |
| MCP → Meta Ads API | MCP → YouTube Analytics, Instagram Insights, etc. |
| CSV 업로드/다운로드 | 자동 수집 + 대시보드 + 내보내기 |

---

## 3. JTBD (Jobs To Be Done)

### 3.1 Core Jobs

#### Job 1: 내 콘텐츠가 왜 잘 됐는지 / 안 됐는지 알고 싶다
```
When   새 콘텐츠를 발행한 후 24~72시간이 지났을 때
I want 성과 데이터를 한눈에 보고, 어떤 요소가 성과를 견인/저해했는지 구조적 분석을 받고 싶다
So that 감이 아닌 데이터 기반으로 다음 콘텐츠 방향을 결정할 수 있다
```

#### Job 2: 과거의 학습을 자동으로 다음에 반영하고 싶다
```
When   새 콘텐츠를 기획하기 시작할 때
I want 지금까지의 성과 패턴, 인사이트, 성공 공식이 자동으로 반영된 브리프를 받고 싶다
So that 매번 제로에서 시작하지 않고 누적 학습 위에서 개선할 수 있다
```

#### Job 3: 콘텐츠 전략을 체계적으로 관리하고 싶다
```
When   여러 플랫폼에서 다양한 포맷의 콘텐츠를 운영할 때
I want 전체 콘텐츠 포트폴리오의 성과를 통합 관리하고 전략적 판단을 내리고 싶다
So that 어떤 플랫폼, 포맷, 주제에 리소스를 집중할지 명확히 판단할 수 있다
```

#### Job 4: 반복 작업을 줄이고 창작에 집중하고 싶다
```
When   콘텐츠 제작과 함께 분석, 리포팅, 기획 문서 작업이 쌓일 때
I want 데이터 수집, 정리, 리포트 생성이 자동화되어 있으면 좋겠다
So that 나는 창작과 의사결정에만 시간을 쓸 수 있다
```

### 3.2 Secondary Jobs

| Job | 설명 |
|-----|------|
| **트렌드 감지** | 내 니치에서 떠오르는 주제/포맷을 빠르게 파악하고 싶다 |
| **경쟁자 벤치마크** | 비슷한 크리에이터 대비 내 성과 위치를 알고 싶다 |
| **수익 최적화** | 어떤 콘텐츠가 실제 수익(스폰서, 제휴, 유료 구독)으로 이어지는지 추적하고 싶다 |
| **청중 이해** | 내 오디언스가 누구이고, 무엇에 반응하는지 깊이 이해하고 싶다 |

---

## 4. 기능 정의

### 4.1 Core Feature: Content Journal (Memory Loop)

오스틴의 Memory System을 크리에이터 버전으로 재해석한 핵심 기능.

```
콘텐츠 발행
    ↓
[자동 수집] 24h / 48h / 7d / 30d 시점 성과 스냅샷
    ↓
[구조적 분석] AI가 성과 요인을 요소별로 분해
    ↓
[인사이트 추출] "이 콘텐츠에서 배운 것" 자동 생성
    ↓
[Journal 축적] 시간이 지날수록 나만의 성과 데이터베이스 구축
    ↓
[다음 콘텐츠] 과거 Journal을 참조해 브리프/제안 생성
    ↓
(반복)
```

**각 Journal Entry 구조:**

```yaml
content_id: "yt_20260322_ai_tools"
platform: youtube
published_at: "2026-03-22T09:00:00Z"
hypothesis: "AI 도구 리뷰는 검색 유입이 높을 것"

elements:
  title: "2026년 꼭 써야 할 AI 도구 7선"
  thumbnail_style: "숫자 리스트 + 인물 컷아웃"
  hook_type: "질문형 오프닝"
  length_minutes: 12
  cta: "댓글로 추천 도구 공유"
  tags: [AI, 도구, 생산성]

metrics:
  24h:
    views: 12400
    ctr: 8.2%
    avg_view_duration: "6:42"
    likes: 890
    comments: 134
  7d:
    views: 45000
    ctr: 7.8%
    avg_view_duration: "6:38"
    subscribers_gained: 320
  30d:
    views: 78000
    revenue: "$342"

analysis:
  what_worked:
    - "숫자 리스트 썸네일 → 평균 대비 CTR +2.1%p"
    - "질문형 오프닝 → 평균 시청 지속률 상위 20%"
  what_didnt:
    - "12분 길이 → 후반부 이탈률 높음 (8분 이후 급감)"
    - "CTA 위치가 너무 뒤 → 댓글 전환률 낮음"
  insights:
    - "이 니치에서 최적 영상 길이는 8-10분"
    - "CTA는 영상 중반(40-60% 지점)에 배치해야 효과적"

next_actions:
  - "다음 리스트형 콘텐츠 → 8분 이내로 제작"
  - "CTA를 5분 지점으로 이동"
```

### 4.2 Creator Profile (Agent Skills)

오스틴의 Agent Skills(브랜드 톤, 제품 가이드, 베스트 프랙티스)에 대응.

```yaml
creator_profile:
  identity:
    name: "테크 민교"
    niche: "AI/생산성 도구 리뷰"
    target_audience: "25-40세 지식노동자, 테크 얼리어답터"
    tone: "전문적이지만 친근, 실용주의적"

  platforms:
    youtube:
      subscribers: 45000
      avg_views: 15000
      posting_frequency: "주 2회"
      best_performing_format: "도구 비교 리뷰"
    instagram:
      followers: 12000
      avg_engagement_rate: 4.2%
      best_performing_format: "캐러셀 팁"
    newsletter:
      subscribers: 8000
      open_rate: 42%
      best_performing_format: "주간 큐레이션"

  content_strategy:
    pillars: ["AI 도구 리뷰", "생산성 팁", "업계 동향 분석"]
    differentiator: "실제 워크플로우에 적용한 결과 중심 리뷰"
    goals:
      - "6개월 내 YouTube 10만 구독자"
      - "뉴스레터 유료 전환률 5% 달성"

  rules:  # 오스틴의 "Brand Tone & Voice" 에 대응
    - "절대 과장하지 않는다"
    - "모든 리뷰에 직접 사용 경험을 포함한다"
    - "스폰서 콘텐츠도 솔직한 단점을 언급한다"
    - "썸네일에 낚시성 표현 사용하지 않는다"
```

### 4.3 슬래시 커맨드 (워크플로우)

오스틴의 `/rsa` 커맨드처럼, 크리에이터가 반복적으로 사용할 워크플로우를 커맨드화.

#### `/analyze` — 콘텐츠 성과 분석
```
입력: 콘텐츠 URL 또는 ID
처리:
  1. 플랫폼 API로 성과 데이터 자동 수집
  2. Creator Profile 참조하여 "내 기준" 대비 성과 평가
  3. Content Journal 과거 데이터와 비교
  4. 요소별 분해 분석 (제목, 썸네일, 훅, 길이, CTA 등)
출력: 구조화된 분석 리포트 + Journal Entry 자동 저장
```

#### `/brief` — 다음 콘텐츠 브리프 생성
```
입력: 주제 키워드 또는 아이디어 (선택)
처리:
  1. Content Journal에서 관련 인사이트 자동 검색
  2. Creator Profile의 전략/규칙 참조
  3. 최근 성과 트렌드 반영
  4. Sub-Agent 분업:
     ├── Title Agent: 제목 후보 5개 생성 (과거 CTR 데이터 기반)
     ├── Hook Agent: 오프닝 후보 3개 생성
     └── Structure Agent: 콘텐츠 구조 제안
출력: 실행 가능한 콘텐츠 브리프
```

#### `/review` — 발행 전 콘텐츠 리뷰
```
입력: 제목, 썸네일, 스크립트/원고
처리:
  1. Creator Profile의 rules 체크 (브랜드 일관성)
  2. Content Journal의 성과 패턴 대조
  3. 제목/썸네일 CTR 예측 (과거 데이터 기반)
  4. 개선 제안 생성
출력: 체크리스트 + 개선안 + 예상 성과 범위
```

#### `/report` — 주간/월간 성과 리포트
```
입력: 기간 (기본: 최근 7일)
처리:
  1. 해당 기간 전체 콘텐츠 성과 집계
  2. 기간 대비 트렌드 분석 (성장/하락 지표)
  3. 최고/최저 성과 콘텐츠 원인 분석
  4. 다음 기간 추천 액션 생성
출력: 대시보드 뷰 + 실행 가능한 추천 사항
```

### 4.4 플랫폼 연동 (MCP Servers)

오스틴이 Meta Ads API를 MCP로 연결한 것처럼, 크리에이터 플랫폼 API를 MCP로 연동.

| 플랫폼 | 수집 데이터 | 우선순위 |
|--------|------------|---------|
| **YouTube** | 조회수, CTR, 시청지속률, 구독자 변화, 수익, 댓글 감성 | P0 |
| **Instagram** | 노출, 도달, 참여율, 저장수, 공유수, 프로필 방문 | P0 |
| **TikTok** | 조회수, 완주율, 공유수, 팔로워 변화 | P1 |
| **X (Twitter)** | 노출, 참여율, 리트윗, 인용, 프로필 클릭 | P1 |
| **Newsletter** (Beehiiv/Substack) | 오픈률, 클릭률, 구독자 변화, 이탈률 | P1 |
| **Podcast** (Spotify/Apple) | 재생수, 완청률, 팔로워 변화 | P2 |
| **Blog** (GA4) | 페이지뷰, 체류시간, 이탈률, 유입 경로 | P2 |

### 4.5 AI 분석 엔진

#### 요소별 분해 분석 (Element Decomposition)

각 콘텐츠를 구성 요소로 분해하여 어떤 요소가 성과에 기여했는지 추적:

```
콘텐츠 요소 분류:
├── Discovery Layer (발견)
│   ├── 제목/헤드라인
│   ├── 썸네일/커버 이미지
│   ├── 해시태그/키워드
│   └── 발행 시간
├── Retention Layer (유지)
│   ├── 훅/오프닝 (첫 3초/30초)
│   ├── 구조/흐름
│   ├── 길이/분량
│   └── 편집/비주얼 퀄리티
├── Engagement Layer (참여)
│   ├── CTA (위치, 문구, 방식)
│   ├── 질문/참여 유도 요소
│   └── 감정적 트리거
└── Conversion Layer (전환)
    ├── 구독/팔로우 유도
    ├── 외부 링크 클릭
    └── 수익 연결 (스폰서, 제휴, 유료)
```

#### 패턴 인식 (Pattern Recognition)

Content Journal이 축적되면 AI가 자동으로 패턴을 감지:

- "리스트형 제목이 질문형 제목 대비 CTR 1.5배 높음"
- "8-10분 영상이 15분+ 영상보다 시청지속률 20% 높음"
- "화요일 오전 발행이 주말 발행 대비 초기 24h 조회수 40% 높음"
- "캐러셀 포맷이 단일 이미지 대비 저장률 3배"

---

## 5. 기술 스펙

### 5.1 시스템 아키텍처

```
┌─────────────────────────────────────────────────┐
│                  Istanbul Core                   │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ CLI/Web  │  │ Workflow │  │   AI Engine  │  │
│  │Interface │→ │ Engine   │→ │  (Claude API)│  │
│  │          │  │ /analyze │  │              │  │
│  │ /brief   │  │ /brief   │  │ Sub-Agents:  │  │
│  │ /review  │  │ /review  │  │ ├ Title      │  │
│  │ /report  │  │ /report  │  │ ├ Hook       │  │
│  │          │  │          │  │ ├ Structure  │  │
│  └──────────┘  └──────────┘  │ └ Analysis   │  │
│                              └──────────────┘  │
│  ┌──────────────────────────────────────────┐   │
│  │          Content Journal (DB)            │   │
│  │  ├── entries (콘텐츠별 성과+분석)          │   │
│  │  ├── insights (추출된 인사이트)            │   │
│  │  ├── patterns (감지된 패턴)               │   │
│  │  └── creator_profile (크리에이터 설정)     │   │
│  └──────────────────────────────────────────┘   │
│                                                  │
│  ┌──────────────────────────────────────────┐   │
│  │         MCP Platform Connectors          │   │
│  │  ├── YouTube Analytics API               │   │
│  │  ├── Instagram Graph API                 │   │
│  │  ├── TikTok API                          │   │
│  │  ├── X API                               │   │
│  │  ├── Newsletter APIs                     │   │
│  │  └── GA4 API                             │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

### 5.2 기술 스택 (제안)

| 레이어 | 기술 | 이유 |
|--------|------|------|
| **인터페이스** | Next.js (Web) + CLI (Node.js) | 웹 대시보드 + 파워유저용 CLI 동시 지원 |
| **AI 엔진** | Claude API (Anthropic SDK) | Sub-Agent 패턴, 긴 컨텍스트 지원 |
| **데이터베이스** | PostgreSQL + pgvector | 구조화 데이터 + 인사이트 벡터 검색 |
| **플랫폼 연동** | MCP Servers (TypeScript) | 각 플랫폼 API를 표준화된 인터페이스로 |
| **스케줄링** | Cron Jobs (자동 수집) | 24h/48h/7d/30d 시점 자동 스냅샷 |
| **인증** | OAuth 2.0 | 플랫폼 API 연동에 필수 |
| **배포** | Vercel (Web) + npm (CLI) | 빠른 배포, 크리에이터 접근성 |

### 5.3 데이터 모델

```sql
-- 크리에이터 프로필
creators
  id, name, niche, target_audience, tone, rules[], strategy{}

-- 플랫폼 연결
platform_connections
  id, creator_id, platform, oauth_tokens, connected_at

-- 콘텐츠 엔트리
contents
  id, creator_id, platform, external_id, url
  title, description, format, tags[]
  hypothesis, published_at

-- 성과 스냅샷 (시점별)
metrics_snapshots
  id, content_id, snapshot_at, hours_since_publish
  metrics{} -- 플랫폼별 유연한 JSON

-- 분석 결과
analyses
  id, content_id, analyzed_at
  elements{}, what_worked[], what_didnt[], insights[]

-- 인사이트 (벡터 검색용)
insights
  id, creator_id, content_id, insight_text
  category, confidence, embedding vector(1536)

-- 패턴
patterns
  id, creator_id, pattern_text, evidence_count
  first_detected, last_confirmed, confidence
```

---

## 6. MVP 범위 (Phase 1)

### 6.1 포함

- [x] YouTube 연동 (MCP Server 1개)
- [x] Content Journal 기본 구조 (수동 입력 + API 자동 수집)
- [x] `/analyze` 커맨드 (단일 콘텐츠 분석)
- [x] `/brief` 커맨드 (과거 Journal 기반 브리프 생성)
- [x] Creator Profile 설정
- [x] 기본 웹 대시보드 (콘텐츠 목록 + 성과 트렌드)
- [x] 24h/7d 자동 스냅샷

### 6.2 미포함 (Phase 2+)

- [ ] Instagram, TikTok, X 연동
- [ ] `/review` 커맨드 (발행 전 리뷰)
- [ ] `/report` 커맨드 (주간/월간 리포트)
- [ ] 패턴 자동 감지
- [ ] 경쟁자 벤치마크
- [ ] 수익 추적
- [ ] CLI 인터페이스
- [ ] 팀 협업 기능

---

## 7. 경쟁 환경과 차별화

### 7.1 기존 도구들의 한계

| 도구 | 하는 것 | 못 하는 것 |
|------|---------|-----------|
| **YouTube Studio** | 기본 성과 지표 | 요소별 분해 분석, 크로스 플랫폼, 누적 학습 |
| **Buffer/Hootsuite** | 스케줄링, 기본 분석 | 심층 분석, AI 인사이트, 콘텐츠 전략 연결 |
| **Sprout Social** | 종합 소셜 관리 | 크리에이터 특화 (기업 마케터 타겟), 비쌈 ($249/mo+) |
| **Metricool** | 다채널 분석 | AI 기반 인사이트 없음, 누적 학습 없음 |
| **VidIQ/TubeBuddy** | YouTube SEO | 단일 플랫폼, 분석보다 키워드 도구 |

### 7.2 Istanbul의 차별점

1. **Memory Loop** — 단순 대시보드가 아닌, 시간이 갈수록 똑똑해지는 분석 시스템
2. **요소별 분해** — "조회수가 낮다"가 아닌 "썸네일 CTR은 높은데 시청지속률이 낮다 → 콘텐츠 구조 문제" 수준의 진단
3. **AI 네이티브** — 대시보드 위에 AI를 얹은 게 아니라, AI가 코어인 분석 엔진
4. **실행 가능한 아웃풋** — 인사이트에 그치지 않고, 다음 콘텐츠 브리프까지 자동 생성
5. **비코더 친화** — 오스틴처럼 코딩 없이도 파워풀한 자동화 구축 가능

---

## 8. 사용자 시나리오

### 시나리오 1: 일상적 콘텐츠 분석

```
크리에이터 민교: YouTube 영상 발행 후 48시간 경과

Istanbul 자동 알림:
"[AI 도구 7선] 48h 성과 스냅샷이 준비되었습니다."

민교: /analyze yt_20260322_ai_tools

Istanbul:
📊 48h 성과 요약
━━━━━━━━━━━━━━━
조회수: 12,400 (내 평균 대비 +24%)
CTR: 8.2% (내 평균 6.1% 대비 +2.1%p)  ← 🟢 제목/썸네일 효과
시청지속률: 56% (내 평균 62% 대비 -6%p) ← 🔴 주의

요소별 분석:
✅ 제목 "2026년 꼭 써야 할 AI 도구 7선"
   → 숫자+연도 조합, 과거 데이터 상 CTR 상위 패턴과 일치
✅ 썸네일: 숫자 리스트형
   → 지난 5개 리스트형 썸네일 평균 CTR 7.8%, 이번 8.2%
🔴 시청지속률 급감 지점: 8:20 (12분 영상의 69%)
   → Content Journal 패턴: 이 니치에서 10분 초과 시 후반 이탈 심화
🟡 CTA (11:30 지점): 댓글 134개 (평균 180 대비 -26%)
   → CTA가 영상 후반(95%)에 위치 → 이탈 후 노출 부족

📝 Journal에 기록된 인사이트:
  1. 리스트형 콘텐츠 최적 길이: 8-10분 (확신도 ↑, 3번째 확인)
  2. CTA는 영상 40-60% 지점이 최적 (확신도 중, 추가 검증 필요)

→ Journal에 자동 저장되었습니다.
```

### 시나리오 2: 다음 콘텐츠 기획

```
민교: /brief "Claude Code 활용법"

Istanbul:
(Content Journal에서 관련 인사이트 31건 검색 중...)

📋 콘텐츠 브리프: Claude Code 활용법
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 전략적 판단 (Journal 기반):
- AI 도구 카테고리 최근 30일 평균 성과: 조회수 18K, CTR 7.1%
- "활용법/튜토리얼" 포맷 성과: 조회수 평균 +15%, 구독 전환 +22%
- 추천 길이: 8-10분 (Journal 패턴 #12: 이 길이 최적)

📝 제목 후보 (Title Agent):
1. "Claude Code 이것만 알면 됩니다 — 비개발자 가이드" (예상 CTR: 7.5-8.5%)
2. "코딩 몰라도 OK: Claude Code 실전 활용 5단계" (예상 CTR: 7.0-8.0%)
3. "Claude Code로 업무 자동화하는 법 (실제 사례)" (예상 CTR: 6.8-7.8%)

🎣 훅 후보 (Hook Agent):
1. 화면 녹화 오프닝: "이 작업, 원래 2시간 걸렸는데..." → 30초 타임랩스
2. 질문형: "터미널 열어본 적 없는 사람이 자동화 시스템을 만들 수 있을까?"
3. 결과 먼저: 완성된 자동화 결과 → "이걸 코딩 없이 만들었습니다"

📐 구조 제안 (Structure Agent):
  00:00 - 훅 (결과 먼저 보여주기)
  00:30 - 맥락 설명 (왜 이게 중요한지)
  01:30 - 준비 과정 (설치/설정)
  03:00 - 핵심 활용법 3가지
  07:00 - 실전 데모
  08:30 - CTA (← Journal 패턴: 40-60% 지점)
  09:00 - 마무리 + 다음 예고

⚠️ 과거 학습 적용됨:
- 길이 10분 이내로 설계 (Journal 패턴 #12)
- CTA를 8:30 지점에 배치 (Journal 인사이트 #47)
- 숫자형 제목 우선 추천 (Journal 패턴 #3)
```

---

## 9. 비즈니스 모델

| 티어 | 가격 | 포함 |
|------|------|------|
| **Free** | $0/mo | 1 플랫폼, 월 5회 /analyze, 기본 Journal |
| **Creator** | $19/mo | 3 플랫폼, 무제한 분석, /brief + /review, 패턴 감지 |
| **Pro** | $49/mo | 전체 플랫폼, 자동 리포트, 수익 추적, 우선 API 할당 |

---

## 10. 성공 지표

| 지표 | 목표 (6개월) |
|------|-------------|
| MAU | 1,000 크리에이터 |
| Journal Entries 생성 | 10,000+ |
| /analyze → /brief 전환율 | 40%+ (분석 후 다음 콘텐츠에 활용) |
| 사용자 콘텐츠 성과 개선 | 평균 CTR +1.5%p, 참여율 +20% |
| NPS | 50+ |

---

## Sources

- [How Anthropic uses Claude in Marketing](https://claude.com/blog/how-anthropic-uses-claude-marketing)
- [A Non-Coder Single-Handedly Managed Anthropic's Entire Growth Marketing for Ten Months — TechFlow](https://www.techflowpost.com/en-US/article/30652)
- [Anthropic's Entire Growth Marketing Team Was Just One Man — Medium](https://medium.com/@impactnews-wire/anthropics-entire-growth-marketing-team-was-just-one-man-bc10b73f796f)
- [Aakash Gupta's breakdown on X](https://x.com/aakashgupta/status/2031950999221575726)
- [Passionfroot AMA: Austin Lau on Building your Growth Engine](https://www.passionfroot.me/blog/anthropics-austin-lau-on-building-your-growth-engine)
- [How Anthropic teams use Claude Code](https://claude.com/blog/how-anthropic-teams-use-claude-code)
- [Anthropic automates ad production with Claude Code — GIGAZINE](https://gigazine.net/gsc_news/en/20260225-how-anthropic-uses-claude-marketing/)
- [Analytics Dashboard for Creators: 2026 Guide — InfluenceFlow](https://influenceflow.io/resources/analytics-dashboard-for-creators-complete-guide-to-tracking-growing-monetizing-in-2026/)
- [Creator Economy Market Size & Trends 2026](https://theinfluencermarketingfactory.com/creator-economy/)
