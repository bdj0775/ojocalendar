import { useState, useMemo } from 'react';
import {
  Bell, User, ChevronLeft, ChevronRight, TrendingUp,
  ArrowUpRight, ArrowDownRight, Database, Menu,
} from 'lucide-react';
import { useSidebar } from '../../context/SidebarContext';
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
import { CHANNEL_COLORS, GUEST_COLORS, TrendTooltip, LeadTimeTooltip, ScatterDot } from '../DesktopDashboard/chartComponents';
import AnalyticsTable from '../DesktopDashboard/AnalyticsTable';
import PaceChart from '../DesktopDashboard/PaceChart';

const DashboardPage = () => {
  const { t, language } = useTranslation();
  const { open: openSidebar } = useSidebar();
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

  const isDark = document.documentElement.classList.contains('dark');
  const gridColor = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)';
  const tickColor = isDark ? '#64748b' : '#94a3b8';

  const wrapCls = 'bg-background min-h-screen pb-24 overflow-x-hidden w-full';
  const cardCls = 'bg-card text-card-foreground border border-border/60 rounded-2xl p-5 relative overflow-hidden shadow-sm w-full';

  const badgeUpCls = 'bg-success/10 text-success';
  const badgeDownCls = 'bg-destructive/10 text-destructive';
  const kpiLabelCls = 'text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5';
  const kpiValueCls = 'text-[28px] font-extrabold text-slate-800 dark:text-slate-200 tracking-tight leading-none mb-5';
  const kpiSubGridCls = 'grid grid-cols-2 gap-2 mt-auto pt-3 border-t border-border/50';
  const kpiSubItemCls = 'flex flex-col gap-0.5';
  const kpiSubLabelCls = 'text-[11px] text-muted-foreground';
  const kpiSubValCls = 'text-[13px] font-bold text-foreground/90';

  const chartTitleCls = 'text-[15px] font-bold text-foreground mb-3 block';
  const legendItemCls = 'flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground';

  const donutCenterValueCls = 'text-[22px] font-extrabold text-foreground';
  const donutCenterLabelCls = 'text-[10px] font-semibold text-muted-foreground uppercase tracking-wider';
  const donutLegItemCls = 'flex items-center py-2 text-xs border-b border-border/50 last:border-0';
  const donutLegNameCls = 'flex-1 text-muted-foreground truncate pr-2';
  const donutLegValCls = 'font-bold text-foreground/90';

  const toggleGroupCls = 'flex flex-wrap gap-1 bg-muted/50 rounded-lg overflow-hidden border border-border/50 p-1 w-full mt-2';
  const toggleBtnCls = 'flex-1 py-1.5 px-2 text-[11px] font-bold text-muted-foreground bg-transparent border-0 cursor-pointer tracking-wide text-center transition-all rounded-md whitespace-nowrap';
  const toggleBtnActiveCls = 'bg-background text-primary shadow-sm';

  return (
    <div className={wrapCls}>
      {/* Header */}
      <header className="flex items-center px-5 py-6 gap-3">
        <button className="p-1 -ml-1 text-foreground lg:hidden shrink-0" onClick={openSidebar}>
          <Menu size={24} />
        </button>
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <TrendingUp color="var(--primary)" size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold leading-tight text-foreground truncate">{t('dashboard.title')}</h1>
          <div className="flex items-center gap-2 mt-1 text-muted-foreground">
            <button onClick={prevMonth} className="flex p-1 -ml-1 hover:bg-muted rounded-full"><ChevronLeft size={16} /></button>
            <span className="text-[13px] font-bold tracking-wide whitespace-nowrap">
              {new Date(currentYear, currentMonth).toLocaleString(language, { month: 'long' }).toUpperCase()} {currentYear}
            </span>
            <button onClick={nextMonth} className="flex p-1 hover:bg-muted rounded-full"><ChevronRight size={16} /></button>
          </div>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button className="w-9 h-9 rounded-full bg-muted/30 border border-border/50 flex items-center justify-center text-muted-foreground hover:bg-muted"><Bell size={16} /></button>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent-foreground flex items-center justify-center shadow-sm"><User size={15} color="white" /></div>
        </div>
      </header>

      {/* Grid */}
      <div className="px-5 flex flex-col gap-4 w-full">

        {/* Empty state */}
        {bookings.length === 0 && (
          <div className="p-6 bg-muted/20 border-2 border-dashed border-primary/20 rounded-2xl text-center w-full">
            <Database size={32} className="mx-auto text-primary mb-3" />
            <h3 className="text-foreground font-bold mb-2">데이터가 비어있습니다!</h3>
            <p className="text-muted-foreground text-[12px] mb-5 leading-relaxed">샘플 데이터를 복구하여 대시보드를 미리 확인해보세요.</p>
            <button
              className="py-3.5 px-6 bg-primary text-primary-foreground rounded-xl font-bold text-[13px] w-full hover:bg-primary/90 transition-colors shadow-sm"
              onClick={async () => {
                if (!userProfile) return;
                const pId = properties[0]?.id;
                if (!pId) return;
                try {
                  showToast('복구 중...', 'info');
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
                  showToast('완료', 'success');
                } catch (e) {
                  showToast('오류 발생', 'error');
                }
              }}
            >
              샘플 데이터 복구
            </button>
          </div>
        )}

        {/* Box 1: Net Income */}
        <div className={cardCls}>
          <div className="flex items-center justify-between mb-3">
            <div className={kpiLabelCls}>{ko ? '예상 순수익' : 'NET INCOME'}</div>
            <span className={`text-[11px] font-bold py-1 px-2.5 rounded-full flex items-center gap-0.5 ${stats.momNetChange >= 0 ? badgeUpCls : badgeDownCls}`}>
              {stats.momNetChange >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {stats.momNetPct > 0 ? '+' : ''}{stats.momNetPct}%
            </span>
          </div>
          <div className={kpiValueCls}>{fmt(stats.netIncome)}</div>
          <div className={kpiSubGridCls}>
            <div className={kpiSubItemCls}>
              <span className={kpiSubLabelCls}>{ko ? '총매출' : 'Gross Revenue'}</span>
              <strong className={kpiSubValCls}>{fmt(stats.grossRevenue)}</strong>
            </div>
            <div className={kpiSubItemCls}>
              <span className={kpiSubLabelCls}>{ko ? '전월 대비' : 'MOM Change'}</span>
              <strong className={`text-[13px] font-bold ${stats.momNetChange >= 0 ? 'text-success' : 'text-destructive'}`}>
                {stats.momNetChange >= 0 ? '+' : '-'}{fmt(stats.momNetChange)}
              </strong>
            </div>
          </div>
        </div>

        {/* Box 2: Occupancy & ADR */}
        <div className="grid grid-cols-2 gap-4">
          <div className={`${cardCls} p-4`}>
            <div className={kpiLabelCls}>{ko ? '가동률' : 'OCC'}</div>
            <div className="text-[22px] font-extrabold text-foreground mb-4">{stats.occupancyRate}%</div>
            <div className={kpiSubGridCls}>
              <div className={kpiSubItemCls}>
                <span className="text-[11px] text-muted-foreground">예약</span>
                <strong className="text-[12px]">{stats.totalBookings}건</strong>
              </div>
            </div>
          </div>
          <div className={`${cardCls} p-4`}>
            <div className={kpiLabelCls}>ADR</div>
            <div className="text-[18px] sm:text-[22px] font-extrabold text-foreground mb-4 truncate" title={fmt(stats.adrThisMonth)}>{fmt(stats.adrThisMonth)}</div>
            <div className={kpiSubGridCls}>
              <div className={kpiSubItemCls}>
                <span className="text-[11px] text-muted-foreground">OTA변동</span>
                <strong className={`text-[12px] ${stats.otaCommPct <= 0 ? 'text-success' : 'text-destructive'}`}>
                  {stats.otaCommPct > 0 ? '+' : ''}{stats.otaCommPct}%
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* Box 4: Monthly Trends */}
        <div className={cardCls}>
          <span className={chartTitleCls}>{ko ? '월별 추이 (12개월)' : 'Monthly Trends'}</span>
          <div className="flex flex-wrap gap-4 mb-5">
            <div className={legendItemCls}><span className="w-2.5 h-2.5 rounded-full bg-primary/30" />{ko ? '총매출' : 'Gross'}</div>
            <div className={legendItemCls}><span className="w-2.5 h-2.5 rounded-full bg-primary" />{ko ? '순이익' : 'Net'}</div>
            <div className={legendItemCls}><span className="w-2.5 h-2.5 rounded-full bg-success" />{ko ? '점유율' : 'Occupancy'}</div>
          </div>
          <div className="-ml-5 -mr-3">
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={stats.monthlyTrends} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis xAxisId="0" dataKey={ko ? 'month' : 'monthEn'} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: tickColor, fontWeight: 500 }} />
                <XAxis xAxisId="1" dataKey={ko ? 'month' : 'monthEn'} hide />
                <YAxis yAxisId="revenue" hide domain={['auto', 'auto']} />
                <YAxis yAxisId="occ" hide domain={[0, 100]} />
                <Tooltip content={<TrendTooltip sym={sym} isDark={isDark} ko={ko} />} cursor={{ fill: 'transparent' }} />
                <Bar xAxisId="0" yAxisId="revenue" dataKey="gross" fill="var(--primary)" radius={[3, 3, 0, 0]} opacity={0.25} maxBarSize={24} />
                <Bar xAxisId="1" yAxisId="revenue" dataKey="net" fill="var(--primary)" radius={[3, 3, 0, 0]} opacity={0.9} maxBarSize={24} />
                <Line xAxisId="0" yAxisId="occ" type="monotone" dataKey="occupancy" stroke="var(--success)" strokeWidth={2} dot={{ r: 2.5, fill: 'var(--success)', strokeWidth: 0 }} activeDot={{ r: 4.5 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Box 5: Channel Donut */}
        <div className={cardCls}>
          <div className={chartTitleCls}>{ko ? '예약 채널 분포' : 'Booking Channels'}</div>
          <div className="relative flex justify-center mb-5 mt-2">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart><Pie data={stats.channelPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={2} dataKey="value" stroke="none" cornerRadius={4}>
                {stats.channelPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie></PieChart>
            </ResponsiveContainer>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
              <span className={donutCenterValueCls}>{stats.occupancyRate}%</span>
              <span className={donutCenterLabelCls}>{ko ? '가동률' : 'OCC'}</span>
            </div>
          </div>
          <ul className="m-0 p-0 list-none">
            {stats.channelPieData.map(item => (
              <li key={item.name} className={donutLegItemCls}>
                <span className="w-2.5 h-2.5 rounded-full mr-2.5 shrink-0" style={{ background: item.color }} />
                <span className={donutLegNameCls}>{item.name}</span>
                <span className={donutLegValCls}>{item.value}%</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Box 7: Lead Time */}
        <div className={cardCls}>
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className={chartTitleCls} style={{ marginBottom: 0 }}>{ko ? '리드타임' : 'Lead Time'}</span>
            <button
              className="text-[11px] font-bold py-1.5 px-2.5 rounded-lg bg-primary/10 text-primary whitespace-nowrap hover:bg-primary/20 transition-colors"
              onClick={() => setIsLeadTimeModalOpen(true)}
            >
              자세히 보기
            </button>
          </div>
          <div className={toggleGroupCls}>
            {(['channel', 'nationality', 'guests'] as const).map(m => (
              <button key={m} className={`${toggleBtnCls} ${leadTimeMode === m ? toggleBtnActiveCls : ''}`} onClick={() => setLeadTimeMode(m)}>
                {m === 'channel' ? (ko ? '채널' : 'Channel') : m === 'nationality' ? (ko ? '국적' : 'Nat') : (ko ? '인원' : 'Guests')}
              </button>
            ))}
          </div>
          <div className="-ml-6 -mr-4 mt-4">
            <ResponsiveContainer width="100%" height={200}>
              <ScatterChart margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="x" type="number" domain={[stats.leadTimeStartX, stats.leadTimeEndX]} hide />
                <YAxis dataKey="y" type="number" domain={[0, 150]} hide />
                <ZAxis dataKey="nights" range={[10, 80]} />
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
              <div key={gKey} className={legendItemCls}><span className="w-2 h-2 rounded-full" style={{ background: GUEST_COLORS[gKey] }} />{gKey}{ko ? '인' : 'G'}</div>
            ))}
          </div>
        </div>

        {/* Box 8 & Box 9 */}
        <div className="overflow-hidden w-full flex flex-col gap-4">
          <div className="overflow-x-auto custom-scrollbar border border-border/60 bg-card rounded-2xl shadow-sm">
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

          <div className="w-full overflow-hidden border border-border/60 bg-card rounded-2xl shadow-sm">
            <PaceChart pace={pace} isDark={isDark} ko={ko} sym={sym} fmtShort={fmtShort} />
          </div>
        </div>
      </div>

      {isLeadTimeModalOpen && <LeadTimeDetailModal isDark={isDark} onClose={() => setIsLeadTimeModalOpen(false)} />}
    </div>
  );
};

export default DashboardPage;
