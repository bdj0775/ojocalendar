import { useStore } from '../store/useStore';

// Phase 0 임시안 (MONETIZATION_ROADMAP.md) — 가격/한도가 확정되면 이 값만 수정
export const FREE_PROPERTY_LIMIT = 1;

/**
 * 결제/구독 권한 판별. monetizationEnabled가 꺼져있거나(베타 무료 배포 중)
 * legacy_free/pro 플랜이면 무제한, 그 외 free 플랜은 FREE_PROPERTY_LIMIT으로 제한.
 */
export const useEntitlements = () => {
  const subscription = useStore(s => s.subscription);
  const monetizationEnabled = useStore(s => s.monetizationEnabled);
  const properties = useStore(s => s.properties);

  const isUnlimited =
    !monetizationEnabled ||
    subscription?.plan === 'legacy_free' ||
    subscription?.plan === 'pro';

  const propertyLimit = isUnlimited ? Infinity : FREE_PROPERTY_LIMIT;
  const canAddProperty = properties.length < propertyLimit;

  return { subscription, monetizationEnabled, isUnlimited, propertyLimit, canAddProperty };
};
