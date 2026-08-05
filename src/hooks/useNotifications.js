import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getRecentNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  subscribeRecentNotifications,
  subscribeUnreadCount,
} from '@/services/notifications/notificationsService'
import { createRealtimeQuery } from '@/lib/firestoreRealtime'

const QUERY_KEY = 'notifications'

/**
 * Fetch the 50 most recent notifications with realtime updates.
 * New notifications appear instantly without any polling delay.
 */
export function useNotifications() {
  return useQuery({
    queryKey: [QUERY_KEY, 'recent'],
    queryFn: createRealtimeQuery((onNext, onError) =>
      subscribeRecentNotifications(50, onNext, onError)
    ),
    refetchOnMount: 'always',
  })
}

/**
 * Subscribe to the unread notification count in real time.
 * The badge updates instantly when a notification is created or marked as read.
 */
export function useUnreadCount() {
  return useQuery({
    queryKey: [QUERY_KEY, 'unreadCount'],
    queryFn: createRealtimeQuery(subscribeUnreadCount),
    refetchOnMount: 'always',
  })
}

export function useMarkAsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => markAsRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}

export function useMarkAllAsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: markAllAsRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}
