# 예측 알고리즘 설명서
> 작성일: 2026-05-21 · 대상 파일: `src/hooks/useDesktopStats.ts` → `computeForecast()`

---

## 1. 유저용 — "점선이 어떻게 계산되나요?"

### 예측이란

월별 추이 차트에서 **실선 = 이미 확정된 예약(OTB)**, **점선 = 월말까지 채워질 것으로 예상되는 최종치**입니다.

예를 들어, 오늘이 5월 21일이고 8월 예약이 10박 잡혀 있다면:

> "이 예약 속도라면 8월 말에는 31박 전부 채워질 것 같다. 예상 매출 ₩6,665,000."

점선은 세 가지 정보를 종합해서 계산합니다.

| 신호 | 내용 | 비중 |
|------|------|------|
| 전년도 동월 (STLY) | 작년 같은 달에 최종적으로 몇 % 찼는가 | 최대 40% |
| 2년 전 동월 | 재작년 같은 달 결과 | 최대 30% |
| 현재 예약 페이스 | 지금 예약 속도가 역사적 평균 대비 앞서는지 뒤처지는지 | 30% |

> **주의:** 오픈 첫 여름(2025년 6~9월)은 시장 안착 전이라 표본 신뢰성이 낮습니다.  
> 이 4개월의 과거 데이터는 예측 신호에서 자동 제외됩니다.  
> 2025년 10월부터는 전년도 동월 데이터가 정상 반영됩니다.

### 신뢰도 %가 의미하는 것

| 신뢰도 | 상황 |
|--------|------|
| 10–25% | 아직 2–3개월 전, 비교할 과거 동월 없음. 방향만 참고 |
| 40–60% | 1개월 전, 현재 예약 페이스가 명확해짐 |
| 70%+ | 전년도 데이터까지 있고 월 시작이 임박 |

신뢰도가 낮다고 해서 예측이 틀렸다는 뜻은 아닙니다. 단지 불확실성이 크다는 의미입니다.

---

## 2. 개발자용 — 알고리즘 5단계

### 사전 조건

```
열린 달 (openingMonthKey) = 전체 예약 중 가장 이른 체크인의 연월
오픈 초기 제외 끝 = openingMonthKey + 3개월  (오픈 첫 여름 4개월만)
  → 예시: 오픈 2025년 6월 → 제외 기간 = 2025-06 ~ 2025-09
  → 2025-10(10월)부터는 STLY/hist2y 신호 정상 편입
```

iCal 자동 동기화(`isAutoSynced = true`) 예약은 `bookingDate`가 실제 예약일이 아닌 동기화 시점이므로 τ 추정에서 제외.

---

### Step 1 — 예약 커브 상수 τ 실증 추정

```
τ (tau) = "월 시작일로부터 τ일 전 시점에, 최종 예약의 약 37%가 들어와 있다"
```

과거 12개월 완료 데이터에서 τ를 직접 측정합니다.

```
각 완료월 m 에 대해:
  - monthBks = 해당 월에 겹치는 박수가 있고, bookingDate가 있으며, iCal이 아닌 예약들
  - dailyCurve[D] = D일 전 이후 들어온 박수 누적
  - 프로브 포인트: D = [90, 75, 60, 45, 30, 21, 14, 7]
  - 모든 쌍 (Da > Db) 에 대해:
      τ = (Da - Db) / ln(cum[Db] / cum[Da])
      (5 < τ < 300인 값만 수집)

최종 τ = 수집된 모든 값의 중앙값 (샘플 < 3이면 fallback = 60)
```

---

### Step 2 — 과거 동월 신뢰성 판단

예측 대상월 `(ty, tm)` 에 대해:

```
STLY      = calcMonthStats(ty-1, tm)   // 전년도 동월
hist2y    = calcMonthStats(ty-2, tm)   // 재작년 동월

stlyIsRampUp   = ((ty-1)*12 + tm) <= openingPeriodEndKey   // 오픈 첫 여름 범위
hist2yIsRampUp = ((ty-2)*12 + tm) <= openingPeriodEndKey

stlyReliable   = !stlyIsRampUp  && stly.bookingCount  >= 3
hist2yReliable = !hist2yIsRampUp && hist2y.bookingCount >= 3
```

신뢰 가능한 데이터가 없으면 **최근 6개월 평균 점유율** (`computeRecentAvgOcc`)을 `histAvgOcc` 대체값으로 사용.

---

### Step 3 — 부킹 커브 완성도

```
미래월 (monthStart > today):
  daysUntilStart = floor((monthStartMs - todayMs) / 86400000)
  curveCompletion = e^(-daysUntilStart / τ)
  → "τ일 전에 약 37%, 2τ일 전에 약 14%가 이미 예약된 상태"

당월 (monthStart <= today):
  curveCompletion = 경과일 / 전체일수
```

