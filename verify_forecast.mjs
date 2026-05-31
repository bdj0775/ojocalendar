import fs from 'fs';

// 1. Read parsed bookings
let rawParsed = [];
try {
  rawParsed = JSON.parse(fs.readFileSync('parsed_bookings.json', 'utf8'));
} catch (e) {
  console.log('No parsed_bookings.json found.');
}

const validBookings = rawParsed.map(b => ({
  checkIn: b.checkIn,
  checkOut: b.checkOut,
  bookingDate: b.bookingDate || b.checkIn,
  amount: b.amount || 0,
  status: 'confirmed'
}));

// We know they restored June 2026 data.
import { createClient } from '@supabase/supabase-js';

const envText = fs.readFileSync('.env.local', 'utf8');
const env = {};
envText.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) env.URL = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) env.KEY = line.split('=')[1].trim();
});

const supabaseUrl = env.URL;
const supabaseAnonKey = env.KEY;
if (supabaseUrl && supabaseAnonKey) {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  async function run() {
    const { data: bookings, error } = await supabase.from('bookings').select('checkin, checkout, bookingdate, amount, status').limit(10000);
    
    if (error) {
      console.error('Failed to fetch from DB', error);
      return;
    }
    
    const dbBookings = bookings.map(b => ({
      checkIn: b.checkin,
      checkOut: b.checkout,
      bookingDate: b.bookingdate,
      amount: b.amount,
      status: b.status
    }));

    console.log(`Fetched ${dbBookings.length} bookings from DB.`);

    const calcMonthStats = (year, month) => {
      const occupiedDates = new Set();
      dbBookings.forEach(b => {
        // EXACT ALGORITHM LOGIC:
        if (!b.checkIn || !b.checkOut) return;
        const bStart = new Date(b.checkIn + 'T12:00:00');
        const bEnd = new Date(b.checkOut + 'T12:00:00');
        // if (isNaN(bStart.getTime()) || isNaN(bEnd.getTime())) return; // Un-comment to see what happens when fixed
        
        const mStart = new Date(year, month, 1, 12, 0, 0);
        const mEnd = new Date(year, month + 1, 1, 12, 0, 0);
        
        const overlapStart = bStart > mStart ? bStart : mStart;
        const overlapEnd = bEnd < mEnd ? bEnd : mEnd;
        const n = overlapStart >= overlapEnd ? 0 : Math.round((overlapEnd.getTime() - overlapStart.getTime()) / 86400000);
        
        if (n > 0) {
          let cur = new Date(overlapStart);
          while (cur < overlapEnd) {
            occupiedDates.add(`${cur.getFullYear()}-${cur.getMonth()}-${cur.getDate()}`);
            cur.setDate(cur.getDate() + 1);
          }
        }
      });
      
      const mStart = new Date(year, month, 1);
      const mEnd = new Date(year, month + 1, 1);
      const daysInMonth = Math.round((mEnd.getTime() - mStart.getTime()) / 86400000);
      return {
        occNights: occupiedDates.size,
        daysInMonth,
        occupancy: Math.round((occupiedDates.size / daysInMonth) * 100)
      };
    };

    const results = [];
    console.log(`\n=== 2026년 예약 확정율(OTB) 검증 결과 ===`);
    for (let i = 4; i <= 9; i++) {
      const stats = calcMonthStats(2026, i);
      results.push(`${i+1}월 실제 확정된 밤 수: ${stats.occNights}박 / ${stats.daysInMonth}박 => 점유율(OTB): ${stats.occupancy}%`);
    }
    console.log(results.join('\n'));
    console.log(`=========================================\n`);
  }
  run();
} else {
  console.log('No Supabase credentials found.');
}
