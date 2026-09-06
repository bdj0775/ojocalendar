import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2, Users, Wallet, UserCog, Search } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { supabase } from '../../services/supabaseClient';
import { ADMIN_EMAIL } from '../../config/admin';
import AdminCalendarPreview from './AdminCalendarPreview';
import type { SubscriptionPlan } from '../../types';

interface AdminStats {
  counts: { total: number; legacyFree: number; free: number; pro: number };
  paymentsThisMonth: { count: number; total: number };
}

const PLAN_LABEL: Record<SubscriptionPlan, string> = {
  legacy_free: '영구무료(베타)',
  free: '무료',
  pro: 'Pro',
};

// 회원 조회 도구는 Edge Function이 돌려주는 DB 원본 행(snake_case)을 그대로 다룬다. 읽기 전용.
interface RawProperty { id: string; name: string; color?: string | null; }
interface RawBooking {
  id: string; property_id: string; guestname: string; checkin: string; checkout: string;
  guests: number; infants: number; nationality: string; channel: string; amount: number;
  commission: number; status: string;
}
interface LookupResult {
  profile: { id: string; email: string; name: string | null };
  properties: RawProperty[];
  bookings: RawBooking[];
}
interface UserListItem { id: string; email: string; name: string | null; plan: SubscriptionPlan; }

