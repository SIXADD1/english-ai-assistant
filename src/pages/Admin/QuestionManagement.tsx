import React, { useState, useEffect } from 'react'
import { Table, Input, Button, Modal, Form, Select, Switch, message, Popconfirm, InputNumber } from 'antd'
import { EditOutlined, DeleteOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { adminService, type PagedResponse } from '../../services/adminService'
import type { Question } from '../../types'

const QuestionManagement: React.FC = () => {
  const [questions, setQuestions] = useState<Question[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [levelFilter, setLevelFilter] = useState('')
  const [difficultyFilter, setDifficultyFilter] = useState('')
  const [yearFilter, setYearFilter] = useState('')
  const [yearOptions, setYearOptions] = useState<number[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [form] = Form.useForm()

  useEffect(() => {
    fetchQuestions()
  }, [page, pageSize, searchKeyword, typeFilter, levelFilter, difficultyFilter, yearFilter])

  useEffect(() => {
    adminService.getQuestionYears().then(setYearOptions).catch((err) => {
      console.error('获取年份列表失败:', err)
    })
  }, [])

  const fetchQuestions = async () => {
    try {
      setLoading(true)
      const result: PagedResponse<Question> = await adminService.getQuestions({
        page,
        pageSize,
        keyword: searchKeyword || undefined,
        type: typeFilter || undefined,
        level: levelFilter || undefined,
        difficulty: difficultyFilter || undefined,
        year: yearFilter || undefined,
      })
      setQuestions(result.items)
      setTotal(result.total)
    } catch (error) {
      message.error('获取题目列表失败')
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setEditingQuestion(null)
    form.resetFields()
    form.setFieldsValue({
      difficulty: 'medium',
      isAiGenerated: false,
    })
    setIsModalVisible(true)
  }

  const handleEdit = (question: Question) => {
    setEditingQuestion(question)
    form.setFieldsValue({
      title: question.title,
      content: question.content,
      requirements: question.requirements,
      type: question.type,
      level: question.level,
      topic: question.topic,
      difficulty: question.difficulty,
      year: question.year,
      isAiGenerated: question.isAiGenerated ?? false,
      wordCountMin: question.wordCountMin,
      wordCountMax: question.wordCountMax,
    })
    setIsModalVisible(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await adminService.deleteQuestion(id)
      message.success('删除成功')
      fetchQuestions()
    } catch (error) {
      message.error('删除失败')
    }
  }

  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要删除的题目')
      return
    }

    try {
      await Promise.all(selectedRowKeys.map(id => adminService.deleteQuestion(id as string)))
      message.success(`成功删除 ${selectedRowKeys.length} 道题目`)
      setSelectedRowKeys([])
      fetchQuestions()
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
      await adminService.toggleQuestionActive(id, isActive)
      setQuestions(prev => prev.map(q => q.id === id ? { ...q, isActive } : q))
    } catch {
      message.error('操作失败')
    }
  }

  const handleBatchToggle = async (active: boolean) => {
    try {
      const type = typeFilter || undefined
      const level = levelFilter || undefined
      await adminService.batchToggleQuestions(active, type, level)
      message.success(active ? '已全部启用' : '已全部禁用')
      fetchQuestions()
    } catch {
      message.error('操作失败')
    }
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      if (editingQuestion) {
        await adminService.updateQuestion(editingQuestion.id, values)
        message.success('更新成功')
      } else {
        await adminService.createQuestion(values)
        message.success('创建成功')
      }
      setIsModalVisible(false)
      setEditingQuestion(null)
      form.resetFields()
      fetchQuestions()
    } catch (error) {
      message.error('保存失败')
    }
  }

  const typeMap: Record<string, string> = {
    argumentative: '议论文',
    letter: '书信',
    notice: '通知',
    poster: '海报',
    proposal: '倡议书',
    memo: '备忘录',
    other: '其他',
  }

  const levelMap: Record<string, string> = {
    cet4: '四级',
    cet6: '六级',
  }

  const difficultyMap: Record<string, string> = {
    easy: '简单',
    medium: '中等',
    hard: '困难',
  }

  const columns = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => typeMap[type] || type,
    },
    {
      title: '等级',
      dataIndex: 'level',
      key: 'level',
      render: (level: string) => levelMap[level] || level,
    },
    {
      title: '话题',
      dataIndex: 'topic',
      key: 'topic',
    },
    {
      title: '难度',
      dataIndex: 'difficulty',
      key: 'difficulty',
      render: (difficulty: string) => difficultyMap[difficulty] || difficulty,
    },
    {
      title: '年份',
      dataIndex: 'year',
      key: 'year',
    },
    {
      title: '词数范围',
      key: 'wordCount',
      render: (_: any, record: Question) => `${record.wordCountMin}-${record.wordCountMax}`,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => date ? new Date(date).toLocaleString('zh-CN') : '-',
    },
    {
      title: '启用',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 70,
      render: (_: any, record: Question) => (
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
      render: (_: any, record: Question) => (
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
            title="确定删除该题目？"
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
          <h1 className="text-2xl font-bold">在线写作</h1>
          <span className="text-sm text-gray-400 mt-1">共 {total} 条</span>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          添加题目
        </Button>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex flex-wrap items-center gap-3">
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
          <span className="text-gray-500 text-sm whitespace-nowrap">题型：</span>
          <Select
            placeholder="全部"
            value={typeFilter}
            onChange={(value) => {
              setTypeFilter(value)
              setPage(1)
            }}
            style={{ width: 100 }}
          >
            <Select.Option value="">全部</Select.Option>
            {Object.entries(typeMap).map(([key, label]) => (
              <Select.Option key={key} value={key}>{label}</Select.Option>
            ))}
          </Select>
          <span className="text-gray-500 text-sm whitespace-nowrap">等级：</span>
          <Select
            placeholder="全部"
            value={levelFilter}
            onChange={(value) => {
              setLevelFilter(value)
              setPage(1)
            }}
            style={{ width: 100 }}
          >
            <Select.Option value="">全部</Select.Option>
            <Select.Option value="cet4">四级</Select.Option>
            <Select.Option value="cet6">六级</Select.Option>
          </Select>
          <span className="text-gray-500 text-sm whitespace-nowrap">难度：</span>
          <Select
            placeholder="全部"
            value={difficultyFilter}
            onChange={(value) => {
              setDifficultyFilter(value)
              setPage(1)
            }}
            style={{ width: 100 }}
          >
            <Select.Option value="">全部</Select.Option>
            <Select.Option value="easy">简单</Select.Option>
            <Select.Option value="medium">中等</Select.Option>
            <Select.Option value="hard">困难</Select.Option>
          </Select>
          <span className="text-gray-500 text-sm whitespace-nowrap">年份：</span>
          <Select
            placeholder="全部"
            value={yearFilter}
            onChange={(value) => {
              setYearFilter(value)
              setPage(1)
            }}
            style={{ width: 100 }}
          >
            <Select.Option value="">全部</Select.Option>
            {yearOptions.map((y) => (
              <Select.Option key={y} value={String(y)}>{y}年</Select.Option>
            ))}
          </Select>
        </div>
        {selectedRowKeys.length > 0 && (
          <Popconfirm
            title={`确定删除选中的 ${selectedRowKeys.length} 道题目吗？`}
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
        <Popconfirm title={`确定要${typeFilter || levelFilter ? '将当前筛选' : '将全部'}题目全部启用吗？`} onConfirm={() => handleBatchToggle(true)} okText="确定" cancelText="取消">
          <Button size="small" type="primary" ghost>全部启用</Button>
        </Popconfirm>
        <Popconfirm title={`确定要${typeFilter || levelFilter ? '将当前筛选' : '将全部'}题目全部禁用吗？`} onConfirm={() => handleBatchToggle(false)} okText="确定" cancelText="取消">
          <Button size="small" danger>全部禁用</Button>
        </Popconfirm>
      </div>

      <Table
        columns={columns}
        dataSource={questions}
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
        title={editingQuestion ? '编辑题目' : '添加题目'}
        visible={isModalVisible}
        onOk={handleSave}
        onCancel={() => {
          setIsModalVisible(false)
          setEditingQuestion(null)
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
            label="题目内容"
            rules={[{ required: true, message: '请输入题目内容' }]}
          >
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item
            name="requirements"
            label="写作要求"
          >
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item
            name="type"
            label="题目类型"
            rules={[{ required: true, message: '请选择题目类型' }]}
          >
            <Select>
              {Object.entries(typeMap).map(([key, label]) => (
                <Select.Option key={key} value={key}>{label}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="level"
            label="适用等级"
            rules={[{ required: true, message: '请选择适用等级' }]}
          >
            <Select>
              <Select.Option value="cet4">四级</Select.Option>
              <Select.Option value="cet6">六级</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="topic"
            label="话题"
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="difficulty"
            label="难度"
            rules={[{ required: true, message: '请选择难度' }]}
          >
            <Select>
              {Object.entries(difficultyMap).map(([key, label]) => (
                <Select.Option key={key} value={key}>{label}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="year"
            label="年份"
          >
            <InputNumber min={2000} max={2025} />
          </Form.Item>
          <Form.Item
            name="isAiGenerated"
            label="AI生成"
          >
            <Select>
              <Select.Option value={false}>否</Select.Option>
              <Select.Option value={true}>是</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="wordCountMin"
            label="最少词数"
            rules={[{ required: true, message: '请输入最少词数' }]}
          >
            <InputNumber min={50} max={500} />
          </Form.Item>
          <Form.Item
            name="wordCountMax"
            label="最多词数"
            rules={[{ required: true, message: '请输入最多词数' }]}
          >
            <InputNumber min={50} max={500} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default QuestionManagement