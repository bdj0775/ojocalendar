import { ChevronRight, Edit, Bed, Bell, Globe, CircleDollarSign, LogOut, Plus, Link, Percent, RefreshCw, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { useTranslation } from '../../hooks/useTranslation';
import PropertyDetailModal from '../../components/Modals/PropertyDetailModal';
import type { Channel, Property } from '../../types';

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
    <div className="bg-card rounded-2xl border border-border/50 shadow-sm mb-4 px-6 py-5">
      <p className="text-sm font-bold text-foreground mb-1">내 예약 캘린더 URL</p>
      <p className="text-[13px] text-muted-foreground mb-4 leading-relaxed">
        이 URL을 각 플랫폼의 "외부 캘린더 가져오기"에 등록하면,
        한 채널에 예약이 들어올 때 다른 채널의 해당 날짜가 자동으로 차단됩니다.
      </p>
      <div className="flex gap-2 mb-4">
        <div className="flex-1 min-w-0 px-3 py-2.5 rounded-xl bg-muted/50 text-[13px] text-muted-foreground font-mono truncate select-all border border-border/50">
          {exportUrl}
        </div>
        <button
          onClick={handleCopy}
          className="px-4 py-2.5 rounded-xl text-[13px] font-bold bg-primary text-white flex items-center gap-1.5 hover:bg-primary/90 transition-colors"
        >
          {copied ? <CheckCircle size={14} /> : <Link size={14} />}
          {copied ? '복사됨' : '복사'}
        </button>
      </div>
      <div className="space-y-1.5 p-3 bg-muted/30 rounded-xl">
        <p className="text-[12px] text-muted-foreground">
          <span className="font-bold text-slate-700 dark:text-slate-300">Airbnb:</span> 캘린더 &gt; 캘린더 가져오기 &gt; URL 붙여넣기
        </p>
        <p className="text-[12px] text-muted-foreground">
          <span className="font-bold text-slate-700 dark:text-slate-300">Booking.com:</span> Extranet &gt; 객실 &gt; 이용 불가 설정 &gt; iCal
        </p>
      </div>
    </div>
  );
}

