import React, { useState, useEffect } from 'react'
import { Table, Button, Modal, Form, Input, Select, Tag, Space, Popconfirm, message, Drawer, Card } from 'antd'
import { PlusOutlined, DeleteOutlined, EyeOutlined, EditOutlined } from '@ant-design/icons'
import { notificationService } from '../../services/notificationService'

const { TextArea } = Input

interface NotificationRecord {
  id: string
  title: string
  content: string
  type: string
  creator_name?: string
  creatorName?: string
  recipient_count?: number
  recipientCount?: number
  read_count?: number
  readCount?: number
  created_at?: string
  createdAt?: string
}

const NotificationManagement: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [detailDrawerVisible, setDetailDrawerVisible] = useState(false)
  const [selectedNotification, setSelectedNotification] = useState<NotificationRecord | null>(null)
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()

  // 欢迎通知相关状态
  const [welcomeForm] = Form.useForm()
  const [welcomeLoading, setWelcomeLoading] = useState(false)
  const [welcomeSaving, setWelcomeSaving] = useState(false)
  const [welcomeId, setWelcomeId] = useState<string | null>(null)

  useEffect(() => {
    fetchNotifications()
    fetchWelcomeNotification()
  }, [page, pageSize])

  const fetchWelcomeNotification = async () => {
    setWelcomeLoading(true)
    try {
      const data = await notificationService.getWelcomeNotification()
      welcomeForm.setFieldsValue({ title: data.title, content: data.content })
      setWelcomeId(data.id)
    } catch (error) {
      // 欢迎通知初始化可能还没完成，静默处理
    } finally {
      setWelcomeLoading(false)
    }
  }

  // 判断是否为欢迎通知
  const isWelcomeNotification = (id: string) => welcomeId !== null && id === welcomeId

  const handleSaveWelcome = async () => {
    try {
      const values = await welcomeForm.validateFields()
      setWelcomeSaving(true)
      await notificationService.updateWelcomeNotification({
        title: values.title,
        content: values.content,
      })
      message.success('欢迎通知已更新')
    } catch (error: any) {
      if (error?.errorFields) return // 表单校验错误，不提示
      message.error(error?.response?.data?.error || '保存失败')
    } finally {
      setWelcomeSaving(false)
    }
  }

  const fetchNotifications = async () => {
    setLoading(true)
    try {
      const result = await notificationService.getAdminNotifications({
        page,
        pageSize,
      })
      // 显式转换字段，确保数据正确
      const transformedNotifications = result.notifications.map((n: any) => ({
        id: n.id,
        title: n.title,
        content: n.content,
        type: n.type,
        creator_name: n.creator_name || n.creatorName || '-',
        created_at: n.created_at || n.createdAt,
        recipient_count: n.recipient_count || n.recipientCount || 0,
        read_count: n.read_count || n.readCount || 0,
      }))
      setNotifications(transformedNotifications)
      setTotal(result.total)
    } catch (error) {
      message.error('获取通知列表失败')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)
      
      await notificationService.createNotification({
        title: values.title,
        content: values.content,
        type: values.type,
        priority: values.priority,
        targetUsers: values.targetUsers,
      })
      
      message.success('通知发送成功')
      setIsModalVisible(false)
      form.resetFields()
      fetchNotifications()
    } catch (error: any) {
      message.error(error.response?.data?.error || '发送失败')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await notificationService.deleteAdminNotification(id)
      message.success('删除成功')
      fetchNotifications()
    } catch (error) {
      message.error('删除失败')
    }
  }

  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要删除的通知')
      return
    }
    
    try {
      await Promise.all(
        selectedRowKeys.map(id => notificationService.deleteAdminNotification(id as string))
      )
      message.success(`成功删除 ${selectedRowKeys.length} 条通知`)
      setSelectedRowKeys([])
      fetchNotifications()
    } catch (error) {
      message.error('批量删除失败')
    }
  }

  const handleViewDetail = (record: NotificationRecord) => {
    setSelectedNotification(record)
    setDetailDrawerVisible(true)
  }

  const getTypeTag = (type: string) => {
    const typeMap: Record<string, { color: string; text: string }> = {
      system: { color: 'blue', text: '系统通知' },
      activity: { color: 'orange', text: '活动' },
      update: { color: 'purple', text: '更新' },
    }
    const config = typeMap[type] || { color: 'default', text: type }
    return <Tag color={config.color}>{config.text}</Tag>
  }

  // 格式化时间
  const formatTime = (time: string | undefined) => {
    if (!time) return '-'
    return new Date(time).toLocaleString('zh-CN')
  }

  const columns = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      width: 250,
      ellipsis: true,
      render: (title: string, record: NotificationRecord) => (
        <Button type="link" onClick={() => handleViewDetail(record)} style={{ padding: 0 }}>
          {title}
        </Button>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => getTypeTag(type),
    },
    {
      title: '发送者',
      dataIndex: 'creator_name',
      key: 'creator_name',
      width: 100,
      render: (name: string | undefined) => name || '-',
    },
    {
      title: '已发送/已读',
      key: 'stats',
      width: 120,
      render: (_: any, record: NotificationRecord) => {
        const recipientCount = record.recipient_count || record.recipientCount || 0
        const readCount = record.read_count || record.readCount || 0
        return <span>{recipientCount} / {readCount}</span>
      },
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (date: string) => formatTime(date),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: any, record: NotificationRecord) => (
        <Space>
          <Button 
            type="link" 
            icon={<EyeOutlined />} 
            size="small"
            onClick={() => handleViewDetail(record)}
          >
            查看
          </Button>
          {isWelcomeNotification(record.id) ? (
            <Tag color="blue">固定通知</Tag>
          ) : (
            <Popconfirm
              title="确定删除该通知？"
              onConfirm={() => handleDelete(record.id)}
              okText="确定"
              cancelText="取消"
            >
              <Button danger icon={<DeleteOutlined />} size="small">
                删除
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">通知管理</h1>
        <Space>
          {selectedRowKeys.length > 0 && (
            <Popconfirm
              title={`确定删除选中的 ${selectedRowKeys.length} 条通知？`}
              onConfirm={handleBatchDelete}
              okText="确定"
              cancelText="取消"
            >
              <Button danger icon={<DeleteOutlined />}>
                批量删除 ({selectedRowKeys.length})
              </Button>
            </Popconfirm>
          )}
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsModalVisible(true)}
          >
            发送通知
          </Button>
        </Space>
      </div>

      {/* 欢迎通知编辑 */}
      <Card
        title={
          <Space>
            <EditOutlined />
            <span>新用户欢迎通知</span>
          </Space>
        }
        loading={welcomeLoading}
        className="mb-6"
        extra={
          <Tag color="blue">新用户注册时自动发送</Tag>
        }
      >
        <Form form={welcomeForm} layout="vertical">
          <Form.Item
            name="title"
            label="通知标题"
            rules={[{ required: true, message: '请输入标题' }]}
          >
            <Input placeholder="请输入欢迎通知标题" maxLength={100} showCount />
          </Form.Item>
          <Form.Item
            name="content"
            label="通知内容"
            rules={[{ required: true, message: '请输入内容' }]}
          >
            <TextArea
              placeholder="请输入欢迎通知内容"
              rows={4}
              maxLength={2000}
              showCount
            />
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              icon={<EditOutlined />}
              loading={welcomeSaving}
              onClick={handleSaveWelcome}
            >
              保存欢迎通知
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Table
        columns={columns}
        dataSource={notifications}
        loading={loading}
        rowKey="id"
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys),
          getCheckboxProps: (record: NotificationRecord) => ({
            disabled: isWelcomeNotification(record.id),
          }),
        }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条`,
          onChange: (p, s) => {
            setPage(p)
            setPageSize(s)
          },
        }}
      />

      <Modal
        title="发送通知"
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false)
          form.resetFields()
        }}
        onOk={handleCreate}
        confirmLoading={saving}
        okText="发送"
        cancelText="取消"
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="title"
            label="通知标题"
            rules={[{ required: true, message: '请输入通知标题' }]}
          >
            <Input placeholder="请输入通知标题" maxLength={100} showCount />
          </Form.Item>

          <Form.Item
            name="content"
            label="通知内容"
            rules={[{ required: true, message: '请输入通知内容' }]}
          >
            <TextArea
              placeholder="请输入通知内容"
              rows={6}
              maxLength={2000}
              showCount
            />
          </Form.Item>

          <Space>
            <Form.Item
              name="type"
              label="通知类型"
              initialValue="system"
              style={{ width: 200 }}
            >
              <Select>
                <Select.Option value="system">系统通知</Select.Option>
                <Select.Option value="activity">活动</Select.Option>
                <Select.Option value="update">更新</Select.Option>
              </Select>
            </Form.Item>
          </Space>

          <Form.Item
            name="targetUsers"
            label="发送对象"
            rules={[{ required: true, message: '请选择发送对象' }]}
            initialValue="all"
          >
            <Select>
              <Select.Option value="all">全部用户</Select.Option>
              <Select.Option value="active">活跃用户</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* 通知详情抽屉 */}
      <Drawer
        title="通知详情"
        open={detailDrawerVisible}
        onClose={() => setDetailDrawerVisible(false)}
        width={600}
      >
        {selectedNotification && (
          <div>
            <div className="mb-4">
              <h3 className="text-lg font-bold mb-2">{selectedNotification.title}</h3>
              <Space>
                {getTypeTag(selectedNotification.type)}
              </Space>
            </div>
            
            <div className="text-sm text-gray-500 mb-4">
              <div>发送者：{selectedNotification.creator_name || selectedNotification.creatorName || '-'}</div>
              <div>
                发送统计：{selectedNotification.recipient_count || selectedNotification.recipientCount || 0} / 
                {selectedNotification.read_count || selectedNotification.readCount || 0}
              </div>
              <div>创建时间：{formatTime(selectedNotification.created_at || selectedNotification.createdAt)}</div>
            </div>
            
            <div className="mt-6">
              <h4 className="font-semibold mb-2">通知内容</h4>
              <div className="bg-gray-50 p-4 rounded-lg whitespace-pre-wrap">
                {selectedNotification.content}
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  )
}

export default NotificationManagement
