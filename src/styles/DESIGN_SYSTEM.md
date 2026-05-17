# Design System 가이드

> 이 앱의 모든 시각적 값(색상, 폰트, 간격, 그림자 등)은 **토큰**으로 관리됩니다.  
> 컴포넌트를 작성할 때 `#2563eb`, `10px`, `rgba(0,0,0,0.3)` 같은 하드코딩은 하지 않습니다.  
> 토큰을 쓰면 브랜드 색상 하나를 바꿀 때 파일 하나만 수정하면 전체가 반영됩니다.

---

## 폴더 구조

```
src/
├── index.css                      ← 앱 진입 CSS (토큰 import 오케스트레이터 + 글로벌 리셋)
├── styles/
│   └── tokens/
│       ├── color.css              ← 시맨틱 색상 변수 (light/dark) + Tailwind @theme 매핑
│       ├── typography.css         ← 폰트 패밀리, 타입 스케일 (크기·굵기·자간·줄높이)
│       ├── elevation.css          ← z-index 레이어, 그림자(shadow) 토큰
│       ├── border.css             ← 픽셀 고정 border-radius 토큰 + rounded-* 유틸리티
│       ├── spacing.css            ← 4px 스케일 밖 미세 간격 유틸리티 (gap-micro, py-btn 등)
│       └── layout.css             ← 앱 구조 치수 상수 (nav, sidebar, calendar, chart)
├── lib/
│   └── iconSizes.ts               ← 아이콘 크기 5단계 상수 (xs/sm/md/base/lg)
└── components/
    └── ui/
        ├── Typography.tsx         ← 타입 스케일 React 컴포넌트 (type-* 클래스 래퍼)
        ├── Button.tsx             ← 기본 버튼 (primary/secondary/danger/ghost)
        ├── Input.tsx              ← 기본 인풋 (label 포함)
        └── Badge.tsx              ← 상태 뱃지 (confirmed/checked-in/pending/completed)
```

**로딩 순서 (index.css import 순):**
`color → typography → elevation → border → layout → spacing`
spacing이 layout 뒤에 오는 이유: `--nav-clearance` 변수 참조가 필요하기 때문.

---

## 1. 색상 토큰 — `src/styles/tokens/color.css`

색상은 두 층으로 나뉩니다.

### 시맨틱 변수 (`:root` / `.dark`)
라이트/다크 모드에 따라 값이 바뀌는 변수입니다.  
**컴포넌트에서는 항상 이 변수를 사용합니다.**

| 변수 | 라이트 | 다크 | 용도 |
|------|--------|------|------|
| `--background` | #f8fafc | #020617 | 앱 배경 |
| `--foreground` | #0f172a | #f8fafc | 기본 텍스트 |
| `--card` | #ffffff | #0f172a | 카드 배경 |
| `--border` | #e2e8f0 | #1e293b | 구분선 |
| `--muted` | #f1f5f9 | #1e293b | 비활성 배경 |
| `--muted-foreground` | #64748b | #94a3b8 | 보조 텍스트 |
| `--primary` | #2563eb | #3b82f6 | 브랜드 컬러 (Blue Ribbon) |
| `--primary-foreground` | #ffffff | #ffffff | primary 위의 텍스트 |
| `--primary-hover` | #1d4ed8 | #60a5fa | hover 상태 |
| `--accent` | #e0e7ff | #1e293b | 강조 배경 |
| `--success` | #10b981 | #34d399 | 성공 |
| `--warning` | #f59e0b | #fbbf24 | 경고 |
| `--destructive` | #ef4444 | #f87171 | 오류/삭제 |

### OTA 채널 색상
```css
var(--channel-airbnb)       /* Airbnb — rose */
var(--channel-booking)      /* Booking.com — blue */
var(--channel-naver)        /* Naver — emerald */
var(--channel-direct)       /* 직접예약 — violet */

var(--channel-airbnb-bg)    /* 채널 색 15% + 카드 배경 혼합 */
/* …booking-bg / naver-bg / direct-bg 동일 패턴 */
```

### Tailwind 유틸리티로 사용하기
`@theme`에 등록되어 있어 Tailwind 클래스로 바로 씁니다.

