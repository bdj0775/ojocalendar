import { useMemo } from 'react';
import { X } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LabelList,
} from 'recharts';
import { useStore } from '../../store/useStore';
import { useTranslation } from '../../hooks/useTranslation';
import { CHANNEL_COLORS } from '../../pages/DesktopDashboard/chartComponents';
import { getNatColor } from '../../utils/colors';

const MONTHS_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const overlapNights = (ci: string, co: string, y: number, m: number): number => {
  const s = new Date(y, m, 1, 12), e = new Date(y, m + 1, 1, 12);
  const bs = new Date(ci + 'T12:00:00'), be = new Date(co + 'T12:00:00');
  const os = bs > s ? bs : s, oe = be < e ? be : e;
  if (os >= oe) return 0;
  return Math.round((oe.getTime() - os.getTime()) / 86400000);
};

interface Props {
  mode: 'channel' | 'nationality';
  isDark: boolean;
  onClose: () => void;
}

export default function DistributionDetailModal({ mode, isDark, onClose }: Props) {
  const { bookings, properties } = useStore();
  const { language } = useTranslation();
  const ko = language === 'ko';

  const { chartData, keys, colorMap } = useMemo(() => {
    const pid = properties[0]?.id;
    const vb = bookings
      .filter(b => !pid || !b.propertyId || b.propertyId === pid)
      .filter(b => ['confirmed', 'checked in', 'completed'].includes(b.status))
      .map(b => ({
        ...b,
        nat: (b.nationality || '').trim() || 'Unknown',
        ch: (b.channel || 'Direct') as string,
      }));

    if (!vb.length) return { chartData: [], keys: [], colorMap: {} };

    // 전체 날짜 범위
    let minY = 9999, minM = 11;
    vb.forEach(b => {
      const d = new Date(b.checkIn + 'T12:00:00');
      const y = d.getFullYear(), m = d.getMonth();
      if (y < minY || (y === minY && m < minM)) { minY = y; minM = m; }
    });
    const now = new Date(), maxY = now.getFullYear(), maxM = now.getMonth();

    const months: { y: number; m: number }[] = [];
    let cy = minY, cm = minM;
    while (cy < maxY || (cy === maxY && cm <= maxM)) {
      months.push({ y: cy, m: cm });
      if (++cm > 11) { cm = 0; cy++; }
    }

    // 월별 집계 — 막대는 '숙박 박수' 기준, 툴팁용 예약 건수는 별도 보관
    const allKeys = new Set<string>();
    // `${k}` = 해당 키 숙박 박수 (bar height)
    // `c_${k}` = 해당 키 예약 건수 (tooltip)
    // `pc_${k}` = 전월 예약 건수 (MoM diff)
    type Rec = Record<string, number> & { occNights: number; days: number; totalCount: number };
    const mdata = new Map<string, Rec>();
    months.forEach(({ y, m }) =>
      mdata.set(`${y}-${m}`, { occNights: 0, days: new Date(y, m + 1, 0).getDate(), totalCount: 0 }),
    );

    vb.forEach(b => {
      const gk = mode === 'channel' ? b.ch : b.nat;
      allKeys.add(gk);
      months.forEach(({ y, m }) => {
        const n = overlapNights(b.checkIn, b.checkOut, y, m);
        if (n > 0) {
          const r = mdata.get(`${y}-${m}`)!;
          // 박수 (bar)
          r[gk] = (r[gk] || 0) + n;
          r.occNights += n;
          // 건수 (tooltip)
          r[`c_${gk}`] = (r[`c_${gk}`] || 0) + 1;
          r.totalCount++;
        }
      });
    });

    // 키 정렬: 총 박수 오름차순 → 막대 맨 아래 = 가장 큰 값
    const tot: Record<string, number> = {};
    allKeys.forEach(k => mdata.forEach(r => { tot[k] = (tot[k] || 0) + (r[k] || 0); }));
    const skeys = [...allKeys].sort((a, b) => (tot[a] || 0) - (tot[b] || 0));

    const cmap: Record<string, string> = {};
    skeys.forEach(k => { cmap[k] = mode === 'channel' ? (CHANNEL_COLORS[k] || '#94a3b8') : getNatColor(k); });

    const cd = months.map(({ y, m }, i) => {
      const mk = `${y}-${m}`, r = mdata.get(mk)!;
      const totalNights = skeys.reduce((s, k) => s + (r[k] || 0), 0);
      if (totalNights === 0) return null;

      // OCC% = 총 숙박박수 / 해당월 일수 × 100 → 막대 높이와 정확히 비례
      const occPct = Math.min(100, Math.round((r.occNights / r.days) * 100));

      const prev = i > 0 ? mdata.get(`${months[i - 1].y}-${months[i - 1].m}`) : null;
      const prevTotalCount = prev ? prev.totalCount : 0;

      const e: Record<string, unknown> = {
        label: `${MONTHS_EN[m]}'${String(y).slice(2)}`,
        labelKo: `${String(y).slice(2)}.${String(m + 1).padStart(2, '0')}`,
        totalNights, occPct,
        totalCount: r.totalCount,
        prevTotalCount,
      };
      skeys.forEach(k => {
        e[k] = r[k] || 0;                                      // 박수 (bar)
        e[`c_${k}`] = r[`c_${k}`] || 0;                       // 건수 (tooltip)
        e[`pc_${k}`] = prev ? (prev[`c_${k}`] || 0) : null;   // 전월 건수 (MoM)
      });
      return e;
    }).filter(Boolean) as Record<string, unknown>[];

    return { chartData: cd, keys: skeys, colorMap: cmap };
  }, [bookings, properties, mode]);

  const barW = Math.max(26, Math.min(54, Math.floor(760 / Math.max(chartData.length, 1))));
  const scrollW = Math.max(760, chartData.length * (barW + 10) + 80);

  const title = mode === 'channel'
    ? (ko ? '예약 채널별 월간 추이' : 'Monthly by Channel')
    : (ko ? '국적별 월간 예약 추이' : 'Monthly by Nationality');

  const subtitle = ko ? '막대 높이: 숙박 박수 기준 · 꼭짓점: OCC%' : 'Bar = occupied nights · Label = OCC%';

  const gridColor = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)';
  const tickColor = isDark ? '#64748b' : '#94a3b8';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className={`w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col ${isDark ? 'bg-slate-900 border border-slate-700/50' : 'bg-white border border-slate-200'}`}
        style={{ maxHeight: '82vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border flex-shrink-0">
          <div>
            <h2 className="text-[15px] font-bold text-foreground">{title}</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center bg-muted/50 border border-border hover:bg-muted text-muted-foreground transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 pt-5 pb-6" style={{ minHeight: 0 }}>
          {chartData.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
              {ko ? '데이터가 없습니다' : 'No data available'}
            </div>
          ) : (
            <>
              {/* Scrollable chart */}
              <div style={{ overflowX: 'auto', overflowY: 'hidden', paddingBottom: 4 }}>
                <div style={{ width: scrollW, height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 20, right: 12, left: -12, bottom: 0 }}
                      barSize={barW}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                      <XAxis
                        dataKey={ko ? 'labelKo' : 'label'}
                        axisLine={false} tickLine={false}
                        tick={{ fontSize: 10, fill: tickColor, fontWeight: 600 }}
                        interval={0}
                      />
                      <YAxis
                        axisLine={false} tickLine={false} allowDecimals={false}
                        tick={{ fontSize: 10, fill: tickColor }}
                      />
                      <Tooltip
                        cursor={{ fill: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }}
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          const d = payload[0].payload as Record<string, unknown>;
                          const totalCount = d.totalCount as number;
                          const prevTotalCount = (d.prevTotalCount as number) || 0;
                          const occPct = d.occPct as number;
                          const momDiff = prevTotalCount > 0 ? totalCount - prevTotalCount : null;
                          return (
                            <div className={`p-3 rounded-xl border shadow-xl min-w-[180px] ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                              <p className="text-[12px] font-bold text-foreground mb-0.5">
                                {ko ? (d.labelKo as string) : label}
                              </p>
                              <p className="text-[11px] text-muted-foreground mb-2.5 flex items-center gap-1.5 flex-wrap">
                                <span>{ko ? `합계 ${totalCount}건 · OCC ${occPct}%` : `Total ${totalCount} · OCC ${occPct}%`}</span>
                                {momDiff !== null && (
                                  <span className={`font-bold ${momDiff > 0 ? 'text-emerald-500' : momDiff < 0 ? 'text-rose-500' : 'text-muted-foreground'}`}>
                                    ({momDiff > 0 ? '+' : ''}{momDiff}{ko ? '건' : ''})
                                  </span>
                                )}
                              </p>
                              {[...keys].reverse().map(k => {
                                const count = (d[`c_${k}`] as number) || 0;
                                const prevCount = d[`pc_${k}`] as number | null;
                                const df = prevCount !== null ? count - prevCount : null;
                                const nights = (d[k] as number) || 0;
                                if (count === 0 && !prevCount) return null;
                                return (
                                  <div key={k} className="flex items-center gap-2 py-[3px]">
                                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: colorMap[k] }} />
                                    <span className="text-[11px] text-muted-foreground flex-1 truncate max-w-[80px]">{k}</span>
                                    <span className="text-[11px] font-bold text-foreground tabular-nums">
                                      {count}{ko ? '건' : ''}
                                      <span className="font-normal text-muted-foreground"> / {nights}{ko ? '박' : 'n'}</span>
                                    </span>
                                    {df !== null && df !== 0 && (
                                      <span className={`text-[10px] font-semibold tabular-nums ${df > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        {df > 0 ? '+' : ''}{df}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        }}
                      />
                      {keys.map((k, i) => (
                        <Bar
                          key={k}
                          dataKey={k}
                          stackId="a"
                          fill={colorMap[k]}
                          radius={i === keys.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
                        >
                          {/* 마지막(최상단) 바에만 OCC% 레이블 — 막대 높이(박수)와 정확히 비례 */}
                          {i === keys.length - 1 && (
                            <LabelList
                              dataKey="occPct"
                              position="top"
                              formatter={(v: number) => v > 0 ? `${v}%` : ''}
                              style={{ fontSize: 9, fontWeight: 700, fill: tickColor }}
                            />
                          )}
                        </Bar>
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Legend — 가운데 정렬 */}
              <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 mt-4 pt-4 border-t border-border">
                {[...keys].reverse().map(k => (
                  <div key={k} className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                    <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: colorMap[k] }} />
                    {k}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
