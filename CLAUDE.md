# WATCH 생활습관 앱 — 프로젝트 가이드

## 프로젝트 개요

바람나무숲(Wind And Tree, Creative Hub) 교육연구소의 WATCH 생활습관 루틴 앱.
청소년이 매일 **수면(Heal)→학습(Think)→독서(Absorb)→놀이(Create)→성찰(Wonder)** 5영역의 생활습관을 루틴하게 실천하도록 돕는 웹앱.

- **연동 대상**: baram-connect.vercel.app (순수 HTML/CSS/JS SPA, 별도 레포)
- **연동 방식**: baram-connect에 아이콘 링크 추가 → 이 앱으로 이동
- **본 프로젝트**: 별도 Next.js + Supabase 앱 (독립 레포, 독립 Vercel 배포)

## 기술 스택

| 영역 | 기술 | 비고 |
|------|------|------|
| 프레임워크 | Next.js 14 (App Router) | JavaScript (TypeScript 아님) |
| 스타일 | Tailwind CSS | shadcn/ui 필요 시 추가 |
| 백엔드/DB | Supabase (PostgreSQL + Auth + RLS) | 기존 Supabase 프로젝트와 별도 |
| 배포 | Vercel (Hobby Plan) | GitHub 연동 자동배포 |
| 차트 | Recharts | 주간/월간 리포트용 |

## 사용자 유형

| 모드 | 대상 | 핵심 기능 |
|------|------|-----------|
| 학부모 모드 | 초등 1~4학년 자녀의 부모 | 자녀 루틴 설정, 완료 체크, 주간 리포트 |
| 학생 모드 | 초등 5학년~중등 | 스스로 루틴 설정, 자기 체크, 성찰 기록 |

## WATCH 5영역 일일 루틴 순서

1. **H (Heal/수면)** — 기상: 기상 시각 기록, 수면 질 평가
2. **T (Think/학습)** — 오전~오후: 학습 목표 설정, 완료 체크
3. **A (Absorb/독서)** — 오후~저녁: 독서 시간 기록, 읽은 책 메모
4. **C (Create/놀이)** — 오후: 신체활동/창작놀이 기록
5. **W (Wonder/성찰)** — 취침 전: 감사 3가지, 성찰 일기
6. **H (Heal/수면)** — 취침: 취침 시각 기록

> 하루가 Heal로 시작하고 Heal로 끝나는 구조 (수면이 모든 습관의 토대)

## Supabase DB 스키마

```sql
-- 1. 사용자 프로필
CREATE TABLE watch_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT CHECK (role IN ('student', 'parent')) NOT NULL,
  display_name TEXT NOT NULL,
  grade TEXT, -- 학년 (예: '초3', '중1')
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 학부모-자녀 연결
CREATE TABLE watch_parent_child (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_id UUID REFERENCES watch_profiles(id) ON DELETE CASCADE NOT NULL,
  child_id UUID REFERENCES watch_profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(parent_id, child_id)
);

-- 3. 루틴 설정 (영역별)
CREATE TABLE watch_routines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES watch_profiles(id) ON DELETE CASCADE NOT NULL,
  domain TEXT CHECK (domain IN ('wonder', 'absorb', 'think', 'create', 'heal')) NOT NULL,
  title TEXT NOT NULL,
  time_slot TEXT, -- 'morning', 'afternoon', 'evening', 'bedtime'
  duration_minutes INT,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. 일일 실천 기록
CREATE TABLE watch_daily_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES watch_profiles(id) ON DELETE CASCADE NOT NULL,
  routine_id UUID REFERENCES watch_routines(id) ON DELETE CASCADE NOT NULL,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(routine_id, log_date)
);

-- 5. Wonder 성찰 일기
CREATE TABLE watch_reflections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES watch_profiles(id) ON DELETE CASCADE NOT NULL,
  reflection_date DATE NOT NULL DEFAULT CURRENT_DATE,
  gratitude_1 TEXT,
  gratitude_2 TEXT,
  gratitude_3 TEXT,
  journal TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, reflection_date)
);

-- 6. Absorb 독서 기록
CREATE TABLE watch_reading_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES watch_profiles(id) ON DELETE CASCADE NOT NULL,
  book_title TEXT NOT NULL,
  pages_read INT,
  memo TEXT,
  started_at DATE,
  completed_at DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Heal 수면 기록
CREATE TABLE watch_sleep_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES watch_profiles(id) ON DELETE CASCADE NOT NULL,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  wake_time TIME,
  sleep_time TIME,
  sleep_quality INT CHECK (sleep_quality BETWEEN 1 AND 5),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, log_date)
);
```

### RLS 정책 (중요!)

```sql
-- 모든 테이블에 RLS 활성화
ALTER TABLE watch_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE watch_routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE watch_daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE watch_reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE watch_reading_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE watch_sleep_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE watch_parent_child ENABLE ROW LEVEL SECURITY;

-- watch_profiles: 본인 프로필만 조회/수정
CREATE POLICY "Users can view own profile"
  ON watch_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON watch_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 학부모는 연결된 자녀 프로필도 조회 가능
CREATE POLICY "Parents can view children profiles"
  ON watch_profiles FOR SELECT
  USING (
    id IN (
      SELECT child_id FROM watch_parent_child
      WHERE parent_id IN (
        SELECT id FROM watch_profiles WHERE user_id = auth.uid()
      )
    )
  );
```

