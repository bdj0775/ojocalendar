import { useState } from 'react';
import { X, BarChart3 } from 'lucide-react';
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';
import { useLeadTimeReport } from '../../hooks/useLeadTimeReport';
import { useTranslation } from '../../hooks/useTranslation';
import { getNatColor } from '../../utils/colors';
import type { ScatterCustomizedShape } from 'recharts';

const CHANNEL_COLORS: Record<string, string> = {
  Airbnb: 'var(--channel-airbnb)',
  'Booking.com': 'var(--channel-booking)',
  Direct: 'var(--channel-direct)',
  Naver: 'var(--channel-naver)',
};


const GUEST_COLORS: Record<string, string> = {
  '1': '#94a3b8',
  '2': '#6366f1',
  '3': 'var(--primary)',
  '4': '#ec4899',
  '5+': '#f59e0b',
};

const ScatterDot = (props: ScatterCustomizedShape) => {
  const { cx, cy, payload, xAxis, fill } = props as { cx?: number; cy?: number; payload: { x: number; nights: number }; xAxis?: { scale?: (v: number) => number }; fill?: string };
  if (cx == null || cy == null) return null;

  let dayWidth = 6;
  if (xAxis?.scale) {
    const w1 = xAxis.scale(payload.x);
    const w2 = xAxis.scale(payload.x + 86400000);
    dayWidth = Math.abs(w2 - w1) * 2.5;
  }

  const w = Math.max(8, dayWidth * payload.nights);
  const h = 12;

  return <rect x={cx - w / 2} y={cy - h / 2} width={w} height={h} fill={fill} rx={4} ry={4} opacity={0.65} />;
};

interface LeadTimeTooltipProps {
  active?: boolean;
  payload?: any[];
  isDark: boolean;
  ko: boolean;
}