```jsx
// ✅ 올바른 방법
<div className="bg-background text-foreground" />
<div className="bg-primary text-primary-foreground" />
<div className="border-border" />
<span className="text-channel-airbnb bg-channel-airbnb-bg" />

// ❌ 하드코딩 금지
<div style={{ color: '#2563eb' }} />
<div className="text-[#0f172a]" />
```

### Primary 색조 팔레트 (고정값)
`primary-50` ~ `primary-950` 은 Tailwind 클래스로 직접 사용 가능합니다.  
배경 틴트, 포커스 링, 그라디언트 등에 활용합니다.

```jsx
<div className="bg-primary-100 text-primary-700" />  // 상태 뱃지
<div className="bg-primary/10 text-primary" />        // 아바타 아이콘 배경
```

---

## 2. 타이포그래피 — `src/styles/tokens/typography.css`

### 폰트 패밀리
**Pretendard Variable** (CDN, 한글 dynamic subset)  
`--font-sans` → `font-family: var(--font-sans)` → Tailwind `font-sans`

### 타입 스케일 — `type-*` 유틸리티 클래스

폰트 크기(`text-[Xpx]`)를 직접 쓰지 않습니다. 아래 복합 유틸 클래스를 사용합니다.

| 클래스 | 크기 | 굵기 | 자간 | 용도 |
|--------|------|------|------|------|
| `type-display` | 32px | 800 | -0.02em | 대형 수치, 히어로 텍스트 |
| `type-numeric` | 26px | 800 | -0.03em | 대시보드 KPI 숫자 헤딩 |
| `type-page-title` | 24px | 700 | -0.01em | 페이지 제목 |
| `type-section-title` | 18px | 700 | -0.01em | 섹션 제목 |
| `type-card-title` | 15px | 600 | 0 | 카드 제목 |
| `type-body-strong` | 14px | 600 | 0 | 강조 본문 |
| `type-body` | 14px | 400 | 0 | 일반 본문 |
| `type-label` | 12px | 500 | +0.01em | 레이블, 폼 힌트 |
| `type-caption` | 11px | 400 | +0.02em | 보조 설명 |
| `type-micro` | 10px | 400 | +0.02em | 바 메타, 극소형 레이블 |

> `type-*` 클래스는 **색상을 포함하지 않습니다.**  
> 색상은 `text-foreground`, `text-muted-foreground` 등을 조합해서 씁니다.

```jsx
// ✅ 올바른 방법
<h1 className="type-page-title text-foreground">예약 현황</h1>
<p  className="type-body text-muted-foreground">3박 4일</p>
<span className="type-micro text-muted-foreground">CHECK-IN</span>

// ❌ 하드코딩 금지
<h1 className="text-[24px] font-bold">예약 현황</h1>
```

### React Typography 컴포넌트 (권장 API)
`src/components/ui/Typography.tsx`에서 `type-*` 를 래핑한 컴포넌트를 제공합니다.

```jsx
import { PageTitle, SectionTitle, CardTitle, Body, Caption } from '@/components/ui/Typography';

<PageTitle>예약 현황</PageTitle>          // → <h1 class="type-page-title">
<SectionTitle>Upcoming Stays</SectionTitle> // → <h2 class="type-section-title">
<CardTitle>홍길동</CardTitle>              // → <h3 class="type-card-title">
<Body className="text-muted-foreground">설명</Body>
<Caption>보조 텍스트</Caption>

// HTML 태그 변경이 필요할 때 as prop 사용
<PageTitle as="div">제목이지만 div로</PageTitle>
```

---

## 3. 레이어 (Z-Index) — `src/styles/tokens/elevation.css`

모달이 nav 뒤로 밀리거나, 요소가 겹치는 문제를 방지하기 위해  
z-index는 반드시 아래 시맨틱 클래스를 사용합니다.

| 클래스 | 값 | 용도 |
|--------|-----|------|
| `z-raise` | 10 | sticky 헤더, 내부 floating 뱃지 |
| `z-fab` | 50 | FAB 버튼 |
| `z-nav` | 100 | BottomNav, SideNav, 리사이즈 핸들 |
| `z-page` | 200 | 전체 페이지 덮는 라우트 오버레이 |
| `z-overlay` | 300 | **모든 모달 오버레이** — 단일 레벨 통일 |
| `z-toast` | 500 | 알림 토스트 (예약됨) |

