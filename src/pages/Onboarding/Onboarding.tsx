import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { validateICalUrl } from '../../services/icalSync/icalFetcher';
import type { OnboardingDraft } from '../../types';

// ── 상수 ──────────────────────────────────────────────────────────
const TOTAL_STEPS = 6;

const TIME_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const h = String(i).padStart(2, '0');
  return { value: `${h}:00`, label: `${h}:00` };
});

const GUEST_OPTIONS = [1, 2, 3, 4, 5, 6] as const;

interface IcalChannel {
  key: keyof Pick<OnboardingDraft, 'airbnbIcal' | 'bookingIcal' | 'naverIcal'>;
  name: string;
  placeholder: string;
}

const ICAL_CHANNELS: IcalChannel[] = [
  { key: 'airbnbIcal',   name: 'Airbnb',       placeholder: 'https://www.airbnb.com/calendar/ical/...' },
  { key: 'bookingIcal',  name: 'Booking.com',  placeholder: 'https://ical.booking.com/...'             },
  { key: 'naverIcal',    name: 'Naver',        placeholder: 'https://...'                               },
];

// ── 번역 헬퍼 ─────────────────────────────────────────────────────
// 온보딩 내 언어는 draft.language가 기준 (전역 설정 저장 전)
const t = (ko: string, en: string, lang: 'ko' | 'en') => lang === 'ko' ? ko : en;

// ── 디자인 토큰 (Login.tsx 동일) ──────────────────────────────────
const inputCls =
  'w-full px-4 py-3.5 rounded-xl border border-border type-body outline-none transition-all bg-muted focus:border-primary focus:bg-card focus:shadow-[0_0_0_4px_var(--primary-ring)] placeholder:text-muted-foreground/50 disabled:opacity-50';

const selectCls =
  'w-full px-4 py-3.5 rounded-xl border border-border type-body outline-none transition-all bg-muted text-foreground focus:border-primary focus:bg-card focus:shadow-[0_0_0_4px_var(--primary-ring)] cursor-pointer';

const primaryBtnCls =
  'w-full py-3.5 rounded-xl bg-primary text-primary-foreground type-body font-semibold tracking-wide transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-95 active:scale-[0.98]';

const ghostBtnCls =
  'w-full py-3 text-sm text-muted-foreground hover:text-foreground transition-colors';

const labelCls = 'text-sm font-medium text-foreground';

// ── 진행 바 ───────────────────────────────────────────────────────
const ProgressBar = ({ step, total }: { step: number; total: number }) => (
  <div className="flex flex-col gap-2 mb-8">
    <div className="flex justify-between text-[11px] text-muted-foreground">
      <span>{step} / {total}</span>
    </div>
    <div className="h-0.5 bg-muted rounded-full overflow-hidden">
      <div
        className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
        style={{ width: `${(step / total) * 100}%` }}
      />
    </div>
  </div>
);

