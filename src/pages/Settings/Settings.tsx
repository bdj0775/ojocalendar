import { Menu } from 'lucide-react';
import { useSidebar } from '../../context/SidebarContext';
import { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { useTranslation } from '../../hooks/useTranslation';
import PropertyDetailModal from '../../components/Modals/PropertyDetailModal';
import type { Channel, Property } from '../../types';

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
    fetchSyncChannels, saveSyncChannel, deleteSyncChannel, triggerSync,
  } = useStore();

  const ko = language === 'ko';
  const [notifications, setNotifications] = useState(settings?.notifications ?? true);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [isAddingProperty, setIsAddingProperty] = useState(false);
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
