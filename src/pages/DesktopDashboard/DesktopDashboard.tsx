import { useState, useMemo } from 'react';
import {
  Bell,
  ChevronLeft, ChevronRight,
  ArrowUpRight, ArrowDownRight, Database, Sun, Moon,
} from 'lucide-react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
  CartesianGrid, ReferenceLine, ReferenceDot,
  Area,
} from 'recharts';
import { useStore } from '../../store/useStore';
import { useTranslation } from '../../hooks/useTranslation';
import { useDesktopStats } from '../../hooks/useDesktopStats';
import { useBookingPace } from '../../hooks/useBookingPace';
import { supabase } from '../../services/supabaseClient';
import { DUMMY_BOOKINGS, DUMMY_MAINTENANCE } from '../../utils/dummyData';
import LeadTimeDetailModal from '../../components/Modals/LeadTimeDetailModal';
import DistributionDetailModal from '../../components/Modals/DistributionDetailModal';
import { getNatColor } from '../../utils/colors';
import { CHANNEL_COLORS, TrendTooltip } from './chartComponents';
import { useLeadTimeReport } from '../../hooks/useLeadTimeReport';
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

  const [isLeadTimeModalOpen, setIsLeadTimeModalOpen] = useState(false);
  const report = useLeadTimeReport();
  const [isChannelDetailOpen, setIsChannelDetailOpen] = useState(false);
  const [isNatDetailOpen, setIsNatDetailOpen] = useState(false);

  const sym = stats.currencySymbol;
  const ko = language === 'ko';
  const fmt = (v: number) => `${sym}${Math.abs(v).toLocaleString()}`;
  const fmtShort = useMemo(() => (v: number) => {
    if (Math.abs(v) >= 1000000) return `${sym}${(v / 1000000).toFixed(1)}M`;
    if (Math.abs(v) >= 1000) return `${sym}${(v / 1000).toFixed(0)}K`;
    return `${sym}${v.toLocaleString()}`;
  }, [sym]);

  // 실제 오늘 날짜 기준 (선택 월과 무관)
  const actualYear     = new Date().getFullYear();
  const actualMonthIdx = new Date().getMonth();
  const MONTH_EN_IDX: Record<string, number> = {
    Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5, Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11,
  };

  // 차트용 데이터 — 실제 오늘 기준으로 점선/배경바/하이라이트 결정
  const chartData = useMemo(() => stats.monthlyTrends.map(d => {
    const dMonthIdx      = MONTH_EN_IDX[d.monthEn] ?? -1;
    const isActualCurrent = d.year === actualYear && dMonthIdx === actualMonthIdx;
    const isActualFuture  = d.year > actualYear || (d.year === actualYear && dMonthIdx > actualMonthIdx);
    return {
      ...d,
      isActualCurrent,
      isActualFuture,
      // 점선: 현재월 OTB 값에서 시작 → 이후 예측값으로 연결 (선택 월이 달라도 항상 실제 5월 기준)
      predictedOccLine: isActualCurrent ? d.occupancy : isActualFuture ? d.predictedOcc : null,
      // 예측 총매출 배경바: 실제 미래월만
      predictedGrossBar: isActualFuture ? (d.predictedGross ?? null) : null,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [stats.monthlyTrends, actualYear, actualMonthIdx]);

  // 현재월 라벨 (ReferenceLine x 값) — 실제 오늘의 월
  const currentMonthLabel = useMemo(() => {
    const entry = stats.monthlyTrends.find(d =>
      d.year === actualYear && (MONTH_EN_IDX[d.monthEn] ?? -1) === actualMonthIdx,
    );
    return ko ? (entry?.month ?? '') : (entry?.monthEn ?? '');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats.monthlyTrends, actualYear, actualMonthIdx, ko]);


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

  // 시각화 프로그레스 변수 계산
  const today = new Date();
  const startOfYear = new Date(actualYear, 0, 1);
  const endOfYear = new Date(actualYear, 11, 31);
  const dayOfYear = Math.floor((today.getTime() - startOfYear.getTime()) / 86400000);
  const totalDays = Math.floor((endOfYear.getTime() - startOfYear.getTime()) / 86400000) + 1;
  const revProgressPct = stats.annualForecast.totalGross > 0 ? Math.min(100, Math.round((stats.ytdGross / stats.annualForecast.totalGross) * 100)) : 0;
  const currentMonthGross = stats.monthlyTrends.find(m => m.isCurrent)?.gross || 0;
  const currentMonthNet = stats.monthlyTrends.find(m => m.isCurrent)?.net || 0;
  const currentTrend = stats.monthlyTrends.find(m => m.isCurrent);
  const predictedNet = currentTrend?.predictedNet ?? null;
  const predictedOcc = currentTrend?.predictedOcc ?? null;
  const currentCumData = stats.annualCumulativeData.find(d => d.actual !== null && stats.annualCumulativeData[stats.annualCumulativeData.indexOf(d) + 1]?.actual === null) || stats.annualCumulativeData[stats.annualCumulativeData.length - 1];
  const dotX = currentCumData ? (ko ? currentCumData.nameKo : currentCumData.name) : undefined;
  const dotY = currentCumData?.actual;

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
              <div className={kpiLabelCls}>{ko ? '순수익' : 'NET INCOME'}</div>
              <span className={`type-micro font-bold py-0.5 px-2 rounded-full flex items-center gap-0.5 ${stats.momNetChange >= 0 ? badgeUpCls : badgeDownCls}`}>
                {stats.momNetChange >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                {stats.momNetPct > 0 ? '+' : ''}{stats.momNetPct}%
              </span>
            </div>
            <div className="flex items-baseline gap-2 mb-6">
              <span className="type-numeric text-slate-800 dark:text-slate-200 tracking-tight leading-none">{fmt(stats.netIncome)}</span>
              {predictedNet !== null && (
                <span className="type-micro text-muted-foreground whitespace-nowrap">
                  {ko ? `월말 예상 ${fmt(predictedNet)}` : `Est. EOM ${fmt(predictedNet)}`}
                </span>
              )}
            </div>
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
            <div className="flex items-baseline gap-2 mb-6">
              <span className="type-numeric text-slate-800 dark:text-slate-200 tracking-tight leading-none">{stats.occupancyRate}%</span>
              {predictedOcc !== null && (
                <span className="type-micro text-muted-foreground whitespace-nowrap">
                  {ko ? `월말 예상 ${predictedOcc}%` : `Est. EOM ${predictedOcc}%`}
                </span>
              )}
            </div>
          </div>
          <div className={kpiSubGridCls}>
            <div className={kpiSubItemCls}>
              <span className={kpiSubLabelCls}>{ko ? '예약 건수' : 'Bookings'}</span>
              <strong className={kpiSubValCls}>
                {stats.totalBookings}{ko ? '건' : ''}
                {stats.momBookingsChange !== 0 && (
                  <span className={`ml-1 text-[10px] font-semibold ${stats.momBookingsChange > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    ({stats.momBookingsChange > 0 ? '+' : ''}{stats.momBookingsChange})
                  </span>
                )}
              </strong>
            </div>
            <div className={kpiSubItemCls}>
              <span className={kpiSubLabelCls}>{ko ? '예약 박수' : 'Occupied Nights'}</span>
              <strong className={kpiSubValCls}>
                {stats.occupiedNights}{ko ? '박' : ' nights'}
                {stats.momOccNightsChange !== 0 && (
                  <span className={`ml-1 text-[10px] font-semibold ${stats.momOccNightsChange > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    ({stats.momOccNightsChange > 0 ? '+' : ''}{stats.momOccNightsChange}{ko ? '박' : ''})
                  </span>
                )}
              </strong>
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

        {/* Box 4: Annual Key Metrics */}
        <div className={`${cardCls} flex flex-col justify-between`}>
          <div className="flex items-center justify-between mb-2">
            <span className={chartTitleCls}>{ko ? '연간 주요지표' : 'Annual Key Metrics'}</span>
            <span className="type-micro font-medium text-muted-foreground">{actualYear}{ko ? '년 ' : '-'}{actualMonthIdx + 1}{ko ? '월 ' : '-'}{today.getDate()}{ko ? '일' : ''}</span>
          </div>
          
          <div className="flex-1 flex flex-col justify-center gap-2.5">
            {/* 1. 누적 총 매출 */}
            <div>
              <div className="flex items-center justify-between mb-0.5">
                <span className="type-micro font-bold text-muted-foreground">{ko ? '누적 총 매출' : 'YTD GROSS'}</span>
                {currentMonthGross > 0 && <span className={kpiSubLabelCls}>{ko ? '전월대비' : 'MoM'}</span>}
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-extrabold text-slate-800 dark:text-slate-200 tracking-tight leading-none tabular-nums">{fmt(stats.ytdGross)}</span>
                {currentMonthGross > 0 && (
                  <span className="text-[11px] font-bold text-emerald-500 tabular-nums">
                    +{currentMonthGross.toLocaleString()}원
                  </span>
                )}
              </div>
            </div>

            <div className="border-t border-border/40"></div>

            {/* 2. 누적 총 수익 */}
            <div>
              <div className="flex items-center justify-between mb-0.5">
                <span className="type-micro font-bold text-muted-foreground">{ko ? '누적 총 수익' : 'YTD NET'}</span>
                {currentMonthNet > 0 && <span className={kpiSubLabelCls}>{ko ? '전월대비' : 'MoM'}</span>}
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-extrabold text-slate-800 dark:text-slate-200 tracking-tight leading-none tabular-nums">{fmt(stats.ytdNet)}</span>
                {currentMonthNet > 0 && (
                  <span className="text-[11px] font-bold text-emerald-500 tabular-nums">
                    +{currentMonthNet.toLocaleString()}원
                  </span>
                )}
              </div>
            </div>

            <div className="border-t border-border/40"></div>

            {/* 3. 예상 총 매출 */}
            <div>
              <div className="flex items-center justify-between mb-0.5">
                <span className="type-micro font-bold text-muted-foreground">{actualYear}{ko ? '년 예상' : ' FORECAST'}</span>
                <span className={kpiSubLabelCls}>{ko ? '예상 총 수익' : 'Est. Net'}</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-extrabold text-slate-800 dark:text-slate-200 tracking-tight leading-none tabular-nums">{fmt(stats.annualForecast.totalGross)}</span>
                <span className="text-[11px] font-medium text-muted-foreground tabular-nums">{stats.annualForecast.totalNet.toLocaleString()}원</span>
              </div>
            </div>
          </div>

          <div className="pt-2 mt-auto h-[90px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={stats.annualCumulativeData} margin={{ top: 10, right: 15, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey={ko ? 'nameKo' : 'name'} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))', opacity: 0.6 }} interval={0} />
                <YAxis tickFormatter={fmtShort} axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))', opacity: 0.6 }} width={35} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      const val = data.actual !== null ? data.actual : data.predicted;
                      const isPred = data.actual === null;
                      return (
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg p-2 rounded-lg">
                          <p className="text-[11px] font-semibold mb-1 text-foreground">{label}</p>
                          <div className="flex flex-col gap-0.5">
                            <p className="text-[12px] font-bold text-primary">
                              {ko ? (isPred ? '올해 (예상): ' : '올해: ') : (isPred ? 'Est: ' : 'YTD: ')}{(val ?? 0).toLocaleString()}{ko ? '원' : ''}
                            </p>
                            {data.lastYear !== null && (
                              <p className="text-[11px] font-medium text-muted-foreground">
                                {ko ? '작년: ' : 'Last Year: '}{data.lastYear.toLocaleString()}{ko ? '원' : ''}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area type="monotone" dataKey="actual" stroke="var(--primary)" strokeWidth={2} fillOpacity={1} fill="url(#colorActual)" />
                <Line type="monotone" dataKey="predicted" stroke="var(--primary)" strokeWidth={2} strokeDasharray="4 4" dot={false} activeDot={{ r: 4 }} />
                <Line type="monotone" dataKey="lastYear" stroke="hsl(var(--muted-foreground))" strokeWidth={2} strokeDasharray="3 3" opacity={0.6} dot={false} isAnimationActive={false} />
                {dotX && dotY != null && (
                  <ReferenceDot x={dotX} y={dotY} r={3.5} fill="#fff" stroke="var(--primary)" strokeWidth={2.5} isFront={true} />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Box 5: Monthly Trends */}
        <div className={`col-span-2 ${cardCls}`}>
          <div className="flex items-center justify-between mb-4">
            <span className={chartTitleCls}>{ko ? '월별 추이 (11개월)' : 'Monthly Trends (11 Months)'}</span>
            <div className="flex items-center gap-6">

              <div className="flex gap-4">
                <div className={legendItemCls}><span className="w-2 h-2 rounded-full bg-primary/30" />{ko ? '총매출' : 'Gross'}</div>
                <div className={legendItemCls}><span className="w-2 h-2 rounded-full bg-primary" />{ko ? '순이익' : 'Net'}</div>
                <div className={legendItemCls}><span className="w-2 h-2 rounded-full bg-success" />{ko ? '점유율' : 'OCC'}</div>
                <div className={legendItemCls}>
                  <span style={{ display: 'inline-block', width: 14, height: 0, borderBottom: '2px dashed var(--success)', verticalAlign: 'middle', marginRight: 2 }} />
                  {ko ? '예상 점유율' : 'Pred. OCC'}
                </div>
              </div>
            </div>
          </div>
          <div className="-ml-3 -mr-2">
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis xAxisId="0" dataKey={ko ? 'month' : 'monthEn'} axisLine={false} tickLine={false} tick={(props: any) => {
                  const { x, y, payload, index } = props;
                  const isSelected = chartData[index]?.isCurrent; // 대시보드 선택 월 강조
                  return (
                    <text x={x} y={y} dy={14} textAnchor="middle"
                      fill={isSelected ? 'var(--primary)' : tickColor}
                      fontSize={11} fontWeight={isSelected ? 800 : 600}>
                      {payload.value}
                    </text>
                  );
                }} />
                <XAxis xAxisId="1" dataKey={ko ? 'month' : 'monthEn'} hide />
                <XAxis xAxisId="2" dataKey={ko ? 'month' : 'monthEn'} hide />
                <YAxis yAxisId="revenue" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: tickColorAlt }} tickFormatter={v => fmtShort(v)} width={70} />
                <YAxis yAxisId="occ" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: tickColorAlt }} tickFormatter={v => `${v}%`} domain={[0, 100]} width={45} />
                <Tooltip content={<TrendTooltip sym={sym} isDark={isDark} ko={ko} />} />
                {/* 현재월 기준선 */}
                {currentMonthLabel && (
                  <ReferenceLine xAxisId="0" yAxisId="revenue" x={currentMonthLabel}
                    stroke="var(--primary)" strokeDasharray="3 3" strokeOpacity={0.35}
                    label={{ value: ko ? '예측▸' : 'Fcst▸', position: 'insideTopRight', fontSize: 9, fill: 'var(--primary)', fontWeight: 700, opacity: 0.6 }}
                  />
                )}
                {/* 예측 총매출 배경바 — SVG 먼저 렌더 = 뒤에 위치 (미래월만 값 있음) */}
                <Bar xAxisId="2" yAxisId="revenue" dataKey="predictedGrossBar"
                  name={ko ? '예상 총매출' : 'Pred. Gross'} radius={[4, 4, 0, 0]} maxBarSize={36} legendType="none">
                  {chartData.map((_, index) => (
                    <Cell key={`cell-pred-${index}`} fillOpacity={0.18} fill="var(--primary)" />
                  ))}
                </Bar>
                {/* OTB 총매출 바 */}
                <Bar xAxisId="0" yAxisId="revenue" dataKey="gross" name={ko ? '총매출' : 'Gross'} radius={[4, 4, 0, 0]} maxBarSize={36}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-gross-${index}`} fillOpacity={entry.isFuture ? 0.35 : index <= 5 ? 0.45 : 0.45} fill="var(--primary)" />
                  ))}
                </Bar>
                {/* OTB 순이익 바 */}
                <Bar xAxisId="1" yAxisId="revenue" dataKey="net" name={ko ? '순이익' : 'Net'} radius={[4, 4, 0, 0]} maxBarSize={36}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-net-${index}`} fillOpacity={entry.isFuture ? 0.5 : 1} fill="var(--primary)" />
                  ))}
                </Bar>
                {/* 실적 점유율 실선: 전 11개월 OTB 그대로 (작업 이전과 동일) */}
                <Line xAxisId="0" yAxisId="occ" type="monotone" dataKey="occupancy"
                  name={ko ? '점유율' : 'Occupancy'}
                  stroke="var(--success)" strokeWidth={2.5}
                  dot={{ r: 3, fill: 'var(--success)', strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: 'var(--success)', strokeWidth: 2, stroke: activeDotStroke }} />
                {/* 예측 점유율 점선: 당월 OTB에서 출발 → 미래 예측으로 부드럽게 연결 */}
                <Line xAxisId="0" yAxisId="occ" type="monotone" dataKey="predictedOccLine"
                  name={ko ? '예상 점유율' : 'Pred. OCC'}
                  stroke="var(--success)" strokeWidth={2} strokeDasharray="5 5" strokeOpacity={0.6}
                  connectNulls={false} dot={false}
                  activeDot={{ r: 4, fill: 'var(--success)', strokeWidth: 2, stroke: activeDotStroke }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Box 5: Channel Donut */}
        <div className={cardCls}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{ko ? '예약 채널 분포' : 'Booking Channels'}</span>
            <button
              className="type-micro font-bold py-1 px-2.5 rounded-chip cursor-pointer transition-colors whitespace-nowrap bg-primary/10 text-primary hover:bg-primary/20"
              onClick={() => setIsChannelDetailOpen(true)}
            >{ko ? '자세히 보기 >' : 'Details >'}</button>
          </div>
          <div className="flex items-start">
            <div className="flex-1 flex flex-col items-center">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1">{ko ? '이번 달' : 'This Month'}</span>
              <div className="relative w-full">
                <ResponsiveContainer width="100%" height={155}>
                  <PieChart><Pie data={stats.channelPieData} cx="50%" cy="50%" innerRadius={46} outerRadius={64} paddingAngle={3} dataKey="value" stroke="none" cornerRadius={4}>
                    {stats.channelPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie></PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 pointer-events-none">
                  <span className="text-[20px] font-extrabold text-foreground leading-none">{stats.occupancyRate}%</span>
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{ko ? '가동률' : 'OCC'}</span>
                </div>
              </div>
            </div>
            <div className="w-px bg-border/40 self-stretch mx-1 mt-5" />
            <div className="flex-1 flex flex-col items-center">
              <span className="text-[10px] font-bold text-primary/70 uppercase tracking-wide mb-1">{ko ? '전체 평균' : 'All-time'}</span>
              <div className="relative w-full">
                <ResponsiveContainer width="100%" height={155}>
                  <PieChart><Pie data={stats.allTimeChannelPieData} cx="50%" cy="50%" innerRadius={46} outerRadius={64} paddingAngle={3} dataKey="value" stroke="none" cornerRadius={4}>
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
                  <li key={name} className="flex items-center py-1.5 text-xs border-b border-border last:border-0">
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

        {/* Box 6: Nationality Donut */}
        <div className={cardCls}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{ko ? '국적 분포' : 'Nationality Mix'}</span>
            <button
              className="type-micro font-bold py-1 px-2.5 rounded-chip cursor-pointer transition-colors whitespace-nowrap bg-primary/10 text-primary hover:bg-primary/20"
              onClick={() => setIsNatDetailOpen(true)}
            >{ko ? '자세히 보기 >' : 'Details >'}</button>
          </div>
          <div className="flex items-start">
            <div className="flex-1 flex flex-col items-center">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1">{ko ? '이번 달' : 'This Month'}</span>
              <div className="relative w-full">
                <ResponsiveContainer width="100%" height={155}>
                  <PieChart><Pie data={stats.nationalityPieData} cx="50%" cy="50%" innerRadius={46} outerRadius={64} paddingAngle={3} dataKey="value" stroke="none" cornerRadius={4}>
                    {stats.nationalityPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie></PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 pointer-events-none">
                  <span className="text-[17px] font-extrabold text-foreground leading-none">{stats.totalNatBookings}</span>
                  <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">{ko ? '예약' : 'BOOKINGS'}</span>
                </div>
              </div>
            </div>
            <div className="w-px bg-border/40 self-stretch mx-1 mt-5" />
            <div className="flex-1 flex flex-col items-center">
              <span className="text-[10px] font-bold text-primary/70 uppercase tracking-wide mb-1">{ko ? '전체 평균' : 'All-time'}</span>
              <div className="relative w-full">
                <ResponsiveContainer width="100%" height={155}>
                  <PieChart><Pie data={stats.allTimeNationalityPieData} cx="50%" cy="50%" innerRadius={46} outerRadius={64} paddingAngle={3} dataKey="value" stroke="none" cornerRadius={4}>
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
                  <li key={name} className="flex items-center py-1.5 text-xs border-b border-border last:border-0">
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

        {/* Box 7: Lead Time */}
        <div className={`${cardCls} flex flex-col`}>
          <div className="flex items-center justify-between mb-2">
            <span className={chartTitleCls}>{ko ? '리드타임 분포' : 'Lead Time'}</span>
            <button
              className="type-micro font-bold py-1 px-2.5 rounded-chip cursor-pointer transition-colors whitespace-nowrap flex-shrink-0 bg-primary/10 text-primary hover:bg-primary/20"
              onClick={() => setIsLeadTimeModalOpen(true)}
            >
              {ko ? '자세히 보기 >' : 'Details >'}
            </button>
          </div>

          {/* 평균 리드타임 */}
          {report.currentMonthTotal > 0 ? (
            <div className="flex items-baseline gap-1.5 mb-3">
              <span className="text-[22px] font-extrabold text-foreground leading-none tabular-nums">{report.currentMonthAvgDays}</span>
              <span className="text-[11px] text-muted-foreground">{ko ? '일 전 평균 예약' : 'days avg lead time'}</span>
              <span className="text-[10px] text-muted-foreground/50 ml-auto">
                {ko ? `이번 달 ${report.currentMonthTotal}건` : `${report.currentMonthTotal} this month`}
              </span>
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground/50 mb-3">{ko ? '이번 달 예약 없음' : 'No bookings this month'}</p>
          )}

          {/* 구간별 가로 막대 */}
          <div className="flex flex-col gap-2 flex-1">
            {report.currentMonthBuckets.map((cm, i) => {
              const overall = report.buckets[i];
              return (
                <div key={cm.key}>
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-[11px] font-semibold text-foreground">{ko ? cm.label : cm.labelEn}</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[12px] font-bold text-foreground tabular-nums">{cm.pct}%</span>
                      <span className="text-[9px] text-muted-foreground/50 tabular-nums">{overall.pct}%</span>
                    </div>
                  </div>
                  {/* 전체 평균 바 (얇은) */}
                  <div className="relative h-1 w-full rounded-full bg-muted/40 mb-0.5">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, overall.pct)}%`, background: 'var(--muted-foreground)', opacity: 0.3 }}
                    />
                  </div>
                  {/* 이번 달 바 (굵은) */}
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

          {/* 범례 */}
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/50">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-1.5 rounded-full bg-primary" />
              <span className="text-[10px] font-semibold text-muted-foreground">{ko ? '이번 달' : 'This month'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-1 rounded-full bg-muted-foreground/30" />
              <span className="text-[10px] font-semibold text-muted-foreground">{ko ? '전체 평균' : 'Overall avg'}</span>
            </div>
          </div>
        </div>

        {/* Box 8: Booking Pace */}
        <div className="col-span-3">
          <PaceChart pace={pace} isDark={isDark} ko={ko} sym={sym} fmtShort={fmtShort} predictedOcc={stats.monthlyTrends.find(t => t.isCurrent)?.predictedOcc ?? null} />
        </div>

        {/* Box 9: Monthly Analytics Table */}
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

      {isLeadTimeModalOpen && <LeadTimeDetailModal isDark={isDark} onClose={() => setIsLeadTimeModalOpen(false)} />}
      {isChannelDetailOpen && <DistributionDetailModal mode="channel" isDark={isDark} onClose={() => setIsChannelDetailOpen(false)} />}
      {isNatDetailOpen && <DistributionDetailModal mode="nationality" isDark={isDark} onClose={() => setIsNatDetailOpen(false)} />}
    </div>
  );
};

export default DesktopDashboard;
