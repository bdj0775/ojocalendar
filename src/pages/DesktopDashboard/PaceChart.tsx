import { useState } from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceDot, Label,
} from 'recharts';
import { PaceTooltip } from './chartComponents';
import PaceDetailsModal from '../../components/PaceDetailsModal/PaceDetailsModal';
import { usePaceInsight } from '../../hooks/usePaceInsight';
import type { BookingPaceResult } from '../../types';

interface PaceChartProps {
  pace: BookingPaceResult;
  isDark: boolean;
  ko: boolean;
  sym: string;
  fmtShort: (v: number) => string;
  compact?: boolean;
  predictedOcc?: number | null;
}

/* ── Compact (mobile) tooltip ── */
const CompactPaceTooltip = ({ active, payload, label, isDark, ko, paceMode, sym }: any) => {
  if (!active || !payload || payload.length === 0) return null;
  const bg = isDark ? 'bg-slate-950/95 border-white/10' : 'bg-white/96 border-black/[0.08]';
  
  const barKeys = ['currentDailyNights', 'currentDailyRev'];
  const validLines = payload.filter((p: any) => !barKeys.includes(p.dataKey) && p.value != null);
  
  // Always pin the current month (primary color) line at the top
  const primaryLine = validLines.find((p: any) => p.stroke === 'var(--primary)');
  const otherLines = validLines
    .filter((p: any) => p.stroke !== 'var(--primary)')
    .sort((a: any, b: any) => b.value - a.value)
    .slice(0, 2);
  
  const lines = primaryLine ? [primaryLine, ...otherLines] : otherLines.slice(0, 3);

  return (
    <div className={`${bg} backdrop-blur-xl border rounded-lg p-1.5 px-2 shadow-lg`}>
      <div className="text-[9px] font-bold text-muted-foreground mb-1">D-{label}</div>
      {lines.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-1.5 text-[9px] mb-0.5">
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: p.color || p.stroke }} />
          <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>{p.name}</span>
          <span className="font-bold ml-auto">
            {paceMode === 'occ' ? `${p.value}%` : `${sym}${p.value.toLocaleString()}`}
          </span>
        </div>
      ))}
    </div>
  );
};