// ── Step 1 — 언어 + 이름 ──────────────────────────────────────────
const Step1 = ({
  draft, patch, onNext,
}: { draft: OnboardingDraft; patch: (p: Partial<OnboardingDraft>) => void; onNext: () => void }) => {
  const lang = draft.language;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="type-display text-foreground">
          {t('오조캘린더에 오신 걸\n환영해요', 'Welcome to\nOZO Calendar', lang)}
        </h2>
        <p className="type-body text-muted-foreground">
          {t('숙소 운영을 더 스마트하게.', 'Smarter property management.', lang)}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <span className={labelCls}>{t('언어', 'Language', lang)}</span>
          <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-xl">
            {(['ko', 'en'] as const).map(lng => (
              <button
                key={lng}
                type="button"
                onClick={() => patch({ language: lng })}
                className={`py-2.5 rounded-lg type-body font-medium transition-all ${
                  draft.language === lng
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {lng === 'ko' ? '한국어' : 'English'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className={labelCls}>
            {t('이름', 'Name', lang)}
            <span className="ml-1 text-muted-foreground font-normal">
              {t('(선택)', '(optional)', lang)}
            </span>
          </label>
          <input
            className={inputCls}
            placeholder={t('홍길동', 'Your name', lang)}
            value={draft.profileName}
            onChange={e => patch({ profileName: e.target.value })}
            autoFocus
          />
        </div>
      </div>

      <button className={primaryBtnCls} onClick={onNext}>
        {t('시작하기', 'Get started', lang)}
      </button>
    </div>
  );
};

// ── Step 2 — 숙소 기본 정보 ───────────────────────────────────────
const Step2 = ({
  draft, patch, onNext, onBack,
}: { draft: OnboardingDraft; patch: (p: Partial<OnboardingDraft>) => void; onNext: () => void; onBack: () => void }) => {
  const lang = draft.language;
  const valid = draft.propertyName.trim().length > 0;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="type-display text-foreground">{t('숙소 정보', 'Property Info', lang)}</h2>
        <p className="type-body text-muted-foreground">
          {t('운영 중인 숙소의 기본 정보를 입력해주세요.', 'Tell us about your property.', lang)}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label className={labelCls}>{t('숙소 이름', 'Property name', lang)}</label>
          <input
            className={inputCls}
            placeholder={t('예) 오조록 독채', 'e.g. Sunset Cottage', lang)}
            value={draft.propertyName}
            onChange={e => patch({ propertyName: e.target.value })}
            autoFocus
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className={labelCls}>{t('기준 인원', 'Base guests', lang)}</label>
          <div className="grid grid-cols-6 gap-1.5">
            {GUEST_OPTIONS.map(n => (
              <button
                key={n}
                type="button"
                onClick={() => patch({ baseGuests: n })}
                className={`py-2.5 rounded-lg type-body font-semibold border transition-all ${
                  draft.baseGuests === n
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-muted text-muted-foreground hover:border-foreground/30 hover:text-foreground'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {t('기준 인원 초과 시 추가 요금이 붙습니다.', 'Guests above this count incur extra fees.', lang)}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <button className={primaryBtnCls} onClick={onNext} disabled={!valid}>
          {t('다음', 'Next', lang)}
        </button>
        <button className={ghostBtnCls} onClick={onBack}>{t('이전', 'Back', lang)}</button>
      </div>
    </div>
  );
};

// ── Step 3 — 요금 설정 ────────────────────────────────────────────
const Step3 = ({
  draft, patch, onNext, onBack,
}: { draft: OnboardingDraft; patch: (p: Partial<OnboardingDraft>) => void; onNext: () => void; onBack: () => void }) => {
  const lang = draft.language;
  const currencySym = '₩';

  const fields: { label: string; key: keyof OnboardingDraft; hint?: string }[] = [
    {
      label: t('평일 요금 (1박)', 'Weekday rate / night', lang),
      key: 'basePrice',
    },
    {
      label: t('주말 요금 (금·토)', 'Weekend rate (Fri·Sat)', lang),
      key: 'weekendPrice',
    },
    {
      label: t('추가 인원 요금 (1인당)', 'Extra guest fee / person', lang),
      key: 'extraGuestFee',
    },
    {
      label: t('청소비', 'Cleaning fee', lang),
      key: 'cleaningFee',
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="type-display text-foreground">{t('요금 설정', 'Pricing', lang)}</h2>
        <p className="type-body text-muted-foreground">
          {t('나중에 설정에서 언제든 변경할 수 있어요.', 'You can update these anytime in settings.', lang)}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {fields.map(({ label, key }) => (
          <div key={key} className="flex flex-col gap-1.5">
            <label className={labelCls}>{label}</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 type-body text-muted-foreground pointer-events-none select-none">
                {currencySym}
              </span>
              <input
                type="number"
                min={0}
                step={1000}
                className={inputCls + ' pl-8'}
                placeholder="0"
                value={(draft[key] as number) || ''}
                onChange={e => patch({ [key]: Number(e.target.value) })}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <button className={primaryBtnCls} onClick={onNext}>
          {t('다음', 'Next', lang)}
        </button>
        <button className={ghostBtnCls} onClick={onBack}>{t('이전', 'Back', lang)}</button>
      </div>
    </div>
  );
};

// ── Step 4 — 운영 시간 ────────────────────────────────────────────
const Step4 = ({
  draft, patch, onNext, onBack,
}: { draft: OnboardingDraft; patch: (p: Partial<OnboardingDraft>) => void; onNext: () => void; onBack: () => void }) => {
  const lang = draft.language;
  const timeFields: { label: string; key: 'checkInTime' | 'checkOutTime' }[] = [
    { label: t('체크인 시간', 'Check-in time', lang),  key: 'checkInTime'  },
    { label: t('체크아웃 시간', 'Check-out time', lang), key: 'checkOutTime' },
  ];
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="type-display text-foreground">{t('운영 시간', 'Check-in / Out', lang)}</h2>
        <p className="type-body text-muted-foreground">
          {t('기본 체크인·아웃 시간을 설정해주세요.', 'Set your default check-in and check-out times.', lang)}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {timeFields.map(({ label, key }) => (
          <div key={key} className="flex flex-col gap-1.5">
            <label className={labelCls}>{label}</label>
            <select
              className={selectCls}
              value={draft[key]}
              onChange={e => patch({ [key]: e.target.value })}
            >
              {TIME_OPTIONS.map(({ value, label: lbl }) => (
                <option key={value} value={value}>{lbl}</option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <button className={primaryBtnCls} onClick={onNext}>
          {t('다음', 'Next', lang)}
        </button>
        <button className={ghostBtnCls} onClick={onBack}>{t('이전', 'Back', lang)}</button>
      </div>
    </div>
  );
};

// ── Step 5 — 채널 연결 ────────────────────────────────────────────
type ValidationState = 'idle' | 'checking' | 'ok' | 'error';

const Step5 = ({
  draft, patch, onNext, onBack,
}: { draft: OnboardingDraft; patch: (p: Partial<OnboardingDraft>) => void; onNext: () => void; onBack: () => void }) => {
  const lang = draft.language;
  const [states, setStates] = useState<Record<string, ValidationState>>({});
  const [errors, setErrors]  = useState<Record<string, string>>({});

  const setChannelState = (key: string, s: ValidationState) =>
    setStates(prev => ({ ...prev, [key]: s }));
  const setChannelError = (key: string, msg: string) =>
    setErrors(prev => ({ ...prev, [key]: msg }));

  const handleValidate = async (ch: IcalChannel) => {
    const url = (draft[ch.key] as string).trim();
    if (!url) return;
    setChannelState(ch.key, 'checking');
    const result = await validateICalUrl(url);
    if (result.valid) {
      setChannelState(ch.key, 'ok');
      setChannelError(ch.key, '');
    } else {
      setChannelState(ch.key, 'error');
      setChannelError(ch.key, result.error ?? t('유효하지 않은 URL입니다.', 'Invalid URL.', lang));
    }
  };

  const stateLabel: Record<ValidationState, string> = {
    idle:     t('확인', 'Verify', lang),
    checking: t('확인 중...', 'Checking...', lang),
    ok:       t('연결됨', 'Connected', lang),
    error:    t('재확인', 'Retry', lang),
  };

  const stateColor: Record<ValidationState, string> = {
    idle:     'text-muted-foreground hover:text-foreground',
    checking: 'text-muted-foreground',
    ok:       'text-primary',
    error:    'text-destructive',
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="type-display text-foreground">{t('채널 연결', 'Channel Connect', lang)}</h2>
        <p className="type-body text-muted-foreground">
          {t(
            'iCal 주소를 연결하면 예약이 자동으로 동기화돼요.\n나중에 설정에서도 추가할 수 있어요.',
            'Connect iCal URLs to auto-sync bookings.\nYou can add these later in settings.',
            lang,
          )}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {ICAL_CHANNELS.map(ch => {
          const url   = (draft[ch.key] as string);
          const state = states[ch.key] ?? 'idle';
          const err   = errors[ch.key] ?? '';
          return (
            <div key={ch.key} className="flex flex-col gap-1.5">
              <label className={labelCls}>{ch.name}</label>
              <div className="flex gap-2">
                <input
                  className={inputCls}
                  placeholder={ch.placeholder}
                  value={url}
                  onChange={e => {
                    patch({ [ch.key]: e.target.value });
                    setChannelState(ch.key, 'idle');
                    setChannelError(ch.key, '');
                  }}
                />
                {url.trim() && (
                  <button
                    type="button"
                    disabled={state === 'checking'}
                    onClick={() => handleValidate(ch)}
                    className={`shrink-0 text-[12px] font-medium px-3 rounded-xl border border-border bg-muted transition-colors ${stateColor[state]}`}
                  >
                    {stateLabel[state]}
                  </button>
                )}
              </div>
              {err && (
                <p className="text-[11px] text-destructive">{err}</p>
              )}
              {state === 'ok' && (
                <p className="text-[11px] text-primary">{t('정상적으로 연결됐습니다.', 'Successfully connected.', lang)}</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-2">
        <button className={primaryBtnCls} onClick={onNext}>
          {t('다음', 'Next', lang)}
        </button>
        <button className={ghostBtnCls} onClick={onBack}>
          {t('나중에 연결할게요', 'Skip for now', lang)}
        </button>
      </div>
    </div>
  );
};

// ── Step 6 — 완료 ─────────────────────────────────────────────────
const Step6 = ({
  draft, onFinish, saving,
}: { draft: OnboardingDraft; onFinish: () => void; saving: boolean }) => {
  const lang = draft.language;

  const summaryRows = [
    { label: t('숙소 이름',      'Property',       lang), value: draft.propertyName              },
    { label: t('기준 인원',      'Base guests',    lang), value: `${draft.baseGuests}명`          },
    { label: t('평일 요금',      'Weekday rate',   lang), value: draft.basePrice   ? `₩${draft.basePrice.toLocaleString()}`   : t('미입력', '—', lang) },
    { label: t('주말 요금',      'Weekend rate',   lang), value: draft.weekendPrice ? `₩${draft.weekendPrice.toLocaleString()}` : t('미입력', '—', lang) },
    { label: t('체크인',         'Check-in',       lang), value: draft.checkInTime               },
    { label: t('체크아웃',       'Check-out',      lang), value: draft.checkOutTime              },
  ];

  const connectedChannels = ICAL_CHANNELS
    .filter(ch => (draft[ch.key] as string).trim())
    .map(ch => ch.name);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="type-display text-foreground">{t('설정 완료', 'Almost done!', lang)}</h2>
        <p className="type-body text-muted-foreground">
          {t('아래 내용으로 숙소를 등록할게요.', "We'll register your property with these details.", lang)}
        </p>
      </div>

      <div className="bg-muted/60 rounded-2xl overflow-hidden border border-border/60">
        {summaryRows.map(({ label, value }, i) => (
          <div
            key={label}
            className={`flex justify-between px-4 py-3 text-sm ${i < summaryRows.length - 1 ? 'border-b border-border/40' : ''}`}
          >
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium text-foreground">{value}</span>
          </div>
        ))}
        {connectedChannels.length > 0 && (
          <div className="flex justify-between px-4 py-3 text-sm border-t border-border/40">
            <span className="text-muted-foreground">{t('연결된 채널', 'Channels', lang)}</span>
            <span className="font-medium text-foreground">{connectedChannels.join(', ')}</span>
          </div>
        )}
      </div>

      <button className={primaryBtnCls} onClick={onFinish} disabled={saving}>
        {saving ? t('저장 중...', 'Saving...', lang) : t('앱 시작하기', 'Start the app', lang)}
      </button>
    </div>
  );
};

// ── 메인 온보딩 페이지 ─────────────────────────────────────────────
const OnboardingPage = () => {
  const navigate = useNavigate();
  const {
    onboardingStep,    setOnboardingStep,
    onboardingDraft,   patchOnboardingDraft,
    resetOnboarding,   setOnboardingCompleted,
    addProperty, saveSyncChannel, updateSettings, showToast,
  } = useStore();

  const [saving, setSaving] = useState(false);
  const lang = onboardingDraft.language;

  const next = () => setOnboardingStep(Math.min(onboardingStep + 1, TOTAL_STEPS));
  const back = () => setOnboardingStep(Math.max(onboardingStep - 1, 1));

  const handleFinish = async () => {
    setSaving(true);
    try {
      // 1. 언어·이름 설정
      updateSettings({ language: lang, profileName: onboardingDraft.profileName });

      // 2. 숙소 생성
      await addProperty({
        name:           onboardingDraft.propertyName,
        baseGuests:     onboardingDraft.baseGuests,
        basePrice:      onboardingDraft.basePrice,
        weekendPrice:   onboardingDraft.weekendPrice,
        extraGuestFee:  onboardingDraft.extraGuestFee,
        cleaningFee:    onboardingDraft.cleaningFee,
        checkInTime:    onboardingDraft.checkInTime,
        checkOutTime:   onboardingDraft.checkOutTime,
        noExtraGuestFee: false,
      });

      // 3. 입력된 iCal 채널 저장
      for (const ch of ICAL_CHANNELS) {
        const url = (onboardingDraft[ch.key] as string).trim();
        if (url) await saveSyncChannel(ch.name as 'Airbnb' | 'Booking.com' | 'Naver', url);
      }

      // 4. 완료 플래그 + 드래프트 초기화
      setOnboardingCompleted(true);
      resetOnboarding();

      navigate('/', { replace: true });
    } catch (err) {
      showToast(
        (err as Error).message || t('저장 중 오류가 발생했습니다.', 'Something went wrong.', lang),
        'error',
      );
    } finally {
      setSaving(false);
    }
  };

  const stepProps = { draft: onboardingDraft, patch: patchOnboardingDraft };

  const steps: Record<number, React.ReactNode> = {
    1: <Step1 {...stepProps} onNext={next} />,
    2: <Step2 {...stepProps} onNext={next} onBack={back} />,
    3: <Step3 {...stepProps} onNext={next} onBack={back} />,
    4: <Step4 {...stepProps} onNext={next} onBack={back} />,
    5: <Step5 {...stepProps} onNext={next} onBack={back} />,
    6: <Step6 draft={onboardingDraft} onFinish={handleFinish} saving={saving} />,
  };

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm flex flex-col">
        {/* 로고 */}
        <div className="mb-8 text-center">
          <span className="text-base font-bold tracking-tight text-foreground">
            OZO Calendar
          </span>
        </div>

        <ProgressBar step={onboardingStep} total={TOTAL_STEPS} />

        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          {steps[onboardingStep]}
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
