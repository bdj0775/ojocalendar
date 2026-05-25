# OZO Calendar — 배포 로드맵 (B2B SaaS 런칭)

---

## 🔍 제미나이 B2B SaaS 플랜 점검 결과

| 항목 | 판정 | 비고 |
|---|---|---|
| 랜딩페이지를 별도 프로젝트로 분리 | ✅ 정확 | React SPA는 SEO 불리 → Next.js 분리가 표준 |
| 도메인 분리 (`ozocalendar.com` / `app.ozocalendar.com`) | ✅ 정확 | Notion, Slack, Figma 모두 이 구조 |
| Phase 1 앱 마무리 → Phase 2 랜딩 순서 | ✅ 정확 | 앱이 먼저 완성돼야 랜딩에서 연결 가능 |
| 온보딩 플로우 필요성 지적 | ✅ 핵심 지적 | 신규 가입자가 빈 화면만 보면 바로 이탈 |
| PWA 우선, 네이티브 앱 나중 | ✅ 정확 | 현재 단계에서 가장 현실적인 선택 |
| 미인증 사용자 라우팅 정비 필요 | ✅ 정확 | 현재 `/` 접속 시 로그인으로 튕기는 로직 명확화 필요 |

---

## 📊 현재 상태

| 항목 | 상태 |
|---|---|
| 웹앱 배포 (`ojocalendar.vercel.app`) | ✅ 완료 |
| `manifest.json` + 아이콘 | ✅ 완료 |
| OG 메타태그 (카카오톡 썸네일) | ✅ 완료 |
| `vercel.json` SPA 라우팅 404 수정 | ✅ 완료 |
| 서비스워커 (PWA 오프라인 캐싱) | ❌ 미완 |
| A2HS 설치 안내 UI | ❌ 미완 |
| 온보딩 플로우 | ❌ 미완 |
| 커스텀 도메인 (`app.ozocalendar.com`) | ❌ 미완 (도메인 구매 필요) |
| 랜딩페이지 (별도 프로젝트) | ❌ 미완 |

---

## 전체 구조 (완성 후 모습)

```
ozocalendar.com          ← 랜딩페이지 (새 Next.js 프로젝트, SEO 최적화)
  └─ "무료로 시작하기" 클릭
       └─ app.ozocalendar.com/login   ← 로그인/회원가입
            └─ app.ozocalendar.com/  ← 메인 대시보드 (현재 앱)
                 └─ 앱처럼 설치 (PWA) → 홈화면 아이콘
```

---

## Phase 1: 현재 웹앱(App) 마무리
> 현재 저장소(`calenderproject`)에서 진행

### ✅ 1-1. 온보딩 플로우 구현 (신규 가입자용)

회원가입 직후 **최초 1회만** 보이는 기본 설정 화면입니다.  
이게 없으면 신규 사용자가 빈 대시보드를 보고 바로 이탈합니다.

**구현 내용:**
- `src/pages/Onboarding/Onboarding.tsx` 신규 파일 생성
- 3단계 마법사 형태:
  1. 숙소 이름 입력 (예: "오조록")
  2. 기본 정보 설정 (객실 수, 기준 인원, 주중/주말 요금)
  3. iCal URL 연동 안내 (나중에 해도 됨 → 건너뛰기 가능)
- 완료 → `isOnboardingDone: true`를 Supabase users 메타데이터 또는 properties 테이블에 저장
- 이미 속소 데이터 있으면 온보딩 건너뜀

**라우팅 추가 (`App.tsx`):**
```
회원가입 → /onboarding → / (대시보드)
```

**Claude Code에게 시킬 명령어 예시:**
```
신규 가입자가 첫 로그인 시 최초 1회만 보이는 온보딩 마법사를 만들어줘.
3단계: (1)숙소 이름, (2)기본 요금, (3)iCal URL 연동(건너뛰기 가능).
완료 시 / 로 이동. 이미 properties 데이터 있으면 온보딩 건너뛰도록.
```

---

