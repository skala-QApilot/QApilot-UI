import { api } from './client';

export interface Notification {
  notificationId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  readAt?: string | null;
}

export async function listNotifications(
  serviceId: string,
  options: { isRead?: boolean } = {},
): Promise<{ notifications: Notification[]; unreadCount: number }> {
  const params = new URLSearchParams({ service_id: serviceId });
  if (options.isRead !== undefined) params.set('is_read', String(options.isRead));
  const res = await api.get<{ notifications: Notification[]; unread_count: number; count: number }>(
    `/api/notifications?${params.toString()}`,
  );
  return {
    notifications: res.data.notifications,
    unreadCount: res.data.unread_count,
  };
}

export async function markRead(notificationId: string, isRead: boolean): Promise<Notification> {
  const res = await api.patch<{ notification: Notification }>(
    `/api/notifications/${encodeURIComponent(notificationId)}`,
    { is_read: isRead },
  );
  return res.data.notification;
}
