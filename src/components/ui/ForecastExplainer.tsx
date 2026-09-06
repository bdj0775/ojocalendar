import { LOW_CONFIDENCE_THRESHOLD } from '../../hooks/useDesktopStats';
import type { ForecastExample } from '../../hooks/useForecastExample';

interface ForecastExplainerProps extends ForecastExample {
  ko: boolean;
}

/**
 * 월별추이 카드 ⓘ 팝오버 — "예상 점유율"이 어떻게 나온 숫자인지 설명한다.
 *
 * 원칙 (운영자와 합의, 2026-09):
 * - 등장하는 숫자는 출처가 이 팝오버 안에 있어야 한다.
 * - 짧게. 계산 한 줄 + 신뢰도가 전부다.
 *
 * 픽업6 공식(지금 OTB + 최근 달들의 같은 시점 평균 잔여픽업)을 그대로 보여준다.
 * 공식이 바뀌면 이 문구도 함께 바꿀 것. 상세: FORECAST.md
 */
export const ForecastExplainer = ({
  monthLabel, otbOcc, predictedOcc, expectedPickup, histMonthsUsed,
  confidence, dLabel, isFallback, ko,
}: ForecastExplainerProps) => {
  const lowConf = confidence < LOW_CONFIDENCE_THRESHOLD;
  const hasPickup = expectedPickup != null && histMonthsUsed > 0;
  // 클램프(상한 100%·물리적 상한)에 걸려 단순 합과 결과가 다른 경우
  const capped = hasPickup && predictedOcc !== Math.max(otbOcc, Math.min(100, otbOcc + expectedPickup));

  return (
    <div className="flex flex-col gap-2.5">
      <div className="text-[11px] font-bold text-foreground tracking-tight">
        {ko ? `${monthLabel} 예상 점유율` : `${monthLabel} forecast`}
      </div>

      {isFallback && (
        <p className="text-[10px] text-muted-foreground leading-snug break-keep">
          {ko
            ? '보고 있던 달은 이미 확정돼, 가장 가까운 예측 달로 설명해요.'
            : 'The selected month is already final — showing the nearest forecast month.'}
        </p>
      )}

      <p className="text-[11px] text-muted-foreground leading-relaxed break-keep">
        {hasPickup
          ? (ko
            ? <>최근 {histMonthsUsed}개 달은 이맘때({dLabel})부터 월말까지 평균 <span className="font-semibold text-foreground">{expectedPickup}%p</span> 더 채워졌어요. 지금 확정된 {otbOcc}%에 그만큼을 더한 값이에요.</>
            : <>Over the last {histMonthsUsed} months, occupancy grew by an average of <span className="font-semibold text-foreground">{expectedPickup}pp</span> from this point ({dLabel}) to month-end. That amount is added to the current {otbOcc}%.</>)
          : (ko
            ? '아직 완료된 달 데이터가 부족해, 최근 흐름으로 근사한 값이에요.'
            : 'Not enough completed months yet — approximated from the recent trend.')}
      </p>

      <p className="text-[11px] text-foreground tabular-nums">
        {hasPickup
          ? <>{otbOcc}% + {expectedPickup}%p → <span className="font-bold text-success">{predictedOcc}%</span>{capped && (ko ? ' (상한 적용)' : ' (capped)')}</>
          : <span className="font-bold text-success">{predictedOcc}%</span>}
      </p>

      <div className="border-t border-border/60 pt-2 flex flex-col gap-1">
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
