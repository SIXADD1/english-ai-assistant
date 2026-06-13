import api from './api'

export interface Notification {
  id: string
  notificationId: string
  title: string
  content: string
  type: string
  priority: string
  isRead: boolean
  isDeleted: boolean
  readAt: string
  createdAt: string
  notificationCreatedAt: string
}

export interface NotificationListResponse {
  notifications: Notification[]
  unreadCount: number
  total: number
}

export const notificationService = {
  // 获取通知列表
  async getNotifications(params?: {
    page?: number
    pageSize?: number
    type?: string
    unreadOnly?: boolean
  }): Promise<NotificationListResponse> {
    const response = await api.get('/notifications', { params })
    return response.data
  },

  // 获取未读数量
  async getUnreadCount(): Promise<number> {
    const response = await api.get('/notifications/unread-count')
    return response.data.unreadCount
  },

  // 标记通知为已读
  async markAsRead(id: string): Promise<void> {
    await api.put(`/notifications/${id}/read`)
  },

  // 全部标记为已读
  async markAllAsRead(): Promise<void> {
    await api.put('/notifications/read-all')
  },

  // 删除通知
  async deleteNotification(id: string): Promise<void> {
    await api.delete(`/notifications/${id}`)
  },

  // 删除所有已读通知
  async deleteReadNotifications(): Promise<void> {
    await api.delete('/notifications/read')
  },

  // 管理员：获取所有通知
  async getAdminNotifications(params?: {
    page?: number
    pageSize?: number
    type?: string
  }): Promise<{ notifications: any[]; total: number }> {
    const response = await api.get('/admin/notifications', { params })
    return response.data
  },

  // 管理员：创建通知
  async createNotification(data: {
    title: string
    content: string
    type?: string
    priority?: string
    targetUsers: 'all' | 'active' | string[]
  }): Promise<{ success: boolean; recipientCount: number }> {
    const response = await api.post('/admin/notifications', data)
    return response.data
  },

  // 管理员：删除通知
  async deleteAdminNotification(id: string): Promise<void> {
    await api.delete(`/admin/notifications/${id}`)
  },

  // 管理员：获取欢迎通知
  async getWelcomeNotification(): Promise<{ id: string; title: string; content: string; type: string }> {
    const response = await api.get('/admin/notifications/welcome')
    return response.data
  },

  // 管理员：修改欢迎通知
  async updateWelcomeNotification(data: { title: string; content: string }): Promise<{ id: string; title: string; content: string }> {
    const response = await api.put('/admin/notifications/welcome', data)
    return response.data
  },
}
