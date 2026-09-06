# FORECAST_SYSTEM.md — 점유율 예측 시스템 인수인계 문서

> 최종 갱신: 2026-09-06
> 대상: 이 시스템을 처음 보는 사람 (개발자 / 운영자 본인 / 외주)
> 관련 파일: [`src/hooks/useDesktopStats.ts`](src/hooks/useDesktopStats.ts) — 예측 로직 전부가 이 파일 하나에 있습니다.

---

## 0. 3분 요약

대시보드의 **"월별 추이 (11개월)"** 카드에 점선으로 그려지는 **예상 점유율**을 만드는 시스템입니다.

- **하는 일**: "이번 달(또는 다음 달)이 최종적으로 몇 % 찰까"를 예측
- **핵심 아이디어**: 현재 확정 예약(OTB) + 앞으로 들어올 예약 + 작년 같은 달 실적을 섞는다
- **현재 정확도**: 평균 오차 **14.0%p** (달이 가까울수록 정확 — 20일차 5.5%p)
- **정확도 확인 방법**: `node --import ./__loader-reg.mjs monthly_review.mjs`

**⚠️ 가장 중요한 규칙: 이 로직을 수정했다면 반드시 실제 훅으로 검증하세요.**
공식을 따로 재현한 스크립트로 검증하다가 실제와 다른 결론을 내려 두 번 잘못 고친 전례가 있습니다
(자세한 경위는 [FORECAST_DIAGNOSIS.md](./FORECAST_DIAGNOSIS.md)).

---

## 1. 용어 (이것만 알면 나머지가 읽힙니다)

| 용어 | 뜻 | 예시 |
|---|---|---|
| **점유율(Occupancy)** | 판매된 객실박 ÷ 판매 가능한 객실박 | 30일 중 23박 팔림 → 77% |
| **OTB** (On The Books) | **지금까지 확정된** 예약만으로 계산한 점유율 | 10월이 아직 안 왔는데 이미 74% 예약됨 |
| **STLY** (Same Time Last Year) | 작년 같은 달의 최종 점유율 | 2025년 10월 = 94% |
| **D** | 그 달 **시작까지 남은 일수** | 9월 6일에 10월을 보면 D=25 |
| **픽업(Pickup)** | 앞으로 추가로 들어올 예약량 | OTB 74% → 최종 94%면 픽업 20%p |
| **τ (타우)** | 예약이 얼마나 일찍 들어오는지 나타내는 상수 | 현재 자동 추정값 약 52 |
| **편향(Bias)** | 과거 예측이 습관적으로 빗나간 폭. 자동 보정에 사용 | +8%p면 예측에 8을 더함 |
| **리드타임** | 예약이 체크인 며칠 전에 들어왔는지 | 중앙값 31일 |

---

## 2. 예측이 어떻게 만들어지는가

### 전체 흐름

```
┌─ 입력 ────────────────────────────────────────┐
│  ① OTB          지금까지 확정된 예약            │
│  ② STLY         작년 같은 달 실적               │
│  ③ hist2y       재작년 같은 달 실적             │
│  ④ τ            예약 도착 속도 (자동 추정)       │
└───────────────────────────────────────────────┘
                    ↓
        [1단계] 페이스 예측 만들기
        OTB + 앞으로 들어올 픽업
                    ↓
        [2단계] 과거 실적과 섞기
        달이 가까울수록 페이스를 더 신뢰
                    ↓
        [3단계] 편향 보정
        과거에 빗나간 만큼 되돌림 (최대 ±10%p)
                    ↓
        [4단계] 물리적 상한 적용
        이미 지나간 공실은 복구 불가
                    ↓
              예상 점유율 (%)
```

### 1단계 — 페이스 예측

"지금 확정된 것 + 앞으로 들어올 것"을 계산합니다.

```
진행률(curveCompletion) = exp(-D / τ)        ← 달이 가까울수록 1에 가까워짐
잔여 픽업 = 작년평균점유율 × (1 - 진행률) × 상대페이스
페이스 예측 = OTB + 잔여 픽업 + 속도보정
```