```jsx
// ✅ 올바른 방법
<div className="fixed inset-0 z-overlay">  {/* 모달 */}
<nav className="fixed bottom-0 z-nav">      {/* 내비게이션 */}

// ❌ 숫자 직접 입력 금지
<div className="z-[300]">
<nav className="z-[100]">
```

---

## 4. 그림자 — `src/styles/tokens/elevation.css`

라이트/다크 모드에서 그림자 농도가 자동으로 조절됩니다.

| 클래스 | 용도 |
|--------|------|
| `shadow-container` | 앱 컨테이너 외곽 링 |
| `shadow-card-xs` | 극미세 카드 (설정 메뉴, 대시보드 카드) |
| `shadow-card` | 기본 카드 |
| `shadow-card-lg` | 부유감 있는 카드 (로그인 화면) |
| `shadow-nav` | BottomNav (위 방향 그림자) |
| `shadow-modal` | 모달 콘텐츠 영역 |
| `shadow-tooltip` | 차트 툴팁, 컨텍스트 메뉴 |

CSS 변수(`var(--shadow-*)`)로도 인라인 스타일에서 사용 가능합니다.

```jsx
// className으로 사용
<div className="shadow-card">...</div>

// Recharts contentStyle 등 인라인 스타일에서 사용
contentStyle={{ boxShadow: 'var(--shadow-tooltip)' }}
```

---

## 5. 테두리 반경 (Border Radius) — `src/index.css`

Tailwind 기본 `rounded-*`(rem 기반)으로 커버되지 않는 px 고정값을 토큰으로 제공합니다.

| 클래스 | 값 | 용도 |
|--------|-----|------|
| `rounded-chip` | 6px | 뱃지, 소형 태그 |
| `rounded-inner` | 10px | 카드 내부 버튼/요소 |
| `rounded-card` | 14px | 아이콘 컨테이너 |
| `rounded-sheet` | 20px | 카드, 바텀시트 상단 모서리 |
| `rounded-pill` | 30px | 큰 pill 버튼, CTA |
| `rounded-t-sheet` | 상단 20px | 바텀시트 패턴 (상단만 둥글게) |

Tailwind 기본 클래스(`rounded-xl`, `rounded-2xl`, `rounded-full` 등)도 여전히 사용합니다.  
위 토큰은 기본 클래스에 없는 px 값을 위한 보완입니다.

---

## 6. 레이아웃 상수 — `src/styles/tokens/layout.css`

앱 구조에 종속된 치수값을 CSS 변수로 관리합니다.  
JSX의 `style` prop에서도 `var(--token-name)`으로 참조할 수 있습니다.

| 변수 | 값 | 용도 |
|------|----|------|
| `--container-max-w` | 600px | 모바일 1열 레이아웃 최대 너비 |
| `--nav-height` | 72px | BottomNav 전체 높이 |
| `--nav-clearance` | 100px | BottomNav를 가리지 않는 하단 여백 |
| `--sidebar-default-w` | 380px | 데스크톱 사이드바 기본 너비 |
| `--sidebar-min-w` | 280px | 사이드바 최소 너비 |
| `--sidebar-max-w` | 800px | 사이드바 최대 너비 |
| `--calendar-cell-h` | 120px | 캘린더 날짜 셀 높이 |
| `--calendar-header-h` | 40px | 요일 헤더 행 높이 |
| `--chart-h-sm` | 160px | 모바일 차트 높이 |
| `--chart-h-md` | 320px | 데스크톱 차트 높이 |

---

## 7. 미세 간격 유틸리티 — `src/styles/tokens/layout.css`

Tailwind 기본 스케일(4px 배수)로 표현할 수 없는 간격값입니다.  
bracket 표기(`gap-[3px]`, `py-[18px]`) 대신 아래 클래스를 사용합니다.

| 클래스 | 값 | 용도 |
|--------|----|------|
| `gap-micro` | 3px | 분포 바 아이템 간격, 뱃지 내부 |
| `py-micro` | 3px (상하) | 극소형 패딩 |
| `px-micro` | 3px (좌우) | 극소형 패딩 |
| `py-btn` | 18px (상하) | CTA 버튼 수직 패딩 |
| `pb-nav-clear` | 100px (하단) | BottomNav에 가리지 않는 페이지 하단 여백 |
| `bottom-nav-clear` | 100px | FAB 버튼 위치 (BottomNav 위) |

