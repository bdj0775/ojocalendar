// ============================================================
// Landing Page Content — 모든 텍스트·데이터의 단일 출처
// 새 프로젝트로 추출 시 이 파일만 수정하면 됩니다.
// ============================================================

export type FeatureIconKey = 'calendar-days' | 'bar-chart-2' | 'smartphone';

export interface FeatureItem {
  icon: FeatureIconKey;
  title: string;
  desc: string;
}

export interface NavLink {
  label: string;
  href: string;
}

export const CONTENT = {
  nav: {
    brand: 'OZO',
    brandSub: 'Calendar',
    loginLabel: '로그인',
    ctaLabel: '무료로 시작하기',
  },

  hero: {
    badge: '🎉 무료 베타 운영 중',
    headlineLine1: '하나의 달력으로,',
    headlineLine2: '더 똑똑하게',
    tagline: '작은 숙박 업소를 데이터 기반으로 운영하세요',
    subCopy:
      '대시보드와 연동된 OZO 캘린더로 여러 채널의 예약을 한번에 판단하세요',
    ctaPrimary: '무료로 시작하기',
    ctaSecondary: '앱으로 설치하기',
  },

  features: {
    sectionLabel: '핵심 기능',
    title: '더 이상 채널마다 따로 열지 않아도 됩니다',
    items: [
      {
        icon: 'calendar-days' as FeatureIconKey,
        title: '통합 예약 달력',
        desc: '에어비앤비, 부킹닷컴, 네이버 예약이 하나의 달력에. 날짜 클릭 한 번으로 상세 확인과 수정까지.',
      },
      {
        icon: 'bar-chart-2' as FeatureIconKey,
        title: '수익 분석 대시보드',
        desc: 'ADR, 점유율, 채널별 수익 비중을 자동 집계. 월별 트렌드를 보고 가격 전략을 세우세요.',
      },
      {
        icon: 'smartphone' as FeatureIconKey,
        title: '앱처럼 설치, 어디서나',
        desc: '홈 화면에 추가하면 앱스토어 없이 즉시 실행. 체크인 현장에서도 예약을 바로 확인합니다.',
      },
    ] satisfies FeatureItem[],
  },

  pricing: {
    sectionLabel: '요금제',
    title: '지금은 완전 무료',
    badge: '베타 무료',
    planName: '베타 플랜',
    price: '₩0',
    period: '/ 월',
    desc: '모든 기능을 무료로 사용하세요.',
    items: [
      '통합 예약 달력 (무제한)',
      '수익 · 점유율 분석 대시보드',
      '국적 · 채널 분석',
      '모바일 PWA 앱 설치',
      '멀티 채널 관리',
    ],
    cta: '지금 무료로 시작하기',
    note: '베타 종료 시 기존 사용자 혜택 우선 제공',
  },

  cta: {
    headline: '지금 바로 달력 하나로 통합하세요',
    sub: '가입 후 5분이면 첫 예약을 등록할 수 있습니다.',
    button: '무료로 시작하기',
  },

  footer: {
    brand: 'OZO',
    brandSub: 'Calendar',
    tagline: '작은 숙박 업소를 위한 스마트 예약 관리',
    contact: 'contact@ozocalendar.com',
    links: [{ label: '개인정보처리방침', href: '#' }] satisfies NavLink[],
    copyright: '© 2026 OZO Calendar. All rights reserved.',
  },
} as const;
