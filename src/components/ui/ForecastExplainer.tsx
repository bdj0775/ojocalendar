import { LOW_CONFIDENCE_THRESHOLD } from '../../hooks/useDesktopStats';
import type { ForecastExample } from '../../hooks/useForecastExample';

interface ForecastExplainerProps extends ForecastExample {
  ko: boolean;
}

/**
 * "예상 점유율"이 어떻게 계산되는지 일반 사용자에게 설명한다.
 *
 * 원칙
 * - 전문용어(OTB, STLY, 편향 등)를 쓰지 않는다. 배경지식이 없다고 가정한다.
 * - 화면의 실제 숫자로 설명한다. 특히 2단계에서 작년 "같은 시점"과 비교해,
 *   앞으로 더 들어온다고 보는 근거를 드러낸다.
 * - 어느 달 이야기인지 제목에 항상 밝힌다 (예시로 오해하지 않도록).
 *
 * 계산 로직 자체는 FORECAST_SYSTEM.md 참고.
 */
export const ForecastExplainer = ({
  monthLabel, otbOcc, predictedOcc, pickup,
  stlyOccAtSamePoint, stlyFinalOcc, confidence, daysUntilStart, isFallback, ko,
}: ForecastExplainerProps) => {
  const lowConf = confidence < LOW_CONFIDENCE_THRESHOLD;
  const hasStly = stlyFinalOcc != null;

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
          // 지난 달을 보고 있으면 예측이 없으므로 다른 달로 설명한다는 점을 밝힌다
          <div className="text-[10px] text-muted-foreground leading-snug break-keep">
            {ko
              ? '지난 달은 이미 확정돼 예측이 없어요. 가장 가까운 달로 설명해 드릴게요.'
              : 'Past months are already final — showing the nearest upcoming month.'}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2.5">
        {/* 1 — 출발점 */}
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

        {/* 2 — 근거: 작년 같은 시점과 비교 */}
        <div className={stepCls}>
          <span className={numCls}>2</span>
          <div>
            <div className={titleCls}>
              {ko ? '작년 같은 시점과 비교합니다' : 'Compare with the same point last year'}
            </div>
            <div className={descCls}>
              {!hasStly
                ? (ko
                  ? '작년 자료가 아직 없어 최근 몇 달의 흐름을 대신 참고해요'
                  : 'No data from last year yet — recent months are used instead')
                : stlyOccAtSamePoint != null && daysUntilStart > 0
                  ? (ko
                    ? `작년 ${monthLabel}도 이맘때 ${stlyOccAtSamePoint}%였고, 최종 ${stlyFinalOcc}%로 마감됐어요`
                    : `Last ${monthLabel} was ${stlyOccAtSamePoint}% at this point and finished at ${stlyFinalOcc}%`)
                  : (ko
                    ? `작년 ${monthLabel}은 최종 ${stlyFinalOcc}%로 마감됐어요`
                    : `Last ${monthLabel} finished at ${stlyFinalOcc}%`)}
            </div>
          </div>
        </div>

        {/* 3 — 결론: 덧셈 한 줄 */}
        <div className={stepCls}>
          <span className={numCls}>3</span>
          <div className="min-w-0">
            <div className={titleCls}>
              {ko ? '남은 기간에 들어올 예약을 더합니다' : 'Add the bookings still to come'}
            </div>
            <div className="mt-1.5 flex items-baseline gap-1 text-[11px] tabular-nums whitespace-nowrap">
              <span className="text-muted-foreground">{otbOcc}%</span>
              <span className="text-muted-foreground">+</span>
              <span className="text-muted-foreground">{pickup}%p</span>
              <span className="text-muted-foreground mx-0.5">=</span>
              <span className="text-[13px] font-bold text-success">{predictedOcc}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-border/60 pt-2.5 flex flex-col gap-2">
        <p className="text-[10px] text-muted-foreground leading-relaxed break-keep">
          {ko
            ? '날짜가 가까워질수록 실제 예약 속도를 더 크게 반영하고, 지난 예측이 빗나간 만큼 자동으로 보정해요.'
            : 'As the date nears, actual booking pace is weighted more heavily, and past forecast errors are corrected automatically.'}
        </p>

        <div className="flex items-center gap-1.5 text-[10px]">
          <span className="text-muted-foreground">{ko ? '신뢰도' : 'Confidence'}</span>
          <span className={`font-bold tabular-nums ${lowConf ? 'text-amber-500' : 'text-foreground'}`}>
            {Math.round(confidence * 100)}%
          </span>
        </div>

        {lowConf && (
          <p className="text-[10px] leading-snug text-amber-500/90 break-keep -mt-1">
            {ko
              ? '아직 예약이 들어올 시기가 아니라 참고용이에요'
              : 'Too early for bookings — reference only'}
          </p>
        )}
      </div>
    </div>
  );
};
