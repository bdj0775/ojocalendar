import { useEffect, useRef, useState, type CSSProperties } from 'react';
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
  /** 미리보기용 — 특정 날짜 행을 펼친 채로 시작 (YYYY-MM-DD) */
  openDate?: string;
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

/**
 * 실제 거래 가격 — 같은 상황(같은 요일 묶음 · 같은 남은 날수)에서 임박 예약된 건들의 1박 단가를
 * 가격 축 위에 점으로 놓고, 중앙값과 현재가를 세로선으로 겹친다. 점 하나 = 예약 1건(여러 밤이면 묶음).
 * 안 팔린 밤은 당시 가격 기록이 없어 축에 올릴 수 없다.
 */
interface SoldBooking { bookingId: string; from: string; to: string; nights: number; dow: number; adr: number; lead: number; monthMedian: number | null }

const PriceStrip = ({ row, currency, ko, compact, initialHover = false }: { row: RadarRow; currency: Currency; ko: boolean; compact: boolean; initialHover?: boolean }) => {
  // initialHover: 미리보기에서 툴팁을 확인하기 위한 옵션 (첫 점을 올린 상태로 시작)
  const [hover, setHover] = useState<string | null>(initialHover ? (row.soldPrices?.samples[0]?.bookingId ?? null) : null);
  const s = row.soldPrices;
  const cur = row.currentPrice;
  if (!s || s.samples.length === 0) {
    return (
      <div className="rounded-inner bg-muted/30 border border-border/60 px-4 py-3">
        <span className="type-caption font-bold text-foreground">{ko ? '실제 거래 가격' : 'Actual rates'}</span>
        <p className="type-micro text-muted-foreground mt-1">{ko ? '같은 상황에서 금액이 적힌 임박 예약이 아직 없어요.' : 'No priced late bookings in this situation yet.'}</p>
      </div>
    );
  }

  // 같은 예약의 밤들을 한 점으로
  const byBooking = new Map<string, SoldBooking>();
  s.samples.forEach(x => {
    const b = byBooking.get(x.bookingId);
    if (!b) byBooking.set(x.bookingId, { bookingId: x.bookingId, from: x.date, to: x.date, nights: 1, dow: x.dow, adr: x.adr, lead: x.lead, monthMedian: x.monthMedian });
    else { b.nights++; if (x.date < b.from) { b.from = x.date; b.dow = x.dow; } if (x.date > b.to) b.to = x.date; b.lead = Math.min(b.lead, x.lead); }
  });
  const bookings = [...byBooking.values()].sort((a, b) => a.adr - b.adr);

  // 축 범위: 거래가 + 현재가, 양옆 8% 여유
  const vals = [...bookings.map(b => b.adr), ...(cur !== null ? [cur] : [])];
  let lo = Math.min(...vals); let hi = Math.max(...vals);
  const pad = (hi - lo) * 0.08 || hi * 0.05;
  lo -= pad; hi += pad;
  const X = (v: number) => Math.max(0, Math.min(100, ((v - lo) / (hi - lo)) * 100));

  // 눈금 4개 안팎, 정확한 금액
  const rawStep = (hi - lo) / (compact ? 3 : 6);
  const mag = 10 ** Math.floor(Math.log10(rawStep));
  const step = ([1, 2, 2.5, 5, 10].map(m => m * mag).find(st => st >= rawStep)) ?? rawStep;
  const ticks: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) ticks.push(Math.round(v));

  // 겹치는 점은 위로 한 칸 (최대 2단)
  const minGap = compact ? 4 : 2.6;
  let lastX = -Infinity; let lastLane = 0;
  const placed = bookings.map(b => {
    const px = X(b.adr);
    const lane = px - lastX < minGap && lastLane === 0 ? 1 : 0;
    lastX = px; lastLane = lane;
    return { ...b, px, lane };
  });

  // ── 위쪽 라벨(중앙값·현재가) 배치 ───────────────────────────────────
  // 두 라벨이 겹치면 억지로 밀지 않고 현재가를 한 줄 아래로 내린다.
  // 폭은 글자 수 × 대략적인 글자폭(px)으로 추정 — type-micro(10px, tabular-nums) 기준.
  const CHAR_W = 5.6;
  const medianText = `${ko ? '중앙값' : 'Median'} ${fmtPrice(s.median, currency, ko)}`;
  const currentText = cur === null ? '' :
    `${ko ? '현재가' : 'Now'} ${fmtPrice(cur, currency, ko)}${row.priceOutOfRange ? (ko ? ' · 이 가격 이상 거래 없음' : ' · no sale at or above') : ''}`;
  const estW = (t: string) => t.length * CHAR_W;
  // 컨테이너 실제 폭을 재서 % → px 환산 (없으면 데스크탑 기본값으로 가정)
  const wrapRef = useRef<HTMLDivElement>(null);
  const [boxW, setBoxW] = useState(compact ? 330 : 1000);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setBoxW(el.clientWidth || (compact ? 330 : 1000));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [compact]);
  /** 라벨의 왼쪽 끝~오른쪽 끝 (px). edge()의 정렬 규칙과 같은 계산 */
  const labelBounds = (xPct: number, text: string): [number, number] => {
    const w = estW(text);
    if (xPct > 82) return [boxW - w, boxW];
    if (xPct < 18) return [0, w];
    const c = (xPct / 100) * boxW;
    return [c - w / 2, c + w / 2];
  };
  const LABEL_GAP = 8;
  const labelsOverlap = (() => {
    if (cur === null) return false;
    const [aL, aR] = labelBounds(X(s.median), medianText);
    const [bL, bR] = labelBounds(X(cur), currentText);
    return aL < bR + LABEL_GAP && bL < aR + LABEL_GAP;
  })();
  const LABEL_LINE = 13;                       // 한 줄 높이
  const topPad = labelsOverlap ? LABEL_LINE * 2 : LABEL_LINE;  // 라벨 영역 높이
  const H = topPad + 46;   // 축 위 영역 높이
  const axisY = H - 18;    // 축 위치
  const dotY = (lane: number) => axisY - 10 - lane * 12;
  const edge = (x: number): CSSProperties => (x > 82 ? { right: 0 } : x < 18 ? { left: 0 } : { left: `${x}%`, transform: 'translateX(-50%)' });
  const fmtDateShort = (iso: string) => `${Number(iso.slice(5, 7))}/${Number(iso.slice(8, 10))}`;
  const pctOf = (v: number, base: number) => { const p = Math.round((v / base - 1) * 100); return `${p > 0 ? '+' : ''}${p}%`; };
  const roundPrice = (v: number) => (currency === 'KRW' ? Math.round(v / 1000) * 1000 : Math.round(v));
  const hovered = placed.find(b => b.bookingId === hover) ?? null;

  return (
    <div className="rounded-inner bg-muted/30 border border-border/60 px-4 pt-3 pb-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="type-caption font-bold text-foreground">{ko ? '실제 거래 가격' : 'Actual rates'}</span>
        <span className="type-micro text-muted-foreground tabular-nums">
          {ko ? `임박 예약 ${bookings.length}건 · ${s.count}박` : `${bookings.length} late bookings · ${s.count} nights`}
        </span>
      </div>

      <div ref={wrapRef} className="relative mt-2" style={{ height: H }}>
        {/* 중앙값 · 현재가 — 겹치면 현재가가 한 줄 아래로 */}
        <span className="absolute type-micro text-muted-foreground tabular-nums whitespace-nowrap" style={{ ...edge(X(s.median)), top: 0 }}>
          {medianText}
        </span>
        <div className="absolute w-px bg-muted-foreground/35" style={{ left: `${X(s.median)}%`, top: LABEL_LINE, height: axisY - LABEL_LINE }} />
        {cur !== null && (
          <>
            <span
              className={`absolute type-micro font-bold tabular-nums whitespace-nowrap ${row.priceOutOfRange ? 'text-warning' : 'text-foreground'}`}
              style={{ ...edge(X(cur)), top: labelsOverlap ? LABEL_LINE : 0 }}
            >
              {currentText}
            </span>
            <div
              className={`absolute rounded-full ${row.priceOutOfRange ? 'bg-warning' : 'bg-foreground/80'}`}
              style={{ left: `calc(${X(cur)}% - 1px)`, width: 2, top: topPad, height: axisY - topPad }}
            />
          </>
        )}

        {/* 거래가 범위 (최저~최고) — 연한 띠 */}
        <div className="absolute h-1 rounded-full bg-primary/15" style={{ left: `${X(bookings[0].adr)}%`, width: `${Math.max(0.5, X(bookings[bookings.length - 1].adr) - X(bookings[0].adr))}%`, top: axisY - 2 }} />
        {/* 축 + 눈금 (정확한 금액) */}
        <div className="absolute left-0 right-0 h-px bg-border" style={{ top: axisY }} />
        {ticks.map(v => (
          <div key={v}>
            <div className="absolute w-px h-1 bg-border" style={{ left: `${X(v)}%`, top: axisY }} />
            <span className="absolute type-micro text-muted-foreground/80 tabular-nums whitespace-nowrap" style={{ ...edge(X(v)), top: axisY + 5 }}>{fmtPrice(v, currency, ko)}</span>
          </div>
        ))}

        {/* 호버한 점에서 축까지 안내선 */}
        {hovered && (
          <div className="absolute w-px bg-primary/50" style={{ left: `${hovered.px}%`, top: dotY(hovered.lane), height: axisY - dotY(hovered.lane) }} />
        )}
        {/* 점 = 예약 1건 */}
        {placed.map(b => (
          <button
            key={b.bookingId}
            type="button"
            className={`absolute w-[10px] h-[10px] rounded-full bg-primary ring-2 ring-card shadow-sm transition-transform ${hover === b.bookingId ? 'scale-125' : ''}`}
            style={{ left: `calc(${b.px}% - 5px)`, top: dotY(b.lane) - 5 }}
            onMouseEnter={() => { if (!compact) setHover(b.bookingId); }}
            onMouseLeave={() => { if (!compact) setHover(null); }}
            onClick={() => { if (compact) setHover(h => (h === b.bookingId ? null : b.bookingId)); }}
            onFocus={() => setHover(b.bookingId)}
            onBlur={() => setHover(null)}
            aria-label={`${fmtDateShort(b.from)} ${fmtPrice(b.adr, currency, ko)}`}
          />
        ))}

        {/* 툴팁 — InfoPopover·TrendTooltip과 같은 토큰 (데스크탑만 떠 있는 말풍선) */}
        {hovered && !compact && (
          <div
            className="absolute z-raise bg-card border border-border rounded-inner shadow-tooltip px-3 py-2 pointer-events-none min-w-[200px]"
            style={{ ...edge(hovered.px), bottom: H - dotY(hovered.lane) + 8 }}
          >
            <div className="text-[11px] font-bold text-foreground tabular-nums">
              {fmtDateShort(hovered.from)} ({radarDowLabel(hovered.dow, ko)}){hovered.nights > 1 ? ` ~ ${fmtDateShort(hovered.to)} · ${hovered.nights}${ko ? '박' : ' nights'}` : ''}
            </div>
            <div className="type-micro text-muted-foreground tabular-nums mt-0.5">
              {ko ? '1박' : 'Per night'} <span className="font-bold text-foreground">{fmtPrice(hovered.adr, currency, ko)}</span>
              {cur !== null && <span className="ml-1">({ko ? '현재가 대비' : 'vs now'} {pctOf(hovered.adr, cur)})</span>}
            </div>
            <div className="type-micro text-muted-foreground tabular-nums">
              {hovered.lead === 0 ? (ko ? '당일 예약' : 'Booked same day') : ko ? `${hovered.lead}일 전 예약` : `Booked ${hovered.lead}d before`}
              {hovered.monthMedian !== null && <> · {ko ? '그 달 보통 약' : 'month usual ~'} {fmtPrice(roundPrice(hovered.monthMedian), currency, ko)} ({pctOf(hovered.adr, hovered.monthMedian)})</>}
            </div>
          </div>
        )}
      </div>

      {/* 모바일: 누른 점의 정보를 축 아래 한 줄로 (말풍선이 화면을 가리지 않게) */}
      {compact && (
        <div className="min-h-[30px] mt-1 type-micro tabular-nums break-keep">
          {hovered ? (
            <>
              <span className="font-bold text-foreground">{fmtDateShort(hovered.from)} ({radarDowLabel(hovered.dow, ko)}){hovered.nights > 1 ? ` ~ ${fmtDateShort(hovered.to)} · ${hovered.nights}${ko ? '박' : ' nights'}` : ''}</span>
              <span className="text-muted-foreground"> · {ko ? '1박' : 'per night'} </span><span className="font-bold text-foreground">{fmtPrice(hovered.adr, currency, ko)}</span>
              {cur !== null && <span className="text-muted-foreground"> ({ko ? '현재가 대비' : 'vs now'} {pctOf(hovered.adr, cur)})</span>}
              <span className="text-muted-foreground"> · {hovered.lead === 0 ? (ko ? '당일 예약' : 'same day') : ko ? `${hovered.lead}일 전 예약` : `${hovered.lead}d before`}</span>
              {hovered.monthMedian !== null && <span className="text-muted-foreground"> · {ko ? '그 달 보통 약' : 'month usual ~'} {fmtPrice(roundPrice(hovered.monthMedian), currency, ko)} ({pctOf(hovered.adr, hovered.monthMedian)})</span>}
            </>
          ) : (
            <span className="text-muted-foreground/70">{ko ? '점을 누르면 날짜와 예약 시점이 보여요.' : 'Tap a dot for the date and booking timing.'}</span>
          )}
        </div>
      )}

      {!compact && (
        <p className="type-micro text-muted-foreground/70 mt-1.5 break-keep">
          {ko ? '점 하나 = 임박 예약 1건의 1박 단가. 마우스를 올리면 날짜와 예약 시점이 보여요.' : 'One dot = one late booking (per-night rate). Hover for the date and booking timing.'}
        </p>
      )}
    </div>
  );
};

