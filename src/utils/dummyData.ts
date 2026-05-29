import type { Booking, Maintenance } from '../types';

export const DUMMY_BOOKINGS: Booking[] = [
  { id: 1, guestName: '박다은', checkIn: '2025-09-29', checkOut: '2025-10-01', bookingDate: '2025-09-08', guests: 3, infants: 0, nationality: '대한민국', channel: 'Airbnb', status: 'completed', amount: 408355, commission: 17.1 },
  { id: 2, guestName: 'jakub', checkIn: '2025-10-01', checkOut: '2025-10-03', bookingDate: '2025-07-21', guests: 2, infants: 0, nationality: '덴마크', channel: 'Airbnb', status: 'completed', amount: 381095, commission: 19.8 },
  { id: 3, guestName: 'chien', checkIn: '2025-10-03', checkOut: '2025-10-05', bookingDate: '2025-06-12', guests: 2, infants: 0, nationality: '싱가포르', channel: 'Airbnb', status: 'completed', amount: 378099, commission: 18.2 },
  { id: 4, guestName: '김태웅', checkIn: '2025-10-05', checkOut: '2025-10-06', bookingDate: '2025-06-12', guests: 4, infants: 0, nationality: '대한민국', channel: 'Direct', status: 'completed', amount: 200000, commission: 0.0 },
  { id: 5, guestName: '김다린', checkIn: '2025-10-06', checkOut: '2025-10-07', bookingDate: '2025-06-19', guests: 3, infants: 0, nationality: '대한민국', channel: 'Naver', status: 'completed', amount: 220000, commission: 0.0 },
  { id: 6, guestName: '정소영', checkIn: '2025-10-07', checkOut: '2025-10-08', bookingDate: '2025-07-16', guests: 2, infants: 1, nationality: '대한민국', channel: 'Naver', status: 'completed', amount: 180000, commission: 2.9 },
  { id: 7, guestName: '조송이', checkIn: '2025-10-08', checkOut: '2025-10-11', bookingDate: '2025-06-19', guests: 2, infants: 2, nationality: '대한민국', channel: 'Airbnb', status: 'completed', amount: 570201, commission: 17.2 },
  { id: 8, guestName: '박영주', checkIn: '2025-10-11', checkOut: '2025-10-12', bookingDate: '2025-08-13', guests: 2, infants: 0, nationality: '대한민국', channel: 'Naver', status: 'completed', amount: 180000, commission: 3.2 },
  { id: 9, guestName: '안창현', checkIn: '2025-10-13', checkOut: '2025-10-14', bookingDate: '2025-07-25', guests: 4, infants: 0, nationality: '대한민국', channel: 'Naver', status: 'completed', amount: 200000, commission: 3.2 },
  { id: 10, guestName: 'bug', checkIn: '2025-10-14', checkOut: '2025-10-16', bookingDate: '2025-07-18', guests: 4, infants: 0, nationality: '대만', channel: 'Airbnb', status: 'completed', amount: 383576, commission: 16.8 },
  { id: 11, guestName: '신가람', checkIn: '2025-10-16', checkOut: '2025-10-17', bookingDate: '2025-09-27', guests: 2, infants: 1, nationality: '대한민국', channel: 'Naver', status: 'completed', amount: 180000, commission: 2.0 },
  { id: 12, guestName: '박준경', checkIn: '2025-10-17', checkOut: '2025-10-19', bookingDate: '2025-07-11', guests: 3, infants: 2, nationality: '대한민국', channel: 'Naver', status: 'completed', amount: 460000, commission: 10.4 },
  { id: 13, guestName: 'S.B', checkIn: '2025-10-19', checkOut: '2025-10-20', bookingDate: '2025-10-11', guests: 3, infants: 0, nationality: '대한민국', channel: 'Airbnb', status: 'completed', amount: 181959, commission: 5.3 },
  { id: 14, guestName: '류은숙', checkIn: '2025-10-20', checkOut: '2025-10-21', bookingDate: '2025-07-23', guests: 3, infants: 0, nationality: '대한민국', channel: 'Naver', status: 'completed', amount: 180000, commission: 3.2 },
  { id: 15, guestName: 'yuchin', checkIn: '2025-10-21', checkOut: '2025-10-23', bookingDate: '2025-07-18', guests: 4, infants: 0, nationality: '대만', channel: 'Airbnb', status: 'completed', amount: 411416, commission: 17.7 },
  { id: 16, guestName: '강보람', checkIn: '2025-10-24', checkOut: '2025-10-26', bookingDate: '2025-08-21', guests: 5, infants: 0, nationality: '대한민국', channel: 'Naver', status: 'completed', amount: 470000, commission: 9.2 },
  { id: 17, guestName: '김진경', checkIn: '2025-10-26', checkOut: '2025-10-28', bookingDate: '2025-07-19', guests: 2, infants: 2, nationality: '대한민국', channel: 'Naver', status: 'completed', amount: 300000, commission: 3.2 },
  { id: 18, guestName: '경진영', checkIn: '2025-10-28', checkOut: '2025-10-30', bookingDate: '2025-08-15', guests: 4, infants: 0, nationality: '대한민국', channel: 'Naver', status: 'completed', amount: 380000, commission: 8.7 },
  { id: 19, guestName: '신혜지', checkIn: '2025-10-30', checkOut: '2025-10-31', bookingDate: '2025-10-30', guests: 3, infants: 0, nationality: '대한민국', channel: 'Direct', status: 'completed', amount: 112000, commission: 0.0 }
];

export const DUMMY_MAINTENANCE: Maintenance[] = [];
