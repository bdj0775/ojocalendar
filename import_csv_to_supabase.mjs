import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials in env.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const csvText = fs.readFileSync('오조록 매출_지출 - 시트1.csv', 'utf8');

const parseCsvLine = (text) => {
  const result = [];
  let inQuotes = false;
  let currentWord = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(currentWord.trim());
      currentWord = '';
    } else {
      currentWord += char;
    }
  }
  result.push(currentWord.trim());
  return result;
};

const lines = csvText.split('\n');
const bookings = [];

const parseCheckIn = (str) => {
  if (!str) return null;
  str = str.replace(/\D/g, '');
  if (str.length !== 6) return null;
  return `20${str.substring(0, 2)}-${str.substring(2, 4)}-${str.substring(4, 6)}`;
};

const parseCheckOut = (coStr, ciDate) => {
  if (!coStr || !ciDate) return null;
  const ciObj = new Date(ciDate);
  let y = ciObj.getFullYear();
  let m = ciObj.getMonth() + 1;
  let d = ciObj.getDate();

  if (coStr.length === 6 && !coStr.includes('/')) {
    const parsed = parseCheckIn(coStr);
    if (parsed) return parsed;
  }

  if (coStr.includes('/')) {
    const parts = coStr.split('/');
    let coM = parseInt(parts[0], 10);
    let coD = parseInt(parts[1], 10);
    if (coM < m) y++;
    return `${y}-${String(coM).padStart(2, '0')}-${String(coD).padStart(2, '0')}`;
  } else {
    let coD = parseInt(coStr, 10);
    if (isNaN(coD)) return null;
    let coM = m;
    let coY = y;
    if (coD < d) {
      coM++;
      if (coM > 12) {
        coM = 1;
        coY++;
      }
    }
    return `${coY}-${String(coM).padStart(2, '0')}-${String(coD).padStart(2, '0')}`;
  }
};

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  const cols = parseCsvLine(line);
  if (cols.length < 15) continue;

  const noStr = cols[1];
  if (!noStr || isNaN(parseInt(noStr, 10))) continue;

  const checkIn = parseCheckIn(cols[4]);
  if (!checkIn) continue;
  
  const checkOut = parseCheckOut(cols[5], checkIn);
  if (!checkOut) continue;

  const nationality = cols[6] || '';
  const guestName = cols[7] || '';
  
  const guestInfo = cols[9] || '1';
  const gParts = guestInfo.split('+');
  const guests = parseInt(gParts[0], 10) || 1;
  const infants = gParts.length > 1 ? parseInt(gParts[1], 10) : 0;
  
  let channel = cols[10] || '직접예약';
  if (channel.includes('에어비엔비')) channel = 'Airbnb';
  else if (channel.includes('네이버')) channel = 'Naver';
  else if (channel.includes('부킹닷컴')) channel = 'Booking.com';
  else if (channel.includes('아고다')) channel = 'Agoda';
  else if (channel.includes('계좌이체')) channel = 'Direct';
  else if (channel.includes('지인')) channel = 'Direct';
  
  const amountStr = cols[12]?.replace(/\D/g, '') || '0';
  const amount = parseInt(amountStr, 10);
  
  const commStr = cols[13]?.replace(/\D/g, '') || '0';
  const commission = parseInt(commStr, 10);

  let bookingDate = parseCheckIn(cols[2]) || checkIn;
  
  bookings.push({
    guestName,
    checkIn,
    checkOut,
    bookingDate,
    guests,
    infants,
    nationality,
    channel,
    amount,
    commission,
    status: 'completed'
  });
}

async function run() {
  console.log('Fetching user profile to get host_id and property_id...');
  
  // Get host with name "Ojorok" or properties matching "오조록"
  // First get properties with name "오조록"
  const { data: properties, error: pError } = await supabase
    .from('properties')
    .select('id, host_id, name')
    .ilike('name', '%오조록%')
    .limit(1);

  if (pError || !properties || properties.length === 0) {
    console.error('Error: Could not find property "오조록". Falling back to any property.');
    // fallback
    const { data: anyProp } = await supabase.from('properties').select('id, host_id').limit(1);
    if (!anyProp || anyProp.length === 0) {
      console.error('No properties found. Please create a property first.');
      process.exit(1);
    }
    var propertyId = anyProp[0].id;
    var hostId = anyProp[0].host_id;
  } else {
    var propertyId = properties[0].id;
    var hostId = properties[0].host_id;
  }

  console.log(`Using Property ID: ${propertyId}, Host ID: ${hostId}`);

  // It's safer to delete old bookings first if this is a complete refresh
  console.log('Clearing existing bookings for this property...');
  await supabase.from('bookings').delete().eq('property_id', propertyId);

  const rowsToInsert = bookings.map(b => ({
    host_id: hostId,
    property_id: propertyId,
    guestname: b.guestName,
    checkin: b.checkIn,
    checkout: b.checkOut,
    bookingdate: b.bookingDate,
    guests: b.guests,
    infants: b.infants,
    nationality: b.nationality,
    channel: b.channel,
    status: b.status,
    amount: b.amount,
    commission: b.commission
  }));

  console.log(`Inserting ${rowsToInsert.length} bookings...`);
  
  // Insert in batches of 100 just in case
  let batchSize = 100;
  for (let i = 0; i < rowsToInsert.length; i += batchSize) {
    const batch = rowsToInsert.slice(i, i + batchSize);
    const { error } = await supabase.from('bookings').insert(batch);
    if (error) {
      console.error(`Error inserting batch ${i}:`, error);
      process.exit(1);
    }
  }

  console.log('Successfully imported all CSV data into Supabase!');
}

run();
