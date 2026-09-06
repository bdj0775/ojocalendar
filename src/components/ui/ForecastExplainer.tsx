import { LOW_CONFIDENCE_THRESHOLD } from '../../hooks/useDesktopStats';

interface ForecastExplainerProps {
  /** 예시로 보여줄 달 (보통 다음 달 — 예측이 가장 잘 드러난다) */
  monthLabel: string;
  /** 그 달의 현재 확정 점유율 */
  otbOcc: number;
  /** 그 달의 예상 점유율 */
  predictedOcc: number;
  /** 작년 같은 달의 최종 점유율. 자료가 없으면 null */
  lastYearOcc: number | null;
  /** 0~1 */
  confidence: number;
  /** 달 시작까지 남은 일수 */
  daysUntil: number;
  ko: boolean;
}

/**
 * "예상 점유율"이 어떻게 만들어지는지 일반 사용자에게 설명한다.
 *
 * 원칙
 * - 전문용어(OTB, STLY, 편향 등)를 쓰지 않는다. 배경지식이 없다고 가정한다.
 * - 일반론이 아니라 지금 화면의 실제 숫자로 설명한다. 그래야 납득이 된다.
 *
 * 계산 로직 자체는 FORECAST_SYSTEM.md 참고.
 */
export const ForecastExplainer = ({
  monthLabel, otbOcc, predictedOcc, lastYearOcc, confidence, daysUntil, ko,
}: ForecastExplainerProps) => {
  const lowConf = confidence < LOW_CONFIDENCE_THRESHOLD;
  const confPct = Math.round(confidence * 100);

  const stepCls = 'flex gap-2.5';
  const numCls = 'shrink-0 w-4 h-4 rounded-full bg-primary/10 text-primary text-[9px] font-bold flex items-center justify-center mt-[1px]';
  const titleCls = 'text-[11px] font-semibold text-foreground leading-snug';
  const descCls = 'text-[11px] text-muted-foreground leading-snug break-keep mt-0.5';

  return (
    <div className="flex flex-col gap-3">
      <div className="text-[11px] font-bold text-foreground tracking-tight">
        {ko ? '예상 점유율은 이렇게 계산합니다' : 'How the forecast works'}
      </div>

      <div className="flex flex-col gap-2.5">
        <div className={stepCls}>
          <span className={numCls}>1</span>
          <div>
            <div className={titleCls}>{ko ? '지금까지 확정된 예약' : 'Confirmed so far'}</div>
            <div className={descCls}>
              {ko
                ? `${monthLabel}은 이미 ${otbOcc}%가 찼습니다`
                : `${monthLabel} is already ${otbOcc}% booked`}
            </div>
          </div>
        </div>

        <div className={stepCls}>
          <span className={numCls}>2</span>
          <div>
            <div className={titleCls}>{ko ? '앞으로 들어올 예약' : 'Bookings still to come'}</div>
            <div className={descCls}>
              {ko
                ? daysUntil > 0
                  ? `예약이 들어오는 속도로 볼 때, 남은 ${daysUntil}일 동안 더 채워집니다`
                  : '예약이 들어오는 속도로 볼 때, 이번 달 안에 더 채워집니다'
                : 'Based on how fast bookings arrive'}
            </div>
          </div>
        </div>

        <div className={stepCls}>
          <span className={numCls}>3</span>
          <div>
            <div className={titleCls}>{ko ? '작년 같은 달 실적' : 'Same month last year'}</div>
            <div className={descCls}>
              {lastYearOcc != null
                ? (ko
                  ? `작년 ${monthLabel}은 ${lastYearOcc}%였습니다`
                  : `Last year: ${lastYearOcc}%`)
                : (ko
                  ? '작년 자료가 아직 없어 최근 실적을 대신 참고합니다'
                  : 'No data yet — recent months are used instead')}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-border/60 pt-2.5 flex items-baseline justify-between">
        <span className="text-[11px] font-semibold text-foreground">
          {ko ? '예상' : 'Forecast'}
        </span>
        <span className="text-[15px] font-bold text-success tabular-nums">{predictedOcc}%</span>
      </div>

      <p className="text-[10px] text-muted-foreground leading-relaxed break-keep">
        {ko
          ? '날짜가 가까워질수록 실제 예약 속도를 더 크게 반영하고, 지난 예측이 빗나간 만큼 자동으로 보정합니다.'
          : 'As the date nears, actual pace is weighted more heavily, and past forecast errors are corrected automatically.'}
      </p>

      <div className="flex items-center gap-1.5 text-[10px]">
        <span className="text-muted-foreground">{ko ? '신뢰도' : 'Confidence'}</span>
        <span className={`font-bold tabular-nums ${lowConf ? 'text-amber-500' : 'text-foreground'}`}>
          {confPct}%
        </span>
      </div>

      {lowConf && (
        <p className="text-[10px] leading-snug text-amber-500/90 break-keep -mt-1.5">
          {ko
            ? '아직 예약이 들어올 시기가 아니라 참고용입니다'
            : 'Too early for bookings — reference only'}
        </p>
      )}
    </div>
  );
};