- **진행률**: D=90이면 0.18(아직 초반), D=7이면 0.87(거의 다 들어옴)
- **상대 페이스**: 작년 같은 시점보다 예약이 빠르면 픽업을 최대 2배까지 상향 (0.6~2.0배)

> 📌 **한때 `headroom`이 있었으나 제거됨**
> "만실에 가까우면 덜 팔린다"는 취지로 `(100-OTB)/100`을 곱했는데, 실측과 맞지 않았습니다.
> D-25 기준 실제 픽업이 평균 37%p인데 이 공식은 17%p만 예상해 일관되게 과소예측했고,
> 그 오차를 편향 보정이 되돌리면서 두 장치가 서로 상쇄됐습니다. 다시 넣지 마세요.

### 2단계 — 과거 실적과 섞기 (동적 가중)

```
페이스 비중 = 30 + 50 × 진행률        (30% → 80%)
과거 비중  = 100 - 페이스 비중
   └ STLY : 재작년 = 4 : 3 으로 배분
```

**핵심**: 먼 미래일수록 실제 예약이 거의 없으므로 작년 실적에 의존하고,
달이 가까워질수록 눈앞의 실제 예약 속도를 믿습니다.

이전에는 페이스 비중이 **30% 고정**이라, 코앞의 달도 작년 실적에 70%를 걸어 과대예측했습니다.

### 3단계 — 편향 보정

과거 12개월을 되짚어 "그때 D일 전이었다면 뭐라고 예측했을까"를 계산하고 실제와 비교합니다.
평균적으로 5%p 낮게 예측했다면 앞으로 +5%p를 더합니다. (체중계가 늘 2kg 적게 나오면 +2kg 하는 것과 같음)

- 범위: **D=90 ~ D=-31** (달 시작 전 + 달 진행 중 30일)
- 상한: 샘플 수에 따라 ±2 ~ ±10%p (`biasClampFor`)

> 📌 **주의**: 예측 공식이 이 편향 계산 안에 **한 번 더 복사**되어 있습니다(성능상 인라인).
> 예측 공식을 고치면 **반드시 양쪽 다** 고쳐야 합니다. 한쪽만 고치면
> "옛 공식의 오차로 새 공식을 보정"하게 되어 예측이 폭주합니다. 실제로 그런 버그가 있었습니다.

### 4단계 — 물리적 상한

**진행 중인 달**에만 적용됩니다. 9월 20일에 9월을 예측할 때, 이미 지나간 1~20일의 공실은
되돌릴 수 없습니다. 그래서 `(지나간 실적 + 남은 일수) / 총일수`를 상한으로 씁니다.

---

## 3. 신뢰도 표시

각 예측에는 **신뢰도(0~100%)** 가 함께 계산되어 차트 툴팁에 표시됩니다.

```
신뢰도 = 0.4 × 데이터충실도 + 0.6 × 시간근접도
   └ D가 120일을 넘으면 지수적으로 감쇠
```

**왜 120일인가**: 실측한 예약 리드타임이 근거입니다.

| 지표 | 값 |
|---|---|
| 리드타임 중앙값 | 31일 |
| D-90 이전에 접수되는 비율 | 17% |
| D-180 이전 | 3% |

즉 D-120을 넘는 달은 "아직 안 팔린" 게 아니라 **"팔릴 시기가 오지 않은"** 것이라
판단 근거 자체가 없습니다. 이 구간 예측은 사실상 작년 실적 참조이므로 신뢰도를 낮춥니다.

신뢰도가 **30% 미만**이면 툴팁에 주황색으로 *"아직 예약이 들어올 시기가 아니라 참고용입니다"* 가 표시됩니다.

---

## 4. 현재 정확도 (2026-09-06 실측, 완료된 15개 달)

| 시점 | 평균오차(MAE) | 편향 |
|---|---|---|
| D-60 | 25.8%p | -21.3%p (과소) |
| D-30 | 15.1%p | -11.1%p |
| D-14 | 14.1%p | -9.2%p |
| D-7 | 13.9%p | -11.9%p |
| 1일차 | 13.3%p | +10.7%p (과대) |
| 10일차 | 10.2%p | +8.9%p |
| 20일차 | **5.5%p** | +4.6%p |
| **전체** | **14.0%p** | **-4.2%p** |