---

### Step 4 — OTB 페이스 예측

```
expectedOtbOcc  = histAvgOcc × curveCompletion
paceVariance    = otb.occupancy - expectedOtbOcc   // 양수 = 앞서고 있음
cappedVariance  = clamp(paceVariance, -histAvgOcc×0.5, +histAvgOcc×0.5)
remainingPickup = histAvgOcc × (1 - curveCompletion)
rawPace         = otb.occupancy + remainingPickup + cappedVariance × 0.5 × (1 - curveCompletion)
paceForecast    = clamp(rawPace, otb.occupancy, 100)
```

`cappedVariance × 0.5` — 페이스 앞섬/뒤처짐이 그대로 선형 반영되지 않도록 절반만 적용 (dampening).

---

### Step 5 — 3-신호 앙상블 & 매출 계산

```
weightedOcc = (stly.occupancy × 40 [if reliable])
            + (hist2y.occupancy × 30 [if reliable])
            + (paceForecast × 30)
            ÷ totalWeight

predictedOcc = max(otb.occupancy, round(weightedOcc))   // OTB 이상 보장
```

**ADR 우선순위 (높은 쪽부터):**
```
1. 신뢰 STLY ADR
2. 현재 OTB ADR   (STLY 제외 시 1순위)
3. 과거 평균 ADR
4. 설정 기준 단가 (properties[0].basePrice)
```

```
predictedOccNights = round(predictedOcc/100 × daysInMonth)
predictedGross     = predictedOccNights × predictedAdr
commRate           = otb.gross > 0 ? (otb.gross - otb.net) / otb.gross : 0.12
predictedNet       = predictedGross × (1 - commRate)
```

**신뢰도:**
```
dataScore = min(1, (stlyReliable ? 0.5 : 0) + (historicalOccs.length × 0.25))
timeScore = e^(-daysUntilStart / τ)
confidence = 0.4 × dataScore + 0.6 × timeScore
```

---

## 3. 실제 예시 — 2026년 8월 예측 (오늘: 2026-05-21)

> 이 숙소는 2025년 6월에 오픈. 오픈 초기 제외 기간 = 2025-06 ~ 2025-09 (4개월).

### 전제 수치

| 항목 | 값 |
|------|-----|
| 예측 대상월 | 2026년 8월 (31일) |
| 오늘 | 2026-05-21 |
| 8월 시작까지 남은 일수 | 71일 |
| basePricePerNight | ₩189,000 |
| weekendPricePerNight | ₩229,000 |

---

### τ 추정 결과 (예시)

과거 12개월(2025-06 ~ 2026-05) 중 예약 건수 ≥ 3인 달에서 계산.

**2025년 10월 샘플:**

```
월 시작일: 2025-10-01 (monthStartMs)
해당 월 예약 수: 12건, 총 24박

누적 OTB (probe points):
  D=90 → 3박  (7월 초에 예약된 것들)
  D=60 → 9박
  D=30 → 19박
  D=14 → 23박

쌍별 τ 추정:
  (D=90, D=60): τ = (90-60) / ln(9/3)   = 30 / 1.099 ≈ 27.3
  (D=60, D=30): τ = (60-30) / ln(19/9)  = 30 / 0.748 ≈ 40.1
  (D=90, D=30): τ = (90-30) / ln(19/3)  = 60 / 1.845 ≈ 32.5
  (D=30, D=14): τ = (30-14) / ln(23/19) = 16 / 0.191 ≈ 83.8  ← 이상치(범위 내이므로 포함)
```

12개월 전체에서 수집된 유효 τ값들의 **중앙값 → τ = 42일**

> 이 숙소는 투숙 약 6주 전에 예약이 집중적으로 들어오는 패턴.

---

### 2026년 8월 예측 계산

**① 과거 동월 신뢰성 체크**

```
openingMonthKey     = 2025×12+5 = 24305  (2025년 6월 오픈)
openingPeriodEndKey = 24305 + 3 = 24308  (2025년 9월까지 제외)

STLY   = 2025년 8월: key = 2025×12+7 = 24307 ≤ 24308 → 오픈 첫 여름, 제외
hist2y = 2024년 8월: key = 24295 ≤ 24308, 데이터 없음 → 제외

신뢰 가능한 과거 동월 = 없음
→ histAvgOcc = computeRecentAvgOcc() 호출
```

> 2025년 10월부터는 STLY가 제외되지 않으므로, 2026년 10~12월 예측부터는
> STLY(2025-10 ~ 2025-12)가 정상 편입됩니다.

