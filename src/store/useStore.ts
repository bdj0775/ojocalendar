import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../services/supabaseClient';
import { DUMMY_BOOKINGS, DUMMY_MAINTENANCE } from '../utils/dummyData';
import { syncAllChannels } from '../services/icalSync/syncService';
import { validateICalUrl } from '../services/icalSync/icalFetcher';
import type {
  StoreState, Property, BookingStatus, Settings, SyncNotification,
} from '../types';

const today = new Date();

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      currentYear: today.getFullYear(),
      currentMonth: today.getMonth(),

      isAuthenticated: false,
      userProfile: null,
      authLoading: true,

      // ── Toast ──────────────────────────────────────────────
      toast: null,
      showToast: (message, type = 'info') => {
        set({ toast: { message, type } });
      },
      hideToast: () => set({ toast: null }),

      // ── Data loading ───────────────────────────────────────
      dataLoading: false,

      initAuth: () => {
        supabase.auth.getSession().then(({ data: { session } }) => {
          set({
            isAuthenticated: !!session,
            userProfile: session?.user ?? null,
            authLoading: false,
          });
          if (session) get().fetchData();
        });

        supabase.auth.onAuthStateChange((_event, session) => {
          set({
            isAuthenticated: !!session,
            userProfile: session?.user ?? null,
            authLoading: false,
          });
          if (session) {
            get().fetchData();
          } else {
            set({ properties: [], bookings: [], maintenance: [] });
          }
        });
      },

      login: async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data;
      },
      signup: async (email, password, name) => {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        });
        if (error) throw error;
        return data;
      },
      logout: async () => {
        await supabase.auth.signOut();
      },

      setMonth: (year, month) => set({ currentYear: year, currentMonth: month }),
      nextMonth: () => {
        const { currentYear, currentMonth } = get();
        if (currentMonth === 11) set({ currentYear: currentYear + 1, currentMonth: 0 });
        else set({ currentMonth: currentMonth + 1 });
      },
      prevMonth: () => {
        const { currentYear, currentMonth } = get();
        if (currentMonth === 0) set({ currentYear: currentYear - 1, currentMonth: 11 });
        else set({ currentMonth: currentMonth - 1 });
      },
      goToday: () => {
        const now = new Date();
        set({ currentYear: now.getFullYear(), currentMonth: now.getMonth() });
      },

      properties: [],
      bookings: [],
      maintenance: [],

      migrateData: async () => {
        const state = get();
        const user = state.userProfile;
        if (!user) return;
        try {
          const { data: existingProps } = await supabase.from('properties').select('id');
          if (existingProps && existingProps.length > 0) return;

          const propToInsert = state.properties[0] ?? { name: '오조록 본점', base_guests: 2, base_price: 150000 };
          const { data: newProp, error: pErr } = await supabase.from('properties')
            .insert({
              host_id: user.id,
              name: (propToInsert as Property).name ?? '오조록',
              base_guests: (propToInsert as Property).baseGuests ?? 2,
              base_price: (propToInsert as Property).basePrice ?? 150000,
              weekend_price: (propToInsert as Property).weekendPrice ?? 180000,
              extra_guest_fee: (propToInsert as Property).extraGuestFee ?? 30000,
              no_extra_guest_fee: (propToInsert as Property).noExtraGuestFee ?? false,
              check_in_time: (propToInsert as Property).checkInTime ?? '16:00',
              check_out_time: (propToInsert as Property).checkOutTime ?? '11:00',
              cleaning_fee: (propToInsert as Property).cleaningFee ?? 0,
            }).select('id').single();

          if (pErr) throw pErr;
          const propId = newProp.id as string;

          const sourceBookings = (state.bookings.length > 0) ? state.bookings : DUMMY_BOOKINGS;
          if (sourceBookings.length > 0) {
            const bkRows = sourceBookings.map(b => ({
              host_id: user.id, property_id: propId,
              guestname: b.guestName, checkin: b.checkIn, checkout: b.checkOut,
              guests: b.guests, infants: b.infants, nationality: b.nationality,
              channel: b.channel, status: b.status ?? 'confirmed',
              amount: b.amount ?? 0, commission: b.commission ?? 0,
            }));
            await supabase.from('bookings').insert(bkRows);
          }

          const sourceMaint = (state.maintenance.length > 0) ? state.maintenance : DUMMY_MAINTENANCE;
          if (sourceMaint.length > 0) {
            const mtRows = sourceMaint.map(m => ({
              host_id: user.id, property_id: propId,
              startdate: m.startDate, enddate: m.endDate, label: m.label,
            }));
            await supabase.from('maintenance').insert(mtRows);
          }
          get().fetchData();
        } catch (e) {
          console.error('Migration failed:', e);
        }
      },

      fetchData: async () => {
        set({ dataLoading: true });
        try {
          const { data: pData, error: pErr } = await supabase.from('properties').select('*');
          if (pErr) throw pErr;
          if (pData?.length === 0) { await get().migrateData(); return; }
          if (pData) {
            set({
              properties: pData.map(p => ({
                id: p.id, name: p.name,
                baseGuests: p.base_guests, basePrice: p.base_price,
                weekendPrice: p.weekend_price, extraGuestFee: p.extra_guest_fee,
                noExtraGuestFee: p.no_extra_guest_fee, checkInTime: p.check_in_time,
                checkOutTime: p.check_out_time, cleaningFee: p.cleaning_fee,
              })),
            });
          }
          const { data: bData, error: bErr } = await supabase.from('bookings').select('*');
          if (bErr) throw bErr;
          if (bData) {
            set({
              bookings: bData.map(b => ({
                id: b.id, propertyId: b.property_id, guestName: b.guestname,
                checkIn: b.checkin, checkOut: b.checkout, bookingDate: b.bookingdate,
                guests: b.guests, infants: b.infants, nationality: b.nationality,
                channel: b.channel, status: b.status, amount: b.amount, commission: b.commission,
                externalId: b.external_id, isAutoSynced: b.is_auto_synced, rawIcalSummary: b.raw_ical_summary,
              })),
            });
          }
          const { data: mData, error: mErr } = await supabase.from('maintenance').select('*');
          if (mErr) throw mErr;
          if (mData) {
            set({
              maintenance: mData.map(m => ({
                id: m.id, propertyId: m.property_id,
                startDate: m.startdate, endDate: m.enddate, label: m.label,
              })),
            });
          }
          await get().fetchNotifications();
        } catch (err) {
          console.error('Fetch Error:', err);
          get().showToast('데이터를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.', 'error');
        } finally {
          set({ dataLoading: false });
        }
      },

      updateProperty: async (propId, pd) => {
        const prev = get().properties;
        set(state => ({ properties: state.properties.map(p => p.id === propId ? { ...p, ...pd } : p) }));
        const { error } = await supabase.from('properties').update({
          name: pd.name, base_guests: pd.baseGuests, base_price: pd.basePrice,
          weekend_price: pd.weekendPrice, extra_guest_fee: pd.extraGuestFee,
          no_extra_guest_fee: pd.noExtraGuestFee, check_in_time: pd.checkInTime,
          check_out_time: pd.checkOutTime, cleaning_fee: pd.cleaningFee,
        }).eq('id', propId);
        if (error) {
          set({ properties: prev });
          get().showToast('숙소 정보 저장에 실패했습니다.', 'error');
          throw error;
        }
      },

      addBooking: async (booking) => {
        const user = get().userProfile;
        const pId = get().properties[0]?.id;
        if (!user || !pId) return;
        const row = {
          host_id: user.id, property_id: pId,
          guestname: booking.guestName, checkin: booking.checkIn, checkout: booking.checkOut,
          bookingdate: booking.bookingDate ?? new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0],
          guests: booking.guests, infants: booking.infants, nationality: booking.nationality,
          channel: booking.channel, amount: booking.amount, commission: booking.commission, status: 'confirmed',
        };
        const { data, error } = await supabase.from('bookings').insert(row).select().single();
        if (error) {
          get().showToast('예약 저장에 실패했습니다. 다시 시도해주세요.', 'error');
          throw error;
        }
        set(state => ({
          bookings: [...state.bookings, { ...booking, id: data.id, propertyId: data.property_id, status: data.status as BookingStatus }],
        }));
      },

      updateBooking: async (id, patch) => {
        set(state => ({ bookings: state.bookings.map(b => b.id === id ? { ...b, ...patch } : b) }));
        const rowData: Record<string, unknown> = {};
        if (patch.guestName !== undefined) rowData.guestname = patch.guestName;
        if (patch.checkIn !== undefined) rowData.checkin = patch.checkIn;
        if (patch.checkOut !== undefined) rowData.checkout = patch.checkOut;
        if (patch.bookingDate !== undefined) rowData.bookingdate = patch.bookingDate;
        if (patch.guests !== undefined) rowData.guests = patch.guests;
        if (patch.infants !== undefined) rowData.infants = patch.infants;
        if (patch.nationality !== undefined) rowData.nationality = patch.nationality;
        if (patch.channel !== undefined) rowData.channel = patch.channel;
        if (patch.amount !== undefined) rowData.amount = patch.amount;
        if (patch.commission !== undefined) rowData.commission = patch.commission;
        if (patch.status !== undefined) rowData.status = patch.status;
        const { error } = await supabase.from('bookings').update(rowData).eq('id', id);
        if (error) {
          get().showToast('예약 수정에 실패했습니다. 다시 시도해주세요.', 'error');
          throw error;
        }
      },

      updateBookingStatus: async (id, status) => {
        set(state => ({ bookings: state.bookings.map(b => b.id === id ? { ...b, status } : b) }));
        const { error } = await supabase.from('bookings').update({ status }).eq('id', id);
        if (error) get().showToast('상태 변경에 실패했습니다.', 'error');
      },

      deleteBooking: async (id) => {
        set(state => ({ bookings: state.bookings.filter(b => b.id !== id) }));
        const { error } = await supabase.from('bookings').delete().eq('id', id);
        if (error) {
          get().showToast('예약 삭제에 실패했습니다.', 'error');
          throw error;
        }
      },

      addMaintenance: async (m) => {
        const user = get().userProfile;
        const pId = get().properties[0]?.id;
        if (!user || !pId) return;
        const { data, error } = await supabase.from('maintenance').insert({
          host_id: user.id, property_id: pId,
          startdate: m.startDate, enddate: m.endDate, label: m.label,
        }).select().single();
        if (error) {
          get().showToast('휴무 저장에 실패했습니다.', 'error');
          throw error;
        }
        set(state => ({ maintenance: [...state.maintenance, { ...m, id: data.id }] }));
      },

      updateMaintenance: async (id, patch) => {
        set(state => ({ maintenance: state.maintenance.map(m => m.id === id ? { ...m, ...patch } : m) }));
        const rowData: Record<string, unknown> = {};
        if (patch.startDate !== undefined) rowData.startdate = patch.startDate;
        if (patch.endDate !== undefined) rowData.enddate = patch.endDate;
        if (patch.label !== undefined) rowData.label = patch.label;
        const { error } = await supabase.from('maintenance').update(rowData).eq('id', id);
        if (error) {
          get().showToast('휴무 수정에 실패했습니다.', 'error');
          throw error;
        }
      },

      deleteMaintenance: async (id) => {
        set(state => ({ maintenance: state.maintenance.filter(m => m.id !== id) }));
        const { error } = await supabase.from('maintenance').delete().eq('id', id);
        if (error) {
          get().showToast('휴무 삭제에 실패했습니다.', 'error');
          throw error;
        }
      },

      selectedDate: null,
      selectedBookingId: null,
      selectedMaintDate: null,
      selectedMaintenanceId: null,

      openDayModal: (dateStr) => set({ selectedDate: dateStr, selectedBookingId: null, selectedMaintenanceId: null }),
      closeDayModal: () => set({ selectedDate: null }),
      openBookingModal: (id) => set({ selectedBookingId: id, selectedDate: null, selectedMaintenanceId: null }),
      closeBookingModal: () => set({ selectedBookingId: null }),
      openMaintModal: (dateStr) => set({ selectedMaintDate: dateStr, selectedDate: null }),
      openEditMaintModal: (id) => set({ selectedMaintenanceId: id, selectedDate: null }),
      closeMaintModal: () => set({ selectedMaintDate: null, selectedMaintenanceId: null }),

      settings: {
        notifications: true,
        language: 'ko',
        currency: 'KRW',
        profileName: 'Alex Johnson',
        profileRole: 'Room Manager',
        propertyName: '오조록',
      } as Settings,

      updateSettings: (patch) =>
        set(state => ({ settings: { ...state.settings, ...patch } })),

      // ── iCal Sync ──────────────────────────────────────────
      syncChannels: [],
      syncLoading: false,
      lastSyncResults: [],

      fetchSyncChannels: async () => {
        const user = get().userProfile;
        if (!user) return;
        const { data, error } = await supabase
          .from('sync_channels')
          .select('*')
          .eq('host_id', user.id)
          .order('created_at', { ascending: true });
        if (error) { console.error('fetchSyncChannels error:', error); return; }
        if (data) {
          set({
            syncChannels: data.map(r => ({
              id: r.id,
              hostId: r.host_id,
              propertyId: r.property_id,
              channel: r.channel,
              icalUrl: r.ical_url,
              isActive: r.is_active,
              lastSyncedAt: r.last_synced_at,
              createdAt: r.created_at,
            })),
          });
        }
      },

      saveSyncChannel: async (channel, icalUrl) => {
        const user = get().userProfile;
        const pId = get().properties[0]?.id;
        if (!user || !pId) return;

        if (!icalUrl.startsWith('http')) {
          throw new Error('올바른 URL 형식이 아닙니다.');
        }

        const { valid, error: validErr } = await validateICalUrl(icalUrl);

        const existing = get().syncChannels.find(c => c.channel === channel);
        if (existing) {
          const { error } = await supabase
            .from('sync_channels')
            .update({ ical_url: icalUrl, is_active: true })
            .eq('id', existing.id);
          if (error) throw new Error('채널 URL 업데이트에 실패했습니다.');
        } else {
          const { error } = await supabase.from('sync_channels').insert({
            host_id: user.id, property_id: pId, channel, ical_url: icalUrl, is_active: true,
          });
          if (error) throw new Error('채널 등록에 실패했습니다.');
        }
        await get().fetchSyncChannels();

        // 저장 직후 1회 자동 동기화 — "저장 = 즉시 달력 반영"
        get().triggerSync().catch(() => {});

        if (!valid) {
          throw new Error(
            `URL이 저장되었습니다. 단, 연결 확인에 실패했습니다: ${validErr ?? '알 수 없는 오류'} — "지금 동기화"로 실제 연결을 테스트하세요.`,
          );
        }
      },

      deleteSyncChannel: async (channelId) => {
        const prev = get().syncChannels;
        set(state => ({ syncChannels: state.syncChannels.filter(c => c.id !== channelId) }));
        const { error } = await supabase.from('sync_channels').delete().eq('id', channelId);
        if (error) {
          set({ syncChannels: prev });
          get().showToast('채널 연동 해제에 실패했습니다.', 'error');
          throw error;
        }
      },

      triggerSync: async () => {
        const user = get().userProfile;
        if (!user) return;
        set({ syncLoading: true, lastSyncResults: [] });
        try {
          const results = await syncAllChannels(user.id);
          set({
            lastSyncResults: results.map(r => ({
              channel: r.channel, added: r.added, updated: r.updated, error: r.error,
            })),
          });
          // 신규/변경 예약이 있으면 데이터 + 알림 모두 갱신
          if (results.some(r => r.added > 0 || r.updated > 0)) {
            await get().fetchData(); // fetchData 내부에서 fetchNotifications 호출됨
          }
          await get().fetchSyncChannels();
        } finally {
          set({ syncLoading: false });
        }
      },

      // ── 알림 (DB 기반 — 오프라인/멀티 기기 대응) ─────────────
      syncNotifications: [],
      unreadCount: 0,

      fetchNotifications: async () => {
        const user = get().userProfile;
        if (!user) return;
        const { data, error } = await supabase
          .from('sync_notifications')
          .select('*')
          .eq('host_id', user.id)
          .eq('is_read', false)
          .order('created_at', { ascending: false })
          .limit(50);
        if (error) { console.error('fetchNotifications error:', error); return; }
        if (data) {
          const notifs: SyncNotification[] = data.map(r => ({
            id: r.id,
            hostId: r.host_id,
            bookingId: r.booking_id,
            guestName: r.guest_name,
            checkIn: r.check_in,
            checkOut: r.check_out,
            channel: r.channel,
            missingFields: r.missing_fields ?? [],
            isRead: r.is_read,
            createdAt: r.created_at,
          }));
          set({ syncNotifications: notifs, unreadCount: notifs.length });
        }
      },

      markNotificationRead: async (notificationId) => {
        const { error } = await supabase
          .from('sync_notifications')
          .update({ is_read: true })
          .eq('id', notificationId);
        if (error) { console.error('markNotificationRead error:', error); return; }
        set(state => {
          const updated = state.syncNotifications.filter(n => n.id !== notificationId);
          return { syncNotifications: updated, unreadCount: updated.length };
        });
      },

      markAllNotificationsRead: async () => {
        const user = get().userProfile;
        if (!user) return;
        const { error } = await supabase
          .from('sync_notifications')
          .update({ is_read: true })
          .eq('host_id', user.id)
          .eq('is_read', false);
        if (error) { console.error('markAllNotificationsRead error:', error); return; }
        set({ syncNotifications: [], unreadCount: 0 });
      },
    }),
    {
      name: 'booking-calendar-storage',
      version: 10,
    },
  ),
);