**최근 6개월 상세** (D-30 → 월중 순으로 예측 변화):

| 월 | 실제 | D-30 | D-7 | 1일차 | 15일차 |
|---|---|---|---|---|---|
| 2026-03 | 87% | 87%(+0) | 82%(-5) | 95%(+8) | 94%(+7) |
| 2026-04 | 93% | 100%(+7) | 84%(-9) | 95%(+2) | 93%(+0) |
| 2026-05 | 100% | 100%(+0) | 100%(+0) | 92%(-8) | 97%(-3) |
| 2026-06 | 93% | 100%(+7) | 100%(+7) | 92%(-1) | 92%(-1) |
| 2026-07 | 90% | 100%(+10) | 98%(+8) | 92%(+2) | 90%(+0) |
| 2026-08 | 100% | 100%(+0) | 100%(+0) | 90%(-10) | 97%(-3) |

### 알려진 특성

1. **달 시작 전에는 과소, 시작 후에는 과대** — D=0 경계에서 진행률 계산 방식이
   지수함수에서 경과일 비율로 바뀝니다. 이 불연속이 원인으로 보이며, 개선 여지가 있습니다.
2. **이 숙소는 만실이 잦습니다** — 최근 15개월 평균 실제 점유율이 높아, 100% 예측이
   반드시 오류는 아닙니다. 실제로 100%로 끝난 달이 여럿입니다.
3. **D-60 이상은 오차가 큽니다** — 예약이 아직 안 들어온 시기라 구조적 한계입니다.
   신뢰도 표시로 보완하고 있습니다.

---

## 5. 월말 점검 절차 ⭐

매월 말 또는 새 달이 완료될 때마다 실행하면, 예측이 실제와 얼마나 맞았는지 확인하고
정확도가 나아지는지 추적할 수 있습니다.

### 5-1. 데이터 내려받기

Supabase 대시보드 → SQL Editor에서 실행합니다.
**결과가 100줄로 잘리므로 `OFFSET`을 바꿔가며 여러 번 받아야 합니다.**

```sql
-- 전체 건수 먼저 확인
SELECT COUNT(*) FROM bookings
WHERE status IN ('confirmed','checked in','completed');

-- 100건씩 받기 (OFFSET을 0, 100, 200, 300... 으로 바꿔가며 반복)
SELECT guestname, checkin, checkout, bookingdate,
       amount, commission, channel, status, property_id
FROM bookings
WHERE status IN ('confirmed','checked in','completed')
ORDER BY checkin LIMIT 100 OFFSET 0;
```

각 결과를 **Export → Download CSV** 하고, 프로젝트 폴더에 모아둡니다.

### 5-2. 파일 합치기

받은 CSV들을 `bookings_latest.csv` 하나로 합칩니다. 파일명이
`Supabase Snippet Untitled query (1).csv` 형태라면:

```bash
node -e "
const fs=require('fs');let all=[],head=null;
for(const i of [1,2,3,4]){
  const t=fs.readFileSync('Supabase Snippet Untitled query ('+i+').csv','utf8').replace(/^﻿/,'').trim();
  const L=t.split(/\r?\n/); if(!head)head=L[0]; all=all.concat(L.slice(1));
}
fs.writeFileSync('bookings_latest.csv',head+'\n'+all.join('\n'));
console.log('합침:',all.length,'건');
"
```

### 5-3. 점검 실행

```bash
node --import ./__loader-reg.mjs monthly_review.mjs
```

출력에 나오는 **전체 MAE와 편향**을 아래 이력 표에 기록하세요.

> `__loader-reg.mjs` 등이 없다면 6장 "검증 도구" 참고해서 다시 만들면 됩니다.

### 5-4. 정확도 이력

| 점검일 | 완료 달 수 | 전체 MAE | 편향 | 비고 |
|---|---|---|---|---|
| 2026-09-06 | 15개 | 14.0%p | -4.2%p | headroom 제거, 동적가중 도입 후 첫 측정 |
| | | | | |
| | | | | |

