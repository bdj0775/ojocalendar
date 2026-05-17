import { useMemo } from 'react';
import { X, TrendingUp, TrendingDown, Minus, Trophy, Sparkles } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { useBookingPace } from '../../hooks/useBookingPace';
import type { PaceTarget } from '../../types';

const COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e',
  '#06b6d4', '#3b82f6', '#6366f1', 'var(--primary)', '#d946ef',
  '#ec4899', '#f43f5e',
];

interface PaceJudgment {
  monthLabel: string;
  judgment: string;
  status: 'fast' | 'slow' | 'normal';
  currentOcc: number;
  avgOcc: number;
  diff: number;
}

interface PaceInsights {
  fastest: PaceTarget;
  secondFastest?: PaceTarget;
  slowest: PaceTarget;
  judgments: PaceJudgment[];
}

interface PaceDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PaceDetailsModal = ({ isOpen, onClose }: PaceDetailsModalProps) => {
  const { paceData, targets, todayLeadDay } = useBookingPace();

  const insights = useMemo<PaceInsights | null>(() => {
    if (!targets || targets.length === 0) return null;

    const rankedTargets = [...targets]
      .map(t => {
        const plottedDays = 121 - t.cutoffDay;
        const paceScore = plottedDays > 0 ? t.auc / plottedDays : 0;
        return { ...t, paceScore };
      })
      .filter(t => t.paceScore > 0)
      .sort((a, b) => b.paceScore - a.paceScore);

    const fastest = rankedTargets[0];
    const secondFastest = rankedTargets[1];
    const slowest = rankedTargets[rankedTargets.length - 1];

    const currentMonthIdx = targets.findIndex(t => t.isCurrent);

    const getPaceJudgment = (offset: number): PaceJudgment | null => {
      const tIdx = currentMonthIdx + offset;
      if (tIdx < 0 || tIdx >= targets.length) return null;
      const t = targets[tIdx];
      const dayToCheck = t.cutoffDay;
      if (dayToCheck < 0 || dayToCheck > 120) return null;

      let sumOcc = 0;
      let count = 0;
      targets.forEach(otherT => {
        if (otherT.key !== t.key && otherT.cutoffDay <= dayToCheck) {
          const occ = paceData.find(d => d.leadDay === dayToCheck)?.[otherT.key];
          if (occ != null) { sumOcc += occ as number; count++; }
        }
      });

      const avgOcc = count > 0 ? sumOcc / count : 0;
      const currentOcc = (paceData.find(d => d.leadDay === dayToCheck)?.[t.key] as number) || 0;
      const diff = currentOcc - avgOcc;

      let judgment = '평균적인 속도입니다 ➖';
      let status: 'fast' | 'slow' | 'normal' = 'normal';
      if (diff > 5) { judgment = '평균보다 빠르게 차고 있어요 📈'; status = 'fast'; }
      else if (diff < -5) { judgment = '평균보다 느리게 차고 있어요 📉'; status = 'slow'; }

      return { monthLabel: t.label, judgment, status, currentOcc, avgOcc, diff };
    };

    return {
      fastest,
      secondFastest,
      slowest,
      judgments: [0, 1, 2].map(i => getPaceJudgment(i)).filter((j): j is PaceJudgment => j !== null),
    };
  }, [targets, paceData]);

  if (!isOpen) return null;

