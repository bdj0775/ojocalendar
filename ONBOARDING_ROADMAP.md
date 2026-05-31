# 오조캘린더 — 온보딩 구현 로드맵

> 익명 유저가 랜딩페이지에서 회원가입 → 온보딩 → 앱 정상 이용까지 이어지는 전체 흐름.

---

## 유저 여정 전체 흐름

```
랜딩페이지 (/)
    ↓ "무료로 시작하기" CTA → /login?mode=signup
로그인/회원가입 (/login)
    ↓ 이메일 인증 또는 Google/Kakao OAuth
온보딩 마법사 (/onboarding)
    ↓ 숙소명·요금·운영시간·채널 연결
앱 메인 (/ → 캘린더)
    ↓ 웰컴 힌트 배너 1회 표시
정상 운영
```

---

## PWA 고려사항 (전 Phase 공통)

- 온보딩 경로(`/onboarding`)는 서비스워커 캐시에 포함 → 오프라인에서도 접근 가능
- 스텝 진행 상태는 Zustand persist에 저장 → 앱 재시작 후 이어서 진행
- "홈 화면 추가" InstallPrompt는 온보딩 **완료 후**에만 표시
- 온보딩 중 네트워크 단절 시 로컬 저장 → 복구 후 Supabase 동기화
- 모든 스텝은 모바일(375px) 기준 설계, 데스크탑도 동일 컴포넌트 사용

---

## Phase 1 — 온보딩 진입 라우팅 ✅ 완료 (2026-05-31)

### 스토어 변경
- [x] `StoreState`에 `onboardingCompleted: boolean` + `setOnboardingCompleted` 추가
- [x] Zustand `persist` partialize에 `onboardingCompleted` 포함
- [x] `fetchData()`에서 `migrateData()` 자동 호출 제거 (온보딩이 숙소 생성 담당)

### 라우팅
- [x] `App.tsx`에 `/onboarding` 라우트 추가
- [x] `RootGate`: 신규 유저(`!onboardingCompleted && properties.length === 0`) → `/onboarding` 리다이렉트
- [x] `OnboardingGuard`: 비인증 → `/login`, `onboardingCompleted=true` → `/` 리다이렉트
- [x] PWA InstallPrompt — 온보딩 완료 후에만 표시

### 온보딩 페이지 셸
- [x] `src/pages/Onboarding/Onboarding.tsx` 기본 구조 생성
- [x] 스텝 상태 관리 (currentStep, formData) 골격

---

## Phase 2 — 온보딩 마법사 6단계 UI ✅ 완료 (2026-05-31)

### 타입 / 스토어
- [x] `OnboardingDraft` 타입 → `types/index.ts`로 이동
- [x] `onboardingStep` + `onboardingDraft` persist 저장 (새로고침 복구)
- [x] `resetOnboarding()` 액션 추가 (완료 시 드래프트·스텝 초기화)
- [x] `Settings`에 `peakSeasonStart`, `peakSeasonEnd` 추가

### 온보딩 마법사
- [x] **Step 1** — 언어 선택(ko/en) + 이름 입력, 나중에 입력하기 skip
- [x] **Step 2** — 숙소(객실)명 입력 + 기준 인원 선택, "설정에서 최대 3개 추가 가능" 안내
- [x] **Step 3** — 평일/주말(금·토·성수기) 요금 + 추가인원비 + 청소비 + 성수기 기간 설정 (기본값 7/1~8/15)
- [x] **Step 4** — 체크인·아웃 시간 선택
- [x] **Step 5** — Airbnb / Booking.com iCal 연결, `validateICalUrl` 인라인 검증 (Naver 제외)
- [x] **Step 6** — 요약 카드 확인 → `addProperty()` + `saveSyncChannel()` → 완료

### 공통 UX
- [x] 상단 진행 바 (Step N / 6)
- [x] 모든 단계 "나중에 입력하기" skip
- [x] 뒤로가기 버튼 (Step 1 제외)
- [x] 스텝 데이터 Zustand persist 저장 (새로고침 복구)
- [x] "저장 중..." 텍스트 상태 (스피너 없음)
- [x] 아이콘·이모지 없음, Login.tsx와 동일 디자인 토큰
- [x] 모든 인풋에 헬퍼 텍스트
- [x] 외곽선 없는 인풋 (focus ring만 표시)
- [x] 조건부 렌더링으로 단계별 완전 분리 (전 스텝 동시 실행 버그 방지)
- [x] `onRehydrateStorage`: 구버전 `propertyName` → `roomNames` 마이그레이션

---

