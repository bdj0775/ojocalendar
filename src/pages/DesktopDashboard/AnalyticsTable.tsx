import { useState, useMemo } from 'react';
import { CHANNEL_COLORS } from './chartComponents';
import type { MonthlyTableRow } from '../../types';

interface AnalyticsTableProps {
  monthlyTableData: MonthlyTableRow[];
  isDark: boolean;
  ko: boolean;
  sym: string;
  fmt: (v: number) => string;
  tableChannelFilter: string;
  setTableChannelFilter: (v: string) => void;
  tableNatFilter: string;
  setTableNatFilter: (v: string) => void;
  tableGuestFilter: string;
  setTableGuestFilter: (v: string) => void;
}

const DIST_COLORS = ['var(--primary)', 'var(--primary-hover)', 'var(--primary-400)', 'var(--primary-300)', 'var(--success)', 'var(--warning)', 'var(--destructive)'];

const AnalyticsTable = ({
  monthlyTableData, isDark, ko, sym, fmt,
  tableChannelFilter, setTableChannelFilter,
  tableNatFilter, setTableNatFilter,
  tableGuestFilter, setTableGuestFilter,
}: AnalyticsTableProps) => {
  const [tableSortKey, setTableSortKey] = useState('sortKey');
  const [tableSortDir, setTableSortDir] = useState<'asc' | 'desc'>('desc');
  const [tableRange, setTableRange] = useState('12');

  const cardCls = 'bg-card text-card-foreground border border-border rounded-2xl p-5 relative overflow-hidden transition-all duration-300 hover:-translate-y-0.5 shadow-sm hover:shadow-lg hover:border-primary/50';
  const tableTitleCls = 'text-[15px] font-bold text-foreground';
  const filterSelectCls = 'bg-muted border border-border rounded-lg py-1.5 pl-3 pr-8 text-[11px] font-semibold text-foreground cursor-pointer outline-none appearance-none';
  const chChipCls = 'py-1 px-2.5 rounded-2xl type-micro font-bold border border-border bg-muted text-muted-foreground cursor-pointer transition-all hover:border-primary/30';
  const chChipActiveCls = 'bg-primary/15 border-primary/30 text-primary';
  const tableScrollCls = 'overflow-x-auto rounded-xl border border-border';
  const tableThCls = 'sticky top-0 bg-card/95 backdrop-blur-sm py-2 px-1.5 text-left type-micro font-bold text-muted-foreground uppercase tracking-wider border-b border-border whitespace-nowrap cursor-pointer select-none hover:text-primary transition-colors overflow-hidden text-ellipsis';
  const tableTdCls = 'py-1.5 px-1.5 text-foreground/80 align-middle leading-[1.4] overflow-hidden text-[11px]';
  const monthCellCls = 'font-bold text-foreground whitespace-nowrap text-xs';
  const distNameCls = 'text-muted-foreground font-medium whitespace-nowrap overflow-hidden text-ellipsis min-w-8 max-w-[52px]';
  const miniBarBgCls = 'h-[3px] rounded-sm bg-muted flex-1 min-w-5 max-w-11 overflow-hidden';
  const distPctCls = 'font-bold text-foreground/70 type-micro min-w-[22px] text-right';
  const avgGuestCls = 'font-bold text-foreground whitespace-nowrap';
  const otaNormalCls = 'whitespace-nowrap font-semibold text-foreground/80';
  const leadTimeCellCls = 'whitespace-nowrap font-semibold text-muted-foreground';
  const tableFooterCls = 'py-3 px-3.5 text-[11px] text-muted-foreground flex justify-between';

  const handleSort = (key: string) => {
    if (tableSortKey === key) setTableSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setTableSortKey(key); setTableSortDir('desc'); }
  };

  const SortArrow = ({ colKey }: { colKey: string }) => {
    const active = tableSortKey === colKey;
    return <span className={`ml-1 type-micro ${active ? 'opacity-100 text-primary' : 'opacity-50'}`}>{active ? (tableSortDir === 'asc' ? '▲' : '▼') : '⇅'}</span>;
  };

  const { tableData, getAdrBg, otaThreshold } = useMemo(() => {
    let data = [...(monthlyTableData || [])] as (MonthlyTableRow & { occNights?: number })[];
    const now = new Date();
    const nowYear = now.getFullYear();
    const nowMonth = now.getMonth();

    if (tableRange === '6') {
      let cutY = nowYear; let cutM = nowMonth - 5;
      while (cutM < 0) { cutM += 12; cutY--; }
      data = data.filter(r => r.sortKey >= cutY * 100 + cutM);
    } else if (tableRange === '12') {
      let cutY = nowYear; let cutM = nowMonth - 11;
      while (cutM < 0) { cutM += 12; cutY--; }
      data = data.filter(r => r.sortKey >= cutY * 100 + cutM);
    } else if (tableRange === 'year') {
      data = data.filter(r => r.year === nowYear);
    }

    const getSortVal = (row: MonthlyTableRow, key: string): number => {
      if (key === 'sortKey') return row.sortKey;
      if (key === 'gross') return row.gross;
      if (key === 'avgGuests') return row.avgGuests;
      if (key === 'adr') return row.adr;
      if (key === 'occupancy') return row.occupancy;
      if (key === 'otaComm') return row.otaComm;
      if (key === 'avgLeadTime') return row.avgLeadTime;
      if (key === 'topNat') return row.nationalityDist[0]?.pct || 0;
      if (key === 'topChannel') return row.channelDist[0]?.pct || 0;
      if (key === 'topGuestSize') return row.guestDist[0]?.pct || 0;
      return row.sortKey;
    };
    data.sort((a, b) => {
      const av = getSortVal(a, tableSortKey);
      const bv = getSortVal(b, tableSortKey);
      return tableSortDir === 'asc' ? av - bv : bv - av;
    });

    const adrs = data.map(r => r.adr).filter(v => v > 0);
    const minAdr = Math.min(...adrs, 0);
    const maxAdr = Math.max(...adrs, 1);
    const getAdrBg = (val: number) => {
      if (val === 0) return 'transparent';
      const ratio = Math.min(1, (val - minAdr) / (maxAdr - minAdr || 1));
      return isDark
        ? `rgba(59, 130, 246, ${0.08 + ratio * 0.25})`
        : `rgba(37, 99, 235, ${0.05 + ratio * 0.18})`;
    };

    const otaVals = data.map(r => r.otaComm).filter(v => v > 0).sort((a, b) => b - a);
    const otaThreshold = otaVals[Math.floor(otaVals.length * 0.25)] || Infinity;

    return { tableData: data, getAdrBg, otaThreshold };
  }, [monthlyTableData, tableRange, tableSortKey, tableSortDir, isDark]);

  const columns: [string, string][] = [
    ['sortKey', ko ? '월' : 'Month'], ['gross', ko ? '매출(순수익)' : 'Revenue'],
    ['occupancy', ko ? '점유율' : 'Occupancy'], ['', ko ? '국가 비중' : 'Nationality'],
    ['', ko ? '채널' : 'Channel'], ['avgGuests', ko ? '평균인원' : 'Guests'],
    ['topGuestSize', ko ? '인원 비중' : 'Guest Mix'], ['adr', ko ? '객단가' : 'ADR'],
    ['otaComm', ko ? 'OTA 수수료' : 'OTA Comm.'], ['avgLeadTime', ko ? '리드타임' : 'Lead'],
  ];

  return (
    <div className={`col-span-3 ${cardCls}`} style={{ padding: '20px' }}>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <span className={tableTitleCls}>{ko ? '📋 월별 종합 분석' : '📋 Monthly Analytics'}</span>
        <div className="flex items-center gap-2.5 flex-wrap">
          <select className={filterSelectCls} value={tableRange} onChange={e => setTableRange(e.target.value)}>
            <option value="6">{ko ? '최근 6개월' : 'Last 6 months'}</option>
            <option value="12">{ko ? '최근 12개월' : 'Last 12 months'}</option>
            <option value="year">{ko ? '올해' : 'This year'}</option>
            <option value="all">{ko ? '전체' : 'All'}</option>
          </select>
          <div className="flex gap-1.5">
            {['All', 'Airbnb', 'Booking.com', 'Naver', 'Direct'].map(ch => (
              <button key={ch} className={`${chChipCls} ${tableChannelFilter === ch ? chChipActiveCls : ''}`} onClick={() => setTableChannelFilter(ch)}>{ch}</button>
            ))}
          </div>
          <select className={filterSelectCls} value={tableNatFilter} onChange={e => setTableNatFilter(e.target.value)}>
            <option value="All">{ko ? '국가: 전체' : 'Nation: All'}</option>
            {[...new Set((monthlyTableData || []).flatMap(r => r.nationalityDist.map(n => n.name)))].map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <select className={filterSelectCls} value={tableGuestFilter} onChange={e => setTableGuestFilter(e.target.value)}>
            <option value="All">{ko ? '인원: 전체' : 'Guests: All'}</option>
            {['1', '2', '3', '4', '5+'].map(g => <option key={g} value={g}>{g}{ko ? '인' : 'p'}</option>)}
          </select>
        </div>
      </div>
      <div className={tableScrollCls}>
        <table className="w-full border-collapse text-[11px]" style={{ tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '6%' }} /><col style={{ width: '10%' }} /><col style={{ width: '8%' }} /><col style={{ width: '13%' }} />
            <col style={{ width: '12%' }} /><col style={{ width: '7%' }} /><col style={{ width: '12%' }} />
            <col style={{ width: '9%' }} /><col style={{ width: '9%' }} /><col style={{ width: '7%' }} />
          </colgroup>
          <thead>
            <tr>
              {columns.map(([key, label], i) => (
                <th key={i} className={tableThCls} onClick={key ? () => handleSort(key) : undefined} style={!key ? { cursor: 'default' } : {}}>
                  {label}{key && <SortArrow colKey={key} />}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableData.map(row => (
              <tr key={row.sortKey} className="border-b border-border hover:bg-muted/50 transition-colors">
                <td className={`${tableTdCls} ${monthCellCls}`}>{ko ? row.label : row.labelEn}</td>
                <td className={tableTdCls}>
                  <div style={{ fontWeight: 700, color: isDark ? '#f1f5f9' : '#0f172a', fontSize: 12 }}>{fmt(row.gross)}</div>
                  <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>({ko ? '순' : 'net'} {fmt(row.net)})</div>
                </td>
                <td className={tableTdCls}>
                  <div style={{ fontWeight: 700, color: isDark ? '#f1f5f9' : '#0f172a', fontSize: 12 }}>{row.occupancy}%</div>
                  <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{row.bookingCount}{ko ? '건' : 'bks'}</div>
                </td>
                <td className={tableTdCls}>
                  <div className="flex flex-col gap-micro">
                    {row.nationalityDist.slice(0, 3).map((n, i) => (
                      <div key={n.name} className="flex items-center gap-micro type-micro">
                        <span className={distNameCls}>{n.name}</span>
                        <div className={miniBarBgCls}><div className="h-full rounded-sm" style={{ width: `${n.pct}%`, background: DIST_COLORS[i] }} /></div>
                        <span className={distPctCls}>{n.pct}%</span>
                      </div>
                    ))}
                  </div>
                </td>
                <td className={tableTdCls}>
                  <div className="flex flex-col gap-micro">
                    {row.channelDist.map((c, i) => (
                      <div key={c.name} className="flex items-center gap-micro type-micro">
                        <span className={distNameCls}>{c.name}</span>
                        <div className={miniBarBgCls}><div className="h-full rounded-sm" style={{ width: `${c.pct}%`, background: CHANNEL_COLORS[c.name] || DIST_COLORS[i] }} /></div>
                        <span className={distPctCls}>{c.pct}%</span>
                      </div>
                    ))}
                  </div>
                </td>
                <td className={`${tableTdCls} ${avgGuestCls}`}>{row.avgGuests}{ko ? '인' : ''}</td>
                <td className={tableTdCls}>
                  <div className="flex flex-col gap-micro">
                    {row.guestDist.map((g, i) => (
                      <div key={g.name} className="flex items-center gap-micro type-micro">
                        <span className={distNameCls}>{g.name}</span>
                        <div className={miniBarBgCls}><div className="h-full rounded-sm" style={{ width: `${g.pct}%`, background: DIST_COLORS[i + 2] }} /></div>
                        <span className={distPctCls}>{g.pct}%</span>
                      </div>
                    ))}
                  </div>
                </td>
                <td className={tableTdCls}>
                  <span className="font-bold text-[11px] py-micro px-1.5 rounded-chip inline-block whitespace-nowrap" style={{ background: getAdrBg(row.adr) }}>{fmt(row.adr)}</span>
                </td>
                <td className={`${tableTdCls} ${row.otaComm >= otaThreshold ? 'text-red-400' : otaNormalCls}`}>
                  {fmt(row.otaComm)}{row.otaComm >= otaThreshold && ' ⚠️'}
                </td>
                <td className={`${tableTdCls} ${leadTimeCellCls}`}>{row.avgLeadTime}{ko ? '일전' : 'd'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={tableFooterCls}>
        <span>{ko ? `총 ${tableData.length}개월 표시` : `Showing ${tableData.length} months`}</span>
        <span>{ko ? '모든 열 클릭으로 정렬 가능' : 'Click headers to sort'}</span>
      </div>
    </div>
  );
};

export default AnalyticsTable;
