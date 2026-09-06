import { useState, useEffect } from 'react';
import {
  Bell, ChevronLeft, ChevronRight,
  ArrowUpRight, ArrowDownRight, Sun, Moon
} from 'lucide-react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
  CartesianGrid, ReferenceLine, AreaChart, Area, LineChart, ReferenceDot
} from 'recharts';

// Dummy data matching screenshot exactly
const monthlyData = [
  { month: '1월', gross: 4200000, net: 3700000, occ: 75 },
  { month: '2월', gross: 4300000, net: 4100000, occ: 90 },
  { month: '3월', gross: 5000000, net: 4400000, occ: 87 },
  { month: '4월', gross: 4800000, net: 4300000, occ: 95 },
  { month: '5월', gross: 6000000, net: 5600000, occ: 100 },
  { month: '6월', predictedGrossBar: 5649317, gross: 5200000, net: 5027291, occ: 90, predictedOccLine: 90 },
  { month: '7월', predictedGrossBar: 6200000, gross: 4600000, net: 4200000, occ: 75, predictedOccLine: 98 },
  { month: '8월', predictedGrossBar: 7000000, gross: 4200000, net: 3800000, occ: 60, predictedOccLine: 100 },
  { month: '9월', predictedGrossBar: 5800000, gross: 2700000, net: 2500000, occ: 48, predictedOccLine: 100 },
  { month: '10월', predictedGrossBar: 5800000, gross: 2600000, net: 2400000, occ: 42, predictedOccLine: 100 },
  { month: '11월', predictedGrossBar: 5200000, gross: 2100000, net: 1800000, occ: 25, predictedOccLine: 100 },
];

const annualCumData = [
  { name: '1월', actual: 4000000 },
  { name: '2월', actual: 8000000 },
  { name: '3월', actual: 13000000 },
  { name: '4월', actual: 18000000 },
  { name: '5월', actual: 24000000 },
  { name: '6월', actual: 30080405 },
  { name: '7월', predicted: 37000000 },
  { name: '8월', predicted: 45000000 },
  { name: '9월', predicted: 51000000 },
  { name: '10월', predicted: 56000000 },
  { name: '11월', predicted: 60000000 },
  { name: '12월', predicted: 66166075 },
];

// Helper to create perfect step charts based on keyframe days
const getStepVal = (d: number, steps: [number, number][], cutOff?: number) => {
  if (cutOff !== undefined && d < cutOff) return null;
  let val = steps[0][1];
  for (const [stepD, stepVal] of steps) {
    if (d <= stepD) val = stepVal;
  }
  return val;
};

const paceData = Array.from({ length: 181 }).map((_, i) => {
  const d = 180 - i;
  return {
    day: `D-${d}`,
    curr: getStepVal(d, [[180, 5], [160, 10], [135, 15], [125, 22], [115, 35], [95, 38], [80, 48], [45, 50], [30, 52], [25, 68], [15, 74.2]], 15),
    m7: getStepVal(d, [[180, 10], [155, 20], [135, 25], [120, 45], [85, 48], [65, 60], [45, 65]], 30),
    m6: getStepVal(d, [[180, 12], [150, 25], [125, 30], [115, 40], [110, 42], [80, 42], [60, 45], [25, 50], [20, 60], [15, 65]], 10),
    m5: getStepVal(d, [[180, 0], [125, 0], [120, 15], [95, 22], [70, 35], [45, 48], [15, 80], [5, 85], [0, 95]]),
    m4: getStepVal(d, [[180, 0], [110, 0], [100, 15], [70, 20], [40, 40], [20, 50], [5, 65]]),
    m3: getStepVal(d, [[180, 0], [140, 0], [135, 5], [100, 10], [80, 15], [60, 25], [30, 40], [10, 60]]),
    m2: getStepVal(d, [[180, 2], [120, 5], [75, 10], [50, 20], [30, 35], [15, 50], [5, 60], [0, 80]]),
    m1: getStepVal(d, [[180, 0], [40, 10], [30, 15], [25, 25], [15, 35], [10, 50], [0, 75]]),
    m11: getStepVal(d, [[180, 20], [165, 25]], 160),
  };
});

