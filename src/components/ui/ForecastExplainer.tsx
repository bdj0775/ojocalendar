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
 *    (가중치 61:39, 보정 +8%p 같은 내부값은 출처 설명이 더 길어져 제외)
 * 2. 새 개념은 한 줄로 설명되지 않으면 도입하지 않는다.
 * 3. 달마다 다른 변형을 만들지 않고 하나의 틀을 쓴다.
 *
 * 남긴 필수 로직 두 가지:
 * - 작년 같은 시점→최종의 흐름을 남은 기간에 적용한다 (3단계)
 * - 지난 예측 오차를 자동 보정한다 (마무리 한 줄)
 *
 * 상세 로직·수치 검증은 FORECAST_SYSTEM.md 참고.
 */
export const ForecastExplainer = ({
  monthLabel, otbOcc, predictedOcc,
  stlyOccAtSamePoint, stlyFinalOcc, confidence, dLabel, isFallback, ko,
}: ForecastExplainerProps) => {
  const lowConf = confidence < LOW_CONFIDENCE_THRESHOLD;
  const hasStly = stlyFinalOcc != null && stlyOccAtSamePoint != null;

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

        {/* 2 — 근거: 작년 같은 시점 → 최종 */}
        <div className={stepCls}>
          <span className={numCls}>2</span>
          <div>
            <div className={titleCls}>
              {ko
                ? `작년 같은 시점(${dLabel})과 비교합니다`
                : `Compare with the same point last year (${dLabel})`}
            </div>
            <div className={descCls}>
              {hasStly
                ? (ko
                  ? <>작년 {monthLabel}은 이맘때 {stlyOccAtSamePoint}%였고,<br />최종 {stlyFinalOcc}%로 마감됐어요</>
                  : <>Last {monthLabel} was {stlyOccAtSamePoint}% at this point,<br />and finished at {stlyFinalOcc}%</>)
                : (ko
                  ? '작년 자료가 아직 없어 최근 몇 달의 흐름을 참고해요'
                  : 'No data from last year yet — recent months are used instead')}
            </div>
          </div>
        </div>

        {/* 3 — 결론: 남은 유입량을 계산해 더함. 100%인 달은 상한에 닿았음을 밝힌다 */}
        <div className={stepCls}>
          <span className={numCls}>3</span>
          <div>
            <div className={titleCls}>
              {ko ? '남은 기간의 유입량을 계산해 더합니다' : 'Add the projected remaining inflow'}
            </div>
            <div className={descCls}>
              {ko
                ? (predictedOcc >= 100
                  ? <>남은 기간에 들어올 예약량을 {hasStly ? '작년 흐름' : '최근 흐름'}으로 계산해 {otbOcc}%에 더해요.<br />계산값이 상한에 이르러 <span className="font-bold text-success">100%</span>로 봐요</>
                  : <>남은 기간에 들어올 예약량을 {hasStly ? '작년 흐름' : '최근 흐름'}으로 계산해 {otbOcc}%에 더하면 <span className="font-bold text-success">{predictedOcc}%</span>예요</>)
                : (predictedOcc >= 100
                  ? <>The remaining inflow, projected from {hasStly ? "last year's" : 'recent'} pattern, is added to {otbOcc}%.<br />It reaches the ceiling, so <span className="font-bold text-success">100%</span></>
                  : <>The remaining inflow, projected from {hasStly ? "last year's" : 'recent'} pattern, added to {otbOcc}% gives <span className="font-bold text-success">{predictedOcc}%</span></>)}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-border/60 pt-2.5 flex flex-col gap-1.5">
        <p className="text-[10px] text-muted-foreground leading-relaxed break-keep">
          {ko
            ? '지난 예측이 실제와 어긋났던 만큼은 자동으로 보정하고 있어요.'
            : 'Past forecast errors are corrected automatically.'}
        </p>

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
