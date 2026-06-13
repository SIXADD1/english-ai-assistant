import React, { useState, useEffect } from 'react'
import { Table, Button, Tag, Popconfirm, message, Space, Modal, Descriptions } from 'antd'
import { DeleteOutlined, StarOutlined, EyeOutlined } from '@ant-design/icons'
import api from '../../services/api'

interface Feedback {
  id: string
  userId: string
  rating: number
  category: string
  content: string
  contact: string
  createdAt: string
}

const categoryMap: Record<string, { label: string; color: string }> = {
  suggestion: { label: '功能建议', color: 'blue' },
  bug: { label: '问题报告', color: 'red' },
  content: { label: '内容问题', color: 'orange' },
  other: { label: '其他', color: 'gray' }
}

const FeedbackManagement: React.FC = () => {
  const [data, setData] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [viewingVisible, setViewingVisible] = useState(false)
  const [currentFeedback, setCurrentFeedback] = useState<Feedback | null>(null)

  const fetchFeedback = async () => {
    setLoading(true)
    try {
      const response = await api.get('/admin/feedback')
      console.log('[反馈管理] API 返回数据:', response.data)
      console.log('[反馈管理] 第一条数据:', response.data.data?.[0])
      setData(response.data.data)
    } catch (error) {
      message.error('获取反馈列表失败')
      console.error('[反馈管理] 错误:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFeedback()
  }, [])

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/admin/feedback/${id}`)
      message.success('删除成功')
      fetchFeedback()
    } catch (error) {
      message.error('删除失败')
    }
  }

  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要删除的反馈')
      return
    }

    try {
      await Promise.all(selectedRowKeys.map(id => api.delete(`/admin/feedback/${id}`)))
      message.success(`成功删除 ${selectedRowKeys.length} 条反馈`)
      setSelectedRowKeys([])
      fetchFeedback()
    } catch (error) {
      message.error('批量删除失败')
    }
  }

  const handleView = (record: Feedback) => {
    setCurrentFeedback(record)
    setViewingVisible(true)
  }

  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys)
    },
  }

  const columns = [
    {
      title: '评分',
      dataIndex: 'rating',
      width: 80,
      render: (rating: number) => (
        <div className="flex items-center">
          {Array.from({ length: 5 }).map((_, i) => (
            <StarOutlined
              key={i}
              className={i < rating ? 'text-yellow-500' : 'text-gray-300'}
            />
          ))}
        </div>
      )
    },
    {
      title: '类型',
      dataIndex: 'category',
      width: 100,
      render: (category: string) => {
        const item = categoryMap[category] || { label: category, color: 'gray' }
        return <Tag color={item.color}>{item.label}</Tag>
      }
    },
    {
      title: '内容',
      dataIndex: 'content',
      ellipsis: true,
      render: (text: string) => (
        <span className="max-w-xs block truncate" title={text}>{text}</span>
      )
    },
    {
      title: '联系方式',
      dataIndex: 'contact',
      width: 150,
      render: (contact: string) => contact || '-'
    },
    {
      title: '提交时间',
      dataIndex: 'createdAt',
      width: 160,
      render: (time: string) => {
        if (!time) return '-'
        const date = new Date(time)
        if (isNaN(date.getTime())) return time
        return date.toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
      }
    },
    {
      title: '操作',
      width: 160,
      render: (_: any, record: Feedback) => (
        <Space>
          <Button
            type="primary"
            icon={<EyeOutlined />}
            size="small"
            onClick={() => handleView(record)}
          >
            查看
          </Button>
          <Popconfirm
            title="确定删除这条反馈吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              size="small"
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">用户反馈管理</h1>
        {selectedRowKeys.length > 0 && (
          <Popconfirm
            title={`确定删除选中的 ${selectedRowKeys.length} 条反馈吗？`}
            onConfirm={handleBatchDelete}
            okText="确定"
            cancelText="取消"
          >
            <Button danger icon={<DeleteOutlined />}>
              批量删除 ({selectedRowKeys.length})
            </Button>
          </Popconfirm>
        )}
      </div>
      <div className="bg-white rounded-lg shadow p-4">
        <Table
          columns={columns}
          dataSource={data}
          loading={loading}
          rowKey="id"
          rowSelection={rowSelection}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条记录`
          }}
        />
      </div>

      {/* 查看详情弹窗 */}
      <Modal
        title="反馈详情"
        open={viewingVisible}
        onCancel={() => setViewingVisible(false)}
        footer={[
          <Button key="close" onClick={() => setViewingVisible(false)}>
            关闭
          </Button>
        ]}
        width={800}
      >
        {currentFeedback && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="评分">
              <div className="flex items-center">
                {Array.from({ length: 5 }).map((_, i) => (
                  <StarOutlined
                    key={i}
                    className={i < currentFeedback.rating ? 'text-yellow-500' : 'text-gray-300'}
                  />
                ))}
              </div>
            </Descriptions.Item>
            <Descriptions.Item label="反馈类型">
              <Tag color={categoryMap[currentFeedback.category]?.color || 'gray'}>
                {categoryMap[currentFeedback.category]?.label || currentFeedback.category}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="提交时间">
              {currentFeedback.createdAt ? new Date(currentFeedback.createdAt).toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              }) : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="联系方式">
              {currentFeedback.contact || '未填写'}
            </Descriptions.Item>
            <Descriptions.Item label="反馈内容" span={2}>
              <div className="whitespace-pre-wrap" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {currentFeedback.content}
              </div>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  )
}

export default FeedbackManagement