const AdminSettings = () => {
  const userProfile = useStore(s => s.userProfile);
  const monetizationEnabled = useStore(s => s.monetizationEnabled);
  const fetchAppSettings = useStore(s => s.fetchAppSettings);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsError, setStatsError] = useState('');
  const [statsLoading, setStatsLoading] = useState(true);

  const [targetEmail, setTargetEmail] = useState('');
  const [targetPlan, setTargetPlan] = useState<SubscriptionPlan>('pro');
  const [planLoading, setPlanLoading] = useState(false);
  const [planMsg, setPlanMsg] = useState('');
  const [planErr, setPlanErr] = useState('');

  // ── 회원 데이터 열람 (읽기 전용 — 수정/삭제 기능 없음) ──
  const [userList, setUserList] = useState<UserListItem[]>([]);
  const [userListErr, setUserListErr] = useState('');
  const [selectedUserEmail, setSelectedUserEmail] = useState('');
  const [lookupResult, setLookupResult] = useState<LookupResult | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupErr, setLookupErr] = useState('');

  const isAdmin = userProfile?.email === ADMIN_EMAIL;

  const loadStats = async () => {
    setStatsLoading(true);
    setStatsError('');
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('admin-stats');
      if (fnErr || (data as { error?: string })?.error) {
        throw new Error((data as { error?: string })?.error ?? fnErr?.message ?? '통계를 불러오지 못했습니다.');
      }
      setStats(data as AdminStats);
    } catch (e) {
      setStatsError(e instanceof Error ? e.message : '통계를 불러오지 못했습니다.');
    } finally {
      setStatsLoading(false);
    }
  };

  const loadUserList = async () => {
    setUserListErr('');
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('admin-list-users');
      if (fnErr || (data as { error?: string })?.error) {
        throw new Error((data as { error?: string })?.error ?? fnErr?.message ?? '회원 목록을 불러오지 못했습니다.');
      }
      setUserList((data as { users: UserListItem[] }).users);
    } catch (e) {
      setUserListErr(e instanceof Error ? e.message : '회원 목록을 불러오지 못했습니다.');
    }
  };

  useEffect(() => {
    fetchAppSettings();
    if (isAdmin) { loadStats(); loadUserList(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggle = async () => {
    setError('');
    setLoading(true);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('admin-settings', {
        body: { enabled: !monetizationEnabled },
      });
      if (fnErr || (data as { error?: string })?.error) {
        throw new Error((data as { error?: string })?.error ?? fnErr?.message ?? '변경에 실패했습니다.');
      }
      await fetchAppSettings();
    } catch (e) {
      setError(e instanceof Error ? e.message : '변경에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSetPlan = async () => {
    setPlanErr('');
    setPlanMsg('');
    if (!targetEmail.trim()) { setPlanErr('이메일을 입력해주세요.'); return; }
    setPlanLoading(true);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('admin-set-plan', {
        body: { email: targetEmail.trim(), plan: targetPlan },
      });
      if (fnErr || (data as { error?: string })?.error) {
        throw new Error((data as { error?: string })?.error ?? fnErr?.message ?? '변경에 실패했습니다.');
      }
      setPlanMsg(`${targetEmail} → ${PLAN_LABEL[targetPlan]} 로 변경되었습니다.`);
      setTargetEmail('');
      loadStats();
    } catch (e) {
      setPlanErr(e instanceof Error ? e.message : '변경에 실패했습니다.');
    } finally {
      setPlanLoading(false);
    }
  };

  const handleLookup = async (email: string) => {
    setLookupErr('');
    setLookupResult(null);
    if (!email) return;
    setLookupLoading(true);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('admin-user-lookup', {
        body: { email },
      });
      if (fnErr || (data as { error?: string })?.error) {
        throw new Error((data as { error?: string })?.error ?? fnErr?.message ?? '조회에 실패했습니다.');
      }
      setLookupResult(data as LookupResult);
    } catch (e) {
      setLookupErr(e instanceof Error ? e.message : '조회에 실패했습니다.');
    } finally {
      setLookupLoading(false);
    }
  };

  // 관리자가 아니면 페이지 존재 자체를 노출하지 않고 조용히 돌려보냄 (정보 노출 최소화)
  if (!isAdmin) return <Navigate to="/" replace />;

  const cardCls = 'p-5 rounded-2xl border border-border bg-card';
  const labelCls = 'text-xs font-semibold text-muted-foreground';

  return (
    <div className="max-w-lg mx-auto px-6 py-12">
      <h1 className="text-xl font-bold text-foreground mb-1">관리자 설정</h1>
      <p className="text-sm text-muted-foreground mb-8">BILLING_SYSTEM.md / MONETIZATION_ROADMAP.md 참고</p>

      {/* ── 회원 현황 통계 ── */}
      <p className="flex items-center gap-1.5 text-sm font-bold text-foreground mb-2">
        <Users size={15} /> 회원 현황
      </p>
      <div className={`${cardCls} mb-6`}>
        {statsLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 size={14} className="animate-spin" /> 불러오는 중...
          </div>
        ) : statsError ? (
          <p className="text-[13px] text-destructive">{statsError}</p>
        ) : stats ? (
          <div className="grid grid-cols-4 gap-3 text-center">
            <div>
              <p className="text-lg font-bold text-foreground">{stats.counts.total}</p>
              <p className={labelCls}>전체</p>
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{stats.counts.legacyFree}</p>
              <p className={labelCls}>영구무료</p>
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{stats.counts.free}</p>
              <p className={labelCls}>무료</p>
            </div>
            <div>
              <p className="text-lg font-bold text-primary">{stats.counts.pro}</p>
              <p className={labelCls}>Pro</p>
            </div>
          </div>
        ) : null}
      </div>

      {/* ── 이번달 결제 현황 ── */}
      <p className="flex items-center gap-1.5 text-sm font-bold text-foreground mb-2">
        <Wallet size={15} /> 이번달 결제 현황
      </p>
      <div className={`${cardCls} mb-6`}>
        {statsLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 size={14} className="animate-spin" /> 불러오는 중...
          </div>
        ) : stats ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-bold text-foreground">{stats.paymentsThisMonth.count}건</p>
              <p className={labelCls}>결제 건수</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-foreground">{stats.paymentsThisMonth.total.toLocaleString()}원</p>
              <p className={labelCls}>결제 총액</p>
            </div>
          </div>
        ) : null}
      </div>

      {/* ── 유료화 마스터 스위치 ── */}
      <p className="text-sm font-bold text-foreground mb-2">유료화 스위치</p>
      <div className={`${cardCls} flex items-center justify-between mb-1`}>
        <div>
          <p className="text-sm font-semibold text-foreground">유료화 스위치</p>
          <p className="text-xs text-muted-foreground mt-1">
            {monetizationEnabled
              ? 'ON — 신규 가입자부터 무료 한도가 적용됩니다.'
              : 'OFF — 베타 무료 운영 중. 신규 가입자도 영구 무료(legacy_free)로 고정됩니다.'}
          </p>
        </div>
        <button
          onClick={handleToggle}
          disabled={loading}
          className={`relative w-14 h-7 rounded-full flex-shrink-0 transition-colors ${
            monetizationEnabled ? 'bg-primary' : 'bg-muted-foreground/25'
          } disabled:opacity-60`}
        >
          {loading ? (
            <Loader2 size={14} className="animate-spin absolute inset-0 m-auto text-white" />
          ) : (
            <div className={`absolute top-[3px] left-[3px] w-[22px] h-[22px] rounded-full bg-white shadow-sm transition-transform ${
              monetizationEnabled ? 'translate-x-[28px]' : ''
            }`} />
          )}
        </button>
      </div>
      {error && <p className="mt-2 text-[13px] text-destructive">{error}</p>}
      <p className="mt-2 mb-6 text-xs text-muted-foreground leading-relaxed">
        이 스위치를 켜는 순간부터 새로 가입하는 사용자에게만 무료 한도(숙소 1개)가 적용됩니다.
        이미 가입한 베타 사용자는 영향받지 않습니다.
      </p>

      {/* ── 특정 회원 수동 플랜 전환 ── */}
      <p className="flex items-center gap-1.5 text-sm font-bold text-foreground mb-2">
        <UserCog size={15} /> 특정 회원 플랜 수동 변경
      </p>
      <div className={`${cardCls} flex flex-col gap-3`}>
        <input
          type="email"
          value={targetEmail}
          onChange={e => setTargetEmail(e.target.value)}
          placeholder="회원 이메일"
          className="w-full px-3 py-2.5 rounded-xl border border-border bg-muted text-sm outline-none focus:border-primary"
        />
        <div className="flex gap-2">
          <select
            value={targetPlan}
            onChange={e => setTargetPlan(e.target.value as SubscriptionPlan)}
            className="flex-1 px-3 py-2.5 rounded-xl border border-border bg-muted text-sm outline-none focus:border-primary"
          >
            <option value="pro">Pro로 전환</option>
            <option value="free">무료로 해지</option>
            <option value="legacy_free">영구무료로 전환</option>
          </select>
          <button
            onClick={handleSetPlan}
            disabled={planLoading}
            className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-60"
          >
            {planLoading ? <Loader2 size={16} className="animate-spin" /> : '적용'}
          </button>
        </div>
        {planMsg && <p className="text-[13px] text-primary">{planMsg}</p>}
        {planErr && <p className="text-[13px] text-destructive">{planErr}</p>}
      </div>

      {/* ── 회원 데이터 열람 (읽기 전용) ── */}
      <p className="flex items-center gap-1.5 text-sm font-bold text-foreground mb-2 mt-6">
        <Search size={15} /> 회원 데이터 열람
      </p>
      <div className={`${cardCls} flex flex-col gap-3`}>
        <p className="text-xs text-muted-foreground leading-relaxed">
          목록에서 회원을 선택하면 숙소·예약을 조회만 할 수 있습니다(수정·삭제 기능 없음 — 사고 방지를
          위해 의도적으로 막아둠). 고객 문의 확인용으로만 사용하고, 수정이 필요하면 회원 본인에게
          직접 안내합니다.
        </p>
        {userListErr && <p className="text-[13px] text-destructive">{userListErr}</p>}
        <div className="flex gap-2">
          <select
            value={selectedUserEmail}
            onChange={e => {
              setSelectedUserEmail(e.target.value);
              handleLookup(e.target.value);
            }}
            className="flex-1 px-3 py-2.5 rounded-xl border border-border bg-muted text-sm outline-none focus:border-primary"
          >
            <option value="">회원 선택 ({userList.length}명)</option>
            {userList.map(u => (
              <option key={u.id} value={u.email}>
                {(u.name || u.email)} · {PLAN_LABEL[u.plan]}
              </option>
            ))}
          </select>
          {lookupLoading && <Loader2 size={18} className="animate-spin text-muted-foreground self-center" />}
        </div>
        {lookupErr && <p className="text-[13px] text-destructive">{lookupErr}</p>}

        {lookupResult && (
          <div className="flex flex-col gap-3 mt-1">
            <p className="text-[13px] font-semibold text-foreground">
              {lookupResult.profile.name || lookupResult.profile.email} 님의 캘린더
            </p>
            <AdminCalendarPreview properties={lookupResult.properties} bookings={lookupResult.bookings} />

            <p className="text-[13px] font-semibold text-foreground mt-1">
              예약 목록 ({lookupResult.bookings.length}건)
            </p>
            {lookupResult.bookings.length === 0 ? (
              <p className="text-[12px] text-muted-foreground">예약이 없습니다.</p>
            ) : (
              <div className="flex flex-col gap-1.5 max-h-80 overflow-y-auto">
                {lookupResult.bookings.map(b => {
                  const propName = lookupResult.properties.find(p => p.id === b.property_id)?.name ?? '(삭제된 숙소)';
                  return (
                    <div key={b.id} className="px-3 py-2 rounded-lg bg-muted text-[12px]">
                      <p className="font-semibold text-foreground truncate">{b.guestname} · {propName}</p>
                      <p className="text-muted-foreground">{b.checkin} ~ {b.checkout} · {b.channel} · {Number(b.amount).toLocaleString()}원</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── 가격 설정 (추후 개발 예정 — 구조만 미리 배치) ── */}
      <p className="text-sm font-bold text-foreground/50 mb-2 mt-6">가격 설정 (추후 개발 예정)</p>
      <div className={`${cardCls} opacity-60`}>
        <p className="text-[13px] text-muted-foreground">
          현재 Pro 플랜 가격은 코드(<code>src/config/billing.ts</code>의 <code>PRO_PLAN_PRICE</code>,
          Edge Function <code>toss-billing</code> 내 동일 상수)에서만 변경 가능합니다.
          여기서 직접 수정하는 기능은 "가격 변경 시 두 곳을 동시에 안전하게 갱신"하는 별도 작업이
          필요해서 지금은 자리만 마련해뒀습니다 — 필요할 때 말씀해주시면 이어서 만들겠습니다.
        </p>
      </div>
    </div>
  );
};

export default AdminSettings;
