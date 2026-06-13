import React, { useState, useEffect } from 'react'
import { Table, Input, Button, Modal, Form, Select, Avatar, message, Popconfirm } from 'antd'
import { EditOutlined, DeleteOutlined, SearchOutlined, LockOutlined, UserOutlined } from '@ant-design/icons'
import { adminService, type PagedResponse } from '../../services/adminService'
import type { User } from '../../types'

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [form] = Form.useForm()

  useEffect(() => {
    fetchUsers()
  }, [page, pageSize, searchKeyword, statusFilter, roleFilter])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const result: PagedResponse<User> = await adminService.getUsers({
        page,
        pageSize,
        keyword: searchKeyword || undefined,
        status: statusFilter || undefined,
        role: roleFilter || undefined,
      })
      setUsers(result.items)
      setTotal(result.total)
    } catch (error) {
      message.error('获取用户列表失败')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (user: User) => {
    setEditingUser(user)
    form.setFieldsValue({
      username: user.username,
      email: user.email,
      level: user.level,
      role: user.role,
      status: user.status || 'active',
    })
    setIsModalVisible(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await adminService.deleteUser(id)
      message.success('删除成功')
      fetchUsers()
    } catch (error) {
      message.error('删除失败')
    }
  }

  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要删除的用户')
      return
    }

    try {
      await Promise.all(selectedRowKeys.map(id => adminService.deleteUser(id as string)))
      message.success(`成功删除 ${selectedRowKeys.length} 个用户`)
      setSelectedRowKeys([])
      fetchUsers()
    } catch (error) {
      message.error('批量删除失败')
    }
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      if (editingUser) {
        if (!values.password) {
          delete values.password
        }
        delete values.confirmPassword
        await adminService.updateUser(editingUser.id, values)
        message.success('更新成功')
      }
      setIsModalVisible(false)
      setEditingUser(null)
      form.resetFields()
      fetchUsers()
    } catch (error) {
      message.error('保存失败')
    }
  }

  const columns = [
    {
      title: '头像',
      dataIndex: 'avatarUrl',
      key: 'avatarUrl',
      width: 80,
      render: (avatarUrl: string) => (
        <Avatar
          src={avatarUrl || undefined}
          icon={!avatarUrl ? <UserOutlined /> : undefined}
          className="bg-primary-600"
          size={40}
        />
      ),
    },
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: '等级',
      dataIndex: 'level',
      key: 'level',
      render: (level: string) => {
        const levelMap: Record<string, string> = {
          cet4: '四级',
          cet6: '六级',
          both: '四级+六级',
        }
        return levelMap[level] || level
      },
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => (role === 'admin' ? '管理员' : '普通用户'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (status === 'active' ? '正常' : '禁用'),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: User) => (
        <div className="flex space-x-2">
          <Button
            type="primary"
            icon={<EditOutlined />}
            size="small"
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          {record.role !== 'admin' && (
            <Popconfirm
              title="确定删除该用户？"
              onConfirm={() => handleDelete(record.id)}
              okText="确定"
              cancelText="取消"
            >
              <Button danger icon={<DeleteOutlined />} size="small">
                删除
              </Button>
            </Popconfirm>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold">用户管理</h1>
        <span className="text-sm text-gray-400 mt-1">共 {total} 条</span>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <SearchOutlined className="text-gray-400" />
            <Input
              placeholder="搜索用户名或邮箱"
              value={searchKeyword}
              onChange={(e) => {
                setSearchKeyword(e.target.value)
                setPage(1)
              }}
              style={{ width: 200 }}
            />
          </div>
          <Select
            placeholder="选择状态"
            value={statusFilter}
            onChange={(value) => {
              setStatusFilter(value)
              setPage(1)
            }}
            style={{ width: 120 }}
          >
            <Select.Option value="">全部</Select.Option>
            <Select.Option value="active">正常</Select.Option>
            <Select.Option value="inactive">禁用</Select.Option>
          </Select>
          <Select
            placeholder="选择角色"
            value={roleFilter}
            onChange={(value) => {
              setRoleFilter(value)
              setPage(1)
            }}
            style={{ width: 120 }}
          >
            <Select.Option value="">全部</Select.Option>
            <Select.Option value="user">普通用户</Select.Option>
            <Select.Option value="admin">管理员</Select.Option>
          </Select>
        </div>
        {selectedRowKeys.length > 0 && (
          <Popconfirm
            title={`确定删除选中的 ${selectedRowKeys.length} 个用户吗？`}
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

      <Table
        columns={columns}
        dataSource={users}
        loading={loading}
        rowKey="id"
        rowSelection={{
          selectedRowKeys,
          onChange: (newSelectedRowKeys: React.Key[]) => {
            // 过滤掉管理员账号
            const filteredKeys = newSelectedRowKeys.filter(key => {
              const user = users.find(u => u.id === key)
              return user && user.role !== 'admin'
            })
            setSelectedRowKeys(filteredKeys)
          },
          getCheckboxProps: (record: User) => ({
            disabled: record.role === 'admin',
            name: record.username,
          }),
        }}
        pagination={{
          current: page,
          pageSize,
          total,
          onChange: (p, s) => {
            setPage(p)
            setPageSize(s)
          },
        }}
      />

      <Modal
        title={editingUser ? '编辑用户' : '添加用户'}
        visible={isModalVisible}
        onOk={handleSave}
        onCancel={() => {
          setIsModalVisible(false)
          setEditingUser(null)
          form.resetFields()
        }}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="email"
            label="邮箱"
            rules={[{ required: true, type: 'email', message: '请输入有效邮箱' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="level"
            label="等级"
            rules={[{ required: true, message: '请选择等级' }]}
          >
            <Select>
              <Select.Option value="cet4">四级</Select.Option>
              <Select.Option value="cet6">六级</Select.Option>
              <Select.Option value="both">四级+六级</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="role"
            label="角色"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select>
              <Select.Option value="user">普通用户</Select.Option>
              <Select.Option value="admin">管理员</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="status"
            label="状态"
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Select>
              <Select.Option value="active">正常</Select.Option>
              <Select.Option value="inactive">禁用</Select.Option>
            </Select>
          </Form.Item>
          {editingUser && (
            <>
              <Form.Item
                name="password"
                label="新密码（留空则不修改）"
                rules={[
                  { min: 6, message: '密码至少6个字符' },
                ]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="留空则不修改密码" />
              </Form.Item>
              <Form.Item
                name="confirmPassword"
                label="确认密码"
                dependencies={['password']}
                rules={[
                  ({ getFieldValue }: any) => ({
                    validator(_: any, value: string) {
                      if (!getFieldValue('password') || value === getFieldValue('password')) {
                        return Promise.resolve()
                      }
                      return Promise.reject(new Error('两次输入的密码不一致'))
                    },
                  }),
                ]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="请再次输入新密码" />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>
    </div>
  )
}

export default UserManagement