  const fmt = (amt: number) => new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amt);

  const statusBadgeCls = (status: 'fast' | 'slow' | 'normal') => {
    if (status === 'fast') return 'bg-emerald-100 text-emerald-700';
    if (status === 'slow') return 'bg-red-100 text-red-700';
    return 'bg-slate-100 text-slate-500';
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-overlay flex items-center justify-center">
      <div className="bg-white w-[90%] max-w-[1200px] max-h-[90vh] rounded-2xl flex flex-col overflow-hidden shadow-modal animate-[slideUp_0.3s_ease-out]">
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h2 className="text-xl font-bold text-slate-900">예약 속도 상세 분석 (D-120 Pace Analytics)</h2>
          <button className="p-2 rounded-lg text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition-all" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="p-8 overflow-y-auto flex flex-col gap-8">
          {/* Chart */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={paceData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="leadDay" type="number" domain={[0, 120]} reversed tickFormatter={v => `D-${v}`} stroke="#94a3b8" fontSize={12} tickCount={13} />
                <YAxis tickFormatter={v => `${v}%`} stroke="#94a3b8" fontSize={12} />
                <Tooltip labelFormatter={v => `D-${v}`} formatter={(value: number) => [`${value}%`, '점유율']} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                {targets && targets.map((t, idx) => (
                  <Line key={t.key} type="monotone" dataKey={t.key} name={t.label} stroke={COLORS[idx % COLORS.length]} strokeWidth={t.isCurrent ? 3 : 1.5} dot={false} connectNulls />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Insights Grid */}
          {insights && (
            <div className="grid grid-cols-2 gap-6 max-[1024px]:grid-cols-1">
              {/* Speed Ranking */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-5 pb-3 border-b border-slate-50">
                  <Trophy size={18} color="#f59e0b" />
                  <h3 className="text-base font-semibold text-slate-800">속도 랭킹 & 수익 비교</h3>
                </div>
                <div className="flex flex-col gap-4">
                  {insights.fastest && (
                    <div className="flex gap-4 items-start p-3 bg-slate-50 rounded-lg">
                      <span className="bg-amber-400 text-white text-xs font-bold px-2 py-1 rounded-lg whitespace-nowrap">1위</span>
                      <div className="flex-1 text-sm text-slate-600">
                        <strong className="text-slate-900 text-base">{insights.fastest.label}</strong> (가장 빠른 예약)
                        <div className="flex gap-4 mt-2 text-[13px] text-slate-500">
                          <span>최종 점유율: {insights.fastest.finalOcc}%</span>
                          <span>매출: {fmt(insights.fastest.revenue)}</span>
                          <span className="text-emerald-600 font-semibold">순이익: {fmt(insights.fastest.profit)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  {insights.secondFastest && (
                    <div className="flex gap-4 items-start p-3 bg-slate-50 rounded-lg">
                      <span className="bg-slate-400 text-white text-xs font-bold px-2 py-1 rounded-lg whitespace-nowrap">2위</span>
                      <div className="flex-1 text-sm text-slate-600">
                        <strong className="text-slate-900 text-base">{insights.secondFastest.label}</strong>
                        <div className="flex gap-4 mt-2 text-[13px] text-slate-500">
                          <span>최종 점유율: {insights.secondFastest.finalOcc}%</span>
                          <span>매출: {fmt(insights.secondFastest.revenue)}</span>
                          <span className="text-emerald-600 font-semibold">순이익: {fmt(insights.secondFastest.profit)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  {insights.slowest && (
                    <div className="flex gap-4 items-start p-3 bg-slate-50 rounded-lg">
                      <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-lg whitespace-nowrap">최하위</span>
                      <div className="flex-1 text-sm text-slate-600">
                        <strong className="text-slate-900 text-base">{insights.slowest.label}</strong> (가장 느린 예약)
                        <div className="flex gap-4 mt-2 text-[13px] text-slate-500">
                          <span>최종 점유율: {insights.slowest.finalOcc}%</span>
                          <span>매출: {fmt(insights.slowest.revenue)}</span>
                          <span className="text-emerald-600 font-semibold">순이익: {fmt(insights.slowest.profit)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* AI Judgment */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-5 pb-3 border-b border-slate-50">
                  <Sparkles size={18} className="text-primary" />
                  <h3 className="text-base font-semibold text-slate-800">AI 다가오는 예약 속도 판단</h3>
                </div>
                <div className="flex flex-col gap-4">
                  {insights.judgments.map((j, idx) => (
                    <div key={idx} className="p-4 bg-slate-50 rounded-lg border-l-4 border-l-slate-300">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold text-slate-900 text-[15px]">{['이번달', '다음달', '다다음달'][idx]} ({j.monthLabel})</span>
                        <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg ${statusBadgeCls(j.status)}`}>
                          {j.status === 'fast' && <TrendingUp size={14} />}
                          {j.status === 'slow' && <TrendingDown size={14} />}
                          {j.status === 'normal' && <Minus size={14} />}
                          {j.judgment.replace(/[^가-힣\s]/g, '').trim()}
                        </span>
                      </div>
                      <div className="text-[13px] text-slate-500">
                        현재 점유율 {j.currentOcc}% (동일 시점 과거 평균: {j.avgOcc.toFixed(1)}%)
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Data Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  {['월 (Month)', 'D-120', 'D-90', 'D-60', 'D-30', '최종 점유율', '총 매출 (Revenue)', '순이익 (Profit)'].map((h, i) => (
                    <th key={i} className={`bg-slate-50 p-4 font-semibold text-slate-500 border-b border-slate-200 ${i === 0 ? 'text-left' : 'text-right'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {targets && targets.map(t => {
                  const d120 = paceData.find(d => d.leadDay === 120)?.[t.key];
                  const d90 = paceData.find(d => d.leadDay === 90)?.[t.key];
                  const d60 = paceData.find(d => d.leadDay === 60)?.[t.key];
                  const d30 = paceData.find(d => d.leadDay === 30)?.[t.key];
                  return (
                    <tr key={t.key} className={t.isCurrent ? 'bg-blue-50' : 'hover:bg-slate-50'}>
                      <td className="p-4 text-left font-semibold text-slate-900 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          {t.label}
                          {t.isCurrent && <span className="bg-blue-500 text-white text-[11px] px-1.5 py-0.5 rounded font-bold">이번달</span>}
                        </div>
                      </td>
                      {[d120, d90, d60, d30].map((v, i) => (
                        <td key={i} className="p-4 text-right text-slate-600 border-b border-slate-100">{v != null ? `${v}%` : '-'}</td>
                      ))}
                      <td className="p-4 text-right font-bold text-slate-900 border-b border-slate-100">{t.finalOcc}%</td>
                      <td className="p-4 text-right text-slate-500 border-b border-slate-100">{fmt(t.revenue)}</td>
                      <td className="p-4 text-right text-emerald-600 font-semibold border-b border-slate-100">{fmt(t.profit)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaceDetailsModal;