**추세 읽는 법**
- MAE가 **줄어들면** 데이터가 쌓이며 예측이 나아지는 것 — 정상
- MAE가 **늘어나면** 영업 패턴이 바뀌었거나 로직 수정이 역효과 — 조사 필요
- 편향이 한쪽으로 **커지면** 아래 조정 가이드 참고

---

## 6. 조정 가이드 — 정확도를 더 높이려면

### 먼저: 조정하기 전에 읽을 것

**한 번에 하나만 바꾸고, 매번 백테스트로 확인하세요.**
두 곳을 동시에 바꾸면 서로 상쇄되어 효과를 알 수 없습니다(실제로 그런 일이 있었습니다).

```bash
# 바꾸기 전 수치 기록
node --import ./__loader-reg.mjs backtest_hook.mjs

# 코드 수정

# 바꾼 뒤 수치 비교
node --import ./__loader-reg.mjs backtest_hook.mjs
```

### 증상별 대응

| 증상 | 원인 후보 | 만질 곳 |
|---|---|---|
| 전반적으로 **과대**예측 (편향 +) | 과거 실적 비중이 큼 | `paceWeight = 30 + 50 × 진행률` 의 계수를 올림 (예: 40+50) |
| 전반적으로 **과소**예측 (편향 −) | 잔여 픽업이 적게 잡힘 | `relPaceRatio` 상한(현재 2.0) 조정 |
| **먼 미래**만 부정확 | 구조적 한계 | `FORECAST_RELIABLE_HORIZON_DAYS`(120)로 신뢰도만 조정 |
| **달 시작 직후** 튐 | D=0 경계 불연속 | `curveCompletion`의 else 분기 (알려진 개선 과제) |
| 편향 보정이 과함/부족 | 샘플 수 대비 상한 | `biasClampFor()` |

### 주요 조정 지점 (전부 `useDesktopStats.ts`)

| 상수/코드 | 현재값 | 의미 |
|---|---|---|
| `FORECAST_RELIABLE_HORIZON_DAYS` | 120 | 이 일수 넘으면 신뢰도 급감 |
| `LOW_CONFIDENCE_THRESHOLD` | 0.3 | 이 미만이면 UI에 "참고용" 표시 |
| `biasClampFor()` | ±2~10%p | 편향 보정 상한 (샘플 수에 따라) |
| `MIN_RELIABLE_BOOKINGS` | 3 | 이 미만 예약인 달은 통계에서 제외 |
| `paceWeight = 30 + 50 × cc` | 30~80 | 페이스 비중 (동적) |
| `relPaceRatio` 범위 | 0.6~2.0 | 상대 페이스 상·하한 |

---

## 7. 검증 도구

### `run_hook_check.mjs` — 지금 화면에 뭐가 나오는지 확인

```bash
node --import ./__loader-reg.mjs run_hook_check.mjs

# 특정 날짜 기준으로 보기
FAKE_TODAY=2026-10-15 node --import ./__loader-reg.mjs run_hook_check.mjs
```

### `backtest_hook.mjs` — 과거 전 구간 정확도 측정

```bash
node --import ./__loader-reg.mjs backtest_hook.mjs
```

D-90부터 30일차까지 모든 시점을 검증합니다. 로직 수정 전후 비교용.

### `monthly_review.mjs` — 월말 정기 점검 (5장 참고)

### ⚠️ 이 도구들이 특별한 이유

세 스크립트 모두 **`useDesktopStats.ts`를 직접 import**하고 React/스토어만 가짜로 채웁니다.
공식을 따로 베껴 쓰지 않으므로 **화면 값과 반드시 일치합니다.**

과거에 공식을 재현한 별도 스크립트로 검증하다가, 편향 샘플 조건이 미묘하게 달라
샘플 수를 3개로 오인(실제 11개)하고 잘못된 수정을 두 번 했습니다.
**앞으로 재현 스크립트는 만들지 마세요.**

### 보조 파일 (gitignore 대상, 없으면 다시 만들 것)

