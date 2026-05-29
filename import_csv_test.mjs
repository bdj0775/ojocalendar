import fs from 'fs';

// Read the CSV
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

let validCount = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  
  const cols = parseCsvLine(line);
  if (cols.length < 15) continue;

  const noStr = cols[1];
  if (!noStr || isNaN(parseInt(noStr, 10))) {
    continue; // not a data row
  }

  // extract data
  const checkInStr = cols[4];
  const checkOutStr = cols[5];
  
  const checkIn = parseCheckIn(checkInStr);
  if (!checkIn) continue;
  
  const checkOut = parseCheckOut(checkOutStr, checkIn);
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
  
  const amountStr = cols[12]?.replace(/\D/g, '') || '0';
  const amount = parseInt(amountStr, 10);
  
  const commStr = cols[13]?.replace(/\D/g, '') || '0';
  const commission = parseInt(commStr, 10);

  let bookingDate = parseCheckIn(cols[2]); // sometimes yyMMdd
  
  bookings.push({
    guestName,
    checkIn,
    checkOut,
    bookingDate: bookingDate || checkIn,
    guests,
    infants,
    nationality,
    channel,
    amount,
    commission,
    status: 'completed', // mostly past bookings
  });
  validCount++;
}

console.log(`Parsed ${validCount} bookings. First 5:`);
console.log(JSON.stringify(bookings.slice(0, 5), null, 2));
console.log(`Last 5:`);
console.log(JSON.stringify(bookings.slice(-5), null, 2));

// Save to a JSON file to inspect
fs.writeFileSync('parsed_bookings.json', JSON.stringify(bookings, null, 2));
