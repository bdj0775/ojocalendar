# DYNAMIC_PRICING_RESEARCH.md — 빈객실 자동가격(동적 가격) 기획 검토

> 작성: 2026-09-07 · 상태: **기획 검토 단계 (코드 없음)**
> 목적: 실존하는 동적 가격 시스템의 기술을 조사하고, 오조캘린더에 현실적으로 넣을 수 있는 범위와 실효성을 판단한다.
> 실효성 수치는 이 숙소의 실제 예약 302건(`bookings_latest.csv`, 2025-06 ~ 2026-09)으로 계산했다.

---

## 0. 결론 요약

| 질문 | 답 |
|---|---|
| 상용 툴은 어떻게 만드나 | **시장 데이터(경쟁 숙소 수백 개 스크래핑) + 예약확률 모델 + 기대수익 최적화**. 핵심 자산은 알고리즘이 아니라 시장 데이터다. |
| 우리가 같은 걸 만들 수 있나 | **아니오.** 시장 데이터가 없고, 채널에 가격을 자동 반영할 API도 없다. |
| 그럼 뭘 만들 수 있나 | **"내 데이터 기반 룰 엔진 + 추천 + 설명"**. 픽업·리드타임·요일·공휴일·고아공실 신호는 이미 갖고 있다. 가격은 호스트가 직접 채널에 입력한다. |
| 실효성이 있나 | **있다, 단 방향이 다르다.** 이 숙소는 최근 12개월 점유율 87~100%라 "빈방 채우기"보다 **"잘 팔리는 날 값 올리기"**가 주 효과. 빈방 쪽은 1박짜리 고아공실이 공실의 약 60%라 표적이 명확하다. |
| 기대 효과(이 숙소 기준, 추정) | 연매출 약 6,200만 원 대비 **연 +150~450만 원(+2.5~7%)** 수준. 업계가 말하는 +10~40%는 시장 데이터가 있고 정적 가격에서 출발할 때 얘기. |
| 권장 진행 | 3단계. ① 가격 인사이트(추천 없음) → ② 룰 기반 일자별 추천 + 채널 할인규칙 추천 → ③ 효과 측정. 자동 반영은 채널매니저 제휴 없이는 보류. |
| **2차 검토(6장)** | 개인용 경쟁숙소 스크래핑은 **조건부 예**(가격이 아니라 가용성 스냅샷). 임박할인 판단 툴("빈방 레이더")을 **가장 먼저** 만들 것. |

---

## 1. 실존 시스템 조사

### 1-1. 주요 플레이어와 기술 방식

| 서비스 | 데이터 | 핵심 기법 | 가격 | 채널 반영 |
|---|---|---|---|---|
| **PriceLabs** | Airbnb·Vrbo·Booking 1,000만+ 리스팅 스크래핑. 반경 최대 15km 내 유사 350개를 H3 육각격자로 묶어 "하이퍼로컬" 시장 정의 | ① 참조일(같은 시즌·요일·이벤트, 예약곡선 유사) 선택 → 페이싱·픽업으로 수요 예측 ② 날짜별 **예약확률 곡선(탄력성)** 추정 ③ `기대수익 = 가격 × 예약확률` 최대화 ④ 365일 연쇄 결정을 **Bellman 방정식(동적계획법)** 으로 풂 | 미국 등 $19.99, 그 외 $9.99/리스팅/월 | PMS·채널매니저 또는 Airbnb 직접 연결, 하루 최대 24회 푸시 |
| **Wheelhouse** | 2,100만 리스팅, 일 200억 데이터포인트 | **생존분석(Kaplan-Meier)** 으로 예약곡선 S(t) 추정(미래 날짜의 우측 절단 처리). 기본가는 그래디언트 부스팅 + 공간 크리깅. 수요 강도를 감마(γ) 파라미터로 비선형 워핑. 가격반응함수 `γ = a + b(δ−d)²·[δ>d]` | $19.99/리스팅/월 또는 매출 1% | 연동 PMS |
| **Beyond** | 완료 예약 + **OTA 실시간 검색 데이터**(유일) + 5년 시장 이력 | 검색 기반 수요 신호. 자연어로 "왜 이 가격인가" 설명하는 AI(Neyoba) | 매출 1~1.25% (최소 $2.99) | 연동 PMS |
| **Airbnb Smart Pricing** | 자사 검색·조회·예약 데이터 | 수백 개 요인, 호스트는 min/max만 설정 | 무료 | 자체 |
| **AirDNA Adapt** (2026-09-01 출시) | AirDNA 시장 데이터 | 4가지 전략 프리셋, 일 1회 갱신, **가격 결정을 평문으로 설명하는 AI** | $20/리스팅 | Airbnb·Guesty·Hostaway 등 |
| **호텔 RMS**(Mews, RoomPriceGenie 등) | 자사 PMS + 경쟁호텔 요금 | 점유율 임계값 룰(예: 80% 도달 시 +10%), 최종 48시간 미판매 시 −10%, 고아일 룰 | — | PMS 내장 |

