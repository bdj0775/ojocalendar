import { useState, useMemo, useRef } from 'react';
import {
  Bell, ChevronLeft, ChevronRight, TrendingUp,
  ArrowUpRight, ArrowDownRight, Database, Menu,
} from 'lucide-react';
import { useSidebar } from '../../context/SidebarContext';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
  CartesianGrid, ReferenceLine,
} from 'recharts';
import { useStore } from '../../store/useStore';
import { OverlapDetector } from '../../components/OverlapDetector';
import { useTranslation } from '../../hooks/useTranslation';
import { useDesktopStats } from '../../hooks/useDesktopStats';
import { useBookingPace } from '../../hooks/useBookingPace';
import { supabase } from '../../services/supabaseClient';
import { DUMMY_BOOKINGS, DUMMY_MAINTENANCE } from '../../utils/dummyData';
import LeadTimeDetailModal from '../../components/Modals/LeadTimeDetailModal';
import DistributionDetailModal from '../../components/Modals/DistributionDetailModal';
import { TrendTooltip } from '../DesktopDashboard/chartComponents';
import { useLeadTimeReport } from '../../hooks/useLeadTimeReport';
import PaceChart from '../DesktopDashboard/PaceChart';

const CHANNELS_FILTER = ['All', 'Airbnb', 'Booking.com', 'Direct', 'Naver'] as const;