export const DashboardContentMockup = ({ active }: { active: boolean }) => {
  const wrapCls = 'h-full flex flex-col bg-background text-foreground';
  const cardCls = 'bg-card text-card-foreground border border-border rounded-2xl p-5 relative overflow-hidden transition-all duration-300 hover:-translate-y-0.5 shadow-sm';

  const badgeUpCls = 'bg-success/10 text-success';
  const badgeDownCls = 'bg-destructive/10 text-destructive';
  const kpiLabelCls = 'type-micro font-bold text-muted-foreground uppercase tracking-wider mb-1';
  const kpiValueCls = 'type-numeric text-slate-800 dark:text-slate-200 tracking-tight leading-none mb-6 text-[32px] font-extrabold';
  const kpiSubGridCls = 'grid grid-cols-2 gap-2 mt-auto pt-4 border-t border-border/50';
  const kpiSubItemCls = 'flex flex-col gap-1';
  const kpiSubLabelCls = 'type-micro text-muted-foreground text-[11px]';
  const kpiSubValCls = 'type-caption font-bold text-foreground/90 text-[13px]';

  const chartTitleCls = 'text-[15px] font-bold text-foreground';
  const legendItemCls = 'flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground';

  const headerTitleCls = 'text-base font-bold text-slate-800 dark:text-slate-200 tracking-tight m-0 ml-2';
  const monthNavBtnCls = 'w-6 h-6 rounded-full bg-muted/50 border border-border/50 flex items-center justify-center cursor-pointer text-muted-foreground hover:bg-muted hover:text-foreground transition-colors';
  const monthNavSpanCls = 'text-[11px] font-semibold text-muted-foreground tracking-wide';
  const headerBtnCls = 'w-7 h-7 rounded-full bg-muted/50 border border-border/50 flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors';

  const fmtShort = (v: number) => {
    if (Math.abs(v) >= 1000000) return `₩${(v / 1000000).toFixed(1)}M`;
    return `₩${v.toLocaleString()}`;
  };

  return (
    <div className="w-[1440px] h-[1600px] bg-background text-foreground flex flex-col pt-5 px-5 pointer-events-none select-none">
            
            {/* Header */}
            <header className="flex items-center justify-between h-8 mb-5 flex-shrink-0">
              <div className="flex items-center gap-3">
                <h1 className={headerTitleCls}>대시보드</h1>
                <div className="flex items-center gap-1.5 ml-1">
                  <div className={monthNavBtnCls}><ChevronLeft size={14} /></div>
                  <span className={monthNavSpanCls}>6월 2026</span>
                  <div className={monthNavBtnCls}><ChevronRight size={14} /></div>
                </div>
              </div>
              <div className="flex items-center gap-5">
                <div className="flex items-center gap-1 px-3 py-1 bg-muted/50 rounded-md border border-border">
                  <span className="text-[12px] font-bold">전체</span>
                  <ChevronRight size={12} className="rotate-90 ml-1 text-muted-foreground"/>
                </div>
                <div className="w-px h-4 bg-border/60" />
                <div className="flex items-center gap-4 text-[13px] font-semibold text-muted-foreground">
                  <span className="text-primary font-bold">대시보드</span>
                  <span>예약목록</span>
                  <span>설정</span>
                </div>
                <div className="w-px h-4 bg-border/60" />
                <div className="flex items-center gap-2">
                  <div className={headerBtnCls}><Moon size={14} /></div>
                  <div className={headerBtnCls}><Bell size={14} /></div>
                </div>
              </div>
            </header>

            <div className="flex-1 flex flex-col gap-4">
              
              {/* Row 1: 3 KPIs */}
              <div className="grid grid-cols-3 gap-4">
                {/* Net Income */}
                <div className={`${cardCls} flex flex-col justify-between`}>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className={kpiLabelCls}>순수익</div>
                      <span className={`type-micro font-bold py-0.5 px-2 rounded-full flex items-center gap-0.5 ${badgeDownCls}`}>
                        <ArrowDownRight size={12} />-10.3%
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2 mb-6">
                      <span className={kpiValueCls}>₩5,027,291</span>
                      <span className="type-micro text-muted-foreground whitespace-nowrap">
                        월말 예상 ₩5,194,858
                      </span>
                    </div>
                  </div>
                  <div className={kpiSubGridCls}>
                    <div className={kpiSubItemCls}>
                      <span className={kpiSubLabelCls}>총매출</span>
                      <strong className={kpiSubValCls}>₩5,649,317</strong>
                    </div>
                    <div className={kpiSubItemCls}>
                      <span className={kpiSubLabelCls}>전월 대비</span>
                      <strong className="type-caption font-bold text-destructive text-[13px]">
                        -₩574,459
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Occupancy */}
                <div className={`${cardCls} flex flex-col justify-between`}>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className={kpiLabelCls}>객실 가동률</div>
                      <span className={`type-micro font-bold py-0.5 px-2 rounded-full ${badgeUpCls}`}>
                        27/30 박
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2 mb-6">
                      <span className={kpiValueCls}>90%</span>
                      <span className="type-micro text-muted-foreground whitespace-nowrap">
                        월말 예상 93%
                      </span>
                    </div>
                  </div>
                  <div className={kpiSubGridCls}>
                    <div className={kpiSubItemCls}>
                      <span className={kpiSubLabelCls}>예약 건수</span>
                      <strong className={kpiSubValCls}>
                        22건 <span className="ml-1 text-[10px] font-semibold text-emerald-500">(+5)</span>
                      </strong>
                    </div>
                    <div className={kpiSubItemCls}>
                      <span className={kpiSubLabelCls}>예약 박수</span>
                      <strong className={kpiSubValCls}>
                        27박 <span className="ml-1 text-[10px] font-semibold text-rose-500">(-4박)</span>
                      </strong>
                    </div>
                  </div>
                </div>

                {/* ADR */}
                <div className={`${cardCls} flex flex-col justify-between`}>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className={kpiLabelCls}>평균 객단가 (ADR)</div>
                      <span className={`type-micro font-bold py-0.5 px-2 rounded-full ${badgeDownCls}`}>
                        OTA ₩622,026
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2 mb-6">
                      <span className={kpiValueCls}>₩209,234</span>
                    </div>
                  </div>
                  <div className={kpiSubGridCls}>
                    <div className={kpiSubItemCls}>
                      <span className={kpiSubLabelCls}>연간 평균 ADR</span>
                      <strong className={kpiSubValCls}>₩194,742</strong>
                    </div>
                    <div className={kpiSubItemCls}>
                      <span className={kpiSubLabelCls}>OTA 수수료 변동</span>
                      <strong className="type-caption font-bold text-destructive text-[13px]">
                        +48%
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 2: Annual & Monthly Trends */}
              <div className="grid grid-cols-3 gap-4">
                {/* Annual Key Metrics */}
                <div className={`${cardCls} flex flex-col justify-between`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={chartTitleCls}>연간 주요지표</span>
                    <span className="type-micro font-medium text-muted-foreground">2026년 6월 18일</span>
                  </div>
                  
                  <div className="flex-1 flex flex-col justify-center gap-2.5">
                    <div>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="type-micro font-bold text-muted-foreground text-[11px]">누적 총 매출</span>
                        <span className={kpiSubLabelCls}>전일대비</span>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <span className="text-xl font-extrabold text-slate-800 tracking-tight leading-none tabular-nums">₩30,080,405</span>
                        <span className="text-[11px] font-bold text-emerald-500 tabular-nums">+5,649,317원</span>
                      </div>
                    </div>
                    <div className="border-t border-border/40"></div>
                    <div>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="type-micro font-bold text-muted-foreground text-[11px]">누적 총 수익</span>
                        <span className={kpiSubLabelCls}>전일대비</span>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <span className="text-xl font-extrabold text-slate-800 tracking-tight leading-none tabular-nums">₩27,340,197</span>
                        <span className="text-[11px] font-bold text-emerald-500 tabular-nums">+5,027,291원</span>
                      </div>
                    </div>
                    <div className="border-t border-border/40"></div>
                    <div>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="type-micro font-bold text-muted-foreground text-[11px]">2026년 예상</span>
                        <span className={kpiSubLabelCls}>예상 총 수익</span>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <span className="text-xl font-extrabold text-slate-800 tracking-tight leading-none tabular-nums">₩66,166,075</span>
                        <span className="text-[11px] font-medium text-muted-foreground tabular-nums">58,206,439원</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 mt-auto h-[90px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={active ? annualCumData : annualCumData.map(d=>({...d,actual:0,predicted:0}))} margin={{ top: 10, right: 15, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))', opacity: 0.6 }} interval={0} />
                        <YAxis tickFormatter={fmtShort} axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))', opacity: 0.6 }} width={35} />
                        <Area type="monotone" dataKey="actual" stroke="var(--primary)" strokeWidth={2} fillOpacity={1} fill="url(#colorActual)" />
                        <Line type="monotone" dataKey="predicted" stroke="var(--primary)" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                        {active && <ReferenceDot x="6월" y={30080405} r={3.5} fill="#fff" stroke="var(--primary)" strokeWidth={2.5} />}
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Monthly Trends */}
                <div className="col-span-2 flex flex-col bg-card text-card-foreground border border-border rounded-2xl p-5 relative overflow-hidden transition-all duration-300 shadow-sm">
                  <div className="flex items-end justify-between mb-8">
                    <span className={chartTitleCls}>월별 추이 (11개월)</span>
                    <div className="flex items-center gap-6">
                      <div className="flex gap-4">
                        <div className={legendItemCls}><span className="w-2 h-2 rounded-full bg-primary/30" />총매출</div>
                        <div className={legendItemCls}><span className="w-2 h-2 rounded-full bg-primary" />순이익</div>
                        <div className={legendItemCls}><span className="w-2 h-2 rounded-full bg-success" />점유율</div>
                        <div className={legendItemCls}>
                          <span style={{ display: 'inline-block', width: 14, height: 0, borderBottom: '2px dashed var(--success)', verticalAlign: 'middle', marginRight: 2 }} />
                          예상 점유율
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="-ml-3 -mr-2 h-[260px] relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={active ? monthlyData : monthlyData.map(d=>({...d,gross:0,net:0,occ:0}))} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                        <XAxis xAxisId="0" dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))', fontWeight: 600 }} dy={10} />
                        <XAxis xAxisId="1" dataKey="month" hide />
                        <XAxis xAxisId="2" dataKey="month" hide />
                        <YAxis yAxisId="revenue" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => fmtShort(v)} width={70} />
                        <YAxis yAxisId="occ" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => `${v}%`} domain={[0, 100]} width={45} />
                        
                        <ReferenceLine xAxisId="0" yAxisId="revenue" x="6월" stroke="var(--primary)" strokeDasharray="3 3" strokeOpacity={0.35} label={{ value: '예측▸', position: 'insideTopRight', fontSize: 9, fill: 'var(--primary)', fontWeight: 700, opacity: 0.6 }} />
                        
                        {/* Overlapping bars using xAxisId */}
                        <Bar xAxisId="2" yAxisId="revenue" dataKey="predictedGrossBar" fill="var(--primary)" fillOpacity={0.18} radius={[4, 4, 0, 0]} maxBarSize={36} />
                        <Bar xAxisId="0" yAxisId="revenue" dataKey="gross" fill="var(--primary)" fillOpacity={0.45} radius={[4, 4, 0, 0]} maxBarSize={36} />
                        <Bar xAxisId="1" yAxisId="revenue" dataKey="net" fill="var(--primary)" fillOpacity={1} radius={[4, 4, 0, 0]} maxBarSize={36} />
                        
                        <Line xAxisId="0" yAxisId="occ" type="monotone" dataKey="occ" stroke="var(--success)" strokeWidth={2.5} dot={{ r: 3, fill: 'var(--success)', strokeWidth: 0 }} />
                        <Line xAxisId="0" yAxisId="occ" type="monotone" dataKey="predictedOccLine" stroke="var(--success)" strokeWidth={2} strokeDasharray="5 5" strokeOpacity={0.6} dot={false} />
                      </ComposedChart>
                    </ResponsiveContainer>
                    {active && (
                      <div className="absolute left-[64%] top-[10%] bg-white border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-xl p-3 flex flex-col gap-2 pointer-events-none z-10 min-w-[180px]">
                        <span className="font-bold text-foreground text-[13px] mb-1">7월 2026</span>
                        
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[var(--success)]" />점유율</span>
                          <span className="font-bold text-foreground">74%</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[var(--primary)]" />총매출</span>
                          <span className="font-bold text-foreground">₩4,678,190</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-700" />순이익</span>
                          <span className="font-bold text-foreground">₩4,240,208</span>
                        </div>
                        
                        <div className="border-t border-dashed border-border/60 my-0.5" />
                        
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground flex flex-col"><span className="font-semibold text-foreground/80">ADR</span><span className="text-[9px]">대신율</span></span>
                          <div className="flex flex-col items-end">
                            <span className="font-bold text-foreground">₩203,443</span>
                            <span className="font-bold text-[var(--success)]">81%</span>
                          </div>
                        </div>

                        <div className="border-t border-border/60 my-0.5" />

                        <span className="font-bold text-foreground text-[11px]">월말 예측</span>
                        
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground flex items-center gap-1.5"><span className="w-5 h-0.5 bg-[var(--success)]" />예상 점유율</span>
                          <span className="font-bold text-foreground">100%</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[var(--primary)] opacity-40" />예상 매출</span>
                          <span className="font-bold text-foreground">₩6,306,733</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Row 3: Donuts and Lead Time */}
              <div className="grid grid-cols-3 gap-4">
                {/* Channel Donut */}
                <div className={cardCls}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-slate-900">예약 채널 분포</span>
                    <div className="type-micro font-bold py-1 px-2.5 rounded-full bg-primary/10 text-primary">자세히 보기 &gt;</div>
                  </div>
                  <div className="flex items-start">
                    <div className="flex-1 flex flex-col items-center">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1">이번 달</span>
                      <div className="relative w-full h-[155px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart><Pie data={[{v:45, fill:'#ef4444'}, {v:36, fill:'#10b981'}, {v:14, fill:'#3b82f6'}, {v:5, fill:'#a855f7'}]} cx="50%" cy="50%" innerRadius={46} outerRadius={64} dataKey="v" stroke="none" paddingAngle={3} cornerRadius={4} /></PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-0.5">
                          <span className="text-[20px] font-extrabold text-foreground leading-none">90%</span>
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">가동률</span>
                        </div>
                      </div>
                    </div>
                    <div className="w-px bg-border/40 self-stretch mx-1 mt-5" />
                    <div className="flex-1 flex flex-col items-center">
                      <span className="text-[10px] font-bold text-primary/70 uppercase tracking-wide mb-1">전체 평균</span>
                      <div className="relative w-full h-[155px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart><Pie data={[{v:32, fill:'#ef4444'}, {v:41, fill:'#10b981'}, {v:20, fill:'#3b82f6'}, {v:7, fill:'#a855f7'}]} cx="50%" cy="50%" innerRadius={46} outerRadius={64} dataKey="v" stroke="none" paddingAngle={3} cornerRadius={4} /></PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-0.5">
                          <span className="text-[17px] font-extrabold text-foreground leading-none">253</span>
                          <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">전체</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <ul className="m-0 p-0 list-none mt-1">
                    <li className="flex items-center pb-1">
                      <span className="w-2 h-2 mr-2 flex-shrink-0" />
                      <span className="flex-1" />
                      <span className="text-[10px] font-bold text-muted-foreground w-9 text-right">이달</span>
                      <span className="text-[10px] font-bold text-primary/60 w-9 text-right">전체</span>
                    </li>
                    {[
                      { name: 'Airbnb', c: '#ef4444', curr: '45%', all: '32%' },
                      { name: 'Naver', c: '#10b981', curr: '36%', all: '41%' },
                      { name: 'Booking.com', c: '#3b82f6', curr: '14%', all: '20%' },
                      { name: 'Direct', c: '#a855f7', curr: '5%', all: '7%' },
                    ].map(item => (
                      <li key={item.name} className="flex items-center py-1.5 text-xs border-b border-border last:border-0">
                        <span className="w-2 h-2 rounded-full mr-2 flex-shrink-0" style={{ background: item.c }} />
                        <span className="flex-1 text-muted-foreground truncate">{item.name}</span>
                        <span className="font-bold text-foreground/90 w-9 text-right">{item.curr}</span>
                        <span className="font-medium text-muted-foreground w-9 text-right">{item.all}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Nationality Donut */}
                <div className={cardCls}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-slate-900">국적 분포</span>
                    <div className="type-micro font-bold py-1 px-2.5 rounded-full bg-primary/10 text-primary">자세히 보기 &gt;</div>
                  </div>
                  <div className="flex items-start">
                    <div className="flex-1 flex flex-col items-center">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1">이번 달</span>
                      <div className="relative w-full h-[155px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart><Pie data={[{v:50, fill:'#10b981'}, {v:36, fill:'#f59e0b'}, {v:9, fill:'#94a3b8'}, {v:5, fill:'#f97316'}]} cx="50%" cy="50%" innerRadius={46} outerRadius={64} dataKey="v" stroke="none" paddingAngle={3} cornerRadius={4} /></PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-0.5">
                          <span className="text-[20px] font-extrabold text-foreground leading-none">22</span>
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">예약</span>
                        </div>
                      </div>
                    </div>
                    <div className="w-px bg-border/40 self-stretch mx-1 mt-5" />
                    <div className="flex-1 flex flex-col items-center">
                      <span className="text-[10px] font-bold text-primary/70 uppercase tracking-wide mb-1">전체 평균</span>
                      <div className="relative w-full h-[155px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart><Pie data={[{v:62, fill:'#10b981'}, {v:20, fill:'#f59e0b'}, {v:6, fill:'#94a3b8'}, {v:6, fill:'#f97316'}]} cx="50%" cy="50%" innerRadius={46} outerRadius={64} dataKey="v" stroke="none" paddingAngle={3} cornerRadius={4} /></PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-0.5">
                          <span className="text-[17px] font-extrabold text-foreground leading-none">253</span>
                          <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">전체</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <ul className="m-0 p-0 list-none mt-1">
                    <li className="flex items-center pb-1">
                      <span className="w-2 h-2 mr-2 flex-shrink-0" />
                      <span className="flex-1" />
                      <span className="text-[10px] font-bold text-muted-foreground w-9 text-right">이달</span>
                      <span className="text-[10px] font-bold text-primary/60 w-9 text-right">전체</span>
                    </li>
                    {[
                      { name: 'Korea', c: '#10b981', curr: '50%', all: '62%' },
                      { name: 'Taiwan', c: '#f59e0b', curr: '36%', all: '20%' },
                      { name: 'Others', c: '#94a3b8', curr: '9%', all: '6%' },
                      { name: 'Western', c: '#f97316', curr: '5%', all: '6%' },
                    ].map(item => (
                      <li key={item.name} className="flex items-center py-1.5 text-xs border-b border-border last:border-0">
                        <span className="w-2 h-2 rounded-full mr-2 flex-shrink-0" style={{ background: item.c }} />
                        <span className="flex-1 text-muted-foreground truncate">{item.name}</span>
                        <span className="font-bold text-foreground/90 w-9 text-right">{item.curr}</span>
                        <span className="font-medium text-muted-foreground w-9 text-right">{item.all}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Lead Time */}
                <div className={`${cardCls} flex flex-col`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={chartTitleCls}>리드타임 분포</span>
                    <div className="type-micro font-bold py-1 px-2.5 rounded-full bg-primary/10 text-primary">자세히 보기 &gt;</div>
                  </div>
                  <div className="flex items-baseline gap-1.5 mb-3">
                    <span className="text-[22px] font-extrabold text-foreground leading-none tabular-nums">61</span>
                    <span className="text-[11px] text-muted-foreground">일 전 평균 예약</span>
                    <span className="text-[10px] text-muted-foreground/50 ml-auto">이번 달 22건</span>
                  </div>
                  <div className="flex flex-col gap-2 flex-1">
                    {[
                      { label: '초단기 (0~7일)', curr: 5, all: 10, c: '#2563eb' },
                      { label: '단기 (8~21일)', curr: 10, all: 14, c: '#2563eb' },
                      { label: '중단기 (22~60일)', curr: 43, all: 27, c: '#2563eb' },
                      { label: '얼리버드 (61일+)', curr: 24, all: 22, c: '#2563eb' }
                    ].map((item, i) => (
                      <div key={i}>
                        <div className="flex items-baseline justify-between mb-1">
                          <span className="text-[11px] font-semibold text-foreground">{item.label}</span>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-[12px] font-bold text-foreground tabular-nums">{item.curr}%</span>
                            <span className="text-[9px] text-muted-foreground/50 tabular-nums">{item.all}%</span>
                          </div>
                        </div>
                        <div className="relative h-1 w-full rounded-full bg-muted/40 mb-0.5">
                          <div className="h-full rounded-full" style={{ width: `${item.all}%`, background: 'var(--muted-foreground)', opacity: 0.3 }} />
                        </div>
                        <div className="relative h-2 w-full rounded-full bg-muted/30">
                          <div className="h-full rounded-full" style={{ width: `${item.curr}%`, background: item.c }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/50">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-1.5 rounded-full bg-primary" />
                      <span className="text-[10px] font-semibold text-muted-foreground">이번 달</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-1 rounded-full bg-muted-foreground/30" />
                      <span className="text-[10px] font-semibold text-muted-foreground">전체 평균</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 4: Pace Chart */}
              <div className={`${cardCls} flex flex-col`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className={chartTitleCls}>예약 속도 추이</span>
                    <div className="flex bg-muted rounded-lg overflow-hidden border border-border">
                      <button className="py-1 px-2.5 text-[11px] font-semibold text-primary bg-primary/15 border-0 cursor-pointer tracking-wide whitespace-nowrap transition-all">점유율</button>
                      <button className="py-1 px-2.5 text-[11px] font-semibold text-muted-foreground bg-transparent border-0 cursor-pointer tracking-wide whitespace-nowrap transition-all">매출</button>
                    </div>
                    <div className="type-micro font-bold py-1 px-2.5 rounded-full bg-primary/10 text-primary ml-2">자세히 보기 &gt;</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className={legendItemCls}><span className="w-2 h-2 rounded-full bg-[#f43f5e]" />26년 2월</div>
                    <div className={legendItemCls}><span className="w-2 h-2 rounded-full bg-[#f97316]" />26년 3월</div>
                    <div className={legendItemCls}><span className="w-2 h-2 rounded-full bg-[#eab308]" />26년 4월</div>
                    <div className={legendItemCls}><span className="w-2 h-2 rounded-full bg-[#84cc16]" />26년 5월</div>
                    <div className={legendItemCls}><span className="w-2 h-2 rounded-full bg-[#10b981]" />26년 6월</div>
                    <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-foreground"><span className="w-2 h-2 rounded-full bg-[#2563eb]" />26년 7월</div>
                    <div className={legendItemCls}><span className="w-2 h-2 rounded-full bg-[#06b6d4]" />26년 8월</div>
                    <div className={legendItemCls}><span className="w-2 h-2 rounded-full bg-[#60a5fa]" />26년 9월</div>
                  </div>
                </div>
                <div className="h-[300px] w-full -ml-4 -mr-2 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={active ? paceData : paceData.map(d=>({...d,m1:0,m2:0,m3:0,m4:0,m5:0,m6:0,m7:0,m11:0,curr:0}))} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={true} />
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} dy={10} interval={14} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => `${v}%`} domain={[0,100]} />
                      
                      {/* Past Months (Thin, transparent) */}
                      <Line type="stepAfter" dataKey="m1" stroke="#f43f5e" strokeWidth={1.5} dot={false} strokeOpacity={0.4} strokeLinejoin="round" />
                      <Line type="stepAfter" dataKey="m2" stroke="#f97316" strokeWidth={1.5} dot={false} strokeOpacity={0.4} strokeLinejoin="round" />
                      <Line type="stepAfter" dataKey="m3" stroke="#eab308" strokeWidth={1.5} dot={false} strokeOpacity={0.4} strokeLinejoin="round" />
                      <Line type="stepAfter" dataKey="m4" stroke="#84cc16" strokeWidth={1.5} dot={false} strokeOpacity={0.4} strokeLinejoin="round" />
                      <Line type="stepAfter" dataKey="m5" stroke="#10b981" strokeWidth={1.5} dot={false} strokeOpacity={0.4} strokeLinejoin="round" />
                      <Line type="stepAfter" dataKey="m6" stroke="#06b6d4" strokeWidth={1.5} dot={false} strokeOpacity={0.4} strokeLinejoin="round" />
                      <Line type="stepAfter" dataKey="m7" stroke="#60a5fa" strokeWidth={1.5} dot={false} strokeOpacity={0.4} strokeLinejoin="round" />
                      <Line type="stepAfter" dataKey="m11" stroke="#d946ef" strokeWidth={1.5} dot={false} strokeOpacity={0.4} strokeLinejoin="round" />
                      
                      {/* Current Month (Thick Blue) */}
                      <Line type="stepAfter" dataKey="curr" stroke="#2563eb" strokeWidth={3.5} dot={false} strokeLinejoin="round" strokeLinecap="round" />
                      {active && <ReferenceDot x="D-15" y={74.2} r={4.5} fill="#2563eb" stroke="#ffffff" strokeWidth={1.5} />}
                    </LineChart>
                  </ResponsiveContainer>
                  {active && (
                    <>
                      <div className="absolute right-[48px] top-[28px] bg-[#2563eb] text-white px-3 py-1.5 rounded-lg shadow-md text-[11px] font-bold text-center z-10">
                        6월 18일 오늘<br/>점유율 74.2%
                      </div>
                      <div className="absolute right-[21%] top-[25%] bg-white border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-xl p-3 flex flex-col gap-1.5 pointer-events-none z-10 min-w-[140px]">
                        <span className="font-bold text-foreground text-[12px] mb-1">D-33 누적 페이스</span>
                        <div className="flex items-center justify-between text-[11px]"><span className="flex items-center gap-1.5 text-muted-foreground"><span className="w-2 h-2 rounded-full bg-[#2563eb]" />26년 6월</span><span className="font-bold">60%</span></div>
                        <div className="flex items-center justify-between text-[11px]"><span className="flex items-center gap-1.5 text-muted-foreground"><span className="w-2 h-2 rounded-full bg-[#10b981]" />26년 5월</span><span className="font-bold">51.6%</span></div>
                        <div className="flex items-center justify-between text-[11px]"><span className="flex items-center gap-1.5 text-foreground font-semibold"><span className="w-2 h-2 rounded-full bg-[#06b6d4]" />26년 7월</span><span className="font-bold text-foreground">51.6%</span></div>
                        <div className="flex items-center justify-between text-[11px]"><span className="flex items-center gap-1.5 text-muted-foreground"><span className="w-2 h-2 rounded-full bg-[#84cc16]" />26년 4월</span><span className="font-bold">50%</span></div>
                        <div className="flex items-center justify-between text-[11px]"><span className="flex items-center gap-1.5 text-muted-foreground"><span className="w-2 h-2 rounded-full bg-[#eab308]" />26년 3월</span><span className="font-bold">38.7%</span></div>
                        <div className="flex items-center justify-between text-[11px]"><span className="flex items-center gap-1.5 text-muted-foreground"><span className="w-2 h-2 rounded-full bg-[#f97316]" />26년 2월</span><span className="font-bold">32.1%</span></div>
                        <div className="flex items-center justify-between text-[11px]"><span className="flex items-center gap-1.5 text-muted-foreground"><span className="w-2 h-2 rounded-full bg-[#f43f5e]" />26년 1월</span><span className="font-bold">16.1%</span></div>
                      </div>
                    </>
                  )}
                </div>
              </div>

            </div>
          </div>
  );
};

export const InteractiveDashboardDemo = () => {
  const [active, setActive] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setActive(true), 300);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="w-full h-full relative overflow-hidden bg-background rounded-[26px]">
      <svg viewBox="0 0 1440 1600" className="w-full h-full block" preserveAspectRatio="xMidYMid meet">
        <foreignObject width="1440" height="1600">
          <DashboardContentMockup active={active} />
        </foreignObject>
      </svg>
    </div>
  );
};

export const SubcardMonthlyDemo = () => {
  return (
    <div className="w-full h-full relative bg-card overflow-hidden">
      <svg viewBox="680 180 640 480" className="w-full h-full block" preserveAspectRatio="xMidYMid slice">
        <foreignObject width="1440" height="1600">
          <DashboardContentMockup active={true} />
        </foreignObject>
      </svg>
    </div>
  );
};

export const SubcardPaceDemo = () => {
  return (
    <div className="w-full h-full relative bg-card overflow-hidden">
      <svg viewBox="880 1080 440 330" className="w-full h-full block" preserveAspectRatio="xMidYMid slice">
        <foreignObject width="1440" height="1600">
          <DashboardContentMockup active={true} />
        </foreignObject>
      </svg>
    </div>
  );
};

export const SubcardDonutDemo = () => {
  return (
    <div className="w-full h-full relative bg-card overflow-hidden">
      <svg viewBox="10 610 455 341.25" className="w-full h-full block" preserveAspectRatio="xMidYMid slice">
        <foreignObject width="1440" height="1600">
          <DashboardContentMockup active={true} />
        </foreignObject>
      </svg>
    </div>
  );
};
