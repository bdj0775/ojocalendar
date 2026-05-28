# CLAUDE.md — 오조캘린더 (OZO Calendar) 룰북

## 프로젝트 개요

숙소 운영자(1~수 개의 숙소)를 위한 **예약 관리 + 수익 분석 PWA**입니다.
- 앱 이름: **OZO Calendar** / **오조캘린더**
- 모바일 앱처럼 설치 가능한 PWA (iOS Safari, Android Chrome)
- 로그인한 단일 호스트가 자신의 숙소 데이터를 관리
- Supabase를 백엔드(DB + Auth)로 사용
- 배포: **Vercel** (main 브랜치 자동 배포)
- 랜딩 페이지 → 로그인 → 앱 (캘린더 / 대시보드 / 예약 목록 / 설정)

---

## 기술 스택

| 항목 | 버전/선택 |
|---|---|
| React | 19 |
| TypeScript | 6 |
| Vite | 8 |
| Tailwind CSS | v4 (`@tailwindcss/vite`) |
| 상태 관리 | Zustand v5 (`persist` 미들웨어) |
| 백엔드 | Supabase (PostgreSQL + Auth + Row-Level Security) |
| 차트 | Recharts v3 |
| 아이콘 | Lucide React |
| 라우팅 | React Router v7 |

---

## 개발 / 배포 명령어

```bash
npm run dev      # 로컬 개발 서버 (http://localhost:5173)
npm run build    # 프로덕션 빌드
npm run lint     # ESLint
npm run preview  # 빌드 결과 미리보기
```

- **Vercel**: `main` 브랜치 push → 자동 배포. Preview URL은 PR마다 생성됨.
- **환경변수**: Vercel 대시보드에서 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 설정.
- 빌드 전 lint + TypeScript 에러 없어야 함.

---

## 🚨 레드라인 — 반드시 상의 후 수정

아래 영역은 잘못 건드리면 데이터 유실, 사용자 로그아웃, 중복 예약 등 **복구하기 어려운 문제**가 생깁니다. 수정이 필요하면 반드시 먼저 설명하고 확인받을 것.

### 1. iCal 동기화 로직 (`src/services/icalSync/syncService.ts`)
- 채널 우선순위(Airbnb → Booking.com → Naver → Direct) 순차 실행으로 날짜 선점 방식 작동
- `guestname !== '새 예약'` 조건이 수동 수정 보호의 핵심 — 이 문자열 바꾸면 수동 입력한 예약 정보가 iCal 재동기화 시 덮어씌워짐
- 크로스채널 날짜 중복 스킵 로직 건드리면 동일 날짜에 복수 예약 생성될 수 있음

### 2. 인증 흐름 (`src/store/useStore.ts` — `initAuth()`)
- `state.isAuthenticated || !!session` 조건은 OAuth 교환 중 race condition 방지용 — 제거하면 구글/카카오 로그인 후 무한 로딩 발생
- `supabase.auth.onAuthStateChange` 리스너는 로그아웃 시 로컬 데이터 초기화도 담당 — 건드리면 다른 사용자가 이전 사용자 데이터를 볼 수 있음

### 3. DB 컬럼 매핑 (useStore.ts fetchData 및 insert/update 쿼리)
- DB는 snake_case(`guestname`, `checkin`, `checkout`, `bookingdate`), JS 타입은 camelCase(`guestName`, `checkIn`, `checkOut`, `bookingDate`)
- 새 필드 추가 시 DB 컬럼명과 JS 필드명을 **양쪽 모두** 정확히 매핑해야 함 — 한쪽만 바꾸면 데이터가 조용히 사라짐

### 4. Supabase RLS (Row-Level Security)
- 모든 테이블은 `host_id = auth.uid()` 기반 RLS 정책으로 보호됨
- **새 테이블 추가 시 RLS 정책도 반드시 함께 설정** — 없으면 모든 사용자 데이터가 전체 공개됨
- 스키마 변경은 코드가 아닌 Supabase 대시보드에서 직접

---

## 아키텍처 핵심 원칙

### 단일 Zustand 스토어
`src/store/useStore.ts` 하나로 모든 전역 상태를 관리합니다.
- 새 전역 상태가 필요하면 반드시 여기에 추가
- Context API나 별도 스토어를 만들지 말 것 (SidebarContext 예외)

### useDesktopStats — 모든 분석 계산의 허브
`src/hooks/useDesktopStats.ts`가 대시보드에 표시되는 **모든 KPI, 예측, 차트 데이터**를 계산합니다.
- 모바일(`Dashboard.tsx`)과 데스크탑(`DesktopDashboard.tsx`) 모두 이 훅을 공유
- 새 분석 지표는 여기서 계산하고 `DesktopStats` 타입(`src/types/index.ts`)에 추가
- **타입을 수정하면 훅의 return 객체도 반드시 함께 수정**

### 모바일 / 데스크탑 분리
- 모바일: `src/pages/Dashboard/`, `src/pages/Bookings/`, `src/pages/Calendar/`, `src/pages/Settings/`
- 데스크탑: `src/pages/DesktopDashboard/`, `src/pages/DesktopBookings/`, `src/pages/DesktopOverview/`, `src/pages/DesktopSettings/`
- `useMediaQuery('(min-width: 1024px)')` 기준으로 `App.tsx`에서 분기
- **데스크탑에 기능을 추가하면 모바일에도 동기화**할지 판단 후 적용

