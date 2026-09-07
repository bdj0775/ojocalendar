import { useMemo } from 'react';
import { X, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useBookingPace } from '../../hooks/useBookingPace';
import { useDesktopStats } from '../../hooks/useDesktopStats';
import { useTranslation } from '../../hooks/useTranslation';
import type { PaceTarget } from '../../types';

/** 마지막 구간(월중)의 끝 = 그 달의 월말. 달마다 다르므로 런타임에 계산한다. */
const MONTH_END = Symbol('month-end');

/**
 * 히트맵 리드타임 구간 — [한글 라벨, 영문 라벨, 구간 끝 leadDay].
 * 각 칸 = (그 구간 끝 시점의 누적 점유율) − (직전 구간 끝 시점의 누적 점유율).
 * 첫 칸은 시작점이 없어 "D-90까지의 누적" 전부가 들어가므로,
 * 칸들의 합이 그 달 총 점유율과 정확히 일치한다.
 */
const BUCKETS: [string, string, number | typeof MONTH_END][] = [
  ['D-90+', 'D-90+', 90],
  ['D-90', 'D-90', 60],
  ['D-60', 'D-60', 45],
  ['D-45', 'D-45', 30],
  ['D-30', 'D-30', 21],
  ['D-21', 'D-21', 14],
  ['D-14', 'D-14', 7],
  ['D-7', 'D-7', 0],
  ['월중', 'In-month', MONTH_END],
];

interface MonthSignal {
  target: PaceTarget;
  /** 오늘 시점 표기 (D-25 / D+5) */
  dLabel: string;
  otb: number;
  /** 같은 시점 과거 평균 (완료된 달만) */
  histAvg: number | null;
  histCount: number;
  diff: number | null;
  status: 'fast' | 'slow' | 'normal';
  predictedOcc: number | null;
}

interface PaceDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark?: boolean;
}

const fmtLead = (v: number) => (v < 0 ? `D+${-v}` : `D-${v}`);

