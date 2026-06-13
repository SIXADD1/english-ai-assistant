import React, { useState, useEffect, useCallback } from 'react'
import { Card, Row, Col, Select, Tag, Empty, Spin, Modal, Pagination, message } from 'antd'
import { useNavigate } from 'react-router-dom'
import type { Question } from '../../types'
import { useWritingStore } from '../../stores/writingStore'
import { questionService } from '../../services/questionService'

const Writing: React.FC = () => {
  const navigate = useNavigate()
  const { setCurrentQuestion, setTimer } = useWritingStore()
  const [loading, setLoading] = useState(false)
  const [questions, setQuestions] = useState<Question[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(8)
  const [filters, setFilters] = useState({ level: '', type: '', difficulty: '', year: '' })
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null)

  const loadQuestions = useCallback(async (p?: number, ps?: number) => {
    const currentPage = p ?? page
    const currentPageSize = ps ?? pageSize
    setLoading(true)
    try {
      const data = await questionService.getQuestions({
        level: filters.level || undefined,
        type: filters.type || undefined,
        difficulty: filters.difficulty || undefined,
        year: filters.year || undefined,
        page: currentPage,
        pageSize: currentPageSize,
      })
      setQuestions(data.questions)
      setTotal(data.total)
    } catch {
      message.error('加载题目失败')
    } finally {
      setLoading(false)
    }
  }, [filters, page, pageSize])

  useEffect(() => {
    window.scrollTo(0, 0)
    setPage(1)
    loadQuestions(1)
  }, [filters])

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value || '' }))
  }

  const handlePageChange = (p: number, ps: number) => {
    setPage(p)
    setPageSize(ps)
    loadQuestions(p, ps)
  }

  const yearOptions = [2025, 2024, 2023, 2022, 2021]

  const startWriting = () => {
    if (selectedQuestion) {
      setCurrentQuestion(selectedQuestion)
      setTimer(30 * 60)
      navigate(`/writing/${selectedQuestion.id}`)
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    const colors: Record<string, string> = {
      easy: 'green',
      medium: 'orange',
      hard: 'red',
    }
    return colors[difficulty] || 'default'
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      argumentative: '议论文',
      letter: '书信',
      notice: '通知',
      proposal: '倡议书',
      poster: '海报',
      memo: '备忘录',
      other: '其他',
    }
    return labels[type] || type
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">在线写作</h1>
        <p className="text-gray-600">全真考场环境，完成作文实战练习，支持 AI 智能批改</p>
      </div>

      <Card className="mb-6 border-0 card-shadow" styles={{ body: { padding: '1.5rem' } }}>
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Row gutter={16}>
              <Col>
                <Select
                  placeholder="级别筛选"
                  style={{ width: 120 }}
                  allowClear
                  onChange={(value) => handleFilterChange('level', value)}
                >
                  <Select.Option value="cet4">四级</Select.Option>
                  <Select.Option value="cet6">六级</Select.Option>
                </Select>
              </Col>
              <Col>
                <Select
                  placeholder="题型筛选"
                  style={{ width: 140 }}
                  allowClear
                  onChange={(value) => handleFilterChange('type', value)}
                >
                  <Select.Option value="argumentative">议论文</Select.Option>
                  <Select.Option value="letter">书信</Select.Option>
                  <Select.Option value="notice">通知</Select.Option>
                  <Select.Option value="proposal">倡议书</Select.Option>
                  <Select.Option value="poster">海报</Select.Option>
                  <Select.Option value="memo">备忘录</Select.Option>
                  <Select.Option value="other">其他</Select.Option>
                </Select>
              </Col>
              <Col>
                <Select
                  placeholder="难度筛选"
                  style={{ width: 120 }}
                  allowClear
                  onChange={(value) => handleFilterChange('difficulty', value)}
                >
                  <Select.Option value="easy">简单</Select.Option>
                  <Select.Option value="medium">中等</Select.Option>
                  <Select.Option value="hard">困难</Select.Option>
                </Select>
              </Col>
              <Col>
                <Select
                  placeholder="年份筛选"
                  style={{ width: 120 }}
                  allowClear
                  onChange={(value) => handleFilterChange('year', value)}
                >
                  {yearOptions.map((year) => (
                    <Select.Option key={year} value={String(year)}>{year}年</Select.Option>
                  ))}
                </Select>
              </Col>
            </Row>
          </Col>
        </Row>
      </Card>

      <Spin spinning={loading}>
        {questions.length > 0 ? (
          <>
            <Row gutter={[24, 24]}>
              {questions.map((question) => (
                <Col xs={24} md={12} lg={8} xl={6} key={question.id}>
                  <Card
                    hoverable
                    className="h-full border-0 card-shadow"
                    styles={{ body: { padding: '1.5rem' } }}
                    onClick={() => setSelectedQuestion(question)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <Tag color={question.level === 'cet4' ? 'blue' : 'purple'}>
                        {question.level === 'cet4' ? '四级' : '六级'}
                      </Tag>
                      <Tag color={getDifficultyColor(question.difficulty)}>
                        {question.difficulty === 'easy' ? '简单' : question.difficulty === 'medium' ? '中等' : '困难'}
                      </Tag>
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{question.title}</h3>
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">{question.content}</p>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>题型：{getTypeLabel(question.type)}</span>
                      <span>{question.wordCountMin}-{question.wordCountMax}词</span>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
            <div className="flex justify-center mt-8">
              <Pagination
                current={page}
                pageSize={pageSize}
                total={total}
                onChange={handlePageChange}
                showSizeChanger
                showTotal={(t) => `共 ${t} 道`}
                pageSizeOptions={['8', '16', '24', '32']}
              />
            </div>
          </>
        ) : (
          <Empty description="未找到符合条件的题目" />
        )}
      </Spin>

      <Modal
        title={selectedQuestion?.title}
        open={!!selectedQuestion}
        onCancel={() => setSelectedQuestion(null)}
        onOk={startWriting}
        okText="开始写作"
        width={700}
      >
        {selectedQuestion && (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-gray-800 leading-relaxed">{selectedQuestion.content}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Tag color="blue">{selectedQuestion.level === 'cet4' ? '四级' : '六级'}</Tag>
              <Tag color="green">{getTypeLabel(selectedQuestion.type)}</Tag>
              <Tag>{selectedQuestion.wordCountMin}-{selectedQuestion.wordCountMax}词</Tag>
              {selectedQuestion.year && <Tag>{selectedQuestion.year}年</Tag>}
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">写作提示：</h4>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                <li>考试时长：30分钟</li>
                <li>字数要求：{selectedQuestion.wordCountMin}-{selectedQuestion.wordCountMax}词</li>
                <li>请注意格式规范和语言表达</li>
                <li>完成后可提交 AI 批改</li>
              </ul>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default Writing
