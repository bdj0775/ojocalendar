import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine,
} from 'recharts';
import type { LastMinuteRadarResult, RadarDowGroup, RadarWindow } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';
import { radarDowLabel } from '../../hooks/useLastMinuteRadar';

interface Props {
  radar: LastMinuteRadarResult;
  onClose: () => void;
  isDark?: boolean;
}

const X_TICKS = [28, 21, 14, 10, 7, 5, 3, 1, 0];

/** 차트 툴팁 — TrendTooltip과 같은 토큰. 비율과 함께 "몇 박 중 몇 박"을 보여준다 */
const CurveTooltip = ({ active, payload, label, ko, radar }: {
  active?: boolean; payload?: Array<{ dataKey: string; value: number | null }>; label?: number; ko: boolean; radar: LastMinuteRadarResult;
}) => {
  if (!active || !payload?.length || label === undefined) return null;
  const D = Number(label);
  const rows = payload.filter(p => p.value !== null).map(p => {
    const [g, w] = p.dataKey.split('_') as [RadarDowGroup, RadarWindow];
    const pt = radar.curves.find(c => c.group === g && c.window === w)?.points[D];
    return { g, w, value: p.value as number, n: pt?.n ?? 0, sold: pt?.sold ?? 0 };
  });
  return (
    <div className="bg-card border border-border rounded-inner shadow-tooltip p-3 min-w-[210px]">
      <div className="type-micro font-bold text-muted-foreground mb-1.5 tracking-wider">
        {D === 0 ? (ko ? '당일' : 'Same day') : ko ? `${D}일 남았을 때` : `${D} days out`}
      </div>
      {rows.map(r => (
        <div key={`${r.g}_${r.w}`} className="flex items-center justify-between gap-3 text-xs text-foreground mb-1 last:mb-0">
          <span className="text-muted-foreground">
            {r.g === 'weekday' ? (ko ? '일~목' : 'Sun–Thu') : (ko ? '금·토' : 'Fri/Sat')} · {r.w === '6m' ? (ko ? '6개월' : '6 mo') : (ko ? '1년' : '12 mo')}
          </span>
          <span className="font-bold tabular-nums">{r.value}% <span className="font-normal text-muted-foreground">({r.n}{ko ? '박 중 ' : ' empty, '}{r.sold}{ko ? '박 팔림' : ' sold'})</span></span>
        </div>
      ))}
    </div>
  );
};

