import { useState } from 'react';
import { Check, Eye, TagIcon, AlertTriangle, HelpCircle, ChevronDown } from 'lucide-react';
import type { Currency, LastMinuteRadarResult, RadarAdvice, RadarRow, RadarStripCell } from '../../types';
import { radarDowLabel } from '../../hooks/useLastMinuteRadar';
import { InfoPopover } from '../../components/ui/InfoPopover';
import { ICON_SIZES } from '../../lib/iconSizes';

/**
 * 빈방 레이더 카드 — 화면 설계: PRICING_ROADMAP.md 10장 (2026-09-07 3차 단순화).
 *  ① 큰 숫자 2개   ② 4주 띠 달력   ③ 공실 표 (날짜 · 남은 날 · 팔릴 가능성 · 할인 검토 여부 · 현재가 · 10%/20% 할인가)
 *
 * 색 규칙: 팔릴 가능성(얼마나) = primary 한 색의 진하기. 할인 검토 여부(무엇을 해라) = 상태색 + 아이콘 + 글자.
 */

interface Props {
  radar: LastMinuteRadarResult;
  ko: boolean;
  currency: Currency;
  /** 숙소가 여럿이고 전체 보기일 때 행에 숙소명을 붙인다 */
  showProperty: boolean;
  onOpenDetail: () => void;
  compact?: boolean;
  /** 미리보기용 — 첫 행을 펼친 채로 시작 */
  defaultOpenFirst?: boolean;
}

// ── 할인 검토 여부 표시 (아이콘 + 글자 + 상태색). 기준: types.ts RadarAdvice 주석 ──
export const ADVICE_META: Record<RadarAdvice, { ko: string; en: string; cls: string; fill: string; Icon: typeof Check }> = {
  easy:    { ko: '여유',     en: 'Fine',          cls: 'bg-muted/70 text-muted-foreground',    fill: '',                  Icon: Check },
  watch:   { ko: '관심',     en: 'Watch',         cls: 'bg-primary/10 text-primary',            fill: '',                  Icon: Eye },
  review:  { ko: '검토',     en: 'Review',        cls: 'bg-warning/12 text-warning',            fill: 'bg-warning/35',     Icon: TagIcon },
  strong:  { ko: '강력검토', en: 'Strongly review', cls: 'bg-destructive/10 text-destructive', fill: 'bg-destructive/35', Icon: AlertTriangle },
  unknown: { ko: '표본 부족', en: 'Few samples',  cls: 'bg-muted text-muted-foreground',       fill: '',                  Icon: HelpCircle },
};

export const fmtPrice = (v: number, currency: Currency, ko: boolean) => {
  if (currency === 'KRW') return ko ? `${v.toLocaleString()}원` : `₩${v.toLocaleString()}`;
  return `${currency === 'USD' ? '$' : '€'}${v.toLocaleString()}`;
};
/** 할인가 — 1,000원 단위 반올림 (외화는 1단위) */
export const discounted = (v: number, pct: number, currency: Currency) => {
  const raw = v * (1 - pct / 100);
  return currency === 'KRW' ? Math.round(raw / 1000) * 1000 : Math.round(raw);
};

const fmtDate = (iso: string, dow: number, ko: boolean) => {
  const m = Number(iso.slice(5, 7));
  const d = Number(iso.slice(8, 10));
  return ko ? `${m}/${d} (${radarDowLabel(dow, true)})` : `${radarDowLabel(dow, false)} ${m}/${d}`;
};

export const AdviceChip = ({ advice, ko }: { advice: RadarAdvice; ko: boolean }) => {
  const meta = ADVICE_META[advice];
  const Icon = meta.Icon;
  return (
    <span className={`inline-flex items-center gap-1 type-micro font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${meta.cls}`}>
      <Icon size={ICON_SIZES.xs} strokeWidth={2.4} />
      {ko ? meta.ko : meta.en}
    </span>
  );
};