### 1-2. 상용 알고리즘의 공통 구조

```
최종가(날짜 d)
  = 기본가(숙소 속성 → 시장 중앙값)
  × 계절 계수(시장 저역통과 필터)
  × 요일 계수(시장별 상이: 오스틴 주말 +50%, 샌프란시스코 +3%)
  × 수요 계수(이벤트 탐지 = 고역통과, 페이싱·픽업)
  × 리드타임 계수(먼 미래 프리미엄 → 임박 할인. 당일 평균 −30%)
  × 고아공실 계수(1박 공실 예약확률 7.3% vs 시장 41% → 강한 할인)
  → [min, max] 클램프, 호스트가 공격/보수 강도 조절
```

세 회사 모두 마지막 단계에 **"설명 가능성"** 을 붙이는 추세(Beyond Neyoba, AirDNA AI 어시스턴트). 호스트가 결정 이유를 못 읽으면 추천을 안 따른다는 뜻이다.

### 1-3. Airbnb Smart Pricing이 욕먹는 이유 (우리 설계에 직접 관련)

- 15~30% 저가 책정 경향. 플랫폼은 수수료를 받으므로 "만실"을 선호하는 구조적 이해충돌.
- 초반 페이스가 느리면 곧바로 할인 → 늦게 들어오는 수요를 놓침.
- 이벤트·지역 특수성 반영 부족.
- 주말 요금·주간/월간 할인·전문호스팅 룰셋과 **동시 사용 불가**.

→ 우리는 "만실"이 아니라 **RevPAR(가용박당 매출)** 을 목표 지표로 삼아야 한다.

### 1-4. 학술적 배경 (참고)

- Airbnb 수요는 **가격 비탄력적**(뉴욕 리스팅 패널 연구, 탄력성 계수 ~0.3). 소폭 인상이 점유율을 크게 깎지 않는다는 뜻이며, 만실에 가까운 숙소일수록 인상 여지가 있다.
- 단일 객실은 "수량"이 아니라 "예약될 확률"로 수요를 봐야 한다(PriceLabs). 그래서 상용 툴은 전부 확률 모델이다.

---

## 2. 우리가 못 하는 것 (제약)

### 2-1. 시장 데이터가 없다
경쟁 숙소 가격·가용성 스크래핑은 Airbnb 약관 위반이며, 규모(수백만 리스팅 일일 수집)도 개인 프로젝트 범위 밖. **이벤트·경쟁사 가격 변동은 감지 불가.** 대체 가능한 외부 신호는 **공휴일(공공데이터포털 특일정보 API, 무료)** 정도.

### 2-2. 채널에 가격을 밀어 넣을 수 없다

| 채널 | 상태 |
|---|---|
| Airbnb | 공식 API는 승인된 파트너(Preferred+/Preferred)만. 개인 앱 승인 비현실적. 비공식 자동화(브라우저 봇)는 약관 위반·계정 위험. |
| Booking.com | Connectivity Partner 인증 필요. **현재 신규 파트너 접수 중단**. PCI/PII 준수, 최소 숙소 수 요건. |
| Naver 예약 | 공개 요금 API 없음. |
| 국내 채널매니저(ONDA 등) | 45개 채널 요금·재고 연동. 제휴 시 가능하나 사용자 규모가 먼저 필요. |

