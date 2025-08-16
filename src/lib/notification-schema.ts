export type NotificationType = "comment_reply" | "comment_reaction" | "mention" | "system"

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  message: string
  link: string
  is_read: boolean
  created_at: string
  metadata?: {
    comment_id?: string
    post_id?: string
    post_title?: string
    sender_id?: string
    sender_name?: string
    sender_avatar?: string
  }
}

export interface NotificationCount {
  total: number
  unread: number
}
