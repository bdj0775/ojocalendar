import { LOW_CONFIDENCE_THRESHOLD } from '../../hooks/useDesktopStats';
import type { ForecastExample } from '../../hooks/useForecastExample';

interface ForecastExplainerProps extends ForecastExample {
  ko: boolean;
}

/**
 * "예상 점유율"이 어떻게 계산되는지 일반 사용자에게 설명한다.
 *
 * 넣을 수 있는 내용의 기준 (운영자와 합의, 2026-09):
 * 1. 등장하는 숫자는 출처가 이 팝오버 안에 있어야 한다.
 * 2. 새 개념은 한 줄로 설명되지 않으면 도입하지 않는다.
 * 3. 달마다 다른 변형을 만들지 않고 하나의 틀을 쓴다.
 *
 * 2026-09 알고리즘 교체(픽업6) 후로는 계산 전체가 팝오버 안에서 재현된다:
 *   지금 점유율(OTB) + 최근 달들의 같은 시점 평균 잔여픽업 = 예상치.
 * 작년 같은 달 수치는 계산에 쓰이지 않는 참고 정보로만 보여준다.
 *
 * 상세 로직·수치 검증은 FORECAST_SYSTEM.md 참고.
 */
export const ForecastExplainer = ({
  monthLabel, otbOcc, predictedOcc, expectedPickup, histMonthsUsed,
  stlyOccAtSamePoint, stlyFinalOcc, confidence, dLabel, isFallback, ko,
}: ForecastExplainerProps) => {
  const lowConf = confidence < LOW_CONFIDENCE_THRESHOLD;
  const hasStly = stlyFinalOcc != null && stlyOccAtSamePoint != null;
  const hasPickup = expectedPickup != null && histMonthsUsed > 0;
  // 클램프(상한 100%·물리적 상한·바닥 OTB)로 단순 합과 결과가 다를 수 있다
  const rawSum = hasPickup ? otbOcc + expectedPickup : null;
  const capped = rawSum != null && predictedOcc !== Math.max(otbOcc, Math.min(100, rawSum));

  const stepCls = 'flex gap-2.5';
  const numCls = 'shrink-0 w-4 h-4 rounded-full bg-primary/10 text-primary text-[9px] font-bold flex items-center justify-center mt-[1px]';
  const titleCls = 'text-[11px] font-semibold text-foreground leading-snug';
  const descCls = 'text-[11px] text-muted-foreground leading-snug break-keep mt-0.5';

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <div className="text-[11px] font-bold text-foreground tracking-tight">
          {ko
            ? `${monthLabel} 예상 점유율은 이렇게 계산해요`
            : `How ${monthLabel}'s forecast is calculated`}
        </div>
        {isFallback && (
          <div className="text-[10px] text-muted-foreground leading-snug break-keep">
            {ko
              ? '지난 달은 이미 확정돼 예측이 없어요. 가장 가까운 달로 설명해 드릴게요.'
              : 'Past months are already final — showing the nearest upcoming month.'}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2.5">
        {/* 1 — 출발점: 확정 예약 */}
        <div className={stepCls}>
          <span className={numCls}>1</span>
          <div>
            <div className={titleCls}>
              {ko ? '지금 확정된 예약을 봅니다' : 'Start from confirmed bookings'}
            </div>
            <div className={descCls}>
              {ko
                ? `${monthLabel}은 이미 ${otbOcc}%가 찼어요`
                : `${monthLabel} is already ${otbOcc}% booked`}
            </div>
          </div>
        </div>

        {/* 2 — 근거: 최근 달들의 같은 시점 → 최종 */}
        <div className={stepCls}>
          <span className={numCls}>2</span>
          <div>
            <div className={titleCls}>
              {ko
                ? `최근 달들의 같은 시점(${dLabel})과 비교합니다`
                : `Compare with recent months at the same point (${dLabel})`}
            </div>
            <div className={descCls}>
              {hasPickup
                ? (ko
                  ? <>최근 {histMonthsUsed}개 달은 이맘때부터 월말까지<br />평균 <span className="font-semibold text-foreground">{expectedPickup}%p</span> 더 채워졌어요</>
                  : <>Over the last {histMonthsUsed} months, occupancy grew<br />by <span className="font-semibold text-foreground">{expectedPickup}pp</span> on average from this point</>)
                : (ko
                  ? '완료된 달의 자료가 아직 없어 최근 흐름으로 근사해요'
                  : 'No completed months yet — approximating from recent trend')}
            </div>
          </div>
        </div>

        {/* 3 — 결론: 그만큼을 더한다. 상한에 닿은 달은 그 사실을 밝힌다 */}
        <div className={stepCls}>
          <span className={numCls}>3</span>
          <div>
            <div className={titleCls}>
              {ko ? '그만큼을 더해 예상치를 만듭니다' : 'Add that amount to get the forecast'}
            </div>
            <div className={descCls}>
              {hasPickup
                ? (capped || predictedOcc >= 100
                  ? (ko
                    ? <>{otbOcc}% + {expectedPickup}%p가 상한에 닿아<br />예상치는 <span className="font-bold text-success">{predictedOcc}%</span>예요</>
                    : <>{otbOcc}% + {expectedPickup}pp hits the ceiling,<br />so the forecast is <span className="font-bold text-success">{predictedOcc}%</span></>)
                  : (ko
                    ? <>{otbOcc}% + {expectedPickup}%p = <span className="font-bold text-success">{predictedOcc}%</span></>
                    : <>{otbOcc}% + {expectedPickup}pp = <span className="font-bold text-success">{predictedOcc}%</span></>))
                : (ko
                  ? <>최근 흐름으로 계산한 예상치는 <span className="font-bold text-success">{predictedOcc}%</span>예요</>
                  : <>The trend-based forecast is <span className="font-bold text-success">{predictedOcc}%</span></>)}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-border/60 pt-2.5 flex flex-col gap-1.5">
        {hasStly && (
          <p className="text-[10px] text-muted-foreground leading-relaxed break-keep">
            {ko
              ? `참고로 작년 ${monthLabel}은 이맘때 ${stlyOccAtSamePoint}%였고, 최종 ${stlyFinalOcc}%로 마감됐어요.`
              : `For reference, last ${monthLabel} was ${stlyOccAtSamePoint}% at this point and finished at ${stlyFinalOcc}%.`}
          </p>
        )}

        <div className="flex items-center gap-1.5 text-[10px]">
          <span className="text-muted-foreground">{ko ? '신뢰도' : 'Confidence'}</span>
          <span className={`font-bold tabular-nums ${lowConf ? 'text-amber-500' : 'text-foreground'}`}>
            {Math.round(confidence * 100)}%
          </span>
        </div>

        {lowConf && (
          <p className="text-[10px] leading-snug text-amber-500/90 break-keep">
            {ko
              ? '아직 예약이 들어올 시기가 아니라 참고용이에요'
              : 'Too early for bookings — reference only'}
          </p>
        )}
      </div>
    </div>
  );
};