→ 당분간 **"추천 → 호스트가 직접 입력"** 이 유일한 경로. 대신 각 채널이 이미 갖고 있는 **자동 할인 규칙**을 우리가 "설정값"으로 추천하면 반자동이 된다:
- Airbnb: 얼리버드(1~36개월 전, 다단계), 라스트미닛(0~29일 전, 다단계), 숙박일수 할인, 커스텀 프로모션. 전문호스팅 도구의 **룰셋**(데스크탑 전용).
- Booking.com: Early Booker(15일+ 전), Last-Minute(7일 이내 권장), Mobile Rate(10%+), Genius(10% 강제).

### 2-3. iCal은 가격을 모른다
현재 동기화되는 예약의 상당수는 금액이 비어 알림으로 채운다. **가격 엔진은 금액이 채워진 예약에만 의존**해야 하며(정제 시 0원 1건·182박 장기 1건 제외), 금액 미입력률이 높은 사용자에겐 추천 품질이 떨어진다는 걸 UI에 표시해야 한다.

---

## 3. 이 숙소 데이터로 본 실효성 (2025-06 ~ 2026-08, 완료 15개월)

### 3-1. 이 숙소는 "빈방 문제"가 아니라 "가격 문제"다

| 월 | 점유 | ADR | 공실 구간 |
|---|---|---|---|
| 2025-09 | 93% | 184,638 | 1,1 |
| 2025-10 | 94% | 191,322 | 1,1 |
| 2025-11 | 87% | 176,592 | 1,1,1,1 |
| 2025-12 | 71% | 191,002 | 1,1,1,1,2,3 |
| 2026-01 | 74% | 182,197 | 2,1,1,2,2 |
| 2026-02 | 89% | 174,042 | 1,1,1 |
| 2026-03 | 87% | 187,456 | 2,2 |
| 2026-04 | 93% | 171,652 | 1,1 |
| 2026-05 | **100%** | 194,255 | — |
| 2026-06 | 93% | 208,476 | 1,1 |
| 2026-07 | 90% | 200,328 | 1,1,1 |
| 2026-08 | **100%** | 220,072 | — |

- 최근 12개월 미판매 **39박**, 그중 **1박짜리 고아공실 23박(약 60%)**. 3박 이상 연속 공실은 12월에 한 번뿐.
- 만실 달이 2개, 90% 이상이 8개. D-7 시점 OTB가 74~84%인 여름 달은 **임박 할인이 필요 없다**. 오히려 인상 여지.
- ADR이 12개월간 176k → 220k로 우상향. 호스트가 이미 손으로 값을 올리고 있다는 뜻이며, 툴은 이걸 **체계화·앞당기기** 하는 역할.

### 3-2. 신호별 검증

**요일** — 점유율은 요일 간 76~88%로 평평하고, 실현 단가 차이도 토 199k vs 수 188k로 **+6%에 불과**. 펜션식 "주말 프리미엄"이 이 숙소엔 약하다(평일 외국인 수요 추정). → 요일 계수는 **숙소별로 데이터에서 학습**해야 하며, `weekendPrice` 설정을 그대로 믿으면 안 된다.

**공휴일** — 공휴일 박 ADR 200k(중앙값 200k)로 전체 중앙값 190k 대비 +5%. 표본 18박.

**리드타임** — 정제 후:

| 접수 시점 | 박수 | 실현 ADR | 비고 |
|---|---|---|---|
| 당일 | 27 | 166,878 | 이미 −13% 수준에서 거래됨 |
| 1~7일 | 23 | ~172,000 | |
| 8~21일 | 60 | 180,108 | |
| 22~90일 | 228 | ~192,000 | 주력 구간 |
| 91일+ | 116 | 207,525 | 가장 비싸게 팔림 |

먼 미래 예약이 가장 비싸다. 단가 인상 추세와 성수기 편중이 섞여 있어 인과는 아니지만, **"먼 미래 할인"은 이 숙소에 불필요**하고 PriceLabs식 **먼 미래 프리미엄**이 오히려 맞다.

**매진 속도** — 요일별 판매 리드타임 중앙값 40~64일, 7일 이내 판매 비중 7~19%. 즉 **대부분의 박이 한 달 이상 전에 팔린다**. 업계 기준("피크에 90일 전 매진이면 저가")에 따르면 월·금·토(중앙값 62~64일)는 인상 후보.

