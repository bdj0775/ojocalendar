import React, { useState, useEffect, useMemo } from 'react';
import { CONTENT } from '../config/content';
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, ReferenceLine, ReferenceDot, Label, CartesianGrid } from 'recharts';

const paceData = [
  { leadDay: 180, curr: 0, m1: 0, m2: 2, m3: 0, m4: 10, currentDailyNights: 0 },
  { leadDay: 150, curr: 5, m1: 5, m2: 5, m3: 8, m4: 12, currentDailyNights: 8 },
  { leadDay: 135, curr: 8, m1: 10, m2: 8, m3: 15, m4: 15, currentDailyNights: 5 },
  { leadDay: 120, curr: 8, m1: 10, m2: 12, m3: 18, m4: 25, currentDailyNights: 0 },
  { leadDay: 100, curr: 16, m1: 18, m2: 16, m3: 20, m4: 25, currentDailyNights: 18 },
  { leadDay: 80, curr: 25, m1: 22, m2: 20, m3: 25, m4: 30, currentDailyNights: 15 },
  { leadDay: 70, curr: 42, m1: 30, m2: 28, m3: 32, m4: 38, currentDailyNights: 40 },
  { leadDay: 60, curr: 42, m1: 35, m2: 30, m3: 40, m4: 45, currentDailyNights: 0 },
  { leadDay: 50, curr: 48, m1: 45, m2: 35, m3: 42, m4: 50, currentDailyNights: 15 },
  { leadDay: 46, curr: 48.4, m1: 48.4, m2: 46.7, m3: 45, m4: 55, currentDailyNights: 5 },
  { leadDay: 40, curr: 52, m1: 52, m2: 48, m3: 50, m4: 58, currentDailyNights: 12 },
  { leadDay: 30, curr: 65, m1: 60, m2: 55, m3: 65, m4: 68, currentDailyNights: 28 },
  { leadDay: 20, curr: 70, m1: 68, m2: 60, m3: 72, m4: 75, currentDailyNights: 10 },
  { leadDay: 10, curr: 74.2, m1: 75, m2: 70, m3: 85, m4: 80, currentDailyNights: 8 }, 
  { leadDay: 5, curr: null, m1: 80, m2: 75, m3: 90, m4: 85, currentDailyNights: null }, 
  { leadDay: 0, curr: null, m1: 95, m2: 85, m3: 98, m4: 90, currentDailyNights: null },
];

const chartData = [
  { month: '1월', gross: 15, net: 10, occupancy: 20, predictedOccLine: null, predictedGrossBar: null },
  { month: '2월', gross: 25, net: 17, occupancy: 35, predictedOccLine: null, predictedGrossBar: null },
  { month: '3월', gross: 30, net: 21, occupancy: 45, predictedOccLine: null, predictedGrossBar: null },
  { month: '4월', gross: 45, net: 31, occupancy: 65, predictedOccLine: null, predictedGrossBar: null },
  { month: '5월', gross: 60, net: 42, occupancy: 85, predictedOccLine: null, predictedGrossBar: null },
  { month: '6월', gross: 50, net: 35, occupancy: 75, predictedOccLine: 75, predictedGrossBar: null, isCurrent: true },
  { month: '7월', gross: 45, net: 31, occupancy: null, predictedOccLine: 65, predictedGrossBar: 45 },
  { month: '8월', gross: 30, net: 21, occupancy: null, predictedOccLine: 45, predictedGrossBar: 30 },
  { month: '9월', gross: 20, net: 14, occupancy: null, predictedOccLine: 30, predictedGrossBar: 20 },
  { month: '10월', gross: 15, net: 10, occupancy: null, predictedOccLine: 25, predictedGrossBar: 15 },
  { month: '11월', gross: 10, net: 7, occupancy: null, predictedOccLine: 15, predictedGrossBar: 10 },
];

const channelPieData = [
  { name: 'Airbnb', value: 45, color: '#ef4444' },
  { name: 'Naver', value: 36, color: '#10b981' },
  { name: 'Booking.com', value: 14, color: '#3b82f6' },
  { name: 'Direct', value: 5, color: '#a855f7' },
];

const allTimeChannelPieData = [
  { name: 'Airbnb', value: 32, color: '#ef4444' },
  { name: 'Naver', value: 41, color: '#10b981' },
  { name: 'Booking.com', value: 20, color: '#3b82f6' },
  { name: 'Direct', value: 7, color: '#64748b' },
];

const nationalityPieData = [
  { name: 'Korea', value: 50, color: '#10b981' },
  { name: 'Taiwan', value: 36, color: '#f59e0b' },
  { name: 'Others', value: 9, color: '#64748b' },
];

const allTimeNationalityPieData = [
  { name: 'Korea', value: 62, color: '#10b981' },
  { name: 'Taiwan', value: 20, color: '#f59e0b' },
  { name: 'Others', value: 6, color: '#64748b' },
];

