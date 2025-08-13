import type { Notification, NotificationType, NotificationCount } from '@/lib/notification-schema';
import { supabase } from '@/lib/supabase';
import {
  fetchPaginated,
  insertRecords,
  updateRecord,
  deleteRecord,
  countRecords,
  clearQueryCache,
} from '@/utils/supabase-query-utils';

// Cache TTLs
const NOTIFICATION_CACHE_TTL = 60 * 1000; // 1 minute for notifications

/**
 * Create a new notification
 */
export async function createNotification({
  userId,
  type,
  title,
  message,
  link,
}: {
  userId: string;
  type: NotificationType;
  title: string;
  message?: string;
  link?: string;
}): Promise<Notification | null> {
  try {
    const notifications = await insertRecords<Notification>(
      'notifications',
      {
        user_id: userId,
        type,
        title,
        message,
        link,
        read: false,
      },
      {
        clearCache: new RegExp(`^notifications:.*${userId}`),
      },
    );

    return notifications[0] || null;
  } catch (error) {
    console.error('Error in createNotification:', error);
    return null;
  }
}

/**
 * Create a comment reply notification
 */
export async function createCommentReplyNotification({
  recipientId,
  senderId,
  senderName,
  senderAvatar,
  postId,
  postTitle,
  commentId,
  commentContent,
}: {
  recipientId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  postId: string;
  postTitle: string;
  commentId: string;
  commentContent: string;
}): Promise<Notification | null> {
  // Don't notify yourself
  if (recipientId === senderId) {
    return null;
  }

  const title = 'New Reply';
  const message = `${senderName} replied to your comment: "${commentContent.substring(0, 50)}${
    commentContent.length > 50 ? '...' : ''
  }"`;
  const link = `/post/${postId}?comment=${commentId}`;

  return createNotification({
    userId: recipientId,
    type: 'comment_reply',
    title,
    message,
    link,
  });
}

/**
 * Get notifications for a user
 */
export async function getNotifications(
  userId: string,
  limit = 10,
  offset = 0,
  includeRead = false,
): Promise<{ notifications: Notification[]; count: NotificationCount }> {
  try {
    // Use our optimized pagination function
    const filters = (query: any) => {
      let q = query.eq('user_id', userId);
      if (!includeRead) {
        q = q.eq('read', false);
      }
      return q;
    };

    const result = await fetchPaginated<Notification>('notifications', {
      page: Math.floor(offset / limit) + 1,
      pageSize: limit,
      orderBy: 'created_at',
      ascending: false,
      filters,
      ttl: NOTIFICATION_CACHE_TTL,
    });

    // Get counts
    const totalCount = await countRecords('notifications', (query) => query.eq('user_id', userId), {
      ttl: NOTIFICATION_CACHE_TTL,
    });

    const unreadCount = await countRecords(
      'notifications',
      (query) => query.eq('user_id', userId).eq('read', false),
      { ttl: NOTIFICATION_CACHE_TTL },
    );

    return {
      notifications: result.data,
      count: {
        total: totalCount,
        unread: unreadCount,
      },
    };
  } catch (error) {
    console.error('Error in getNotifications:', error);
    return { notifications: [], count: { total: 0, unread: 0 } };
  }
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  try {
    // Get the notification first to get its user_id for cache invalidation
    const { data: notification } = await supabase
      .from('notifications')
      .select('user_id, id')
      .eq('id', notificationId as any)
      .single<{ user_id: string; id: string }>();

    if (!notification) {
      return false;
    }

    const updated = await updateRecord<Notification>(
      'notifications',
      notificationId,
      { read: true },
      {
        clearCache: new RegExp(`^notifications:.*${notification.user_id}`),
      },
    );

    return !!updated;
  } catch (error) {
    console.error('Error in markNotificationAsRead:', error);
    return false;
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true } as any)
      .eq('user_id', userId as any)
      .eq('read', false as any);

    if (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }

    // Clear all notification cache for this user
    clearQueryCache(undefined, new RegExp(`^notifications:.*${userId}`));

    return true;
  } catch (error) {
    console.error('Error in markAllNotificationsAsRead:', error);
    return false;
  }
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string): Promise<boolean> {
  try {
    // Get the notification first to get its user_id for cache invalidation
    const { data: notification } = await supabase
      .from('notifications')
      .select('user_id, id')
      .eq('id', notificationId as any)
      .single<{ user_id: string; id: string }>();

    if (!notification) {
      return false;
    }

    return await deleteRecord('notifications', notificationId, {
      clearCache: new RegExp(`^notifications:.*${notification.user_id}`),
    });
  } catch (error) {
    console.error('Error in deleteNotification:', error);
    return false;
  }
}

/**
 * Delete all notifications for a user
 */
export async function deleteAllNotifications(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId as any);

    if (error) {
      console.error('Error deleting all notifications:', error);
      return false;
    }

    // Clear all notification cache for this user
    clearQueryCache(undefined, new RegExp(`^notifications:.*${userId}`));

    return true;
  } catch (error) {
    console.error('Error in deleteAllNotifications:', error);
    return false;
  }
}

/**
 * Subscribe to notifications for a user
 */
export function subscribeToNotifications(
  userId: string,
  callback: (notification: Notification) => void,
) {
  return supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        // Clear notification cache when a new notification arrives
        clearQueryCache(undefined, new RegExp(`^notifications:.*${userId}`));
        callback(payload.new as Notification);
      },
    )
    .subscribe();
}

/**
 * Get notification count for a user
 */
export async function getNotificationCount(userId: string): Promise<NotificationCount> {
  try {
    const totalCount = await countRecords('notifications', (query) => query.eq('user_id', userId), {
      ttl: NOTIFICATION_CACHE_TTL,
    });

    const unreadCount = await countRecords(
      'notifications',
      (query) => query.eq('user_id', userId).eq('read', false),
      { ttl: NOTIFICATION_CACHE_TTL },
    );

    return {
      total: totalCount,
      unread: unreadCount,
    };
  } catch (error) {
    console.error('Error in getNotificationCount:', error);
    return { total: 0, unread: 0 };
  }
}

/**
 * Clear notification cache for a user
 */
export function clearNotificationCache(userId?: string): void {
  if (userId) {
    clearQueryCache(undefined, new RegExp(`^notifications:.*${userId}`));
  } else {
    clearQueryCache(undefined, /^notifications:/);
  }
}
