import { useState, useMemo } from 'react';
import {
  Bell, User, ChevronLeft, ChevronRight, TrendingUp,
  ArrowUpRight, ArrowDownRight, Database, Menu,
} from 'lucide-react';
import { useSidebar } from '../../context/SidebarContext';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
  CartesianGrid, ScatterChart, Scatter, ZAxis, ReferenceLine,
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
import PaceChart from '../DesktopDashboard/PaceChart';

const DashboardPage = () => {
  const { t, language } = useTranslation();
  const { open: openSidebar } = useSidebar();
  const { bookings, nextMonth, prevMonth, userProfile, properties, fetchData, showToast, currentYear, currentMonth } = useStore();

  // 모바일 대시보드는 필터 없이 전체 데이터 표시
  const stats = useDesktopStats('All', 'All', 'All');
  const pace = useBookingPace();

  const [leadTimeMode, setLeadTimeMode] = useState('channel');
  const [isLeadTimeModalOpen, setIsLeadTimeModalOpen] = useState(false);
  const [tableRange, setTableRange] = useState('12');

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

  // 실제 오늘 기준 (선택 월 무관)
  const actualYear     = new Date().getFullYear();
  const actualMonthIdx = new Date().getMonth();
  const MONTH_EN_IDX: Record<string, number> = {
    Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5, Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11,
  };

  // 차트용 데이터 — 예측 필드 포함
  const chartData = useMemo(() => stats.monthlyTrends.map(d => {
    const dMonthIdx      = MONTH_EN_IDX[d.monthEn] ?? -1;
    const isActualCurrent = d.year === actualYear && dMonthIdx === actualMonthIdx;
    const isActualFuture  = d.year > actualYear || (d.year === actualYear && dMonthIdx > actualMonthIdx);
    return {
      ...d,
      isActualCurrent,
      isActualFuture,
      predictedOccLine:  isActualCurrent ? d.occupancy : isActualFuture ? d.predictedOcc : null,
      predictedGrossBar: isActualFuture ? (d.predictedGross ?? null) : null,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [stats.monthlyTrends, actualYear, actualMonthIdx]);

  // ReferenceLine x 값 — 실제 오늘의 월 라벨
  const currentMonthLabel = useMemo(() => {
    const entry = stats.monthlyTrends.find(d =>
      d.year === actualYear && (MONTH_EN_IDX[d.monthEn] ?? -1) === actualMonthIdx,
    );
    return ko ? (entry?.month ?? '') : (entry?.monthEn ?? '');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats.monthlyTrends, actualYear, actualMonthIdx, ko]);

  // 월별 분석 테이블 — 기간 필터 적용
  const mobileTableData = useMemo(() => {
    let data = [...(stats.monthlyTableData || [])];
    const now = new Date();
    const nowYear = now.getFullYear();
    const nowMonth = now.getMonth();
    if (tableRange === '6') {
      let cutY = nowYear; let cutM = nowMonth - 5;
      while (cutM < 0) { cutM += 12; cutY--; }
      data = data.filter(r => r.sortKey >= cutY * 100 + cutM);
    } else if (tableRange === '12') {
      let cutY = nowYear; let cutM = nowMonth - 11;
      while (cutM < 0) { cutM += 12; cutY--; }
      data = data.filter(r => r.sortKey >= cutY * 100 + cutM);
    }
    return data.sort((a, b) => b.sortKey - a.sortKey);
  }, [stats.monthlyTableData, tableRange]);

  // ── CSS helpers ────────────────────────────────────────────────
  const card = 'bg-card text-card-foreground border border-border/60 rounded-2xl p-4 relative overflow-hidden shadow-sm w-full';
  const kpiLabel = 'text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1';
  const kpiValue = 'text-[24px] font-extrabold text-foreground tracking-tight leading-none mb-3';
  const kpiSubGrid = 'grid grid-cols-2 gap-2 pt-3 border-t border-border/50';
  const kpiSubLabel = 'text-[10px] text-muted-foreground';
  const kpiSubVal = 'text-[12px] font-bold text-foreground/90';
  const chartTitle = 'text-[14px] font-bold text-foreground mb-3 block';
  const legendItem = 'flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground';
  const donutLegRow = 'flex items-center py-1.5 text-xs border-b border-border/50 last:border-0';
  const toggleGroup = 'flex bg-muted/50 rounded-lg border border-border/50 p-0.5 mt-2';
  const toggleBtn = 'flex-1 py-1.5 text-[10px] font-bold text-muted-foreground bg-transparent border-0 cursor-pointer rounded-md text-center transition-all whitespace-nowrap';
  const toggleBtnActive = 'bg-background text-primary shadow-sm';
  const thCls = 'py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap text-right first:text-left';
  const tdCls = 'py-2 text-[11px] text-right text-foreground/80 border-b border-border/40 whitespace-nowrap';

  return (
    <div className="bg-background min-h-screen pb-24 overflow-x-hidden w-full">

      {/* ── Header ── */}
      <header className="flex items-center px-4 py-5 gap-3">
        <button className="p-1 -ml-1 text-foreground lg:hidden shrink-0" onClick={openSidebar}>
          <Menu size={24} />
        </button>
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <TrendingUp color="var(--primary)" size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-[14px] font-bold leading-tight text-foreground">{t('dashboard.title')}</h1>
          <div className="flex items-center gap-1.5 mt-0.5 text-muted-foreground">
            <button onClick={prevMonth} className="p-0.5 hover:bg-muted rounded-full"><ChevronLeft size={14} /></button>
            <span className="text-[12px] font-bold tracking-wide whitespace-nowrap">
              {new Date(currentYear, currentMonth).toLocaleString(language, { month: 'long' }).toUpperCase()} {currentYear}
            </span>
            <button onClick={nextMonth} className="p-0.5 hover:bg-muted rounded-full"><ChevronRight size={14} /></button>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button className="w-8 h-8 rounded-full bg-muted/30 border border-border/50 flex items-center justify-center text-muted-foreground"><Bell size={15} /></button>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent-foreground flex items-center justify-center shadow-sm"><User size={14} color="white" /></div>
        </div>
      </header>

      <div className="px-4 flex flex-col gap-3 w-full">

        {/* ── Empty state ── */}
        {bookings.length === 0 && (
          <div className="p-5 bg-muted/20 border-2 border-dashed border-primary/20 rounded-2xl text-center w-full">
            <Database size={28} className="mx-auto text-primary mb-2.5" />
            <h3 className="text-foreground font-bold mb-1.5 text-[14px]">데이터가 비어있습니다!</h3>
            <p className="text-muted-foreground text-[11px] mb-4 leading-relaxed">샘플 데이터를 복구하여 대시보드를 미리 확인해보세요.</p>
            <button
              className="py-3 px-6 bg-primary text-primary-foreground rounded-xl font-bold text-[13px] w-full"
              onClick={async () => {
                if (!userProfile) return;
                const pId = properties[0]?.id;
                if (!pId) return;
                try {
                  showToast('복구 중...', 'info');
                  await supabase.from('bookings').insert(DUMMY_BOOKINGS.map(b => ({
                    host_id: userProfile.id, property_id: pId,
                    guestname: b.guestName, checkin: b.checkIn, checkout: b.checkOut,
                    guests: b.guests, infants: b.infants, nationality: b.nationality,
                    channel: b.channel, status: b.status || 'confirmed',
                    amount: b.amount || 0, commission: b.commission || 0,
                  })));
                  await supabase.from('maintenance').insert(DUMMY_MAINTENANCE.map(m => ({
                    host_id: userProfile.id, property_id: pId,
                    startdate: m.startDate, enddate: m.endDate, label: m.label,
                  })));
                  await fetchData();
                  showToast('완료', 'success');
                } catch { showToast('오류 발생', 'error'); }
              }}
            >
              샘플 데이터 복구
            </button>
          </div>
        )}

        {/* ── KPI 1: 순수익 ── */}
        <div className={card}>
          <div className="flex items-center justify-between mb-2">
            <span className={kpiLabel}>{ko ? '예상 순수익' : 'NET INCOME'}</span>
            <span className={`text-[10px] font-bold py-0.5 px-2 rounded-full flex items-center gap-0.5 ${stats.momNetChange >= 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
              {stats.momNetChange >= 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
              {stats.momNetPct > 0 ? '+' : ''}{stats.momNetPct}%
            </span>
          </div>
          <div className={kpiValue}>{fmt(stats.netIncome)}</div>
          <div className={kpiSubGrid}>
            <div className="flex flex-col gap-0.5">
              <span className={kpiSubLabel}>{ko ? '총매출' : 'Gross'}</span>
              <strong className={kpiSubVal}>{fmt(stats.grossRevenue)}</strong>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className={kpiSubLabel}>{ko ? '전월 대비' : 'MOM'}</span>
              <strong className={`text-[12px] font-bold ${stats.momNetChange >= 0 ? 'text-success' : 'text-destructive'}`}>
                {stats.momNetChange >= 0 ? '+' : '-'}{fmt(stats.momNetChange)}
              </strong>
            </div>
          </div>
        </div>

        {/* ── KPI 2: 가동률 + ADR ── */}
        <div className="grid grid-cols-2 gap-3">
          <div className={`${card} !p-3.5`}>
            <div className={kpiLabel}>{ko ? '가동률' : 'OCC'}</div>
            <div className="text-[20px] font-extrabold text-foreground mb-2.5">{stats.occupancyRate}%</div>
            <div className="pt-2.5 border-t border-border/50">
              <span className={kpiSubLabel}>예약</span>
              <strong className="block text-[12px] font-bold text-foreground/90 mt-0.5">{stats.totalBookings}건</strong>
            </div>
          </div>
          <div className={`${card} !p-3.5`}>
            <div className={kpiLabel}>ADR</div>
            <div className="text-[16px] font-extrabold text-foreground mb-2.5 truncate" title={fmt(stats.adrThisMonth)}>{fmt(stats.adrThisMonth)}</div>
            <div className="pt-2.5 border-t border-border/50">
              <span className={kpiSubLabel}>OTA변동</span>
              <strong className={`block text-[12px] font-bold mt-0.5 ${stats.otaCommPct <= 0 ? 'text-success' : 'text-destructive'}`}>
                {stats.otaCommPct > 0 ? '+' : ''}{stats.otaCommPct}%
              </strong>
            </div>
          </div>
        </div>

        {/* ── 월별 추이 (11개월) ── */}
        <div className={card}>
          <span className={chartTitle}>{ko ? '월별 추이 (11개월)' : 'Monthly Trends (11 Months)'}</span>

          {/* YTD + 연간 예상 — 2행 compact strip */}
          <div className="mb-3 bg-muted/30 rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-2.5 py-1.5">
              <span className="text-[10px] font-bold text-muted-foreground whitespace-nowrap shrink-0 w-14">{ko ? '금년(YTD)' : 'YTD'}</span>
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded whitespace-nowrap">{ko ? '매출' : 'Gr'} {fmtShort(stats.ytdGross)}</span>
                <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded whitespace-nowrap">{ko ? '순이익' : 'Net'} {fmtShort(stats.ytdNet)}</span>
              </div>
            </div>
            <div className="h-px bg-border/40 mx-2.5" />
            <div className="flex items-center gap-2 px-2.5 py-1.5">
              <span className="text-[10px] font-bold text-muted-foreground whitespace-nowrap shrink-0 w-14">{currentYear}{ko ? ' 예상' : ' Fcst'}</span>
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded whitespace-nowrap">{ko ? '매출' : 'Gr'} {fmtShort(stats.annualForecast.totalGross)}</span>
                <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded whitespace-nowrap inline-flex items-center gap-1">
                  <span>{ko ? '순이익' : 'Net'} {fmtShort(stats.annualForecast.totalNet)}</span>
                  <span className="font-normal text-muted-foreground/50">· {stats.annualForecast.avgConfidence}%</span>
                </span>
              </div>
            </div>
          </div>

          {/* 범례 */}
          <div className="flex flex-wrap gap-3 mb-3">
            <div className={legendItem}><span className="w-2 h-2 rounded-full bg-primary/30" />{ko ? '총매출' : 'Gross'}</div>
            <div className={legendItem}><span className="w-2 h-2 rounded-full bg-primary" />{ko ? '순이익' : 'Net'}</div>
            <div className={legendItem}><span className="w-2 h-2 rounded-full bg-success" />{ko ? '점유율' : 'OCC'}</div>
            <div className={legendItem}>
              <span style={{ display:'inline-block', width:12, height:0, borderBottom:'2px dashed var(--success)', verticalAlign:'middle', marginRight:2 }} />
              {ko ? '예상OCC' : 'Pred.OCC'}
            </div>
          </div>

          {/* 차트 */}
          <div className="-mx-4">
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={chartData} margin={{ top: 5, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis xAxisId="0" dataKey={ko ? 'month' : 'monthEn'} axisLine={false} tickLine={false} tick={(props: any) => {
                  const { x, y, payload, index } = props;
                  const isSelected = chartData[index]?.isCurrent;
                  return (
                    <text x={x} y={y} dy={12} textAnchor="middle"
                      fill={isSelected ? 'var(--primary)' : tickColor}
                      fontSize={9} fontWeight={isSelected ? 700 : 500}>
                      {payload.value}
                    </text>
                  );
                }} />
                <XAxis xAxisId="1" dataKey={ko ? 'month' : 'monthEn'} hide />
                <XAxis xAxisId="2" dataKey={ko ? 'month' : 'monthEn'} hide />
                <YAxis yAxisId="revenue" hide domain={['auto', 'auto']} />
                <YAxis yAxisId="occ"     hide domain={[0, 100]} />
                <Tooltip content={<TrendTooltip sym={sym} isDark={isDark} ko={ko} />} cursor={{ fill: 'transparent' }} />
                {currentMonthLabel && (
                  <ReferenceLine xAxisId="0" yAxisId="revenue" x={currentMonthLabel}
                    stroke="var(--primary)" strokeDasharray="3 3" strokeOpacity={0.3} />
                )}
                {/* 예측 총매출 배경바 — 가장 먼저 렌더 (뒤에 위치) */}
                <Bar xAxisId="2" yAxisId="revenue" dataKey="predictedGrossBar"
                  radius={[3,3,0,0]} maxBarSize={20} legendType="none">
                  {chartData.map((_, i) => <Cell key={`pm-${i}`} fill="var(--primary)" fillOpacity={0.13} />)}
                </Bar>
                {/* OTB 총매출 */}
                <Bar xAxisId="0" yAxisId="revenue" dataKey="gross" name={ko ? '총매출' : 'Gross'} radius={[3,3,0,0]} maxBarSize={20}>
                  {chartData.map((e, i) => <Cell key={`g-${i}`} fill="var(--primary)" fillOpacity={e.isActualFuture ? 0.3 : 0.45} />)}
                </Bar>
                {/* OTB 순이익 */}
                <Bar xAxisId="1" yAxisId="revenue" dataKey="net" name={ko ? '순이익' : 'Net'} radius={[3,3,0,0]} maxBarSize={20}>
                  {chartData.map((e, i) => <Cell key={`n-${i}`} fill="var(--primary)" fillOpacity={e.isActualFuture ? 0.5 : 1} />)}
                </Bar>
                {/* OTB 점유율 실선 */}
                <Line xAxisId="0" yAxisId="occ" type="monotone" dataKey="occupancy"
                  name={ko ? '점유율' : 'OCC'} stroke="var(--success)" strokeWidth={2}
                  dot={{ r: 2, fill: 'var(--success)', strokeWidth: 0 }} activeDot={{ r: 4 }} />
                {/* 예측 점유율 점선 */}
                <Line xAxisId="0" yAxisId="occ" type="monotone" dataKey="predictedOccLine"
                  name={ko ? '예상OCC' : 'Pred.OCC'} stroke="var(--success)" strokeWidth={1.5}
                  strokeDasharray="5 5" strokeOpacity={0.6} connectNulls={false} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── 채널 분포 도넛 ── */}
        <div className={card}>
          <span className={chartTitle}>{ko ? '예약 채널 분포' : 'Booking Channels'}</span>
          <div className="flex gap-4 items-center">
            {/* 도넛 — 모바일에서 좌측 절반 */}
            <div className="relative shrink-0" style={{ width: 140, height: 140 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats.channelPieData} cx="50%" cy="50%" innerRadius={42} outerRadius={62} paddingAngle={2} dataKey="value" stroke="none" cornerRadius={3}>
                    {stats.channelPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[18px] font-extrabold text-foreground leading-none">{stats.occupancyRate}%</span>
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">{ko ? '가동률' : 'OCC'}</span>
              </div>
            </div>
            {/* 범례 — 우측 */}
            <ul className="flex-1 m-0 p-0 list-none min-w-0">
              {stats.channelPieData.map(item => (
                <li key={item.name} className={donutLegRow}>
                  <span className="w-2.5 h-2.5 rounded-full mr-2 shrink-0" style={{ background: item.color }} />
                  <span className="flex-1 text-muted-foreground text-[11px] truncate">{item.name}</span>
                  <span className="font-bold text-foreground/90 text-[11px]">{item.value}%</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── 리드타임 ── */}
        <div className={card}>
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className={chartTitle} style={{ marginBottom: 0 }}>{ko ? '리드타임' : 'Lead Time'}</span>
            <button
              className="text-[10px] font-bold py-1 px-2 rounded-lg bg-primary/10 text-primary whitespace-nowrap"
              onClick={() => setIsLeadTimeModalOpen(true)}
            >
              자세히 보기
            </button>
          </div>
          <div className={toggleGroup}>
            {(['channel', 'nationality', 'guests'] as const).map(m => (
              <button key={m} className={`${toggleBtn} ${leadTimeMode === m ? toggleBtnActive : ''}`} onClick={() => setLeadTimeMode(m)}>
                {m === 'channel' ? (ko ? '채널' : 'Ch') : m === 'nationality' ? (ko ? '국적' : 'Nat') : (ko ? '인원' : 'G')}
              </button>
            ))}
          </div>
          <div className="-mx-3 mt-3">
            <ResponsiveContainer width="100%" height={180}>
              <ScatterChart margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="x" type="number" domain={[stats.leadTimeStartX, stats.leadTimeEndX]} hide />
                <YAxis dataKey="y" type="number" domain={[0, 150]} hide />
                <ZAxis dataKey="nights" range={[8, 60]} />
                <Tooltip cursor={{ strokeDasharray: '3 3', stroke: gridColor }} content={<LeadTimeTooltip isDark={isDark} ko={ko} />} />
                {leadTimeMode === 'channel' && Object.keys(CHANNEL_COLORS).map(ch => (
                  <Scatter key={ch} name={ch} data={(stats.leadTimeScatterData || []).filter(d => d.channel === ch)} fill={CHANNEL_COLORS[ch]} shape={ScatterDot} />
                ))}
                {leadTimeMode === 'nationality' && stats.leadTimeNatKeys.map((nat) => (
                  <Scatter key={nat} name={nat} data={(stats.leadTimeScatterData || []).filter(d => d.nationality === nat)} fill={getNatColor(nat)} shape={ScatterDot} />
                ))}
                {leadTimeMode === 'guests' && ['1', '2', '3', '4', '5+'].map(gKey => (
                  <Scatter key={gKey} name={`${gKey}${ko ? '인' : 'G'}`} data={(stats.leadTimeScatterData || []).filter(d => { const g = d.guests || 2; return gKey === '5+' ? g >= 5 : g === parseInt(gKey); })} fill={GUEST_COLORS[gKey]} shape={ScatterDot} />
                ))}
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-2.5 mt-2">
            {leadTimeMode === 'channel' && Object.keys(CHANNEL_COLORS).map(ch => (
              <div key={ch} className={legendItem}><span className="w-1.5 h-1.5 rounded-full" style={{ background: CHANNEL_COLORS[ch] }} />{ch}</div>
            ))}
            {leadTimeMode === 'nationality' && stats.leadTimeNatKeys.map((nat) => (
              <div key={nat} className={legendItem}><span className="w-1.5 h-1.5 rounded-full" style={{ background: getNatColor(nat) }} />{nat}</div>
            ))}
            {leadTimeMode === 'guests' && ['1', '2', '3', '4', '5+'].map(gKey => (
              <div key={gKey} className={legendItem}><span className="w-1.5 h-1.5 rounded-full" style={{ background: GUEST_COLORS[gKey] }} />{gKey}{ko ? '인' : 'G'}</div>
            ))}
          </div>
        </div>

        {/* ── 월별 분석 테이블 (모바일 최적화) ── */}
        <div className={card}>
          <div className="flex items-center justify-between mb-3">
            <span className={chartTitle} style={{ marginBottom: 0 }}>{ko ? '월별 분석' : 'Monthly Summary'}</span>
            <select
              className="bg-muted border border-border rounded-lg py-1 pl-2 pr-6 text-[10px] font-semibold text-foreground cursor-pointer outline-none appearance-none"
              value={tableRange}
              onChange={e => setTableRange(e.target.value)}
            >
              <option value="6">{ko ? '최근 6개월' : 'Last 6m'}</option>
              <option value="12">{ko ? '최근 12개월' : 'Last 12m'}</option>
              <option value="all">{ko ? '전체' : 'All'}</option>
            </select>
          </div>
          {/* 가로 스크롤 — 카드 패딩 밖으로 확장 */}
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full border-collapse" style={{ minWidth: 320 }}>
              <thead>
                <tr className="border-b border-border">
                  <th className={`${thCls} text-left w-12`}>{ko ? '월' : 'Mo'}</th>
                  <th className={thCls}>{ko ? '매출' : 'Rev'}</th>
                  <th className={thCls}>{ko ? '순이익' : 'Net'}</th>
                  <th className={thCls}>{ko ? '가동률' : 'OCC'}</th>
                  <th className={thCls}>{ko ? '예약' : 'Bks'}</th>
                  <th className={thCls}>ADR</th>
                </tr>
              </thead>
              <tbody>
                {mobileTableData.map(row => (
                  <tr key={row.sortKey} className="hover:bg-muted/30 transition-colors">
                    <td className={`${tdCls} text-left font-bold text-foreground`}>{ko ? row.label : row.labelEn}</td>
                    <td className={tdCls}><span className="font-semibold">{fmtShort(row.gross)}</span></td>
                    <td className={tdCls}><span className="text-muted-foreground">{fmtShort(row.net)}</span></td>
                    <td className={tdCls}><span className="font-semibold">{row.occupancy}%</span></td>
                    <td className={tdCls}>{row.bookingCount}{ko ? '건' : ''}</td>
                    <td className={tdCls}>{fmtShort(row.adr)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-muted-foreground/60 mt-2 text-right">{ko ? `${mobileTableData.length}개월` : `${mobileTableData.length}mo`}</p>
        </div>

        {/* ── 예약 속도 추이 ── */}
        <PaceChart pace={pace} isDark={isDark} ko={ko} sym={sym} fmtShort={fmtShort} compact />

      </div>

      {isLeadTimeModalOpen && <LeadTimeDetailModal isDark={isDark} onClose={() => setIsLeadTimeModalOpen(false)} />}
    </div>
  );
};

export default DashboardPage;
