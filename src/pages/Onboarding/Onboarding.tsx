import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { validateICalUrl } from '../../services/icalSync/icalFetcher';
import type { OnboardingDraft } from '../../types';

// ── 상수 ──────────────────────────────────────────────────────────
const TOTAL_STEPS = 6;
const MAX_ROOMS = 3;

const TIME_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const h = String(i).padStart(2, '0');
  return `${h}:00`;
});

const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1).padStart(2, '0'),
  label: `${i + 1}월`,
}));

const DAYS = Array.from({ length: 31 }, (_, i) => ({
  value: String(i + 1).padStart(2, '0'),
  label: `${i + 1}일`,
}));

const GUEST_OPTIONS = [1, 2, 3, 4, 5, 6] as const;

interface IcalChannel {
  key: keyof Pick<OnboardingDraft, 'airbnbIcal' | 'bookingIcal'>;
  name: string;
  placeholder: string;
}

const ICAL_CHANNELS: IcalChannel[] = [
  { key: 'airbnbIcal',  name: 'Airbnb',      placeholder: 'https://www.airbnb.com/calendar/ical/...' },
  { key: 'bookingIcal', name: 'Booking.com',  placeholder: 'https://ical.booking.com/...'            },
];

// ── 번역 헬퍼 ─────────────────────────────────────────────────────
const tr = (ko: string, en: string, lang: 'ko' | 'en') => lang === 'ko' ? ko : en;

// ── 디자인 토큰 ───────────────────────────────────────────────────
const inputCls =
  'w-full px-4 py-3.5 rounded-xl type-body outline-none transition-all bg-muted text-foreground ' +
  'focus:bg-card focus:shadow-[0_0_0_4px_var(--primary-ring)] ' +
  'placeholder:text-muted-foreground/40 disabled:opacity-50';

const selectCls =
  'w-full px-4 py-3.5 rounded-xl type-body outline-none transition-all bg-muted text-foreground ' +
  'focus:bg-card focus:shadow-[0_0_0_4px_var(--primary-ring)] cursor-pointer';

const primaryBtnCls =
  'w-full py-3.5 rounded-xl bg-primary text-primary-foreground type-body font-semibold ' +
  'tracking-wide transition-all disabled:opacity-40 disabled:cursor-not-allowed ' +
  'hover:brightness-95 active:scale-[0.98]';

const backBtnCls = 'w-full py-3 text-sm text-muted-foreground hover:text-foreground transition-colors';

const skipBtnCls = 'text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors underline-offset-2 hover:underline';

const labelCls = 'text-sm font-medium text-foreground';
const helperCls = 'text-[11px] text-muted-foreground/70 leading-relaxed';

// ── 공통 필드 래퍼 ────────────────────────────────────────────────
const Field = ({ label, helper, children }: { label: string; helper?: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-1.5">
    <label className={labelCls}>{label}</label>
    {children}
    {helper && <p className={helperCls}>{helper}</p>}
  </div>
);

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
  draft, patch, onNext, onSkip,
}: { draft: OnboardingDraft; patch: (p: Partial<OnboardingDraft>) => void; onNext: () => void; onSkip: () => void }) => {
  const lang = draft.language;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="type-display text-foreground">
          {tr('오조캘린더에\n오신 걸 환영해요', 'Welcome to\nOZO Calendar', lang)}
        </h2>
        <p className="type-body text-muted-foreground mt-1">
          {tr('숙소 운영을 더 스마트하게.', 'Smarter property management.', lang)}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <Field
          label={tr('언어', 'Language', lang)}
          helper={tr('앱 전체의 표시 언어를 선택합니다.', 'Sets the display language across the app.', lang)}
        >
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
        </Field>

        <Field
          label={tr('이름', 'Your name', lang)}
          helper={tr('대시보드 상단에 표시됩니다. 나중에 설정에서 변경할 수 있어요.', 'Shown on the dashboard header. Changeable in settings later.', lang)}
        >
          <input
            className={inputCls}
            placeholder={tr('홍길동', 'Your name', lang)}
            value={draft.profileName}
            onChange={e => patch({ profileName: e.target.value })}
            autoFocus
          />
        </Field>
      </div>

      <div className="flex flex-col items-center gap-3">
        <button className={primaryBtnCls} onClick={onNext}>
          {tr('시작하기', 'Get started', lang)}
        </button>
        <button className={skipBtnCls} onClick={onSkip}>
          {tr('이름 없이 시작하기', 'Skip for now', lang)}
        </button>
      </div>
    </div>
  );
};

