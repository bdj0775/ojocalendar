import fs from 'fs';
import { DUMMY_BOOKINGS } from './src/utils/dummyData.js';

const formatDate = (dateStr) => {
  if (!dateStr || dateStr.trim() === '') return null;
  const y = '20' + dateStr.substring(0, 2);
  const m = dateStr.substring(2, 4);
  const d = dateStr.substring(4, 6);
  return `${y}-${m}-${d}`;
};

const map = [
  // 5월
  { name: '이경진', ci: '260429', bd: '260402' },
  { name: '이정은', ci: '260504', bd: '260414' },
  { name: 'lien', ci: '260507', bd: '260103' },
  { name: '박재우', ci: '260508', bd: '260224' },
  { name: '신은영', ci: '260510', bd: '260424' },
  { name: '대만', ci: '260512', bd: '260329' },
  { name: '김민준', ci: '260513', bd: '260223' },
  { name: '안채현', ci: '260519', bd: '260423' },
  { name: 'zixiang', ci: '260521', bd: '260402' },
  { name: '이다솜', ci: '260523', bd: '260104' },
  { name: 'aliza', ci: '260525', bd: '260314' },
  { name: '김예원', ci: '260528', bd: '260221' },
  // 9월
  { name: '권순호', ci: '250831', bd: '250826' },
  { name: '조한길', ci: '250901', bd: '250817' },
  { name: '이다은', ci: '250904', bd: '250701' },
  { name: '안채린', ci: '250905', bd: '250726' },
  { name: '전하진', ci: '250907', bd: '250827' },
  { name: '오유정', ci: '250908', bd: '250818' },
  { name: '대만', ci: '250909', bd: '250708' },
  { name: '김지현', ci: '250910', bd: '250725' },
  { name: '강혜미', ci: '250912', bd: '250708' },
  { name: '박현경', ci: '250914', bd: '250828' },
  { name: '박승주', ci: '250915', bd: '250823' },
  // 10월
  { name: '박다은', ci: '250929', bd: '250908' },
  { name: 'jakub', ci: '251001', bd: '250721' },
  { name: 'chien', ci: '251003', bd: '250612' },
  { name: '김태웅', ci: '251005', bd: '250825' },
  { name: '김다린', ci: '251006', bd: '250914' },
  { name: '정소영', ci: '251007', bd: '250719' },
  { name: '조송이', ci: '251008', bd: '250626' },
  { name: '박영주', ci: '251011', bd: '250805' },
  { name: '안창현', ci: '251013', bd: '250728' },
  { name: 'bug', ci: '251014', bd: '250728' },
  { name: '신가람', ci: '251016', bd: '250914' },
  { name: '박준경', ci: '251017', bd: '250809' },
  { name: 'S.B', ci: '251019', bd: '251008' },
  { name: '류은숙', ci: '251020', bd: '250805' },
  { name: 'yuchin', ci: '251021', bd: '250816' },
  // 11월
  { name: '김희양', ci: '251031', bd: '250924' },
  { name: 'yuki', ci: '251101', bd: '250820' },
  { name: 'wu', ci: '251102', bd: '250828' },
  { name: '조성민', ci: '251103', bd: '250909' },
  { name: 'lyn', ci: '251106', bd: '250911' },
  { name: '용은정', ci: '251108', bd: '251102' },
  { name: '고수선', ci: '251109', bd: '251005' },
  { name: '최성민', ci: '251115', bd: '251110' },
  { name: 'yoyo', ci: '251117', bd: '250905' },
  { name: '최준요', ci: '251118', bd: '251002' },
  { name: 'sandy', ci: '251120', bd: '250910' },
  { name: '가족', ci: '251121', bd: '250821' },
  { name: '조안나', ci: '251123', bd: '251015' },
  { name: 'crystal', ci: '251124', bd: '251006' },
  { name: 'blake', ci: '251126', bd: '250905' },
  { name: '신혜지', ci: '251128', bd: '251127' },
  // 12월
  { name: '장진영', ci: '251130', bd: '251117' },
  { name: 'joanne', ci: '251202', bd: '251017' },
  { name: '김호현', ci: '251207', bd: '251026' },
  { name: 'suryn', ci: '251209', bd: '251101' },
  { name: 'yuru', ci: '251212', bd: '251110' },
  { name: '정명모', ci: '251213', bd: '251125' },
  { name: '임서희', ci: '251216', bd: '251020' },
  { name: 'chen', ci: '251218', bd: '251024' },
  { name: '그루네', ci: '251219', bd: '251122' },
  { name: '노경', ci: '251221', bd: '251120' },
  { name: '신다빈', ci: '251222', bd: '251118' },
  { name: '김혜진', ci: '251224', bd: '251215' },
  { name: '오찬미', ci: '251228', bd: '251110' },
  // 1월
  { name: '심경보', ci: '251231', bd: '250921' },
  { name: 'ho', ci: '260101', bd: '251124' },
  { name: 'yeo', ci: '260102', bd: '251107' },
  { name: 'de wei lin', ci: '260104', bd: '251127' },
  { name: '최대진', ci: '260105', bd: '251018' },
  { name: '김아람', ci: '260106', bd: '251201' },
  { name: '강경희', ci: '260109', bd: '250918' },
  { name: '정인숙', ci: '260110', bd: '251112' },
  { name: '이근미', ci: '260112', bd: '251201' },
  { name: '정남호', ci: '260113', bd: '260110' },
  { name: '최윤선', ci: '260115', bd: '251221' },
  { name: 'chan', ci: '260117', bd: '250813' },
  { name: '이승현', ci: '260119', bd: '251221' },
  { name: '한민우', ci: '260120', bd: '251105' },
  { name: 'xiao', ci: '260122', bd: '251005' },
  // 2월
  { name: '임세원', ci: '260202', bd: '260108' },
  { name: '백정하', ci: '260203', bd: '251124' },
  { name: '서가연', ci: '260206', bd: '260112' },
  { name: '구예림', ci: '260207', bd: '251115' },
  { name: '장은영', ci: '260209', bd: '250923' },
  { name: 'peiyun', ci: '260211', bd: '251127' },
  { name: '김준모', ci: '260212', bd: '260111' },
  { name: '이지후', ci: '260213', bd: '260118' },
  { name: '임신혁', ci: '260215', bd: '260202' },
  { name: '염승현', ci: '260216', bd: '260203' },
  { name: '한수희', ci: '260217', bd: '260105' },
  { name: '오윤경', ci: '260218', bd: '251030' },
  { name: '정준영', ci: '260220', bd: '260202' },
  { name: '양효신', ci: '260221', bd: '260103' },
  { name: '심선우', ci: '260222', bd: '260105' },
  // 3월
  { name: '김지윤', ci: '260228', bd: '260127' },
  { name: '김수린', ci: '260301', bd: '260127' },
  { name: 'Wong', ci: '260304', bd: '260102' },
  { name: '오유진', ci: '260306', bd: '260204' },
  { name: '이상훈', ci: '260307', bd: '260306' },
  { name: '이용숙', ci: '260308', bd: '260128' },
  { name: 'Wu Yi', ci: '260310', bd: '260126' },
  { name: '동주친구', ci: '260311', bd: '260303' },
  { name: 'Yen Tzu Lin', ci: '260313', bd: '260214' },
  { name: '김희성', ci: '260314', bd: '251001' },
  { name: 'Yihuei', ci: '260315', bd: '251201' },
  { name: 'Erika', ci: '260316', bd: '251209' },
  { name: '대만', ci: '260319', bd: '251028' },
  { name: '이세리', ci: '260320', bd: '260106' },
  { name: '대만', ci: '260323', bd: '251208' },
  { name: '성민희', ci: '260324', bd: '260206' },
  { name: 'Abigail', ci: '260325', bd: '260316' },
  { name: '차인혜', ci: '260326', bd: '260128' },
  { name: '대만', ci: '260328', bd: '260201' },
  { name: '대만', ci: '260329', bd: '260105' },
  // 4월
  { name: 'lily', ci: '260330', bd: '260107' },
  { name: 'ashley', ci: '260401', bd: '251125' },
  { name: '최지수', ci: '260403', bd: '260204' },
  { name: 'annie', ci: '260404', bd: '260203' },
  { name: '이윤일', ci: '260405', bd: '260206' },
  { name: 'aneta', ci: '260406', bd: '260122' },
  { name: '정영은', ci: '260407', bd: '260103' },
  { name: '강민채', ci: '260408', bd: '260408' },
  { name: '강현지', ci: '260409', bd: '260221' },
  { name: 'Josie', ci: '260411', bd: '250920' },
  { name: 'david', ci: '260414', bd: '260303' },
  { name: '이슬기', ci: '260416', bd: '260216' },
  { name: '오승은', ci: '260418', bd: '260203' },
  { name: '김지수', ci: '260422', bd: '260303' },
  { name: '이진석', ci: '260423', bd: '260405' },
  // 6월
  { name: '김유진', ci: '260529', bd: '260124' },
  { name: '김광규', ci: '260606', bd: '260403' },
  { name: 'jaslyn', ci: '260609', bd: '260210' },
  { name: 'tzu', ci: '260612', bd: '260215' },
  { name: '대만 게스트 5', ci: '260616', bd: '260215' },
  { name: '정수경', ci: '260618', bd: '260307' },
  { name: '대만 게스트 6', ci: '260619', bd: '260310' },
  { name: 'jemma', ci: '260629', bd: '260315' },
  // 7월
  { name: 'sharon', ci: '260702', bd: '260404' },
  { name: '최지현', ci: '260715', bd: '260410' },
  { name: '차수진', ci: '260717', bd: '260415' },
  { name: '이동우', ci: '260722', bd: '260420' },
  { name: 'cheng', ci: '260727', bd: '260422' },
  { name: '목동수', ci: '260729', bd: '260425' },
  { name: 'lei', ci: '260730', bd: '260426' },
  // 8월
  { name: '노혜선', ci: '260804', bd: '260420' },
  { name: '최유정', ci: '260808', bd: '260421' },
  { name: 'floor', ci: '260820', bd: '260422' },
  // 9월
  { name: 'simone', ci: '260901', bd: '260420' },
  { name: 'yang', ci: '260916', bd: '260421' },
  { name: 'ziv', ci: '260926', bd: '260422' },
  // 10월
  { name: 'lily', ci: '261011', bd: '260420' },
  { name: 'simon', ci: '261016', bd: '260421' },
  { name: 'anna', ci: '261021', bd: '260422' }
];

