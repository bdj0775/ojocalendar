// @ts-nocheck — Deno 런타임 전용 파일. Node.js/Vite tsconfig 적용 안 됨.
// Supabase Edge Function: admin-settings
// 유료화 마스터 스위치(app_settings.monetization_enabled)를 켜고 끄는 유일한 경로.
// app_settings는 클라이언트 쓰기 RLS 정책이 없으므로(의도적), 이 Edge Function이
// Service Role Key로 대신 값을 바꿔준다. 호출자가 지정된 관리자 이메일인지 반드시 확인.
// 배포: supabase functions deploy admin-settings
// 참고: MONETIZATION_ROADMAP.md Phase 5, BILLING_SYSTEM.md

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: CORS });

  try {
    const { enabled } = await req.json();
    if (typeof enabled !== 'boolean') {
      throw new Error('enabled(boolean) 값이 필요합니다.');
    }

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

    // 2. 지정된 관리자 이메일인지 확인 — 그 외 누구도 스위치를 바꿀 수 없음
    const adminEmail = Deno.env.get('ADMIN_EMAIL') ?? '';
    if (!adminEmail || user.email !== adminEmail) {
      return new Response(
        JSON.stringify({ error: '관리자만 사용할 수 있는 기능입니다.' }),
        { status: 403, headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    // 3. Service Role Key로 스위치 변경
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    const { error: updateErr } = await adminClient
      .from('app_settings')
      .update({ monetization_enabled: enabled, updated_at: new Date().toISOString() })
      .eq('id', true);

    if (updateErr) throw new Error(`스위치 변경 실패: ${updateErr.message}`);

    return new Response(
      JSON.stringify({ success: true, monetization_enabled: enabled }),
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