// ── Step 2 — 객실 정보 ────────────────────────────────────────────
const Step2 = ({
  draft, patch, onNext, onBack, onSkip,
}: { draft: OnboardingDraft; patch: (p: Partial<OnboardingDraft>) => void; onNext: () => void; onBack: () => void; onSkip: () => void }) => {
  const lang = draft.language;
  const roomName = (draft.roomNames ?? [''])[0] ?? '';
  const valid = roomName.trim().length > 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="type-display text-foreground">{tr('숙소 정보', 'Property Info', lang)}</h2>
        <p className="type-body text-muted-foreground mt-1">
          {tr('운영 중인 숙소의 기본 정보를 입력해주세요.', 'Tell us about your property.', lang)}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <Field
          label={tr('숙소(객실)명', 'Property / Room name', lang)}
          helper={tr(
            '예약 목록·캘린더·통계에서 이 이름으로 표시됩니다. 객실이 여러 개라면 설정에서 최대 3개까지 추가할 수 있어요.',
            'Shown across bookings, calendar, and analytics. Up to 3 rooms can be added in settings.',
            lang,
          )}
        >
          <input
            className={inputCls}
            placeholder={tr('예) 오조록 독채, 바다뷰 201호', 'e.g. Ocean View Suite', lang)}
            value={roomName}
            onChange={e => patch({ roomNames: [e.target.value] })}
            autoFocus
          />
        </Field>

        {/* 기준 인원 */}
        <Field
          label={tr('기준 인원', 'Base guests', lang)}
          helper={tr('기준 인원 초과 시 추가 요금이 붙습니다. 요금 설정에서 금액을 입력하세요.', 'Guests above this count incur extra fees, set in the next step.', lang)}
        >
          <div className="grid grid-cols-6 gap-1.5">
            {GUEST_OPTIONS.map(n => (
              <button
                key={n}
                type="button"
                onClick={() => patch({ baseGuests: n })}
                className={`py-2.5 rounded-lg type-body font-semibold transition-all ${
                  draft.baseGuests === n
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </Field>
      </div>

      <div className="flex flex-col items-center gap-3">
        <button className={primaryBtnCls} onClick={onNext} disabled={!valid}>
          {tr('다음', 'Next', lang)}
        </button>
        <button className={backBtnCls} onClick={onBack}>{tr('이전', 'Back', lang)}</button>
        <button className={skipBtnCls} onClick={onSkip}>
          {tr('나중에 입력하기', 'Skip for now', lang)}
        </button>
      </div>
    </div>
  );
};

// ── Step 3 — 요금 설정 ────────────────────────────────────────────
const Step3 = ({
  draft, patch, onNext, onBack, onSkip,
}: { draft: OnboardingDraft; patch: (p: Partial<OnboardingDraft>) => void; onNext: () => void; onBack: () => void; onSkip: () => void }) => {
  const lang = draft.language;
  const [peakM, peakD]   = (draft.peakSeasonStart ?? '07-01').split('-');
  const [peakEM, peakED] = (draft.peakSeasonEnd   ?? '08-15').split('-');

  const priceFields: { label: string; key: keyof OnboardingDraft; helper: string }[] = [
    {
      label: tr('평일 요금 (1박)', 'Weekday rate / night', lang),
      key: 'basePrice',
      helper: tr('월~목 기본 1박 요금입니다.', 'Mon–Thu base nightly rate.', lang),
    },
    {
      label: tr('주말·성수기 요금 (금 · 토 · 성수기)', 'Weekend & peak rate (Fri · Sat · peak)', lang),
      key: 'weekendPrice',
      helper: tr('금·토 및 성수기 기간에 적용되는 요금입니다.', 'Applied on Fri, Sat, and during peak season.', lang),
    },
    {
      label: tr('추가 인원 요금 (1인당)', 'Extra guest fee / person', lang),
      key: 'extraGuestFee',
      helper: tr('기준 인원 초과 1인당 추가로 받는 요금입니다.', 'Per-person fee charged above the base guest count.', lang),
    },
    {
      label: tr('청소비', 'Cleaning fee', lang),
      key: 'cleaningFee',
      helper: tr('체크아웃 후 청소 비용입니다. 0이면 미청구.', 'Post-checkout cleaning cost. Enter 0 to waive.', lang),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="type-display text-foreground">{tr('요금 설정', 'Pricing', lang)}</h2>
        <p className="type-body text-muted-foreground mt-1">
          {tr('나중에 설정에서 언제든 변경할 수 있어요.', 'You can update these anytime in settings.', lang)}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {priceFields.map(({ label, key, helper }) => (
          <Field key={key} label={label} helper={helper}>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 type-body text-muted-foreground pointer-events-none select-none">
                ₩
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
          </Field>
        ))}

        {/* 성수기 기간 설정 */}
        <div className="flex flex-col gap-2 pt-2 border-t border-border/40">
          <div className="flex flex-col gap-0.5">
            <span className={labelCls}>{tr('성수기 기간', 'Peak season period', lang)}</span>
            <p className={helperCls}>
              {tr('이 기간에는 주말·성수기 요금이 자동 적용됩니다.', 'Weekend & peak rate applies automatically during this period.', lang)}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] text-muted-foreground">{tr('시작', 'Start', lang)}</span>
              <div className="flex gap-1.5">
                <select
                  className={selectCls + ' text-sm'}
                  value={peakM}
                  onChange={e => patch({ peakSeasonStart: `${e.target.value}-${peakD}` })}
                >
                  {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                <select
                  className={selectCls + ' text-sm'}
                  value={peakD}
                  onChange={e => patch({ peakSeasonStart: `${peakM}-${e.target.value}` })}
                >
                  {DAYS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] text-muted-foreground">{tr('종료', 'End', lang)}</span>
              <div className="flex gap-1.5">
                <select
                  className={selectCls + ' text-sm'}
                  value={peakEM}
                  onChange={e => patch({ peakSeasonEnd: `${e.target.value}-${peakED}` })}
                >
                  {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                <select
                  className={selectCls + ' text-sm'}
                  value={peakED}
                  onChange={e => patch({ peakSeasonEnd: `${peakEM}-${e.target.value}` })}
                >
                  {DAYS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-3">
        <button className={primaryBtnCls} onClick={onNext}>
          {tr('다음', 'Next', lang)}
        </button>
        <button className={backBtnCls} onClick={onBack}>{tr('이전', 'Back', lang)}</button>
        <button className={skipBtnCls} onClick={onSkip}>
          {tr('나중에 입력하기', 'Skip for now', lang)}
        </button>
      </div>
    </div>
  );
};

// ── Step 4 — 운영 시간 ────────────────────────────────────────────
const Step4 = ({
  draft, patch, onNext, onBack, onSkip,
}: { draft: OnboardingDraft; patch: (p: Partial<OnboardingDraft>) => void; onNext: () => void; onBack: () => void; onSkip: () => void }) => {
  const lang = draft.language;
  const timeFields: { label: string; key: 'checkInTime' | 'checkOutTime'; helper: string }[] = [
    {
      label: tr('체크인 시간', 'Check-in time', lang),
      key: 'checkInTime',
      helper: tr('게스트가 입실 가능한 시간입니다.', 'The earliest time guests may check in.', lang),
    },
    {
      label: tr('체크아웃 시간', 'Check-out time', lang),
      key: 'checkOutTime',
      helper: tr('게스트가 퇴실을 완료해야 하는 시간입니다.', 'The latest time guests must check out.', lang),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="type-display text-foreground">{tr('운영 시간', 'Check-in / Out', lang)}</h2>
        <p className="type-body text-muted-foreground mt-1">
          {tr('기본 체크인·아웃 시간을 설정해주세요.', 'Set your default check-in and check-out times.', lang)}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {timeFields.map(({ label, key, helper }) => (
          <Field key={key} label={label} helper={helper}>
            <select
              className={selectCls}
              value={draft[key]}
              onChange={e => patch({ [key]: e.target.value })}
            >
              {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
        ))}
      </div>

      <div className="flex flex-col items-center gap-3">
        <button className={primaryBtnCls} onClick={onNext}>
          {tr('다음', 'Next', lang)}
        </button>
        <button className={backBtnCls} onClick={onBack}>{tr('이전', 'Back', lang)}</button>
        <button className={skipBtnCls} onClick={onSkip}>
          {tr('나중에 입력하기', 'Skip for now', lang)}
        </button>
      </div>
    </div>
  );
};

// ── Step 5 — 채널 연결 ────────────────────────────────────────────
type ValidationState = 'idle' | 'checking' | 'ok' | 'error';

const Step5 = ({
  draft, patch, onNext, onBack, onSkip,
}: { draft: OnboardingDraft; patch: (p: Partial<OnboardingDraft>) => void; onNext: () => void; onBack: () => void; onSkip: () => void }) => {
  const lang = draft.language;
  const [states, setStates] = useState<Record<string, ValidationState>>({});
  const [errors, setErrors]  = useState<Record<string, string>>({});

  const handleValidate = async (ch: IcalChannel) => {
    const url = (draft[ch.key] as string).trim();
    if (!url) return;
    setStates(p => ({ ...p, [ch.key]: 'checking' }));
    const result = await validateICalUrl(url);
    if (result.valid) {
      setStates(p => ({ ...p, [ch.key]: 'ok' }));
      setErrors(p => ({ ...p, [ch.key]: '' }));
    } else {
      setStates(p => ({ ...p, [ch.key]: 'error' }));
      setErrors(p => ({ ...p, [ch.key]: result.error ?? tr('유효하지 않은 URL입니다.', 'Invalid URL.', lang) }));
    }
  };

  const verifyLabel: Record<ValidationState, string> = {
    idle:     tr('확인', 'Verify', lang),
    checking: tr('확인 중...', 'Checking...', lang),
    ok:       tr('연결됨', 'Connected', lang),
    error:    tr('재확인', 'Retry', lang),
  };

  const verifyColor: Record<ValidationState, string> = {
    idle:     'text-muted-foreground hover:text-foreground',
    checking: 'text-muted-foreground',
    ok:       'text-primary',
    error:    'text-destructive',
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="type-display text-foreground">{tr('채널 연결', 'Connect Channels', lang)}</h2>
        <p className="type-body text-muted-foreground mt-1">
          {tr(
            'iCal 주소를 연결하면 예약이 자동으로 동기화됩니다.',
            'Connect iCal URLs to automatically sync bookings.',
            lang,
          )}
        </p>
      </div>

      <div className="flex flex-col gap-5">
        {ICAL_CHANNELS.map(ch => {
          const url   = draft[ch.key] as string;
          const state = states[ch.key] ?? 'idle';
          const err   = errors[ch.key] ?? '';
          return (
            <Field
              key={ch.key}
              label={ch.name}
              helper={tr(
                `${ch.name} 캘린더 설정에서 iCal/ics 내보내기 링크를 복사해 붙여넣으세요.`,
                `Copy the iCal/ics export link from your ${ch.name} calendar settings.`,
                lang,
              )}
            >
              <div className="flex gap-2">
                <input
                  className={inputCls}
                  placeholder={ch.placeholder}
                  value={url}
                  onChange={e => {
                    patch({ [ch.key]: e.target.value });
                    setStates(p => ({ ...p, [ch.key]: 'idle' }));
                    setErrors(p => ({ ...p, [ch.key]: '' }));
                  }}
                />
                {url.trim() && (
                  <button
                    type="button"
                    disabled={state === 'checking'}
                    onClick={() => handleValidate(ch)}
                    className={`shrink-0 px-3 rounded-xl bg-muted text-sm font-medium transition-colors ${verifyColor[state]}`}
                  >
                    {verifyLabel[state]}
                  </button>
                )}
              </div>
              {err && <p className="text-[11px] text-destructive">{err}</p>}
              {state === 'ok' && (
                <p className="text-[11px] text-primary">
                  {tr('정상적으로 연결됐습니다.', 'Successfully connected.', lang)}
                </p>
              )}
            </Field>
          );
        })}
      </div>

      <div className="flex flex-col items-center gap-3">
        <button className={primaryBtnCls} onClick={onNext}>
          {tr('다음', 'Next', lang)}
        </button>
        <button className={backBtnCls} onClick={onBack}>{tr('이전', 'Back', lang)}</button>
        <button className={skipBtnCls} onClick={onSkip}>
          {tr('나중에 연결하기', 'Skip for now', lang)}
        </button>
      </div>
    </div>
  );
};

// ── Step 6 — 확인 및 완료 ─────────────────────────────────────────
const Step6 = ({
  draft, onFinish, saving, onBack,
}: { draft: OnboardingDraft; onFinish: () => void; saving: boolean; onBack: () => void }) => {
  const lang = draft.language;

  const rooms = draft.roomNames.filter(r => r.trim());
  const connectedChannels = ICAL_CHANNELS
    .filter(ch => (draft[ch.key] as string).trim())
    .map(ch => ch.name);

  const summaryRows = [
    { label: tr('객실',    'Rooms',         lang), value: rooms.join(', ') || tr('미입력', '—', lang) },
    { label: tr('기준 인원', 'Base guests',  lang), value: `${draft.baseGuests}명` },
    { label: tr('평일 요금', 'Weekday rate', lang), value: draft.basePrice    ? `₩${draft.basePrice.toLocaleString()}`    : tr('미입력', '—', lang) },
    { label: tr('주말·성수기', 'Peak rate',  lang), value: draft.weekendPrice ? `₩${draft.weekendPrice.toLocaleString()}` : tr('미입력', '—', lang) },
    { label: tr('성수기',  'Peak season',   lang), value: `${(draft.peakSeasonStart ?? '07-01').replace('-', '/')} ~ ${(draft.peakSeasonEnd ?? '08-15').replace('-', '/')}` },
    { label: tr('체크인',  'Check-in',      lang), value: draft.checkInTime },
    { label: tr('체크아웃', 'Check-out',    lang), value: draft.checkOutTime },
    ...(connectedChannels.length > 0
      ? [{ label: tr('연결 채널', 'Channels', lang), value: connectedChannels.join(', ') }]
      : []),
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="type-display text-foreground">{tr('설정 확인', 'Almost done!', lang)}</h2>
        <p className="type-body text-muted-foreground mt-1">
          {tr('입력한 내용을 확인해주세요. 이후 설정에서 수정할 수 있어요.', 'Review your setup. Everything can be changed in settings later.', lang)}
        </p>
      </div>

      <div className="bg-muted/60 rounded-2xl overflow-hidden">
        {summaryRows.map(({ label, value }, i) => (
          <div
            key={label}
            className={`flex justify-between px-4 py-3 text-sm ${i < summaryRows.length - 1 ? 'border-b border-border/30' : ''}`}
          >
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium text-foreground text-right max-w-[60%]">{value}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center gap-3">
        <button className={primaryBtnCls} onClick={onFinish} disabled={saving}>
          {saving ? tr('저장 중...', 'Saving...', lang) : tr('앱 시작하기', 'Start the app', lang)}
        </button>
        <button className={backBtnCls} onClick={onBack}>{tr('이전', 'Back', lang)}</button>
      </div>
    </div>
  );
};

// ── 메인 온보딩 페이지 ─────────────────────────────────────────────
const OnboardingPage = () => {
  const navigate = useNavigate();
  const {
    onboardingStep, setOnboardingStep,
    onboardingDraft, patchOnboardingDraft,
    resetOnboarding, setOnboardingCompleted,
    addProperty, saveSyncChannel, updateSettings, showToast,
  } = useStore();

  const [saving, setSaving] = useState(false);
  const lang = onboardingDraft.language;

  const next = () => setOnboardingStep(Math.min(onboardingStep + 1, TOTAL_STEPS));
  const back = () => setOnboardingStep(Math.max(onboardingStep - 1, 1));

  // 각 스텝의 skip 동작 — 기본값 유지하고 다음으로 이동
  const skipStep = (step: number) => {
    if (step === 2 && !onboardingDraft.roomNames[0]?.trim()) {
      patchOnboardingDraft({ roomNames: [tr('내 숙소', 'My Property', lang)] });
    }
    next();
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      // 1. 프로필·언어·성수기 설정 저장
      updateSettings({
        language: lang,
        profileName: onboardingDraft.profileName,
        peakSeasonStart: onboardingDraft.peakSeasonStart,
        peakSeasonEnd: onboardingDraft.peakSeasonEnd,
      });

      // 2. 각 객실을 개별 Property로 생성 (첫 번째만 필수)
      const rooms = onboardingDraft.roomNames.filter(r => r.trim());
      if (rooms.length === 0) rooms.push(tr('내 숙소', 'My Property', lang));

      for (const roomName of rooms) {
        await addProperty({
          name:            roomName,
          baseGuests:      onboardingDraft.baseGuests,
          basePrice:       onboardingDraft.basePrice,
          weekendPrice:    onboardingDraft.weekendPrice,
          extraGuestFee:   onboardingDraft.extraGuestFee,
          cleaningFee:     onboardingDraft.cleaningFee,
          checkInTime:     onboardingDraft.checkInTime,
          checkOutTime:    onboardingDraft.checkOutTime,
          noExtraGuestFee: false,
        });
      }

      // 3. 입력된 iCal 채널 저장
      for (const ch of ICAL_CHANNELS) {
        const url = (onboardingDraft[ch.key] as string).trim();
        if (url) await saveSyncChannel(ch.name as 'Airbnb' | 'Booking.com', url);
      }

      // 4. 완료 처리
      setOnboardingCompleted(true);
      resetOnboarding();
      navigate('/', { replace: true });
    } catch (err) {
      showToast(
        (err as Error).message || tr('저장 중 오류가 발생했습니다.', 'Something went wrong.', lang),
        'error',
      );
    } finally {
      setSaving(false);
    }
  };

  const props = { draft: onboardingDraft, patch: patchOnboardingDraft };

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm flex flex-col">
        <div className="mb-8 text-center">
          <span className="text-base font-bold tracking-tight text-foreground">OZO Calendar</span>
        </div>

        <ProgressBar step={onboardingStep} total={TOTAL_STEPS} />

        <div className="bg-card rounded-2xl p-6 shadow-sm">
          {onboardingStep === 1 && <Step1 {...props} onNext={next} onSkip={() => skipStep(1)} />}
          {onboardingStep === 2 && <Step2 {...props} onNext={next} onBack={back} onSkip={() => skipStep(2)} />}
          {onboardingStep === 3 && <Step3 {...props} onNext={next} onBack={back} onSkip={() => skipStep(3)} />}
          {onboardingStep === 4 && <Step4 {...props} onNext={next} onBack={back} onSkip={() => skipStep(4)} />}
          {onboardingStep === 5 && <Step5 {...props} onNext={next} onBack={back} onSkip={() => skipStep(5)} />}
          {onboardingStep === 6 && <Step6 draft={onboardingDraft} onFinish={handleFinish} saving={saving} onBack={back} />}
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