> ⚠️ RLS 정책은 Phase 1에서 기본만 설정하고, 기능 추가 시 점진적으로 확장할 것.
> PEP 앱 개발 때 RLS 충돌이 반복 문제였으므로, 새 정책 추가 전 반드시 기존 정책 목록 확인.

## 파일 구조

```
watch-app/
├── app/
│   ├── layout.js              # 루트 레이아웃 (Supabase Provider)
│   ├── page.js                # 랜딩/로그인 페이지
│   ├── login/
│   │   └── page.js            # 로그인 화면
│   ├── signup/
│   │   └── page.js            # 회원가입 (역할 선택 포함)
│   ├── dashboard/
│   │   └── page.js            # 오늘의 WATCH (메인 화면)
│   ├── routine/
│   │   └── page.js            # 루틴 설정
│   ├── wonder/
│   │   └── page.js            # 성찰 기록
│   ├── absorb/
│   │   └── page.js            # 독서 기록
│   ├── report/
│   │   └── page.js            # 주간/월간 리포트
│   └── auth/
│       └── callback/route.js  # Supabase Auth 콜백
├── components/
│   ├── WatchCard.js           # WATCH 영역 카드 컴포넌트
│   ├── BottomNav.js           # 하단 네비게이션
│   └── StreakBadge.js         # 연속 달성 배지
├── lib/
│   └── supabase.js            # Supabase 클라이언트
├── .env.local                 # Supabase 환경변수
└── CLAUDE.md                  # 이 파일
```

## 디자인 가이드

### 색상

| 용도 | 색상코드 | 비고 |
|------|----------|------|
| Primary (브랜드) | #0D9488 | teal, WATCH 로고 색 |
| Wonder | #0D9488 | 성찰 — 초록 |
| Absorb | #0891B2 | 독서 — 청록 |
| Think | #7C3AED | 학습 — 보라 |
| Create | #EA580C | 놀이 — 주황 |
| Heal | #059669 | 수면 — 녹색 |

### 모바일 우선

- 주 사용자가 스마트폰 사용 → 모바일 퍼스트 디자인
- 하단 고정 네비게이션 바 (홈/루틴/성찰/독서/리포트)
- 큰 터치 타겟 (최소 44px)
- PWA 지원 (홈 화면 추가 가능)

## 개발 단계 (Phase)

### Phase 1 (현재) — 기반 구축
- [ ] Next.js 프로젝트 생성 (create-next-app)
- [ ] Supabase 프로젝트 생성 + 테이블 SQL 실행
- [ ] Supabase Auth 연동 (이메일+비밀번호)
- [ ] 회원가입 시 역할 선택 (학생/학부모)
- [ ] watch_profiles 테이블 연동
- [ ] 기본 라우트 구조 확인
- [ ] GitHub 레포 생성 + Vercel 배포

### Phase 2 — 메인 화면
- [ ] 오늘의 WATCH 대시보드 (5영역 카드)
- [ ] 각 영역 체크/완료 기능
- [ ] 완료 시 시각적 피드백

### Phase 3 — 세부 기능
- [ ] 루틴 설정 CRUD
- [ ] Wonder 성찰 기록 (감사 3가지 + 일기)
- [ ] Absorb 독서 기록 (책 제목, 페이지, 메모)

### Phase 4 — 리포트 + 학부모
- [ ] 주간/월간 실천율 차트 (Recharts)
- [ ] 연속 달성 스트릭
- [ ] 학부모-자녀 연결 + 학부모 리포트 조회

### Phase 5 — 완성
- [ ] 성장 나무 게이미피케이션
- [ ] PWA 설정 (next-pwa)
- [ ] 알림 기능

## ⚠️ 주의사항 (PEP 앱 개발 경험에서 배운 것)

### 반드시 지킬 것
1. **패키지 설치 후 터미널 재시작**: npm install 후 반드시 개발 서버 재시작
2. **Supabase 라이브러리**: `@supabase/supabase-js`와 `@supabase/ssr`만 사용. `@supabase/auth-helpers-nextjs`는 사용하지 말 것 (호환성 문제)
3. **RLS 정책 충돌 방지**: 새 RLS 정책 추가 전 `SELECT * FROM pg_policies WHERE tablename = '테이블명'`으로 기존 정책 확인
4. **환경변수**: `.env.local`에 `NEXT_PUBLIC_SUPABASE_URL`과 `NEXT_PUBLIC_SUPABASE_ANON_KEY`만 사용
5. **Git 커밋**: 기능 단위로 작은 커밋. 큰 변경 전 반드시 커밋해두기

### 하지 말 것
- TypeScript 사용하지 말 것 (JavaScript로 통일)
- `@supabase/auth-helpers-nextjs` 설치하지 말 것
- RLS 정책을 한꺼번에 복잡하게 만들지 말 것
- `app/` 디렉토리 외에 `pages/` 디렉토리 사용하지 말 것 (App Router 전용)

## 관련 프로젝트 참고

- **baram-connect**: GitHub `baram-star/baram-connect` — 바람나무숲 소개 사이트 (순수 HTML SPA, Google Sheets 백엔드)
- **PEP 앱 (my-watch)**: GitHub `baram-star/my-watch` — Next.js + Supabase 교육앱 (기술 스택 동일, 참고용)

## 소유자 정보

- GitHub 계정: baram-star
- 맥북 사용자명: barammac
- Vercel: Hobby Plan
- Supabase: Free Plan (WATCH 앱용 별도 프로젝트 생성 필요)
