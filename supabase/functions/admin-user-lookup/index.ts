// @ts-nocheck — Deno 런타임 전용 파일. Node.js/Vite tsconfig 적용 안 됨.
// Supabase Edge Function: admin-user-lookup
// 관리자가 이메일로 특정 회원을 찾아 그 회원의 숙소/예약 목록을 "조회"만 함 (읽기 전용, 수정/삭제 불가).
// 조회할 때마다 admin_audit_log에 조용히 기록 — 사용자에게 공개하지 않고, 분쟁 발생 시 운영자가
// "언제 어떤 사유로 봤는지" 스스로 증명할 수 있는 내부 기록용.
// 배포: supabase functions deploy admin-user-lookup
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
    const { email } = await req.json();
    if (!email) throw new Error('email이 필요합니다.');

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

    const { data: profile, error: profileErr } = await adminClient
      .from('profiles').select('id, email, name').eq('email', email).single();
    if (profileErr || !profile) {
      return new Response(
        JSON.stringify({ error: `해당 이메일의 회원을 찾을 수 없습니다: ${email}` }),
        { status: 404, headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    const { data: properties, error: propErr } = await adminClient
      .from('properties').select('*').eq('host_id', profile.id);
    if (propErr) throw new Error(`숙소 조회 실패: ${propErr.message}`);

    const { data: bookings, error: bookErr } = await adminClient
      .from('bookings').select('*').eq('host_id', profile.id)
      .order('checkin', { ascending: false }).limit(200);
    if (bookErr) throw new Error(`예약 조회 실패: ${bookErr.message}`);

    // 조용한 내부 기록 — 실패해도 조회 결과 응답에는 영향 없음
    await adminClient.from('admin_audit_log').insert({
      admin_email: adminEmail,
      action: 'booking_view',
      target_host_id: profile.id,
      target_email: profile.email,
    });

    return new Response(
      JSON.stringify({ profile, properties, bookings }),
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
