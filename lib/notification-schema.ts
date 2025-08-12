export type NotificationType = "comment_reply" | "comment_reaction" | "mention" | "system"

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  message?: string
  link?: string
  read: boolean
  created_at: string
}

export interface NotificationCount {
  total: number
  unread: number
}