const LastMinuteRadarModal = ({ radar, onClose, isDark = false }: Props) => {
  const { language } = useTranslation();
  const ko = language === 'ko';
  const [focus, setFocus] = useState<RadarDowGroup>('weekday');

  const sectionCls = 'bg-card border border-border rounded-card p-5 max-[640px]:p-4 shadow-card-xs';
  const titleCls = 'text-[13px] font-bold text-foreground';
  const descCls = 'text-[11px] text-muted-foreground mt-0.5 break-keep';
  const toggleGroupCls = 'flex bg-muted rounded-lg overflow-hidden border border-border';
  const toggleBtnCls = 'py-1 px-2.5 text-[11px] font-semibold text-muted-foreground bg-transparent border-0 cursor-pointer tracking-wide whitespace-nowrap transition-all';
  const toggleBtnActiveCls = 'bg-primary/15 text-primary';

  const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
  const tickColor = isDark ? '#64748b' : '#94a3b8';
  const maxD = radar.horizonDays;

  // ── 곡선 데이터: x = 남은 날수 (maxD → 0) ───────────────────────────
  const chartData = useMemo(() => {
    const byD: Array<Record<string, number | null>> = [];
    for (let D = maxD; D >= 0; D--) {
      const row: Record<string, number | null> = { D };
      radar.curves.forEach(c => { row[`${c.group}_${c.window}`] = c.points[D]?.probability ?? null; });
      byD.push(row);
    }
    return byD;
  }, [radar.curves, maxD]);

  const curve = (g: RadarDowGroup, w: RadarWindow) => radar.curves.find(c => c.group === g && c.window === w)!;
  const hasPoints = (g: RadarDowGroup, w: RadarWindow) => curve(g, w).points.some(p => p.probability !== null);
  const groupLabel = (g: RadarDowGroup) => (g === 'weekday' ? (ko ? '일~목' : 'Sun–Thu') : (ko ? '금·토·공휴일 전날' : 'Fri/Sat/holiday eve'));
  const lineStyle = (g: RadarDowGroup, w: RadarWindow) => ({
    stroke: g === focus ? 'var(--primary)' : 'var(--muted-foreground)',
    strokeOpacity: g === focus ? 1 : 0.45,
    strokeWidth: w === '6m' ? 2.2 : 1.4,
    strokeDasharray: w === '6m' ? undefined : '4 3',
  });
  // 6개월 곡선이 없을 때: "그 시점에 비어 있던 밤"이 10개 미만이라는 뜻 (대개 다 일찍 팔려서)
  const sixMonthMax = Math.max(...curve(focus, '6m').points.map(p => p.n));

  const late = radar.lateSale;
  const q = radar.dataQuality;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-overlay flex justify-center items-center p-4 max-[640px]:p-0 opacity-0 animate-[fadeIn_0.25s_forwards]"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-[900px] max-h-[88vh] max-[640px]:max-h-full max-[640px]:h-full max-[640px]:rounded-none bg-background border border-border rounded-sheet shadow-modal flex flex-col overflow-hidden translate-y-4 animate-[slideUp_0.35s_cubic-bezier(0.16,1,0.3,1)_forwards]"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4 px-6 max-[640px]:px-4 pt-5 pb-4 border-b border-border flex-shrink-0">
          <div>
            <h2 className="text-[15px] font-bold text-foreground">{ko ? '빈방 레이더 · 자세히' : 'Vacancy Radar · Details'}</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5 break-keep">
              {ko ? '남은 날이 줄수록 팔릴 가능성이 어떻게 떨어지는지' : 'How the chance of selling falls as the night approaches'}
            </p>
          </div>
          <button
            className={`w-9 h-9 rounded-inner flex items-center justify-center flex-shrink-0 transition-colors text-muted-foreground hover:text-destructive ${isDark ? 'bg-white/[0.05] hover:bg-destructive/15' : 'bg-black/[0.04] hover:bg-destructive/10'}`}
            onClick={onClose}
            aria-label={ko ? '닫기' : 'Close'}
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 max-[640px]:px-4 py-5 max-[640px]:py-4 overflow-y-auto flex flex-col gap-5 max-[640px]:gap-4 dashboard-scroll">
          {!q.enough ? (
            <div className={`${sectionCls} text-center py-10`}>
              <p className="text-[12px] text-muted-foreground break-keep">
                {ko
                  ? `아직 기록이 적어요. 완료된 달 3개월과 금액이 적힌 예약 30건이 필요해요 (지금 ${q.completedMonths}개월 · ${q.pricedBookings}건).`
                  : `Not enough history yet — needs 3 completed months and 30 priced bookings (now ${q.completedMonths} · ${q.pricedBookings}).`}
              </p>
            </div>
          ) : (
            <>
              {/* ── ① 내리막 곡선 ── */}
              <div className={sectionCls}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className={titleCls}>{ko ? '남은 날수별 팔릴 가능성' : 'Chance to sell by days remaining'}</div>
                    <p className={descCls}>
                      {ko
                        ? '굵은 선 = 최근 6개월, 점선 = 최근 1년. 가로 점선(50%) 아래로 내려가면 그냥 두면 안 팔릴 확률이 더 높다는 뜻이에요. 선 위에 마우스를 올리면 몇 박 중 몇 박인지 보여요.'
                        : 'Thick = last 6 months, dashed = last 12. Below the 50% line, an empty night is more likely to stay empty than to sell. Hover the line for the counts.'}
                    </p>
                  </div>
                  <div className={toggleGroupCls}>
                    {(['weekday', 'weekend'] as RadarDowGroup[]).map(g => (
                      <button key={g} className={`${toggleBtnCls} ${focus === g ? toggleBtnActiveCls : ''}`} onClick={() => setFocus(g)}>
                        {g === 'weekday' ? (ko ? '일~목' : 'Sun–Thu') : (ko ? '금·토' : 'Fri/Sat')}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 12, right: 16, left: -12, bottom: 0 }}>
                      <CartesianGrid stroke={gridColor} vertical={false} />
                      <XAxis
                        dataKey="D" type="number" domain={[maxD, 0]} reversed ticks={X_TICKS.filter(t => t <= maxD)}
                        tick={{ fontSize: 10, fill: tickColor }} axisLine={false} tickLine={false}
                        tickFormatter={(v: number) => (v === 0 ? (ko ? '당일' : 'day') : `D-${v}`)}
                      />
                      <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={{ fontSize: 10, fill: tickColor }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}%`} />
                      <Tooltip content={<CurveTooltip ko={ko} radar={radar} />} cursor={{ stroke: tickColor, strokeDasharray: '3 3' }} />
                      <ReferenceLine y={50} stroke={tickColor} strokeDasharray="4 4" strokeOpacity={0.7} />
                      {(['weekday', 'weekend'] as RadarDowGroup[]).flatMap(g =>
                        (['12m', '6m'] as RadarWindow[]).map(w => hasPoints(g, w) ? (
                          <Line
                            key={`${g}_${w}`} type="monotone" dataKey={`${g}_${w}`} dot={false} connectNulls
                            activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--card)' }} isAnimationActive={false}
                            {...lineStyle(g, w)}
                          />
                        ) : null),
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap items-center gap-4 mt-2 type-micro text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5"><span className="w-4 h-[2px] bg-primary inline-block rounded-full" />{groupLabel(focus)}</span>
                  <span className="inline-flex items-center gap-1.5"><span className="w-4 h-[2px] bg-muted-foreground/45 inline-block rounded-full" />{groupLabel(focus === 'weekday' ? 'weekend' : 'weekday')}</span>
                </div>
                {!hasPoints(focus, '6m') && (
                  <p className="type-micro text-warning font-medium mt-1.5 break-keep">
                    {ko
                      ? `최근 6개월 ${groupLabel(focus)}은(는) 거의 다 일찍 팔려서, 임박까지 비어 있던 밤이 많아야 ${sixMonthMax}개예요. 10개 미만이면 비율을 믿을 수 없어 1년 곡선만 그렸어요.`
                      : `In the last 6 months almost all ${groupLabel(focus)} nights sold early — at most ${sixMonthMax} were still empty near the date. Under 10 the ratio isn't reliable, so only the 12-month curve is drawn.`}
                  </p>
                )}
              </div>

              {/* ── ② 임박에 실제 얼마에 팔렸나 — 한 문장 ── */}
              <div className={sectionCls}>
                <div className={titleCls}>{ko ? '임박에 팔릴 땐 얼마에 팔렸나' : 'What late sales fetched'}</div>
                <p className="text-[12px] text-foreground mt-1.5 break-keep">
                  {late.avgPct === null
                    ? (ko ? '금액이 적힌 임박 판매가 아직 없어요.' : 'No priced late sales yet.')
                    : ko
                      ? <>지난 1년, 체크인 7일 이내에 팔린 <b>{late.n}박</b>은 그 달 보통 가격보다 평균 <b>{late.avgPct > 0 ? '+' : ''}{late.avgPct}%</b>에 팔렸어요. 위의 "팔릴 가능성"은 이렇게 할인해 온 결과가 포함된 값이에요.</>
                      : <>Over the last year, the <b>{late.n} nights</b> sold within 7 days of check-in went for <b>{late.avgPct > 0 ? '+' : ''}{late.avgPct}%</b> vs the month's usual rate. The chances above already include this discounting.</>}
                </p>
              </div>

              {/* ── ③ 어떻게 계산했나 ── */}
              <div className="rounded-card border border-primary/25 bg-primary/[0.06] p-5 max-[640px]:p-4">
                <div className="text-[10px] font-bold text-primary uppercase tracking-wider mb-2">{ko ? '어떻게 계산했나요' : 'How this is calculated'}</div>
                <p className="text-[11px] text-foreground/90 leading-relaxed break-keep">
                  {ko
                    ? '지난 1년의 모든 밤을 "며칠 전에 예약됐나"로 되짚습니다. 어떤 공실이 D일 남았을 때, 과거에 같은 요일 묶음(일~목 / 금·토·공휴일 전날)에서 D일 남았는데 비어 있던 밤들이 결국 몇 %나 팔렸는지가 "팔릴 가능성"입니다. 최근 6개월을 먼저 보고, 비어 있던 밤이 10개 미만이면 1년을 씁니다. 할인 검토 여부는 50% 선 하나로 나눕니다: 통계적으로 50% 위가 확실하면 여유, 추정치가 50% 위지만 확실치 않으면 관심, 추정치가 50% 아래지만 확실치 않으면 검토, 50% 아래가 확실하면 강력검토. "확실"은 표본 수를 반영한 95% 신뢰구간으로 판단합니다.'
                    : 'Every night of the last 12 months is traced back to how many days ahead it was booked. For an empty night D days out, the chance to sell is the share of past nights (same weekday group) still empty D days out that ended up sold. The last 6 months are used first; under 10 empty nights, the last 12. Review levels use one line, 50%: confidently above → Fine; estimate above but uncertain → Watch; estimate below but uncertain → Review; confidently below → Strongly review. "Confident" means the 95% confidence interval (which reflects sample size) clears the line.'}
                </p>
                <p className="type-micro text-muted-foreground mt-2 break-keep">
                  {ko
                    ? `기록: 완료 ${q.completedMonths}개월 · 금액 적힌 예약 ${q.pricedBookings}건 · 자동 연동 비중 ${q.autoSyncedShare}%${q.autoSyncedShare >= 30 ? ' (자동 연동 예약은 접수일이 동기화한 날이라 임박 가능성이 실제보다 높게 보일 수 있어요)' : ''}`
                    : `History: ${q.completedMonths} months · ${q.pricedBookings} priced bookings · ${q.autoSyncedShare}% via iCal${q.autoSyncedShare >= 30 ? ' (iCal bookings carry the sync date, so short-notice chances may read high)' : ''}`}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LastMinuteRadarModal;