let sql = `-- Migration script generated by AI
-- Note: Replace '{HOST_ID}' and '{PROPERTY_ID}' with your actual IDs, or we can use subqueries.
-- First, let's delete existing bookings to prevent duplicates.
DELETE FROM bookings;

-- Now insert the fused data
INSERT INTO bookings (host_id, property_id, guestname, checkin, checkout, bookingdate, guests, infants, nationality, channel, status, amount, commission)
VALUES
`;

const getSqlStr = (val) => {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
  return val;
};

const rows = DUMMY_BOOKINGS.map((b, idx) => {
  let bdStr = null;
  const match = map.find(m => 
    b.checkIn === formatDate(m.ci) && 
    (b.guestName === m.name || b.guestName.startsWith(m.name))
  );

  if (match) {
    bdStr = formatDate(match.bd);
  } else {
    const ciDate = new Date(b.checkIn + 'T12:00:00');
    const todayDate = new Date('2026-04-27T12:00:00'); // Hardcap to today to prevent future bookings
    
    // Calculate days between today and check-in
    const daysToCi = Math.floor((ciDate - todayDate) / 86400000);
    
    // Lead time MUST be greater than daysToCi to ensure bookingdate is <= today
    const minLead = Math.max(15, daysToCi + 1);
    const maxLead = Math.max(minLead + 30, 90);
    
    const randDays = Math.floor(Math.random() * (maxLead - minLead + 1)) + minLead;
    const bd = new Date(ciDate.getTime() - randDays * 86400000);
    bdStr = bd.toISOString().split('T')[0];
  }

  // Use subquery to dynamically get host_id and property_id for the first property
  const hostSub = `(SELECT host_id FROM properties LIMIT 1)`;
  const propSub = `(SELECT id FROM properties LIMIT 1)`;

  return `  (${hostSub}, ${propSub}, ${getSqlStr(b.guestName)}, ${getSqlStr(b.checkIn)}, ${getSqlStr(b.checkOut)}, ${getSqlStr(bdStr)}, ${b.guests}, ${b.infants}, ${getSqlStr(b.nationality)}, ${getSqlStr(b.channel)}, ${getSqlStr(b.status || 'completed')}, ${b.amount || 0}, ${b.commission || 0})`;
});

sql += rows.join(',\n') + ';\n';

fs.writeFileSync('import_excel_data.sql', sql, 'utf8');
console.log('Successfully generated import_excel_data.sql. Please run this in your Supabase SQL Editor.');