**페이스 임계값 근거** — 완료월의 시점별 OTB:

| 월 | D-60 | D-30 | D-7 | 최종 |
|---|---|---|---|---|
| 2026-05 | 45% | 55% | 77% | 100% |
| 2026-08 | 39% | 61% | 84% | 100% |
| 2025-12 | 10% | 32% | 45% | 71% |
| 2026-01 | 0% | 13% | 35% | 74% |

D-30에 55% 이상이면 만실로 갔고, 32% 이하면 70%대에서 끝났다. **픽업6 히스토리(`computeForecast`)의 "같은 시점 OTB"가 그대로 페이스 계수의 기준선**이 된다. 별도 모델이 필요 없다.

**채널** — 실현 ADR: Airbnb 204k, Booking 204k, Naver 183k, Direct 153k. 추천가는 **순수익 목표가 하나**를 정한 뒤 `channelSettings.commission`으로 채널별 표시가를 역산하는 게 맞다.

### 3-3. 기대 효과 추정 (보수적)

연 매출 ≈ 62,000천 원(최근 12개월 판매 박 × ADR 합).

| 레버 | 근거 | 연 효과 추정 |
|---|---|---|
| 고아공실 할인(1박 공실 −15~20%) | 23박/년, 채움률 30~50% 가정, 150k | +100~170만 |
| 고수요일 인상(D-30 OTB 높은 달·60일+ 전 매진 요일에 +5~10%) | 판매 박의 약 절반 해당 | +150~300만 |
| 임박 할인 정교화 | 당일 예약이 이미 −13%로 거래돼 추가 여지 작음 | ±0~50만 |
| **합계** | | **+250~450만 (+4~7%)** |

주의: 탄력성을 모르므로 인상 효과는 가정이다. 시장 데이터 없이 이벤트 폭등(콘서트·연휴 겹침)은 못 잡는다. 이 숫자는 "가치 있는가"의 판단 근거이지 약속이 아니다.

### 3-4. 다른 사용자에겐?
이 숙소는 점유율이 높은 편이다. 점유율 50~70%인 사용자에겐 임박·고아 할인 효과가 훨씬 크고 인상 효과는 작다. 엔진은 **점유율 수준에 따라 레버 비중이 자동으로 달라지도록** 설계해야 한다(페이스 계수가 이 역할).

---

## 4. 적용 방안 (제안)

### 4-1. 원칙
1. **추천이지 자동이 아니다.** 호스트가 채널에 입력한다. 대신 "이번 주 바꿀 것 N개"로 압축해 부담을 줄인다.
2. **모든 추천에 한 줄 이유를 단다.** ("10/3 개천절 연휴 · 작년 같은 시점보다 12%p 빨리 참 → +8%") 상용 3사가 전부 이 방향으로 갔다.
3. **RevPAR 최적화, 만실 아님.** 하한(청소비+원가)·상한을 호스트가 설정.
4. **기존 훅을 재사용한다.** 새 데이터 파이프라인 없이 `useDesktopStats`(픽업6 기준선·ADR), `useBookingPace`(일별 곡선), `useLeadTimeReport`(리드타임), `holidays.ts`, `channelSettings`로 충분하다.
5. **콜드스타트 가드.** 완료 6개월 미만 또는 금액 있는 예약 40건 미만이면 인사이트만 보여주고 추천은 잠근다.

### 4-2. 룰 엔진 초안 (`usePriceSuggestions`)

```
추천가(d) = 기준가(d) × 페이스(d) × 리드타임(d) × 고아(d)
  → [하한, 상한] 클램프 → 1,000원 반올림 → 채널별 표시가 = 추천가 / (1 − 수수료율)

기준가(d)   = 내 중앙 ADR(최근 6개월, 금액 있는 예약)
              × 요일계수(내 데이터, 표본 적으면 1로 수축, ±15% 캡)
              × 공휴일계수(공휴일·연휴 전야, 내 데이터 없으면 +8% 기본)
              × 계절계수(작년 같은 달 ADR 비율, 1년 미만이면 peakSeason 설정으로 +10%)
페이스(d)   = 그 달 OTB − 픽업6 히스토리의 같은 시점 OTB 평균
              ≥ +10%p → +8% · +5~10 → +4% · −5~−10 → −4% · ≤ −10%p → −8%
리드타임(d) = D>90 +3% · 22~90 1.0 · 8~21 1.0 · 4~7 −5% · 1~3 −10% · 당일 −15%
              (단, 그 달 OTB가 85% 이상이면 임박 할인 미적용)
고아(d)     = 앞뒤가 모두 예약된 1박 공실 −15% · 2박 공실 −8%
```