```bash
cat > __loader.mjs <<'EOF'
export async function resolve(specifier, context, next) {
  if (specifier === 'react') return { url: new URL('./__fake_react.mjs', import.meta.url).href, shortCircuit: true };
  if (specifier.endsWith('store/useStore')) return { url: new URL('./__fake_store.mjs', import.meta.url).href, shortCircuit: true };
  if (specifier.endsWith('utils/colors')) return { url: new URL('./__fake_colors.mjs', import.meta.url).href, shortCircuit: true };
  return next(specifier, context);
}
EOF
cat > __loader-reg.mjs <<'EOF'
import { register } from 'node:module';
register('./__loader.mjs', import.meta.url);
EOF
cat > __fake_react.mjs <<'EOF'
export const useMemo = (fn) => fn();
EOF
cat > __fake_store.mjs <<'EOF'
export const useStore = () => globalThis.__STORE__;
useStore.getState = () => globalThis.__STORE__;
EOF
cat > __fake_colors.mjs <<'EOF'
export const getNatColor = () => '#888888';
EOF
```

---

## 8. 데이터 품질 주의사항

예측은 데이터 품질에 직결됩니다. 다음을 주기적으로 확인하세요.

### iCal "Not available" 항목

Booking.com이 게스트 이름을 안 넘기면 `Not available`로 들어옵니다. **두 종류가 섞여 있습니다.**

| 종류 | 판별 | 처리 |
|---|---|---|
| 실제 예약 (이름만 마스킹) | 금액 있음, 보통 며칠 | **그대로 두기** |
| 판매 차단 블록 | **금액 0원**, 장기간 | **삭제** — 예약이 아닌데 점유율을 100%로 만듦 |

과거에 `2027-08-31 ~ 2028-02-29` 182박 0원짜리가 있어 그 기간 점유율이 전부 100%로
계산됐습니다(운영자가 직접 삭제함). 검증 스크립트들은 이 조건으로 자동 제외하지만,
**앱 화면은 제외하지 않습니다.** 발견하면 지우세요.

```sql
-- 의심 항목 찾기
SELECT guestname, checkin, checkout, amount, channel,
       (checkout::date - checkin::date) AS 박수
FROM bookings
WHERE guestname = 'Not available' OR (checkout::date - checkin::date) >= 7
ORDER BY 박수 DESC;
```

### 접수일(bookingdate) 이상치

접수일이 미래이거나 체크인보다 늦으면 편향 계산이 왜곡됩니다.
검증 스크립트는 99퍼센타일로 기준일을 잡아 이상치 1건에 흔들리지 않게 처리했지만,
데이터 자체를 고치는 게 좋습니다.

```sql
SELECT guestname, checkin, bookingdate FROM bookings
WHERE bookingdate > checkin OR bookingdate > CURRENT_DATE
ORDER BY bookingdate DESC;
```

---

## 9. 이 시스템을 건드릴 때 지킬 것

1. **예측 공식은 두 곳에 있습니다** — 본체와 편향 계산 인라인. 항상 함께 고칠 것.
2. **검증은 실제 훅으로** — 재현 스크립트 금지 (7장).
3. **한 번에 하나씩** — 동시에 여러 개 바꾸면 상쇄되어 효과 판별 불가.
4. **100%가 나온다고 버그가 아님** — 이 숙소는 실제로 만실이 잦습니다. 실제 데이터와
   비교해서 판단하세요. 성수기/비수기 통념으로 판단하지 말 것.
5. **[FORECAST_ALGORITHM.md](./FORECAST_ALGORITHM.md)** 는 이전 버전 설명서입니다.
   headroom 등 지금과 다른 내용이 있으니 이 문서를 우선하세요.

---

## 10. 관련 문서

- [FORECAST_DIAGNOSIS.md](./FORECAST_DIAGNOSIS.md) — 2026-09 "100% 고정" 문제 진단 기록. 왜 그렇게 고쳤는지의 근거
- [FORECAST_ALGORITHM.md](./FORECAST_ALGORITHM.md) — 초기 알고리즘 설명서 (일부 낡음)
- [CLAUDE.md](./CLAUDE.md) — 프로젝트 전체 코딩 규칙, 레드라인
- [PROJECT_STATUS.md](./PROJECT_STATUS.md) — 프로젝트 전반 현황