const PaceChart = ({ pace, isDark, ko, sym, fmtShort, compact = false, predictedOcc = null }: PaceChartProps) => {
  const [paceMode, setPaceMode] = useState<'occ' | 'rev'>('occ');
  const [isPaceModalOpen, setIsPaceModalOpen] = useState(false);
  const insight = usePaceInsight(pace, predictedOcc);

  const gridColor = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)';
  const tickColor = isDark ? '#64748b' : '#94a3b8';
  const tickColorAlt = isDark ? '#475569' : '#94a3b8';

  const cardCls = compact
    ? 'bg-card text-card-foreground border border-border/60 rounded-2xl p-4 relative overflow-hidden shadow-sm w-full'
    : 'bg-card text-card-foreground border border-border rounded-2xl p-5 relative overflow-hidden transition-all duration-300 hover:-translate-y-0.5 shadow-sm hover:shadow-lg hover:border-primary/50';
  const toggleGroupCls = compact
    ? 'flex bg-muted rounded-md overflow-hidden border border-border/50'
    : 'flex bg-muted rounded-lg overflow-hidden border border-border';
  const toggleBtnCls = compact
    ? 'py-0.5 px-2 text-[9px] font-semibold text-muted-foreground bg-transparent border-0 cursor-pointer tracking-wide whitespace-nowrap transition-all'
    : 'py-1 px-2.5 text-[11px] font-semibold text-muted-foreground bg-transparent border-0 cursor-pointer tracking-wide whitespace-nowrap transition-all';
  const toggleBtnActiveCls = 'bg-primary/15 text-primary';
  const legendItemCls = compact
    ? 'flex items-center gap-1 text-[9px] font-semibold text-muted-foreground'
    : 'flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground';
  const baseColors = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#d946ef', '#f43f5e'];

  const chartHeight = compact ? 180 : 320;

  return (
    <>
      <div className={`${compact ? '' : 'mt-6'} ${cardCls}`} style={{ padding: compact ? '12px' : '20px' }}>

        {/* Header */}
        <div className={`flex gap-2 mb-3 ${compact ? 'flex-col' : 'items-center justify-between flex-wrap gap-4'}`}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`whitespace-nowrap font-bold text-foreground ${compact ? 'text-[13px]' : 'text-[15px]'}`}>
              {ko ? '예약 속도 추이' : 'Booking Pace'}
            </span>
            <div className={toggleGroupCls}>
              <button className={`${toggleBtnCls} ${paceMode === 'occ' ? toggleBtnActiveCls : ''}`} onClick={() => setPaceMode('occ')}>{ko ? '점유율' : 'OCC'}</button>
              <button className={`${toggleBtnCls} ${paceMode === 'rev' ? toggleBtnActiveCls : ''}`} onClick={() => setPaceMode('rev')}>{ko ? '매출' : 'Rev'}</button>
            </div>
            {!compact && (
              <button
                className="bg-primary/10 text-primary border border-primary/20 py-1 px-2.5 rounded-chip text-xs font-semibold cursor-pointer transition-colors hover:bg-primary/15"
                onClick={() => setIsPaceModalOpen(true)}
              >
                {ko ? '자세히 보기 >' : 'View Details >'}
              </button>
            )}
          </div>

          {/* Legend */}
          <div className={`flex flex-wrap gap-2 ${compact ? '' : 'justify-end flex-1'}`}>
            {pace.targets
              .filter(t => compact ? t.isCurrent : true)
              .map(t => {
                const idx = t.offset < 0 ? t.offset + 5 : t.offset + 4;
                const color = t.isCurrent ? 'var(--primary)' : baseColors[idx % baseColors.length];
                return (
                  <div key={t.key} className={legendItemCls} style={{ opacity: t.isCurrent ? 1 : 0.8 }}>
                    <span className={`${compact ? 'w-1.5 h-1.5' : 'w-2 h-2'} rounded-full`} style={{ background: color }} />
                    <span style={{ fontWeight: t.isCurrent ? 700 : 400, color: t.isCurrent ? (isDark ? '#fff' : '#000') : (isDark ? '#cbd5e1' : '#475569') }}>{t.label}</span>
                  </div>
                );
              })}
          </div>
        </div>

        <div style={{ width: '100%', height: chartHeight }} className={compact ? '-mx-2' : ''}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={pace.paceData} margin={compact ? { top: 25, right: 4, left: -25, bottom: 5 } : { top: 30, right: 16, left: paceMode === 'rev' ? 10 : -20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis
                dataKey="leadDay"
                type="category"
                tick={{ fontSize: compact ? 8 : 11, fill: tickColor, fontWeight: 600 }}
                tickFormatter={val => {
                  if (compact) return val % 30 === 0 ? `D-${val}` : '';
                  return val % 15 === 0 ? `D-${val}` : '';
                }}
                axisLine={false}
                tickLine={false}
                interval={0}
              />
              <YAxis
                yAxisId="pace"
                type="number"
                domain={paceMode === 'occ' ? [0, 100] : ['auto', 'auto']}
                tick={{ fontSize: compact ? 8 : 11, fill: tickColorAlt }}
                tickFormatter={val => paceMode === 'occ' ? `${val}%` : fmtShort(val)}
                axisLine={false}
                tickLine={false}
              />
              <YAxis yAxisId="bar" orientation="right" hide />
              <Tooltip
                content={compact
                  ? <CompactPaceTooltip isDark={isDark} ko={ko} paceMode={paceMode} sym={sym} />
                  : <PaceTooltip isDark={isDark} ko={ko} paceMode={paceMode} sym={sym} />
                }
              />

              <Bar yAxisId="bar" dataKey={paceMode === 'occ' ? 'currentDailyNights' : 'currentDailyRev'} fill="var(--primary)" opacity={0.15} radius={[2, 2, 0, 0]} maxBarSize={compact ? 3 : 4} />

              {pace.targets.filter(t => !t.isCurrent).map(t => {
                const idx = t.offset < 0 ? t.offset + 5 : t.offset + 4;
                const color = baseColors[idx % baseColors.length];
                const key = paceMode === 'occ' ? t.key : `${t.key}_rev`;
                return <Line yAxisId="pace" key={key} type="monotone" name={t.label} dataKey={key} stroke={color} strokeWidth={compact ? 1 : 2} dot={false} connectNulls={false} strokeOpacity={isDark ? 0.35 : 0.4} activeDot={{ r: compact ? 3 : 4, fill: color, strokeWidth: 0 }} />;
              })}
              {pace.targets.filter(t => t.isCurrent).map(t => {
                const key = paceMode === 'occ' ? t.key : `${t.key}_rev`;
                return <Line yAxisId="pace" key={key} type="monotone" name={t.label} dataKey={key} stroke="var(--primary)" strokeWidth={compact ? 2.5 : 4} dot={false} connectNulls={false} activeDot={{ r: compact ? 4 : 6, fill: 'var(--primary)', stroke: isDark ? '#0f172a' : '#ffffff', strokeWidth: 2 }} />;
              })}

              {pace.todayLeadDay != null && (
                <ReferenceDot yAxisId="pace" x={pace.todayLeadDay} y={paceMode === 'occ' ? pace.todayOccupancyPct : pace.todayRevenueVal} r={compact ? 4 : 6} fill="var(--primary)" stroke={isDark ? '#0f172a' : '#ffffff'} strokeWidth={compact ? 2 : 3} isFront>
                  <Label position="top" content={(props) => {
                    const vb = props.viewBox as { x: number; y: number };
                    if (compact) {
                      return (
                        <foreignObject x={vb.x - 35} y={vb.y - 26} width="70" height="22" style={{ overflow: 'visible' }}>
                          <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                            <div style={{ background: 'var(--primary)', color: '#fff', borderRadius: '4px', padding: '2px 8px', fontSize: '9px', fontWeight: '700', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.15)', whiteSpace: 'nowrap' }}>
                              {paceMode === 'occ' ? `${pace.todayOccupancyPct}%` : fmtShort(pace.todayRevenueVal)}
                            </div>
                          </div>
                        </foreignObject>
                      );
                    }
                    return (
                      <foreignObject x={vb.x - 75} y={vb.y - 55} width="150" height="45" style={{ overflow: 'visible' }}>
                        <div style={{ background: isDark ? 'linear-gradient(135deg,var(--primary),var(--primary-hover))' : 'linear-gradient(135deg,#60a5fa,var(--primary))', color: '#fff', borderRadius: 'var(--radius-inner)', padding: '6px 12px', fontSize: '12px', fontWeight: '700', textAlign: 'center', boxShadow: 'var(--shadow-tooltip)', border: '1px solid rgba(255,255,255,0.2)', position: 'relative', display: 'inline-block' }}>
                          {pace.todayStr} {ko ? '오늘' : 'Today'}
                          <div style={{ fontSize: '11px', fontWeight: '500', opacity: 0.9, marginTop: '2px' }}>
                            {paceMode === 'occ' ? `${ko ? '점유율' : 'Occ'} ${pace.todayOccupancyPct}%` : `${ko ? '누적매출' : 'Rev'} ${fmtShort(pace.todayRevenueVal)}`}
                          </div>
                          <div style={{ position: 'absolute', bottom: '-5px', left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: isDark ? '5px solid var(--primary-hover)' : '5px solid var(--primary)' }} />
                        </div>
                      </foreignObject>
                    );
                  }} />
                </ReferenceDot>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* ── Insight Banner ── */}
        {insight.hasEnoughData && (
          compact ? (
            /* Mobile: 1-line summary */
            <div className={`mt-2 flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-muted/50 transition-colors`}>
              <span className="text-[10px] font-medium leading-snug text-foreground/80">
                {ko ? insight.summaryText : insight.summaryTextEn}
              </span>
            </div>
          ) : (
            /* Desktop: 2-column insight cards */
            <div className="mt-4 grid grid-cols-2 gap-3">
              {/* Pace Variance */}
              <div className="rounded-xl p-3 bg-muted/40 border border-border/50">
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                  {ko ? '최근 3개월 평균 대비' : 'vs 3-Month Avg'}
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[18px] font-bold text-foreground">
                    {insight.paceVariancePct > 0 ? '+' : ''}{insight.paceVariancePct}%p
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                  {ko
                    ? insight.paceVariancePct > 0 ? '동일 시점 기준 최근 평균보다 빠름'
                      : insight.paceVariancePct < 0 ? '동일 시점 기준 최근 평균보다 느림'
                      : '최근 3개월 평균과 비슷한 속도'
                    : insight.paceVariancePct > 0 ? 'Faster than recent average pace'
                      : insight.paceVariancePct < 0 ? 'Slower than recent average pace'
                      : 'Similar to recent average pace'
                  }
                </p>
              </div>

              {/* Predicted Final OCC */}
              <div className="rounded-xl p-3 bg-muted/40 border border-border/50">
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                  {ko ? '예상 마감 점유율' : 'Predicted Final OCC'}
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[18px] font-bold text-foreground">
                    {predictedOcc != null ? `${predictedOcc}%` : '-'}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                  {ko
                    ? predictedOcc != null ? `현재 ${pace.todayOccupancyPct}% + 예상 잔여 픽업 ${Math.max(0, Math.round(predictedOcc - pace.todayOccupancyPct))}%p` : '데이터 부족'
                    : predictedOcc != null ? `Current ${pace.todayOccupancyPct}% + expected pickup ${Math.max(0, Math.round(predictedOcc - pace.todayOccupancyPct))}%p` : 'Insufficient data'
                  }
                </p>
              </div>
            </div>
          )
        )}
      </div>

      {!compact && <PaceDetailsModal isOpen={isPaceModalOpen} onClose={() => setIsPaceModalOpen(false)} />}
    </>
  );
};

export default PaceChart;

