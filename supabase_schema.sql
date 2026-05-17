-- ==========================================
-- [SaaS Architecture Base Schema]
-- Multi-tenant accommodation management DB 
-- ==========================================

-- 기존에 생성되었던 구버전 테이블 초기화 (데이터가 없다면 문제없음)
DROP TABLE IF EXISTS maintenance CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS properties CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- 1. 유저 프로필 테이블 (전역 설정 포함)
-- Supabase Auth의 users 테이블과 1:1 매칭됩니다.
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    global_settings JSONB DEFAULT '{"language": "ko", "currency": "KRW", "notifications": true}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. 객실(숙소) 테이블
CREATE TABLE properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    base_guests INTEGER DEFAULT 2,
    base_price NUMERIC(10, 0) DEFAULT 0,
    weekend_price NUMERIC(10, 0) DEFAULT 0,
    extra_guest_fee NUMERIC(10, 0) DEFAULT 0,
    no_extra_guest_fee BOOLEAN DEFAULT false,
    check_in_time VARCHAR(10) DEFAULT '16:00',
    check_out_time VARCHAR(10) DEFAULT '11:00',
    cleaning_fee NUMERIC(10, 0) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. 예약 테이블
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    guestname VARCHAR(255) NOT NULL,
    checkin DATE NOT NULL,
    checkout DATE NOT NULL,
    bookingdate DATE,
    guests INTEGER DEFAULT 2,
    infants INTEGER DEFAULT 0,
    nationality VARCHAR(100),
    channel VARCHAR(100),
    status VARCHAR(50) DEFAULT 'confirmed',
    amount NUMERIC(15, 0) DEFAULT 0,
    commission NUMERIC(5, 2) DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. 유지보수 및 차단 일정 테이블
CREATE TABLE maintenance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    startdate DATE NOT NULL,
    enddate DATE NOT NULL,
    label VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ==========================================
-- [RLS (Row Level Security) 설정]
-- 다른 계정의 데이터 침범을 막는 방화벽 정책입니다.
-- ==========================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can insert their own profile." ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile." ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can view own profile." ON profiles FOR SELECT USING (auth.uid() = id);

-- Properties Policies
CREATE POLICY "Users can manage own properties" ON properties FOR ALL USING (auth.uid() = host_id);

-- Bookings Policies
CREATE POLICY "Users can manage own bookings" ON bookings FOR ALL USING (auth.uid() = host_id);

-- Maintenance Policies
CREATE POLICY "Users can manage own maintenance" ON maintenance FOR ALL USING (auth.uid() = host_id);

-- ==========================================
-- [Functions & Triggers]
-- 회원가입 시 자동으로 Profiles 테이블 생성
-- ==========================================
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