const PaceDetailsModal = ({ isOpen, onClose, isDark = false }: PaceDetailsModalProps) => {
  const pace = useBookingPace();
  const stats = useDesktopStats();
  const { language } = useTranslation();
  const ko = language === 'ko';

  const { targets, roomCount } = pace;

  /** 예측(픽업6) 값을 월 라벨로 찾아온다 */
  const predOf = useMemo(() => {
    const map = new Map<string, number | null>();
    stats.monthlyTrends.forEach(t => {
      map.set(`${t.year}-${t.monthEn}`, t.predictedOcc);
    });
    return (t: PaceTarget) => {
      const en = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][t.date.getMonth()];
      return map.get(`${t.date.getFullYear()}-${en}`) ?? null;
    };
  }, [stats.monthlyTrends]);

  /** 어떤 leadDay 시점에서 그 달의 누적 점유율(%)을 재현 */
  const occAt = (t: PaceTarget, leadDay: number): number => {
    const idxOffset = t.dailyBookedNights.length - 181;
    const from = Math.max(leadDay, -(t.daysInMonth - 1));
    let nights = 0;
    for (let d = 180; d >= from; d--) nights += t.dailyBookedNights[d + idxOffset] || 0;
    return Math.min(100, (nights / (t.daysInMonth * roomCount)) * 100);
  };

  /** 완료된 달인가 (월말이 이미 지났는가) */
  const isCompleted = (t: PaceTarget) => t.cutoffDay <= -(t.daysInMonth - 1);

  // ── ① 현재 달 진단 + ② 3개월 신호등 ───────────────────────────
  const signals = useMemo<MonthSignal[]>(() => {
    const upcoming = targets.filter(t => t.offset >= 0 && t.offset <= 2);
    const completedTargets = targets.filter(isCompleted);

    return upcoming.map(t => {
      const leadDay = t.cutoffDay;
      const otb = occAt(t, leadDay);
      // 비교 대상은 "완료된 달"만. 예전 모달은 미래 달까지 섞어 평균이 왜곡됐다.
      const peers = completedTargets.filter(p => p.key !== t.key);
      const histAvg = peers.length
        ? peers.reduce((s, p) => s + occAt(p, leadDay), 0) / peers.length
        : null;
      const diff = histAvg != null ? otb - histAvg : null;
      const status: MonthSignal['status'] =
        diff == null ? 'normal' : diff > 5 ? 'fast' : diff < -5 ? 'slow' : 'normal';
      return {
        target: t, dLabel: fmtLead(leadDay), otb,
        histAvg, histCount: peers.length, diff, status,
        predictedOcc: predOf(t),
      };
    });
  }, [targets, roomCount, predOf]);

  const current = signals[0];
  const currentTarget = targets.find(t => t.isCurrent);
  /** 진행 중인 달의 남은 공실 일수 (예상 마감 기준) */
  const emptyDays = current && current.predictedOcc != null && currentTarget
    ? Math.max(0, Math.round(((100 - current.predictedOcc) / 100) * currentTarget.daysInMonth))
    : null;

  // ── ③ 픽업 히트맵 ────────────────────────────────────────────
  const heatmap = useMemo(() => {
    const rows = targets
      .filter(t => t.offset <= 0)   // 완료·진행 중인 달만 (미래는 아직 유입 중)
      .map(t => {
        // 누적 점유율의 구간별 증분. 이전 구간 끝을 다음 구간 시작으로 이어받아
        // 칸 합계가 그 달 총 점유율과 정확히 일치하게 한다.
        const monthEnd = -(t.daysInMonth - 1);
        let prev = 0;
        const cells = BUCKETS.map(([, , to]) => {
          const end = occAt(t, to === MONTH_END ? monthEnd : Math.max(to, monthEnd));
          const gain = Math.max(0, end - prev);
          prev = end;
          return gain;
        });
        return { target: t, cells, total: occAt(t, -(t.daysInMonth - 1)) };
      });
    const max = Math.max(1, ...rows.flatMap(r => r.cells));
    return { rows, max };
  }, [targets, roomCount]);

  if (!isOpen) return null;

  const money = (v: number) =>
    ko ? `₩${Math.round(v).toLocaleString()}` : `$${Math.round(v).toLocaleString()}`;

  const statusChip = (s: MonthSignal['status']) =>
    s === 'fast' ? 'bg-success/12 text-success'
      : s === 'slow' ? 'bg-destructive/12 text-destructive'
      : 'bg-muted text-muted-foreground';

  const cellStyle = (v: number) => {
    const ratio = Math.min(1, v / heatmap.max);
    if (v <= 0) return { background: 'transparent', color: 'var(--muted-foreground)' };
    return {
      background: `color-mix(in srgb, var(--primary) ${Math.round(12 + ratio * 68)}%, transparent)`,
      color: ratio > 0.55 ? 'var(--primary-foreground)' : 'var(--foreground)',
    };
  };

  const sectionCls = 'bg-card border border-border rounded-card p-4 max-[640px]:p-3.5 sm:p-5 shadow-card-xs';
  const sectionTitleCls = 'text-[13px] font-bold text-foreground';
  const sectionDescCls = 'text-[11px] text-muted-foreground mt-0.5 break-keep';

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-overlay flex justify-center items-center p-4 max-[640px]:p-0 opacity-0 animate-[fadeIn_0.25s_forwards]"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-[980px] max-h-[88vh] max-[640px]:max-h-full max-[640px]:h-full max-[640px]:rounded-none bg-background border border-border rounded-sheet shadow-modal flex flex-col overflow-hidden translate-y-4 animate-[slideUp_0.35s_cubic-bezier(0.16,1,0.3,1)_forwards]"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4 px-6 max-[640px]:px-4 pt-5 pb-4 border-b border-border flex-shrink-0">
          <div>
            <h2 className="text-[15px] font-bold text-foreground">
              {ko ? '예약 속도 분석' : 'Booking Pace Analysis'}
            </h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {ko
                ? '예약이 언제 들어오는지, 지금이 빠른지 느린지 살펴봅니다'
                : 'When bookings arrive, and whether you are ahead or behind'}
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
          {/* ── ① 한 줄 진단 ── */}
          {current && (
            <div className="rounded-card border border-primary/25 bg-primary/[0.06] p-5 max-[640px]:p-4">
              <div className="text-[10px] font-bold text-primary uppercase tracking-wider mb-2">
                {ko ? '이번 달 진단' : "This month"}
              </div>
              <p className="text-[16px] max-[640px]:text-[14px] font-bold text-foreground leading-snug break-keep">
                {current.diff == null
                  ? (ko
                    ? `${current.target.label}은 현재 ${current.otb.toFixed(1)}% 예약됐어요`
                    : `${current.target.label} is ${current.otb.toFixed(1)}% booked`)
                  : (ko
                    ? <>{current.target.label}은 지금 <span className="text-primary">{current.otb.toFixed(1)}%</span> — 완료된 달들의 같은 시점 평균보다{' '}
                      <span className={current.diff >= 0 ? 'text-success' : 'text-destructive'}>
                        {Math.abs(current.diff).toFixed(1)}%p {current.diff >= 0 ? '빠릅니다' : '느립니다'}
                      </span></>
                    : <>{current.target.label} is at <span className="text-primary">{current.otb.toFixed(1)}%</span>, {' '}
                      <span className={current.diff >= 0 ? 'text-success' : 'text-destructive'}>
                        {Math.abs(current.diff).toFixed(1)}pp {current.diff >= 0 ? 'ahead of' : 'behind'}
                      </span> the average of completed months at this point</>)}
              </p>
              <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2.5 text-[11px] text-muted-foreground">
                <span>{ko ? '시점' : 'Point'} <b className="text-foreground tabular-nums">{current.dLabel}</b></span>
                {current.predictedOcc != null && (
                  <span>{ko ? '월말 예상' : 'Forecast'} <b className="text-success tabular-nums">{current.predictedOcc}%</b></span>
                )}
                {emptyDays != null && (
                  <span>{ko ? '예상 공실' : 'Expected vacant'} <b className="text-foreground tabular-nums">{emptyDays}{ko ? '일' : 'd'}</b></span>
                )}
              </div>
            </div>
          )}

          {/* ── ② 다가오는 3개월 신호등 ── */}
          <div className={sectionCls}>
            <div className="mb-3.5">
              <h3 className={sectionTitleCls}>{ko ? '다가오는 3개월' : 'Next 3 months'}</h3>
              <p className={sectionDescCls}>
                {ko
                  ? '각 달의 현재 예약률을, 완료된 달들이 같은 시점에 보였던 평균과 비교합니다'
                  : "Each month's current pace vs. what completed months showed at the same point"}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 max-[860px]:grid-cols-1">
              {signals.map(s => (
                <div
                  key={s.target.key}
                  className={`rounded-inner border p-3.5 ${s.target.isCurrent ? 'border-primary/40 bg-primary/[0.04]' : 'border-border bg-muted/40'}`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="text-[12px] font-bold text-foreground">{s.target.label}</span>
                    <span className="text-[10px] font-semibold text-muted-foreground tabular-nums">{s.dLabel}</span>
                  </div>

                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[22px] font-bold text-foreground tabular-nums leading-none">
                      {s.otb.toFixed(1)}<span className="text-[13px] font-semibold">%</span>
                    </span>
                    {s.diff != null && (
                      <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-chip ${statusChip(s.status)}`}>
                        {s.status === 'fast' && <TrendingUp size={11} />}
                        {s.status === 'slow' && <TrendingDown size={11} />}
                        {s.status === 'normal' && <Minus size={11} />}
                        {s.diff >= 0 ? '+' : ''}{s.diff.toFixed(1)}%p
                      </span>
                    )}
                  </div>

                  <div className="mt-2.5 pt-2.5 border-t border-border/60 flex flex-col gap-1 text-[10px]">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {ko ? `같은 시점 평균 (${s.histCount}개 달)` : `Avg at same point (${s.histCount})`}
                      </span>
                      <span className="font-semibold text-foreground tabular-nums">
                        {s.histAvg != null ? `${s.histAvg.toFixed(1)}%` : '–'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{ko ? '월말 예상' : 'Forecast'}</span>
                      <span className="font-bold text-success tabular-nums">
                        {s.predictedOcc != null ? `${s.predictedOcc}%` : '–'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── ③ 픽업 히트맵 ── */}
          <div className={sectionCls}>
            <div className="mb-3.5">
              <h3 className={sectionTitleCls}>{ko ? '예약이 들어오는 시기' : 'When bookings arrive'}</h3>
              <p className={sectionDescCls}>
                {ko
                  ? '각 구간에서 점유율이 몇 %p 올랐는지 — 진한 칸이 예약이 몰리는 시기입니다'
                  : 'Occupancy gained in each window — darker cells are when bookings concentrate'}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[11px] min-w-[620px]">
                <thead>
                  <tr>
                    <th className="text-left font-semibold text-muted-foreground pb-2 pr-3 whitespace-nowrap">
                      {ko ? '월' : 'Month'}
                    </th>
                    {BUCKETS.map(([kLabel, enLabel]) => (
                      <th key={kLabel} className="font-semibold text-muted-foreground pb-2 px-1 text-center whitespace-nowrap">
                        {ko ? kLabel : enLabel}
                      </th>
                    ))}
                    <th className="font-semibold text-muted-foreground pb-2 pl-3 text-right whitespace-nowrap">
                      {ko ? '합계' : 'Total'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {heatmap.rows.map(({ target: t, cells, total }) => (
                    <tr key={t.key}>
                      <td className={`py-1 pr-3 whitespace-nowrap font-semibold ${t.isCurrent ? 'text-primary' : 'text-foreground'}`}>
                        {t.label}
                        {t.isCurrent && (
                          <span className="ml-1.5 text-[9px] font-bold text-primary/80">
                            {ko ? '진행중' : 'now'}
                          </span>
                        )}
                      </td>
                      {cells.map((v, i) => (
                        <td key={i} className="py-1 px-1">
                          <div
                            className="rounded-chip h-7 flex items-center justify-center font-semibold tabular-nums transition-colors"
                            style={cellStyle(v)}
                          >
                            {v >= 0.5 ? v.toFixed(0) : ''}
                          </div>
                        </td>
                      ))}
                      <td className="py-1 pl-3 text-right font-bold text-foreground tabular-nums whitespace-nowrap">
                        {total.toFixed(0)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2.5 break-keep">
              {ko
                ? '숫자 단위는 %p. 진행 중인 달은 오늘까지의 유입만 반영됩니다.'
                : 'Values in %p. The in-progress month reflects arrivals up to today only.'}
            </p>
          </div>

          {/* ── ④ 월별 상세 ── */}
          <div className={`${sectionCls} p-0 overflow-hidden`}>
            <div className="px-5 max-[640px]:px-3.5 pt-5 max-[640px]:pt-4 pb-3.5">
              <h3 className={sectionTitleCls}>{ko ? '월별 상세' : 'Monthly detail'}</h3>
              <p className={sectionDescCls}>
                {ko
                  ? '시점별 누적 예약률과 실적. 아직 끝나지 않은 달은 현재까지의 값입니다'
                  : 'Cumulative pace by point and results. Unfinished months show current values'}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[11px] min-w-[680px]">
                <thead>
                  <tr className="bg-muted/60">
                    {[
                      ko ? '월' : 'Month', 'D-60', 'D-30', 'D-14',
                      ko ? '현재/최종' : 'Current/Final',
                      ko ? '월말 예상' : 'Forecast',
                      ko ? '매출' : 'Revenue',
                      ko ? '순이익' : 'Profit',
                    ].map((h, i) => (
                      <th
                        key={h}
                        className={`py-2.5 px-3 font-semibold text-muted-foreground whitespace-nowrap border-b border-border ${i === 0 ? 'text-left' : 'text-right'}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {targets.map(t => {
                    const done = isCompleted(t);
                    const pred = predOf(t);
                    const cell = (lead: number) =>
                      t.cutoffDay <= lead ? `${occAt(t, lead).toFixed(0)}%` : '–';
                    return (
                      <tr key={t.key} className={t.isCurrent ? 'bg-primary/[0.05]' : ''}>
                        <td className="py-2.5 px-3 text-left font-semibold text-foreground whitespace-nowrap border-b border-border/60">
                          <span className="inline-flex items-center gap-1.5">
                            {t.label}
                            {t.isCurrent && (
                              <span className="bg-primary text-primary-foreground text-[9px] px-1.5 py-0.5 rounded-chip font-bold">
                                {ko ? '이번달' : 'now'}
                              </span>
                            )}
                            {!done && !t.isCurrent && (
                              <span className="bg-muted text-muted-foreground text-[9px] px-1.5 py-0.5 rounded-chip font-semibold">
                                {ko ? '예정' : 'upcoming'}
                              </span>
                            )}
                          </span>
                        </td>
                        {[60, 30, 14].map(lead => (
                          <td key={lead} className="py-2.5 px-3 text-right text-muted-foreground tabular-nums border-b border-border/60">
                            {cell(lead)}
                          </td>
                        ))}
                        <td className="py-2.5 px-3 text-right font-bold text-foreground tabular-nums border-b border-border/60">
                          {t.finalOcc.toFixed(0)}%
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-success tabular-nums border-b border-border/60">
                          {done ? '–' : pred != null ? `${pred}%` : '–'}
                        </td>
                        <td className="py-2.5 px-3 text-right text-muted-foreground tabular-nums border-b border-border/60">
                          {money(t.revenue)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-foreground tabular-nums border-b border-border/60">
                          {money(t.profit)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaceDetailsModal;