숫자는 전부 초기값이며 **3단계 효과 측정으로 조정**한다. 룰이 단순한 이유: 표본 300건으로 확률 모델을 학습하면 과적합이고, 호스트가 이해 못 하는 추천은 안 따른다.

### 4-3. 단계별 로드맵

| 단계 | 내용 | 산출물 | 규모 |
|---|---|---|---|
| **① 가격 인사이트** | 요일·공휴일·리드타임·채널별 실현 단가, 고아공실 목록, 요일별 매진 속도. 추천 없음 | 대시보드 카드 + 상세 모달(리드타임 모달 패턴 재사용) | 1~2주 |
| **② 추천 엔진** | 4-2 룰 엔진, 캘린더 날짜별 추천가 오버레이, "이번 주 바꿀 것" 액션 리스트, 각 항목 이유 문구, 하한/상한 설정. **채널 할인규칙 추천**(Airbnb 라스트미닛 X%/얼리버드 Y%, Booking Last-Minute) | `usePriceSuggestions` + `PriceSuggestion` 타입 + 설정 UI | 3~4주 |
| **③ 효과 측정** | 호스트가 "적용함" 체크 → 적용 전후 RevPAR·고아공실 채움률·리드타임 변화 비교. 픽업6 예측 대비 실제 픽업 차이를 반사실로 사용 | 월간 리뷰 카드 + `monthly_review.mjs` 확장 | 2주 + 3개월 관찰 |
| **④ 자동 반영(조건부)** | ONDA 등 채널매니저 제휴 또는 Airbnb 파트너 신청 | — | 사용자 규모 확보 후 |

### 4-4. 타입·저장 (예고)
- `PriceSuggestion { date, suggested, base, factors: {dow, holiday, season, pace, leadTime, gap}, reason, reasonEn, applied?: boolean }`
- 숙소 설정 추가: `minPrice`, `maxPrice`, `pricingAggressiveness`(보수/기본/공격 = 계수 폭 0.5/1/1.5배)
- 적용 기록 테이블 `price_actions`(host_id RLS 필수) — 3단계에서.

---

## 5. 하지 말 것 / 리스크

- **경쟁 숙소 스크래핑 금지** — 약관·법적 리스크, 유지비.
- **Airbnb 비공식 자동화 금지** — 계정 정지 위험을 사용자에게 떠넘기는 꼴.
- **처음부터 ML 금지** — 300건으로는 룰이 이긴다. 확률 모델은 사용자 수백 명 데이터가 모인 뒤.
- **Smart Pricing 흉내(만실 지향) 금지** — 이 숙소처럼 이미 90%인 곳엔 손해.
- **`weekendPrice`를 진실로 가정 금지** — 실현 단가로 검증된 요일 계수만 쓴다.
- 금액 미입력 예약이 많은 사용자에겐 "추천 정확도 낮음" 배지 필수.

---

## 6. 2차 검토 (2026-09-07) — 개인용 스크래핑 · 임박할인 툴

> 1차 결론에 대한 두 가지 반론을 검토했다. ① "제품이 아니라 개인용이면 경쟁숙소 몇 개를 내가 찍어서 네이버에서 긁으면 되지 않나" ② "임박할인 판단만 돕는 좁은 툴부터 시작하면 어떤가".

### 6-1. 개인용 경쟁숙소 스크래핑 — **조건부 예**

1차의 "아니오"는 **제품 전제**(불특정 다수 사용자 → 대량 트래픽, 법적 노출, 유지보수)였다. 개인이 직접 고른 5~10개 숙소를 하루 한 번 보는 것은 다른 문제다.

