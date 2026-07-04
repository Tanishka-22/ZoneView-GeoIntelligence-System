import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '../api/notifications.api';

export function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.getAll,
  });

  const markReadMutation = useMutation({
    mutationFn: notificationsApi.markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const unreadCount = notifications?.filter((n: any) => !n.isRead).length ?? 0;

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
        {unreadCount > 0 && (
          <p className="text-gray-500 mt-1">{unreadCount} unread</p>
        )}
      </div>

      {isLoading && (
        <p className="text-sm text-gray-400">Loading notifications...</p>
      )}

      {!isLoading && (!notifications || notifications.length === 0) && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-sm">No notifications yet.</p>
          <p className="text-xs mt-1">
            You'll be notified when reports are ready and when new insights are available.
          </p>
        </div>
      )}

      <div className="space-y-2">
        {notifications?.map((notification: any) => (
          <div
            key={notification.id}
            className={`flex items-start gap-4 p-4 rounded-xl border transition-colors ${
              notification.isRead
                ? 'bg-white border-gray-200'
                : 'bg-blue-50 border-blue-200'
            }`}
          >
            <div
              className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                notification.isRead ? 'bg-gray-300' : 'bg-blue-500'
              }`}
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900">
                {notification.title}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {notification.message}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {new Date(notification.createdAt).toLocaleString('en-IN')}
              </p>
            </div>
            {!notification.isRead && (
              <button
                onClick={() => markReadMutation.mutate(notification.id)}
                className="shrink-0 text-xs text-blue-600 hover:underline"
              >
                Mark read
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}