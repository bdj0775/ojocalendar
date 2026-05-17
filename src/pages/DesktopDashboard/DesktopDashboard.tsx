import { useState, useMemo } from 'react';
import {
  Bell, User,
  ChevronLeft, ChevronRight,
  ArrowUpRight, ArrowDownRight, Database, Sun, Moon,
} from 'lucide-react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
  CartesianGrid, ScatterChart, Scatter, ZAxis,
} from 'recharts';
import { useStore } from '../../store/useStore';
import { useTranslation } from '../../hooks/useTranslation';
import { useDesktopStats } from '../../hooks/useDesktopStats';
import { useBookingPace } from '../../hooks/useBookingPace';
import { supabase } from '../../services/supabaseClient';
import { DUMMY_BOOKINGS, DUMMY_MAINTENANCE } from '../../utils/dummyData';
import LeadTimeDetailModal from '../../components/Modals/LeadTimeDetailModal';
import { getNatColor } from '../../utils/colors';
import { CHANNEL_COLORS, GUEST_COLORS, TrendTooltip, LeadTimeTooltip, ScatterDot } from './chartComponents';
import AnalyticsTable from './AnalyticsTable';
import PaceChart from './PaceChart';
import DesktopTabNav from '../../components/DesktopTabNav/DesktopTabNav';
import type { DesktopTab } from '../../components/DesktopTabNav/DesktopTabNav';

interface DesktopDashboardProps {
  activeTab?: DesktopTab;
  onTabChange?: (tab: DesktopTab) => void;
  isDark?: boolean;
  onToggleDark?: () => void;
}