### ✅ 1-2. PWA 서비스워커 설정

**설치 (터미널에서 실행):**
```bash
npm install -D vite-plugin-pwa
```

**`vite.config.ts` 수정 내용:**
```ts
import { VitePWA } from 'vite-plugin-pwa';

// plugins 배열에 추가:
VitePWA({
  registerType: 'autoUpdate',
  manifest: false,   // 이미 public/manifest.json 있으므로 false
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
  },
})
```

**Claude Code에게 시킬 명령어 예시:**
```
vite-plugin-pwa 설치하고 vite.config.ts에 서비스워커 설정 추가해줘.
manifest.json은 이미 public/에 있으니 manifest: false로.
```

---

### ✅ 1-3. iOS 홈화면 추가(A2HS) 안내 UI

iOS Safari는 PWA 설치 팝업이 자동으로 뜨지 않아서 직접 안내해야 합니다.

**구현 내용:**
- 하단 고정 바 또는 모달
- "Safari 하단 공유 버튼 탭 → 홈 화면에 추가" 안내 + 아이콘
- 닫으면 localStorage에 기록 → 다시 안 뜨게

**표시 조건:**
```ts
const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
// isIos && !isStandalone 일 때만 표시
```

**Claude Code에게 시킬 명령어 예시:**
```
iOS Safari에서 앱 접속 시 하단에 "홈 화면에 추가하여 앱처럼 사용하세요" 안내 배너 만들어줘.
standalone 모드이거나 이미 닫은 경우엔 표시 안 하도록.
```

---

### ✅ 1-4. 라우팅 정비

비인증 사용자가 `app.ozocalendar.com`에 접속하면 바로 로그인 화면으로 이동.  
나중에 `ozocalendar.com`(랜딩)이 생기면 그쪽으로 리다이렉트 변경 가능.

**현재 `App.tsx`에서 확인:**
- 비인증 → `/login` 리다이렉트 → ✅ 이미 되어 있음
- 필요 시: 비인증 사용자가 `/login`이 아닌 다른 경로 접근 시 `/login`으로 통일

---

## Phase 2: 도메인 준비
> 필요 항목: 도메인 구매비 (연 1~3만원)

### ✅ 2-1. 도메인 구매

**추천 도메인:** `ozocalendar.com` 또는 `ozocalendar.kr`  
**구매처:** 가비아(gabia.com) 또는 호스팅KR

---

### ✅ 2-2. Vercel 도메인 연결

