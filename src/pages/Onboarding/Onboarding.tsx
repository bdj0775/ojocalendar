import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { useTranslation } from '../../hooks/useTranslation';
import { Loader2 } from 'lucide-react';

// ── 스텝 정의 ─────────────────────────────────────────────────────
const TOTAL_STEPS = 6;

// 각 스텝에서 수집하는 임시 데이터 타입
interface OnboardingDraft {
  // Step 1
  profileName: string;
  language: 'ko' | 'en';
  // Step 2
  propertyName: string;
  baseGuests: number;
  // Step 3
  basePrice: number;
  weekendPrice: number;
  extraGuestFee: number;
  cleaningFee: number;
  // Step 4
  checkInTime: string;
  checkOutTime: string;
  // Step 5 (선택)
  airbnbIcal: string;
  bookingIcal: string;
  naverIcal: string;
}

const defaultDraft = (): OnboardingDraft => ({
  profileName: '',
  language: 'ko',
  propertyName: '',
  baseGuests: 2,
  basePrice: 100000,
  weekendPrice: 130000,
  extraGuestFee: 20000,
  cleaningFee: 0,
  checkInTime: '15:00',
  checkOutTime: '11:00',
  airbnbIcal: '',
  bookingIcal: '',
  naverIcal: '',
});

// ── 진행 바 ───────────────────────────────────────────────────────
const ProgressBar = ({ step, total }: { step: number; total: number }) => (
  <div className="w-full mb-8">
    <div className="flex justify-between text-[11px] text-muted-foreground mb-2">
      <span>{step} / {total}</span>
    </div>
    <div className="h-1 bg-muted rounded-full overflow-hidden">
      <div
        className="h-full bg-primary rounded-full transition-all duration-500"
        style={{ width: `${(step / total) * 100}%` }}
      />
    </div>
  </div>
);

// ── 공통 버튼 ─────────────────────────────────────────────────────
const PrimaryBtn = ({
  onClick, disabled, loading, children,
}: {
  onClick?: () => void; disabled?: boolean; loading?: boolean; children: React.ReactNode;
}) => (
  <button
    type={onClick ? 'button' : 'submit'}
    onClick={onClick}
    disabled={disabled || loading}
    className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm tracking-wide transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-95 active:scale-[0.98]"
  >
    {loading ? <Loader2 size={18} className="animate-spin mx-auto" /> : children}
  </button>
);

const SecondaryBtn = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full py-3 rounded-xl text-sm text-muted-foreground hover:text-foreground transition-colors"
  >
    {children}
  </button>
);

const inputCls = 'w-full px-4 py-3.5 rounded-xl border border-border bg-muted text-foreground text-sm outline-none transition-all focus:border-primary focus:bg-card focus:shadow-[0_0_0_3px_var(--primary-ring)] placeholder:text-muted-foreground/50';

