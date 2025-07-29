"use client"

import { useState, useEffect } from "react"
import { useNotifications } from "@/contexts/NotificationContext"
import { useAuth } from "@/contexts/AuthProvider"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatDistanceToNow } from "date-fns"
import { Trash2, CheckCircle, Bell, BellOff } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { ClientRedirect } from "@/components/ClientRedirect"

export function NotificationsContent() {
  const { user, isAuthenticated, loading: userLoading } = useAuth()
  const {
    notifications,
    notificationCount,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
  } = useNotifications()
  const [activeTab, setActiveTab] = useState("unread")

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications(activeTab === "all")
    }
  }, [isAuthenticated, activeTab, fetchNotifications])

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    fetchNotifications(value === "all")
  }

  // Redirect if not authenticated
  if (!userLoading && !isAuthenticated) {
    return <ClientRedirect to="/auth?redirect=/notifications" />
  }

  return (
    <div className="container max-w-4xl py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={markAllAsRead} disabled={notificationCount.unread === 0}>
            <CheckCircle className="mr-2 h-4 w-4" />
            Mark all as read
          </Button>
          <Button variant="outline" size="sm" onClick={deleteAllNotifications} disabled={notificationCount.total === 0}>
            <Trash2 className="mr-2 h-4 w-4" />
            Clear all
          </Button>
        </div>
      </div>

      <Tabs defaultValue="unread" value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="mb-4">
          <TabsTrigger value="unread">
            <Bell className="mr-2 h-4 w-4" />
            Unread ({notificationCount.unread})
          </TabsTrigger>
          <TabsTrigger value="all">
            <BellOff className="mr-2 h-4 w-4" />
            All ({notificationCount.total})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="unread">
          {loading ? (
            <NotificationsLoading />
          ) : notifications.filter((n) => !n.is_read).length === 0 ? (
            <EmptyNotifications message="You have no unread notifications" />
          ) : (
            <div className="space-y-4">
              {notifications
                .filter((n) => !n.is_read)
                .map((notification) => (
                  <NotificationCard
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={() => markAsRead(notification.id)}
                    onDelete={() => deleteNotification(notification.id)}
                  />
                ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="all">
          {loading ? (
            <NotificationsLoading />
          ) : notifications.length === 0 ? (
            <EmptyNotifications message="You have no notifications" />
          ) : (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <NotificationCard
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={() => markAsRead(notification.id)}
                  onDelete={() => deleteNotification(notification.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function NotificationCard({ notification, onMarkAsRead, onDelete }: any) {
  const timeAgo = formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })

  return (
    <div
      className={`border rounded-lg p-4 shadow-sm ${!notification.is_read ? "bg-blue-50 border-blue-100" : "bg-white"}`}
    >
      <div className="flex items-start gap-4">
        {notification.metadata?.sender_avatar ? (
          <Image
            src={notification.metadata.sender_avatar || "/placeholder.svg"}
            alt={notification.metadata.sender_name || "User"}
            width={40}
            height={40}
            className="h-10 w-10 rounded-full"
          />
        ) : (
          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
            <span className="text-sm font-medium">
              {notification.metadata?.sender_name?.substring(0, 2).toUpperCase() || "U"}
            </span>
          </div>
        )}

        <div className="flex-1">
          <h3 className="font-medium">{notification.title}</h3>
          <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-500">{timeAgo}</span>
            <div className="flex gap-2">
              {!notification.is_read && (
                <Button variant="ghost" size="sm" onClick={onMarkAsRead}>
                  <CheckCircle className="h-4 w-4" />
                  <span className="sr-only">Mark as read</span>
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={onDelete}>
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Delete</span>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href={notification.link}>View</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function NotificationsLoading() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="border rounded-lg p-4 shadow-sm animate-pulse">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-full bg-gray-200" />
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyNotifications({ message }: { message: string }) {
  return (
    <div className="text-center py-12 border rounded-lg">
      <Bell className="mx-auto h-12 w-12 text-gray-300 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-1">No notifications</h3>
      <p className="text-gray-500">{message}</p>
    </div>
  )
}