const DashboardPage = () => {
  const { t, language } = useTranslation();
  const { open: openSidebar } = useSidebar();
  const { bookings, nextMonth, prevMonth, userProfile, properties, fetchData, showToast, currentYear, currentMonth } = useStore();

  const [tableChannel, setTableChannel] = useState('All');
  const [isLeadTimeModalOpen, setIsLeadTimeModalOpen] = useState(false);
  const [isChannelDetailOpen, setIsChannelDetailOpen] = useState(false);
  const [isNatDetailOpen, setIsNatDetailOpen] = useState(false);
  const [tableRange, setTableRange]   = useState('12');
  const [sortCol, setSortCol]         = useState<'sortKey' | 'occupancy' | 'gross' | 'adr' | 'otaComm'>('sortKey');
  const [sortDir, setSortDir]         = useState<'desc' | 'asc'>('desc');

  const handleSort = (col: typeof sortCol) => {
    if (sortCol === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortCol(col); setSortDir('desc'); }
  };

  const stats  = useDesktopStats(tableChannel, 'All', 'All');
  const pace   = useBookingPace();
  const report = useLeadTimeReport();

  const ko = language === 'ko';

  // ── 포맷 함수 ──────────────────────────────────────────────────
  // 원화 표기 "206,565 원" (통화기호 대신 '원')
  const fmtWon = (v: number) => `${Math.round(Math.abs(v)).toLocaleString()} 원`;
  // 만원 표기 "2,910 만원"
  const fmtMan = (v: number) => `${Math.round(v / 10000).toLocaleString()} 만원`;
  // 기존 짧은 포맷 (다른 카드용)
  const sym      = stats.currencySymbol;
  const fmtShort = useMemo(() => (v: number) => {
    if (Math.abs(v) >= 1000000) return `${sym}${(v / 1000000).toFixed(1)}M`;
    if (Math.abs(v) >= 1000)    return `${sym}${(v / 1000).toFixed(0)}K`;
    return `${sym}${v.toLocaleString()}`;
  }, [sym]);
  // 통화 기호 없이 숫자만 — 월별 분석 테이블 전용
  const fmtN = (v: number) => {
    if (Math.abs(v) >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
    if (Math.abs(v) >= 1000)    return `${(v / 1000).toFixed(0)}K`;
    return `${Math.round(v).toLocaleString()}`;
  };
  const fmt = (v: number) => `${sym}${Math.abs(v).toLocaleString()}`;

  const isDark    = document.documentElement.classList.contains('dark');
  const gridColor = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)';
  const tickColor = isDark ? '#64748b' : '#94a3b8';

  const actualYear     = new Date().getFullYear();
  const actualMonthIdx = new Date().getMonth();
  const MONTH_EN_IDX: Record<string, number> = {
    Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11,
  };

  // 현재 선택 월의 예측 데이터
  const currentTrend     = stats.monthlyTrends.find(t => t.isCurrent);
  const predictedOcc     = currentTrend?.predictedOcc ?? null;
  const predictedNet     = currentTrend?.predictedNet ?? null;
  const forecastConf     = currentTrend != null ? Math.round(currentTrend.forecastConfidence * 100) : null;
  const daysInMonth      = new Date(currentYear, currentMonth + 1, 0).getDate();
  const predictedNights  = predictedOcc != null ? Math.round(predictedOcc / 100 * daysInMonth) : null;
  const additionalNights = predictedNights != null ? predictedNights - stats.occupiedNights : null;

  // 차트 데이터
  const chartData = useMemo(() => stats.monthlyTrends.map(d => {
    const dMonthIdx       = MONTH_EN_IDX[d.monthEn] ?? -1;
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

  const currentMonthLabel = useMemo(() => {
    const entry = stats.monthlyTrends.find(d =>
      d.year === actualYear && (MONTH_EN_IDX[d.monthEn] ?? -1) === actualMonthIdx,
    );
    return ko ? (entry?.month ?? '') : (entry?.monthEn ?? '');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats.monthlyTrends, actualYear, actualMonthIdx, ko]);

  const mobileTableData = useMemo(() => {
    let data = [...(stats.monthlyTableData || [])];
    const now = new Date();
    const nowYear = now.getFullYear(), nowMonth = now.getMonth();

    // Bug fix: cap at current month — checkouts that spill into future months
    // (e.g. Dec→Jan) can create spurious future-month entries with bookingCount > 0
    data = data.filter(r => {
      const ry = Math.floor(r.sortKey / 100);
      const rm = r.sortKey % 100;
      return ry * 12 + rm <= nowYear * 12 + nowMonth;
    });

    if (tableRange === '6') {
      let cutY = nowYear, cutM = nowMonth - 5;
      while (cutM < 0) { cutM += 12; cutY--; }
      data = data.filter(r => r.sortKey >= cutY * 100 + cutM);
    } else if (tableRange === '12') {
      let cutY = nowYear, cutM = nowMonth - 11;
      while (cutM < 0) { cutM += 12; cutY--; }
      data = data.filter(r => r.sortKey >= cutY * 100 + cutM);
    }

    data.sort((a, b) => {
      let va = 0, vb = 0;
      switch (sortCol) {
        case 'sortKey':    va = a.sortKey;   vb = b.sortKey;   break;
        case 'occupancy':  va = a.occupancy; vb = b.occupancy; break;
        case 'gross':      va = a.gross;     vb = b.gross;     break;
        case 'adr':        va = a.adr;       vb = b.adr;       break;
        case 'otaComm':    va = a.otaComm;   vb = b.otaComm;   break;
      }
      return sortDir === 'desc' ? vb - va : va - vb;
    });

    return data;
  }, [stats.monthlyTableData, tableRange, sortCol, sortDir]);

  // ── CSS 토큰 ────────────────────────────────────────────────────
  const card        = 'bg-card text-card-foreground border border-border/60 rounded-2xl p-4 relative overflow-hidden shadow-sm w-full';
  // 데스크탑 대시보드와 동일한 KPI 값 색상 (slate-800 / slate-200)
  const kpiValueCls = 'text-slate-800 dark:text-slate-200 tracking-tight leading-none';
  // 섹션 레이블 — 점유율, 월말 예상 점유율, ADR, OTA 수수료 모두 동일 위계
  const sectionLabel = 'text-[10px] font-bold text-muted-foreground uppercase tracking-wider';
  const chartTitle   = 'text-[14px] font-bold text-foreground mb-3 block';
  const legendItem   = 'flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground';
  const donutLegRow  = 'flex items-center py-1.5 text-xs border-b border-border/50 last:border-0';
  const toggleGroup  = 'flex bg-muted/50 rounded-lg border border-border/50 p-0.5 mt-2';
  const toggleBtn    = 'flex-1 py-1.5 text-[10px] font-bold text-muted-foreground bg-transparent border-0 cursor-pointer rounded-md text-center transition-all whitespace-nowrap';
  const toggleBtnActive = 'bg-background text-primary shadow-sm';

  const swipeStartX = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    swipeStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (swipeStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - swipeStartX.current;
    swipeStartX.current = null;
    if (Math.abs(dx) < 50) return;
    if (dx < 0) nextMonth();
    else prevMonth();
  };

  return (
    <div
      className="bg-background min-h-screen pb-24 overflow-x-hidden w-full"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >

      {/* ── 헤더 ── */}
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
        </div>
      </header>

      <div className="px-4 flex flex-col gap-3 w-full">

        {/* ── 빈 상태 ── */}
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
                  await fetchData();
                  showToast('완료', 'success');
                } catch { showToast('오류 발생', 'error'); }
              }}
            >
              샘플 데이터 복구
            </button>
          </div>
        )}

        {/* ── KPI 1: 예상 순수익 ── */}
        <div className={card}>
          <div className="flex items-center justify-between mb-2">
            <span className={sectionLabel}>{ko ? '순수익' : 'NET INCOME'}</span>
            <span className={`text-[10px] font-bold py-0.5 px-2 rounded-full flex items-center gap-0.5 ${stats.momNetChange >= 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
              {stats.momNetChange >= 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
              {stats.momNetPct > 0 ? '+' : ''}{stats.momNetPct}%
            </span>
          </div>
          <div className="flex items-baseline gap-2 mb-3">
            <span className={`text-[26px] font-extrabold ${kpiValueCls}`}>{fmt(stats.netIncome)}</span>
            {predictedNet !== null && (
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                {ko ? `월말 예상 ${fmt(predictedNet)}` : `Est. EOM ${fmt(predictedNet)}`}
              </span>
            )}
          </div>
          {/* 구분선 없이 바로 서브 정보 */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-muted-foreground">{ko ? '총매출' : 'Gross'}</span>
              <strong className={`text-[12px] font-bold ${kpiValueCls}`}>{fmt(stats.grossRevenue)}</strong>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-muted-foreground">{ko ? '전월 대비' : 'MoM'}</span>
              <strong className={`text-[12px] font-bold ${stats.momNetChange >= 0 ? 'text-success' : 'text-destructive'}`}>
                {stats.momNetChange >= 0 ? '+' : '-'}{fmt(stats.momNetChange)}
              </strong>
            </div>
          </div>
        </div>

        {/* ── KPI 2: 점유율 + ADR ── */}
        <div className="grid grid-cols-2 gap-3">

          {/* 점유율 */}
          <div className={`${card} !p-3.5 flex flex-col aspect-square`}>
            <div className="flex-1 flex flex-col justify-center">
              <div className={`${sectionLabel} mb-1`}>{ko ? '점유율' : 'OCC'}</div>
              <div className="flex items-baseline gap-1.5 overflow-hidden">
                <span className={`text-[15px] font-semibold ${kpiValueCls} whitespace-nowrap`}>{stats.occupancyRate}%</span>
                <span className="text-[10px] text-muted-foreground leading-none whitespace-nowrap shrink-0 flex items-baseline gap-0.5">
                  <span>{stats.totalBookings}{ko ? '건' : ''}</span>
                  {stats.momBookingsChange !== 0 && (
                    <span className={`text-[9px] font-semibold ${stats.momBookingsChange > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      ({stats.momBookingsChange > 0 ? '+' : ''}{stats.momBookingsChange})
                    </span>
                  )}
                  <span>&nbsp;{stats.occupiedNights}{ko ? '박' : 'n'}</span>
                  {stats.momOccNightsChange !== 0 && (
                    <span className={`text-[9px] font-semibold ${stats.momOccNightsChange > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      ({stats.momOccNightsChange > 0 ? '+' : ''}{stats.momOccNightsChange}{ko ? '박' : 'n'})
                    </span>
                  )}
                </span>
              </div>
            </div>

            <div className="h-px bg-border/50 shrink-0" />

            <div className="flex-1 flex flex-col justify-center">
              <div className={`${sectionLabel} mb-1`}>{ko ? '월말 예상 점유율' : 'PREDICTED OCC'}</div>
              {predictedOcc != null ? (
                <div className="flex items-baseline gap-1.5 overflow-hidden">
                  <span className={`text-[15px] font-semibold ${kpiValueCls} whitespace-nowrap`}>{predictedOcc}%</span>
                  <div className="flex items-baseline gap-1 overflow-hidden">
                    {additionalNights != null && additionalNights > 0 && (
                      <span className="text-[10px] text-success font-semibold leading-none whitespace-nowrap shrink-0">+{additionalNights}{ko ? '박' : 'n'}</span>
                    )}
                    {forecastConf != null && (
                      <span className="text-[10px] text-muted-foreground/70 leading-none whitespace-nowrap shrink-0">{ko ? '신뢰도' : 'Conf.'} {forecastConf}%</span>
                    )}
                  </div>
                </div>
              ) : (
                <span className="text-[13px] text-muted-foreground/50">–</span>
              )}
            </div>
          </div>

          {/* ADR */}
          <div className={`${card} !p-3.5 flex flex-col aspect-square`}>
            <div className="flex-1 flex flex-col justify-center">
              <div className={`${sectionLabel} mb-1`}>ADR</div>
              <div className="flex items-baseline gap-1.5 overflow-hidden">
                <span className={`text-[15px] font-semibold ${kpiValueCls} whitespace-nowrap`}>{stats.adrThisMonth.toLocaleString()} 원</span>
                <span className="text-[9px] text-muted-foreground leading-none whitespace-nowrap shrink-0">
                  {ko ? `평균 ${(stats.adrYearAvg / 10000).toFixed(1)}만원` : `avg ${(stats.adrYearAvg / 10000).toFixed(1)}만원`}
                </span>
              </div>
            </div>

            <div className="h-px bg-border/50 shrink-0" />

            <div className="flex-1 flex flex-col justify-center">
              <div className={`${sectionLabel} mb-1`}>{ko ? 'OTA 수수료' : 'OTA COMM.'}</div>
              <div className="flex items-baseline gap-1.5 overflow-hidden">
                <span className={`text-[15px] font-semibold ${kpiValueCls} whitespace-nowrap`}>{fmtWon(stats.otaCommission)}</span>
                <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold py-0.5 px-1.5 rounded-full leading-none shrink-0 ${stats.otaCommPct <= 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                  {stats.otaCommPct > 0 ? <ArrowUpRight size={9} /> : <ArrowDownRight size={9} />}
                  {Math.abs(stats.otaCommPct)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── 월별 추이 ── */}
        <div className={card}>
          <span className={chartTitle}>{ko ? '월별 추이 (11개월)' : 'Monthly Trends (11 Months)'}</span>

          {/* 누적/예상 한 줄 compact */}
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 mb-3 text-[10px] leading-relaxed">
            <span className="font-bold text-muted-foreground">
              {String(actualYear).slice(-2)}{ko ? '년 누적 총액' : 'YTD'}
            </span>
            <span className="text-foreground/80">{ko ? '매출' : 'Gr'} <strong className="text-foreground">{fmtMan(stats.ytdGross)}</strong></span>
            <span className="text-foreground/80">{ko ? '순이익' : 'Net'} <strong className="text-foreground">{fmtMan(stats.ytdNet)}</strong></span>
            <span className="text-border select-none mx-0.5">·</span>
            <span className="font-bold text-muted-foreground">
              {String(currentYear).slice(-2)}{ko ? '년 예상 총액' : ' Fcst'}
            </span>
            <span className="text-foreground/80">{ko ? '매출' : 'Gr'} <strong className="text-foreground">{fmtMan(stats.annualForecast.totalGross)}</strong></span>
            <span className="text-foreground/80">
              {ko ? '순이익' : 'Net'} <strong className="text-foreground">{fmtMan(stats.annualForecast.totalNet)}</strong>
              <span className="text-muted-foreground/50"> · {stats.annualForecast.avgConfidence}%</span>
            </span>
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

          {/* 차트 — -mx-4로 전폭 */}
          <div className="-mx-4">
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={chartData} margin={{ top: 5, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis
                  xAxisId="0"
                  dataKey={ko ? 'month' : 'monthEn'}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                  tick={(props: any) => {
                    const { x, y, payload, index } = props;
                    const isSelected = chartData[index]?.isCurrent;
                    return (
                      <text
                        x={x} y={y} dy={12}
                        textAnchor="middle"
                        fill={isSelected ? 'var(--primary)' : tickColor}
                        fontSize={9}
                        fontWeight={isSelected ? 700 : 500}
                      >
                        {payload.value}
                      </text>
                    );
                  }}
                />
                <XAxis xAxisId="1" dataKey={ko ? 'month' : 'monthEn'} hide />
                <XAxis xAxisId="2" dataKey={ko ? 'month' : 'monthEn'} hide />
                <YAxis yAxisId="revenue" hide domain={['auto', 'auto']} />
                <YAxis yAxisId="occ"     hide domain={[0, 100]} />
                <Tooltip
                  content={<TrendTooltip sym={sym} isDark={isDark} ko={ko} compact />}
                  cursor={{ fill: 'transparent' }}
                  allowEscapeViewBox={{ x: false, y: false }}
                />
                {currentMonthLabel && (
                  <ReferenceLine xAxisId="0" yAxisId="revenue" x={currentMonthLabel}
                    stroke="var(--primary)" strokeDasharray="3 3" strokeOpacity={0.3} />
                )}
                <Bar xAxisId="2" yAxisId="revenue" dataKey="predictedGrossBar"
                  radius={[3,3,0,0]} maxBarSize={20} legendType="none">
                  {chartData.map((_, i) => <Cell key={`pm-${i}`} fill="var(--primary)" fillOpacity={0.13} />)}
                </Bar>
                <Bar xAxisId="0" yAxisId="revenue" dataKey="gross" name={ko ? '총매출' : 'Gross'} radius={[3,3,0,0]} maxBarSize={20}>
                  {chartData.map((e, i) => <Cell key={`g-${i}`} fill="var(--primary)" fillOpacity={e.isActualFuture ? 0.3 : 0.45} />)}
                </Bar>
                <Bar xAxisId="1" yAxisId="revenue" dataKey="net" name={ko ? '순이익' : 'Net'} radius={[3,3,0,0]} maxBarSize={20}>
                  {chartData.map((e, i) => <Cell key={`n-${i}`} fill="var(--primary)" fillOpacity={e.isActualFuture ? 0.5 : 1} />)}
                </Bar>
                <Line xAxisId="0" yAxisId="occ" type="monotone" dataKey="occupancy"
                  name={ko ? '점유율' : 'OCC'} stroke="var(--success)" strokeWidth={2}
                  dot={{ r: 2, fill: 'var(--success)', strokeWidth: 0 }} activeDot={{ r: 4 }} />
                <Line xAxisId="0" yAxisId="occ" type="monotone" dataKey="predictedOccLine"
                  name={ko ? '예상OCC' : 'Pred.OCC'} stroke="var(--success)" strokeWidth={1.5}
                  strokeDasharray="5 5" strokeOpacity={0.6} connectNulls={false} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── 채널 분포 도넛 ── */}
        <div className={card}>
          <div className="flex items-center justify-between mb-2">
            <span className={chartTitle} style={{ marginBottom: 0 }}>{ko ? '예약 채널 분포' : 'Booking Channels'}</span>
            <button
              className="text-[10px] font-bold py-1 px-2.5 rounded-lg bg-primary/10 text-primary whitespace-nowrap"
              onClick={() => setIsChannelDetailOpen(true)}
            >{ko ? '자세히 보기 >' : 'Details >'}</button>
          </div>
          <div className="flex items-start">
            <div className="flex-1 flex flex-col items-center">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1">{ko ? '이번 달' : 'This Month'}</span>
              <div className="relative w-full">
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart><Pie data={stats.channelPieData} cx="50%" cy="50%" innerRadius={40} outerRadius={56} paddingAngle={3} dataKey="value" stroke="none" cornerRadius={4}>
                    {stats.channelPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie></PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 pointer-events-none">
                  <span className="text-[18px] font-extrabold text-foreground leading-none">{stats.occupancyRate}%</span>
                  <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">{ko ? '가동률' : 'OCC'}</span>
                </div>
              </div>
            </div>
            <div className="w-px bg-border/40 self-stretch mx-1 mt-5" />
            <div className="flex-1 flex flex-col items-center">
              <span className="text-[10px] font-bold text-primary/70 uppercase tracking-wide mb-1">{ko ? '전체 평균' : 'All-time'}</span>
              <div className="relative w-full">
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart><Pie data={stats.allTimeChannelPieData} cx="50%" cy="50%" innerRadius={40} outerRadius={56} paddingAngle={3} dataKey="value" stroke="none" cornerRadius={4}>
                    {stats.allTimeChannelPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie></PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 pointer-events-none">
                  <span className="text-[17px] font-extrabold text-foreground leading-none">{stats.allTimeTotal}</span>
                  <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">{ko ? '전체' : 'TOTAL'}</span>
                </div>
              </div>
            </div>
          </div>
          <ul className="m-0 p-0 list-none mt-1">
            <li className="flex items-center pb-1">
              <span className="w-2 h-2 mr-2 flex-shrink-0" />
              <span className="flex-1" />
              <span className="text-[10px] font-bold text-muted-foreground w-9 text-right">{ko ? '이달' : 'Mo.'}</span>
              <span className="text-[10px] font-bold text-primary/60 w-9 text-right">{ko ? '전체' : 'All'}</span>
            </li>
            {(() => {
              const allTimeMap = new Map(stats.allTimeChannelPieData.map(d => [d.name, d]));
              const currentMap = new Map(stats.channelPieData.map(d => [d.name, d]));
              const allNames = [...new Set([...stats.channelPieData, ...stats.allTimeChannelPieData].map(d => d.name))];
              return allNames.map(name => {
                const item = (currentMap.get(name) || allTimeMap.get(name))!;
                return (
                  <li key={name} className={`${donutLegRow} text-xs`}>
                    <span className="w-2 h-2 rounded-full mr-2 flex-shrink-0" style={{ background: item.color }} />
                    <span className="flex-1 text-muted-foreground truncate">{name}</span>
                    <span className="font-bold text-foreground/90 w-9 text-right">{currentMap.get(name)?.value ?? '–'}%</span>
                    <span className="font-medium text-muted-foreground w-9 text-right">{allTimeMap.get(name)?.value ?? '–'}%</span>
                  </li>
                );
              });
            })()}
          </ul>
        </div>

        {/* ── 국적 분포 도넛 ── */}
        <div className={card}>
          <div className="flex items-center justify-between mb-2">
            <span className={chartTitle} style={{ marginBottom: 0 }}>{ko ? '국적 분포' : 'Nationality Mix'}</span>
            <button
              className="text-[10px] font-bold py-1 px-2.5 rounded-lg bg-primary/10 text-primary whitespace-nowrap"
              onClick={() => setIsNatDetailOpen(true)}
            >{ko ? '자세히 보기 >' : 'Details >'}</button>
          </div>
          <div className="flex items-start">
            <div className="flex-1 flex flex-col items-center">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1">{ko ? '이번 달' : 'This Month'}</span>
              <div className="relative w-full">
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart><Pie data={stats.nationalityPieData} cx="50%" cy="50%" innerRadius={40} outerRadius={56} paddingAngle={3} dataKey="value" stroke="none" cornerRadius={4}>
                    {stats.nationalityPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie></PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 pointer-events-none">
                  <span className="text-[18px] font-extrabold text-foreground leading-none">{stats.totalNatBookings}</span>
                  <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">{ko ? '예약' : 'BOOKINGS'}</span>
                </div>
              </div>
            </div>
            <div className="w-px bg-border/40 self-stretch mx-1 mt-5" />
            <div className="flex-1 flex flex-col items-center">
              <span className="text-[10px] font-bold text-primary/70 uppercase tracking-wide mb-1">{ko ? '전체 평균' : 'All-time'}</span>
              <div className="relative w-full">
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart><Pie data={stats.allTimeNationalityPieData} cx="50%" cy="50%" innerRadius={40} outerRadius={56} paddingAngle={3} dataKey="value" stroke="none" cornerRadius={4}>
                    {stats.allTimeNationalityPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie></PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 pointer-events-none">
                  <span className="text-[17px] font-extrabold text-foreground leading-none">{stats.allTimeTotal}</span>
                  <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">{ko ? '전체' : 'TOTAL'}</span>
                </div>
              </div>
            </div>
          </div>
          <ul className="m-0 p-0 list-none mt-1">
            <li className="flex items-center pb-1">
              <span className="w-2 h-2 mr-2 flex-shrink-0" />
              <span className="flex-1" />
              <span className="text-[10px] font-bold text-muted-foreground w-9 text-right">{ko ? '이달' : 'Mo.'}</span>
              <span className="text-[10px] font-bold text-primary/60 w-9 text-right">{ko ? '전체' : 'All'}</span>
            </li>
            {(() => {
              const allTimeMap = new Map(stats.allTimeNationalityPieData.map(d => [d.name, d]));
              const currentMap = new Map(stats.nationalityPieData.map(d => [d.name, d]));
              const allNames = [...new Set([...stats.nationalityPieData, ...stats.allTimeNationalityPieData].map(d => d.name))].slice(0, 4);
              return allNames.map(name => {
                const item = (currentMap.get(name) || allTimeMap.get(name))!;
                return (
                  <li key={name} className={`${donutLegRow} text-xs`}>
                    <span className="w-2 h-2 rounded-full mr-2 flex-shrink-0" style={{ background: item.color }} />
                    <span className="flex-1 text-muted-foreground truncate">{name}</span>
                    <span className="font-bold text-foreground/90 w-9 text-right">{currentMap.get(name)?.value ?? '–'}%</span>
                    <span className="font-medium text-muted-foreground w-9 text-right">{allTimeMap.get(name)?.value ?? '–'}%</span>
                  </li>
                );
              });
            })()}
          </ul>
        </div>

        {/* ── 예약 속도 추이 (채널분포 바로 아래) ── */}
        <PaceChart pace={pace} isDark={isDark} ko={ko} sym={sym} fmtShort={fmtShort} compact predictedOcc={predictedOcc} />

        {/* ── 리드타임 구간별 비중 ── */}
        <div className={card}>
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className={chartTitle} style={{ marginBottom: 0 }}>
              {ko ? '리드타임 구간별 비중' : 'Lead Time Breakdown'}
            </span>
            <button
              className="text-[10px] font-bold py-1 px-2 rounded-lg bg-primary/10 text-primary whitespace-nowrap"
              onClick={() => setIsLeadTimeModalOpen(true)}
            >
              {ko ? '분포 보기 >' : 'View >'}
            </button>
          </div>

          {/* 선택 월 평균 요약 */}
          {report.currentMonthTotal > 0 ? (
            <div className="flex items-baseline gap-1.5 mb-4">
              <span className="text-[22px] font-bold text-foreground leading-none">{report.currentMonthAvgDays}</span>
              <span className="text-[11px] text-muted-foreground">{ko ? '일 전 평균 예약' : 'days avg lead time'}</span>
              <span className="text-[10px] text-muted-foreground/50 ml-auto">{ko ? `이번 달 ${report.currentMonthTotal}건` : `${report.currentMonthTotal} this month`}</span>
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground/50 mb-4">{ko ? '이번 달 예약 없음' : 'No bookings this month'}</p>
          )}

          {/* 구간별 가로 막대: 진한 바(이번달) + 연한 바(전체) */}
          <div className="flex flex-col gap-3">
            {report.currentMonthBuckets.map((cm, i) => {
              const overall = report.buckets[i];
              return (
                <div key={cm.key}>
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-[11px] font-semibold text-foreground">
                      {ko ? cm.label : cm.labelEn}
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[12px] font-bold text-foreground">{cm.pct}%</span>
                      <span className="text-[9px] text-muted-foreground/60">{overall.pct}%</span>
                    </div>
                  </div>
                  {/* 연한 회색 바 (전체 평균) */}
                  <div className="relative h-1 w-full rounded-full bg-muted/40 mb-0.5">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, overall.pct)}%`, background: 'var(--muted-foreground)', opacity: 0.3 }}
                    />
                  </div>
                  {/* 진한 컬러 바 (이번 달) */}
                  <div className="relative h-2 w-full rounded-full bg-muted/30">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, cm.pct)}%`, background: cm.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-3 mt-3">
            <div className="flex items-center gap-1">
              <div className="w-3 h-1.5 rounded-full bg-primary" />
              <span className="text-[9px] text-muted-foreground">{ko ? '이번 달' : 'This month'}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-1 rounded-full bg-muted-foreground/30" />
              <span className="text-[9px] text-muted-foreground">{ko ? '전체 평균' : 'Overall'}</span>
            </div>
          </div>
        </div>

        {/* ── 월별 분석 ── */}
        <div className={card}>

          {/* 헤더 줄: 제목 + 기간 선택 */}
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

          {/* 채널 필터 칩 */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {CHANNELS_FILTER.map(ch => {
              const label = ch === 'All' ? (ko ? '전체' : 'All') : ch === 'Booking.com' ? 'Booking' : ch;
              const active = tableChannel === ch;
              return (
                <button
                  key={ch}
                  onClick={() => setTableChannel(ch)}
                  className={`text-[10px] font-bold py-0.5 px-2.5 rounded-full border transition-colors whitespace-nowrap
                    ${active
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-transparent text-muted-foreground border-border/60 hover:border-primary/40 hover:text-foreground'}`}
                >
                  {label}
                </button>
              );
            })}
            {tableChannel !== 'All' && (
              <button
                onClick={() => setTableChannel('All')}
                className="text-[10px] font-bold py-0.5 px-2 rounded-full border border-border/40 text-muted-foreground/60 hover:text-destructive hover:border-destructive/40 transition-colors"
              >
                ✕
              </button>
            )}
          </div>

          {/* 정렬 표시 줄 (기본 월 정렬이 아닐 때만) */}
          {sortCol !== 'sortKey' && (
            <div className="flex items-center gap-1.5 mb-2 text-[10px] text-muted-foreground">
              <span>{ko ? '정렬:' : 'Sort:'}</span>
              <span className="text-primary font-semibold">
                {{ occupancy: ko ? '점유율' : 'OCC', gross: ko ? '매출' : 'Rev', net: ko ? '순이익' : 'Net', adr: 'ADR', otaComm: ko ? '수수료' : 'Comm' }[sortCol]}
                {' '}{sortDir === 'desc' ? '↓' : '↑'}
              </span>
              <button onClick={() => { setSortCol('sortKey'); setSortDir('desc'); }} className="ml-auto text-[9px] text-muted-foreground/50 hover:text-foreground">
                {ko ? '초기화' : 'Reset'}
              </button>
            </div>
          )}

          {/* 테이블 */}
          {(() => {
            // 대시보드 선택월을 상단 고정, 나머지는 정렬
            const pinnedRow = mobileTableData.find(r => r.year === currentYear && r.month === currentMonth);
            const bodyRows  = mobileTableData.filter(r => !(r.year === currentYear && r.month === currentMonth));

            // 컬럼 정의 — 순이익 제외, 5컬럼
            const COLS = [
              { col: 'sortKey',   label: ko ? '월' : 'Mo',      align: 'left'   },
              { col: 'occupancy', label: ko ? '점유율' : 'OCC', align: 'center' },
              { col: 'gross',     label: ko ? '매출' : 'Rev',   align: 'right'  },
              { col: 'adr',       label: 'ADR',                  align: 'right'  },
              { col: 'otaComm',   label: ko ? '수수료' : 'Comm', align: 'right'  },
            ] as const;

            // 단일 행 렌더링 — isPinned: 대시보드 선택월, isNow: 실제 오늘
            const renderRow = (row: typeof mobileTableData[0], isPinned: boolean) => {
              const nights     = Math.round(row.occupancy / 100 * new Date(row.year, row.month + 1, 0).getDate());
              const isNow      = row.year === actualYear && row.month === actualMonthIdx;
              // 타이포그래피 — 크기 통일, 서브는 opacity로만 구분
              const val = 'text-[11px] font-medium text-foreground tabular-nums leading-none';
              const sub = 'text-[11px] text-muted-foreground/50 tabular-nums leading-none';
              return (
                <tr
                  key={row.sortKey}
                  className={`border-b border-border/20 ${
                    isPinned && isNow  ? 'bg-primary/5' :
                    isPinned           ? 'bg-muted/40'  :
                    isNow              ? 'bg-primary/5' : ''
                  }`}
                >
                  {/* 월 */}
                  <td className="py-2 pr-2 align-middle whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <span className={`text-[11px] font-semibold leading-none ${isNow ? 'text-primary' : 'text-foreground'}`}>
                        {ko ? row.label : row.labelEn}
                      </span>
                      {isPinned && !isNow && (
                        <span className="text-[8px] text-primary/50 leading-none">◀</span>
                      )}
                    </div>
                  </td>
                  {/* 점유율 · 박 — 같은 크기, 같은 baseline */}
                  <td className="py-2 align-middle">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className={val}>{row.occupancy}%</span>
                      <span className={sub}>{nights}{ko ? '박' : 'n'}</span>
                    </div>
                  </td>
                  {/* 매출 */}
                  <td className="py-2 align-middle text-right">
                    <span className={val}>{fmtN(row.gross)}</span>
                  </td>
                  {/* ADR */}
                  <td className="py-2 align-middle text-right">
                    <span className={val}>{fmtN(row.adr)}</span>
                  </td>
                  {/* 수수료 */}
                  <td className="py-2 align-middle text-right">
                    <span className={`text-[11px] font-medium text-muted-foreground/70 tabular-nums leading-none`}>{fmtN(row.otaComm)}</span>
                  </td>
                </tr>
              );
            };

            return (
              <div className="overflow-x-auto -mx-4 px-4">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-border/50">
                      {COLS.map(({ col, label, align }) => {
                        const active = sortCol === col;
                        return (
                          <th key={col} className="pb-1.5 pt-0">
                            <button
                              onClick={() => handleSort(col)}
                              className={`flex items-center gap-0.5 whitespace-nowrap select-none
                                text-[9px] font-semibold uppercase tracking-wider leading-none transition-colors
                                ${active ? 'text-primary' : 'text-muted-foreground/60'}
                                ${align === 'center' ? 'w-full justify-center' : align === 'right' ? 'w-full justify-end' : ''}`}
                            >
                              {label}
                              <span className={`leading-none ${active ? 'text-primary' : 'text-border'}`}>
                                {active ? (sortDir === 'desc' ? '▼' : '▲') : '⇅'}
                              </span>
                            </button>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {pinnedRow && renderRow(pinnedRow, true)}
                    {bodyRows.map(row => renderRow(row, false))}
                    {mobileTableData.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-5 text-center text-[10px] text-muted-foreground/50">
                          {ko ? '표시할 데이터가 없습니다' : 'No data'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            );
          })()}

          {/* 푸터: 건수 + 활성 필터 표시 */}
          <p className="text-[10px] text-muted-foreground/50 mt-2 text-right">
            {tableChannel !== 'All' && (
              <span className="mr-1.5 text-primary font-semibold">
                {tableChannel === 'Booking.com' ? 'Booking' : tableChannel}
              </span>
            )}
            {ko ? `${mobileTableData.length}개월` : `${mobileTableData.length}mo`}
          </p>
        </div>



      </div>

      {isLeadTimeModalOpen && <LeadTimeDetailModal isDark={isDark} onClose={() => setIsLeadTimeModalOpen(false)} />}
      {isChannelDetailOpen && <DistributionDetailModal mode="channel" isDark={isDark} onClose={() => setIsChannelDetailOpen(false)} />}
      {isNatDetailOpen && <DistributionDetailModal mode="nationality" isDark={isDark} onClose={() => setIsNatDetailOpen(false)} />}
    </div>
  );
};

export default DashboardPage;
