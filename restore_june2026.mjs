/**
 * restore_june2026.mjs
 *
 * 사용법:
 *   1. 앱(ojocalendar.vercel.app)에 로그인한 브라우저 콘솔에서 실행:
 *      JSON.parse(localStorage.getItem('sb-dymixppmuninrysjmzzu-auth-token')).access_token
 *   2. 복사한 토큰을 SESSION_TOKEN 환경변수로 전달:
 *      SESSION_TOKEN=eyJhb... node restore_june2026.mjs
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dymixppmuninrysjmzzu.supabase.co';
const ANON_KEY     = 'sb_publishable_GBXgvRoIZ1o280KPmMoIfw_SVcMK610';
const TOKEN        = process.env.SESSION_TOKEN;

if (!TOKEN) {
  console.error('❌  SESSION_TOKEN 환경변수가 없습니다.');
  console.error('   브라우저 콘솔에서 다음을 실행해 토큰을 복사하세요:');
  console.error('   JSON.parse(localStorage.getItem(\'sb-dymixppmuninrysjmzzu-auth-token\')).access_token');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, ANON_KEY, {
  global: { headers: { Authorization: `Bearer ${TOKEN}` } },
});

// ── 26년 6월 전체 예약 데이터 (PDF + 캡쳐 기준) ───────────────────
// commission 필드 = 수수료율(%)
const JUNE_2026 = [
  { guestname:'김유진',       checkin:'2026-05-29', checkout:'2026-06-03', bookingdate:'2026-01-24', guests:5, infants:0, nationality:'Korea',  channel:'Naver',       amount:1020000, commission:2.0  },
  { guestname:'전수현',       checkin:'2026-06-03', checkout:'2026-06-04', bookingdate:'2026-05-13', guests:5, infants:0, nationality:'Korea',  channel:'Airbnb',      amount:221315,  commission:15.5 },
  { guestname:'진우',         checkin:'2026-06-04', checkout:'2026-06-05', bookingdate:'2026-05-29', guests:3, infants:0, nationality:'Korea',  channel:'Airbnb',      amount:198000,  commission:15.5 },
  { guestname:'huai-an',      checkin:'2026-06-05', checkout:'2026-06-06', bookingdate:'2026-05-10', guests:3, infants:0, nationality:'Taiwan', channel:'Airbnb',      amount:265000,  commission:15.5 },
  { guestname:'김광규',       checkin:'2026-06-06', checkout:'2026-06-07', bookingdate:'2026-04-03', guests:5, infants:0, nationality:'Korea',  channel:'Naver',       amount:249000,  commission:2.0  },
  { guestname:'이현민',       checkin:'2026-06-07', checkout:'2026-06-09', bookingdate:'2026-04-28', guests:2, infants:1, nationality:'Korea',  channel:'Naver',       amount:363000,  commission:2.0  },
  { guestname:'jaslyn',       checkin:'2026-06-09', checkout:'2026-06-10', bookingdate:'2026-01-11', guests:4, infants:0, nationality:'Others', channel:'Airbnb',      amount:258762,  commission:18.2 },
  { guestname:'대만',         checkin:'2026-06-10', checkout:'2026-06-11', bookingdate:'2026-04-25', guests:4, infants:0, nationality:'Taiwan', channel:'Airbnb',      amount:220000,  commission:15.5 },
  { guestname:'tzu',          checkin:'2026-06-12', checkout:'2026-06-13', bookingdate:'2026-03-28', guests:4, infants:0, nationality:'Taiwan', channel:'Booking.com', amount:209760,  commission:0    },
  { guestname:'대만',         checkin:'2026-06-13', checkout:'2026-06-14', bookingdate:'2026-04-15', guests:2, infants:0, nationality:'Taiwan', channel:'Airbnb',      amount:235000,  commission:15.5 },
  { guestname:'justyna',      checkin:'2026-06-14', checkout:'2026-06-15', bookingdate:'2026-05-08', guests:2, infants:0, nationality:'Others', channel:'Airbnb',      amount:190000,  commission:15.5 },
  { guestname:'대만',         checkin:'2026-06-16', checkout:'2026-06-18', bookingdate:'2026-02-15', guests:4, infants:0, nationality:'Taiwan', channel:'Booking.com', amount:388800,  commission:0    },
  { guestname:'정수경',       checkin:'2026-06-18', checkout:'2026-06-19', bookingdate:'2026-06-18', guests:2, infants:1, nationality:'Korea',  channel:'Naver',       amount:180000,  commission:2.0  },
  { guestname:'대만',         checkin:'2026-06-19', checkout:'2026-06-21', bookingdate:'2026-03-07', guests:4, infants:0, nationality:'Taiwan', channel:'Airbnb',      amount:446680,  commission:17.7 },
  { guestname:'xin yu',       checkin:'2026-06-22', checkout:'2026-06-23', bookingdate:'2026-04-06', guests:1, infants:0, nationality:'Others', channel:'Airbnb',      amount:220000,  commission:17.1 },
  { guestname:'dory',         checkin:'2026-06-23', checkout:'2026-06-24', bookingdate:'2026-05-20', guests:3, infants:0, nationality:'Taiwan', channel:'Airbnb',      amount:220000,  commission:15.5 },
  { guestname:'유소영',       checkin:'2026-06-24', checkout:'2026-06-25', bookingdate:'2026-05-17', guests:4, infants:0, nationality:'Korea',  channel:'Naver',       amount:189000,  commission:2.0  },
  { guestname:'정은아',       checkin:'2026-06-26', checkout:'2026-06-27', bookingdate:'2026-04-21', guests:3, infants:0, nationality:'Korea',  channel:'Naver',       amount:229000,  commission:2.0  },
  { guestname:'고윤하',       checkin:'2026-06-27', checkout:'2026-06-28', bookingdate:'2026-05-28', guests:3, infants:0, nationality:'Korea',  channel:'Naver',       amount:229000,  commission:2.0  },
  { guestname:'최예슬',       checkin:'2026-06-28', checkout:'2026-06-29', bookingdate:'2026-05-18', guests:1, infants:0, nationality:'Korea',  channel:'Direct',      amount:132000,  commission:0    },
  { guestname:'jemma',        checkin:'2026-06-29', checkout:'2026-07-01', bookingdate:'2025-11-10', guests:2, infants:0, nationality:'Others', channel:'Booking.com', amount:408000,  commission:0    },
];

async function run() {
  // ── 1. 현재 사용자 확인 ───────────────────────────────────────
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    console.error('❌  인증 실패. SESSION_TOKEN이 유효한지 확인하세요.', authErr?.message);
    process.exit(1);
  }
  console.log(`✅  로그인 확인: ${user.email}`);

  // ── 2. 숙소(property) 확인 ────────────────────────────────────
  const { data: props, error: propErr } = await supabase
    .from('properties').select('id, name').eq('host_id', user.id);

  if (propErr || !props?.length) {
    console.error('❌  숙소가 없습니다. 앱 설정에서 숙소를 먼저 추가해 주세요.');
    process.exit(1);
  }

  console.log('\n🏠  등록된 숙소:');
  props.forEach((p, i) => console.log(`   ${i + 1}. ${p.name}  (id: ${p.id})`));

  // 첫 번째 숙소 사용 (복수 숙소라면 코드 수정 필요)
  const propId  = props[0].id;
  const hostId  = user.id;
  console.log(`\n➡️   "${props[0].name}" 에 입력합니다.`);

  // ── 3. 현재 6월 데이터 조회 ──────────────────────────────────
  const { data: existing } = await supabase
    .from('bookings')
    .select('guestname, checkin')
    .eq('host_id', hostId)
    .gte('checkin', '2026-05-29')  // 김유진 포함
    .lte('checkin', '2026-06-29');

  const existingSet = new Set(
    (existing ?? []).map(b => `${b.guestname}|${b.checkin}`)
  );

  console.log(`\n📋  현재 시스템에 있는 6월 예약: ${existingSet.size}건`);
  if (existingSet.size > 0) {
    (existing ?? []).forEach(b => console.log(`   • ${b.guestname} (${b.checkin})`));
  }

  // ── 4. 누락된 항목만 추출 ────────────────────────────────────
  const toInsert = JUNE_2026.filter(b => !existingSet.has(`${b.guestname}|${b.checkin}`));

  if (toInsert.length === 0) {
    console.log('\n✅  누락된 예약이 없습니다. 모두 입력되어 있습니다.');
    return;
  }

  console.log(`\n➕  누락 확인 — ${toInsert.length}건 삽입 예정:`);
  toInsert.forEach(b => console.log(`   • ${b.guestname} (${b.checkin} → ${b.checkout}) ${b.amount.toLocaleString()}원`));

  // ── 5. 삽입 ──────────────────────────────────────────────────
  const rows = toInsert.map(b => ({
    host_id:     hostId,
    property_id: propId,
    guestname:   b.guestname,
    checkin:     b.checkin,
    checkout:    b.checkout,
    bookingdate: b.bookingdate,
    guests:      b.guests,
    infants:     b.infants,
    nationality: b.nationality,
    channel:     b.channel,
    status:      'confirmed',
    amount:      b.amount,
    commission:  b.commission,
  }));

  const { error: insertErr } = await supabase.from('bookings').insert(rows);
  if (insertErr) {
    console.error('\n❌  삽입 실패:', insertErr.message);
    process.exit(1);
  }

  console.log(`\n🎉  ${toInsert.length}건 삽입 완료!`);
}

run().catch(e => { console.error(e); process.exit(1); });