**법적 판단**
- 야놀자 v. 여기어때(대법원 2022-05-12): 인증 없이 열린 API를 긁은 것은 정보통신망 침입이 **아니다**(무죄 확정). 민사(서울고법 2022-08-26)는 **경쟁 서비스를 만들려고 대량 복제**한 것이 부정경쟁행위라며 10억 배상. 개인이 자기 요금 결정에 쓰려고 소량 수집하고 재배포하지 않는 것은 이 사실관계와 거리가 멀다.
- 약관 위반은 맞다(네이버·에어비앤비 모두 자동 접근 금지). 현실적 결과는 IP 차단·캡차이며, **호스트 계정으로 로그인한 상태에서 긁지 않는 한** 계정 위험은 없다.

**기술 확인 (이 PC에서 직접 테스트)**

| 대상 | 결과 |
|---|---|
| `booking.naver.com/robots.txt` | `Disallow: /` (전체 금지 선언) |
| `booking.naver.com` 예약 페이지 | HTTP 200. Apollo GraphQL SPA(`__APOLLO_STATE__`, `schedule` 확인). 데이터는 별도 graphql 호출로 들어옴 |
| `m.place.naver.com` | 단순 curl 1회에 **HTTP 429**. 봇 감지가 즉각적 |
| 네이버 graphql 엔드포인트 직접 호출 | **미검증** — 작업 권한 정책상 차단됨. 사용자가 직접 확인 가능: 경쟁숙소 예약 페이지 → DevTools Network → `graphql` POST(operationName `schedule` 계열) → "Copy as cURL" |
| `airbnb.co.kr/rooms/{id}` | HTTP 200. 공개 API 키(`api_config.key`) 페이지에 내장. 12개월 가용성을 한 번에 주는 `PdpAvailabilityCalendar` 엔드포인트가 널리 문서화됨(Scrapfly 가이드, Apify 액터 다수) |

→ 네이버는 **헤드리스 브라우저(Playwright) + 내 PC의 주거용 IP + 작업 스케줄러**로 하루 5~10페이지 수준이면 현실적으로 막히지 않는다. 클라우드 IP(Supabase Edge, GitHub Actions)는 429 가능성이 높아 권하지 않는다. 에어비앤비는 더 쉽고, 개인용이면 Apify 액터(월 몇 달러)로 **사서 쓰는** 선택지도 있다.

**무엇을 긁어야 의미가 있나 — 가격이 아니라 가용성이다**
- 네이버 펜션 요금은 대부분 주인이 정한 **고정 요금표**(비수기/성수기 × 주중/금/토)다. 스냅샷 한 번은 "경쟁사 요금표"를 알려줄 뿐 수요를 알려주지 않는다.
- 상용 툴이 실제로 뽑는 신호는 **"날짜 d의 가용 매물이 시간이 갈수록 얼마나 사라지는가"** = 시장 픽업이다. 그래서 **매일 스냅샷**을 쌓아야 한다: `market_snapshots(listing_id, stay_date, snapshot_date, available, price)`.
- 그 위에서 "내 D-7 빈 날에 경쟁 8곳 중 6곳도 비어 있다 → 시장이 약하다 → 할인 근거" / "나만 비었다 → 내 가격 문제"가 나온다. 이게 6-2 툴의 두 번째 신호가 된다.
- 한계: 표본 8개는 노이즈가 크고, 주인이 막은 날(블록)과 예약을 구분 못 한다(상용 툴도 "block removal logic"으로 추정할 뿐).

**비용**: Playwright 스크립트 2~3일 + 테이블/RLS + 카드 1개. 유지보수는 연 2~4회 깨진다고 봐야 한다(네이버 마크업·쿼리 변경).

**판단**: 개인용이면 **예**. 단, 이것부터 시작하지 말 것. 6-2 툴이 먼저 있어야 "시장 데이터가 답해야 할 질문"이 정의된다.

### 6-2. 임박할인 판단 툴 — **예, 이것부터**

"임박한 빈방을 할인할지 감으로 정한다"는 문제는 내 데이터만으로 즉시 답이 나온다. **D일 전에 비어 있던 날이 결국 팔린 비율**(자기 데이터 생존곡선, Wheelhouse Kaplan-Meier의 축소판):

