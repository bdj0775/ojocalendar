// @ts-nocheck — Deno 런타임 전용 파일. Node.js/Vite tsconfig 적용 안 됨.
// Supabase Edge Function: toss-billing
// 카드 등록(빌링 인증) 성공 후 호출 — billingKey를 발급받고 즉시 1회 결제하여 구독을 활성화합니다.
// 토스 시크릿 키는 이 서버 코드에서만 사용 — 클라이언트에 절대 노출하지 않음.
// 배포: supabase functions deploy toss-billing
// 참고: BILLING_SYSTEM.md, MONETIZATION_ROADMAP.md Phase 3

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// src/config/billing.ts와 동일한 값 유지 — 가격 확정 시 양쪽 다 수정
const PRO_PLAN_PRICE = 9900;
const PRO_PLAN_ORDER_NAME = '오조캘린더 Pro 플랜 (월간 구독)';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: CORS });

  try {
    const { authKey, customerKey } = await req.json();
    if (!authKey || !customerKey) {
      throw new Error('authKey, customerKey가 필요합니다.');
    }

    // 1. 호출자 인증 확인 — customerKey는 반드시 본인 user.id와 일치해야 함
    //    (그렇지 않으면 다른 사람의 customerKey로 구독을 활성화시킬 수 있음)
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
    if (user.id !== customerKey) {
      return new Response(
        JSON.stringify({ error: 'customerKey가 본인 계정과 일치하지 않습니다.' }),
        { status: 403, headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    const secretKey = Deno.env.get('TOSS_SECRET_KEY') ?? '';
    const basicAuth = 'Basic ' + btoa(`${secretKey}:`);

    // 2. 빌링키 발급
    const issueRes = await fetch('https://api.tosspayments.com/v1/billing/authorizations/issue', {
      method: 'POST',
      headers: { Authorization: basicAuth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerKey, authKey }),
    });
    const issueData = await issueRes.json();
    if (!issueRes.ok) {
      throw new Error(issueData?.message ?? '빌링키 발급에 실패했습니다.');
    }
    const billingKey = issueData.billingKey;

    // 3. 즉시 1회 결제 (첫 구독 결제 — 가입과 동시에 1개월치 청구)
    const orderId = crypto.randomUUID();
    const chargeRes = await fetch(`https://api.tosspayments.com/v1/billing/${billingKey}`, {
      method: 'POST',
      headers: { Authorization: basicAuth, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerKey, amount: PRO_PLAN_PRICE, orderId, orderName: PRO_PLAN_ORDER_NAME,
      }),
    });
    const chargeData = await chargeRes.json();
    if (!chargeRes.ok || chargeData.status !== 'DONE') {
      throw new Error(chargeData?.message ?? '결제 승인에 실패했습니다.');
    }

    // 4. 구독 활성화 (Service Role Key 사용 — subscriptions는 클라이언트 쓰기 정책이 없으므로
    //    이 Edge Function이 유일한 변경 경로)
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    const currentPeriodEnd = new Date();
    currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);

    const { error: updateErr } = await adminClient
      .from('subscriptions')
      .update({
        plan: 'pro',
        status: 'active',
        payment_method: 'toss',
        billing_key: billingKey, // 다음 달 자동 재청구(Phase 6)에 필요
        current_period_end: currentPeriodEnd.toISOString(),
      })
      .eq('host_id', user.id);

    if (updateErr) throw new Error(`구독 활성화 실패: ${updateErr.message}`);

    // 5. 결제 원장에 1건 기록 (관리자 페이지의 "이번달 결제 현황" 집계용)
    await adminClient.from('payments').insert({
      host_id: user.id,
      amount: PRO_PLAN_PRICE,
      payment_method: 'toss',
      status: 'paid',
      toss_order_id: orderId,
    });

    return new Response(
      JSON.stringify({ success: true }),
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