1. Vercel 대시보드 → 현재 프로젝트 → Settings → Domains
2. `app.ozocalendar.com` 입력 → Add
3. 가비아/호스팅KR에서 CNAME 레코드 추가 (Vercel이 안내해줌)
4. 인증서 자동 발급 (Let's Encrypt, 무료)

---

### ✅ 2-3. Supabase 설정 업데이트

Supabase 대시보드 → Authentication → URL Configuration

- **Site URL**: `https://app.ozocalendar.com`
- **Redirect URLs**에 추가:
  ```
  https://app.ozocalendar.com/**
  ```

---

### ✅ 2-4. `index.html` OG 태그 URL 업데이트

```html
<meta property="og:url" content="https://app.ozocalendar.com/" />
<meta property="og:image" content="https://app.ozocalendar.com/icon-512.png" />
```

---

## Phase 3: 랜딩페이지 신규 프로젝트
> **새 저장소**로 진행 (`ozocalendar-landing` 등)

### ✅ 3-1. 새 프로젝트 생성

**추천 프레임워크 비교:**

| 도구 | 장점 | 단점 | 추천 대상 |
|---|---|---|---|
| **Next.js** | React 기반, 익숙한 문법, SEO 최적화 | 약간 복잡 | 개발 직접 할 경우 |
| **Astro** | 초고속, SEO 최적화, React 컴포넌트 재사용 가능 | 새 학습 필요 | 성능 중시 시 |
| **Framer** | 노코드, 디자인 퀄리티 최고 | 유료 ($20/월~), 커스텀 로직 제한 | 빠른 디자인 중시 시 |

**권장: Next.js** (현재 React 코드 일부 재사용 가능)

```bash
npx create-next-app@latest ozocalendar-landing --typescript --tailwind --app
```

---

### ✅ 3-2. 랜딩페이지 섹션 구성

| 섹션 | 내용 | 참고 |
|---|---|---|
| **Header** | 로고 + "로그인" 버튼 | 우측 상단 고정 |
| **Hero** | 슬로건 + 앱 스크린샷 + CTA 버튼 | "무료로 시작하기" → app.ozocalendar.com/login |
| **Features** | 3~4가지 핵심 기능 카드 | 달력 통합, 분석 대시보드, OTA 동기화 |
| **Social Proof** | 숙소 운영자 후기 또는 통계 | (나중에 실제 사용자 생기면 추가) |
| **Pricing** | 무료 플랜 vs 유료 플랜 | 무료 베타로 시작 권장 |
| **Footer** | 이메일, 사업자 정보, 소셜 링크 | |

**Claude Code에게 시킬 명령어 예시 (새 프로젝트에서):**
```
ozocalendar-landing Next.js 프로젝트에 Tailwind CSS로 랜딩페이지 만들어줘.
섹션: Hero(슬로건+스크린샷+CTA), Features(3가지), Pricing(무료 베타), Footer.
CTA 버튼 클릭 시 https://app.ozocalendar.com/login 으로 이동.
```

---

### ✅ 3-3. 랜딩페이지 Vercel 배포

1. GitHub에 `ozocalendar-landing` 저장소 생성 후 push
2. Vercel 새 프로젝트로 import
3. 도메인 설정: `ozocalendar.com` 연결

---

### ✅ 3-4. SEO 기본 설정 (Next.js)

```tsx
// app/layout.tsx
export const metadata = {
  title: 'OZO Calendar — 숙소 예약 관리 캘린더',
  description: '에어비앤비, 부킹닷컴, 네이버 예약을 한눈에. 숙소 운영자를 위한 스마트 캘린더.',
  openGraph: {
    images: ['/og-image.png'],  // 1200×630px 이미지 준비
  },
};
```

---

## Phase 4: 모바일 앱 (나중 단계)

PWA로 충분하지 않고 아래가 필요할 때 진행:
- 홈화면 **위젯** (실시간 체크인 현황)
- **푸시 알림** (iOS 16.3 이하 포함)
- App Store / Google Play 등록

**방법:** React Native (Expo) — 현재 React 코드를 상당 부분 재사용 가능

---

## 체크리스트 요약

### Phase 1 (현재 프로젝트)
- [ ] 온보딩 플로우 구현 (숙소 이름 + 객실 수 + 기본 요금 + iCal 연동 안내)
- [x] `public/manifest.json` 생성 + 아이콘 매핑 (192px, 512px, apple-touch-icon) ← 완료
- [ ] `vite-plugin-pwa` 설치 + `vite.config.ts` 서비스워커 설정
- [ ] 모바일 브라우저 진입 시 "앱 설치하기" 배너 컴포넌트 추가
- [ ] 비인증 사용자 라우팅 정비 (미인증 → `/login`, 향후 랜딩으로 교체 가능하게)

### Phase 2 (도메인)
- [ ] `ozocalendar.com` 도메인 구매
- [ ] Vercel에 `app.ozocalendar.com` 연결
- [ ] Supabase Auth Redirect URL 업데이트
- [ ] OG 태그 URL 업데이트 + 재배포

### Phase 3 (랜딩페이지 — 새 프로젝트)
- [ ] `ozocalendar-landing` Next.js 프로젝트 생성
- [ ] Hero / Features / Pricing / Footer 섹션 구현
- [ ] CTA → `app.ozocalendar.com/login` 연결
- [ ] SEO 메타태그 설정
- [ ] `ozocalendar.com` Vercel 배포 + 도메인 연결

### Phase 4 (나중)
- [ ] (선택) React Native(Expo)로 앱스토어 등록
