import { useState } from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceDot, Label,
} from 'recharts';
import { PaceTooltip } from './chartComponents';
import PaceDetailsModal from '../../components/PaceDetailsModal/PaceDetailsModal';
import type { BookingPaceResult } from '../../types';

interface PaceChartProps {
  pace: BookingPaceResult;
  isDark: boolean;
  ko: boolean;
  sym: string;
  fmtShort: (v: number) => string;
}

const PaceChart = ({ pace, isDark, ko, sym, fmtShort }: PaceChartProps) => {
  const [paceMode, setPaceMode] = useState<'occ' | 'rev'>('occ');
  const [isPaceModalOpen, setIsPaceModalOpen] = useState(false);

  const gridColor = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)';
  const tickColor = isDark ? '#64748b' : '#94a3b8';
  const tickColorAlt = isDark ? '#475569' : '#94a3b8';

  const cardCls = 'bg-card text-card-foreground border border-border rounded-2xl p-5 relative overflow-hidden transition-all duration-300 hover:-translate-y-0.5 shadow-sm hover:shadow-lg hover:border-primary/50';
  const toggleGroupCls = 'flex bg-muted rounded-lg overflow-hidden border border-border';
  const toggleBtnCls = 'py-1 px-2.5 text-[11px] font-semibold text-muted-foreground bg-transparent border-0 cursor-pointer tracking-wide whitespace-nowrap transition-all';
  const toggleBtnActiveCls = 'bg-primary/15 text-primary';
  const legendItemCls = 'flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground';
  const baseColors = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#d946ef', '#f43f5e'];

  return (
    <>
      <div className={`mt-6 ${cardCls}`} style={{ padding: '20px' }}>
        <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
          <div className="flex items-center gap-3">
            <span className="whitespace-nowrap font-bold text-[15px] text-foreground">{ko ? '예약 속도 추이 (Booking Pace)' : 'Booking Pace'}</span>
            <div className={toggleGroupCls}>
              <button className={`${toggleBtnCls} ${paceMode === 'occ' ? toggleBtnActiveCls : ''}`} onClick={() => setPaceMode('occ')}>{ko ? '점유율' : 'Occupancy'}</button>
              <button className={`${toggleBtnCls} ${paceMode === 'rev' ? toggleBtnActiveCls : ''}`} onClick={() => setPaceMode('rev')}>{ko ? '매출' : 'Revenue'}</button>
            </div>
            <button
              className="bg-primary/10 text-primary border border-primary/20 py-1 px-2.5 rounded-chip text-xs font-semibold cursor-pointer transition-colors hover:bg-primary/15"
              onClick={() => setIsPaceModalOpen(true)}
            >
              {ko ? '자세히 보기 >' : 'View Details >'}
            </button>
          </div>
          <div className="flex flex-wrap justify-end gap-2.5 flex-1">
            {pace.targets.map(t => {
              const idx = t.offset < 0 ? t.offset + 5 : t.offset + 4;
              const color = t.isCurrent ? 'var(--primary)' : baseColors[idx % baseColors.length];
              return (
                <div key={t.key} className={legendItemCls} style={{ opacity: t.isCurrent ? 1 : 0.8 }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                  <span style={{ fontWeight: t.isCurrent ? 700 : 400, color: t.isCurrent ? (isDark ? '#fff' : '#000') : (isDark ? '#cbd5e1' : '#475569') }}>{t.label}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ width: '100%', height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={pace.paceData} margin={{ top: 30, right: 30, left: paceMode === 'rev' ? 10 : -20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis dataKey="leadDay" type="category" tick={{ fontSize: 11, fill: tickColor, fontWeight: 600 }} tickFormatter={val => val % 15 === 0 ? `D-${val}` : ''} axisLine={false} tickLine={false} />
              <YAxis yAxisId="pace" type="number" domain={paceMode === 'occ' ? [0, 100] : ['auto', 'auto']} tick={{ fontSize: 11, fill: tickColorAlt }} tickFormatter={val => paceMode === 'occ' ? `${val}%` : fmtShort(val)} axisLine={false} tickLine={false} />
              <YAxis yAxisId="bar" orientation="right" hide />
              <Tooltip content={<PaceTooltip isDark={isDark} ko={ko} paceMode={paceMode} sym={sym} />} />

              <Bar yAxisId="bar" dataKey={paceMode === 'occ' ? 'currentDailyNights' : 'currentDailyRev'} fill="var(--primary)" opacity={0.15} radius={[2, 2, 0, 0]} maxBarSize={4} />

              {pace.targets.filter(t => !t.isCurrent).map(t => {
                const idx = t.offset < 0 ? t.offset + 5 : t.offset + 4;
                const color = baseColors[idx % baseColors.length];
                const key = paceMode === 'occ' ? t.key : `${t.key}_rev`;
                return <Line yAxisId="pace" key={key} type="monotone" name={t.label} dataKey={key} stroke={color} strokeWidth={2} dot={false} connectNulls={false} strokeOpacity={isDark ? 0.4 : 0.5} activeDot={{ r: 4, fill: color, strokeWidth: 0 }} />;
              })}
              {pace.targets.filter(t => t.isCurrent).map(t => {
                const key = paceMode === 'occ' ? t.key : `${t.key}_rev`;
                return <Line yAxisId="pace" key={key} type="monotone" name={t.label} dataKey={key} stroke="var(--primary)" strokeWidth={4} dot={false} connectNulls={false} activeDot={{ r: 6, fill: 'var(--primary)', stroke: isDark ? '#0f172a' : '#ffffff', strokeWidth: 2 }} />;
              })}

              {pace.todayLeadDay != null && (
                <ReferenceDot yAxisId="pace" x={pace.todayLeadDay} y={paceMode === 'occ' ? pace.todayOccupancyPct : pace.todayRevenueVal} r={6} fill="var(--primary)" stroke={isDark ? '#0f172a' : '#ffffff'} strokeWidth={3} isFront>
                  <Label position="top" content={(props) => {
                    const vb = props.viewBox as { x: number; y: number };
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
      </div>

      <PaceDetailsModal isOpen={isPaceModalOpen} onClose={() => setIsPaceModalOpen(false)} />
    </>
  );
};

export default PaceChart;
