import { Menu } from 'lucide-react';
import { useSidebar } from '../../context/SidebarContext';
import { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { useTranslation } from '../../hooks/useTranslation';
import PropertyDetailModal from '../../components/Modals/PropertyDetailModal';
import { supabase } from '../../services/supabaseClient';
import type { Channel, Property } from '../../types';

// ── 26년 예약 데이터 (6~9월 복구용) ────────────────────────────────
const RESTORE_2026_DATA = [
  // 6월
  { guestname:'김유진',  checkin:'2026-05-29', checkout:'2026-06-03', bookingdate:'2026-01-24', guests:5, infants:0, nationality:'Korea',  channel:'Naver',       amount:1020000, commission:2.0  },
  { guestname:'전수현',  checkin:'2026-06-03', checkout:'2026-06-04', bookingdate:'2026-05-13', guests:5, infants:0, nationality:'Korea',  channel:'Airbnb',      amount:221315,  commission:15.5 },
  { guestname:'진우',    checkin:'2026-06-04', checkout:'2026-06-05', bookingdate:'2026-05-29', guests:3, infants:0, nationality:'Korea',  channel:'Airbnb',      amount:198000,  commission:15.5 },
  { guestname:'huai-an', checkin:'2026-06-05', checkout:'2026-06-06', bookingdate:'2026-05-10', guests:3, infants:0, nationality:'Taiwan', channel:'Airbnb',      amount:265000,  commission:15.5 },
  { guestname:'김광규',  checkin:'2026-06-06', checkout:'2026-06-07', bookingdate:'2026-04-03', guests:5, infants:0, nationality:'Korea',  channel:'Naver',       amount:249000,  commission:2.0  },
  { guestname:'이현민',  checkin:'2026-06-07', checkout:'2026-06-09', bookingdate:'2026-04-28', guests:2, infants:1, nationality:'Korea',  channel:'Naver',       amount:363000,  commission:2.0  },
  { guestname:'jaslyn',  checkin:'2026-06-09', checkout:'2026-06-10', bookingdate:'2026-01-11', guests:4, infants:0, nationality:'Others', channel:'Airbnb',      amount:258762,  commission:18.2 },
  { guestname:'대만',    checkin:'2026-06-10', checkout:'2026-06-11', bookingdate:'2026-04-25', guests:4, infants:0, nationality:'Taiwan', channel:'Airbnb',      amount:220000,  commission:15.5 },
  { guestname:'tzu',     checkin:'2026-06-12', checkout:'2026-06-13', bookingdate:'2026-03-28', guests:4, infants:0, nationality:'Taiwan', channel:'Booking.com', amount:209760,  commission:0    },
  { guestname:'대만',    checkin:'2026-06-13', checkout:'2026-06-14', bookingdate:'2026-04-15', guests:2, infants:0, nationality:'Taiwan', channel:'Airbnb',      amount:235000,  commission:15.5 },
  { guestname:'justyna', checkin:'2026-06-14', checkout:'2026-06-15', bookingdate:'2026-05-08', guests:2, infants:0, nationality:'Others', channel:'Airbnb',      amount:190000,  commission:15.5 },
  { guestname:'대만',    checkin:'2026-06-16', checkout:'2026-06-18', bookingdate:'2026-02-15', guests:4, infants:0, nationality:'Taiwan', channel:'Booking.com', amount:388800,  commission:0    },
  { guestname:'정수경',  checkin:'2026-06-18', checkout:'2026-06-19', bookingdate:'2026-06-18', guests:2, infants:1, nationality:'Korea',  channel:'Naver',       amount:180000,  commission:2.0  },
  { guestname:'대만',    checkin:'2026-06-19', checkout:'2026-06-21', bookingdate:'2026-03-07', guests:4, infants:0, nationality:'Taiwan', channel:'Airbnb',      amount:446680,  commission:17.7 },
  { guestname:'xin yu',  checkin:'2026-06-22', checkout:'2026-06-23', bookingdate:'2026-04-06', guests:1, infants:0, nationality:'Others', channel:'Airbnb',      amount:220000,  commission:17.1 },
  { guestname:'dory',    checkin:'2026-06-23', checkout:'2026-06-24', bookingdate:'2026-05-20', guests:3, infants:0, nationality:'Taiwan', channel:'Airbnb',      amount:220000,  commission:15.5 },
  { guestname:'유소영',  checkin:'2026-06-24', checkout:'2026-06-25', bookingdate:'2026-05-17', guests:4, infants:0, nationality:'Korea',  channel:'Naver',       amount:189000,  commission:2.0  },
  { guestname:'정은아',  checkin:'2026-06-26', checkout:'2026-06-27', bookingdate:'2026-04-21', guests:3, infants:0, nationality:'Korea',  channel:'Naver',       amount:229000,  commission:2.0  },
  { guestname:'고윤하',  checkin:'2026-06-27', checkout:'2026-06-28', bookingdate:'2026-05-28', guests:3, infants:0, nationality:'Korea',  channel:'Naver',       amount:229000,  commission:2.0  },
  { guestname:'최예슬',  checkin:'2026-06-28', checkout:'2026-06-29', bookingdate:'2026-05-18', guests:1, infants:0, nationality:'Korea',  channel:'Direct',      amount:132000,  commission:0    },
  { guestname:'jemma',   checkin:'2026-06-29', checkout:'2026-07-01', bookingdate:'2025-11-10', guests:2, infants:0, nationality:'Others', channel:'Booking.com', amount:408000,  commission:0    },
  // 7월
  { guestname:'sharon',  checkin:'2026-07-02', checkout:'2026-07-03', bookingdate:'2026-04-04', guests:3, infants:0, nationality:'Others', channel:'Airbnb', amount:220000, commission:17.1 },
  { guestname:'이진주',  checkin:'2026-07-03', checkout:'2026-07-05', bookingdate:'2026-07-03', guests:2, infants:0, nationality:'Korea', channel:'Direct', amount:360000, commission:0 },
  { guestname:'liu',     checkin:'2026-07-09', checkout:'2026-07-10', bookingdate:'2026-04-18', guests:3, infants:0, nationality:'Taiwan', channel:'Airbnb', amount:220000, commission:15.5 },
  { guestname:'최지현',  checkin:'2026-07-15', checkout:'2026-07-17', bookingdate:'2026-02-26', guests:2, infants:0, nationality:'Korea', channel:'Naver', amount:310000, commission:2.0 },
  { guestname:'차수진',  checkin:'2026-07-17', checkout:'2026-07-19', bookingdate:'2026-07-17', guests:3, infants:0, nationality:'Korea', channel:'Naver', amount:370000, commission:2.0 },
  { guestname:'wayne',   checkin:'2026-07-19', checkout:'2026-07-20', bookingdate:'2026-05-17', guests:4, infants:0, nationality:'Others', channel:'Airbnb', amount:220000, commission:15.5 },
  { guestname:'이동우',  checkin:'2026-07-22', checkout:'2026-07-24', bookingdate:'2026-03-16', guests:4, infants:0, nationality:'Korea', channel:'Naver', amount:390000, commission:2.0 },
  { guestname:'cheng',   checkin:'2026-07-27', checkout:'2026-07-29', bookingdate:'2026-01-22', guests:4, infants:0, nationality:'Taiwan', channel:'Booking.com', amount:471230, commission:0 },
  { guestname:'목동수',  checkin:'2026-07-29', checkout:'2026-07-30', bookingdate:'2026-03-16', guests:3, infants:0, nationality:'Korea', channel:'Naver', amount:200000, commission:2.0 },
  { guestname:'lei',     checkin:'2026-07-30', checkout:'2026-08-01', bookingdate:'2026-03-15', guests:4, infants:0, nationality:'Taiwan', channel:'Booking.com', amount:394730, commission:0 },
  // 8월
  { guestname:'노혜선',  checkin:'2026-08-04', checkout:'2026-08-05', bookingdate:'2026-08-04', guests:3, infants:0, nationality:'Korea', channel:'Naver', amount:0, commission:2.0 },
  { guestname:'본부장님',checkin:'2026-08-06', checkout:'2026-08-07', bookingdate:'2026-08-06', guests:5, infants:0, nationality:'Korea', channel:'Direct', amount:240000, commission:0 },
  { guestname:'최유정',  checkin:'2026-08-09', checkout:'2026-08-10', bookingdate:'2026-08-09', guests:4, infants:0, nationality:'Korea', channel:'Naver', amount:0, commission:2.0 },
  { guestname:'elisabeth',checkin:'2026-08-10',checkout:'2026-08-12', bookingdate:'2026-05-04', guests:4, infants:0, nationality:'Others', channel:'Booking.com', amount:464871, commission:0 },
  { guestname:'floor',   checkin:'2026-08-20', checkout:'2026-08-21', bookingdate:'2026-08-20', guests:3, infants:0, nationality:'Others', channel:'Airbnb', amount:0, commission:15.5 },
  { guestname:'leonardo',checkin:'2026-08-21', checkout:'2026-08-23', bookingdate:'2026-05-14', guests:4, infants:0, nationality:'Others', channel:'Booking.com', amount:508800, commission:0 },
  { guestname:'rocio',   checkin:'2026-08-29', checkout:'2026-08-30', bookingdate:'2026-04-17', guests:3, infants:0, nationality:'Others', channel:'Booking.com', amount:231562, commission:0 },
  // 9월
  { guestname:'simone',  checkin:'2026-09-01', checkout:'2026-09-03', bookingdate:'2026-03-30', guests:2, infants:0, nationality:'Others', channel:'Booking.com', amount:388151, commission:0 },
  { guestname:'배병조',  checkin:'2026-09-04', checkout:'2026-09-11', bookingdate:'2026-05-03', guests:3, infants:0, nationality:'Korea', channel:'Naver', amount:1313000, commission:2.0 },
  { guestname:'yang',    checkin:'2026-09-16', checkout:'2026-09-17', bookingdate:'2026-04-04', guests:4, infants:0, nationality:'Taiwan', channel:'Booking.com', amount:190929, commission:0 },
  { guestname:'sonam',   checkin:'2026-09-20', checkout:'2026-09-22', bookingdate:'2026-03-16', guests:3, infants:0, nationality:'Others', channel:'Airbnb', amount:420426, commission:17.1 },
  { guestname:'김진희',  checkin:'2026-09-23', checkout:'2026-09-25', bookingdate:'2026-03-26', guests:4, infants:0, nationality:'Korea', channel:'Naver', amount:430000, commission:2.0 },
  { guestname:'ziv',     checkin:'2026-09-26', checkout:'2026-09-28', bookingdate:'2026-03-08', guests:3, infants:0, nationality:'Others', channel:'Booking.com', amount:407180, commission:0 },
] as const;

const ICAL_CHANNELS: { channel: Channel; label: string; dot: string }[] = [
  { channel: 'Airbnb',      label: 'Airbnb',      dot: 'bg-rose-500'   },
  { channel: 'Booking.com', label: 'Booking.com', dot: 'bg-blue-600'   },
];

// ── 공용 스타일 ────────────────────────────────────────────────
const section = 'bg-card border border-border/30 rounded-xl overflow-hidden mb-3';
const row     = 'flex items-center justify-between px-4 py-3.5 border-b border-border/15 last:border-0';
const label   = 'text-[13px] font-medium text-foreground';
const sub     = 'text-[11px] text-muted-foreground/70 mt-0.5';
const secHead = 'text-[10.5px] font-bold text-muted-foreground/55 uppercase tracking-widest mb-2 mt-6 px-1';
const val     = 'text-[12px] text-muted-foreground/80';

const Toggle = ({ on, onClick }: { on: boolean; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className={`relative w-11 h-[22px] rounded-full flex-shrink-0 transition-colors duration-250 ${on ? 'bg-primary' : 'bg-muted-foreground/25'}`}
  >
    <div className={`absolute top-[2px] left-[2px] w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-transform duration-250 ${on ? 'translate-x-[18px]' : ''}`} />
  </button>
);

// ── Component ──────────────────────────────────────────────────
const SettingsPage = () => {
  const { open: openSidebar } = useSidebar();
  const { t, language } = useTranslation();
  const {
    settings, properties, updateSettings, updateProperty, addProperty, deleteProperty,
    syncChannels, syncLoading, lastSyncResults,
    fetchSyncChannels, saveSyncChannel, deleteSyncChannel, triggerSync, fetchData,
  } = useStore();

  const ko = language === 'ko';
  const [notifications, setNotifications] = useState(settings?.notifications ?? true);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [isAddingProperty, setIsAddingProperty] = useState(false);
  const [restoreStatus, setRestoreStatus] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  const handleRestoreJune2026 = async () => {
    setRestoring(true);
    setRestoreStatus('현재 데이터 확인 중...');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setRestoreStatus('❌ 로그인 필요'); return; }

      const prop = properties[0];
      if (!prop) { setRestoreStatus('❌ 숙소를 먼저 추가해주세요'); return; }

      // 중복 체크 및 기존 데이터 조회
      const { data: existing } = await supabase
        .from('bookings').select('id, guestname, checkin, bookingdate')
        .eq('host_id', user.id)
        .gte('checkin', '2026-05-29').lte('checkin', '2026-09-30'); // <-- UPDATED RANGE

      const existingMap = new Map((existing ?? []).map(b => [`${b.guestname}|${b.checkin}`, b]));
      const existingSet = new Set(existingMap.keys());

      const toInsert = RESTORE_2026_DATA.filter(
        b => !existingSet.has(`${b.guestname}|${b.checkin}`)
      );

      const toUpdate = RESTORE_2026_DATA.map(b => {
        const exist = existingMap.get(`${b.guestname}|${b.checkin}`);
        if (exist && exist.bookingdate !== b.bookingdate) {
          return { id: exist.id, newBookingDate: b.bookingdate };
        }
        return null;
      }).filter(Boolean);

      if (toInsert.length === 0 && toUpdate.length === 0) {
        setRestoreStatus('✅ 이미 모두 올바르게 입력되어 있습니다');
        return;
      }

      setRestoreStatus(`${toInsert.length}건 삽입, ${toUpdate.length}건 수정 중...`);

      // 업데이트 실행
      if (toUpdate.length > 0) {
        for (const update of toUpdate) {
          await supabase.from('bookings').update({ bookingdate: update!.newBookingDate }).eq('id', update!.id);
        }
      }

      // 삽입 실행
      if (toInsert.length > 0) {
        const rows = toInsert.map(b => ({
          host_id: user.id, property_id: prop.id,
          guestname: b.guestname, checkin: b.checkin, checkout: b.checkout,
          bookingdate: b.bookingdate, guests: b.guests, infants: b.infants,
          nationality: b.nationality, channel: b.channel,
          status: 'confirmed', amount: b.amount, commission: b.commission,
        }));

        const { error } = await supabase.from('bookings').insert(rows);
        if (error) { setRestoreStatus(`❌ ${error.message}`); return; }
      }

      await fetchData();
      setRestoreStatus(`✅ ${toInsert.length}건 복구, ${toUpdate.length}건 예약일 수정 완료!`);
    } finally {
      setRestoring(false);
    }
  };

  const [cleaningStatus, setCleaningStatus] = useState<string | null>(null);
  const [isCleaning, setIsCleaning] = useState(false);

  const handleCleanupData = async () => {
    setIsCleaning(true);
    setCleaningStatus('데이터 정제 확인 중...');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setCleaningStatus('❌ 로그인 필요'); return; }

      const { data: allBookings } = await supabase
        .from('bookings').select('id, nationality, channel')
        .eq('host_id', user.id);

      if (!allBookings) {
        setCleaningStatus('❌ 데이터가 없습니다.'); return;
      }

      let updateCount = 0;
      for (const b of allBookings) {
        let newNat = b.nationality;
        let newChan = b.channel;

        // Normalize Nationality
        const nLow = (b.nationality || '').toLowerCase().trim();
        if (['대한민국', '한국', 'korea', 'kr'].includes(nLow)) newNat = 'Korea';
        else if (['대만', 'taiwan', 'tw'].includes(nLow)) newNat = 'Taiwan';
        else if (['싱가폴', '싱가포르', 'singapore', 'sg'].includes(nLow)) newNat = 'Singapore';
        else if (['중국', 'china', 'cn'].includes(nLow)) newNat = 'China';
        else if (['서구권', '미국', '영국', '프랑스', '독일', '호주', '캐나다', '이탈리아', '스페인', '네덜란드', '스위스', '러시아', 'western', 'us', 'uk'].includes(nLow)) newNat = 'Western';
        else if (nLow !== 'others' && nLow !== 'korea' && nLow !== 'taiwan' && nLow !== 'singapore' && nLow !== 'china' && nLow !== 'western') newNat = 'Others';

        // Normalize Channel
        const cLow = (b.channel || '').toLowerCase().trim();
        if (['에어비앤비', 'airbnb'].includes(cLow)) newChan = 'Airbnb';
        else if (['부킹닷컴', 'booking.com', 'booking'].includes(cLow)) newChan = 'Booking.com';
        else if (['네이버', 'naver'].includes(cLow)) newChan = 'Naver';
        else if (cLow !== 'airbnb' && cLow !== 'booking.com' && cLow !== 'naver' && cLow !== 'direct') newChan = 'Direct';

        if (newNat !== b.nationality || newChan !== b.channel) {
          await supabase.from('bookings').update({ nationality: newNat, channel: newChan }).eq('id', b.id);
          updateCount++;
        }
      }

      if (updateCount > 0) {
        await fetchData();
        setCleaningStatus(`✅ 정제 완료: ${updateCount}건의 데이터가 수정되었습니다.`);
      } else {
        setCleaningStatus('✅ 모든 데이터가 이미 깨끗합니다.');
      }
    } catch(e: any) {
      setCleaningStatus(`❌ 오류: ${e.message}`);
    } finally {
      setIsCleaning(false);
    }
  };

  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  const toggleDark = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  const [icalInputs, setIcalInputs] = useState<Record<Channel, string>>({
    Airbnb: '', 'Booking.com': '', Naver: '', Direct: '',
  });
  const [savingCh, setSavingCh]   = useState<Channel | null>(null);
  const [saveErr,  setSaveErr]    = useState<Record<string, string>>({});
  const [saveWarn, setSaveWarn]   = useState<Record<string, string>>({});
  const [saveOk,   setSaveOk]     = useState<Record<string, boolean>>({});
  const [confirmDel, setConfirmDel] = useState<Channel | null>(null);

  useEffect(() => { fetchSyncChannels(); }, [fetchSyncChannels]);
  useEffect(() => {
    const filled: Record<string, string> = { Airbnb: '', 'Booking.com': '', Naver: '', Direct: '' };
    syncChannels.forEach(c => { filled[c.channel] = c.icalUrl; });
    setIcalInputs(filled as Record<Channel, string>);
  }, [syncChannels]);

  const handleSaveIcal = async (channel: Channel) => {
    const url = icalInputs[channel]?.trim();
    if (!url) return;
    setSavingCh(channel);
    setSaveErr(p => ({ ...p, [channel]: '' }));
    setSaveWarn(p => ({ ...p, [channel]: '' }));
    setSaveOk(p => ({ ...p, [channel]: false }));
    try {
      await saveSyncChannel(channel, url);
      setSaveOk(p => ({ ...p, [channel]: true }));
      setTimeout(() => setSaveOk(p => ({ ...p, [channel]: false })), 3000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '저장 실패';
      if (msg.startsWith('URL이 저장되었습니다')) {
        setSaveOk(p => ({ ...p, [channel]: true }));
        setSaveWarn(p => ({ ...p, [channel]: msg }));
        setTimeout(() => setSaveWarn(p => ({ ...p, [channel]: '' })), 8000);
      } else {
        setSaveErr(p => ({ ...p, [channel]: msg }));
      }
    } finally { setSavingCh(null); }
  };

  const handleDeleteChannel = async (channel: Channel) => {
    if (confirmDel !== channel) { setConfirmDel(channel); return; }
    const existing = syncChannels.find(c => c.channel === channel);
    if (!existing) return;
    try {
      await deleteSyncChannel(existing.id);
      setIcalInputs(p => ({ ...p, [channel]: '' }));
    } finally { setConfirmDel(null); }
  };

  const fmtSync = (iso: string | null) => {
    if (!iso) return null;
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (diff < 1) return '방금 전';
    if (diff < 60) return `${diff}분 전`;
    return `${Math.floor(diff / 60)}시간 전`;
  };

  const handleSaveProperty = (propId: string | null, data: Partial<Property>) => {
    if (propId === null) { addProperty(data as Omit<Property, 'id'>); setIsAddingProperty(false); }
    else { updateProperty(propId, data); setEditingProperty(null); }
  };

  const maxProperties = 3;

  return (
    <div className="bg-background min-h-screen pb-28">

      {/* 헤더 */}
      <header className="flex items-center gap-2 px-4 py-4 lg:hidden">
        <button className="p-1 -ml-1 text-foreground" onClick={openSidebar}>
          <Menu size={22} />
        </button>
        <h1 className="text-[17px] font-bold text-foreground">{ko ? '설정' : 'Settings'}</h1>
      </header>

      <div className="px-4">

        {/* 프로필 */}
        <div className="flex items-center justify-between py-3 mb-2">
          <div className="min-w-0">
            <p className="text-[15px] font-bold text-foreground truncate">{settings?.profileName || '오조록 사장님'}</p>
            <p className="text-[12px] text-muted-foreground/70 mt-0.5 truncate">{useStore.getState().userProfile?.email || ''}</p>
          </div>
          <span className="text-[10px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-lg flex-shrink-0 ml-3">
            {settings?.plan === 'pro' ? 'Pro' : 'Basic'}
          </span>
        </div>

        {/* ── 6~9월 데이터 복구 버튼 (임시) ── */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl px-4 py-3.5 mb-3">
          <p className="text-[12px] font-bold text-amber-700 dark:text-amber-400 mb-1">26년 예약 데이터 일괄 복구</p>
          <p className="text-[11px] text-amber-600/80 dark:text-amber-500/80 mb-3">
            누락된 6~9월 예약을 자동으로 확인하고, 잘못된 예약일을 수정합니다.
          </p>
          <button
            onClick={handleRestoreJune2026}
            disabled={restoring}
            className="h-8 px-4 text-[12px] font-semibold bg-amber-500 text-white rounded-lg disabled:opacity-50 transition-opacity"
          >
            {restoring ? '처리 중...' : '데이터 복구/수정 실행'}
          </button>
          {restoreStatus && (
            <p className="mt-2 text-[12px] text-amber-700 dark:text-amber-400 font-medium">{restoreStatus}</p>
          )}
        </div>

        {/* ── 데이터베이스 정제 ── */}
        <div className="bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800/40 rounded-xl px-4 py-3.5 mb-3">
          <p className="text-[12px] font-bold text-sky-700 dark:text-sky-400 mb-1">데이터베이스 정제</p>
          <p className="text-[11px] text-sky-600/80 dark:text-sky-500/80 mb-3">
            '대한민국' → 'Korea' 등 통계에 방해되는 이명(異名) 데이터를 표준 규격으로 일괄 정제합니다.
          </p>
          <button
            onClick={handleCleanupData}
            disabled={isCleaning}
            className="h-8 px-4 text-[12px] font-semibold bg-sky-500 text-white rounded-lg disabled:opacity-50 transition-opacity"
          >
            {isCleaning ? '정제 중...' : '데이터 정제 실행'}
          </button>
          {cleaningStatus && (
            <p className="mt-2 text-[12px] text-sky-700 dark:text-sky-400 font-medium">{cleaningStatus}</p>
          )}
        </div>

        {/* ── 숙소 관리 ── */}
        <p className={secHead}>{ko ? '숙소 관리' : 'Properties'}</p>
        <div className={section}>
          {properties?.map(prop => (
            <button key={prop.id} className={`${row} w-full text-left`} onClick={() => setEditingProperty(prop)}>
              <div>
                <p className={label}>{prop.name}</p>
                <p className={sub}>기준 {prop.baseGuests}명 &nbsp;·&nbsp; 체크인 {prop.checkInTime}</p>
              </div>
              <span className="text-[11px] text-muted-foreground/50">{ko ? '편집' : 'Edit'}</span>
            </button>
          ))}
          {(properties?.length ?? 0) < maxProperties && (
            <button className={`${row} w-full text-left`} onClick={() => setIsAddingProperty(true)}>
              <div>
                <p className={`${label} text-primary`}>+ {ko ? '객실 추가' : 'Add Property'}</p>
                <p className={sub}>최대 {maxProperties}개 등록 가능</p>
              </div>
            </button>
          )}
        </div>

        {/* ── iCal 동기화 ── */}
        <p className={secHead}>iCal 동기화</p>
        <div className="flex flex-col gap-2.5 mb-3">
          {ICAL_CHANNELS.map(({ channel, label: chLabel, dot }) => {
            const saved    = syncChannels.find(c => c.channel === channel);
            const isSaving = savingCh === channel;
            const err      = saveErr[channel];
            const warn     = saveWarn[channel];
            const ok       = saveOk[channel];
            return (
              <div key={channel} className="bg-card border border-border/30 rounded-xl px-4 py-3.5">
                {/* 채널 헤더 */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
                    <span className="text-[13px] font-semibold text-foreground">{chLabel}</span>
                    {saved?.lastSyncedAt && (
                      <span className="text-[11px] text-muted-foreground/60">· {fmtSync(saved.lastSyncedAt)}</span>
                    )}
                  </div>
                  {saved && (
                    <div className="flex items-center gap-2">
                      {confirmDel === channel && (
                        <button onClick={() => setConfirmDel(null)} className="text-[11px] text-muted-foreground">취소</button>
                      )}
                      <button
                        onClick={() => handleDeleteChannel(channel)}
                        className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                          confirmDel === channel ? 'bg-destructive text-white' : 'text-destructive bg-destructive/8'
                        }`}
                      >
                        {confirmDel === channel ? '확인' : '해제'}
                      </button>
                    </div>
                  )}
                </div>
                {/* URL 입력 + 저장 */}
                <div className="flex gap-2">
                  <input
                    type="url"
                    className="flex-1 text-[12px] px-3 py-2 rounded-lg border border-border/40 bg-muted/40 focus:outline-none focus:border-primary placeholder:text-muted-foreground/35 transition-colors"
                    placeholder={`${chLabel} iCal URL`}
                    value={icalInputs[channel] ?? ''}
                    onChange={e => setIcalInputs(p => ({ ...p, [channel]: e.target.value }))}
                  />
                  <button
                    onClick={() => handleSaveIcal(channel)}
                    disabled={isSaving || !icalInputs[channel]?.trim()}
                    className="px-3.5 py-2 rounded-lg text-[12px] font-bold bg-primary text-white disabled:opacity-40 flex-shrink-0 transition-opacity"
                  >
                    {isSaving ? '확인 중' : ok ? '저장됨' : '저장'}
                  </button>
                </div>
                {err && <p className="mt-2 text-[11px] text-destructive">{err}</p>}
                {warn && !err && <p className="mt-2 text-[11px] text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1.5 rounded-lg">{warn}</p>}
              </div>
            );
          })}
        </div>

        {/* 네이버 안내 */}
        <div className="bg-card border border-border/30 rounded-xl px-4 py-3.5 mb-3">
          <p className="text-[12px] font-semibold text-foreground mb-1">네이버 예약</p>
          <p className="text-[12px] text-muted-foreground/80 leading-relaxed">
            네이버 예약은 iCal 내보내기를 공식 지원하지 않습니다.
            채널 매니저를 사용 중이라면 해당 통합 iCal URL을 Airbnb 또는 Booking.com 칸에 입력하세요.
          </p>
        </div>

        {/* 수동 동기화 */}
        {syncChannels.length > 0 && (
          <div className="mb-3">
            <button
              onClick={triggerSync}
              disabled={syncLoading}
              className="w-full py-3 rounded-xl bg-primary text-white font-semibold text-[13px] disabled:opacity-50 transition-opacity"
            >
              {syncLoading ? '동기화 중...' : '지금 동기화'}
            </button>
            {lastSyncResults.length > 0 && (
              <div className="mt-2 bg-card border border-border/30 rounded-xl px-4 py-2">
                {lastSyncResults.map(r => (
                  <div key={r.channel} className="flex items-center justify-between py-1.5 text-[12px] border-b border-border/15 last:border-0">
                    <span className="font-medium text-foreground">{r.channel}</span>
                    {r.error
                      ? <span className="text-destructive">{r.error}</span>
                      : <span className="text-muted-foreground/70">
                          {(r.added + r.updated) > 0 ? <><b className="text-primary">{r.added + r.updated}건</b> 반영됨</> : '변경없음'}
                        </span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── 이벤트 표시 ── */}
        <p className={secHead}>{ko ? '이벤트 표시' : 'Event Colors'}</p>
        <div className="flex gap-2.5 mb-3">
          {([
            { mode: 'channel' as const, label: ko ? '채널 색상' : 'Channel', sub: 'Airbnb · Booking.com · Direct',
              bars: ['var(--channel-airbnb)', 'var(--channel-booking)', 'var(--channel-direct)'] },
            { mode: 'property' as const, label: ko ? '숙소 색상' : 'Property', sub: ko ? '숙소별 색상' : 'Per property',
              bars: properties.slice(0, 3).map((p, i) => p.color ?? ['#5C6BC0','#FF7043','#9CCC65'][i]) },
          ] as const).map(({ mode, label: ml, sub: ms, bars }) => {
            const active = (settings?.eventColorMode ?? 'channel') === mode;
            return (
              <button
                key={mode}
                onClick={() => updateSettings({ eventColorMode: mode })}
                className={`flex-1 text-left p-3.5 rounded-xl border-2 transition-all ${active ? 'border-primary bg-primary/5' : 'border-border/40 bg-card'}`}
              >
                <p className={`text-[12px] font-bold mb-0.5 ${active ? 'text-primary' : 'text-foreground'}`}>{ml}</p>
                <p className="text-[11px] text-muted-foreground/70 mb-2">{ms}</p>
                <div className="flex gap-1">
                  {bars.map((c, i) => <div key={i} className="h-2 flex-1 rounded-sm" style={{ backgroundColor: c }} />)}
                </div>
              </button>
            );
          })}
        </div>

        {/* ── 앱 설정 ── */}
        <p className={secHead}>{ko ? '앱 설정' : 'App Settings'}</p>
        <div className={section}>
          <div className={row}>
            <p className={label}>{ko ? '알림' : 'Notifications'}</p>
            <Toggle on={notifications} onClick={() => { const v = !notifications; setNotifications(v); updateSettings({ notifications: v }); }} />
          </div>
          <div className={row}>
            <p className={label}>{ko ? '다크 모드' : 'Dark Mode'}</p>
            <Toggle on={isDark} onClick={toggleDark} />
          </div>
          <button className={`${row} w-full text-left`} onClick={() => updateSettings({ language: language === 'en' ? 'ko' : 'en' })}>
            <p className={label}>{ko ? '언어' : 'Language'}</p>
            <span className={val}>{language === 'ko' ? '한국어' : 'English'}</span>
          </button>
          <div className={row}>
            <p className={label}>{ko ? '통화' : 'Currency'}</p>
            <span className={val}>{settings?.currency || 'KRW'}</span>
          </div>
        </div>

        {/* ── 로그아웃 ── */}
        <button
          className="w-full py-3.5 mt-1 text-[13px] font-semibold text-destructive bg-card border border-border/30 rounded-xl transition-colors hover:bg-destructive/5"
          onClick={() => useStore.getState().logout()}
        >
          {ko ? '로그아웃' : 'Sign Out'}
        </button>

        <p className="text-center text-[11px] text-muted-foreground/40 mt-6 mb-2">Version 3.0.1</p>
      </div>

      {(editingProperty !== null || isAddingProperty) && (
        <PropertyDetailModal
          isOpen={editingProperty !== null || isAddingProperty}
          property={editingProperty}
          onClose={() => { setEditingProperty(null); setIsAddingProperty(false); }}
          onSave={handleSaveProperty}
          onDelete={editingProperty ? () => { deleteProperty(editingProperty.id); setEditingProperty(null); } : undefined}
        />
      )}
    </div>
  );
};

export default SettingsPage;
