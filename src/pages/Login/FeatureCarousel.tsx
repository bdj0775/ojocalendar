import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { DUMMY_BOOKINGS } from '../../utils/dummyData';
import DashboardPage from '../Dashboard/Dashboard';
import CalendarPage from '../Calendar/Calendar';

const slides = [
  {
    id: 0,
    title: '완벽한 상호작용',
    desc: '예약을 클릭해 상세를 확인하거나, 즉시 새로운 예약을 생성합니다.',
  },
  {
    id: 1,
    title: '동적인 데이터 시각화',
    desc: '수익금과 점유율 변화에 맞춰 차트가 실시간으로 갱신됩니다.',
  },
];

const MOCK_PROP_ID = '__test_prop_1__';

export const FeatureCarousel = () => {
  const [active, setActive] = useState(0);

  // 초기 1회 스토어 셋팅 (Property 정보 주입)
  useEffect(() => {
    const state = useStore.getState();
    if (!state.isAuthenticated) {
      useStore.setState({
        properties: [{
          id: MOCK_PROP_ID, name: '스테이 호지',
          baseGuests: 2, basePrice: 100000, weekendPrice: 120000,
          extraGuestFee: 20000, noExtraGuestFee: false,
          checkInTime: '15:00', checkOutTime: '11:00', cleaningFee: 0
        }],
      });
    }
    return () => {
      if (!useStore.getState().isAuthenticated) {
        useStore.setState({ bookings: [], properties: [] });
      }
    };
  }, []);

  // 오케스트레이션: 모달 오픈 -> 바 생성 -> 대시보드 전환 -> 차트 데이터 갱신 (단일 루프)
  useEffect(() => {
    let timeouts: NodeJS.Timeout[] = [];
    const state = useStore.getState();
    if (state.isAuthenticated) return; // 로그인 후에는 방해하지 않음

    const runSequence = () => {
      // [0초] 캘린더 뷰 (Slide 0) 및 데이터 리셋
      setActive(0);
      useStore.setState({
        bookings: DUMMY_BOOKINGS.map(b => ({ ...b, propertyId: MOCK_PROP_ID })) as any,
        
        currentYear: 2025,
        currentMonth: 7, // 8월
      });

      // [1.5초] 모달 띄우기 (실제 예약 상세 모달 오픈)
      timeouts.push(setTimeout(() => {
        useStore.getState().openBookingModal(114);
      }, 1500));
      
      // [3.0초] 모달 닫기
      timeouts.push(setTimeout(() => {
        useStore.getState().closeBookingModal();
      }, 3000));

      // [3.5초] 이벤트 바(예약)가 빈 공간에 짠! 하고 생성됨
      timeouts.push(setTimeout(() => {
        const id = 9999;
        const newBooking = {
          id, propertyId: MOCK_PROP_ID, guestName: '신규 예약 건',
          checkIn: '2025-08-25', checkOut: '2025-08-27',
          status: 'confirmed', channel: 'Direct', amount: 350000,
          guests: 2, infants: 0, nationality: 'Korea', commission: 0
        };
        useStore.setState(prev => ({ bookings: [...prev.bookings, newBooking as any] }));
      }, 3500));

      // [5.5초] 대시보드로 넘어감
      timeouts.push(setTimeout(() => {
        setActive(1);
      }, 5500));

      // [7.0초] 수익금 숫자, 차트 등이 생성/갱신됨 (다음 달 데이터 로드)
      timeouts.push(setTimeout(() => {
        useStore.getState().nextMonth();
      }, 7000));

      // [9.5초] 처음부터 루프 재시작
      timeouts.push(setTimeout(() => {
        runSequence();
      }, 9500));
    };

    // 시퀀스 최초 시작
    runSequence();

    return () => {
      timeouts.forEach(clearTimeout);
      useStore.getState().closeBookingModal();
    };
  }, []);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center relative z-10 mt-12">
      {/* Mockup Container */}
      <div className="relative w-full max-w-[480px] aspect-[4/3] bg-background border border-border/60 shadow-2xl rounded-2xl overflow-hidden flex flex-col mb-12">
        {/* Window Header */}
        <div className="h-8 bg-muted/50 border-b border-border/50 flex items-center px-4 gap-2 shrink-0 z-20">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
          <div className="ml-4 text-[10px] text-muted-foreground font-semibold tracking-widest uppercase">
            Live Application Demo
          </div>
        </div>
        
        {/* Mockup Body - 모바일 화면 비율 래퍼 */}
        <div className="flex-1 relative bg-background overflow-hidden pointer-events-none select-none">
          
          {/* Slide 0: Actual Calendar Page */}
          <div className={`absolute inset-0 transition-opacity duration-1000 flex items-start justify-center pt-4 ${active === 0 ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
            <div className="w-[375px] h-[812px] bg-background transform scale-[0.6] origin-top rounded-[32px] border-8 border-border shadow-2xl overflow-hidden relative">
               <CalendarPage />
            </div>
          </div>

          {/* Slide 1: Actual Dashboard Page */}
          <div className={`absolute inset-0 bg-background transition-opacity duration-1000 flex items-start justify-center pt-4 ${active === 1 ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
            <div className="w-[375px] h-[812px] bg-background transform scale-[0.6] origin-top rounded-[32px] border-8 border-border shadow-2xl overflow-hidden relative">
               <DashboardPage />
            </div>
          </div>

        </div>
      </div>

      {/* Text Info */}
      <div className="relative text-center w-full max-w-sm h-[100px] flex items-center justify-center">
        {slides.map((s, i) => (
          <div 
            key={s.id} 
            className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-700 ease-out ${active === i ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}
          >
            <h3 className="text-2xl font-extrabold text-foreground mb-3">{s.title}</h3>
            <p className="text-muted-foreground type-body leading-relaxed">{s.desc}</p>
          </div>
        ))}
      </div>

      {/* Pagination Dots */}
      <div className="flex gap-2.5 mt-2 z-10 relative">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setActive(i)} // 사용자가 탭을 강제 이동할 수 있게 허용
            className={`h-2 rounded-full transition-all duration-500 ease-out ${active === i ? 'w-10 bg-primary' : 'w-2 bg-primary/20 hover:bg-primary/40'}`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
};
