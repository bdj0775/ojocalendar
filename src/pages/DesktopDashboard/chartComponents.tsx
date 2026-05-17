import type { ScatterCustomizedShape } from 'recharts';

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
}

export const TrendTooltip = ({ active, payload, label, sym, isDark, ko }: TrendTooltipProps) => {
  if (!active || !payload || payload.length === 0) return null;
  const wrapCls = isDark
    ? 'bg-slate-950/95 backdrop-blur-xl border border-white/10 rounded-inner p-3 px-4 shadow-tooltip'
    : 'bg-white/96 border border-black/[0.08] rounded-inner p-3 px-4 shadow-tooltip';
  const labelCls = isDark ? 'text-[11px] font-bold text-slate-400 mb-2 tracking-wider' : 'text-[11px] font-bold text-slate-500 mb-2 tracking-wider';
  const rowCls = isDark ? 'flex items-center gap-2 text-xs text-slate-200 mb-1.5' : 'flex items-center gap-2 text-xs text-slate-800 mb-1.5';

  const data = (payload[0] as any).payload;
  const margin = data.gross > 0 ? Math.round((data.net / data.gross) * 100) : 0;

  return (
    <div className={wrapCls}>
      <div className={labelCls}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} className={rowCls}>
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${(p.name === '총매출' || p.name === 'Gross') ? 'bg-primary/40' : ''}`} style={{ background: (p.name === '총매출' || p.name === 'Gross') ? undefined : p.color }} />
          <span>{p.name}</span>
          <span className="font-bold ml-auto">
            {p.name === '점유율' || p.name === 'Occupancy' ? `${p.value}%` : `${sym}${p.value?.toLocaleString()}`}
          </span>
        </div>
      ))}
      <div className="h-px bg-border my-2" />
      <div className={rowCls}>
        <span className="w-2 h-2 rounded-full flex-shrink-0 bg-transparent" />
        <span className="text-muted-foreground">ADR</span>
        <span className="font-bold ml-auto">{sym}{data.adr?.toLocaleString()}</span>
      </div>
      <div className={rowCls}>
        <span className="w-2 h-2 rounded-full flex-shrink-0 bg-transparent" />
        <span className="text-muted-foreground">{ko ? '마진율' : 'Margin'}</span>
        <span className="font-bold ml-auto text-success">{margin}%</span>
      </div>
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
          <span>{ko ? '오늘 픽업' : 'Daily Pickup'}</span>
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
interface ScatterDotPayload { x: number; nights: number }
type ScatterDotProps = Parameters<ScatterCustomizedShape>[0] & {
  payload?: ScatterDotPayload;
  xAxis?: { scale?: (v: number) => number };
  fill?: string;
};

export const ScatterDot: ScatterCustomizedShape = (props: ScatterDotProps) => {
  const { cx, cy, payload, xAxis, fill } = props;
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
