import { ChevronLeft, ChevronRight, Edit, Bed, Bell, Globe, CircleDollarSign, LogOut, Plus, Link, Percent, RefreshCw, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { useTranslation } from '../../hooks/useTranslation';
import PropertyDetailModal from '../../components/Modals/PropertyDetailModal';
import type { Channel, Property } from '../../types';

// 네이버는 공식 iCal 미지원 → 별도 안내 처리
const ICAL_CHANNELS: { channel: Channel; label: string; color: string; bg: string }[] = [
  { channel: 'Airbnb',      label: 'Airbnb',      color: 'var(--channel-airbnb)',  bg: 'var(--channel-airbnb-bg)' },
  { channel: 'Booking.com', label: 'Booking.com', color: 'var(--channel-booking)', bg: 'var(--channel-booking-bg)' },
];

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

function ExportIcalSection({ hostId, propertyId }: { hostId: string; propertyId: string }) {
  const [copied, setCopied] = useState(false);
  const exportUrl = `${SUPABASE_URL}/functions/v1/export-ical?host=${hostId}&property=${propertyId}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(exportUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div className="bg-card rounded-sheet shadow-card-xs mb-3 px-5 py-4">
      <p className="type-card-title text-foreground mb-1">내 예약 캘린더 URL</p>
      <p className="type-label text-muted-foreground mb-3 leading-relaxed">
        이 URL을 각 플랫폼의 "외부 캘린더 가져오기"에 등록하면,
        한 채널에 예약이 들어올 때 다른 채널의 해당 날짜가 자동으로 차단됩니다.
      </p>
      <div className="flex gap-2">
        <div className="flex-1 min-w-0 px-3 py-2.5 rounded-xl bg-muted text-xs text-muted-foreground font-mono truncate select-all">
          {exportUrl}
        </div>
        <button
          onClick={handleCopy}
          className="px-3 py-2.5 rounded-xl text-xs font-semibold bg-primary text-white flex items-center gap-1.5 flex-shrink-0"
        >
          {copied ? <CheckCircle size={13} /> : <Link size={13} />}
          {copied ? '복사됨' : '복사'}
        </button>
      </div>
      <div className="mt-3 space-y-1">
        <p className="type-label text-muted-foreground">
          <span className="font-semibold text-foreground">Airbnb:</span> 캘린더 &gt; 캘린더 가져오기 &gt; URL 붙여넣기
        </p>
        <p className="type-label text-muted-foreground">
          <span className="font-semibold text-foreground">Booking.com:</span> Extranet &gt; 객실 &gt; 이용 불가 설정 &gt; iCal
        </p>
      </div>
    </div>
  );
}

const SettingsPage = () => {
  const navigate = useNavigate();
  const { t, language } = useTranslation();
  const {
    settings, properties, updateSettings, updateProperty,
    syncChannels, syncLoading, lastSyncResults,
    fetchSyncChannels, saveSyncChannel, deleteSyncChannel, triggerSync,
    showToast,
  } = useStore();

  const [notifications, setNotifications] = useState(settings?.notifications ?? true);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);

  // iCal URL 입력 상태 (채널별)
  const [icalInputs, setIcalInputs] = useState<Record<Channel, string>>({
    'Airbnb': '', 'Booking.com': '', 'Naver': '', 'Direct': '',
  });
  const [savingChannel, setSavingChannel] = useState<Channel | null>(null);
  const [saveErrors, setSaveErrors] = useState<Record<string, string>>({});
  const [saveWarnings, setSaveWarnings] = useState<Record<string, string>>({});
  const [saveSuccess, setSaveSuccess] = useState<Record<string, boolean>>({});
  const [confirmDeleteChannel, setConfirmDeleteChannel] = useState<Channel | null>(null);

  useEffect(() => {
    fetchSyncChannels();
  }, [fetchSyncChannels]);

  // 저장된 채널 URL을 입력 필드에 미리 채움
  useEffect(() => {
    const filled: Record<string, string> = { 'Airbnb': '', 'Booking.com': '', 'Naver': '', 'Direct': '' };
    syncChannels.forEach(c => { filled[c.channel] = c.icalUrl; });
    setIcalInputs(filled as Record<Channel, string>);
  }, [syncChannels]);

  const handleSaveIcal = async (channel: Channel) => {
    const url = icalInputs[channel]?.trim();
    if (!url) return;
    setSavingChannel(channel);
    setSaveErrors(prev => ({ ...prev, [channel]: '' }));
    setSaveWarnings(prev => ({ ...prev, [channel]: '' }));
    setSaveSuccess(prev => ({ ...prev, [channel]: false }));
    try {
      await saveSyncChannel(channel, url);
      setSaveSuccess(prev => ({ ...prev, [channel]: true }));
      setTimeout(() => setSaveSuccess(prev => ({ ...prev, [channel]: false })), 3000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '저장 실패';
      // "저장되었습니다"로 시작하면 경고(노란색), 그 외는 오류(빨간색)
      if (msg.startsWith('URL이 저장되었습니다')) {
        setSaveSuccess(prev => ({ ...prev, [channel]: true }));
        setSaveWarnings(prev => ({ ...prev, [channel]: msg }));
        setTimeout(() => setSaveWarnings(prev => ({ ...prev, [channel]: '' })), 8000);
      } else {
        setSaveErrors(prev => ({ ...prev, [channel]: msg }));
      }
    } finally {
      setSavingChannel(null);
    }
  };

  const handleDeleteChannel = async (channel: Channel) => {
    if (confirmDeleteChannel !== channel) {
      setConfirmDeleteChannel(channel);
      return;
    }
    const existing = syncChannels.find(c => c.channel === channel);
    if (!existing) return;
    try {
      await deleteSyncChannel(existing.id);
      setIcalInputs(prev => ({ ...prev, [channel]: '' }));
    } finally {
      setConfirmDeleteChannel(null);
    }
  };

  const formatSyncTime = (iso: string | null) => {
    if (!iso) return null;
    const d = new Date(iso);
    const diff = Math.floor((Date.now() - d.getTime()) / 60000);
    if (diff < 1) return '방금 전';
    if (diff < 60) return `${diff}분 전`;
    return `${Math.floor(diff / 60)}시간 전`;
  };

  const toggleLanguage = () => {
    updateSettings({ language: language === 'en' ? 'ko' : 'en' });
  };

  const handleSaveProperty = (propId: string, updatedData: Partial<Property>) => {
    updateProperty(propId, updatedData);
    setEditingProperty(null);
  };

  const showComingSoon = () => {
    showToast(t('settings.comingSoon') || '서비스 준비중입니다.', 'info');
  };

  const activePropertiesCount = properties?.length || 1;
  const maxProperties = 3;

  const menuItemCls = 'flex items-center w-full px-5 py-4 gap-3.5 text-left cursor-pointer';
  const menuIconCls = 'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0';
  const menuTextCls = 'type-card-title text-foreground';
  const menuSubCls = 'type-label text-muted-foreground mt-1';
  const dividerCls = 'h-px bg-muted mx-5';
  const cardCls = 'bg-card rounded-sheet py-1 mb-6 shadow-card-xs';
  const sectionLabelCls = 'type-label font-bold text-muted-foreground tracking-[0.5px] mb-3 mt-4';

  return (
    <div className="bg-background min-h-screen pb-24">
      {/* Header */}
      <header className="flex justify-between items-center px-5 py-4">
        <button className="flex items-center" onClick={() => navigate(-1)}>
          <ChevronLeft size={22} color="var(--foreground)" />
        </button>
        <h1 className="type-section-title">{t('settings.title') || 'Settings'}</h1>
        <div style={{ width: 22 }} />
      </header>

      {/* Profile Section */}
      <div className="flex flex-col items-center px-5 pt-4 pb-7">
        <div className="relative mb-3">
          <img
            src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80"
            alt="Profile"
            className="w-24 h-24 rounded-full object-cover border-4 border-primary-100 shadow-[0_8px_24px_var(--primary-glow)]"
          />
          <button className="absolute bottom-1 right-1 w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow-[0_2px_8px_var(--primary-glow-lg)]">
            <Edit size={12} color="white" />
          </button>
        </div>
        <h2 className="text-xl font-bold mb-1.5">{settings?.profileName || '오조록 사장님'}</h2>
        <div className="bg-muted text-muted-foreground type-label font-semibold px-3 py-1 rounded-xl">
          {settings?.plan === 'pro' ? 'Pro Plan' : 'Basic Plan (1객실)'}
        </div>
      </div>

      <div className="px-5">
        {/* Properties */}
        <p className={sectionLabelCls}>{t('settings.propertyManagement') || 'PROPERTY MANAGEMENT'}</p>
        <div className={cardCls}>
          {properties?.map((prop, idx) => (
            <div key={prop.id}>
              <button className={menuItemCls} onClick={() => setEditingProperty(prop)}>
                <div className={`${menuIconCls} bg-primary-50`}>
                  <Bed size={18} color="var(--primary)" />
                </div>
                <div className="flex-1 flex flex-col">
                  <span className={menuTextCls}>{prop.name}</span>
                  <span className={menuSubCls}>기준 {prop.baseGuests}명 / 체크인 {prop.checkInTime}</span>
                </div>
                <Edit size={16} color="var(--border)" />
              </button>
              {idx < activePropertiesCount - 1 && <div className={dividerCls} />}
            </div>
          ))}

          {activePropertiesCount < maxProperties && (
            <>
              <div className={dividerCls} />
              <button className={`${menuItemCls} opacity-80`} onClick={showComingSoon}>
                <div className={`${menuIconCls} bg-slate-100`}>
                  <Plus size={18} color="var(--muted-foreground)" />
                </div>
                <div className="flex-1 flex flex-col">
                  <span className="type-card-title text-muted-foreground">객실 추가</span>
                  <span className={menuSubCls}>Pro Plan 전용 (최대 3개 객실)</span>
                </div>
              </button>
            </>
          )}
        </div>

        {/* iCal Sync */}
        <p className={sectionLabelCls}>예약 채널 자동 동기화 (iCal)</p>
        <div className="bg-card rounded-sheet shadow-card-xs mb-3 overflow-hidden">
          {ICAL_CHANNELS.map(({ channel, label, color, bg }, idx) => {
            const saved = syncChannels.find(c => c.channel === channel);
            const isSaving = savingChannel === channel;
            const err = saveErrors[channel];
            const warn = saveWarnings[channel];
            const ok = saveSuccess[channel];
            return (
              <div key={channel}>
                {idx > 0 && <div className={dividerCls} />}
                <div className="px-5 py-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`${menuIconCls} flex-shrink-0`} style={{ background: bg }}>
                      <Link size={18} color={color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={menuTextCls}>{label}</span>
                      {saved?.lastSyncedAt && (
                        <p className={menuSubCls}>마지막 동기화: {formatSyncTime(saved.lastSyncedAt)}</p>
                      )}
                    </div>
                    {saved && (
                      <div className="flex items-center gap-1">
                        {confirmDeleteChannel === channel && (
                          <button
                            onClick={() => setConfirmDeleteChannel(null)}
                            className="text-xs text-muted-foreground hover:text-foreground px-1"
                          >
                            취소
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteChannel(channel)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            confirmDeleteChannel === channel
                              ? 'bg-red-500 text-white'
                              : 'text-destructive hover:bg-red-50'
                          }`}
                          title={confirmDeleteChannel === channel ? '클릭하여 삭제 확인' : '연동 해제'}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      className="flex-1 text-xs px-3 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:border-primary placeholder:text-muted-foreground/50"
                      placeholder={`${label} iCal URL 붙여넣기`}
                      value={icalInputs[channel] ?? ''}
                      onChange={e => setIcalInputs(prev => ({ ...prev, [channel]: e.target.value }))}
                    />
                    <button
                      onClick={() => handleSaveIcal(channel)}
                      disabled={isSaving || !icalInputs[channel]?.trim()}
                      className="px-3 py-2.5 rounded-xl text-xs font-semibold bg-primary text-white disabled:opacity-40 flex items-center gap-1.5 flex-shrink-0"
                    >
                      {isSaving
                        ? <RefreshCw size={13} className="animate-spin" />
                        : ok
                          ? <CheckCircle size={13} />
                          : <ChevronRight size={13} />}
                      {isSaving ? '확인 중' : ok ? '저장됨' : '저장'}
                    </button>
                  </div>
                  {err && (
                    <div className="flex items-start gap-1.5 mt-2 text-destructive text-xs">
                      <XCircle size={12} className="flex-shrink-0 mt-0.5" />
                      <span>{err}</span>
                    </div>
                  )}
                  {warn && !err && (
                    <div className="flex items-start gap-1.5 mt-2 text-amber-600 text-xs bg-amber-50 rounded-xl px-3 py-2">
                      <span className="flex-shrink-0 mt-0.5">⚠</span>
                      <span>{warn}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 네이버 예약 안내 (iCal 미지원) */}
        <div className="flex items-start gap-3 px-4 py-3.5 bg-card rounded-2xl shadow-card-xs mb-3">
          <div className={`${menuIconCls} flex-shrink-0`} style={{ background: 'var(--channel-naver-bg)' }}>
            <Link size={18} color="var(--channel-naver)" />
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <p className={menuTextCls}>네이버 예약</p>
            <p className={`${menuSubCls} leading-relaxed`}>
              네이버 예약은 iCal 내보내기를 공식 지원하지 않습니다.
              채널 매니저(예: 마이박스, 에서, 호텔리어)를 사용 중이라면
              해당 통합 iCal URL을 Airbnb 또는 Booking.com 칸에 입력하세요.
            </p>
          </div>
        </div>

        {/* 수동 동기화 버튼 + 마지막 결과 */}
        {syncChannels.length > 0 && (
          <div className="mb-6">
            <button
              onClick={triggerSync}
              disabled={syncLoading}
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-primary text-white font-semibold text-sm disabled:opacity-50"
            >
              <RefreshCw size={16} className={syncLoading ? 'animate-spin' : ''} />
              {syncLoading ? '동기화 중...' : '지금 동기화'}
            </button>
            {lastSyncResults.length > 0 && (
              <div className="mt-2 px-4 py-3 bg-card rounded-2xl shadow-card-xs">
                {lastSyncResults.map(r => {
                  const total = r.added + r.updated;
                  return (
                    <div key={r.channel} className="flex items-center justify-between text-xs py-1">
                      <span className="font-medium text-foreground">{r.channel}</span>
                      {r.error
                        ? <span className="text-destructive flex items-center gap-1"><XCircle size={11} /> {r.error}</span>
                        : <span className="text-muted-foreground">
                            {total > 0
                              ? <><b className="text-primary">{total}건</b> 반영됨</>
                              : '변경사항 없음'}
                          </span>
                      }
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 자동 예약 막기: Export iCal URL */}
        {properties[0] && (
          <>
            <p className={sectionLabelCls}>자동 예약 막기 (크로스 채널 블로킹)</p>
            <ExportIcalSection
              hostId={useStore.getState().userProfile?.id ?? ''}
              propertyId={properties[0].id}
            />
          </>
        )}

        {/* 수수료 설정 */}
        <p className={sectionLabelCls}>수수료 세팅</p>
        <div className={cardCls}>
          <button className={menuItemCls}>
            <div className={menuIconCls} style={{ background: 'var(--channel-naver-bg)' }}>
              <Percent size={18} color="var(--channel-naver)" />
            </div>
            <div className="flex-1 flex flex-col">
              <span className={menuTextCls}>기준 수수료율 설정</span>
              <span className={menuSubCls}>현재 다이렉트 예약 비율 위주 설정</span>
            </div>
            <span className="text-sm font-semibold text-primary">0%</span>
          </button>
        </div>

        {/* App Settings */}
        <p className={sectionLabelCls}>{t('settings.appSettings') || 'APP SETTINGS'}</p>
        <div className={cardCls}>
          {/* Notifications toggle */}
          <div className={menuItemCls}>
            <div className={`${menuIconCls} bg-primary-50`}>
              <Bell size={18} color="var(--primary)" />
            </div>
            <div className="flex-1 flex flex-col">
              <span className={menuTextCls}>{t('settings.notifications') || 'Notifications'}</span>
              <span className={menuSubCls}>{t('settings.bookingAlerts') || 'Booking alerts'}</span>
            </div>
            <button
              type="button"
              className={`relative w-[50px] h-7 rounded-2xl flex-shrink-0 transition-colors duration-300 ${notifications ? 'bg-primary' : 'bg-border'}`}
              onClick={() => {
                const v = !notifications;
                setNotifications(v);
                updateSettings({ notifications: v });
              }}
            >
              <div className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-transform duration-300 ${notifications ? 'translate-x-[22px]' : 'translate-x-0'}`} />
            </button>
          </div>
          <div className={dividerCls} />
          <button className={menuItemCls} onClick={toggleLanguage}>
            <div className={`${menuIconCls} bg-primary-50`}>
              <Globe size={18} color="var(--primary)" />
            </div>
            <span className={menuTextCls}>{t('settings.language') || 'Language'}</span>
            <span className="text-sm font-semibold text-primary ml-auto">{language === 'ko' ? '한국어' : 'English'}</span>
          </button>
          <div className={dividerCls} />
          <button className={menuItemCls}>
            <div className={`${menuIconCls} bg-primary-50`}>
              <CircleDollarSign size={18} color="var(--primary)" />
            </div>
            <span className={menuTextCls}>{t('settings.currency') || 'Currency'}</span>
            <span className="text-sm font-semibold text-primary ml-auto">{settings?.currency || 'KRW'}</span>
          </button>
        </div>

        {/* Sign Out */}
        <button
          className="flex items-center justify-center gap-2 w-full py-4 text-red-500 text-base font-semibold mt-2 bg-white rounded-2xl shadow-card-xs cursor-pointer"
          onClick={() => useStore.getState().logout()}
        >
          <LogOut size={18} color="var(--destructive)" />
          <span>{t('settings.signOut') || 'Sign Out'}</span>
        </button>

        <p className="text-center type-label text-muted-foreground/50 mt-5 pb-5">Version 3.0.1 (Auth Enabled)</p>
      </div>

      {editingProperty && (
        <PropertyDetailModal
          isOpen={!!editingProperty}
          property={editingProperty}
          onClose={() => setEditingProperty(null)}
          onSave={handleSaveProperty}
        />
      )}
    </div>
  );
};

export default SettingsPage;
