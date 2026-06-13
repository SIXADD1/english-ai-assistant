import React, { useState, useEffect, useCallback } from 'react'
import { Card, Row, Col, Button, Tag, Modal, Divider, Pagination, Spin, Empty, message } from 'antd'
import {
  TrophyOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { mockExamService, type MockExam, type MockExamStats, levelLabels, categoryLabels, type ExamCategory, type ExamLevel } from '../../services/mockExamService'

const MockExamPage: React.FC = () => {
  const navigate = useNavigate()
  const [exams, setExams] = useState<MockExam[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(6)
  const [activeTab, setActiveTab] = useState('all')
  const [stats, setStats] = useState<MockExamStats>({ total: 0, completed: 0, avgScore: 0, passRate: 0 })
  const [selectedExam, setSelectedExam] = useState<MockExam | null>(null)

  const loadExams = useCallback(async (p?: number, ps?: number) => {
    const currentPage = p ?? page
    const currentPageSize = ps ?? pageSize
    setLoading(true)
    try {
      const tabConf = tabs.find(t => t.key === activeTab)
      const params: { page: number; pageSize: number; level?: string; status?: string } = {
        page: currentPage,
        pageSize: currentPageSize,
        ...(tabConf?.params || {})
      }
      const data = await mockExamService.getList(params)
      setExams(data.exams)
      setTotal(data.total)
      if (data.stats) setStats(data.stats)
    } catch (error: any) {
      console.error('加载模考列表失败:', error)
      console.error('错误详情:', error.response?.data || error.message)
      const errorMsg = error.response?.data?.error || error.response?.statusText || '加载模考列表失败'
      message.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }, [activeTab, page, pageSize])

  useEffect(() => {
    setPage(1)
    loadExams(1)
    window.scrollTo(0, 0)
  }, [activeTab])

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
  }

  const handlePageChange = (p: number, ps: number) => {
    setPage(p)
    setPageSize(ps)
    loadExams(p, ps)
  }

  const tabs = [
    { key: 'all', label: '全部', params: {} },
    { key: 'pending', label: '待完成', params: { status: 'pending' } },
    { key: 'completed', label: '已完成', params: { status: 'completed' } },
    { key: 'cet4', label: '四级', params: { level: 'cet4' } },
    { key: 'cet6', label: '六级', params: { level: 'cet6' } },
    { key: 'ky1', label: '考研一', params: { level: 'ky1' } },
    { key: 'ky2', label: '考研二', params: { level: 'ky2' } },
  ]

  const startExam = () => {
    if (selectedExam) {
      message.success(`开始 ${selectedExam.title}`)
      navigate(`/mock-exam/${selectedExam.id}/start`)
    }
  }

  const getQuestionCount = (exam: MockExam) => {
    return (exam.sections || []).reduce((sum, s) => sum + (s.questions?.length || 0), 0)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">模考专区</h1>
        <p className="text-gray-600">全真模拟考场流程，助力考前冲刺</p>
      </div>

      <Row gutter={[24, 24]} className="mb-8">
        <Col xs={12} md={6}>
          <Card className="border-0 card-shadow text-center" styles={{ body: { padding: '1.5rem' } }}>
            <TrophyOutlined className="text-3xl text-yellow-500 mb-2" />
            <div className="text-3xl font-bold mb-1">{stats.total}</div>
            <div className="text-gray-600">试卷总数</div>
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card className="border-0 card-shadow text-center" styles={{ body: { padding: '1.5rem' } }}>
            <CheckCircleOutlined className="text-3xl text-green-500 mb-2" />
            <div className="text-3xl font-bold mb-1">{stats.completed}</div>
            <div className="text-gray-600">已完成</div>
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card className="border-0 card-shadow text-center" styles={{ body: { padding: '1.5rem' } }}>
            <FileTextOutlined className="text-3xl text-blue-500 mb-2" />
            <div className="text-3xl font-bold mb-1">{stats.avgScore}分</div>
            <div className="text-gray-600">平均得分</div>
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card className="border-0 card-shadow text-center" styles={{ body: { padding: '1.5rem' } }}>
            <ClockCircleOutlined className="text-3xl text-purple-500 mb-2" />
            <div className="text-3xl font-bold mb-1">{stats.passRate}%</div>
            <div className="text-gray-600">通过率</div>
          </Card>
        </Col>
      </Row>

      <div className="flex space-x-4 mb-6">
        {tabs.map((tab) => (
          <Button
            key={tab.key}
            type={activeTab === tab.key ? 'primary' : 'default'}
            onClick={() => handleTabChange(tab.key)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      <Spin spinning={loading}>
        {exams.length > 0 ? (
          <>
            <Row gutter={[24, 24]}>
              {exams.map((exam) => (
                <Col xs={24} md={12} lg={8} key={exam.id}>
                  <Card
                    hoverable
                    className="h-full border-0 card-shadow"
                    styles={{ body: { padding: '1.5rem' } }}
                    onClick={() => {
                      if (exam.participationStatus !== 'completed') {
                        setSelectedExam(exam)
                      }
                    }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <Tag color={exam.category === 'real' ? 'red' : 'blue'}>
                          {categoryLabels[exam.category as ExamCategory] || exam.category}
                        </Tag>
                        <Tag color={exam.level === 'cet4' ? 'blue' : exam.level === 'cet6' ? 'purple' : exam.level === 'ky1' ? 'red' : 'orange'}>
                          {levelLabels[exam.level as ExamLevel] || exam.level}
                        </Tag>
                      </div>
                      {exam.participationStatus === 'completed' ? (
                        <Tag color="green">已完成 {exam.score}分</Tag>
                      ) : (
                        <Tag color="orange">待完成</Tag>
                      )}
                    </div>

                    <h3 className="text-xl font-bold mb-3">{exam.title}</h3>
                    <p className="text-gray-600 mb-4">{exam.description}</p>

                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>
                        <ClockCircleOutlined className="mr-1" />
                        {exam.duration}分钟
                      </span>
                      <span>
                        <FileTextOutlined className="mr-1" />
                        {getQuestionCount(exam)}道题
                      </span>
                    </div>

                    {exam.participationStatus === 'completed' && (
                      <div className="mt-4 text-sm text-gray-600">
                        得分：<span className="font-bold text-blue-600">{exam.score}/{exam.maxScore || '—'}</span> 分
                      </div>
                    )}

                    {exam.participationStatus === 'completed' ? (
                      <div className="flex gap-2 mt-4">
                        <Button
                          type="primary"
                          className="flex-1"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/mock-exam/result/${exam.participationId}`)
                          }}
                        >
                          查看详情
                        </Button>
                        <Button
                          className="flex-1"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedExam(exam)
                          }}
                        >
                          重新考试
                        </Button>
                      </div>
                    ) : (
                      <Button type="primary" block className="mt-4">
                        开始模考
                      </Button>
                    )}
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
                showTotal={(t) => `共 ${t} 套`}
                pageSizeOptions={['6', '12', '18', '24']}
              />
            </div>
          </>
        ) : (
          <Empty description="暂无模考数据" />
        )}
      </Spin>

      <Modal
        title={selectedExam?.title}
        open={!!selectedExam}
        onCancel={() => setSelectedExam(null)}
        onOk={startExam}
        okText="开始考试"
        cancelText="取消"
      >
        {selectedExam && (
          <div className="space-y-4">
            <p className="text-gray-700">{selectedExam.description}</p>

            <Divider />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500">考试时长</div>
                <div className="text-lg font-semibold">{selectedExam.duration} 分钟</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">题目数量</div>
                <div className="text-lg font-semibold">{getQuestionCount(selectedExam)} 题</div>
              </div>
            </div>

            <Divider />

            <div className="bg-yellow-50 p-4 rounded-lg">
              <h4 className="font-semibold text-yellow-700 mb-2">⚠️ 考试须知</h4>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                <li>请确保网络环境稳定</li>
                <li>考试期间不可退出</li>
                <li>系统会自动保存草稿</li>
                <li>完成后可立即查看 AI 批改结果</li>
              </ul>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default MockExamPage
