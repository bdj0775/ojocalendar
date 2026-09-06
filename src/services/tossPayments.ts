import { loadTossPayments } from '@tosspayments/payment-sdk';

const CLIENT_KEY = import.meta.env.VITE_TOSS_CLIENT_KEY as string;

/**
 * 카드 등록(빌링 인증) 화면으로 이동. 사용자가 카드 정보를 입력하고 인증을 마치면
 * successUrl로 리다이렉트되며 쿼리스트링에 authKey, customerKey가 포함됨.
 * 실제 결제 승인/구독 활성화는 BillingSuccess 페이지에서 Edge Function 호출로 처리.
 */
export const startBillingAuth = async (customerKey: string) => {
  const tossPayments = await loadTossPayments(CLIENT_KEY);
  await tossPayments.requestBillingAuth('카드', {
    customerKey,
    successUrl: `${window.location.origin}/billing/success`,
    failUrl: `${window.location.origin}/billing/fail`,
  });
};