// ── Step 1: 환영 + 프로필 ─────────────────────────────────────────
const Step1 = ({ draft, update, onNext }: {
  draft: OnboardingDraft;
  update: (p: Partial<OnboardingDraft>) => void;
  onNext: () => void;
}) => {
  const ko = draft.language === 'ko';
  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <div className="text-4xl mb-3">👋</div>
        <h2 className="text-xl font-bold text-foreground mb-1">
          {ko ? '오조캘린더에 오신 걸 환영해요' : 'Welcome to OZO Calendar'}
        </h2>
        <p className="text-sm text-muted-foreground">
          {ko ? '숙소 운영을 더 스마트하게 관리해보세요.' : 'Manage your property smarter.'}
        </p>
      </div>

      <div className="flex gap-2 p-1 bg-muted rounded-xl">
        {(['ko', 'en'] as const).map(lang => (
          <button
            key={lang}
            type="button"
            onClick={() => update({ language: lang })}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              draft.language === lang
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {lang === 'ko' ? '한국어' : 'English'}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-foreground">
          {ko ? '이름 (선택)' : 'Your name (optional)'}
        </label>
        <input
          className={inputCls}
          placeholder={ko ? '홍길동' : 'Your name'}
          value={draft.profileName}
          onChange={e => update({ profileName: e.target.value })}
        />
      </div>

      <PrimaryBtn onClick={onNext}>
        {ko ? '시작하기 →' : 'Get started →'}
      </PrimaryBtn>
    </div>
  );
};

// ── Step 2: 숙소 기본 정보 ────────────────────────────────────────
const Step2 = ({ draft, update, onNext, onBack }: {
  draft: OnboardingDraft;
  update: (p: Partial<OnboardingDraft>) => void;
  onNext: () => void;
  onBack: () => void;
}) => {
  const ko = draft.language === 'ko';
  const valid = draft.propertyName.trim().length > 0;
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-1">
          {ko ? '숙소 정보' : 'Property Info'}
        </h2>
        <p className="text-sm text-muted-foreground">
          {ko ? '운영 중인 숙소의 기본 정보를 입력해주세요.' : 'Tell us about your property.'}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-foreground">
            {ko ? '숙소 이름 *' : 'Property name *'}
          </label>
          <input
            className={inputCls}
            placeholder={ko ? '오조록, 제주 감귤농장 민박, ...' : 'My Beach House, ...'}
            value={draft.propertyName}
            onChange={e => update({ propertyName: e.target.value })}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-foreground">
            {ko ? '기준 인원' : 'Base guests'}
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5, 6].map(n => (
              <button
                key={n}
                type="button"
                onClick={() => update({ baseGuests: n })}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border transition-all ${
                  draft.baseGuests === n
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-muted text-muted-foreground hover:border-foreground/30'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <PrimaryBtn onClick={onNext} disabled={!valid}>
          {ko ? '다음 →' : 'Next →'}
        </PrimaryBtn>
        <SecondaryBtn onClick={onBack}>{ko ? '이전' : 'Back'}</SecondaryBtn>
      </div>
    </div>
  );
};

// ── Step 3: 요금 설정 ─────────────────────────────────────────────
const Step3 = ({ draft, update, onNext, onBack }: {
  draft: OnboardingDraft;
  update: (p: Partial<OnboardingDraft>) => void;
  onNext: () => void;
  onBack: () => void;
}) => {
  const ko = draft.language === 'ko';
  const numInput = (value: number, key: keyof OnboardingDraft) => (
    <input
      type="number"
      className={inputCls}
      value={value || ''}
      min={0}
      step={10000}
      onChange={e => update({ [key]: Number(e.target.value) })}
    />
  );
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-1">
          {ko ? '요금 설정' : 'Pricing'}
        </h2>
        <p className="text-sm text-muted-foreground">
          {ko ? '나중에 설정에서 언제든 변경할 수 있어요.' : 'You can change this anytime in settings.'}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {[
          { label: ko ? '평일 요금 (1박)' : 'Weekday price / night', key: 'basePrice' as const, value: draft.basePrice },
          { label: ko ? '주말 요금 (금·토)' : 'Weekend price (Fri·Sat)', key: 'weekendPrice' as const, value: draft.weekendPrice },
          { label: ko ? '추가 인원 요금 (1인당)' : 'Extra guest fee / person', key: 'extraGuestFee' as const, value: draft.extraGuestFee },
          { label: ko ? '청소비' : 'Cleaning fee', key: 'cleaningFee' as const, value: draft.cleaningFee },
        ].map(({ label, key, value }) => (
          <div key={key} className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">{label}</label>
            {numInput(value, key)}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <PrimaryBtn onClick={onNext}>
          {ko ? '다음 →' : 'Next →'}
        </PrimaryBtn>
        <SecondaryBtn onClick={onBack}>{ko ? '이전' : 'Back'}</SecondaryBtn>
      </div>
    </div>
  );
};

// ── Step 4: 운영 시간 ─────────────────────────────────────────────
const Step4 = ({ draft, update, onNext, onBack }: {
  draft: OnboardingDraft;
  update: (p: Partial<OnboardingDraft>) => void;
  onNext: () => void;
  onBack: () => void;
}) => {
  const ko = draft.language === 'ko';
  const timeOptions = Array.from({ length: 24 }, (_, i) => {
    const h = String(i).padStart(2, '0');
    return `${h}:00`;
  });
  const selectCls = inputCls + ' cursor-pointer';
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-1">
          {ko ? '운영 시간' : 'Check-in / Check-out'}
        </h2>
        <p className="text-sm text-muted-foreground">
          {ko ? '기본 체크인·아웃 시간을 설정해주세요.' : 'Set your default check-in and check-out times.'}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {[
          { label: ko ? '체크인 시간' : 'Check-in time', key: 'checkInTime' as const, value: draft.checkInTime },
          { label: ko ? '체크아웃 시간' : 'Check-out time', key: 'checkOutTime' as const, value: draft.checkOutTime },
        ].map(({ label, key, value }) => (
          <div key={key} className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">{label}</label>
            <select
              className={selectCls}
              value={value}
              onChange={e => update({ [key]: e.target.value })}
            >
              {timeOptions.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <PrimaryBtn onClick={onNext}>
          {ko ? '다음 →' : 'Next →'}
        </PrimaryBtn>
        <SecondaryBtn onClick={onBack}>{ko ? '이전' : 'Back'}</SecondaryBtn>
      </div>
    </div>
  );
};

// ── Step 5: 채널 연결 (선택) ──────────────────────────────────────
const Step5 = ({ draft, update, onNext, onBack }: {
  draft: OnboardingDraft;
  update: (p: Partial<OnboardingDraft>) => void;
  onNext: () => void;
  onBack: () => void;
}) => {
  const ko = draft.language === 'ko';
  const channels = [
    { label: 'Airbnb', key: 'airbnbIcal' as const, placeholder: 'https://www.airbnb.com/calendar/ical/...' },
    { label: 'Booking.com', key: 'bookingIcal' as const, placeholder: 'https://ical.booking.com/...' },
    { label: 'Naver', key: 'naverIcal' as const, placeholder: 'https://...' },
  ];
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-1">
          {ko ? '채널 연결' : 'Connect Channels'}
        </h2>
        <p className="text-sm text-muted-foreground">
          {ko
            ? 'iCal 주소를 연결하면 예약이 자동으로 동기화돼요. 나중에 설정에서도 추가할 수 있어요.'
            : 'Connect iCal URLs to sync bookings automatically. You can add these later in settings.'}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {channels.map(({ label, key, placeholder }) => (
          <div key={key} className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">{label}</label>
            <input
              className={inputCls}
              placeholder={placeholder}
              value={draft[key]}
              onChange={e => update({ [key]: e.target.value })}
            />
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <PrimaryBtn onClick={onNext}>
          {ko ? '다음 →' : 'Next →'}
        </PrimaryBtn>
        <SecondaryBtn onClick={onBack}>
          {ko ? '나중에 연결할게요' : 'Skip for now'}
        </SecondaryBtn>
      </div>
    </div>
  );
};

// ── Step 6: 완료 ──────────────────────────────────────────────────
const Step6 = ({ draft, onFinish, loading }: {
  draft: OnboardingDraft;
  onFinish: () => void;
  loading: boolean;
}) => {
  const ko = draft.language === 'ko';
  const rows = [
    { label: ko ? '숙소 이름' : 'Property', value: draft.propertyName },
    { label: ko ? '기준 인원' : 'Base guests', value: `${draft.baseGuests}명` },
    { label: ko ? '평일 요금' : 'Weekday', value: `₩${draft.basePrice.toLocaleString()}` },
    { label: ko ? '주말 요금' : 'Weekend', value: `₩${draft.weekendPrice.toLocaleString()}` },
    { label: ko ? '체크인' : 'Check-in', value: draft.checkInTime },
    { label: ko ? '체크아웃' : 'Check-out', value: draft.checkOutTime },
  ];
  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <div className="text-4xl mb-3">🎉</div>
        <h2 className="text-xl font-bold text-foreground mb-1">
          {ko ? '설정 완료!' : 'All set!'}
        </h2>
        <p className="text-sm text-muted-foreground">
          {ko ? '아래 내용으로 숙소를 등록할게요.' : "We'll register your property with the details below."}
        </p>
      </div>

      <div className="bg-muted/50 rounded-2xl p-4 flex flex-col gap-2">
        {rows.map(({ label, value }) => (
          <div key={label} className="flex justify-between text-sm">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium text-foreground">{value}</span>
          </div>
        ))}
      </div>

      <PrimaryBtn onClick={onFinish} loading={loading}>
        {ko ? '앱 시작하기 🚀' : 'Start using OZO 🚀'}
      </PrimaryBtn>
    </div>
  );
};

// ── 메인 온보딩 페이지 ────────────────────────────────────────────
const OnboardingPage = () => {
  const navigate = useNavigate();
  const { language } = useTranslation();
  const {
    addProperty, saveSyncChannel, updateSettings,
    setOnboardingCompleted, showToast,
  } = useStore();

  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<OnboardingDraft>(defaultDraft);
  const [saving, setSaving] = useState(false);

  const update = (patch: Partial<OnboardingDraft>) =>
    setDraft(prev => ({ ...prev, ...patch }));

  const next = () => setStep(s => Math.min(s + 1, TOTAL_STEPS));
  const back = () => setStep(s => Math.max(s - 1, 1));

  const handleFinish = async () => {
    setSaving(true);
    try {
      // 1. 프로필 설정 저장
      if (draft.profileName || draft.language !== language) {
        updateSettings({
          profileName: draft.profileName,
          language: draft.language,
        });
      }

      // 2. 숙소 생성
      await addProperty({
        name: draft.propertyName,
        baseGuests: draft.baseGuests,
        basePrice: draft.basePrice,
        weekendPrice: draft.weekendPrice,
        extraGuestFee: draft.extraGuestFee,
        cleaningFee: draft.cleaningFee,
        checkInTime: draft.checkInTime,
        checkOutTime: draft.checkOutTime,
        noExtraGuestFee: false,
      });

      // 3. iCal 채널 연결 (입력된 것만)
      const channels: { url: string; ch: 'Airbnb' | 'Booking.com' | 'Naver' }[] = [
        { url: draft.airbnbIcal.trim(), ch: 'Airbnb' },
        { url: draft.bookingIcal.trim(), ch: 'Booking.com' },
        { url: draft.naverIcal.trim(), ch: 'Naver' },
      ];
      for (const { url, ch } of channels) {
        if (url) await saveSyncChannel(ch, url);
      }

      // 4. 온보딩 완료 플래그
      setOnboardingCompleted(true);

      navigate('/', { replace: true });
    } catch (err) {
      showToast((err as Error).message || '저장 중 오류가 발생했습니다.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const steps: Record<number, React.ReactNode> = {
    1: <Step1 draft={draft} update={update} onNext={next} />,
    2: <Step2 draft={draft} update={update} onNext={next} onBack={back} />,
    3: <Step3 draft={draft} update={update} onNext={next} onBack={back} />,
    4: <Step4 draft={draft} update={update} onNext={next} onBack={back} />,
    5: <Step5 draft={draft} update={update} onNext={next} onBack={back} />,
    6: <Step6 draft={draft} onFinish={handleFinish} loading={saving} />,
  };

  return (
    <div className="min-h-[100dvh] bg-background flex items-center justify-center p-5">
      <div className="w-full max-w-sm">
        {/* 로고 */}
        <div className="text-center mb-8">
          <span className="text-lg font-bold tracking-tight text-foreground">OZO Calendar</span>
        </div>

        <ProgressBar step={step} total={TOTAL_STEPS} />

        <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
          {steps[step]}
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
