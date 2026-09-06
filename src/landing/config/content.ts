// ============================================================
// Landing Page Content — 모든 텍스트·데이터의 단일 출처
// 새 프로젝트로 추출 시 이 파일만 수정하면 됩니다.
// ============================================================

export type FeatureIconKey = 'calendar-days' | 'bar-chart-2' | 'smartphone' | 'trending-up';

export interface FeatureItem {
  icon: FeatureIconKey;
  title: string;
  desc: string;
  colSpan?: string;
  bgGradient: string;
  badge?: string;
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
    badge: '🎉 오조캘린더 오픈',
    headlineDesktop: '작은 숙소를 위한 새로운 캘린더',
    headlineMobile: '작은 숙소를 위한\n새로운 캘린더',
    subCopies: [
      '달력과 연동된 대시보드로, 더 편해진 매출 관리',
      '예약 현황 한눈에 파악하고, 공실을 채워보세요',
    ],
    ctaPrimary: '무료로 시작하기',
    ctaSecondary: '앱 설치하기',
  },

  features: {
    sectionLabel: '핵심 가치',
    title: '숙소 운영의 비효율을 걷어내는 가장 현대적인 레이아웃',
    items: [
      {
        icon: 'calendar-days' as FeatureIconKey,
        title: '통합 예약 달력',
        desc: '에어비앤비, 부킹닷컴, 네이버 예약이 실시간으로 동기화되어 하나의 달력에 표시됩니다. 날짜 클릭 한 번으로 모든 예약의 상세 정보를 한눈에 파악하세요.',
        colSpan: 'lg:col-span-2',
        bgGradient: 'from-blue-500/10 via-indigo-500/5 to-transparent border-blue-500/20',
        badge: 'iCal 실시간 연동',
      },
      {
        icon: 'bar-chart-2' as FeatureIconKey,
        title: '스마트 매출 분석',
        desc: '객실별 수익, 평균 객실 요금(ADR), 점유율을 자동으로 집계하여 손쉬운 정산을 돕습니다.',
        colSpan: 'lg:col-span-1',
        bgGradient: 'from-emerald-500/10 via-teal-500/5 to-transparent border-emerald-500/20',
        badge: '자동 정산 리포트',
      },
      {
        icon: 'trending-up' as FeatureIconKey,
        title: '과거 실적 기반 점유율 예측',
        desc: '과거 예약 페이스와 편향 교정 알고리즘을 바탕으로 이번 달 예상 점유율과 순수익을 시뮬레이션합니다. 비수기에도 든든한 전략 파트너가 되어 드립니다.',
        colSpan: 'lg:col-span-1',
        bgGradient: 'from-amber-500/10 via-orange-500/5 to-transparent border-amber-500/20',
        badge: '독보적 예측 알고리즘',
      },
      {
        icon: 'smartphone' as FeatureIconKey,
        title: 'PWA 모바일 앱 지원',
        desc: '앱스토어 다운로드 없이 홈 화면에 바로 설치하여 네이티브 앱처럼 빠르게 접속할 수 있습니다. 체크인 현장이나 외출 중에도 스마트폰으로 간편하게 관리하세요.',
        colSpan: 'lg:col-span-2',
        bgGradient: 'from-purple-500/10 via-fuchsia-500/5 to-transparent border-purple-500/20',
        badge: '홈 화면에 1초 설치',
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