/** 가능성 막대 — 채움 = 가능성 (한 색의 진하기) */
export const ProbabilityBar = ({ row, width = 'w-[120px]' }: { row: RadarRow; width?: string }) => {
  const p = row.probability;
  return (
    <div className={`${width} relative h-1.5 rounded-full bg-muted/50 overflow-hidden`}>
      {p !== null && (
        <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${p}%`, opacity: 0.35 + 0.65 * (p / 100) }} />
      )}
    </div>
  );
};

/** 4주 띠 달력 — 예약된 날은 조용하게, 검토가 필요한 공실만 색을 입힌다 */
const Strip = ({ strip, ko, compact }: { strip: RadarStripCell[]; ko: boolean; compact?: boolean }) => (
  <div className={compact ? 'grid grid-cols-7 gap-1' : 'flex gap-1'}>
    {strip.map(c => {
      const empty = c.emptyCount > 0;
      const excluded = !empty && c.excludedCount > 0;
      const partial = empty && c.emptyCount < c.totalCount;
      const meta = c.advice ? ADVICE_META[c.advice] : null;
      const highlighted = empty && meta && meta.fill;
      const base = 'relative flex-1 min-w-0 h-9 rounded-chip flex flex-col items-center justify-center transition-colors';
      const look = excluded
        ? 'bg-transparent border border-border/60 text-muted-foreground/50'
        : !empty
          ? 'bg-muted/70 text-muted-foreground/50'
          : highlighted
            ? `${meta!.fill} text-foreground`
            : 'bg-transparent border border-dashed border-border text-muted-foreground';
      const title = excluded
        ? (ko ? '뺀 날' : 'Excluded')
        : !empty
          ? (ko ? '예약됨' : 'Booked')
          : `${ko ? '공실' : 'Empty'}${partial ? ` ${c.emptyCount}/${c.totalCount}` : ''}${meta ? ` · ${ko ? meta.ko : meta.en}` : ''}`;
      return (
        <div key={c.date} className={`${base} ${look}`} title={title}>
          <span className={`text-[10px] leading-none ${empty ? 'font-bold' : 'font-medium'} ${excluded ? 'line-through' : ''}`}>{Number(c.date.slice(8, 10))}</span>
          <span className="text-[8px] leading-none mt-0.5 opacity-70">{radarDowLabel(c.dow, ko)}</span>
          {c.daysBefore === 0 && <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" aria-label={ko ? '오늘' : 'Today'} />}
          {partial && <span className="absolute bottom-0.5 right-1 text-[7px] font-bold opacity-70">{c.emptyCount}</span>}
        </div>
      );
    })}
  </div>
);

/** 펼쳤을 때 오른쪽: 같은 상황에서 임박 예약된 밤들의 실제 거래가 */
const SoldPrices = ({ row, currency, ko }: { row: RadarRow; currency: Currency; ko: boolean }) => {
  const s = row.soldPrices;
  if (!s) return null;
  const vsNow = row.currentPrice ? Math.round((s.median / row.currentPrice - 1) * 100) : null;
  const labelCls = 'type-micro text-muted-foreground';
  const valCls = 'text-[12px] font-bold text-foreground tabular-nums';
  return (
    <div className="flex flex-col gap-1 min-w-[230px]">
      <div className="type-micro font-bold text-muted-foreground uppercase tracking-wider">
        {ko ? `임박 예약된 ${s.count}박의 실제 거래가` : `Actual rates of the ${s.count} late-booked nights`}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className={labelCls}>{ko ? '중앙값' : 'Median'}</span>
        <span className={valCls}>{fmtPrice(s.median, currency, ko)}</span>
        {vsNow !== null && <span className={labelCls}>({ko ? '현재가 대비' : 'vs now'} {vsNow > 0 ? '+' : ''}{vsNow}%)</span>}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className={labelCls}>{ko ? '범위' : 'Range'}</span>
        <span className="text-[12px] text-foreground tabular-nums">{fmtPrice(s.min, currency, ko)} ~ {fmtPrice(s.max, currency, ko)}</span>
      </div>
      <div className={labelCls}>
        {ko
          ? `그 달 보통 단가보다 5% 이상 싸게 ${s.discounted}박 · 같거나 비싸게 ${s.atOrAbove}박`
          : `${s.discounted} sold ≥5% below the month's usual rate · ${s.atOrAbove} at or above`}
      </div>
    </div>
  );
};

const LastMinuteRadarCard = ({ radar, ko, currency, showProperty, onOpenDetail, compact = false, defaultOpenFirst = false }: Props) => {
  const { summary, dataQuality } = radar;
  const firstKey = radar.rows[0] ? `${radar.rows[0].propertyId}|${radar.rows[0].date}` : null;
  const [openRow, setOpenRow] = useState<string | null>(defaultOpenFirst ? firstKey : null);

  const titleCls = 'text-[15px] font-bold text-foreground';
  const kpiValue = 'text-[22px] font-extrabold text-foreground leading-none tabular-nums';
  const kpiLabel = 'type-micro text-muted-foreground mt-1';
  const weeks = Math.round(radar.horizonDays / 7);

  // 검토가 필요한 날을 앞으로, 그다음 날짜순
  const rows = [...radar.rows].sort((a, b) => Number(b.needsAction) - Number(a.needsAction) || a.date.localeCompare(b.date));

  const priceCell = (row: RadarRow, pct: number) =>
    row.currentPrice === null ? '–' : fmtPrice(pct === 0 ? row.currentPrice : discounted(row.currentPrice, pct, currency), currency, ko);

  return (
    <div className="flex flex-col gap-4">
      {/* ── 헤더 ── */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className={titleCls}>{ko ? '빈방 레이더' : 'Vacancy Radar'}</span>
          <InfoPopover label={ko ? '빈방 레이더 설명' : 'About Vacancy Radar'} align="left">
            <p className="text-[11px] text-foreground leading-relaxed break-keep">
              {ko
                ? `앞으로 ${weeks}주간 공실이 팔릴 가능성을 보여줍니다. 남은 일수가 같은 과거 공실 중에 예약 완료로 마감된 비율입니다. 각 공실마다 과거 기록을 대조해 보고 할인 적용 여부를 검토해 예약률을 높여 보세요.`
                : `The chance each empty night in the next ${weeks} weeks gets booked: the share of past empty nights with the same days remaining that ended up booked. Compare each night with your history and decide whether a discount is worth it.`}
            </p>
          </InfoPopover>
        </div>
        <button className="type-micro font-bold py-1 px-2.5 rounded-chip cursor-pointer transition-colors whitespace-nowrap flex-shrink-0 bg-primary/10 text-primary hover:bg-primary/20" onClick={onOpenDetail}>
          {ko ? '자세히 보기 >' : 'Details >'}
        </button>
      </div>

      {!dataQuality.enough ? (
        <div className="rounded-inner border border-dashed border-border bg-muted/30 px-5 py-6 text-center">
          <p className="text-[13px] font-semibold text-foreground mb-1">{ko ? '아직 기록이 적어 가능성을 계산할 수 없어요' : 'Not enough history to estimate yet'}</p>
          <p className="text-[11px] text-muted-foreground break-keep">
            {ko
              ? `완료된 달 3개월과 금액이 적힌 예약 30건이 필요해요 (지금 ${dataQuality.completedMonths}개월 · ${dataQuality.pricedBookings}건).`
              : `Needs 3 completed months and 30 priced bookings (now ${dataQuality.completedMonths} months · ${dataQuality.pricedBookings}).`}
          </p>
        </div>
      ) : (
        <>
          {/* ── ① 큰 숫자 2개 ── */}
          <div className={`flex ${compact ? 'gap-6' : 'gap-10'}`}>
            <div>
              <div className={kpiValue}>{summary.emptyNights}</div>
              <div className={kpiLabel}>{ko ? `앞으로 ${weeks}주 공실` : `Empty nights · ${weeks} wks`}</div>
            </div>
            <div>
              <div className={`${kpiValue} ${summary.needsAction > 0 ? 'text-warning' : ''}`}>{summary.needsAction}</div>
              <div className={kpiLabel}>{ko ? '임박할인 검토 필요' : 'Discount review needed'}</div>
            </div>
          </div>

          {/* ── ② 4주 띠 달력 ── */}
          <div>
            <Strip strip={radar.strip} ko={ko} compact={compact} />
            <div className="flex flex-wrap items-center gap-3 mt-1.5 type-micro text-muted-foreground">
              <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-[3px] bg-muted/70 inline-block" />{ko ? '예약됨' : 'Booked'}</span>
              <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-[3px] border border-dashed border-border inline-block" />{ko ? '공실' : 'Empty'}</span>
              <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-[3px] bg-warning/40 inline-block" />{ko ? '검토 필요' : 'Review needed'}</span>
            </div>
          </div>

          {/* ── ③ 공실 표 ── */}
          {rows.length === 0 ? (
            <div className="rounded-inner bg-muted/30 px-5 py-5 text-center">
              <p className="text-[13px] font-semibold text-foreground">{ko ? `앞으로 ${weeks}주 공실이 없어요` : `No empty nights in the next ${weeks} weeks`}</p>
            </div>
          ) : (
            <ul className="m-0 p-0 list-none">
              {!compact && (
                <li className="flex items-center gap-3 pb-1.5 type-micro font-bold text-muted-foreground uppercase tracking-wider">
                  <span className="w-[88px]">{ko ? '날짜' : 'Date'}</span>
                  {showProperty && <span className="w-[80px] truncate">{ko ? '숙소' : 'Property'}</span>}
                  <span className="w-[44px]">{ko ? '남은 날' : 'Days'}</span>
                  <span className="w-[120px]">{ko ? '팔릴 가능성' : 'Chance to sell'}</span>
                  <span className="w-[44px] text-right">%</span>
                  <span className="w-[84px]">{ko ? '할인 검토 여부' : 'Review'}</span>
                  <span className="w-[92px] text-right">{ko ? '현재 가격' : 'Current'}</span>
                  <span className="w-[92px] text-right">{ko ? '10% 할인가' : '−10%'}</span>
                  <span className="w-[92px] text-right">{ko ? '20% 할인가' : '−20%'}</span>
                  <span className="flex-1" />
                  <span className="w-5" />
                </li>
              )}
              {rows.map(row => {
                const key = `${row.propertyId}|${row.date}`;
                const open = openRow === key;
                const rowText = row.needsAction ? 'text-foreground' : 'text-muted-foreground';
                const pctEl = (
                  <span className={`${compact ? 'w-[40px]' : 'w-[44px] text-right'} font-bold tabular-nums`}>
                    {row.probability === null ? '–' : `${row.probability}%`}
                  </span>
                );
                const detail = open && (
                  <div className={`pb-3 ${compact ? 'pr-2' : 'pl-1 pr-8'} flex ${compact ? 'flex-col gap-3' : 'items-start justify-between gap-6'}`}>
                    <p className="text-[11px] text-muted-foreground leading-relaxed break-keep flex-1">{ko ? row.reason : row.reasonEn}</p>
                    <SoldPrices row={row} currency={currency} ko={ko} />
                  </div>
                );

                if (compact) {
                  return (
                    <li key={key} className="border-t border-border/60 first:border-t-0">
                      <button type="button" onClick={() => setOpenRow(open ? null : key)} className={`w-full flex flex-col gap-1.5 py-2.5 text-left text-xs bg-transparent border-0 cursor-pointer ${rowText}`} aria-expanded={open}>
                        <span className="flex items-center gap-2">
                          <span className="font-semibold tabular-nums whitespace-nowrap">{fmtDate(row.date, row.dow, ko)}</span>
                          {row.isHolidayEve && <span className="type-micro text-accent-foreground">{ko ? '연휴 전' : 'hol. eve'}</span>}
                          <span className="tabular-nums text-muted-foreground">{row.daysBefore === 0 ? (ko ? '오늘' : 'today') : `D-${row.daysBefore}`}</span>
                          <span className="ml-auto flex items-center gap-1.5">
                            <AdviceChip advice={row.advice} ko={ko} />
                            <ChevronDown size={ICON_SIZES.sm} className={`text-muted-foreground/60 transition-transform ${open ? 'rotate-180' : ''}`} />
                          </span>
                        </span>
                        <span className="flex items-center gap-2">
                          <ProbabilityBar row={row} width="w-[96px]" />
                          {pctEl}
                        </span>
                        {row.currentPrice !== null && (
                          <span className="type-micro text-muted-foreground tabular-nums break-keep">
                            {ko
                              ? `현재 ${priceCell(row, 0)} · 10% 할인가 ${priceCell(row, 10)} · 20% 할인가 ${priceCell(row, 20)}`
                              : `Now ${priceCell(row, 0)} · −10% ${priceCell(row, 10)} · −20% ${priceCell(row, 20)}`}
                          </span>
                        )}
                      </button>
                      {detail}
                    </li>
                  );
                }

                return (
                  <li key={key} className="border-t border-border/60 first:border-t-0">
                    <button type="button" onClick={() => setOpenRow(open ? null : key)} className={`w-full flex items-center gap-3 py-2.5 text-left text-xs bg-transparent border-0 cursor-pointer ${rowText}`} aria-expanded={open}>
                      <span className="w-[88px] font-semibold tabular-nums whitespace-nowrap">
                        {fmtDate(row.date, row.dow, ko)}
                        {row.isHolidayEve && <span className="ml-1 type-micro text-accent-foreground">{ko ? '연휴 전' : 'hol. eve'}</span>}
                      </span>
                      {showProperty && <span className="w-[80px] truncate text-muted-foreground">{row.propertyName}</span>}
                      <span className="w-[44px] tabular-nums text-muted-foreground">{row.daysBefore === 0 ? (ko ? '오늘' : 'today') : `D-${row.daysBefore}`}</span>
                      <ProbabilityBar row={row} />
                      {pctEl}
                      <span className="w-[84px] flex items-center"><AdviceChip advice={row.advice} ko={ko} /></span>
                      <span className="w-[92px] text-right tabular-nums text-foreground/90">{priceCell(row, 0)}</span>
                      <span className="w-[92px] text-right tabular-nums text-muted-foreground">{priceCell(row, 10)}</span>
                      <span className="w-[92px] text-right tabular-nums text-muted-foreground">{priceCell(row, 20)}</span>
                      <span className="flex-1" />
                      <ChevronDown size={ICON_SIZES.sm} className={`w-5 text-muted-foreground/60 transition-transform ${open ? 'rotate-180' : ''}`} />
                    </button>
                    {detail}
                  </li>
                );
              })}
            </ul>
          )}

          <p className="type-micro text-muted-foreground break-keep">
            {ko
              ? '가능성은 지금까지 하던 대로(임박 할인 포함) 운영했을 때 팔린 비율이에요. 현재 가격은 설정의 기본·주말 요금이에요.'
              : 'Chances reflect how you managed prices so far, late discounts included. Current price comes from the base/weekend rates in Settings.'}
            {dataQuality.autoSyncedShare >= 30 && (ko
              ? ` 자동 연동 예약이 ${dataQuality.autoSyncedShare}%라 접수일이 동기화한 날로 적혀 임박 가능성이 실제보다 높게 보일 수 있어요.`
              : ` ${dataQuality.autoSyncedShare}% of bookings came via iCal with the sync date as booking date, so short-notice chances may read high.`)}
          </p>
        </>
      )}
    </div>
  );
};

export default LastMinuteRadarCard;