**② 최근 평균 점유율 (histAvgOcc) — 실제 데이터 기준**

```
Aug 2026 기준 스캔 (최대 18개월 소급, 유효 6개 수집):
  Jun 2026: 80%  (미래 OTB)
  May 2026: 97%
  Apr 2026: 93%
  Mar 2026: 87%
  Feb 2026: 89%
  ─────────────────────────────
  평균 = (80+97+93+87+89) / 5 ≈ 89%
```

**③ 현재 OTB (2026-05-21 기준)**

```
확정 예약: 8건, 10박
OTB 점유율 = round(10/31 × 100) = 32%
OTB 매출   = ₩2,150,000  (평균 단가 ₩215,000, 주중/주말 혼합)
OTB ADR    = ₩2,150,000 / 10박 = ₩215,000
OTB 커미션 ≈ 8%
OTB 순이익 = ₩2,150,000 × 0.92 = ₩1,978,000
```

**④ 부킹 커브 완성도**

```
daysUntilStart  = 71일
curveCompletion = e^(-71 / 42) = e^(-1.690) ≈ 0.185

→ "8월 1일 기준 71일 전인 지금, 최종 예약의 약 18.5%가 들어왔을 것으로 기대"
   실제 OTB 32%는 기대치(16.5%)보다 앞서 있음 → 페이스 우위
```

**⑤ OTB 페이스**

```
expectedOtbOcc  = 89% × 0.185 = 16.5%
paceVariance    = 32% - 16.5% = +15.5%  (앞서고 있음)
cappedVariance  = min(44.5%, 15.5%) = 15.5%  (상한 = 89%×50%)
remainingPickup = 89% × (1 - 0.185) = 72.5%
rawPace         = 32% + 72.5% + 15.5% × 0.5 × (1 - 0.185)
                = 32% + 72.5% + 6.3%
                = 110.8%
paceForecast    = min(100%, max(32%, 110.8%)) = 100%
```

**⑥ 앙상블 (STLY/hist2y 없음 → OTB 페이스 100%)**

```
weightedSum  = 100 × 30 = 3000
totalWeight  = 30
weightedOcc  = 3000 / 30 = 100%
predictedOcc = max(32%, 100%) = 100%
```

**⑦ 예상 매출**

```
predictedAdr       = ₩215,000 (OTB ADR, STLY 없으므로)
predictedOccNights = round(1.00 × 31) = 31박
predictedGross     = 31 × ₩215,000 = ₩6,665,000
commRate           = 8% (OTB에서 도출)
predictedNet       = ₩6,665,000 × 0.92 = ₩6,131,800
```

**⑧ 신뢰도**

```
dataScore  = 0   (신뢰 가능한 STLY/hist2y 없음)
timeScore  = e^(-71/42) = 0.185
confidence = 0.4 × 0 + 0.6 × 0.185 = 0.11 → 11%
```

---

### 같은 달을 D-14 시점(7월 18일)에 다시 계산하면

```
daysUntilStart = 14
curveCompletion = e^(-14/42) = 0.717

(가정) OTB가 26박으로 증가 → OTB 점유율 84%

expectedOtbOcc  = 89% × 0.717 = 63.8%
paceVariance    = 84% - 63.8% = +20.2%
cappedVariance  = min(44.5%, 20.2%) = 20.2%
remainingPickup = 89% × 0.283 = 25.2%
rawPace         = 84% + 25.2% + 20.2% × 0.5 × 0.283 = 84% + 25.2% + 2.9% = 112.1%
paceForecast    = 100%
predictedOcc    = 100%
predictedGross  = ₩6,665,000

timeScore  = 0.717
confidence = 0.4×0 + 0.6×0.717 = 0.43 → 43%
```

> 같은 달이지만 D-71(11%) → D-14(43%)로 신뢰도가 크게 올라감.
> 페이스 앞섬 + 역대 최고 점유율이 맞물려 8월 완판(100%) 예측 유지.

---

## 4. 한계 및 향후 개선 방향

| 현재 한계 | 개선 방향 |
|-----------|-----------|
| 오픈 첫 여름(6~9월) 미반영으로 신뢰도 10–20% | 2026-10 이후 STLY 자동 편입, 신뢰도 즉시 상승 |
| ADR = OTB ADR 고정 (가격 변동 미반영) | 요일별 기준 단가를 활용한 dynamic ADR 예측 |
| τ가 모든 월에 동일하게 적용 | 성수기(여름)/비수기별 τ 분리 추정 |
| 캔슬레이션 미반영 | `status = 'cancelled'` 이력에서 월별 취소율 추출 |
| iCal 예약의 bookingDate 불신뢰 | 채널별 평균 리드타임으로 대체 보정 |
