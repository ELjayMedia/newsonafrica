'use client';

import { formatDistanceToNow } from 'date-fns';
import { Bell } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuFooter,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNotifications } from '@/contexts/NotificationContext';


export function NotificationBell() {
  const {
    notifications,
    notificationCount,
    markAsRead,
    markAllAsRead,
    deleteAllNotifications,
    fetchNotifications,
  } = useNotifications();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('unread');

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      // Fetch notifications when opening the dropdown
      fetchNotifications(activeTab === 'all');
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    fetchNotifications(value === 'all');
  };

  const handleNotificationClick = (notificationId: string) => {
    markAsRead(notificationId);
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {notificationCount.unread > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {notificationCount.unread > 9 ? '9+' : notificationCount.unread}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between p-4">
          <h3 className="font-medium">Notifications</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={markAllAsRead}
            disabled={notificationCount.unread === 0}
          >
            Mark all as read
          </Button>
        </div>
        <DropdownMenuSeparator />
        <Tabs defaultValue="unread" value={activeTab} onValueChange={handleTabChange}>
          <div className="px-4 pt-2">
            <TabsList className="w-full">
              <TabsTrigger value="unread" className="flex-1">
                Unread ({notificationCount.unread})
              </TabsTrigger>
              <TabsTrigger value="all" className="flex-1">
                All ({notificationCount.total})
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="unread" className="mt-0">
            <ScrollArea className="h-[300px]">
              {notifications.filter((n) => !n.read).length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">No unread notifications</div>
              ) : (
                notifications
                  .filter((n) => !n.read)
                  .map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onClick={() => handleNotificationClick(notification.id)}
                    />
                  ))
              )}
            </ScrollArea>
          </TabsContent>
          <TabsContent value="all" className="mt-0">
            <ScrollArea className="h-[300px]">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">No notifications</div>
              ) : (
                notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onClick={() => handleNotificationClick(notification.id)}
                  />
                ))
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
        <DropdownMenuSeparator />
        <DropdownMenuFooter className="flex justify-between p-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/notifications">View all</Link>
          </Button>
          <Button variant="ghost" size="sm" onClick={deleteAllNotifications}>
            Clear all
          </Button>
        </DropdownMenuFooter>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface NotificationItemProps {
  notification: any;
  onClick: () => void;
}

function NotificationItem({ notification, onClick }: NotificationItemProps) {
  const timeAgo = formatDistanceToNow(new Date(notification.created_at), { addSuffix: true });

  return (
    <DropdownMenuItem asChild className="cursor-pointer p-0">
      <Link
        href={notification.link || '#'}
        className={`block w-full p-4 hover:bg-gray-50 ${!notification.read ? 'bg-blue-50' : ''}`}
        onClick={onClick}
      >
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
            <span className="text-xs font-medium">
              {notification.title.substring(0, 2).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{notification.title}</p>
            <p className="text-xs text-gray-500 mt-1">{notification.message}</p>
            <p className="text-xs text-gray-400 mt-1">{timeAgo}</p>
          </div>
        </div>
      </Link>
    </DropdownMenuItem>
  );
}
