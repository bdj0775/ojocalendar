-- 모든 예약/정비를 해당 호스트의 첫 번째(가장 오래된) 숙소에 재연결
-- 오조록 본점만 남기고 숙소2, 숙소3에 잘못 연결된 데이터도 수정
UPDATE bookings b
SET property_id = (
  SELECT p.id
  FROM properties p
  WHERE p.host_id = b.host_id
  ORDER BY p.created_at ASC
  LIMIT 1
)
WHERE b.property_id IS NULL
   OR b.property_id NOT IN (
     SELECT p.id FROM properties p
     WHERE p.host_id = b.host_id
     ORDER BY p.created_at ASC
     LIMIT 1
   );

UPDATE maintenance m
SET property_id = (
  SELECT p.id
  FROM properties p
  WHERE p.host_id = m.host_id
  ORDER BY p.created_at ASC
  LIMIT 1
)
WHERE m.property_id IS NULL
   OR m.property_id NOT IN (
     SELECT p.id FROM properties p
     WHERE p.host_id = m.host_id
     ORDER BY p.created_at ASC
     LIMIT 1
   );
