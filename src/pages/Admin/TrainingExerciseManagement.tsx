import React, { useState, useEffect } from 'react'
import { Table, Input, InputNumber, Button, Modal, Form, Select, Switch, message, Popconfirm, Tag, Space } from 'antd'
import { EditOutlined, DeleteOutlined, PlusOutlined, PlusCircleOutlined, MinusCircleOutlined } from '@ant-design/icons'
import { adminService, type PagedResponse } from '../../services/adminService'

const { TextArea } = Input

const typeLabels: Record<string, string> = {
  topic_analysis: '审题构思',
  material_apply: '素材应用',
  open_close: '开头结尾',
  format: '格式规范',
}

const typeColors: Record<string, string> = {
  topic_analysis: 'blue',
  material_apply: 'purple',
  open_close: 'green',
  format: 'orange',
}

const TrainingExerciseManagement: React.FC = () => {
  const [exercises, setExercises] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [typeFilter, setTypeFilter] = useState('')
  const [levelFilter, setLevelFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingExercise, setEditingExercise] = useState<any | null>(null)
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [form] = Form.useForm()
  const [answerType, setAnswerType] = useState<string>('')
  const [improvements, setImprovements] = useState<Array<{ original: string; improved: string; reason: string }>>([])

  useEffect(() => {
    fetchExercises()
  }, [page, pageSize, typeFilter, levelFilter])

  const fetchExercises = async () => {
    try {
      setLoading(true)
      const result: PagedResponse<any> = await adminService.getTrainingExercises({
        page,
        pageSize,
        type: typeFilter || undefined,
        level: levelFilter || undefined,
      })
      setExercises(result.items)
      setTotal(result.total)
    } catch {
      message.error('获取训练练习列表失败')
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setEditingExercise(null)
    form.resetFields()
    setAnswerType('')
    setImprovements([])
    form.setFieldsValue({
      isActive: true,
      sortOrder: 0,
    })
    setIsModalVisible(true)
  }

  const handleEdit = (exercise: any) => {
    setEditingExercise(exercise)
    const ans = typeof exercise.answer === 'string' ? JSON.parse(exercise.answer) : exercise.answer
    const type = exercise.type
    setAnswerType(type)
    const baseFields: any = {
      type,
      title: exercise.title,
      content: exercise.content,
      requirements: exercise.requirements,
      level: exercise.level,
      sortOrder: exercise.sortOrder ?? exercise.sort_order ?? 0,
      isActive: exercise.isActive ?? exercise.is_active ?? true,
    }
    if (type === 'topic_analysis') {
      baseFields.mainPoint = ans?.mainPoint || ''
      baseFields.writingType = ans?.writingType || ''
      baseFields.structure = ans?.structure ? ans.structure.join('\n') : ''
    } else if (type === 'material_apply') {
      baseFields.target = ans?.target || ''
      setImprovements(ans?.improvements || [])
    } else if (type === 'open_close') {
      baseFields.sample = ans?.sample || ''
      baseFields.tips_open = ans?.tips ? ans.tips.join('\n') : ''
    } else if (type === 'format') {
      baseFields.salutation = ans?.salutation || ''
      baseFields.body = ans?.body || ''
      baseFields.closing = ans?.closing || ''
      baseFields.signature = ans?.signature || ''
      baseFields.date_f = ans?.date || ''
    }
    form.setFieldsValue(baseFields)
    setIsModalVisible(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await adminService.deleteTrainingExercise(id)
      message.success('删除成功')
      fetchExercises()
    } catch {
      message.error('删除失败')
    }
  }

  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要删除的专项练习')
      return
    }

    try {
      await Promise.all(selectedRowKeys.map(id => adminService.deleteTrainingExercise(id as string)))
      message.success(`成功删除 ${selectedRowKeys.length} 个专项练习`)
      setSelectedRowKeys([])
      fetchExercises()
    } catch {
      message.error('批量删除失败')
    }
  }

  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys)
    },
  }

  const quickUpdate = async (id: string, field: string, value: any) => {
    const exercise = exercises.find(e => e.id === id)
    if (!exercise) return
    let answer = exercise.answer
    try { answer = typeof answer === 'string' ? JSON.parse(answer) : answer } catch {}
    const body = {
      type: exercise.type,
      title: exercise.title,
      content: exercise.content,
      requirements: exercise.requirements || '',
      level: exercise.level,
      answer,
      sortOrder: exercise.sortOrder ?? 0,
      isActive: exercise.isActive ?? true,
      [field]: value,
    }
    try {
      await adminService.updateTrainingExercise(id, body as any)
      setExercises(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e))
      message.success('已更新')
    } catch {
      message.error('更新失败')
    }
  }

  const buildAnswer = (values: any) => {
    if (values.type === 'topic_analysis') {
      return {
        mainPoint: values.mainPoint || '',
        writingType: values.writingType || '',
        structure: values.structure ? values.structure.split('\n').filter((s: string) => s.trim()) : [],
      }
    } else if (values.type === 'material_apply') {
      return {
        target: values.target || '',
        improvements: improvements.filter(i => i.original || i.improved),
      }
    } else if (values.type === 'open_close') {
      return {
        sample: values.sample || '',
        tips: values.tips_open ? values.tips_open.split('\n').filter((s: string) => s.trim()) : [],
      }
    } else if (values.type === 'format') {
      return {
        salutation: values.salutation || '',
        body: values.body || '',
        closing: values.closing || '',
        signature: values.signature || '',
        date: values.date_f || '',
      }
    }
    return {}
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      const answerJson = buildAnswer(values)

      const data = {
        type: values.type,
        title: values.title,
        content: values.content,
        requirements: values.requirements || '',
        level: values.level,
        answer: answerJson,
        sortOrder: Number(values.sortOrder) || 0,
        isActive: values.isActive,
      }

      if (editingExercise) {
        await adminService.updateTrainingExercise(editingExercise.id, data)
        message.success('更新成功')
      } else {
        await adminService.createTrainingExercise(data)
        message.success('创建成功')
      }
      setIsModalVisible(false)
      setEditingExercise(null)
      form.resetFields()
      setAnswerType('')
      setImprovements([])
      fetchExercises()
    } catch {
      message.error('保存失败')
    }
  }

  const handleBatchToggle = async (active: boolean) => {
    try {
      await adminService.batchToggleTrainingExercises(active, typeFilter || undefined)
      message.success(active ? '已全部启用' : '已全部禁用')
      fetchExercises()
    } catch {
      message.error('操作失败')
    }
  }

  const columns = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      width: 200,
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => (
        <Tag color={typeColors[type] || 'default'}>{typeLabels[type] || type}</Tag>
      ),
    },
    {
      title: '级别',
      dataIndex: 'level',
      key: 'level',
      width: 80,
      render: (level: string) => (
        <Tag color={level === 'cet6' ? 'purple' : 'blue'}>
          {level === 'cet6' ? '六级' : '四级'}
        </Tag>
      ),
    },
    {
      title: '内容',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
      render: (text: string) => (
        <span className="text-gray-600">{text?.substring(0, 60)}...</span>
      ),
    },
    {
      title: '排序',
      dataIndex: 'sortOrder',
      key: 'sortOrder',
      width: 100,
      render: (_: any, record: any) => (
        <InputNumber
          min={0}
          size="small"
          value={record.sortOrder ?? 0}
          onChange={(val) => quickUpdate(record.id, 'sortOrder', val ?? 0)}
          style={{ width: 70 }}
        />
      ),
    },
    {
      title: '启用',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 70,
      render: (_: any, record: any) => (
        <Switch
          checked={record.isActive}
          onChange={(checked) => quickUpdate(record.id, 'isActive', checked)}
          size="small"
        />
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      render: (_: any, record: any) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除此练习？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">专项训练管理</h1>
          <span className="text-sm text-gray-400 mt-1">共 {total} 条</span>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          新建练习
        </Button>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-4">
          <Select
            placeholder="练习类型"
            value={typeFilter || undefined}
            onChange={(v) => { setTypeFilter(v || ''); setPage(1) }}
            allowClear
            style={{ width: 150 }}
            options={Object.entries(typeLabels).map(([k, v]) => ({ label: v, value: k }))}
          />
          <Select
            placeholder="级别"
            value={levelFilter || undefined}
            onChange={(v) => { setLevelFilter(v || ''); setPage(1) }}
            allowClear
            style={{ width: 120 }}
            options={[
              { label: '四级', value: 'cet4' },
              { label: '六级', value: 'cet6' },
            ]}
          />
        </div>
        {selectedRowKeys.length > 0 && (
          <Popconfirm
            title={`确定删除选中的 ${selectedRowKeys.length} 个专项练习吗？`}
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
        <Popconfirm title={`确定要${typeFilter ? '将当前类型' : '将全部'}练习全部启用吗？`} onConfirm={() => handleBatchToggle(true)} okText="确定" cancelText="取消">
          <Button size="small" type="primary" ghost>全部启用</Button>
        </Popconfirm>
        <Popconfirm title={`确定要${typeFilter ? '将当前类型' : '将全部'}练习全部禁用吗？`} onConfirm={() => handleBatchToggle(false)} okText="确定" cancelText="取消">
          <Button size="small" danger>全部禁用</Button>
        </Popconfirm>
      </div>

      <Table
        columns={columns}
        dataSource={exercises}
        rowKey="id"
        rowSelection={rowSelection}
        loading={loading}
        pagination={{
          current: page,
          pageSize,
          total,
          onChange: (p, ps) => { setPage(p); setPageSize(ps) },
          showSizeChanger: true,
          showTotal: (t) => `共 ${t} 条`,
        }}
      />

      <Modal
        title={editingExercise ? '编辑练习' : '新建练习'}
        open={isModalVisible}
        onOk={handleSave}
        onCancel={() => { setIsModalVisible(false); setEditingExercise(null); form.resetFields(); setAnswerType(''); setImprovements([]) }}
        width={800}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="type" label="练习类型" rules={[{ required: true }]}>
            <Select
              options={Object.entries(typeLabels).map(([k, v]) => ({ label: v, value: k }))}
              onChange={(v) => {
                setAnswerType(v)
                form.setFieldsValue({
                  mainPoint: undefined, writingType: undefined, structure: undefined,
                  target: undefined, sample: undefined, tips_open: undefined,
                  salutation: undefined, body: undefined, closing: undefined, signature: undefined, date_f: undefined,
                })
                setImprovements([])
              }}
            />
          </Form.Item>
          <Form.Item name="title" label="标题" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="content" label="题目内容" rules={[{ required: true }]}>
            <TextArea rows={4} />
          </Form.Item>
          <Form.Item name="requirements" label="练习要求">
            <TextArea rows={2} />
          </Form.Item>
          <Form.Item name="level" label="级别" rules={[{ required: true }]}>
            <Select options={[{ label: '四级', value: 'cet4' }, { label: '六级', value: 'cet6' }]} />
          </Form.Item>

          {/* ===== 参考答案 - 按类型区分 ===== */}
          {answerType === 'topic_analysis' && (
            <>
              <div className="text-sm font-semibold text-gray-500 mb-2">参考答案</div>
              <Form.Item name="mainPoint" label="核心主旨" rules={[{ required: true, message: '请输入核心主旨' }]}>
                <TextArea rows={2} placeholder="如：向想学中文的外国朋友推荐靠谱的学习资源" />
              </Form.Item>
              <Form.Item name="writingType" label="文体类型" rules={[{ required: true, message: '请输入文体类型' }]}>
                <Input placeholder="如：建议信 / 议论文 / 通知" />
              </Form.Item>
              <Form.Item name="structure" label="行文框架（每行一段）" rules={[{ required: true, message: '请输入行文框架' }]}>
                <TextArea rows={4} placeholder="开头：问候并说明写信目的\n主体：分点推荐学习资源\n结尾：表达祝愿" />
              </Form.Item>
            </>
          )}

          {answerType === 'material_apply' && (
            <>
              <div className="text-sm font-semibold text-gray-500 mb-2">参考答案</div>
              <Form.Item name="target" label="高分改写版本" rules={[{ required: true, message: '请输入高分改写版本' }]}>
                <TextArea rows={3} placeholder="改写后的完整句子或段落" />
              </Form.Item>
              <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">改进明细</span>
                  <Button size="small" icon={<PlusCircleOutlined />} onClick={() => setImprovements([...improvements, { original: '', improved: '', reason: '' }])}>
                    添加一项
                  </Button>
                </div>
                {improvements.map((item, idx) => (
                  <div key={idx} className="flex gap-2 mb-2 items-start">
                    <Input
                      size="small"
                      placeholder="原文"
                      value={item.original}
                      onChange={(e) => {
                        const next = [...improvements]
                        next[idx] = { ...next[idx], original: e.target.value }
                        setImprovements(next)
                      }}
                      style={{ flex: 1 }}
                    />
                    <Input
                      size="small"
                      placeholder="改写"
                      value={item.improved}
                      onChange={(e) => {
                        const next = [...improvements]
                        next[idx] = { ...next[idx], improved: e.target.value }
                        setImprovements(next)
                      }}
                      style={{ flex: 1 }}
                    />
                    <Input
                      size="small"
                      placeholder="原因"
                      value={item.reason}
                      onChange={(e) => {
                        const next = [...improvements]
                        next[idx] = { ...next[idx], reason: e.target.value }
                        setImprovements(next)
                      }}
                      style={{ flex: 1 }}
                    />
                    <Button
                      size="small"
                      danger
                      icon={<MinusCircleOutlined />}
                      onClick={() => setImprovements(improvements.filter((_, i) => i !== idx))}
                    />
                  </div>
                ))}
              </div>
            </>
          )}

          {answerType === 'open_close' && (
            <>
              <div className="text-sm font-semibold text-gray-500 mb-2">参考答案</div>
              <Form.Item name="sample" label="高分范文" rules={[{ required: true, message: '请输入高分范文' }]}>
                <TextArea rows={4} placeholder="完整的开头/结尾范文" />
              </Form.Item>
              <Form.Item name="tips_open" label="写作技巧（每行一条）">
                <TextArea rows={3} placeholder="使用With引导的伴随状语引出背景&#10;使用From...to...列举具体例子&#10;用While引导对比句" />
              </Form.Item>
            </>
          )}

          {answerType === 'format' && (
            <>
              <div className="text-sm font-semibold text-gray-500 mb-2">参考答案</div>
              <Form.Item name="salutation" label="称呼" rules={[{ required: true, message: '请输入称呼' }]}>
                <Input placeholder="如：Dear Sir or Madam," />
              </Form.Item>
              <Form.Item name="body" label="正文" rules={[{ required: true, message: '请输入正文' }]}>
                <TextArea rows={3} placeholder="正文内容" />
              </Form.Item>
              <Form.Item name="closing" label="结束语" rules={[{ required: true, message: '请输入结束语' }]}>
                <Input placeholder="如：Yours sincerely," />
              </Form.Item>
              <Form.Item name="signature" label="签名" rules={[{ required: true, message: '请输入签名' }]}>
                <Input placeholder="如：Li Hua" />
              </Form.Item>
              <Form.Item name="date_f" label="日期">
                <Input placeholder="如：June 1, 2026" />
              </Form.Item>
            </>
          )}

          <Form.Item name="sortOrder" label="排序">
            <Input type="number" />
          </Form.Item>
          <Form.Item name="isActive" label="启用">
            <Select options={[{ label: '启用', value: true }, { label: '禁用', value: false }]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default TrainingExerciseManagement
