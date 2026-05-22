import { create } from 'zustand';
import * as notificationsApi from '../api/notifications';

export interface UiNotification {
  id: string;
  message: string;
  time: string;
  read: boolean;
}

interface NotificationState {
  notifications: notificationsApi.Notification[];
  unreadCount: number;

  loadNotifications: (serviceId: string) => Promise<void>;
  markRead: (notificationId: string, isRead: boolean) => Promise<void>;
  reset: () => void;

  getUiNotifications: () => UiNotification[];
}

function toUiNotification(n: notificationsApi.Notification): UiNotification {
  return {
    id: n.notificationId,
    message: n.message || n.title,
    time: formatRelativeTime(n.createdAt),
    read: n.isRead,
  };
}

function formatRelativeTime(iso?: string): string {
  if (!iso) return '';
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return iso;
  const diff = Date.now() - t;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return '방금 전';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  return `${day}일 전`;
}

export const useNotificationStore = create<NotificationState>()((set, get) => ({
  notifications: [],
  unreadCount: 0,

  loadNotifications: async (serviceId) => {
    const { notifications, unreadCount } = await notificationsApi.listNotifications(serviceId);
    set({ notifications, unreadCount });
  },

  markRead: async (notificationId, isRead) => {
    const updated = await notificationsApi.markRead(notificationId, isRead);
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.notificationId === notificationId ? updated : n,
      ),
      unreadCount: state.notifications.filter((n) =>
        n.notificationId === notificationId ? !updated.isRead : !n.isRead,
      ).length,
    }));
  },

  reset: () => set({ notifications: [], unreadCount: 0 }),

  getUiNotifications: () => get().notifications.map(toUiNotification),
}));
