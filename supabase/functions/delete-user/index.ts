// @ts-nocheck — Deno 런타임 전용 파일. Node.js/Vite tsconfig 적용 안 됨.
// Supabase Edge Function: delete-user
// 회원탈퇴 시 auth.users 레코드를 삭제합니다.
// 클라이언트에서 Service Role Key 없이 auth 레코드를 삭제할 수 없으므로
// 이 Edge Function이 서버 측에서 admin API를 호출합니다.
// 배포: supabase functions deploy delete-user

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: CORS });
  }

  // 1. 호출자의 JWT에서 user ID 추출 (인증 확인)
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

  // 2. Service Role Key로 admin client 생성
  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  // 3. 앱 데이터 삭제 (이중 안전장치 — 클라이언트에서도 삭제하지만 여기서도 확인)
  await adminClient.from('sync_notifications').delete().eq('host_id', user.id);
  await adminClient.from('sync_channels').delete().eq('host_id', user.id);
  await adminClient.from('bookings').delete().eq('host_id', user.id);
  await adminClient.from('properties').delete().eq('host_id', user.id);
  await adminClient.from('profiles').delete().eq('id', user.id);

  // 4. auth.users 레코드 삭제 — 이것이 핵심!
  // 이 후 OAuth 로그인 시 "신규 가입"으로 처리됨
  const { error: deleteErr } = await adminClient.auth.admin.deleteUser(user.id);

  if (deleteErr) {
    return new Response(
      JSON.stringify({ error: `Auth 삭제 실패: ${deleteErr.message}` }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  }

  return new Response(
    JSON.stringify({ success: true, message: '계정이 완전히 삭제되었습니다.' }),
    { headers: { ...CORS, 'Content-Type': 'application/json' } },
  );
});