| 시점 | 완료 12개월 전체 | 12개월 일~목 | 12개월 금·토 | 최근 6개월 일~목 | 최근 6개월 금·토 |
|---|---|---|---|---|---|
| D-14 | 64% | 63% | 65% | 69% | 89% |
| D-7 | 54% | 52% | 59% | 62% | 88% |
| D-5 | 50% | 46% | 58% | 55% | 86% |
| D-3 | 47% | 40% | 58% | 41% | 86% |
| D-1 | 40% | 35% | 50% | 29% | 75% |
| D-0 | 30% | 26% | 39% | 17% | 75% |

- 7일 이내 판매된 박의 실현 단가는 그 달 중앙값 대비 **−7%(12개월) / −10%(6개월)**. 당일은 −12%.
- 읽는 법: 최근 반년 기준 **금·토는 D-3에도 86%가 팔리므로 할인할 이유가 없다.** 일~목은 D-3에 41%, D-1에 29%로 떨어지므로 **D-3~D-5 사이가 할인 결정 시점**이다.
- 최근 6개월 단기 구간 표본은 16~34박이라 신뢰구간이 넓다. 12개월과 6개월을 같이 보여주고 "표본 n"을 붙인다.

**결정 규칙(기대값)**
```
유지 기대매출 = p_fill(D) × P
할인 기대매출 = p_fill_disc(D) × P × (1 − x)
→ 할인 x가 정당화되려면 판매확률이 p_fill(D) / (1 − x) 이상으로 올라야 함
   예: D-3 일~목 41%, −15% 할인 → 48% 이상 되어야 본전
```
p_fill_disc는 관측 불가하므로 툴은 **"현재 판매확률 41% · −15%면 48% 넘어야 본전"** 까지만 계산해 보여주고, 판단은 호스트가 한다. 적용 기록이 쌓이면 p_fill_disc를 실측할 수 있다(6-3).

**제품 형태 — "빈방 레이더" 카드**
- 향후 14일 내 빈 날 목록. 각 행: 날짜·요일·D·판매확률(6개월/12개월, n)·고아공실 여부·최근 임박 실현단가·권장(유지 / −10% / −15% / 고아 −20%)·이유 한 줄.
- 예: `9/10(수) D-3 · 판매확률 41% (n=17) · 1박 고아공실 · 최근 임박 단가 −10% → −15% 권장 (본전 48%)`
- 훅 `useLastMinuteRadar` 1개(약 300줄), 스토어의 `bookings`만 사용. 모바일·데스크탑 카드 각 1개. **1~2주.**

**데이터 주의 — iCal 예약의 접수일**
`eventMapper.ts:61`에서 iCal로 들어온 예약의 `bookingDate`는 **처음 동기화된 날**로 기록된다. 동기화가 며칠 늦으면 실제보다 늦게 접수된 것처럼 보여 단기 구간 판매확률이 **과대**된다. 동기화가 매일 돌면 오차는 하루 안팎. 개선안: 알림에서 금액·인원 채울 때 **접수일도 함께 묻기**(예측 정확도에도 도움).

### 6-3. 권장 순서

1. **빈방 레이더**(6-2) — 1~2주. 즉시 감 대신 숫자로 판단.
2. **적용 기록** — "할인함/유지함" 버튼과 결과. 3개월 쌓이면 할인 시 판매확률 실측.
3. **경쟁숙소 가용성 스냅샷**(6-1) — 개인용 Playwright. 레이더에 "시장 공실률" 열 추가.
4. 그 다음에야 4장의 일자별 추천 엔진.

## 7. 출처

