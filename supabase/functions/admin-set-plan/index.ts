// @ts-nocheck — Deno 런타임 전용 파일. Node.js/Vite tsconfig 적용 안 됨.
// Supabase Edge Function: admin-set-plan
// 관리자가 특정 회원의 플랜을 수동으로 전환/해지(VIP, 이벤트, 환불 등). SQL 없이 화면에서 처리.
// 배포: supabase functions deploy admin-set-plan
// 참고: MONETIZATION_ROADMAP.md Phase 5

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const VALID_PLANS = ['legacy_free', 'free', 'pro'];

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: CORS });

  try {
    const { email, plan } = await req.json();
    if (!email || !VALID_PLANS.includes(plan)) {
      throw new Error('email, plan(legacy_free|free|pro)이 필요합니다.');
    }

    // 1. 호출자 인증 + 관리자 확인
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

    // 2. 이메일로 대상 회원 찾기
    const { data: profile, error: profileErr } = await adminClient
      .from('profiles')
      .select('id, email')
      .eq('email', email)
      .single();
    if (profileErr || !profile) {
      return new Response(
        JSON.stringify({ error: `해당 이메일의 회원을 찾을 수 없습니다: ${email}` }),
        { status: 404, headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    // 3. 플랜 변경
    const { error: updateErr } = await adminClient
      .from('subscriptions')
      .update({ plan, status: 'active' })
      .eq('host_id', profile.id);
    if (updateErr) throw new Error(`플랜 변경 실패: ${updateErr.message}`);

    return new Response(
      JSON.stringify({ success: true, email: profile.email, plan }),
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
