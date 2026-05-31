# 오조캘린더 — 온보딩 구현 로드맵

> 익명 유저가 랜딩페이지에서 회원가입 → 온보딩 → 앱 정상 이용까지 이어지는 전체 흐름.
> 작업이 완료될 때마다 해당 항목에 `[x]` 체크.

---

## 유저 여정 전체 흐름

```
랜딩페이지 (/)
    ↓ "무료로 시작하기" CTA
로그인/회원가입 (/login)
    ↓ 이메일 인증 또는 Google/Kakao OAuth
온보딩 마법사 (/onboarding)          ← Phase 2 핵심
    ↓ 숙소명·요금·운영시간·채널 연결
앱 메인 (/ → 캘린더)
    ↓ 정상 운영
```

---

## PWA 고려사항 (전 Phase 공통)

- 온보딩 경로(`/onboarding`)는 서비스워커 캐시에 포함 → 오프라인에서도 접근 가능
- 스텝 진행 상태는 Zustand persist에 저장 → 앱 재시작 후 이어서 진행
- "홈 화면 추가" InstallPrompt는 온보딩 **완료 후**에만 표시
- 온보딩 중 네트워크 단절 시 로컬 저장 → 복구 후 Supabase 동기화
- 모든 스텝은 모바일(375px) 기준 설계, 데스크탑도 동일 컴포넌트 사용

---

## Phase 1 — 온보딩 진입 라우팅 ✅ 완료

> 기간 예상: 0.5일 | 실제 완료일: 2026-05-31

### 스토어 변경
- [x] `StoreState`에 `onboardingCompleted: boolean` + `setOnboardingCompleted` 추가
- [x] Zustand `persist` partialize에 `onboardingCompleted` 포함
- [x] `fetchData()`에서 `migrateData()` 자동 호출 제거 (온보딩이 숙소 생성 담당)

### 라우팅
- [x] `App.tsx`에 `/onboarding` 라우트 추가
- [x] `RootGate`: 인증 완료 + 데이터 로드 후 신규 유저(`!onboardingCompleted && properties.length === 0`) → `/onboarding` 리다이렉트
- [x] `OnboardingGuard`: 비인증 → `/login`, 온보딩 완료 → `/` 리다이렉트

### 온보딩 페이지 셸
- [x] `src/pages/Onboarding/Onboarding.tsx` 기본 구조 생성
- [x] 스텝 상태 관리 (currentStep, formData) 골격
- [x] PWA InstallPrompt — 온보딩 완료 전 숨김 처리

---

## Phase 2 — 온보딩 마법사 6단계 UI ✅ 완료

> 기간 예상: 3~4일 | 실제 완료일: 2026-05-31

### Step 1 — 언어 + 이름
- [x] 이름 입력 → `settings.profileName` 업데이트
- [x] 언어 선택 (ko / en) → `settings.language` 업데이트

### Step 2 — 숙소 기본 정보
- [x] 숙소 이름 입력
- [x] 기준 인원 선택 (1~6)

### Step 3 — 요금 설정
- [x] 평일 기본 요금 (basePrice)
- [x] 주말 요금 (weekendPrice)
- [x] 추가 인원 요금 (extraGuestFee)
- [x] 청소비 (cleaningFee)

### Step 4 — 운영 시간
- [x] 체크인 시간 선택 (checkInTime)
- [x] 체크아웃 시간 선택 (checkOutTime)

### Step 5 — 채널 연결 (선택)
- [x] Airbnb iCal URL 입력 + 유효성 검사
- [x] Booking.com iCal URL
- [x] Naver iCal URL
- [x] "나중에 연결할게요" 전체 스킵
- [x] URL 유효성 검사는 기존 `validateICalUrl` 활용

### Step 6 — 완료
- [x] 설정 요약 카드 표시
- [x] `addProperty()` 호출로 Supabase에 숙소 저장
- [x] iCal URL 있으면 `saveSyncChannel()` 호출
- [x] `setOnboardingCompleted(true)` → persist 저장
- [x] `resetOnboarding()` → 드래프트·스텝 초기화
- [x] "앱 시작하기" → `/` 이동

### 공통 UX
- [x] 상단 진행 바 (Step N / 6)
- [x] 뒤로가기 버튼 (Step 1 제외)
- [x] 스텝 데이터 Zustand persist 저장 (새로고침 복구)
- [x] 저장 중 텍스트 상태 + 에러 처리
- [x] 아이콘 없음, 기존 디자인 토큰 사용 (Login.tsx 동일 inputCls)
- [x] `OnboardingDraft` 타입 → `types/index.ts`로 이동
- [x] 하드코딩 없음 — 상수·번역 헬퍼 분리

---

## Phase 3 — 빈 상태(Empty State) 화면 ✅ 완료

> 기간 예상: 1일 | 실제 완료일: 2026-05-31

- [x] 캘린더 (모바일) — 전체 예약 0건 시 "날짜를 탭해서 첫 예약을 추가하세요" 안내
- [x] 예약목록 (모바일) — 아이콘 제거, 신규 안내 + "직접 예약 추가" CTA / 필터 결과 없음 구분
- [x] 예약목록 (데스크탑) — 신규 안내 + 채널 연결 유도 / 필터 결과 없음 구분
- [x] 대시보드 (데스크탑) — Database 아이콘 제거, 신규 유저 안내 primary / 샘플 데이터는 보조 텍스트링크로

---

## Phase 4 — 랜딩 → 가입 전환 개선

> 기간 예상: 1일

### 랜딩페이지
- [ ] Hero CTA "무료로 시작하기" → `/login?mode=signup` 직접 연결
- [ ] 가격 플랜 CTA → 동일
- [ ] NavBar "로그인" / "시작하기" 버튼 구분

### 로그인/회원가입 UX
- [ ] 이메일 회원가입 후 "인증 메일을 보냈어요" 전용 화면 (현재: 작은 텍스트)
- [ ] 비밀번호 재설정 플로우 개선
- [ ] OAuth 실패 시 명확한 에러 메시지
- [ ] `/login?mode=signup` 쿼리파라미터로 회원가입 탭 자동 선택

---

## Phase 5 — 후속 개선 (선택)

- [ ] 인앱 툴팁 — 첫 방문 시 주요 기능 하이라이트
- [ ] 온보딩 재진입 버튼 (설정 페이지 내 "초기 설정 다시 하기")
- [ ] 멀티 숙소 온보딩 (숙소 2개 이상 추가 플로우)
- [ ] 이메일 웰컴 메시지 (Supabase Auth Hook 활용)

---

## 기술 메모

### 신규 유저 감지 조건
```
!onboardingCompleted && properties.length === 0
```
기존 유저(properties 있음)는 `onboardingCompleted=false`여도 앱 정상 진입.

### 라우트 구조 (완성 후)
```
/               → RootGate (랜딩 or 앱)
/login          → LoginPage
/auth/callback  → AuthCallback (OAuth)
/onboarding     → OnboardingPage (인증 필수, 완료 시 / 리다이렉트)
/bookings       → BookingsPage
/settings       → SettingsPage
/new-booking    → NewBookingPage
```

### 스토어 추가 필드
```typescript
onboardingCompleted: boolean        // persist O
onboardingDraft: OnboardingDraft    // persist O (스텝 중단 복구용)
```

### migrateData() 역할 변경
- 기존: fetchData()에서 자동 호출 → 빈 숙소 자동 생성
- 변경: 온보딩 Step 6 완료 시점에만 숙소 생성 (addProperty 직접 호출)
- 유지: 대시보드 "샘플 데이터 복구" 버튼용 (기존 유저 전용)