**상용 알고리즘**
- [PriceLabs — Overview of Dynamic Pricing Algorithm Part 1](https://hello.pricelabs.co/overview-of-pricelabs-dynamic-pricing-algorithm-part-1/) · [Part 2](https://hello.pricelabs.co/blog/overview-of-pricelabs-dynamic-pricing-algorithm-part-2/)
- [PriceLabs — How to Set Up Dynamic Pricing](https://hello.pricelabs.co/blog/how-to-set-up-dynamic-pricing-in-pricelabs/) · [Hotel dynamic pricing guide](https://hello.pricelabs.co/blog/guide-to-hotel-dynamic-pricing/)
- [Wheelhouse Research — Pricing Engine](https://www.usewheelhouse.com/research/pricing-engine)
- [Beyond — Search-powered pricing](https://www.beyondpricing.com/blog/beyonds-new-search-powered-pricing-search-data-visualization-drives-greater-revenue) · [Beyond review 2026 (BNBCalc)](https://www.bnbcalc.com/reviews/beyond-pricing-review-2026)
- [AirDNA Adapt 출시 (Skift, 2026-09-01)](https://skift.com/2026/09/01/airdna-enters-revenue-management-market-with-host-dynamic-pricing-tool-exclusive/) · [AirDNA Adapt](https://www.airdna.co/adapt)
- [Airbnb Smart Pricing 도움말](https://www.airbnb.com/help/article/1168) · [Hospitable — Smart Pricing alternatives](https://hospitable.com/airbnb-smart-pricing) · [Priceo — Why it underprices](https://www.priceo.io/guides/airbnb-smart-pricing) · [iGMS — Pros and cons](https://www.igms.com/airbnb-smart-pricing/)
- [Guesty — Dynamic pricing strategies 2026](https://www.guesty.com/blog/dynamic-pricing-strategies-maximize-revenue/) · [RevFactor — Beginner's guide](https://www.revfactor.io/blog/dynamic-pricing-str-beginners-guide)

**가격·비교**
- [PriceLabs vs Beyond vs Wheelhouse (rakidzich)](https://www.rakidzich.com/articles/airbnb-pricing-tools-comparison) · [PriceLabs cost 2026](https://www.rakidzich.com/articles/how-much-does-pricelabs-cost-2026) · [StaySTRA showdown 2026](https://staystra.com/pricelabs-vs-wheelhouse-vs-beyond-pricing-2026/) · [Key Data comparison](https://www.keydata.co/blog/what-is-a-dynamic-pricing-tool-pricelabs-vs-beyond-vs-wheelhouse)
- [MagicBNB — Dynamic vs manual 2026](https://magicbnb.io/blog/dynamic-pricing-vs-manual-pricing-airbnb-2026) · [BNBCalc — Smart Pricing review](https://www.bnbcalc.com/reviews/airbnb-smart-pricing-review)

**채널 연동·할인 규칙**
- [Airbnb API guide 2026 (Keysteward)](https://keysteward.co.uk/airbnb-api/) · [Airbnb channel manager tiers (comparatifchannelmanager)](https://comparatifchannelmanager.fr/en/airbnb-api-and-channel-managers/)
- [Airbnb — Combining discounts and rule sets](https://www.airbnb.com/resources/hosting-homes/a/combining-discounts-and-rule-sets-694) · [Rental Scale-Up — Promotions on Airbnb](https://www.rentalscaleup.com/how-to-set-promotions-and-discounts-on-airbnb/) · [Hostaway — Rule sets FAQ](https://support.hostaway.com/hc/en-us/articles/360046899994-Airbnb-Rule-Sets-FAQs)
- [Booking.com Connectivity APIs](https://developers.booking.com/connectivity/docs) · [Rates & Availability FAQ](https://developers.booking.com/connectivity/docs/con-faq-rates-availability) · [Elfsight — Booking.com API partnership](https://elfsight.com/blog/how-to-get-and-use-booking-com-api-partnership-and-integration/)
- [Booking.com — Early Booker & Last-Minute Deals](https://partner.booking.com/en-us/help/rates-availability/rates-special-offers/setting-early-booker-and-last-minute-deals) · [Mobile Rates](https://partner.booking.com/en-us/help/rates-availability/rates-special-offers/setting-mobile-rates)
- [ONDA 채널매니저 A-Z](https://www.onda.me/trend/onda-caeneolmaenijeo-a-z) · [ONDA Developer Center](https://developers.onda.me/docs/glossary/)
- [공공데이터포털 — 한국천문연구원 특일정보 API](https://www.data.go.kr/tcs/dss/selectApiDataDetailView.do?publicDataPk=15012690)

**학술**
- [Modeling Airbnb demand to NYC, listing-level spatial panel (ScienceDirect)](https://www.sciencedirect.com/science/article/abs/pii/S0261517719301980) · [Understanding Guest Preferences (arXiv 2607.00280)](https://arxiv.org/html/2607.00280v1) · [Sources of pricing power on Airbnb](https://www.tandfonline.com/doi/full/10.1080/13683500.2023.2228978)
