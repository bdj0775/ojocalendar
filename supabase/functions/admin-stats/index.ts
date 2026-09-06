// @ts-nocheck — Deno 런타임 전용 파일. Node.js/Vite tsconfig 적용 안 됨.
// Supabase Edge Function: admin-stats
// 관리자 페이지에 표시할 집계 데이터(가입자 수, 이번달 결제 현황)를 계산.
// subscriptions/payments는 RLS상 본인 것만 조회 가능하므로, 전체 집계는 Service Role Key로
// 이 서버에서만 계산하고 "숫자 결과"만 돌려준다 (다른 회원의 개별 데이터는 절대 응답에 포함하지 않음).
// 배포: supabase functions deploy admin-stats
// 참고: MONETIZATION_ROADMAP.md Phase 5

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    // 1. 호출자 인증 확인
    const authHeader = req.headers.get('Authorization') ?? '';
    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authErr } = await anonClient.auth.getUser();
    if (authErr || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    // 2. 관리자 이메일 확인
    const adminEmail = Deno.env.get('ADMIN_EMAIL') ?? '';
    if (!adminEmail || user.email !== adminEmail) {
      return new Response(
        JSON.stringify({ error: '관리자만 사용할 수 있는 기능입니다.' }),
        { status: 403, headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // 3. 플랜별 회원 수 집계
    const { data: subs, error: subsErr } = await adminClient.from('subscriptions').select('plan');
    if (subsErr) throw new Error(`회원 집계 실패: ${subsErr.message}`);

    const counts = { total: subs.length, legacyFree: 0, free: 0, pro: 0 };
    for (const row of subs) {
      if (row.plan === 'legacy_free') counts.legacyFree++;
      else if (row.plan === 'pro') counts.pro++;
      else counts.free++;
    }

    // 4. 이번달 결제 현황
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const { data: payments, error: paymentsErr } = await adminClient
      .from('payments')
      .select('amount')
      .eq('status', 'paid')
      .gte('created_at', monthStart);
    if (paymentsErr) throw new Error(`결제 집계 실패: ${paymentsErr.message}`);

    const paymentsThisMonth = {
      count: payments.length,
      total: payments.reduce((sum: number, p: { amount: number }) => sum + Number(p.amount), 0),
    };

    return new Response(
      JSON.stringify({ counts, paymentsThisMonth }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  }
});