---

## 파일 구조

```
src/
├── App.tsx                  # 라우팅 + 인증 게이트
├── types/index.ts           # 모든 도메인 타입 (Booking, Property, DesktopStats 등)
├── store/useStore.ts        # 전역 상태 (Zustand)
├── hooks/
│   ├── useDesktopStats.ts   # KPI·예측·차트 데이터 계산
│   ├── useBookingPace.ts    # 예약 속도(Pace) 차트 데이터
│   ├── useLeadTimeReport.ts # 리드타임 분석
│   └── useTranslation.ts    # i18n (ko/en)
├── pages/
│   ├── Dashboard/           # 모바일 대시보드
│   ├── DesktopDashboard/    # 데스크탑 대시보드
│   └── ...
├── components/
│   └── Modals/              # 모달 컴포넌트
├── services/
│   ├── supabaseClient.ts    # Supabase 클라이언트 singleton
│   └── icalSync/            # iCal 동기화 로직 (⚠️ 레드라인)
└── utils/
    ├── colors.ts            # 채널/국적 색상 매핑
    └── translations.ts      # 번역 문자열
```

---

## 코딩 컨벤션

### TypeScript
- `any` 사용 금지. 타입을 모르면 `unknown`으로 시작 후 좁혀갈 것
- 새 도메인 타입은 반드시 `src/types/index.ts`에 추가
- `interface` 우선, 유니온/조건부 타입엔 `type` 사용

### React
- 함수형 컴포넌트 + 화살표 함수 스타일 일관 적용
- `useMemo` / `useCallback`은 계산 비용이 클 때만 사용 (과도한 메모이제이션 금지)
- JSX에서 인라인 함수 정의는 이벤트 핸들러에 한해서만

### Tailwind CSS v4
- 디자인 토큰 우선 사용: `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`
- 임의 색상값(`text-[#abc123]`) 지양. 토큰이 없으면 `text-slate-*` 스케일 사용
- 반응형은 `lg:` 브레이크포인트 기준 (1024px)

### i18n 규칙
- UI 텍스트는 항상 `ko ? '한국어' : 'English'` 형태로 인라인 처리
- `useTranslation()` 훅에서 `language`와 `ko` boolean을 가져와 사용
- **한국어가 primary**, 영어는 동등하게 관리

### 날짜 처리 — 반드시 지킬 것
- 날짜 문자열은 항상 `YYYY-MM-DD` ISO 형식
- Date 객체 생성 시 반드시 `new Date(str + 'T12:00:00')` 패턴 사용
- `new Date('YYYY-MM-DD')` 직접 사용 **금지** — UTC 자정 파싱으로 한국 시간대(UTC+9)에서 하루 앞으로 밀림

---

## 예측 알고리즘 (중요)

`useDesktopStats.ts`의 `computeForecast()` 함수는 복잡한 예약 예측 알고리즘을 포함합니다.
변경 전에 반드시 **`FORECAST_ALGORITHM.md`** 를 먼저 읽을 것.

핵심 개념:
- **OTB**: On-The-Books (현재 확정 예약 점유율)
- **τ (tau)**: 예약 도착 속도 상수 (최근 12개월로 자동 계산)
- **STLY**: Same Time Last Year (전년 동월 실적)
- **biasCurve**: D=0~90 전 구간 백테스트 편향 보정 커브
- 오픈 초기(첫 ≥3 예약 발생 월 기준 +3개월)는 STLY 참조에서 자동 제외

---

## 절대 하지 말 것

- `DesktopStats` 인터페이스 수정 후 `useDesktopStats.ts` return 객체 업데이트 빠뜨리기
- `new Date('YYYY-MM-DD')` 직접 생성 (→ `'T12:00:00'` 접미사 필수)
- Tailwind 클래스 대신 인라인 `style={{ color: '...' }}` 남발
- 새 전역 상태를 Context나 별도 useState로 분산시키기
- `console.log` 커밋에 포함
- `.env` 파일 커밋
- iCal syncService 로직을 설명 없이 리팩터링
- 새 Supabase 테이블 추가 후 RLS 정책 빠뜨리기

---

## 알려진 설계 결정 & 배경

| 결정 | 이유 |
|---|---|
| 모바일/데스크탑 페이지 분리 | 레이아웃 차이가 크고, 공유 컴포넌트보다 명확한 분리가 유지보수에 유리 |
| useDesktopStats 단일 훅 | 계산 로직 중복 방지. 모바일과 데스크탑이 항상 동일한 수치를 보여줘야 함 |
| Zustand persist | 새로고침 후에도 선택 월, 설정 등 유지 |
| 날짜 T12:00:00 패턴 | 한국(UTC+9) 환경에서 UTC 자정 파싱 시 하루 밀리는 버그 방지 |
| iCal 채널 순차 처리 | Airbnb가 날짜를 선점해야 Booking.com 중복 스킵이 정확히 작동 |
| 오픈 초기 제외 로직 | 시장 안착 전 데이터가 예측 왜곡. 첫 ≥3 예약 월 기준 +3개월 제외 |
| OAuth race condition 가드 | 구글/카카오 OAuth 교환 완료 전 getSession()이 먼저 null 반환하는 타이밍 문제 방지 |
