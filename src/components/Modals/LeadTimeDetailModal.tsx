import { useState } from 'react';
import { X } from 'lucide-react';
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { useLeadTimeReport } from '../../hooks/useLeadTimeReport';
import { useTranslation } from '../../hooks/useTranslation';
import { getNatColor } from '../../utils/colors';
import { CHANNEL_COLORS, LeadTimeTooltip, ScatterDot } from '../../pages/DesktopDashboard/chartComponents';

const GUEST_COLORS: Record<string, string> = {
  '1': '#94a3b8',
  '2': '#6366f1',
  '3': 'var(--primary)',
  '4': '#ec4899',
  '5+': '#f59e0b',
};

interface LeadTimeDetailModalProps {
  onClose: () => void;
  isDark?: boolean;
}

const LeadTimeDetailModal = ({ onClose, isDark = false }: LeadTimeDetailModalProps) => {
  const { language } = useTranslation();
  const ko = language === 'ko';
  const report = useLeadTimeReport();
  const [mode, setMode] = useState<'channel' | 'nationality' | 'guests'>('channel');

  const gridColor = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)';
  const tickColor = isDark ? '#64748b' : '#94a3b8';

  const contentBg = isDark
    ? 'bg-gradient-to-br from-[rgba(25,30,50,0.95)] to-[rgba(15,20,35,0.98)] border border-white/10 text-slate-200'
    : 'bg-gradient-to-br from-white/95 to-slate-50/98 border border-black/[0.08] text-slate-800';
  const toggleBg      = isDark ? 'bg-white/[0.06] border border-white/[0.06]' : 'bg-black/[0.04] border border-black/[0.06]';
  const activeBtnCls  = isDark ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary';

  const xTicks = (() => {
    const ticks: number[] = [];
    let cur = new Date(new Date(report.startX).getFullYear(), new Date(report.startX).getMonth(), 1);
    const end = new Date(report.endX);
    while (cur <= end) { ticks.push(cur.getTime()); cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1); }
    return ticks;
  })();

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-2xl z-overlay flex justify-center items-center opacity-0 animate-[fadeIn_0.3s_forwards]"
      onClick={onClose}
    >
      <div
        className={`w-[92%] max-w-[860px] max-h-[85vh] rounded-2xl p-6 overflow-y-auto relative shadow-modal translate-y-5 animate-[slideUp_0.4s_cubic-bezier(0.16,1,0.3,1)_forwards] ${contentBg}`}
        onClick={e => e.stopPropagation()}
      >
        {/* 닫기 */}
        <button
          className={`absolute top-5 right-5 w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer z-10 transition-all text-muted-foreground hover:text-destructive ${isDark ? 'bg-white/[0.05] hover:bg-destructive/15' : 'bg-black/[0.05] hover:bg-destructive/10'}`}
          onClick={onClose}
        >
          <X size={20} />
        </button>

        {/* 헤더 */}
        <div className="mb-5 pr-10">
          <h2 className={`text-xl font-extrabold mb-1 ${isDark ? 'gradient-text' : 'gradient-text-light'}`}>
            {ko ? '리드타임 분포' : 'Lead Time Distribution'}
          </h2>
          <p className="text-xs text-muted-foreground">
            {report.totalBookings > 0
              ? (ko
                  ? `총 ${report.totalBookings}건 · 평균 ${report.overallAvgDays}일 전 예약`
                  : `${report.totalBookings} bookings · avg ${report.overallAvgDays}d before check-in`)
              : (ko ? '데이터 없음' : 'No data')}
          </p>
        </div>

        {/* 모드 토글 */}
        <div className={`flex rounded-lg overflow-hidden mb-4 w-fit ${toggleBg}`}>
          {(['channel', 'nationality', 'guests'] as const).map(m => (
            <button
              key={m}
              className={`px-4 py-1.5 text-xs font-semibold transition-all border-0 cursor-pointer ${mode === m ? activeBtnCls : 'text-muted-foreground bg-transparent'}`}
              onClick={() => setMode(m)}
            >
              {m === 'channel' ? (ko ? '채널' : 'Channel') : m === 'nationality' ? (ko ? '국적' : 'Nationality') : (ko ? '인원' : 'Guests')}
            </button>
          ))}
        </div>

        {/* 산점도 */}
        <ResponsiveContainer width="100%" height={280}>
          <ScatterChart margin={{ top: 10, right: 16, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis
              dataKey="x" type="number"
              domain={[report.startX, report.endX]}
              ticks={xTicks}
              tickFormatter={v => {
                const d = new Date(v);
                return d.getDate() === 1
                  ? (ko
                      ? `${String(d.getFullYear()).slice(-2)}년 ${d.getMonth() + 1}월`
                      : d.toLocaleString('en', { month: 'short', year: '2-digit' }))
                  : '';
              }}
              axisLine={false} tickLine={false}
              tick={{ fontSize: 11, fill: tickColor, fontWeight: 600 }}
            />
            <YAxis
              dataKey="y" type="number"
              domain={[0, 150]} ticks={[0, 30, 60, 90, 120, 150]}
              axisLine={false} tickLine={false}
              tick={{ fontSize: 11, fill: tickColor }}
            />
            <ZAxis dataKey="nights" range={[10, 100]} />
            <Tooltip
              cursor={{ strokeDasharray: '3 3', stroke: gridColor }}
              content={<LeadTimeTooltip isDark={isDark} ko={ko} />}
            />

            {mode === 'channel' && Object.keys(CHANNEL_COLORS).map(ch => (
              <Scatter
                key={ch} name={ch}
                data={report.scatterData.filter(d => d.channel === ch)}
                fill={CHANNEL_COLORS[ch]} shape={ScatterDot}
              />
            ))}
            {mode === 'nationality' && report.natKeys.map(nat => (
              <Scatter
                key={nat} name={nat}
                data={report.scatterData.filter(d => d.nationality === nat)}
                fill={getNatColor(nat)} shape={ScatterDot}
              />
            ))}
            {mode === 'guests' && ['1', '2', '3', '4', '5+'].map(gKey => (
              <Scatter
                key={gKey} name={`${gKey}${ko ? '인' : 'G'}`}
                data={report.scatterData.filter(d => {
                  const g = d.guests || 2;
                  return gKey === '5+' ? g >= 5 : g === parseInt(gKey);
                })}
                fill={GUEST_COLORS[gKey]} shape={ScatterDot}
              />
            ))}
          </ScatterChart>
        </ResponsiveContainer>

        {/* 범례 */}
        <div className="flex gap-3.5 justify-center mt-3 flex-wrap">
          {mode === 'channel' && Object.keys(CHANNEL_COLORS).map(ch => (
            <div key={ch} className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: CHANNEL_COLORS[ch] }} />{ch}
            </div>
          ))}
          {mode === 'nationality' && report.natKeys.map(nat => (
            <div key={nat} className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: getNatColor(nat) }} />{nat}
            </div>
          ))}
          {mode === 'guests' && ['1', '2', '3', '4', '5+'].map(gKey => (
            <div key={gKey} className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: GUEST_COLORS[gKey] }} />
              {gKey}{ko ? '인' : 'G'}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LeadTimeDetailModal;
