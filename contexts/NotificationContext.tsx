import logger from "@/utils/logger";
"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { useUser } from "@/contexts/UserContext"
import * as NotificationService from "@/services/notification-service"
import type { Notification, NotificationCount } from "@/lib/notification-schema"
import { useToast } from "@/hooks/use-toast"

interface NotificationContextType {
  notifications: Notification[]
  notificationCount: NotificationCount
  loading: boolean
  fetchNotifications: (includeRead?: boolean) => Promise<void>
  markAsRead: (notificationId: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  deleteNotification: (notificationId: string) => Promise<void>
  deleteAllNotifications: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useUser()
  const { toast } = useToast()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [notificationCount, setNotificationCount] = useState<NotificationCount>({ total: 0, unread: 0 })
  const [loading, setLoading] = useState(false)

  const fetchNotifications = useCallback(
    async (includeRead = false) => {
      if (!user) return

      setLoading(true)
      try {
        const result = await NotificationService.getNotifications(user.id, 20, 0, includeRead)
        setNotifications(result.notifications)
        setNotificationCount(result.count)
      } catch (error) {
        logger.error("Error fetching notifications:", error)
      } finally {
        setLoading(false)
      }
    },
    [user],
  )

  const markAsRead = async (notificationId: string) => {
    try {
      const success = await NotificationService.markNotificationAsRead(notificationId)
      if (success) {
        // Update local state
        setNotifications((prev) =>
          prev.map((notification) =>
            notification.id === notificationId ? { ...notification, is_read: true } : notification,
          ),
        )
        setNotificationCount((prev) => ({
          ...prev,
          unread: Math.max(0, prev.unread - 1),
        }))
      }
    } catch (error) {
      logger.error("Error marking notification as read:", error)
    }
  }

  const markAllAsRead = async () => {
    if (!user) return

    try {
      const success = await NotificationService.markAllNotificationsAsRead(user.id)
      if (success) {
        // Update local state
        setNotifications((prev) => prev.map((notification) => ({ ...notification, is_read: true })))
        setNotificationCount((prev) => ({
          ...prev,
          unread: 0,
        }))
        toast({
          title: "Notifications marked as read",
          description: "All notifications have been marked as read",
        })
      }
    } catch (error) {
      logger.error("Error marking all notifications as read:", error)
      toast({
        title: "Error",
        description: "Failed to mark notifications as read",
        variant: "destructive",
      })
    }
  }

  const deleteNotification = async (notificationId: string) => {
    try {
      const success = await NotificationService.deleteNotification(notificationId)
      if (success) {
        // Update local state
        const deletedNotification = notifications.find((n) => n.id === notificationId)
        setNotifications((prev) => prev.filter((notification) => notification.id !== notificationId))
        setNotificationCount((prev) => ({
          total: Math.max(0, prev.total - 1),
          unread: deletedNotification && !deletedNotification.is_read ? Math.max(0, prev.unread - 1) : prev.unread,
        }))
      }
    } catch (error) {
      logger.error("Error deleting notification:", error)
    }
  }

  const deleteAllNotifications = async () => {
    if (!user) return

    try {
      const success = await NotificationService.deleteAllNotifications(user.id)
      if (success) {
        // Update local state
        setNotifications([])
        setNotificationCount({ total: 0, unread: 0 })
        toast({
          title: "Notifications cleared",
          description: "All notifications have been deleted",
        })
      }
    } catch (error) {
      logger.error("Error deleting all notifications:", error)
      toast({
        title: "Error",
        description: "Failed to delete notifications",
        variant: "destructive",
      })
    }
  }

  // Subscribe to real-time notifications
  useEffect(() => {
    if (!user) return

    const subscription = NotificationService.subscribeToNotifications(user.id, (newNotification) => {
      // Add the new notification to the list
      setNotifications((prev) => [newNotification, ...prev])

      // Update counts
      setNotificationCount((prev) => ({
        total: prev.total + 1,
        unread: prev.unread + 1,
      }))

      // Show a toast notification
      toast({
        title: newNotification.title,
        description: newNotification.message,
        action: (
          <a
            href={newNotification.link}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-8 items-center justify-center rounded-md px-3 text-xs font-medium"
            onClick={() => markAsRead(newNotification.id)}
          >
            View
          </a>
        ),
      })
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [user, toast])

  // Initial fetch
  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications()
    } else {
      // Reset state when logged out
      setNotifications([])
      setNotificationCount({ total: 0, unread: 0 })
    }
  }, [isAuthenticated, fetchNotifications])

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        notificationCount,
        loading,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        deleteAllNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider")
  }
  return context
}
