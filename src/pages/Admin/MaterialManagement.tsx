import React, { useState, useEffect } from 'react'
import { Table, Input, Button, Modal, Form, Select, Switch, message, Popconfirm } from 'antd'
import { EditOutlined, DeleteOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { adminService, type PagedResponse } from '../../services/adminService'
import type { Material } from '../../types'

const MaterialManagement: React.FC = () => {
  const [materials, setMaterials] = useState<Material[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [levelFilter, setLevelFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null)
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [form] = Form.useForm()

  useEffect(() => {
    fetchMaterials()
  }, [page, pageSize, searchKeyword, categoryFilter, levelFilter])

  const fetchMaterials = async () => {
    try {
      setLoading(true)
      const result: PagedResponse<Material> = await adminService.getMaterials({
        page,
        pageSize,
        keyword: searchKeyword || undefined,
        category: categoryFilter || undefined,
        level: levelFilter || undefined,
      })
      setMaterials(result.items)
      setTotal(result.total)
    } catch (error) {
      message.error('获取素材列表失败')
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setEditingMaterial(null)
    form.resetFields()
    form.setFieldsValue({
      isCommon: true,
      tags: [],
    })
    setIsModalVisible(true)
  }

  const handleEdit = (material: Material) => {
    setEditingMaterial(material)
    form.setFieldsValue({
      title: material.title,
      content: material.content,
      translation: material.translation,
      category: material.category,
      type: material.type,
      tags: material.tags,
      usageScenario: material.usageScenario,
      tips: material.tips,
      isCommon: material.isCommon,
      level: material.level,
    })
    setIsModalVisible(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await adminService.deleteMaterial(id)
      message.success('删除成功')
      fetchMaterials()
    } catch (error) {
      message.error('删除失败')
    }
  }

  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要删除的素材')
      return
    }

    try {
      await Promise.all(selectedRowKeys.map(id => adminService.deleteMaterial(id as string)))
      message.success(`成功删除 ${selectedRowKeys.length} 个素材`)
      setSelectedRowKeys([])
      fetchMaterials()
    } catch (error) {
      message.error('批量删除失败')
    }
  }

  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys)
    },
  }

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      await adminService.toggleMaterialActive(id, isActive)
      setMaterials(prev => prev.map(m => m.id === id ? { ...m, isActive } : m))
    } catch {
      message.error('操作失败')
    }
  }

  const handleBatchToggle = async (active: boolean) => {
    try {
      await adminService.batchToggleMaterials(active, categoryFilter || undefined)
      message.success(active ? '已全部启用' : '已全部禁用')
      fetchMaterials()
    } catch {
      message.error('操作失败')
    }
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      if (editingMaterial) {
        await adminService.updateMaterial(editingMaterial.id, values)
        message.success('更新成功')
      } else {
        await adminService.createMaterial(values)
        message.success('创建成功')
      }
      setIsModalVisible(false)
      setEditingMaterial(null)
      form.resetFields()
      fetchMaterials()
    } catch (error) {
      message.error('保存失败')
    }
  }

  const categoryMap: Record<string, string> = {
    topic: '话题素材',
    sentence: '句型模板',
    transition: '过渡衔接',
    opening: '开头素材',
    closing: '结尾素材',
  }

  const levelMap: Record<string, string> = {
    cet4: '四级',
    cet6: '六级',
  }

  const columns = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      render: (category: string) => categoryMap[category] || category,
    },
    {
      title: '等级',
      dataIndex: 'level',
      key: 'level',
      render: (level: string) => levelMap[level] || '通用',
    },
    {
      title: '收藏数',
      dataIndex: 'favoritesCount',
      key: 'favoritesCount',
    },
    {
      title: '是否公共',
      dataIndex: 'isCommon',
      key: 'isCommon',
      render: (isCommon: boolean) => (isCommon ? '是' : '否'),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleString('zh-CN'),
    },
    {
      title: '启用',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 70,
      render: (_: any, record: Material) => (
        <Switch
          checked={record.isActive ?? (record as any).is_active ?? true}
          onChange={(checked) => handleToggleActive(record.id, checked)}
          size="small"
        />
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Material) => (
        <div className="flex space-x-2">
          <Button
            type="primary"
            icon={<EditOutlined />}
            size="small"
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除该素材？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button danger icon={<DeleteOutlined />} size="small">
              删除
            </Button>
          </Popconfirm>
        </div>
      ),
    },
  ]

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">素材管理</h1>
          <span className="text-sm text-gray-400 mt-1">共 {total} 条</span>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          添加素材
        </Button>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <SearchOutlined className="text-gray-400" />
            <Input
              placeholder="搜索标题或内容"
              value={searchKeyword}
              onChange={(e) => {
                setSearchKeyword(e.target.value)
                setPage(1)
              }}
              style={{ width: 250 }}
            />
          </div>
          <Select
            placeholder="选择分类"
            value={categoryFilter}
            onChange={(value) => {
              setCategoryFilter(value)
              setPage(1)
            }}
            style={{ width: 120 }}
          >
            <Select.Option value="">全部</Select.Option>
            {Object.entries(categoryMap).map(([key, label]) => (
              <Select.Option key={key} value={key}>{label}</Select.Option>
            ))}
          </Select>
          <Select
            placeholder="选择等级"
            value={levelFilter}
            onChange={(value) => {
              setLevelFilter(value)
              setPage(1)
            }}
            style={{ width: 120 }}
          >
            <Select.Option value="">全部</Select.Option>
            <Select.Option value="cet4">四级</Select.Option>
            <Select.Option value="cet6">六级</Select.Option>
          </Select>
        </div>
        {selectedRowKeys.length > 0 && (
          <Popconfirm
            title={`确定删除选中的 ${selectedRowKeys.length} 个素材吗？`}
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

      <div className="flex gap-2 mb-4">
        <Popconfirm title={`确定要${categoryFilter ? '将当前分类' : '将全部'}素材全部启用吗？`} onConfirm={() => handleBatchToggle(true)} okText="确定" cancelText="取消">
          <Button size="small" type="primary" ghost>全部启用</Button>
        </Popconfirm>
        <Popconfirm title={`确定要${categoryFilter ? '将当前分类' : '将全部'}素材全部禁用吗？`} onConfirm={() => handleBatchToggle(false)} okText="确定" cancelText="取消">
          <Button size="small" danger>全部禁用</Button>
        </Popconfirm>
      </div>

      <Table
        columns={columns}
        dataSource={materials}
        loading={loading}
        rowKey="id"
        rowSelection={rowSelection}
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
        title={editingMaterial ? '编辑素材' : '添加素材'}
        visible={isModalVisible}
        onOk={handleSave}
        onCancel={() => {
          setIsModalVisible(false)
          setEditingMaterial(null)
          form.resetFields()
        }}
        width={700}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="title"
            label="标题"
            rules={[{ required: true, message: '请输入标题' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="content"
            label="内容"
            rules={[{ required: true, message: '请输入内容' }]}
          >
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item
            name="translation"
            label="翻译"
          >
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item
            name="category"
            label="分类"
            rules={[{ required: true, message: '请选择分类' }]}
          >
            <Select>
              {Object.entries(categoryMap).map(([key, label]) => (
                <Select.Option key={key} value={key}>{label}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="type"
            label="类型"
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="tags"
            label="标签"
          >
            <Select mode="tags" placeholder="输入标签后按回车添加" />
          </Form.Item>
          <Form.Item
            name="usageScenario"
            label="使用场景"
          >
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item
            name="tips"
            label="使用提示"
          >
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item
            name="isCommon"
            label="是否公共"
            rules={[{ required: true, message: '请选择' }]}
          >
            <Select>
              <Select.Option value={true}>是</Select.Option>
              <Select.Option value={false}>否</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="level"
            label="适用等级"
          >
            <Select>
              <Select.Option value="">通用</Select.Option>
              <Select.Option value="cet4">四级</Select.Option>
              <Select.Option value="cet6">六级</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default MaterialManagement