const DesktopDashboard = ({ activeTab = 'dashboard', onTabChange, isDark = false, onToggleDark }: DesktopDashboardProps) => {
  const { t, language } = useTranslation();
  const { bookings, nextMonth, prevMonth, userProfile, properties, fetchData, showToast, currentYear, currentMonth } = useStore();

  const [tableChannelFilter, setTableChannelFilter] = useState('All');
  const [tableNatFilter, setTableNatFilter] = useState('All');
  const [tableGuestFilter, setTableGuestFilter] = useState('All');
  const stats = useDesktopStats(tableChannelFilter, tableNatFilter, tableGuestFilter);
  const pace = useBookingPace();

  const [leadTimeMode, setLeadTimeMode] = useState('channel');
  const [isLeadTimeModalOpen, setIsLeadTimeModalOpen] = useState(false);

  const sym = stats.currencySymbol;
  const ko = language === 'ko';
  const fmt = (v: number) => `${sym}${Math.abs(v).toLocaleString()}`;
  const fmtShort = useMemo(() => (v: number) => {
    if (Math.abs(v) >= 1000000) return `${sym}${(v / 1000000).toFixed(1)}M`;
    if (Math.abs(v) >= 1000) return `${sym}${(v / 1000).toFixed(0)}K`;
    return `${sym}${v.toLocaleString()}`;
  }, [sym]);

  const monthlySummary = useMemo(() => {
    if (!stats.monthlyTrends || stats.monthlyTrends.length === 0) return '';
    const validMonths = stats.monthlyTrends.filter(m => m.gross > 0);
    if (validMonths.length === 0) return '';
    
    // Find best month by gross
    const bestMonth = [...validMonths].sort((a, b) => b.gross - a.gross)[0];
    
    // Calculate avg margin
    const totalGross = validMonths.reduce((sum, m) => sum + m.gross, 0);
    const totalNet = validMonths.reduce((sum, m) => sum + m.net, 0);
    const avgMargin = totalGross > 0 ? Math.round((totalNet / totalGross) * 100) : 0;
    
    return ko 
      ? `최고 매출: ${bestMonth.month} (${fmtShort(bestMonth.gross)}) · 평균 마진율 ${avgMargin}%`
      : `Best Month: ${bestMonth.monthEn} (${fmtShort(bestMonth.gross)}) · Avg Margin: ${avgMargin}%`;
  }, [stats.monthlyTrends, ko, fmtShort]);


  const gridColor = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)';
  const tickColor = isDark ? '#64748b' : '#94a3b8';
  const tickColorAlt = isDark ? '#475569' : '#94a3b8';
  const activeDotStroke = isDark ? '#0c0c1d' : '#ffffff';

  // Theme-conditional classes (transitioning to semantic variables)
  const wrapCls = 'h-full p-5 pb-10 overflow-y-auto bg-background text-foreground [scrollbar-width:thin]';

  const cardCls = 'bg-card text-card-foreground border border-border rounded-2xl p-5 relative overflow-hidden transition-all duration-300 hover:-translate-y-0.5 shadow-sm hover:shadow-lg hover:border-primary/50';

  const badgeUpCls = 'bg-success/10 text-success';
  const badgeDownCls = 'bg-destructive/10 text-destructive';
  const kpiLabelCls = 'type-micro font-bold text-muted-foreground uppercase tracking-wider mb-1';
  const kpiValueCls = 'type-numeric text-slate-800 dark:text-slate-200 tracking-tight leading-none mb-6';
  const kpiSubGridCls = 'grid grid-cols-2 gap-2 mt-auto pt-4 border-t border-border/50';
  const kpiSubItemCls = 'flex flex-col gap-1';
  const kpiSubLabelCls = 'type-micro text-muted-foreground';
  const kpiSubValCls = 'type-caption font-bold text-foreground/90';

  const chartTitleCls = 'text-[15px] font-bold text-foreground';
  const legendItemCls = 'flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground';

  const donutCenterValueCls = 'text-[22px] font-extrabold text-foreground';
  const donutCenterLabelCls = 'type-micro font-semibold text-muted-foreground uppercase tracking-wider';
  const donutLegItemCls = 'flex items-center py-1.5 text-xs border-b border-border last:border-0';
  const donutLegNameCls = 'flex-1 text-muted-foreground';
  const donutLegValCls = 'font-bold text-foreground/90 ml-2';

  const headerTitleCls = 'text-base font-bold text-slate-800 dark:text-slate-200 tracking-tight m-0 ml-2';
  const monthNavBtnCls = 'w-6 h-6 rounded-full bg-muted/50 border border-border/50 flex items-center justify-center cursor-pointer text-muted-foreground hover:bg-muted hover:text-foreground transition-colors';
  const monthNavSpanCls = 'text-[11px] font-semibold text-muted-foreground tracking-wide';
  const themeToggleCls = 'w-7 h-7 rounded-full bg-muted/50 border border-border/50 flex items-center justify-center cursor-pointer text-muted-foreground hover:bg-muted hover:text-foreground transition-colors';
  const headerBtnCls = 'w-7 h-7 rounded-full bg-muted/50 border border-border/50 flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors';
  const emptyStateCls = 'col-span-3 p-8 bg-muted/30 border-2 border-dashed border-primary/20 rounded-2xl text-center';
  const toggleGroupCls = 'flex bg-muted rounded-lg overflow-hidden border border-border';
  const toggleBtnCls = 'py-1 px-2.5 text-[11px] font-semibold text-muted-foreground bg-transparent border-0 cursor-pointer tracking-wide whitespace-nowrap transition-all';
  const toggleBtnActiveCls = 'bg-primary/15 text-primary';
  return (
    <div className={wrapCls}>
      {/* Header */}
      <header className="flex items-center justify-between mb-4 h-8">
        <div className="flex items-center gap-3">
          <h1 className={headerTitleCls}>{ko ? '대시보드' : 'Dashboard'}</h1>
          <div className="flex items-center gap-1.5 ml-1">
            <button className={monthNavBtnCls} onClick={prevMonth}><ChevronLeft size={14} /></button>
            <span className={monthNavSpanCls}>
              {new Date(currentYear, currentMonth).toLocaleString(language, { month: 'long' }).toUpperCase()} {currentYear}
            </span>
            <button className={monthNavBtnCls} onClick={nextMonth}><ChevronRight size={14} /></button>
          </div>
        </div>
        <div className="flex items-center gap-5">
          <DesktopTabNav activeTab={activeTab} onTabChange={onTabChange ?? (() => {})} />
          <div className="w-px h-4 bg-border/60" />
          <div className="flex items-center gap-2">
            <button className={themeToggleCls} onClick={() => onToggleDark?.()} title={isDark ? (ko ? '라이트 모드' : 'Light Mode') : (ko ? '다크 모드' : 'Dark Mode')}>
              {isDark ? <Sun size={14} /> : <Moon size={14} />}
            </button>
            <button className={headerBtnCls}><Bell size={14} /></button>
            <div className="w-7 h-7 rounded-full flex items-center justify-center bg-gradient-to-br from-primary to-accent-foreground shadow-sm">
              <User size={13} color="white" />
            </div>
          </div>
        </div>
      </header>

      {/* Grid */}
      <div className="grid grid-cols-3 gap-4">

        {/* Empty state */}
        {bookings.length === 0 && (
          <div className={emptyStateCls}>
            <Database size={36} className="mx-auto text-primary" />
            <h3 className={isDark ? 'text-slate-200 mt-3 mb-2 text-base font-semibold' : 'text-slate-900 mt-3 mb-2 text-base font-semibold'}>
              {ko ? '데이터가 비어있습니다!' : 'No Data Available!'}
            </h3>
            <p className={isDark ? 'text-slate-600 mb-5 text-[13px]' : 'text-slate-500 mb-5 text-[13px]'}>
              {ko ? '샘플 데이터를 복구하여 대시보드를 확인하세요.' : 'Recover sample data to preview the dashboard.'}
            </p>
            <button
              className="py-3 px-7 bg-gradient-to-br from-primary to-accent-foreground text-white border-0 rounded-inner cursor-pointer font-bold text-sm transition-all hover:-translate-y-px hover:shadow-lg hover:shadow-primary/40"
              onClick={async () => {
                if (!userProfile) return;
                const pId = properties[0]?.id;
                if (!pId) { showToast(ko ? '숙소 정보가 없습니다. 페이지를 새로고침해주세요.' : 'No property found. Please refresh.', 'error'); return; }
                try {
                  showToast(ko ? '샘플 데이터 복구를 시작합니다..' : 'Restoring sample data...', 'info');
                  const bkRows = DUMMY_BOOKINGS.map(b => ({
                    host_id: userProfile.id, property_id: pId,
                    guestname: b.guestName, checkin: b.checkIn, checkout: b.checkOut,
                    guests: b.guests, infants: b.infants, nationality: b.nationality,
                    channel: b.channel, status: b.status || 'confirmed',
                    amount: b.amount || 0, commission: b.commission || 0,
                  }));
                  await supabase.from('bookings').insert(bkRows);
                  const mtRows = DUMMY_MAINTENANCE.map(m => ({
                    host_id: userProfile.id, property_id: pId,
                    startdate: m.startDate, enddate: m.endDate, label: m.label,
                  }));
                  await supabase.from('maintenance').insert(mtRows);
                  await fetchData();
                  showToast(ko ? '샘플 데이터 복구가 완료되었습니다.' : 'Sample data restored.', 'success');
                } catch (e) {
                  console.error(e);
                  showToast((ko ? '복구 중 오류: ' : 'Error: ') + (e as Error).message, 'error');
                }
              }}
            >
              {ko ? '샘플 데이터 복구하기' : 'Recover Sample Data'}
            </button>
          </div>
        )}

        {/* Box 1: Net Income */}
        <div className={`${cardCls} flex flex-col justify-between`}>
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className={kpiLabelCls}>{ko ? '예상 순수익' : 'NET INCOME'}</div>
              <span className={`type-micro font-bold py-0.5 px-2 rounded-full flex items-center gap-0.5 ${stats.momNetChange >= 0 ? badgeUpCls : badgeDownCls}`}>
                {stats.momNetChange >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                {stats.momNetPct > 0 ? '+' : ''}{stats.momNetPct}%
              </span>
            </div>
            <div className={kpiValueCls}>{fmt(stats.netIncome)}</div>
          </div>
          <div className={kpiSubGridCls}>
            <div className={kpiSubItemCls}>
              <span className={kpiSubLabelCls}>{ko ? '총매출' : 'Gross Revenue'}</span>
              <strong className={kpiSubValCls}>{fmt(stats.grossRevenue)}</strong>
            </div>
            <div className={kpiSubItemCls}>
              <span className={kpiSubLabelCls}>{ko ? '전월 대비' : 'MOM Change'}</span>
              <strong className={`type-caption font-bold ${stats.momNetChange >= 0 ? 'text-success' : 'text-destructive'}`}>
                {stats.momNetChange >= 0 ? '+' : '-'}{fmt(stats.momNetChange)}
              </strong>
            </div>
          </div>
        </div>

        {/* Box 2: Occupancy */}
        <div className={`${cardCls} flex flex-col justify-between`}>
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className={kpiLabelCls}>{ko ? '객실 가동률' : 'OCCUPANCY RATE'}</div>
              <span className={`type-micro font-bold py-0.5 px-2 rounded-full ${stats.occupancyRate >= 70 ? badgeUpCls : badgeDownCls}`}>
                {stats.occupiedNights}/{stats.daysInMonth} {ko ? '박' : 'nights'}
              </span>
            </div>
            <div className={kpiValueCls}>{stats.occupancyRate}%</div>
          </div>
          <div className={kpiSubGridCls}>
            <div className={kpiSubItemCls}>
              <span className={kpiSubLabelCls}>{ko ? '예약 건수' : 'Bookings'}</span>
              <strong className={kpiSubValCls}>{stats.totalBookings}{ko ? '건' : ''}</strong>
            </div>
            <div className={kpiSubItemCls}>
              <span className={kpiSubLabelCls}>{ko ? '예약 박수' : 'Occupied Nights'}</span>
              <strong className={kpiSubValCls}>{stats.occupiedNights}{ko ? '박' : ' nights'}</strong>
            </div>
          </div>
        </div>

        {/* Box 3: ADR */}
        <div className={`${cardCls} flex flex-col justify-between`}>
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className={kpiLabelCls}>{ko ? '평균 객단가 (ADR)' : 'AVG DAILY RATE'}</div>
              <span className={`type-micro font-bold py-0.5 px-2 rounded-full ${stats.otaCommPct <= 0 ? badgeUpCls : badgeDownCls}`}>
                OTA {fmt(stats.otaCommission)}
              </span>
            </div>
            <div className={kpiValueCls}>{fmt(stats.adrThisMonth)}</div>
          </div>
          <div className={kpiSubGridCls}>
            <div className={kpiSubItemCls}>
              <span className={kpiSubLabelCls}>{ko ? '연간 평균 ADR' : 'Yearly Avg ADR'}</span>
              <strong className={kpiSubValCls}>{fmt(stats.adrYearAvg)}</strong>
            </div>
            <div className={kpiSubItemCls}>
              <span className={kpiSubLabelCls}>{ko ? 'OTA 수수료 변동' : 'OTA Comm Change'}</span>
              <strong className={`type-caption font-bold ${stats.otaCommPct <= 0 ? 'text-success' : 'text-destructive'}`}>
                {stats.otaCommPct > 0 ? '+' : ''}{stats.otaCommPct}%
              </strong>
            </div>
          </div>
        </div>

        {/* Box 4: Monthly Trends (Full Width) */}
        <div className={`col-span-3 ${cardCls}`}>
          <div className="flex items-center justify-between mb-4">
            <span className={chartTitleCls}>{ko ? '월별 추이 (12개월)' : 'Monthly Trends (12 Months)'}</span>
            <div className="flex items-center gap-6">
              {monthlySummary && (
                <span className="type-micro font-bold text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                  {monthlySummary}
                </span>
              )}
              <div className="flex gap-4">
                <div className={legendItemCls}><span className="w-2 h-2 rounded-full bg-primary/30" />{ko ? '총매출' : 'Gross'}</div>
                <div className={legendItemCls}><span className="w-2 h-2 rounded-full bg-primary" />{ko ? '순이익' : 'Net'}</div>
                <div className={legendItemCls}><span className="w-2 h-2 rounded-full bg-success" />{ko ? '점유율' : 'Occupancy'}</div>
              </div>
            </div>
          </div>
          <div className="-ml-3 -mr-2">
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={stats.monthlyTrends} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis xAxisId="0" dataKey={ko ? 'month' : 'monthEn'} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: tickColor, fontWeight: 600 }} />
                <XAxis xAxisId="1" dataKey={ko ? 'month' : 'monthEn'} hide />
                <YAxis yAxisId="revenue" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: tickColorAlt }} tickFormatter={v => fmtShort(v)} width={70} />
                <YAxis yAxisId="occ" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: tickColorAlt }} tickFormatter={v => `${v}%`} domain={[0, 100]} width={45} />
                <Tooltip content={<TrendTooltip sym={sym} isDark={isDark} ko={ko} />} />
                <Bar xAxisId="0" yAxisId="revenue" dataKey="gross" name={ko ? '총매출' : 'Gross'} fill="var(--primary)" radius={[4, 4, 0, 0]} opacity={0.25} maxBarSize={36} />
                <Bar xAxisId="1" yAxisId="revenue" dataKey="net" name={ko ? '순이익' : 'Net'} fill="var(--primary)" radius={[4, 4, 0, 0]} opacity={0.9} maxBarSize={36} />
                <Line xAxisId="0" yAxisId="occ" type="monotone" dataKey="occupancy" name={ko ? '점유율' : 'Occupancy'} stroke="var(--success)" strokeWidth={2.5} dot={{ r: 3, fill: 'var(--success)', strokeWidth: 0 }} activeDot={{ r: 5, fill: 'var(--success)', strokeWidth: 2, stroke: activeDotStroke }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Box 5: Channel Donut */}
        <div className={cardCls}>
          <div className={`text-sm font-bold mb-3 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{ko ? '예약 채널 분포' : 'Booking Channels'}</div>
          <div className="relative flex justify-center mb-4">
            <ResponsiveContainer width="100%" height={170}>
              <PieChart><Pie data={stats.channelPieData} cx="50%" cy="50%" innerRadius={52} outerRadius={72} paddingAngle={3} dataKey="value" stroke="none" cornerRadius={4}>
                {stats.channelPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie></PieChart>
            </ResponsiveContainer>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5">
              <span className={donutCenterValueCls}>{stats.occupancyRate}%</span>
              <span className={donutCenterLabelCls}>{ko ? '가동률' : 'OCC'}</span>
            </div>
          </div>
          <ul className="m-0 p-0 list-none">
            {stats.channelPieData.map(item => (
              <li key={item.name} className={donutLegItemCls}>
                <span className="w-2 h-2 rounded-full mr-2.5 flex-shrink-0" style={{ background: item.color }} />
                <span className={donutLegNameCls}>{item.name}</span>
                <span className={donutLegValCls}>{item.value}%</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Box 6: Nationality Donut */}
        <div className={cardCls}>
          <div className={`text-sm font-bold mb-3 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{ko ? '국적 분포' : 'Nationality Mix'}</div>
          <div className="relative flex justify-center mb-4">
            <ResponsiveContainer width="100%" height={170}>
              <PieChart><Pie data={stats.nationalityPieData} cx="50%" cy="50%" innerRadius={52} outerRadius={72} paddingAngle={3} dataKey="value" stroke="none" cornerRadius={4}>
                {stats.nationalityPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie></PieChart>
            </ResponsiveContainer>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5">
              <span className={donutCenterValueCls}>{stats.totalNatBookings}</span>
              <span className={donutCenterLabelCls}>{ko ? '예약' : 'BOOKINGS'}</span>
            </div>
          </div>
          <ul className="m-0 p-0 list-none">
            {stats.nationalityPieData.map(item => (
              <li key={item.name} className={donutLegItemCls}>
                <span className="w-2 h-2 rounded-full mr-2.5 flex-shrink-0" style={{ background: item.color }} />
                <span className={donutLegNameCls}>{item.name}</span>
                <span className={donutLegValCls}>{item.value}%</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Box 7: Lead Time */}
        <div className={cardCls}>
          <div className="flex items-center justify-between flex-nowrap gap-2 mb-4">
            <div className="flex items-center gap-3">
              <span className={chartTitleCls}>{ko ? '리드타임 분포' : 'Lead Time'}</span>
              <button
                className="type-micro font-bold py-1 px-2.5 rounded-chip cursor-pointer transition-colors whitespace-nowrap flex-shrink-0 bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20"
                onClick={() => setIsLeadTimeModalOpen(true)}
              >
                {ko ? '자세히 보기 >' : 'Details >'}
              </button>
            </div>
            <div className={toggleGroupCls}>
              {(['channel', 'nationality', 'guests'] as const).map(m => (
                <button key={m} className={`${toggleBtnCls} ${leadTimeMode === m ? toggleBtnActiveCls : ''}`} onClick={() => setLeadTimeMode(m)}>
                  {m === 'channel' ? (ko ? '채널' : 'Channel') : m === 'nationality' ? (ko ? '국적' : 'Nationality') : (ko ? '인원' : 'Guests')}
                </button>
              ))}
            </div>
          </div>
          <div className="-ml-3 -mr-2">
            <ResponsiveContainer width="100%" height={220}>
              <ScatterChart margin={{ top: 15, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="x" type="number" domain={[stats.leadTimeStartX, stats.leadTimeEndX]}
                  tickFormatter={v => { const d = new Date(v); return d.getDate() === 1 ? (ko ? `${d.getMonth() + 1}월` : d.toLocaleString(language, { month: 'short' })) : ''; }}
                  ticks={(() => { const ticks: number[] = []; const start = new Date(stats.leadTimeStartX); const end = new Date(stats.leadTimeEndX); let cur = new Date(start.getFullYear(), start.getMonth(), 1); while (cur <= end) { ticks.push(cur.getTime()); cur.setMonth(cur.getMonth() + 1); } return ticks; })()}
                  axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: tickColor, fontWeight: 600 }} />
                <YAxis dataKey="y" type="number" domain={[0, 150]} ticks={[0, 30, 60, 90, 120, 150]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: tickColorAlt }} />
                <ZAxis dataKey="nights" range={[10, 100]} />
                <Tooltip cursor={{ strokeDasharray: '3 3', stroke: gridColor }} content={<LeadTimeTooltip isDark={isDark} ko={ko} />} />
                {leadTimeMode === 'channel' && Object.keys(CHANNEL_COLORS).map(ch => (
                  <Scatter key={ch} name={ch} data={(stats.leadTimeScatterData || []).filter(d => d.channel === ch)} fill={CHANNEL_COLORS[ch]} shape={ScatterDot} />
                ))}
                {leadTimeMode === 'nationality' && stats.leadTimeNatKeys.map((nat) => (
                  <Scatter key={nat} name={nat} data={(stats.leadTimeScatterData || []).filter(d => d.nationality === nat)} fill={getNatColor(nat)} shape={ScatterDot} />
                ))}
                {leadTimeMode === 'guests' && ['1', '2', '3', '4', '5+'].map(gKey => (
                  <Scatter key={gKey} name={`${gKey}${ko ? '인' : ' Guests'}`} data={(stats.leadTimeScatterData || []).filter(d => { const g = d.guests || 2; return gKey === '5+' ? g >= 5 : g === parseInt(gKey); })} fill={GUEST_COLORS[gKey]} shape={ScatterDot} />
                ))}
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-3 mt-4">
            {leadTimeMode === 'channel' && Object.keys(CHANNEL_COLORS).map(ch => (
              <div key={ch} className={legendItemCls}><span className="w-2 h-2 rounded-full" style={{ background: CHANNEL_COLORS[ch] }} />{ch}</div>
            ))}
            {leadTimeMode === 'nationality' && stats.leadTimeNatKeys.map((nat) => (
              <div key={nat} className={legendItemCls}><span className="w-2 h-2 rounded-full" style={{ background: getNatColor(nat) }} />{nat}</div>
            ))}
            {leadTimeMode === 'guests' && ['1', '2', '3', '4', '5+'].map(gKey => (
              <div key={gKey} className={legendItemCls}><span className="w-2 h-2 rounded-full" style={{ background: GUEST_COLORS[gKey] }} />{gKey}{ko ? '인' : ' Guests'}</div>
            ))}
          </div>
        </div>

        {/* Box 8: Monthly Analytics Table */}
        <AnalyticsTable
          monthlyTableData={stats.monthlyTableData}
          isDark={isDark}
          ko={ko}
          sym={sym}
          fmt={fmt}
          tableChannelFilter={tableChannelFilter}
          setTableChannelFilter={setTableChannelFilter}
          tableNatFilter={tableNatFilter}
          setTableNatFilter={setTableNatFilter}
          tableGuestFilter={tableGuestFilter}
          setTableGuestFilter={setTableGuestFilter}
        />
      </div>

      {/* Box 9: Booking Pace */}
      <PaceChart pace={pace} isDark={isDark} ko={ko} sym={sym} fmtShort={fmtShort} />

      {isLeadTimeModalOpen && <LeadTimeDetailModal isDark={isDark} onClose={() => setIsLeadTimeModalOpen(false)} />}
    </div>
  );
};

export default DesktopDashboard;
