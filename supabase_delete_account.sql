-- ============================================
-- 회원탈퇴 시 auth.users 레코드를 삭제하는 함수
-- Supabase Dashboard > SQL Editor 에서 이 SQL 전체를 복사-붙여넣기 후 실행하세요.
-- ============================================

-- 기존 함수가 있으면 삭제
DROP FUNCTION IF EXISTS public.delete_own_account();

-- 함수 생성
CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER  -- 이것이 핵심: 관리자 권한으로 auth.users 삭제 가능
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  -- 로그인 안 된 상태면 거부
  IF _uid IS NULL THEN
    RETURN json_build_object('error', 'Not authenticated');
  END IF;

  -- 1. 앱 데이터 삭제 (이중 안전장치)
  DELETE FROM sync_notifications WHERE host_id = _uid;
  DELETE FROM sync_channels      WHERE host_id = _uid;
  DELETE FROM bookings           WHERE host_id = _uid;
  DELETE FROM properties         WHERE host_id = _uid;
  DELETE FROM profiles           WHERE id = _uid;

  -- 2. auth.users 레코드 삭제 (핵심!)
  --    이 후 카카오/구글로 로그인하면 "신규 가입"으로 처리됨
  DELETE FROM auth.users WHERE id = _uid;

  RETURN json_build_object('success', true);
END;
$$;

-- RPC 호출 권한 부여 (로그인한 유저만 호출 가능)
GRANT EXECUTE ON FUNCTION public.delete_own_account() TO authenticated;