```jsx
// ✅ 올바른 방법
<section className="pb-nav-clear">...</section>
<button className="fixed right-5 bottom-nav-clear ...">FAB</button>
<div className="flex gap-micro">...</div>
<button className="py-btn rounded-pill bg-primary">예약하기</button>

// ❌ bracket 표기 금지
<section className="pb-[100px]">...</section>
<div className="gap-[3px]">...</div>
```

---

## 8. 아이콘 크기 — `src/lib/iconSizes.ts`

lucide-react 아이콘의 `size` prop에 숫자를 직접 입력하지 않습니다.  
`ICON_SIZES` 상수를 import해서 사용합니다.

| 키 | 값 | 용도 |
|----|----|------|
| `ICON_SIZES.xs` | 12 | 극소형 인라인 아이콘 |
| `ICON_SIZES.sm` | 16 | 소형 아이콘 (보조 액션) |
| `ICON_SIZES.md` | 20 | 기본 UI 아이콘 (버튼, 입력 우측) |
| `ICON_SIZES.base` | 24 | 표준 아이콘 (BottomNav, 헤더, FAB) |
| `ICON_SIZES.lg` | 32 | 대형 아이콘 (히어로, 빈 상태 일러스트) |

```tsx
import { ICON_SIZES } from '@/lib/iconSizes';

// ✅ 올바른 방법
<Plus size={ICON_SIZES.base} />
<ChevronRight size={ICON_SIZES.md} />
<Bell size={ICON_SIZES.md} />

// ❌ 숫자 직접 입력 금지
<Plus size={24} />
<ChevronRight size={20} />
```

---

## 9. 규칙 요약

| 구분 | 해야 할 것 | 하지 말 것 |
|------|-----------|-----------|
| 색상 | `bg-primary`, `text-foreground`, `var(--primary)` | `#2563eb`, `text-[#0f172a]` |
| 폰트 | `type-body`, `type-label`, `<Body>` 컴포넌트 | `text-[14px] font-normal` |
| Z-Index | `z-overlay`, `z-nav` | `z-[300]`, `zIndex: 100` |
| 그림자 | `shadow-card`, `var(--shadow-modal)` | `rgba(0,0,0,0.3)` 직접 입력 |
| 반경 | `rounded-sheet`, `rounded-inner` | `rounded-[20px]` |
| 레이아웃 | `var(--nav-clearance)`, `var(--sidebar-default-w)` | `100px`, `380px` 직접 입력 |
| 간격 | `pb-nav-clear`, `gap-micro`, `py-btn` | `pb-[100px]`, `gap-[3px]`, `py-[18px]` |
| 아이콘 | `ICON_SIZES.base`, `ICON_SIZES.md` | `size={24}`, `size={20}` |

### 새 토큰이 필요할 때
기존 토큰에 없는 값이 반복해서 등장하면 **직접 쓰지 말고 토큰을 먼저 추가**합니다.

- 색상 → `src/styles/tokens/color.css` (`@layer base :root/.dark` + `@theme`)
- 타이포그래피 → `src/styles/tokens/typography.css`
- z-index / 그림자 → `src/styles/tokens/elevation.css`
- 반경 → `src/styles/tokens/border.css` (`@theme` + `@layer utilities`)
- 미세 간격 → `src/styles/tokens/spacing.css`
- 레이아웃 치수 → `src/styles/tokens/layout.css`
- 아이콘 크기 → `src/lib/iconSizes.ts`

---

## 기술 스택 참고

- **Tailwind CSS v4** — `@theme` 블록으로 CSS 변수 + 유틸리티 클래스 동시 생성
- **CSS Custom Properties** — 다크모드 대응 변수는 `@layer base :root / .dark`에 정의
- **`@layer utilities`** — Tailwind가 자동 생성하지 못하는 복합 클래스(`type-*`, `shadow-*`, `z-*`)를 명시적으로 선언
- **`ICON_SIZES`** — TypeScript `as const` 객체로 트리쉐이킹 가능, 타입 안전 아이콘 크기 관리