const DelayedMount = ({ delay, children }: { delay: number, children: React.ReactNode }) => {
  const [show, setShow] = useState(false);
  useEffect(() => {
    setShow(false);
    const t = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return show ? <>{children}</> : null;
};

const CountUp = ({ to, duration = 1500, delay = 0, prefix = '', suffix = '' }: any) => {
  const [count, setCount] = useState(Math.floor(to * 0.95));
  const [isFinished, setIsFinished] = useState(false);
  
  useEffect(() => {
    let startTime: number;
    let animationFrame: number;
    const startValue = Math.floor(to * 0.95);
    setIsFinished(false);
    
    const startTimer = setTimeout(() => {
      const step = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        const easeOut = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        setCount(Math.floor(startValue + easeOut * (to - startValue)));
        
        if (progress < 1) {
          animationFrame = requestAnimationFrame(step);
        } else {
          setIsFinished(true);
        }
      };
      animationFrame = requestAnimationFrame(step);
    }, delay);
    
    return () => { clearTimeout(startTimer); cancelAnimationFrame(animationFrame); };
  }, [to, duration, delay]);
  
  return (
    <span className="inline-block" style={isFinished ? { animation: 'popHighlight 0.5s ease-out forwards' } : {}}>
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  );
};

interface BookingData {
  guestName: string;
  channel: string;
  channelVar: string;
  col: number;
  span: number;
  row: number;
  slot: number;
  info: string;
  delay: string;
}

const calendarCells = Array.from({ length: 42 }, (_, i) => {
  let day = i - 3;
  let isCurrentMonth = true;
  if (day <= 0) { day = 31 + day; isCurrentMonth = false; }
  else if (day > 30) { day = day - 30; isCurrentMonth = false; }
  return { day, isCurrentMonth };
});

const mockBookings: BookingData[] = [
  { guestName: '김*우', channel: 'Airbnb', channelVar: '--channel-airbnb', col: 1, span: 3, row: 0, slot: 0, info: '2인 3박', delay: '0.5s' },
  { guestName: '이*은', channel: 'Naver', channelVar: '--channel-naver', col: 4, span: 2, row: 0, slot: 0, info: '2인 2박', delay: '0.8s' },
  { guestName: 'PETER', channel: 'Booking.com', channelVar: '--channel-booking', col: 1, span: 2, row: 1, slot: 0, info: '1인 3박', delay: '1.4s' },
  { guestName: '한*민', channel: 'Naver', channelVar: '--channel-naver', col: 1, span: 2, row: 1, slot: 1, info: '2인 3박', delay: '1.7s' },
  { guestName: '송*진', channel: 'Direct', channelVar: '--channel-direct', col: 1, span: 2, row: 1, slot: 2, info: '4인 3박', delay: '2.0s' },
  { guestName: '박*현', channel: 'Direct', channelVar: '--channel-direct', col: 5, span: 2, row: 2, slot: 0, info: '4인 3박', delay: '2.7s' },
  { guestName: '최*서', channel: 'Airbnb', channelVar: '--channel-airbnb', col: 2, span: 3, row: 3, slot: 0, info: '2인 3박', delay: '3.2s' },
  { guestName: 'SMITH', channel: 'Booking.com', channelVar: '--channel-booking', col: 2, span: 3, row: 3, slot: 1, info: '1인 3박', delay: '3.5s' },
  { guestName: 'DAVID', channel: 'Direct', channelVar: '--channel-direct', col: 5, span: 2, row: 3, slot: 0, info: '2인 2박', delay: '3.9s' },
  { guestName: '정*우', channel: 'Naver', channelVar: '--channel-naver', col: 4, span: 3, row: 4, slot: 0, info: '3인 3박', delay: '4.5s' },
  { guestName: '강*원', channel: 'Airbnb', channelVar: '--channel-airbnb', col: 1, span: 4, row: 5, slot: 0, info: '2인 4박', delay: '5.1s' }
];

const MemoTrendChart = React.memo(({ activeStep }: { activeStep: number }) => (
  <div key={`trend-${activeStep}`} className="h-[120px] w-full mt-1 border-b border-slate-200 pb-1 relative">
    {activeStep === 1 && (
      <DelayedMount delay={3200}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
            <XAxis xAxisId="0" dataKey="month" hide />
            <XAxis xAxisId="1" dataKey="month" hide />
            <XAxis xAxisId="2" dataKey="month" hide />
            <YAxis yAxisId="revenue" hide domain={['auto', 'auto']} />
            <YAxis yAxisId="occ" hide domain={[0, 100]} />
            <ReferenceLine xAxisId="0" yAxisId="revenue" x="6월" stroke="#3b82f6" strokeDasharray="3 3" strokeOpacity={0.3} />
            <Bar xAxisId="2" yAxisId="revenue" dataKey="predictedGrossBar" fill="#3b82f6" fillOpacity={0.13} radius={[3,3,0,0]} maxBarSize={20} legendType="none" isAnimationActive={true} animationBegin={0} animationDuration={800} />
            <Bar xAxisId="0" yAxisId="revenue" dataKey="gross" fill="#3b82f6" fillOpacity={0.5} radius={[3,3,0,0]} maxBarSize={20} isAnimationActive={true} animationBegin={0} animationDuration={800} />
            <Bar xAxisId="1" yAxisId="revenue" dataKey="net" fill="#2563eb" fillOpacity={1} radius={[3,3,0,0]} maxBarSize={20} isAnimationActive={true} animationBegin={200} animationDuration={800} />
            <Line xAxisId="0" yAxisId="occ" type="monotone" dataKey="occupancy" stroke="#10b981" strokeWidth={2} dot={{ r: 2, fill: '#10b981', strokeWidth: 0 }} activeDot={{ r: 4 }} isAnimationActive={true} animationBegin={400} animationDuration={1500} />
            <Line xAxisId="0" yAxisId="occ" type="monotone" dataKey="predictedOccLine" stroke="#10b981" strokeWidth={1.5} strokeDasharray="5 5" strokeOpacity={0.6} connectNulls={false} dot={false} isAnimationActive={true} animationBegin={800} animationDuration={1000} />
          </ComposedChart>
        </ResponsiveContainer>
      </DelayedMount>
    )}
  </div>
));

const MemoChannelPieChart = React.memo(({ activeStep }: { activeStep: number }) => (
  <div className="flex items-start">
    <div className="flex-1 flex flex-col items-center">
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">이번 달</span>
      <div key={`pie1-${activeStep}`} className="relative w-full h-[140px] flex items-center justify-center">
        {activeStep === 1 && (
          <DelayedMount delay={3300}>
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie data={channelPieData} cx="50%" cy="50%" innerRadius={40} outerRadius={56} paddingAngle={3} dataKey="value" stroke="none" cornerRadius={4} isAnimationActive={true} animationBegin={0} animationDuration={1200}>
                  {channelPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </DelayedMount>
        )}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 pointer-events-none" style={{ animation: activeStep === 1 ? 'fadeIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 3.9s both' : 'none' }}>
          <span className="text-[18px] font-extrabold text-slate-900 leading-none">90%</span>
          <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">가동률</span>
        </div>
      </div>
    </div>
    <div className="w-px bg-slate-200/60 self-stretch mx-1 mt-5" />
    <div className="flex-1 flex flex-col items-center">
      <span className="text-[10px] font-bold text-blue-500/70 uppercase tracking-wide mb-1">전체 평균</span>
      <div key={`pie2-${activeStep}`} className="relative w-full h-[140px] flex items-center justify-center">
        {activeStep === 1 && (
          <DelayedMount delay={3500}>
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie data={allTimeChannelPieData} cx="50%" cy="50%" innerRadius={40} outerRadius={56} paddingAngle={3} dataKey="value" stroke="none" cornerRadius={4} isAnimationActive={true} animationBegin={0} animationDuration={1200}>
                  {allTimeChannelPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </DelayedMount>
        )}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 pointer-events-none" style={{ animation: activeStep === 1 ? 'fadeIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 4.1s both' : 'none' }}>
          <span className="text-[17px] font-extrabold text-slate-900 leading-none">252</span>
          <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">전체</span>
        </div>
      </div>
    </div>
  </div>
));

const MemoNationalityPieChart = React.memo(({ activeStep }: { activeStep: number }) => (
  <div className="flex items-start">
    <div className="flex-1 flex flex-col items-center">
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">이번 달</span>
      <div key={`pie3-${activeStep}`} className="relative w-full h-[140px] flex items-center justify-center">
        {activeStep === 1 && (
          <DelayedMount delay={7400}>
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie data={nationalityPieData} cx="50%" cy="50%" innerRadius={40} outerRadius={56} paddingAngle={3} dataKey="value" stroke="none" cornerRadius={4} isAnimationActive={true} animationBegin={0} animationDuration={1200}>
                  {nationalityPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </DelayedMount>
        )}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 pointer-events-none" style={{ animation: activeStep === 1 ? 'fadeIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 8.0s both' : 'none' }}>
          <span className="text-[18px] font-extrabold text-slate-900 leading-none">22</span>
          <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">예약</span>
        </div>
      </div>
    </div>
    <div className="w-px bg-slate-200/60 self-stretch mx-1 mt-5" />
    <div className="flex-1 flex flex-col items-center">
      <span className="text-[10px] font-bold text-blue-500/70 uppercase tracking-wide mb-1">전체 평균</span>
      <div key={`pie4-${activeStep}`} className="relative w-full h-[140px] flex items-center justify-center">
        {activeStep === 1 && (
          <DelayedMount delay={7600}>
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie data={allTimeNationalityPieData} cx="50%" cy="50%" innerRadius={40} outerRadius={56} paddingAngle={3} dataKey="value" stroke="none" cornerRadius={4} isAnimationActive={true} animationBegin={0} animationDuration={1200}>
                  {allTimeNationalityPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </DelayedMount>
        )}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 pointer-events-none" style={{ animation: activeStep === 1 ? 'fadeIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 8.2s both' : 'none' }}>
          <span className="text-[17px] font-extrabold text-slate-900 leading-none">252</span>
          <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">전체</span>
        </div>
      </div>
    </div>
  </div>
));

const MemoPaceChart = React.memo(({ activeStep }: { activeStep: number }) => (
  <div key={`pace-${activeStep}`} className="h-[150px] w-full mt-1 relative -mx-2">
    {activeStep === 1 && (
      <DelayedMount delay={7800}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={paceData} margin={{ top: 20, right: 4, left: -25, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="leadDay" type="category" tick={{ fontSize: 8, fill: '#94a3b8', fontWeight: 600 }} tickFormatter={val => [180, 150, 120, 90, 60, 30, 0].includes(val as number) ? `D-${val}` : ''} axisLine={false} tickLine={false} interval={0} />
            <YAxis yAxisId="pace" type="number" domain={[0, 100]} tick={{ fontSize: 8, fill: '#94a3b8' }} tickFormatter={val => `${val}%`} axisLine={false} tickLine={false} />
            <YAxis yAxisId="bar" orientation="right" hide />
            
            <Bar yAxisId="bar" dataKey="currentDailyNights" fill="#3b82f6" fillOpacity={0.12} radius={[2, 2, 0, 0]} maxBarSize={3} isAnimationActive={true} animationBegin={0} animationDuration={800} />
            
            <Line yAxisId="pace" type="stepAfter" dataKey="m4" stroke="#d946ef" strokeWidth={1} dot={false} strokeOpacity={0.4} isAnimationActive={true} animationBegin={200} animationDuration={1000} />
            <Line yAxisId="pace" type="stepAfter" dataKey="m3" stroke="#f97316" strokeWidth={1} dot={false} strokeOpacity={0.4} isAnimationActive={true} animationBegin={200} animationDuration={1000} />
            <Line yAxisId="pace" type="stepAfter" dataKey="m2" stroke="#f59e0b" strokeWidth={1} dot={false} strokeOpacity={0.6} isAnimationActive={true} animationBegin={200} animationDuration={1000} />
            <Line yAxisId="pace" type="stepAfter" dataKey="m1" stroke="#10b981" strokeWidth={1} dot={false} strokeOpacity={0.6} isAnimationActive={true} animationBegin={200} animationDuration={1000} />
            
            <Line yAxisId="pace" type="stepAfter" dataKey="curr" stroke="#3b82f6" strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }} isAnimationActive={true} animationBegin={500} animationDuration={1200} />
            
            <ReferenceDot yAxisId="pace" x={10} y={74.2} r={4} fill="#3b82f6" stroke="#ffffff" strokeWidth={2} isFront>
              <Label position="top" content={(props: any) => {
                return (
                  <foreignObject x={props.viewBox.x - 20} y={props.viewBox.y - 20} width="40" height="15" style={{ overflow: 'visible' }}>
                    <div style={{ background: '#3b82f6', color: '#fff', borderRadius: '4px', padding: '1px 4px', fontSize: '8px', fontWeight: '700', textAlign: 'center', whiteSpace: 'nowrap', animation: 'fadeIn 0.5s ease 1s both', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                      74.2%
                    </div>
                  </foreignObject>
                );
              }} />
            </ReferenceDot>

            {/* Fake Tooltip Logic */}
            <ReferenceLine x={46} stroke="#cbd5e1" strokeDasharray="3 3" isFront style={{ animation: 'fadeIn 0.5s ease 1.2s both' }} />
            <ReferenceDot yAxisId="pace" x={46} y={48.4} r={3} fill="#10b981" stroke="#ffffff" strokeWidth={1.5} isFront style={{ animation: 'fadeIn 0.5s ease 1.2s both' }} />
            <ReferenceDot yAxisId="pace" x={46} y={46.7} r={3} fill="#f59e0b" stroke="#ffffff" strokeWidth={1.5} isFront style={{ animation: 'fadeIn 0.5s ease 1.2s both' }} />
            <ReferenceDot yAxisId="pace" x={46} y={48.4} r={4} fill="#3b82f6" stroke="#ffffff" strokeWidth={2} isFront>
              <Label position="top" content={(props: any) => {
                return (
                  <foreignObject x={props.viewBox.x - 55} y={props.viewBox.y - 95} width="110" height="100" style={{ overflow: 'visible' }}>
                    <div style={{ animation: 'fadeInUp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 1.2s both', background: 'rgba(255,255,255,0.98)', backdropFilter: 'blur(4px)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '10px', padding: '8px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', gap: '4px', width: '110px' }}>
                      <div style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', marginBottom: '2px' }}>D-46</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px' }}><span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3b82f6' }}/><span style={{ color: '#334155', fontWeight: '500' }}>26년 7월</span><span style={{ fontWeight: '700', marginLeft: 'auto', color: '#0f172a' }}>48.4%</span></div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px' }}><span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}/><span style={{ color: '#334155', fontWeight: '500' }}>26년 5월</span><span style={{ fontWeight: '700', marginLeft: 'auto', color: '#0f172a' }}>48.4%</span></div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px' }}><span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b' }}/><span style={{ color: '#334155', fontWeight: '500' }}>26년 4월</span><span style={{ fontWeight: '700', marginLeft: 'auto', color: '#0f172a' }}>46.7%</span></div>
                    </div>
                  </foreignObject>
                );
              }} />
            </ReferenceDot>
          </ComposedChart>
        </ResponsiveContainer>
      </DelayedMount>
    )}
  </div>
));

const QuickBookingDemo = ({ active }: { active: boolean }) => {
  const [step, setStep] = useState(0);
  const [typedName, setTypedName] = useState('');
  const [price, setPrice] = useState(0);

  useEffect(() => {
    if (!active) { setStep(0); setTypedName(''); setPrice(0); return; }
    
    const sequence = [
      { s: 1, t: 600 },   // Zoom in, Cursor enters
      { s: 2, t: 1500 },  // Cell click
      { s: 3, t: 2000 },  // Modal pop
      { s: 4, t: 3000 },  // Typing start
      { s: 5, t: 4800 },  // Nationality click
      { s: 6, t: 6000 },  // Channel click
      { s: 7, t: 7200 },  // Save click
      { s: 8, t: 8200 },  // Close, Bar drops, Zoom out
    ];
    const timers = sequence.map(sq => setTimeout(() => setStep(sq.s), sq.t));
    
    const name = '제임스';
    const typeTimers = name.split('').map((char, i) => 
      setTimeout(() => setTypedName(name.slice(0, i + 1)), 3100 + i * 250)
    );
    
    const priceTimers = [
      setTimeout(() => setPrice(90000), 2000),
      setTimeout(() => setPrice(150000), 4800),
      setTimeout(() => setPrice(210000), 6000),
      setTimeout(() => setPrice(250000), 6500)
    ];

    return () => { 
      timers.forEach(clearTimeout); 
      typeTimers.forEach(clearTimeout); 
      priceTimers.forEach(clearTimeout); 
    };
  }, [active]);

  const cellCol = 3;
  const cellRow = 1;
  const cellSpan = 2;

  const cursorX = step < 1 ? 210 : step <= 4 ? 155 : step === 5 ? 125 : step === 6 ? 100 : step === 7 ? 235 : 210;
  const cursorY = step < 1 ? 565 : step <= 4 ? 145 : step === 5 ? 187 : step === 6 ? 217 : step === 7 ? 298 : 565;
  const cursorActive = step === 2 || step === 5 || step === 6 || step === 7;

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden select-none bg-card w-full h-full">
      {/* Zoom Container for Grid */}
      <div className={`absolute inset-0 pt-5 px-3 flex flex-col gap-3 transition-transform duration-1000 ease-[cubic-bezier(0.34,1.56,0.64,1)] origin-[50%_30%] ${step >= 1 && step < 8 ? 'scale-[1.6]' : 'scale-100'}`}>
        <div className="flex justify-between items-center px-1">
          <span className="text-[13px] font-bold text-foreground flex items-center gap-0.5">2026년 6월</span>
        </div>
        <div className="grid grid-cols-7 text-center py-1 bg-card rounded-lg text-[9px] font-bold border-y border-border/40">
          <span className="text-rose-500/80">일</span>
          <span className="text-muted-foreground/60">월</span>
          <span className="text-muted-foreground/60">화</span>
          <span className="text-muted-foreground/60">수</span>
          <span className="text-muted-foreground/60">목</span>
          <span className="text-muted-foreground/60">금</span>
          <span className="text-blue-500/80">토</span>
        </div>
        <div className="grid grid-cols-7 grid-rows-6 flex-none h-[354px] border-t border-l border-border/65 overflow-hidden bg-card relative">
          {calendarCells.map((cell, idx) => {
            const dow = idx % 7;
            return (
              <div key={idx} className={`p-1 box-border border-b border-border/65 flex flex-col justify-start items-start relative ${dow < 6 ? 'border-r border-border/65' : ''}`} style={{ height: '59px' }}>
                <span className={`text-[10px] font-bold leading-none select-none ${dow === 0 ? 'text-rose-500' : dow === 6 ? 'text-blue-500' : 'text-muted-foreground'} ${!cell.isCurrentMonth ? 'opacity-45' : ''}`}>{cell.day}</span>
              </div>
            );
          })}
          {/* Existing events faded out */}
          <div className="absolute inset-0 opacity-30 pointer-events-none grayscale">
            {mockBookings.map((bar, idx) => (
              <div key={idx} className="absolute flex items-center overflow-hidden rounded-[4px] px-1 text-white" style={{ backgroundColor: `var(${bar.channelVar})`, left: `calc(${bar.col} * 100% / 7 + 2px)`, width: `calc(${bar.span} * 100% / 7 - 4px)`, top: `calc(${bar.row} * 100% / 6 + ${14 + bar.slot * 12}px)`, height: '10px' }} />
            ))}
          </div>
          
          {/* Cell click highlight (Exact math) */}
          <div 
            className={`absolute bg-primary/10 border-2 border-primary rounded-[8px] z-10 transition-opacity duration-300 ${step >= 2 && step < 8 ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`} 
            style={{ left: `calc(${cellCol} * 100% / 7)`, top: `${cellRow * 59}px`, width: `calc(1 * 100% / 7)`, height: '59px' }} 
          />
          
          {/* New event bar dropping in (Exact math) */}
          <div 
            className={`absolute bg-[#ff5a5f] rounded-[4px] px-1 shadow-md flex items-center text-white z-10 transform origin-left transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${step >= 8 ? 'scale-x-100 opacity-100 translate-y-0' : 'scale-x-0 opacity-0 translate-y-4'}`}
            style={{ left: `calc(${cellCol} * 100% / 7 + 2px)`, top: `${cellRow * 59 + 14}px`, width: `calc(${cellSpan} * 100% / 7 - 4px)`, height: '10px' }}
          >
            <span className="text-[7.5px] font-extrabold truncate leading-none pt-[1px]">제임스</span>
            <span className="text-[6.5px] font-bold opacity-90 ml-1 leading-none pt-[1px]">2인 2박</span>
            <span className="text-[6.5px] opacity-75 ml-auto font-sans font-semibold leading-none pt-[1px]">Airbnb</span>
          </div>
        </div>
      </div>

      {/* Modal Backdrop */}
      <div className={`absolute inset-0 bg-black/10 z-20 transition-opacity duration-300 ${step >= 3 && step < 8 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} />
      
      {/* Quick Modal UI */}
      <div className={`absolute left-1/2 -translate-x-1/2 top-10 w-[260px] bg-card rounded-[18px] border border-border/40 shadow-2xl overflow-hidden z-30 transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] origin-bottom ${step >= 3 && step < 8 ? 'scale-100 opacity-100 translate-y-0' : 'scale-90 opacity-0 translate-y-8 pointer-events-none'}`}>
         <div className="px-3 pt-3 pb-2">
            <div className="flex items-center gap-1 mb-2">
               <span className="text-[8px] font-bold tracking-wider uppercase text-primary bg-primary/10 px-1.5 py-0.5 rounded">New</span>
               <span className="text-[8.5px] font-bold bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 px-1.5 py-0.5 rounded flex items-center gap-1">
                 <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />오조록 안채
               </span>
            </div>
            <div className="flex items-center gap-2">
               <input type="text" readOnly value={typedName} placeholder="예약자명" className="flex-1 text-[15px] font-bold bg-transparent outline-none text-slate-800 dark:text-slate-200 placeholder:text-muted-foreground/30" />
               <div className="flex items-center gap-1 shrink-0 text-slate-800 dark:text-slate-200">
                  <span className="w-4 h-4 rounded-full flex items-center justify-center text-[12px] font-bold text-muted-foreground">−</span>
                  <span className="text-[12px] font-bold w-3 text-center">2</span>
                  <span className="w-4 h-4 rounded-full flex items-center justify-center text-[12px] font-bold text-muted-foreground">+</span>
               </div>
            </div>
         </div>
         <div className="h-px bg-border/40" />
         
         <div className="px-3 py-2 flex items-center gap-2">
            <div className="flex-1">
              <div className="text-[7.5px] font-bold text-muted-foreground/50 mb-0.5 uppercase tracking-wider">IN</div>
              <div className="text-[10px] font-bold text-slate-800 dark:text-slate-200 bg-muted/20 px-2 py-1.5 rounded-md text-center">6월 10일</div>
            </div>
            <div className="flex flex-col items-center gap-0.5 mt-2">
               <span className="text-[8px] text-muted-foreground/40 leading-none">→</span>
               <span className="text-[7.5px] font-bold text-primary bg-primary/10 px-1 py-0.5 rounded leading-none">2박</span>
            </div>
            <div className="flex-1">
              <div className="text-[7.5px] font-bold text-muted-foreground/50 mb-0.5 uppercase tracking-wider">OUT</div>
              <div className="text-[10px] font-bold text-slate-800 dark:text-slate-200 bg-muted/20 px-2 py-1.5 rounded-md text-center">6월 12일</div>
            </div>
         </div>
         <div className="h-px bg-border/40" />
         
         <div className="px-3 py-2 space-y-1.5">
            <div className="flex gap-1.5">
               {['한국', '대만', '서구권'].map(nat => (
                 <span key={nat} className={`px-2 py-[3px] rounded-md text-[9px] font-bold transition-colors duration-300 ${step >= 5 && nat === '서구권' ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900' : nat === '한국' && step < 5 ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900' : 'bg-muted/50 text-muted-foreground'}`}>{nat}</span>
               ))}
            </div>
            <div className="flex gap-1.5">
               {['Direct', 'Airbnb', 'Agoda'].map(ch => (
                 <span key={ch} className={`px-2 py-[3px] rounded-md text-[9px] font-bold transition-colors duration-300 ${step >= 6 && ch === 'Airbnb' ? 'bg-[#ff5a5f] text-white' : ch === 'Direct' && step < 6 ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900' : 'bg-muted/50 text-muted-foreground'}`}>{ch}</span>
               ))}
            </div>
         </div>
         <div className="h-px bg-border/40" />
         
         <div className="px-3 py-2 grid grid-cols-2 gap-2">
            <div>
               <div className="flex items-center gap-1 mb-1">
                 <span className="text-[7.5px] font-bold text-muted-foreground/50 uppercase tracking-wider">결제금액</span>
                 <span className="text-[7px] font-bold px-1 rounded bg-muted text-muted-foreground/60">평일</span>
               </div>
               <div className="flex items-center bg-muted/20 px-2 py-1.5 rounded-md">
                 <span className="flex-1 text-[11px] font-bold text-slate-800 dark:text-slate-200">{price.toLocaleString()}</span>
                 <span className="text-[8px] text-muted-foreground/50">원</span>
               </div>
            </div>
         </div>
         <div className="px-3 pb-3 pt-2 flex items-center justify-between">
            <span className="text-[8.5px] font-bold text-muted-foreground/40">오늘 · 85%</span>
            <button className={`px-4 py-1.5 rounded-lg text-[11px] font-bold text-white transition-all duration-200 ${step === 7 ? 'bg-primary/80 scale-95 shadow-inner' : 'bg-primary shadow-sm'}`}>
              예약 저장
            </button>
         </div>
      </div>

      {/* Interactive Cursor */}
      <div 
        className="absolute z-50 pointer-events-none transition-all duration-500 ease-out"
        style={{ transform: `translate(${cursorX - 7}px, ${cursorY - 2}px)`, opacity: active ? 1 : 0 }}
      >
        <svg className={`w-6 h-6 text-slate-800 drop-shadow-md transition-transform duration-200 origin-[7px_2px] ${cursorActive ? 'scale-75' : 'scale-100'}`} viewBox="0 0 24 24" fill="currentColor">
          <path d="M7 2l12 11.2-5.8.5 3.3 7.3-2.2.9-3.2-7.4-4.4 4.7z" />
        </svg>
        {cursorActive && (
          <div className="absolute left-[7px] top-[2px] w-8 h-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-800/20 animate-ping" />
        )}
      </div>
    </div>
  );
};

export const HeroSection = ({ hideText = false }: { hideText?: boolean }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [subCopyIndex, setSubCopyIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsFading(true);
      setTimeout(() => {
        setSubCopyIndex((prev) => (prev + 1) % CONTENT.hero.subCopies.length);
        setIsFading(false);
      }, 400);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const duration = activeStep === 0 ? 6000 : activeStep === 1 ? 11000 : 10000;
    const timer = setTimeout(() => {
      setActiveStep((prev) => (prev + 1) % 3);
    }, duration);
    return () => clearTimeout(timer);
  }, [activeStep]);

  return (
    <section className={`relative w-full ${hideText ? 'h-full' : 'h-[100dvh]'} flex flex-col items-center justify-center ${hideText ? '' : 'overflow-hidden'} ${hideText ? 'bg-transparent' : 'bg-background'}`}>
      <style>{`
        @keyframes popHighlight {
          0% { transform: scale(1); color: inherit; }
          40% { transform: scale(1.1); color: #3b82f6; }
          100% { transform: scale(1); color: inherit; }
        }
        @keyframes eventElasticPop {
          0% { transform: scale(0.6); opacity: 0; }
          6% { transform: scale(1.06); opacity: 1; }
          9% { transform: scale(0.98); opacity: 1; }
          12% { transform: scale(1); opacity: 1; }
          86% { transform: scale(1); opacity: 1; }
          90%, 100% { transform: scale(0.85); opacity: 0; }
        }
        .animate-event-bounce { animation: eventElasticPop 9s infinite cubic-bezier(0.25, 1.1, 0.4, 1) both; }
      `}</style>
      
      <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none select-none">
        <div className="relative w-full max-w-6xl h-[70dvh] flex items-center justify-center">
          
          <div 
            className="absolute w-[300px] h-[540px] sm:w-[320px] sm:h-[580px] rounded-[24px] bg-card text-card-foreground flex flex-col overflow-hidden border border-border/10 transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)]"
            style={{
              transform: activeStep === 0 
                ? 'translateX(0px) scale(1)' 
                : activeStep === 1 
                  ? (isMobile ? 'translateX(0px) scale(0.95)' : 'translateX(-170px) scale(0.95)')
                  : (isMobile ? 'translateX(0px) scale(0.95)' : 'translateX(-170px) scale(0.95)'),
              opacity: activeStep === 0 ? 1 : activeStep === 1 ? (isMobile ? 0 : 1) : (isMobile ? 0 : 0.4),
              zIndex: activeStep === 0 ? 10 : activeStep === 1 ? 5 : 5
            }}
          >
            <div className="flex-1 p-3 pt-5 flex flex-col gap-3 relative overflow-hidden select-none bg-card">
              <div className="flex justify-between items-center px-1">
                <div className="flex items-center gap-1">
                  <span className="text-[13px] font-bold text-foreground flex items-center gap-0.5">
                    2026년 6월
                    <svg className="w-3.5 h-3.5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </div>
                <div className="flex gap-1 items-center shrink-0">
                  <div className="w-7 h-7 flex items-center justify-center rounded-xl bg-muted text-foreground border border-border/40">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </div>
                  <div className="w-7 h-7 flex items-center justify-center rounded-xl bg-muted text-foreground border border-border/40">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                    </svg>
                  </div>
                  <div className="w-7 h-7 flex items-center justify-center rounded-xl bg-muted text-foreground border border-border/40">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  <span className="h-7 px-2.5 text-[11px] font-bold bg-primary/10 text-primary rounded-xl flex items-center justify-center border border-primary/20">
                    오늘
                  </span>
                </div>
              </div>

              <div className="flex gap-1.5 flex-wrap px-1">
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold border bg-muted text-foreground border-border">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  오조록
                </span>
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold border bg-transparent text-muted-foreground border-border/50">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  안채
                </span>
              </div>

              <div className="grid grid-cols-7 text-center py-1 bg-card rounded-lg text-[9px] font-bold border-y border-border/40 px-0">
                <span className="text-rose-500/80">일</span>
                <span className="text-muted-foreground/60">월</span>
                <span className="text-muted-foreground/60">화</span>
                <span className="text-muted-foreground/60">수</span>
                <span className="text-muted-foreground/60">목</span>
                <span className="text-muted-foreground/60">금</span>
                <span className="text-blue-500/80">토</span>
              </div>

              <div className="grid grid-cols-7 grid-rows-6 gap-0 flex-none h-[354px] border-t border-l border-border/65 overflow-hidden bg-card relative">
                {calendarCells.map((cell, idx) => {
                  const dow = idx % 7;
                  const isRed = dow === 0;
                  const isBlue = dow === 6;
                  return (
                    <div
                      key={idx}
                      className={`p-1 box-border border-b border-border/65 flex flex-col justify-start items-start relative ${
                        dow < 6 ? 'border-r border-border/65' : ''
                      }`}
                      style={{ height: '59px' }}
                    >
                      <span className={`text-[10px] font-bold leading-none select-none ${
                        isRed ? 'text-rose-500' : isBlue ? 'text-blue-500' : 'text-muted-foreground'
                      } ${!cell.isCurrentMonth ? 'opacity-45' : ''}`}>
                        {cell.day}
                      </span>
                    </div>
                  );
                })}

                {mockBookings.map((bar, idx) => {
                  const left = `calc(${bar.col} * 100% / 7 + 2px)`;
                  const width = `calc(${bar.span} * 100% / 7 - 4px)`;
                  const top = `calc(${bar.row} * 100% / 6 + ${14 + bar.slot * 12}px)`;
                  return (
                    <div 
                      key={idx}
                      className="absolute animate-event-bounce flex items-center overflow-hidden rounded-[4px] px-1 text-white shadow-sm"
                      style={{
                        backgroundColor: `var(${bar.channelVar})`,
                        left,
                        width,
                        top,
                        height: '10px',
                        animationDelay: bar.delay,
                        animationPlayState: activeStep === 1 ? 'paused' : 'running'
                      }}
                    >
                      <div className="flex items-baseline w-full overflow-hidden min-w-0">
                        <span className="text-[7px] font-extrabold truncate leading-none min-w-0 shrink">{bar.guestName}</span>
                        <span className="text-[6.5px] font-bold opacity-90 leading-none shrink-0 ml-1">{bar.info}</span>
                        {bar.span >= 3 && (
                          <span className="text-[6.5px] opacity-75 leading-none shrink-0 ml-auto font-sans font-semibold">{bar.channel}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div 
            className="absolute w-[300px] h-[540px] sm:w-[320px] sm:h-[580px] rounded-[24px] bg-card text-card-foreground flex flex-col overflow-hidden border border-border/10 transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)]"
            style={{
              transform: activeStep === 0 
                ? (isMobile ? 'translateX(0px) scale(0.85)' : 'translateX(250px) scale(0.85)')
                : activeStep === 1
                  ? (isMobile ? 'translateX(0px) scale(1)' : 'translateX(170px) scale(1)')
                  : (isMobile ? 'translateX(0px) scale(0.95)' : 'translateX(170px) scale(0.95)'),
              opacity: activeStep === 0 ? 0 : activeStep === 1 ? 1 : (isMobile ? 0 : 0.4),
              zIndex: activeStep === 0 ? 1 : activeStep === 1 ? 10 : 5,
              pointerEvents: activeStep === 1 ? 'auto' : 'none'
            }}
          >
            <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden select-none text-slate-800 relative">
              <style>{`
                @keyframes dashboardScroll {
                  0%, 15% { transform: translateY(0); animation-timing-function: ease-in-out; }
                  28%, 52% { transform: translateY(-340px); animation-timing-function: ease-in-out; }
                  65%, 100% { transform: translateY(-1100px); }
                }
              `}</style>
              
              <div className="absolute top-0 left-0 w-full flex items-center justify-between px-3 py-4 bg-white border-b border-slate-100 shrink-0 z-30 shadow-sm">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-bold text-slate-800">대시보드</span>
                    <div className="flex items-center text-slate-400 text-[10px] font-medium">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                      <span className="mx-0.5">6월 2026</span>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium flex items-center gap-0.5 ml-1">전체 <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg></span>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full border border-slate-200 bg-white flex items-center justify-center">
                  <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                </div>
              </div>

              {useMemo(() => (
              <div 
                className="flex flex-col gap-3 px-3 pt-[66px] pb-[100px] w-full relative z-10"
                style={{ animation: activeStep === 1 ? 'dashboardScroll 11s linear both' : 'none' }}
              >
                {/* KPI 1: 순수익 */}
                <div className="bg-white rounded-[16px] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)] border border-slate-100 flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-semibold text-slate-400">순수익</span>
                    <span className="text-[9px] font-semibold py-1 px-2 rounded-lg flex items-center bg-red-50 text-red-500 tracking-tight">
                      <svg className="w-2.5 h-2.5 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                      -10.3%
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-[26px] font-bold tracking-tight text-slate-900">
                      {activeStep === 1 ? <CountUp key={`kpi1-${activeStep}`} to={5027291} delay={800} prefix="₩" /> : "₩0"}
                    </span>
                    <span className="text-[9px] font-medium text-slate-400">월말 예상 {activeStep === 1 ? <CountUp key={`kpi2-${activeStep}`} to={5505000} delay={1000} prefix="₩" /> : "₩0"}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-medium text-slate-400">총매출</span>
                      <strong className="text-[11px] font-bold text-slate-800">{activeStep === 1 ? <CountUp key={`kpi3-${activeStep}`} to={5649317} delay={1200} prefix="₩" /> : "₩0"}</strong>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-medium text-slate-400">전월 대비</span>
                      <strong className="text-[11px] font-bold text-red-500">{activeStep === 1 ? <CountUp key={`kpi4-${activeStep}`} to={574459} delay={1400} prefix="-₩" /> : "-₩0"}</strong>
                    </div>
                  </div>
                </div>

                {/* KPI 2: 점유율 + ADR */}
                <div className="grid grid-cols-2 gap-3">
                  {/* 점유율 */}
                  <div className="bg-white rounded-[16px] p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] border border-slate-100 flex flex-col justify-between h-full">
                    <div className="flex flex-col">
                      <div className="text-[9px] font-semibold text-slate-400 mb-1.5">점유율</div>
                      <div className="flex items-baseline gap-1 flex-wrap leading-tight">
                        <span className="text-[16px] font-bold text-slate-900">
                          {activeStep === 1 ? <CountUp key={`kpi5-${activeStep}`} to={90} delay={900} suffix="%" /> : "0%"}
                        </span>
                        <span className="text-[8px] font-medium text-slate-400">
                          22건 <span className="text-[#10b981]">(+5)</span> 27박 <span className="text-red-500">(-4박)</span>
                        </span>
                      </div>
                    </div>
                    <div className="h-px bg-slate-50 w-full my-3" />
                    <div className="flex flex-col">
                      <div className="text-[9px] font-semibold text-slate-400 mb-1.5">월말 예상 점유율</div>
                      <div className="flex items-baseline gap-1 flex-wrap leading-tight">
                        <span className="text-[16px] font-bold text-slate-900">
                          {activeStep === 1 ? <CountUp key={`kpi6-${activeStep}`} to={100} delay={1100} suffix="%" /> : "0%"}
                        </span>
                        <span className="text-[8px] font-medium text-slate-400">
                          <span className="text-[#10b981]">+3박</span> 신뢰도 60%
                        </span>
                      </div>
                    </div>
                  </div>
                  {/* ADR */}
                  <div className="bg-white rounded-[16px] p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] border border-slate-100 flex flex-col justify-between h-full">
                    <div className="flex flex-col">
                      <div className="text-[9px] font-semibold text-slate-400 mb-1.5">ADR</div>
                      <div className="flex items-baseline gap-1 flex-wrap leading-tight">
                        <span className="text-[16px] font-bold text-slate-900">
                          {activeStep === 1 ? <CountUp key={`kpi7-${activeStep}`} to={209234} delay={1000} suffix=" 원" /> : "0 원"}
                        </span>
                        <span className="text-[8px] font-medium text-slate-400">평균 19.4만원</span>
                      </div>
                    </div>
                    <div className="h-px bg-slate-50 w-full my-3" />
                    <div className="flex flex-col">
                      <div className="text-[9px] font-semibold text-slate-400 mb-1.5">OTA 수수료</div>
                      <div className="flex items-baseline gap-1 flex-wrap leading-tight">
                        <span className="text-[16px] font-bold text-slate-900">
                          {activeStep === 1 ? <CountUp key={`kpi8-${activeStep}`} to={622026} delay={1200} suffix=" 원" /> : "0 원"}
                        </span>
                        <span className="text-[8px] font-semibold py-0.5 px-1.5 rounded-md bg-red-50 text-red-500 flex items-center">
                          <svg className="w-2.5 h-2.5 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                          48%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 차트 영역 */}
                {/* 차트 영역 */}
                <div className="bg-white text-slate-900 border border-slate-200/60 rounded-2xl p-4 relative overflow-hidden shadow-sm w-full mb-3">
                  <span className="text-[14px] font-bold text-slate-900 mb-3 block">월별 추이 (11개월)</span>
                  
                  <div className="flex flex-col gap-1 mb-4">
                    <div className="text-[11px] text-slate-500">
                      <strong className="text-slate-900">26년 누적 금액</strong> 매출 <strong className="text-slate-900">3,008 만원</strong> 순이익 <strong className="text-slate-900">2,734 만원</strong>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      <strong className="text-slate-900">26년 예상 금액</strong> 매출 <strong className="text-slate-900">6,640 만원</strong> 순이익 <strong className="text-slate-900">5,944 만원</strong> · 33%
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 mb-5">
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500"><span className="w-2 h-2 rounded-sm bg-blue-500/40" />총매출</div>
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500"><span className="w-2 h-2 rounded-sm bg-blue-500" />순이익</div>
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500"><span className="w-2 h-2 rounded-full bg-emerald-500" />점유율</div>
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500">
                      <span className="w-3 border-t-2 border-dashed border-emerald-500 mr-0.5" />예상OCC
                    </div>
                  </div>
                  
                  {/* Chart Graphic Simulation */}
                  <MemoTrendChart activeStep={activeStep} />
                  <div className="flex justify-between w-full mt-2 px-1">
                    {['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월'].map((m, i) => (
                      <span key={i} className={`text-[10px] font-medium ${i === 5 ? 'text-slate-600 font-bold' : 'text-slate-400'}`}>{m}</span>
                    ))}
                  </div>
                </div>

                {/* Card 5: 예약 채널 분포 */}
                <div className="bg-white text-slate-900 border border-slate-200/60 rounded-2xl p-4 relative overflow-hidden shadow-sm w-full mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[14px] font-bold text-slate-900 block" style={{ marginBottom: 0 }}>예약 채널 분포</span>
                    <button className="text-[10px] font-bold py-1 px-2.5 rounded-lg bg-blue-50 text-blue-500 whitespace-nowrap">자세히 보기 &gt;</button>
                  </div>
                  
                  <MemoChannelPieChart activeStep={activeStep} />
                  
                  <ul className="m-0 p-0 list-none mt-1" style={{ animation: activeStep === 1 ? 'fadeIn 0.6s ease-out 4.1s both' : 'none' }}>
                    <li className="flex items-center pb-1">
                      <span className="w-2 h-2 mr-2 flex-shrink-0" />
                      <span className="flex-1" />
                      <span className="text-[10px] font-bold text-slate-500 w-9 text-right">이달</span>
                      <span className="text-[10px] font-bold text-blue-500/60 w-9 text-right">전체</span>
                    </li>
                    <li className="flex items-center py-1.5 text-xs border-b border-slate-200/50 last:border-0">
                      <span className="w-2 h-2 rounded-full mr-2 flex-shrink-0 bg-[#ef4444]" />
                      <span className="flex-1 text-slate-500 truncate">Airbnb</span>
                      <span className="font-bold text-slate-900/90 w-9 text-right">45%</span>
                      <span className="font-medium text-slate-500 w-9 text-right">32%</span>
                    </li>
                    <li className="flex items-center py-1.5 text-xs border-b border-slate-200/50 last:border-0">
                      <span className="w-2 h-2 rounded-full mr-2 flex-shrink-0 bg-[#10b981]" />
                      <span className="flex-1 text-slate-500 truncate">Naver</span>
                      <span className="font-bold text-slate-900/90 w-9 text-right">36%</span>
                      <span className="font-medium text-slate-500 w-9 text-right">41%</span>
                    </li>
                    <li className="flex items-center py-1.5 text-xs border-b border-slate-200/50 last:border-0">
                      <span className="w-2 h-2 rounded-full mr-2 flex-shrink-0 bg-[#3b82f6]" />
                      <span className="flex-1 text-slate-500 truncate">Booking.com</span>
                      <span className="font-bold text-slate-900/90 w-9 text-right">14%</span>
                      <span className="font-medium text-slate-500 w-9 text-right">20%</span>
                    </li>
                    <li className="flex items-center py-1.5 text-xs border-b border-slate-200/50 last:border-0">
                      <span className="w-2 h-2 rounded-full mr-2 flex-shrink-0 bg-[#a855f7]" />
                      <span className="flex-1 text-slate-500 truncate">Direct</span>
                      <span className="font-bold text-slate-900/90 w-9 text-right">5%</span>
                      <span className="font-medium text-slate-500 w-9 text-right">7%</span>
                    </li>
                  </ul>
                </div>

                {/* Card 6: 국적 분포 */}
                <div className="bg-white text-slate-900 border border-slate-200/60 rounded-2xl p-4 relative overflow-hidden shadow-sm w-full mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[14px] font-bold text-slate-900 block" style={{ marginBottom: 0 }}>국적 분포</span>
                    <button className="text-[10px] font-bold py-1 px-2.5 rounded-lg bg-blue-50 text-blue-500 whitespace-nowrap">자세히 보기 &gt;</button>
                  </div>
                  
                  <MemoNationalityPieChart activeStep={activeStep} />
                  
                  <ul className="m-0 p-0 list-none mt-1" style={{ animation: activeStep === 1 ? 'fadeIn 0.6s ease-out 8.2s both' : 'none' }}>
                    <li className="flex items-center pb-1">
                      <span className="w-2 h-2 mr-2 flex-shrink-0" />
                      <span className="flex-1" />
                      <span className="text-[10px] font-bold text-slate-500 w-9 text-right">이달</span>
                      <span className="text-[10px] font-bold text-blue-500/60 w-9 text-right">전체</span>
                    </li>
                    <li className="flex items-center py-1.5 text-xs border-b border-slate-200/50 last:border-0">
                      <span className="w-2 h-2 rounded-full mr-2 flex-shrink-0 bg-[#10b981]" />
                      <span className="flex-1 text-slate-500 truncate">Korea</span>
                      <span className="font-bold text-slate-900/90 w-9 text-right">50%</span>
                      <span className="font-medium text-slate-500 w-9 text-right">62%</span>
                    </li>
                    <li className="flex items-center py-1.5 text-xs border-b border-slate-200/50 last:border-0">
                  <span className="w-2 h-2 rounded-full mr-2 flex-shrink-0 bg-[#f59e0b]" />
                      <span className="flex-1 text-slate-500 truncate">Taiwan</span>
                      <span className="font-bold text-slate-900/90 w-9 text-right">36%</span>
                      <span className="font-medium text-slate-500 w-9 text-right">20%</span>
                    </li>
                    <li className="flex items-center py-1.5 text-xs border-b border-slate-200/50 last:border-0">
                      <span className="w-2 h-2 rounded-full mr-2 flex-shrink-0 bg-[#64748b]" />
                      <span className="flex-1 text-slate-500 truncate">Others</span>
                      <span className="font-bold text-slate-900/90 w-9 text-right">9%</span>
                      <span className="font-medium text-slate-500 w-9 text-right">6%</span>
                    </li>
                  </ul>
                </div>

                {/* Card 7: 예약 속도 추이 */}
                <div className="bg-white rounded-[16px] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)] border border-slate-100 flex flex-col">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="font-bold text-[13px] text-slate-800">예약 속도 추이</span>
                    <div className="flex bg-slate-50 rounded text-[9px] font-semibold text-slate-500 border border-slate-200/60 overflow-hidden">
                      <div className="bg-blue-500/10 text-blue-500 px-2 py-0.5">점유율</div>
                      <div className="px-2 py-0.5">매출</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6]" />
                    <span className="text-[11px] font-bold text-slate-700">26년 7월</span>
                  </div>
                  <MemoPaceChart activeStep={activeStep} />
                  
                  {/* Insight */}
                  <div className="mt-2 flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-slate-50 transition-colors" style={{ animation: activeStep === 1 ? 'fadeIn 0.6s ease-out 8.8s both' : 'none' }}>
                    <span className="text-[10px] font-medium leading-snug text-slate-600">
                      최근 3개월 대비 <span className="font-bold text-slate-800">+7%p</span> · 예상 마감 <span className="font-bold text-slate-800">100%</span>
                    </span>
                  </div>
                </div>

              </div>
              ), [activeStep])}
            </div>
          </div>
          
          {/* 미려한 감성 블롭 그라데이션 */}
          <div className="absolute top-1/4 left-1/4 w-[35vw] h-[35vw] rounded-full bg-primary/10 blur-[130px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-[40vw] h-[40vw] rounded-full bg-indigo-500/5 blur-[150px]" />

          {/* Phone 3: New Feature Placeholder */}
          <div 
            className="absolute w-[300px] h-[540px] sm:w-[320px] sm:h-[580px] rounded-[24px] bg-card text-card-foreground flex flex-col overflow-hidden border border-border/10 transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] shadow-xl"
            style={{
              transform: activeStep === 0 
                ? (isMobile ? 'translateX(0px) scale(0.8)' : 'translateX(0px) scale(0.8) translateY(100px)')
                : activeStep === 1
                  ? (isMobile ? 'translateX(0px) scale(0.8)' : 'translateX(0px) scale(0.8) translateY(100px)')
                  : (isMobile ? 'translateX(0px) scale(1)' : 'translateX(0px) scale(1) translateY(0px)'),
              opacity: activeStep === 0 ? 0 : activeStep === 1 ? 0 : 1,
              zIndex: activeStep === 2 ? 10 : 3,
              pointerEvents: activeStep === 2 ? 'auto' : 'none'
            }}
          >
            {/* Quick Booking Interactive Demo */}
            <QuickBookingDemo active={activeStep === 2} />
          </div>
        </div>
      </div>

      {!hideText && (
        <>
          {/* Scrim / Overlay (배경 딤 처리 기술) */}
          <div className="absolute inset-0 z-10 bg-slate-300/40 dark:bg-black/50 pointer-events-none transition-all duration-700" />

          {/* 2. 전면 콘텐츠 영역 */}
          <div className="relative z-10 w-full max-w-4xl px-6 flex flex-col items-center text-center gap-3 pt-12">
            {/* 텍스트 가독성을 위한 미약하고 작은 화이트 음영 (배경 글로우) */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] sm:w-[60%] h-[120%] bg-white/30 blur-[40px] rounded-full pointer-events-none -z-10" />
            
            {/* 메인 슬로건 */}
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-foreground leading-[1.12] drop-shadow-[0_0_12px_rgba(255,255,255,0.4)] select-none whitespace-pre-line text-center">
              <span className="hidden md:inline">{CONTENT.hero.headlineDesktop}</span>
              <span className="inline md:hidden">{CONTENT.hero.headlineMobile}</span>
            </h1>

            {/* 번갈아 바뀌는 서브 카피 */}
            <div className="h-16 flex items-center justify-center">
              <p
                className={`text-lg sm:text-2xl font-medium text-muted-foreground leading-relaxed drop-shadow-[0_0_8px_rgba(255,255,255,0.4)] transition-all duration-500 transform ${
                  isFading ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
                }`}
              >
                {CONTENT.hero.subCopies[subCopyIndex]}
              </p>
            </div>
          </div>

          {/* 아래로 스크롤 유도 인디케이터 */}
          <div 
            onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-muted-foreground animate-bounce cursor-pointer z-10 opacity-70 hover:opacity-100 transition-opacity"
          >
            <span className="text-xs tracking-wider uppercase font-semibold">더 알아보기</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </>
      )}
    </section>
  );
};
