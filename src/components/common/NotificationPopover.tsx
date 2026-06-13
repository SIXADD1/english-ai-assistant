import React, { useState, useEffect } from 'react'
import { Badge, Popover, List, Button, Empty, Spin, Modal } from 'antd'
import { BellOutlined, DeleteOutlined, GiftOutlined, SyncOutlined } from '@ant-design/icons'
import { notificationService, Notification } from '../../services/notificationService'
import { message } from 'antd'

interface NotificationPopoverProps {
  onNotificationRead?: () => void
}

const NotificationPopover: React.FC<NotificationPopoverProps> = () => {
  const [visible, setVisible] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [currentNotification, setCurrentNotification] = useState<Notification | null>(null)

  // 获取未读数量
  const fetchUnreadCount = async () => {
    try {
      const count = await notificationService.getUnreadCount()
      setUnreadCount(count)
    } catch (error) {
      console.error('获取未读数量失败', error)
    }
  }

  // 获取通知列表
  const fetchNotifications = async () => {
    setLoading(true)
    try {
      const data = await notificationService.getNotifications({ pageSize: 50 })
      setNotifications(data.notifications)
      setUnreadCount(data.unreadCount)
    } catch (error) {
      message.error('获取通知列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUnreadCount()
    // 每30秒刷新一次未读数量
    const interval = setInterval(fetchUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleVisibleChange = (newVisible: boolean) => {
    setVisible(newVisible)
    if (newVisible) {
      fetchNotifications()
    }
  }

  // 标记单个通知为已读
  const handleMarkAsRead = async (notification: Notification) => {
    try {
      await notificationService.markAsRead(notification.id)
      setNotifications(prev =>
        prev.map(n =>
          n.id === notification.id ? { ...n, isRead: true } : n
        )
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      message.error('操作失败')
    }
  }

  // 全部标记为已读
  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead()
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
      setUnreadCount(0)
      message.success('已全部标为已读')
    } catch (error) {
      message.error('操作失败')
    }
  }

  // 删除已读通知
  const handleDeleteRead = async () => {
    try {
      await notificationService.deleteReadNotifications()
      setNotifications(prev => prev.filter(n => !n.isRead))
      message.success('已删除已读通知')
    } catch (error) {
      message.error('操作失败')
    }
  }

  // 删除单个通知
  const handleDeleteNotification = async (notification: Notification) => {
    try {
      await notificationService.deleteNotification(notification.id)
      setNotifications(prev => prev.filter(n => n.id !== notification.id))
      if (!notification.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      message.error('删除失败')
    }
  }

  // 点击通知查看详情
  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await handleMarkAsRead(notification)
    }
    setCurrentNotification(notification)
    setDetailModalVisible(true)
  }

  // 获取通知图标
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'system':
        return <BellOutlined style={{ color: '#faad14' }} />
      case 'activity':
        return <GiftOutlined style={{ color: '#faad14' }} />
      case 'update':
        return <SyncOutlined style={{ color: '#722ed1' }} />
      default:
        return <BellOutlined style={{ color: '#faad14' }} />
    }
  }

  // 格式化时间
  const formatTime = (time: string) => {
    const date = new Date(time)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes}分钟前`
    if (hours < 24) return `${hours}小时前`
    if (days < 7) return `${days}天前`
    return date.toLocaleDateString('zh-CN')
  }

  // 获取类型文本
  const getTypeText = (type: string) => {
    const typeMap: Record<string, string> = {
      system: '系统通知',
      activity: '活动',
      update: '更新',
    }
    return typeMap[type] || type
  }

  const notificationContent = (
    <div className="notification-popover">
      <div className="notification-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontWeight: 'bold', fontSize: 16 }}>通知中心</span>
        <div className="notification-actions">
          {unreadCount > 0 && (
            <Button type="link" size="small" onClick={handleMarkAllAsRead}>
              全部已读
            </Button>
          )}
          <Button type="link" size="small" onClick={handleDeleteRead} danger>
            删除已读
          </Button>
        </div>
      </div>

      <Spin spinning={loading}>
        <div
          className="notification-list"
          style={{
            maxHeight: 400,
            overflowY: 'auto',
            paddingRight: 8,
          }}
        >
          <List
            dataSource={notifications}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="暂无通知"
                />
              ),
            }}
            renderItem={(item: Notification) => (
              <List.Item
                className={`notification-item ${!item.isRead ? 'unread' : ''}`}
                style={{
                  padding: '12px 16px',
                  cursor: 'pointer',
                  backgroundColor: !item.isRead ? '#f0f5ff' : 'transparent',
                  borderRadius: 8,
                  marginBottom: 8,
                }}
                onClick={() => handleNotificationClick(item)}
                extra={
                  <DeleteOutlined
                    style={{ color: '#ff4d4f', cursor: 'pointer', fontSize: 18 }}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteNotification(item)
                    }}
                  />
                }
              >
                <List.Item.Meta
                  avatar={
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        backgroundColor: '#f0f5ff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 19,
                      }}
                    >
                      {getNotificationIcon(item.type)}
                    </div>
                  }
                  title={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 'bold' }}>
                        {item.title}
                      </span>
                      {!item.isRead && (
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            backgroundColor: '#ff4d4f',
                            marginLeft: 8,
                          }}
                        />
                      )}
                    </div>
                  }
                  description={
                    <div>
                      <div
                        style={{
                          color: '#8c8c8c',
                          fontSize: 14,
                          marginBottom: 4,
                        }}
                      >
                        {item.content.length > 50 ? item.content.substring(0, 50) + '...' : item.content}
                      </div>
                      <div style={{ color: '#bfbfbf', fontSize: 11 }}>
                        {formatTime(item.notificationCreatedAt || item.createdAt)}
                      </div>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        </div>
      </Spin>

      {/* 通知详情弹窗 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>{getNotificationIcon(currentNotification?.type || 'system')}</span>
            <span style={{ fontSize: 20 }}>{currentNotification?.title}</span>
          </div>
        }
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={550}
      >
        {currentNotification && (
          <div>
            <div style={{ marginBottom: 16, color: '#8c8c8c', fontSize: 13 }}>
              <span>类型：{getTypeText(currentNotification.type)}</span>
              <span style={{ marginLeft: 16 }}>
                时间：{formatTime(currentNotification.notificationCreatedAt || currentNotification.createdAt)}
              </span>
            </div>
            <div
              style={{
                backgroundColor: '#f5f5f5',
                padding: 20,
                borderRadius: 8,
                fontSize: 18,
                lineHeight: 1.5,
                letterSpacing: 2,
                whiteSpace: 'pre-wrap',
              }}
            >
              {currentNotification.content}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )

  return (
    <Popover
      content={notificationContent}
      trigger="click"
      open={visible}
      onOpenChange={handleVisibleChange}
      placement="bottomRight"
      overlayClassName="notification-popover-overlay"
      overlayStyle={{ width: 360, maxHeight: 500 }}
    >
      <Badge count={unreadCount} size="small" overflowCount={99}>
        <BellOutlined
          style={{
            fontSize: 22,
            cursor: 'pointer',
            color: '#333',
          }}
        />
      </Badge>
    </Popover>
  )
}

export default NotificationPopover
