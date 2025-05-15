import { supabase } from "@/lib/supabase"
import type { Notification, NotificationType, NotificationCount } from "@/lib/notification-schema"

/**
 * Create a new notification
 */
export async function createNotification({
  userId,
  type,
  title,
  message,
  link,
  metadata,
}: {
  userId: string
  type: NotificationType
  title: string
  message: string
  link: string
  metadata?: Record<string, any>
}): Promise<Notification | null> {
  try {
    const { data, error } = await supabase
      .from("notifications")
      .insert({
        user_id: userId,
        type,
        title,
        message,
        link,
        is_read: false,
        metadata,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating notification:", error)
      return null
    }

    return data
  } catch (error) {
    console.error("Error in createNotification:", error)
    return null
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
  recipientId: string
  senderId: string
  senderName: string
  senderAvatar?: string
  postId: string
  postTitle: string
  commentId: string
  commentContent: string
}): Promise<Notification | null> {
  // Don't notify yourself
  if (recipientId === senderId) {
    return null
  }

  const title = "New Reply"
  const message = `${senderName} replied to your comment: "${commentContent.substring(0, 50)}${
    commentContent.length > 50 ? "..." : ""
  }"`
  const link = `/post/${postId}?comment=${commentId}`

  return createNotification({
    userId: recipientId,
    type: "comment_reply",
    title,
    message,
    link,
    metadata: {
      comment_id: commentId,
      post_id: postId,
      post_title: postTitle,
      sender_id: senderId,
      sender_name: senderName,
      sender_avatar: senderAvatar,
    },
  })
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
    // Get notifications
    let query = supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    // Filter by read status if needed
    if (!includeRead) {
      query = query.eq("is_read", false)
    }

    const { data: notifications, error } = await query

    if (error) {
      console.error("Error fetching notifications:", error)
      return { notifications: [], count: { total: 0, unread: 0 } }
    }

    // Get counts
    const { count: totalCount, error: totalError } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)

    const { count: unreadCount, error: unreadError } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false)

    if (totalError || unreadError) {
      console.error("Error counting notifications:", totalError || unreadError)
    }

    return {
      notifications: notifications || [],
      count: {
        total: totalCount || 0,
        unread: unreadCount || 0,
      },
    }
  } catch (error) {
    console.error("Error in getNotifications:", error)
    return { notifications: [], count: { total: 0, unread: 0 } }
  }
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", notificationId)

    if (error) {
      console.error("Error marking notification as read:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Error in markNotificationAsRead:", error)
    return false
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false)

    if (error) {
      console.error("Error marking all notifications as read:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Error in markAllNotificationsAsRead:", error)
    return false
  }
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from("notifications").delete().eq("id", notificationId)

    if (error) {
      console.error("Error deleting notification:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Error in deleteNotification:", error)
    return false
  }
}

/**
 * Delete all notifications for a user
 */
export async function deleteAllNotifications(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from("notifications").delete().eq("user_id", userId)

    if (error) {
      console.error("Error deleting all notifications:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Error in deleteAllNotifications:", error)
    return false
  }
}

/**
 * Subscribe to notifications for a user
 */
export function subscribeToNotifications(userId: string, callback: (notification: Notification) => void) {
  return supabase
    .channel(`notifications:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        callback(payload.new as Notification)
      },
    )
    .subscribe()
}