## Phase 3 — 빈 상태(Empty State) 화면 ✅ 완료 (2026-05-31)

- [x] **캘린더(모바일)** — 전체 예약 0건 시 "날짜를 탭해서 첫 예약 추가" 안내 / 기존 예약 있으면 "다가오는 예약 없음" 유지
- [x] **예약목록(모바일)** — FileText 아이콘 제거, 신규 유저 안내 + "직접 예약 추가" CTA / 필터 무결과 구분
- [x] **예약목록(데스크탑)** — 신규 유저 안내 + 채널 연결 유도 / 필터 무결과 시 초기화 버튼
- [x] **대시보드(데스크탑)** — Database 아이콘 제거, 신규 유저 안내 primary / "샘플 데이터 미리보기"는 보조 텍스트 링크

---

## Phase 4 — 랜딩 → 가입 전환 개선 ✅ 완료 (2026-05-31)

### 랜딩페이지 CTA
- [x] Hero CTA "무료로 시작하기" → `/login?mode=signup`
- [x] CTA Section 버튼 → `/login?mode=signup`
- [x] Navbar "무료로 시작하기" → `/login?mode=signup`, "로그인" → `/login`
- [x] Pricing Card CTA → `/login?mode=signup`

### Login.tsx 전면 개선
- [x] `useSearchParams`로 `?mode=signup` 읽어 회원가입 탭 자동 선택
- [x] `Mode` 타입 (`'login' | 'signup' | 'forgot'`)으로 화면 상태 통합
- [x] **이메일 인증 완료 화면** — 전용 full 화면 (이메일 주소 표시 + 스팸 확인 안내)
- [x] **비밀번호 재설정 플로우** — `supabase.auth.resetPasswordForEmail` 실제 구현, 전송 후 안내 화면
- [x] **OAuth 에러 메시지 개선** — 잘못된 자격증명, 미인증 이메일, 중복 가입 각각 명확한 한국어 에러
- [x] 비밀번호 최소 6자 유효성 안내 (회원가입 시)

---

## Phase 5 — 후속 개선 ✅ 완료 (2026-05-31)

- [x] **온보딩 재진입 버튼** — 설정 페이지(모바일·데스크탑) 로그아웃 위에 "초기 설정 다시 하기" 버튼
  - `resetOnboarding()` + `setOnboardingCompleted(false)` → `/onboarding` 이동
  - `OnboardingGuard` 조건을 `onboardingCompleted`만으로 단순화 (기존 유저 재진입 허용)
- [x] **첫 방문 웰컴 힌트** — 온보딩 완료 직후 앱 첫 진입 시 1회 배너 표시
  - `showWelcomeHint: boolean` 스토어 상태, `dismissWelcomeHint()` 액션
  - `onboardingCompleted(true)` 호출 시 자동 활성화
  - `MainLayout`에 고정 배너 — "날짜를 탭하면 예약 추가 / 설정에서 채널 연결"
  - "닫기" 누르면 영구 비활성화
- [ ] 멀티 숙소 온보딩 — DB 스키마 변경 필요, 추후 진행
- [ ] 이메일 웰컴 메시지 — Supabase Auth Hook 필요, 추후 진행

---

## 기술 메모

### 신규 유저 감지 조건
```
!onboardingCompleted && properties.length === 0  →  /onboarding 리다이렉트
```
기존 유저(properties 있음)는 `onboardingCompleted=false`여도 앱 정상 진입.

### 라우트 구조
```
/               → RootGate (랜딩 or 앱)
/login          → LoginPage (mode=login|signup|forgot)
/auth/callback  → AuthCallback (OAuth)
/onboarding     → OnboardingPage (OnboardingGuard: 인증 필수, onboardingCompleted=false)
/bookings       → BookingsPage
/settings       → SettingsPage
/new-booking    → NewBookingPage
```

### 스토어 추가 필드 목록
```typescript
onboardingCompleted: boolean        // persist
onboardingStep: number              // persist
onboardingDraft: OnboardingDraft    // persist
showWelcomeHint: boolean            // 비persist (세션 내)
Settings.peakSeasonStart: string    // persist ('MM-DD')
Settings.peakSeasonEnd: string      // persist ('MM-DD')
```

### migrateData() 역할 변경
- **기존**: `fetchData()`에서 자동 호출 → 빈 숙소 자동 생성
- **변경**: 온보딩 Step 6 완료 시점에만 숙소 생성 (`addProperty` 직접 호출)
- **유지**: 대시보드 "샘플 데이터 미리보기" 버튼 (기존 유저 전용)