const LastMinuteRadarCard = ({ radar, ko, currency, showProperty, onOpenDetail, compact = false, defaultOpenFirst = false, openDate }: Props) => {
  const { summary, dataQuality } = radar;
  const target = openDate ? radar.rows.find(r => r.date === openDate) : radar.rows[0];
  const firstKey = target ? `${target.propertyId}|${target.date}` : null;
  const [openRow, setOpenRow] = useState<string | null>(defaultOpenFirst || openDate ? firstKey : null);

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
                  <span className="w-[84px] inline-flex items-center gap-1 normal-case tracking-normal">
                    {ko ? '할인 검토 여부' : 'Review'}
                    <InfoPopover label={ko ? '할인 검토 여부 단계 설명' : 'Review levels'} align="left">
                      <ul className="m-0 p-0 list-none text-[11px] text-foreground leading-relaxed break-keep flex flex-col gap-1">
                        <li><b>{ko ? '여유' : 'Fine'}</b> · {ko ? '팔릴 가능성 50% 이상' : 'Chance above 50%'}</li>
                        <li><b>{ko ? '관심' : 'Watch'}</b> · {ko ? '50% 이상이지만 표본이 적음' : 'Above 50%, few samples'}</li>
                        <li><b>{ko ? '검토' : 'Review'}</b> · {ko ? '50% 미만' : 'Below 50%'}</li>
                        <li><b>{ko ? '적극검토' : 'Strongly review'}</b> · {ko ? '30% 미만' : 'Below 30%'}</li>
                      </ul>
                      <p className="type-micro text-muted-foreground mt-2 break-keep">{ko ? '과거 임박 거래가 모두 지금 가격보다 낮으면 한 단계 올려요.' : 'Raised one step if every past late booking went below your current price.'}</p>
                    </InfoPopover>
                  </span>
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
                  <div className={`pb-3 ${compact ? 'pr-1' : 'pl-1 pr-8'} flex flex-col gap-3`}>
                    <p className="text-[11px] text-muted-foreground leading-relaxed break-keep">{ko ? row.reason : row.reasonEn}</p>
                    <PriceStrip row={row} currency={currency} ko={ko} compact={compact} initialHover={defaultOpenFirst} />
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
                  <li key={key} className={`border-t border-border/60 first:border-t-0 -mx-2 px-2 rounded-inner transition-colors ${open ? 'bg-muted/25' : 'hover:bg-muted/30'}`}>
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