const LeadTimeTooltip = ({ active, payload, isDark, ko }: LeadTimeTooltipProps) => {
  if (!active || !payload || payload.length === 0) return null;
  const wrapCls = isDark
    ? 'bg-slate-950/95 backdrop-blur-xl border border-white/10 rounded-inner p-3 px-4 shadow-tooltip'
    : 'bg-white/96 border border-black/[0.08] rounded-inner p-3 px-4 shadow-tooltip';
  const labelCls = isDark ? 'text-[11px] font-bold text-slate-400 mb-2 tracking-wider' : 'text-[11px] font-bold text-slate-500 mb-2 tracking-wider';
  const rowCls = isDark ? 'flex items-center gap-2 text-xs text-slate-200 mb-1' : 'flex items-center gap-2 text-xs text-slate-800 mb-1';

  const data = payload[0].payload;
  const d = new Date(data.x);
  const checkInStr = `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;

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

interface LeadTimeDetailModalProps {
  onClose: () => void;
  isDark?: boolean;
}

const LeadTimeDetailModal = ({ onClose, isDark = false }: LeadTimeDetailModalProps) => {
  const { language } = useTranslation();
  const ko = language === 'ko';
  const report = useLeadTimeReport();
  const [leadTimeMode, setLeadTimeMode] = useState<'channel' | 'nationality' | 'guests'>('channel');

  const gridColor = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)';
  const tickColor = isDark ? '#64748b' : '#94a3b8';
  const tickColorAlt = isDark ? '#475569' : '#cbd5e1';



  const contentBg = isDark
    ? 'bg-gradient-to-br from-[rgba(25,30,50,0.95)] to-[rgba(15,20,35,0.98)] border border-white/10 text-slate-200'
    : 'bg-gradient-to-br from-white/95 to-slate-50/98 border border-black/[0.08] text-slate-800';

  const cardBg = isDark ? 'bg-black/20 border border-white/5' : 'bg-white/50 border border-black/5';
  const toggleBg = isDark ? 'bg-white/[0.06] border border-white/[0.06]' : 'bg-black/[0.04] border border-black/[0.06]';
  const activeBtnCls = isDark ? 'bg-primary-500/20 text-primary-400' : 'bg-primary/12 text-primary-700';
  const statCardBg = isDark ? 'bg-white/[0.03] border border-white/5' : 'bg-white/80 border border-black/[0.06]';
  const rankItemBg = isDark ? 'bg-black/20' : 'bg-black/[0.03]';

  return (
    <div
      className={`fixed inset-0 bg-black/60 backdrop-blur-2xl z-overlay flex justify-center items-center opacity-0 animate-[fadeIn_0.3s_forwards]`}
      onClick={onClose}
    >
      <div
        className={`w-[90%] max-w-[1200px] max-h-[90vh] rounded-2xl p-8 overflow-y-auto relative shadow-modal translate-y-5 animate-[slideUp_0.4s_cubic-bezier(0.16,1,0.3,1)_forwards] ${contentBg}`}
        onClick={e => e.stopPropagation()}
      >
        <button
          className={`absolute top-6 right-6 w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 cursor-pointer z-10 transition-all hover:text-red-400 ${isDark ? 'bg-white/[0.05] hover:bg-red-500/15' : 'bg-black/[0.05] hover:bg-red-500/10'}`}
          onClick={onClose}
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="mb-6">
          <h2 className={`text-2xl font-extrabold mb-2 ${isDark ? 'gradient-text' : 'gradient-text-light'}`}>
            {ko ? '리드타임 상세 분석 리포트' : 'Lead Time Analytics Report'}
          </h2>
          <p className="text-sm text-slate-400">
            {ko ? '과거 8개월부터 향후 3개월까지의 예약 트렌드를 분석합니다.' : 'Analyzing booking trends from the past 8 months to the next 3 months.'}
          </p>
        </div>

        {/* Scatter Chart */}
        <div className={`rounded-2xl p-6 mb-6 ${cardBg}`}>
          <div className="flex justify-between items-center mb-4">
            <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              {ko ? '전체 기간 리드타임 분포 (12개월)' : '12-Month Lead Time Distribution'}
            </span>
            <div className={`flex rounded-lg overflow-hidden ${toggleBg}`}>
              {(['channel', 'nationality', 'guests'] as const).map(mode => (
                <button
                  key={mode}
                  className={`px-4 py-1.5 text-xs font-semibold transition-all ${leadTimeMode === mode ? activeBtnCls : 'text-slate-500 bg-transparent border-none'}`}
                  onClick={() => setLeadTimeMode(mode)}
                >
                  {mode === 'channel' ? (ko ? '채널' : 'Channel') : mode === 'nationality' ? (ko ? '국적' : 'Nationality') : (ko ? '인원' : 'Guests')}
                </button>
              ))}
            </div>
          </div>

          <ResponsiveContainer width="100%" height={260}>
            <ScatterChart margin={{ top: 15, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis
                dataKey="x" type="number" domain={[report.startX, report.endX]}
                tickFormatter={(v) => {
                  const d = new Date(v);
                  return d.getDate() === 1
                    ? (ko ? `${d.getFullYear().toString().slice(2)}년 ${d.getMonth() + 1}월` : d.toLocaleString(language, { month: 'short', year: '2-digit' }))
                    : '';
                }}
                ticks={(() => {
                  const ticks: number[] = [];
                  const start = new Date(report.startX);
                  const end = new Date(report.endX);
                  let cur = new Date(start.getFullYear(), start.getMonth(), 1);
                  while (cur <= end) { ticks.push(cur.getTime()); cur.setMonth(cur.getMonth() + 1); }
                  return ticks;
                })()}
                axisLine={false} tickLine={false}
                tick={{ fontSize: 11, fill: tickColor, fontWeight: 600 }}
              />
              <YAxis dataKey="y" type="number" domain={[0, 150]} ticks={[0, 30, 60, 90, 120, 150]} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: tickColor }} />
              <ZAxis dataKey="nights" range={[10, 100]} />
              <Tooltip cursor={{ strokeDasharray: '3 3', stroke: gridColor }} content={<LeadTimeTooltip isDark={isDark} ko={ko} />} />
              {leadTimeMode === 'channel' && Object.keys(CHANNEL_COLORS).map(ch => (
                <Scatter key={ch} name={ch} data={report.scatterData.filter(d => d.channel === ch)} fill={CHANNEL_COLORS[ch]} shape={<ScatterDot />} />
              ))}
              {leadTimeMode === 'nationality' && report.natKeys.map((nat) => (
                <Scatter key={nat} name={nat} data={report.scatterData.filter(d => d.nationality === nat)} fill={getNatColor(nat)} shape={<ScatterDot />} />
              ))}
              {leadTimeMode === 'guests' && ['1', '2', '3', '4', '5+'].map(gKey => (
                <Scatter key={gKey} name={`${gKey}${ko ? '인' : ' Guests'}`} data={report.scatterData.filter(d => { const g = d.guests || 2; return gKey === '5+' ? g >= 5 : g === parseInt(gKey); })} fill={GUEST_COLORS[gKey]} shape={<ScatterDot />} />
              ))}
            </ScatterChart>
          </ResponsiveContainer>

          <div className="flex gap-4 justify-center mt-4 flex-wrap">
            {leadTimeMode === 'channel' && Object.keys(CHANNEL_COLORS).map(ch => (
              <div key={ch} className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                <span className="w-2 h-2 rounded-full" style={{ background: CHANNEL_COLORS[ch] }} />{ch}
              </div>
            ))}
            {leadTimeMode === 'nationality' && report.natKeys.map((nat) => (
              <div key={nat} className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                <span className="w-2 h-2 rounded-full" style={{ background: getNatColor(nat) }} />{nat}
              </div>
            ))}
            {leadTimeMode === 'guests' && ['1', '2', '3', '4', '5+'].map(gKey => (
              <div key={gKey} className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                <span className="w-2 h-2 rounded-full" style={{ background: GUEST_COLORS[gKey] }} />{gKey}{ko ? '인' : ' Guests'}
              </div>
            ))}
          </div>
        </div>

        {/* Daily Histogram & Buckets */}
        <div className="grid grid-cols-[2fr_1fr] gap-6 mb-6 max-[900px]:grid-cols-1">
          <div className={`rounded-2xl p-6 ${statCardBg}`}>
            <div className={`text-base font-bold mb-4 flex items-center gap-2 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              <BarChart3 size={18} color="var(--primary)" />
              {ko ? '일별 예약 집중도 (0~150일)' : 'Daily Lead Time Concentration'}
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={report.dailyHistogram} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="days" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: tickColor }} ticks={[0, 30, 60, 90, 120, 150]} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: tickColorAlt }} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
                  contentStyle={{ background: isDark ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.95)', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)', borderRadius: 'var(--radius-inner)', fontSize: 12, color: isDark ? '#e2e8f0' : '#1e293b' }}
                  formatter={(value: number) => [value + (ko ? '건' : ' bookings'), ko ? '예약 수' : 'Bookings']}
                  labelFormatter={(label) => `${label}${ko ? '일 전' : ' days before'}`}
                />
                <Bar dataKey="count" fill="var(--primary)" radius={[2, 2, 0, 0]} maxBarSize={8} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className={`rounded-2xl p-6 ${statCardBg}`}>
            <div className={`text-base font-bold mb-5 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              {ko ? '리드타임 구간별 비중' : 'Lead Time Buckets'}
            </div>
            <div className="flex flex-col gap-4">
              {report.buckets.map((b, i) => (
                <div key={i} className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-sm">
                    <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{ko ? b.label : b.labelEn}</span>
                    <span className="font-bold">{b.pct}% <span className="text-xs font-normal text-slate-400">({b.count})</span></span>
                  </div>
                  <div className="h-2 w-full bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${b.pct}%`, background: b.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Avg Stats */}
        <div className={`rounded-2xl p-6 mb-6 ${statCardBg}`}>
          <div className={`text-base font-bold mb-5 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
            {ko ? '세부 조건별 평균 리드타임' : 'Average Lead Times by Category'}
          </div>
          <div className="grid grid-cols-3 gap-4 max-[768px]:grid-cols-1">
            {[
              { title: ko ? '채널별' : 'By Channel', items: report.avgChannel.slice(0, 4) },
              { title: ko ? '국가별' : 'By Nation', items: report.avgNat.slice(0, 4) },
              { title: ko ? '인원별' : 'By Guests', items: report.avgGuest.slice(0, 4) },
            ].map(({ title, items }) => (
              <div key={title} className="flex flex-col gap-3">
                <div className="text-[13px] font-semibold text-slate-400 text-center uppercase tracking-[0.05em] mb-1">{title}</div>
                {items.length > 0 ? items.map((item, i) => (
                  <div key={i} className={`flex justify-between items-center px-3 py-3 rounded-xl border border-transparent ${isDark ? 'bg-white/[0.04]' : 'bg-white/60 border-black/[0.04]'}`}>
                    <span className={`text-[13px] font-semibold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{item.key}</span>
                    <span className={`text-[13px] font-extrabold ${isDark ? 'text-primary-400' : 'text-primary-700'}`}>{item.avg}{ko ? '일 전' : 'd'}</span>
                  </div>
                )) : (
                  <div className="text-slate-500 text-sm text-center py-4">{ko ? '데이터 없음' : 'No Data'}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadTimeDetailModal;