const DesktopSettings = () => {
  const { t, language } = useTranslation();
  const {
    settings, properties, updateSettings, updateProperty,
    syncChannels, syncLoading, lastSyncResults,
    fetchSyncChannels, saveSyncChannel, deleteSyncChannel, triggerSync,
    showToast, logout
  } = useStore();

  const [notifications, setNotifications] = useState(settings?.notifications ?? true);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);

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

  const sectionCls = "mb-10";
  const sectionTitleCls = "text-[12px] font-bold text-muted-foreground uppercase tracking-wider mb-4 pl-1";
  const cardCls = "bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden";
  const rowCls = "flex items-center px-6 py-4 gap-4 transition-colors hover:bg-muted/30 cursor-pointer border-b border-border/40 last:border-0";
  const iconWrapCls = "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0";
  
  return (
    <div className="h-full overflow-y-auto bg-background text-foreground custom-scrollbar px-6 py-8">
      <div className="max-w-[760px] mx-auto pb-20">
        
        {/* Profile Header */}
        <div className="flex items-center gap-5 mb-12 p-6 bg-card rounded-3xl border border-border/50 shadow-sm">
          <div className="relative">
            <img
              src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80"
              alt="Profile"
              className="w-20 h-20 rounded-full object-cover border-2 border-primary/20 shadow-sm"
            />
            <button className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow-sm hover:bg-primary/90 transition-colors border-2 border-background">
              <Edit size={12} color="white" />
            </button>
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-1.5">{settings?.profileName || '오조록 사장님'}</h2>
            <div className="inline-flex items-center bg-primary/10 text-primary text-[11px] font-bold px-2.5 py-1 rounded-md">
              {settings?.plan === 'pro' ? 'Pro Plan' : 'Basic Plan (1객실)'}
            </div>
          </div>
        </div>

        {/* Properties */}
        <div className={sectionCls}>
          <h3 className={sectionTitleCls}>{t('settings.propertyManagement') || 'PROPERTY MANAGEMENT'}</h3>
          <div className={cardCls}>
            {properties?.map((prop, idx) => (
              <div key={prop.id} className={rowCls} onClick={() => setEditingProperty(prop)}>
                <div className={`${iconWrapCls} bg-primary/10`}>
                  <Bed size={18} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-0.5">{prop.name}</p>
                  <p className="text-[12px] text-muted-foreground">기준 {prop.baseGuests}명 / 체크인 {prop.checkInTime}</p>
                </div>
                <Edit size={16} className="text-muted-foreground/50" />
              </div>
            ))}

            {activePropertiesCount < maxProperties && (
              <div className={`${rowCls} opacity-70`} onClick={showComingSoon}>
                <div className={`${iconWrapCls} bg-muted`}>
                  <Plus size={18} className="text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-muted-foreground mb-0.5">객실 추가</p>
                  <p className="text-[12px] text-muted-foreground">Pro Plan 전용 (최대 3개 객실)</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sync Channels */}
        <div className={sectionCls}>
          <h3 className={sectionTitleCls}>예약 채널 자동 동기화 (iCal)</h3>
          <div className={cardCls}>
            {ICAL_CHANNELS.map(({ channel, label, color, bg }, idx) => {
              const saved = syncChannels.find(c => c.channel === channel);
              const isSaving = savingChannel === channel;
              const err = saveErrors[channel];
              const warn = saveWarnings[channel];
              const ok = saveSuccess[channel];
              return (
                <div key={channel} className={`p-6 ${idx > 0 ? 'border-t border-border/40' : ''}`}>
                  <div className="flex items-center gap-4 mb-4">
                    <div className={iconWrapCls} style={{ background: bg }}>
                      <Link size={18} color={color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{label}</p>
                      {saved?.lastSyncedAt && (
                        <p className="text-[12px] text-muted-foreground mt-0.5">마지막 동기화: {formatSyncTime(saved.lastSyncedAt)}</p>
                      )}
                    </div>
                    {saved && (
                      <div className="flex items-center gap-2">
                        {confirmDeleteChannel === channel && (
                          <button
                            onClick={() => setConfirmDeleteChannel(null)}
                            className="text-[12px] font-bold text-muted-foreground hover:text-foreground px-2"
                          >
                            취소
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteChannel(channel)}
                          className={`p-2 rounded-xl transition-colors ${
                            confirmDeleteChannel === channel
                              ? 'bg-destructive text-destructive-foreground'
                              : 'bg-destructive/10 text-destructive hover:bg-destructive/20'
                          }`}
                          title={confirmDeleteChannel === channel ? '클릭하여 삭제 확인' : '연동 해제'}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      className="flex-1 text-[13px] px-4 py-2.5 rounded-xl border border-border/60 bg-transparent focus:outline-none focus:border-primary placeholder:text-muted-foreground/40 transition-colors"
                      placeholder={`${label} iCal URL 붙여넣기`}
                      value={icalInputs[channel] ?? ''}
                      onChange={e => setIcalInputs(prev => ({ ...prev, [channel]: e.target.value }))}
                    />
                    <button
                      onClick={() => handleSaveIcal(channel)}
                      disabled={isSaving || !icalInputs[channel]?.trim()}
                      className="px-4 py-2.5 rounded-xl text-[13px] font-bold bg-primary text-white disabled:opacity-40 flex items-center gap-1.5 flex-shrink-0 hover:bg-primary/90 transition-colors"
                    >
                      {isSaving
                        ? <RefreshCw size={14} className="animate-spin" />
                        : ok
                          ? <CheckCircle size={14} />
                          : <ChevronRight size={14} />}
                      {isSaving ? '확인 중' : ok ? '저장됨' : '저장'}
                    </button>
                  </div>
                  {err && (
                    <div className="flex items-start gap-1.5 mt-3 text-destructive text-[12px] font-medium bg-destructive/10 px-3 py-2 rounded-lg">
                      <XCircle size={14} className="flex-shrink-0 mt-0.5" />
                      <span>{err}</span>
                    </div>
                  )}
                  {warn && !err && (
                    <div className="flex items-start gap-1.5 mt-3 text-amber-600 text-[12px] font-medium bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-lg">
                      <span className="flex-shrink-0 mt-0.5">⚠</span>
                      <span>{warn}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex items-start gap-3 px-5 py-4 bg-muted/30 rounded-2xl border border-border/40">
            <div className={iconWrapCls} style={{ background: 'var(--channel-naver-bg)' }}>
              <Link size={18} color="var(--channel-naver)" />
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">네이버 예약</p>
              <p className="text-[12px] text-muted-foreground leading-relaxed">
                네이버 예약은 iCal 내보내기를 공식 지원하지 않습니다.
                채널 매니저(예: 마이박스, 에서, 호텔리어)를 사용 중이라면
                해당 통합 iCal URL을 Airbnb 또는 Booking.com 칸에 입력하세요.
              </p>
            </div>
          </div>

          {syncChannels.length > 0 && (
            <div className="mt-6">
              <button
                onClick={triggerSync}
                disabled={syncLoading}
                className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-sm disabled:opacity-50 hover:bg-primary/90 transition-colors shadow-sm"
              >
                <RefreshCw size={16} className={syncLoading ? 'animate-spin' : ''} />
                {syncLoading ? '동기화 중...' : '지금 동기화'}
              </button>
              {lastSyncResults.length > 0 && (
                <div className="mt-3 px-5 py-4 bg-card rounded-2xl border border-border/50 shadow-sm">
                  {lastSyncResults.map(r => {
                    const total = r.added + r.updated;
                    return (
                      <div key={r.channel} className="flex items-center justify-between text-[13px] py-1.5 border-b border-border/30 last:border-0">
                        <span className="font-bold text-slate-800 dark:text-slate-200">{r.channel}</span>
                        {r.error
                          ? <span className="text-destructive font-medium flex items-center gap-1.5"><XCircle size={14} /> {r.error}</span>
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
        </div>

        {properties[0] && (
          <div className={sectionCls}>
            <h3 className={sectionTitleCls}>자동 예약 막기 (크로스 채널 블로킹)</h3>
            <ExportIcalSection
              hostId={useStore.getState().userProfile?.id ?? ''}
              propertyId={properties[0].id}
            />
          </div>
        )}

        <div className={sectionCls}>
          <h3 className={sectionTitleCls}>수수료 세팅</h3>
          <div className={cardCls}>
            <div className={`${rowCls} cursor-default hover:bg-transparent`}>
              <div className={iconWrapCls} style={{ background: 'var(--channel-naver-bg)' }}>
                <Percent size={18} color="var(--channel-naver)" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-0.5">기준 수수료율 설정</p>
                <p className="text-[12px] text-muted-foreground">현재 다이렉트 예약 비율 위주 설정</p>
              </div>
              <span className="text-[15px] font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-lg">0%</span>
            </div>
          </div>
        </div>

        <div className={sectionCls}>
          <h3 className={sectionTitleCls}>{t('settings.appSettings') || 'APP SETTINGS'}</h3>
          <div className={cardCls}>
            <div className={`${rowCls} hover:bg-transparent cursor-default`}>
              <div className={`${iconWrapCls} bg-primary/10`}>
                <Bell size={18} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-0.5">{t('settings.notifications') || 'Notifications'}</p>
                <p className="text-[12px] text-muted-foreground">{t('settings.bookingAlerts') || 'Booking alerts'}</p>
              </div>
              <button
                type="button"
                className={`relative w-[48px] h-6 rounded-full flex-shrink-0 transition-colors duration-300 ${notifications ? 'bg-primary' : 'bg-muted border border-border/50'}`}
                onClick={() => {
                  const v = !notifications;
                  setNotifications(v);
                  updateSettings({ notifications: v });
                }}
              >
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-300 ${notifications ? 'translate-x-[22px]' : 'translate-x-0'}`} />
              </button>
            </div>
            <div className={rowCls} onClick={toggleLanguage}>
              <div className={`${iconWrapCls} bg-primary/10`}>
                <Globe size={18} className="text-primary" />
              </div>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200 flex-1">{t('settings.language') || 'Language'}</span>
              <span className="text-[13px] font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-lg">{language === 'ko' ? '한국어' : 'English'}</span>
            </div>
            <div className={rowCls}>
              <div className={`${iconWrapCls} bg-primary/10`}>
                <CircleDollarSign size={18} className="text-primary" />
              </div>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200 flex-1">{t('settings.currency') || 'Currency'}</span>
              <span className="text-[13px] font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-lg">{settings?.currency || 'KRW'}</span>
            </div>
          </div>
        </div>

        <button
          className="flex items-center justify-center gap-2 w-full py-4 text-destructive text-[14px] font-bold mt-4 bg-destructive/5 hover:bg-destructive/10 rounded-2xl transition-colors"
          onClick={logout}
        >
          <LogOut size={16} className="text-destructive" />
          <span>{t('settings.signOut') || 'Sign Out'}</span>
        </button>

        <p className="text-center text-[12px] font-medium text-muted-foreground/50 mt-10">Version 3.0.1 (Auth Enabled)</p>
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

export default DesktopSettings;
