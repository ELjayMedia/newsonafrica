'use client';

import { LocalNotifications } from '@capacitor/local-notifications';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

export function NotificationFeature() {
  const [title, setTitle] = useState('News On Africa Update');
  const [body, setBody] = useState('Check out the latest news!');
  const [scheduleTime, setScheduleTime] = useState(5); // seconds
  const { toast } = useToast();

  const scheduleNotification = async () => {
    try {
      const hasPermission = await LocalNotifications.requestPermissions();
      if (hasPermission.display !== 'granted') {
        toast({
          title: 'Permission Denied',
          description: 'Notification permission not granted.',
          variant: 'destructive',
        });
        return;
      }

      const notificationId = Math.floor(Math.random() * 10000) + 1;

      await LocalNotifications.schedule({
        notifications: [
          {
            title: title,
            body: body,
            id: notificationId,
            schedule: { at: new Date(Date.now() + scheduleTime * 1000) },
            sound: 'beep.wav', // Ensure this file exists in your native project assets
            attachments: [],
            actionTypeId: '',
            extra: null,
          },
        ],
      });

      toast({
        title: 'Notification Scheduled',
        description: `Notification "${title}" scheduled for ${scheduleTime} seconds from now.`,
      });
    } catch (e: any) {
      console.error('Notification error:', e);
      toast({
        title: 'Notification Error',
        description: `Failed to schedule notification: ${e.message || 'Unknown error'}`,
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Local Notifications</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div>
          <label
            htmlFor="notification-title"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Title
          </label>
          <Input
            id="notification-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Notification Title"
          />
        </div>
        <div>
          <label
            htmlFor="notification-body"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Body
          </label>
          <Textarea
            id="notification-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Notification Body"
          />
        </div>
        <div>
          <label htmlFor="schedule-time" className="block text-sm font-medium text-gray-700 mb-1">
            Schedule in (seconds)
          </label>
          <Input
            id="schedule-time"
            type="number"
            value={scheduleTime}
            onChange={(e) => setScheduleTime(Number(e.target.value))}
            min="1"
          />
        </div>
        <Button onClick={scheduleNotification}>Schedule Notification</Button>
        <p className="text-xs text-gray-500">
          Note: This feature requires native device notification permissions.
        </p>
      </CardContent>
    </Card>
  );
}
