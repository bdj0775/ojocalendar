import { useMemo, useState } from 'react';
import { X, Info } from 'lucide-react';
import { useLeadTimeReport } from '../../hooks/useLeadTimeReport';
import type { LeadTimeGroupStat } from '../../hooks/useLeadTimeReport';
import { useTranslation } from '../../hooks/useTranslation';
import { getNatColor } from '../../utils/colors';
import { CHANNEL_COLORS } from '../../pages/DesktopDashboard/chartComponents';

const GUEST_COLORS: Record<string, string> = {
  '1': '#94a3b8',
  '2': '#6366f1',
  '3': 'var(--primary)',
  '4': '#ec4899',
  '5+': '#f59e0b',
};

type GroupMode = 'channel' | 'nationality' | 'guests';

interface LeadTimeDetailModalProps {
  onClose: () => void;
  isDark?: boolean;
}

const LeadTimeDetailModal = ({ onClose, isDark = false }: LeadTimeDetailModalProps) => {
  const { language } = useTranslation();
  const ko = language === 'ko';
  const r = useLeadTimeReport();
  const [mode, setMode] = useState<GroupMode>('channel');

  const groups: LeadTimeGroupStat[] =
    mode === 'channel' ? r.byChannel
      : mode === 'nationality' ? r.byNationality
      : r.byGuests;

  const groupColor = (key: string) =>
    mode === 'channel' ? (CHANNEL_COLORS[key] ?? 'var(--muted-foreground)')
      : mode === 'nationality' ? getNatColor(key)
      : (GUEST_COLORS[key] ?? 'var(--muted-foreground)');

  const groupLabel = (key: string) => (mode === 'guests' ? `${key}${ko ? '인' : 'G'}` : key);

  // 막대 스케일은 가장 긴 p90에 맞춘다 (그룹 간 길이 비교가 목적)
  const maxScale = Math.max(1, ...groups.map(g => g.p90));
  const maxHist = Math.max(1, ...r.histogram.map(h => h.pct));

  /** 월별 추이 — 완료된 달과 집계 중인 달을 구분해 보여준다 */
  const trend = useMemo(() => {
    const rows = r.monthlyTrend.filter(m => m.count >= 2).slice(-14);
    const max = Math.max(1, ...rows.map(m => m.median));
    return { rows, max };
  }, [r.monthlyTrend]);

  const hasData = r.totalBookings > 0;

  const sectionCls = 'bg-card border border-border rounded-card p-4 max-[640px]:p-3.5 sm:p-5 shadow-card-xs';
  const titleCls = 'text-[13px] font-bold text-foreground';
  const descCls = 'text-[11px] text-muted-foreground mt-0.5 break-keep';

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
            <h2 className="text-[15px] font-bold text-foreground">
              {ko ? '리드타임 분석' : 'Lead Time Analysis'}
            </h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {ko
                ? '손님이 체크인 며칠 전에 예약하는지 — 프로모션 시점을 정하는 기준'
                : 'How far ahead guests book — the basis for promotion timing'}
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
          {!hasData ? (
            <div className={`${sectionCls} text-center py-10`}>
              <p className="text-[12px] text-muted-foreground">
                {ko ? '완료된 달의 예약 데이터가 아직 없습니다' : 'No completed-month booking data yet'}
              </p>
            </div>
          ) : (
            <>
              {/* ── ① 핵심 지표 ── */}
              <div className="rounded-card border border-primary/25 bg-primary/[0.06] p-5 max-[640px]:p-4">
                <div className="text-[10px] font-bold text-primary uppercase tracking-wider mb-3">
                  {ko ? `완료된 최근 ${r.baselineMonths}개월 기준` : `Last ${r.baselineMonths} completed months`}
                </div>
                <div className="grid grid-cols-3 gap-4 max-[480px]:grid-cols-1 max-[480px]:gap-3">
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-[28px] font-bold text-foreground tabular-nums leading-none">{r.baselineMedian}</span>
                      <span className="text-[12px] font-semibold text-muted-foreground">{ko ? '일' : 'd'}</span>
                    </div>
                    <div className="text-[10px] font-semibold text-foreground mt-1">{ko ? '중앙값' : 'Median'}</div>
                    <div className="text-[10px] text-muted-foreground leading-snug break-keep">
                      {ko ? '절반은 이보다 일찍 예약' : 'Half book earlier than this'}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-[28px] font-bold text-foreground tabular-nums leading-none">{r.baselineAvg}</span>
                      <span className="text-[12px] font-semibold text-muted-foreground">{ko ? '일' : 'd'}</span>
                    </div>
                    <div className="text-[10px] font-semibold text-foreground mt-1">{ko ? '평균' : 'Average'}</div>
                    <div className="text-[10px] text-muted-foreground leading-snug break-keep">
                      {ko ? '아주 이른 예약에 끌려 올라감' : 'Pulled up by very early bookings'}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-[28px] font-bold text-foreground tabular-nums leading-none">{r.baselineP90}</span>
                      <span className="text-[12px] font-semibold text-muted-foreground">{ko ? '일' : 'd'}</span>
                    </div>
                    <div className="text-[10px] font-semibold text-foreground mt-1">{ko ? '상위 10%' : 'Top 10%'}</div>
                    <div className="text-[10px] text-muted-foreground leading-snug break-keep">
                      {ko ? '가장 이른 10%가 이 시점에 예약' : 'The earliest 10% book by then'}
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mt-3 pt-3 border-t border-primary/15 break-keep">
                  {ko
                    ? `표본 ${r.baselineTotal}건. 아직 끝나지 않은 달은 "늦게 들어올 예약"이 빠져 있어 리드타임이 실제보다 길게 보이므로 제외했습니다.`
                    : `${r.baselineTotal} bookings. Unfinished months are excluded — their late bookings haven't arrived yet, which inflates lead time.`}
                </p>
              </div>

              {/* ── ② 분포 히스토그램 ── */}
              <div className={sectionCls}>
                <div className="mb-3.5">
                  <h3 className={titleCls}>{ko ? '리드타임 분포' : 'Distribution'}</h3>
                  <p className={descCls}>
                    {ko
                      ? '예약이 어느 구간에 몰리는지 — 봉우리가 프로모션을 걸 시점입니다'
                      : 'Where bookings cluster — the peaks are when to run promotions'}
                  </p>
                </div>
                <div className="flex flex-col gap-1.5">
                  {r.histogram.map(h => (
                    <div key={h.label} className="flex items-center gap-2.5">
                      <span className="text-[10px] text-muted-foreground tabular-nums w-[68px] flex-shrink-0 text-right">
                        {ko ? h.label : h.labelEn}
                      </span>
                      <div className="flex-1 h-4 rounded-chip bg-muted/40 overflow-hidden">
                        <div
                          className="h-full rounded-chip transition-all duration-500"
                          style={{ width: `${(h.pct / maxHist) * 100}%`, background: 'var(--primary)', opacity: 0.85 }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-foreground tabular-nums w-[52px] flex-shrink-0">
                        {h.pct}% <span className="font-normal text-muted-foreground">({h.count})</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── ③ 그룹별 비교 ── */}
              <div className={sectionCls}>
                <div className="flex items-start justify-between gap-3 mb-3.5 flex-wrap">
                  <div>
                    <h3 className={titleCls}>{ko ? '그룹별 비교' : 'By group'}</h3>
                    <p className={descCls}>
                      {ko
                        ? '막대 = 중앙값, 옅은 부분 = 상위 10% 지점까지'
                        : 'Bar = median, lighter part extends to the 90th percentile'}
                    </p>
                  </div>
                  <div className="flex rounded-inner overflow-hidden border border-border flex-shrink-0">
                    {(['channel', 'nationality', 'guests'] as const).map(m => (
                      <button
                        key={m}
                        className={`px-2.5 py-1 text-[10px] font-semibold transition-colors ${mode === m ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                        onClick={() => setMode(m)}
                      >
                        {m === 'channel' ? (ko ? '채널' : 'Channel')
                          : m === 'nationality' ? (ko ? '국적' : 'Nationality')
                          : (ko ? '인원' : 'Guests')}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2.5">
                  {groups.map(g => (
                    <div key={g.key}>
                      <div className="flex items-baseline justify-between gap-2 mb-1">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: groupColor(g.key) }} />
                          {groupLabel(g.key)}
                          <span className="text-[9px] font-normal text-muted-foreground">({g.count}{ko ? '건' : ''})</span>
                        </span>
                        <span className="text-[11px] font-bold text-foreground tabular-nums">
                          {g.median}{ko ? '일' : 'd'}
                          <span className="text-[9px] font-normal text-muted-foreground ml-1">
                            ~{g.p90}{ko ? '일' : 'd'}
                          </span>
                        </span>
                      </div>
                      <div className="relative h-2.5 w-full rounded-full bg-muted/40 overflow-hidden">
                        {/* p90까지 옅게 */}
                        <div
                          className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                          style={{ width: `${(g.p90 / maxScale) * 100}%`, background: groupColor(g.key), opacity: 0.22 }}
                        />
                        {/* 중앙값까지 진하게 */}
                        <div
                          className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                          style={{ width: `${(g.median / maxScale) * 100}%`, background: groupColor(g.key) }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── ④ 월별 추이 ── */}
              <div className={sectionCls}>
                <div className="mb-3.5">
                  <h3 className={titleCls}>{ko ? '월별 추이' : 'Monthly trend'}</h3>
                  <p className={descCls}>
                    {ko
                      ? '체크인 월별 리드타임 중앙값. 손님들이 점점 일찍 예약하는지 볼 수 있습니다'
                      : 'Median lead time by check-in month — whether guests are booking earlier over time'}
                  </p>
                </div>

                <div className="flex items-end gap-1 h-[120px] overflow-x-auto pb-1">
                  {trend.rows.map(m => (
                    <div key={`${m.year}-${m.month}`} className="flex flex-col items-center gap-1 flex-1 min-w-[34px] h-full justify-end">
                      <span className={`text-[9px] font-bold tabular-nums ${m.isComplete ? 'text-foreground' : 'text-muted-foreground/60'}`}>
                        {m.median}
                      </span>
                      <div
                        className="w-full rounded-t-chip transition-all duration-500"
                        style={{
                          height: `${Math.max(4, (m.median / trend.max) * 82)}px`,
                          background: m.isComplete ? 'var(--primary)' : 'var(--muted-foreground)',
                          opacity: m.isComplete ? 0.85 : 0.25,
                        }}
                      />
                      <span className={`text-[9px] tabular-nums whitespace-nowrap ${m.isComplete ? 'text-muted-foreground' : 'text-muted-foreground/50'}`}>
                        {m.label}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex items-start gap-1.5 mt-3 pt-3 border-t border-border/60">
                  <Info size={12} className="text-muted-foreground flex-shrink-0 mt-[1px]" />
                  <p className="text-[10px] text-muted-foreground leading-snug break-keep">
                    {ko
                      ? '흐린 막대는 아직 끝나지 않은 달입니다. 임박 예약이 아직 안 들어와 실제보다 길게 나오니 참고만 하세요.'
                      : "Faded bars are unfinished months. Last-minute bookings haven't arrived yet, so they read longer than reality."}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeadTimeDetailModal;
