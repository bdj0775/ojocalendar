// ScatterCustomizedShape is not a public export in some recharts versions — use any-based shape
// eslint-disable-next-line @typescript-eslint/no-explicit-any

// ── Constants ─────────────────────────────────────────────────
export const CHANNEL_COLORS: Record<string, string> = {
  Airbnb: 'var(--channel-airbnb)',
  'Booking.com': 'var(--channel-booking)',
  Direct: 'var(--channel-direct)',
  Naver: 'var(--channel-naver)',
};

export const GUEST_COLORS: Record<string, string> = {
  '1': 'var(--muted-foreground)',
  '2': 'var(--accent-foreground)',
  '3': 'var(--primary)',
  '4': '#ec4899',
  '5+': '#f59e0b',
};

// ── Trend Tooltip ─────────────────────────────────────────────
interface TrendTooltipProps {
  active?: boolean;
  payload?: Array<{ color: string; name: string; value: number }>;
  label?: string;
  sym: string;
  isDark: boolean;
  ko: boolean;
  compact?: boolean;
}

export const TrendTooltip = ({ active, payload, label, sym, isDark, ko, compact }: TrendTooltipProps) => {
  if (!active || !payload || payload.length === 0) return null;
  const minW    = compact ? 'min-w-[155px]' : 'min-w-[200px]';
  const pad     = compact ? 'p-2 px-2.5'    : 'p-3 px-4';
  const wrapCls = isDark
    ? `bg-slate-950/95 backdrop-blur-xl border border-white/10 rounded-inner ${pad} shadow-tooltip ${minW}`
    : `bg-white/96 border border-black/[0.08] rounded-inner ${pad} shadow-tooltip ${minW}`;
  const labelCls = isDark
    ? 'text-[10px] font-bold text-slate-400 mb-1.5 tracking-wider'
    : 'text-[10px] font-bold text-slate-500 mb-1.5 tracking-wider';
  const rowMb  = compact ? 'mb-1' : 'mb-1.5';
  const rowCls = isDark
    ? `flex items-center gap-2 text-xs text-slate-200 ${rowMb}`
    : `flex items-center gap-2 text-xs text-slate-800 ${rowMb}`;

  const data = (payload[0] as any).payload;
  const hasForecast = data.predictedOcc != null;
  const occ    = data.occupancy ?? 0;
  const gross  = data.gross ?? 0;
  const net    = data.net ?? 0;
  const margin = gross > 0 ? Math.round((net / gross) * 100) : 0;
  const divMy  = compact ? 'my-1' : 'my-2';

  return (
    <div className={wrapCls}>
      <div className={labelCls}>{label} {data.year}</div>

      <div className={rowCls}>
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-success" />
        <span>{ko ? '점유율' : 'OCC'}</span>
        <span className="font-bold ml-auto">{occ}%</span>
      </div>
      <div className={rowCls}>
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-primary/40" />
        <span>{ko ? '총매출' : 'Gross'}</span>
        <span className="font-bold ml-auto">{sym}{gross.toLocaleString()}</span>
      </div>
      <div className={rowCls}>
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-primary" />
        <span>{ko ? '순이익' : 'Net'}</span>
        <span className="font-bold ml-auto">{sym}{net.toLocaleString()}</span>
      </div>

      {/* compact 모드에서는 ADR·마진율 생략 */}
      {!compact && (
        <>
          <div className={`h-px bg-border/40 ${divMy}`} />
          <div className={rowCls}>
            <span className="text-muted-foreground">ADR</span>
            <span className="font-bold ml-auto">{sym}{data.adr?.toLocaleString()}</span>
          </div>
          <div className={rowCls}>
            <span className="text-muted-foreground">{ko ? '마진율' : 'Margin'}</span>
            <span className="font-bold ml-auto text-success">{margin}%</span>
          </div>
        </>
      )}

      {/* 월말 예측 */}
      {hasForecast && (
        <>
          <div className={`h-px bg-border/40 ${divMy}`} />
          <div className={`flex items-center justify-between ${compact ? 'mb-1' : 'mb-1.5'}`}>
            <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">
              {ko ? '월말 예측' : 'Forecast'}
            </span>
            {data.forecastConfidence != null && (
              <span className="text-[9px] text-muted-foreground/50 tabular-nums">
                {Math.round(data.forecastConfidence * 100)}%
              </span>
            )}
          </div>
          <div className={rowCls}>
            <span style={{ width: 12, height: 0, borderBottom: '2px dashed var(--success)', display: 'inline-block', flexShrink: 0 }} />
            <span>{ko ? '예상 점유율' : 'Pred. OCC'}</span>
            <span className="font-bold ml-auto">{data.predictedOcc ?? '–'}%</span>
          </div>
          {/* compact 모드에서는 예상 매출 생략 */}
          {!compact && (
            <div className={rowCls}>
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-primary/20" />
              <span>{ko ? '예상 매출' : 'Pred. Gross'}</span>
              <span className="font-bold ml-auto">{sym}{(data.predictedGross ?? 0).toLocaleString()}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ── Lead Time Tooltip ─────────────────────────────────────────
interface LeadTimeTooltipProps {
  active?: boolean;
  payload?: any[];
  isDark: boolean;
  ko: boolean;
}

export const LeadTimeTooltip = ({ active, payload, isDark, ko }: LeadTimeTooltipProps) => {
  if (!active || !payload || payload.length === 0) return null;
  const wrapCls = isDark
    ? 'bg-slate-950/95 backdrop-blur-xl border border-white/10 rounded-inner p-3 px-4 shadow-tooltip'
    : 'bg-white/96 border border-black/[0.08] rounded-inner p-3 px-4 shadow-tooltip';
  const labelCls = isDark ? 'text-[11px] font-bold text-slate-400 mb-2 tracking-wider' : 'text-[11px] font-bold text-slate-500 mb-2 tracking-wider';
  const rowCls = isDark ? 'flex items-center gap-2 text-xs text-slate-200 mb-1' : 'flex items-center gap-2 text-xs text-slate-800 mb-1';

  const data = payload[0].payload;
  const d = new Date(data.x);
  const checkInStr = `${d.getMonth() + 1}/${d.getDate()}`;

  return (
    <div className={wrapCls}>
      <div className={labelCls}>{data.guestName || (ko ? '예약' : 'Booking')}</div>
      <div className={rowCls}>
        <span className="text-muted-foreground w-16">{ko ? '체크인' : 'Check-in'}</span>
        <span className="font-bold ml-auto">{checkInStr}</span>
      </div>
      <div className={rowCls}>
        <span className="text-muted-foreground w-16">{ko ? '리드타임' : 'Lead Time'}</span>
        <span className="font-bold ml-auto">{data.y}{ko ? '일 전' : 'd before'}</span>
      </div>
      <div className={rowCls}>
        <span className="text-muted-foreground w-16">{ko ? '숙박일' : 'Stay'}</span>
        <span className="font-bold ml-auto">{data.nights}{ko ? '박' : ' nights'}</span>
      </div>
    </div>
  );
};

// ── Pace Tooltip ──────────────────────────────────────────────
interface PaceTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  isDark: boolean;
  ko: boolean;
  paceMode: 'occ' | 'rev';
  sym: string;
}

export const PaceTooltip = ({ active, payload, label, isDark, ko, paceMode, sym }: PaceTooltipProps) => {
  if (!active || !payload || payload.length === 0) return null;
  const wrapCls = isDark
    ? 'bg-slate-950/95 backdrop-blur-xl border border-white/10 rounded-inner p-3 px-4 shadow-tooltip'
    : 'bg-white/96 border border-black/[0.08] rounded-inner p-3 px-4 shadow-tooltip';
  const labelCls = isDark ? 'text-[11px] font-bold text-slate-400 mb-2 tracking-wider' : 'text-[11px] font-bold text-slate-500 mb-2 tracking-wider';
  const rowCls = isDark ? 'flex items-center gap-2 text-xs text-slate-200 mb-1.5' : 'flex items-center gap-2 text-xs text-slate-800 mb-1.5';

  const formatValue = (v: number) => paceMode === 'occ' ? `${v}%` : `${sym}${v.toLocaleString()}`;

  const pickupKey = paceMode === 'occ' ? 'currentDailyNights' : 'currentDailyRev';
  const pickupItem = payload.find(p => p.dataKey === pickupKey);
  const lines = payload.filter(p => p.dataKey !== 'currentDailyNights' && p.dataKey !== 'currentDailyRev' && p.value != null).sort((a, b) => b.value - a.value);

  return (
    <div className={wrapCls}>
      <div className={labelCls}>D-{label} {ko ? '누적 페이스' : 'Cumulative Pace'}</div>
      {pickupItem && pickupItem.value > 0 && (
        <div className="mb-2 bg-primary/10 rounded px-2 py-1 flex items-center justify-between text-xs text-primary font-bold">
          <span>{ko ? '당일 픽업' : 'Daily Pickup'}</span>
          <span>{paceMode === 'occ' ? `${pickupItem.value}박` : `${sym}${pickupItem.value.toLocaleString()}`}</span>
        </div>
      )}
      {lines.map((p, i) => (
        <div key={i} className={rowCls}>
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span>{p.name}</span>
          <span className="font-bold ml-auto">{formatValue(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

// ── Scatter Dot ───────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ScatterDot = (props: any) => {
  const { cx, cy, payload, xAxis, fill } = props as {
    cx?: number; cy?: number; fill?: string;
    payload?: { x: number; nights: number };
    xAxis?: { scale?: (v: number) => number };
  };
  if (cx == null || cy == null || !payload) return null;
  let dayWidth = 4;
  if (xAxis?.scale) {
    const w1 = xAxis.scale(payload.x);
    const w2 = xAxis.scale(payload.x + 86400000);
    dayWidth = Math.abs(w2 - w1) * 1.5;
  }
  const w = Math.max(6, dayWidth * payload.nights);
  const h = 8;
  return <rect x={cx - w / 2} y={cy - h / 2} width={w} height={h} fill={fill} rx={3} ry={3} opacity={0.65} />;
};
