import React, { useEffect, useState } from 'react'
import { Card, Row, Col, Button, Tag, Progress, Divider, Spin, Alert, Typography, Tooltip } from 'antd'
import {
  ArrowLeftOutlined,
  CloseCircleOutlined,
  TrophyOutlined,
  BulbOutlined,
  MessageOutlined,
} from '@ant-design/icons'
import { useParams, useNavigate } from 'react-router-dom'
import { correctionService } from '../../services/correctionService'

const { Title, Paragraph, Text } = Typography

// 处理原文，把错误位置标红
const renderEssayWithErrors = (essay: string, errors: any[]) => {
  if (!errors || errors.length === 0) {
    return <Paragraph>{essay}</Paragraph>
  }

  // 先按 original 在文中的位置排序
  const sortedErrors = [...errors]
    .map(error => {
      // 在原文中查找 original 的位置
      const original = error.original || ''
      const index = essay.indexOf(original)
      return { ...error, foundStart: index, foundEnd: index + original.length }
    })
    .filter(error => error.foundStart >= 0)
    .sort((a, b) => a.foundStart - b.foundStart)

  const parts: any[] = []
  let lastIndex = 0

  sortedErrors.forEach((error, index) => {
    const start = error.foundStart
    const end = error.foundEnd

    // 添加错误前的文本
    if (start > lastIndex) {
      parts.push(<span key={`text-${index}`}>{essay.substring(lastIndex, start)}</span>)
    }

    // 添加标红的错误
    if (end > start && start < essay.length) {
      const tooltipContent = (
        <div style={{ maxWidth: 320 }}>
          <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 14 }}>
            <Tag color="red" style={{ marginRight: 6 }}>{error.type}</Tag>
          </div>
          <div style={{ marginBottom: 4, fontSize: 13 }}>
            <span style={{ color: '#ff4d4f', textDecoration: 'line-through' }}>{error.original}</span>
            <span style={{ margin: '0 6px', color: '#999' }}>→</span>
            <span style={{ color: '#52c41a', fontWeight: 600 }}>{error.corrected}</span>
          </div>
          {error.reason && (
            <div style={{ fontSize: 13, color: '#595959', lineHeight: 1.6, marginTop: 4 }}>
              {error.reason}
            </div>
          )}
        </div>
      )
      parts.push(
        <Tooltip
          key={`error-${index}`}
          title={tooltipContent}
          placement="top"
          color="#fff"
          overlayInnerStyle={{
            padding: '12px 16px',
            borderRadius: 8,
            boxShadow: '0 6px 16px rgba(0,0,0,0.12)',
          }}
        >
          <span className="bg-red-100 text-red-700 px-1 rounded border border-red-200 cursor-pointer hover:bg-red-200 transition-colors">
            {essay.substring(start, Math.min(end, essay.length))}
          </span>
        </Tooltip>
      )
    }

    lastIndex = end
  })

  // 添加剩余文本
  if (lastIndex < essay.length) {
    parts.push(<span key="text-end">{essay.substring(lastIndex)}</span>)
  }

  return <Paragraph>{parts}</Paragraph>
}

// 解析高分改写中的 **标记** 为加粗，[优化点] 标记为红色
const renderRevisedWithHighlights = (text: string) => {
  if (!text) return null

  // 先处理优化点标记，把它们替换成特殊占位符，避免和 ** 标记冲突
  // 然后再一起渲染
  let result: any[] = []
  let lastIndex = 0

  // 先处理 ** 标记和中文括号注释，合并处理
  const combinedRegex = /(\*\*.*?\*\*)|(【.*?】)/g
  let match

  while ((match = combinedRegex.exec(text)) !== null) {
    // 添加标记前的文本
    if (match.index > lastIndex) {
      result.push(<span key={`text-${match.index}`}>{text.substring(lastIndex, match.index)}</span>)
    }

    if (match[1]) {
      // 处理 ** 标记，改为绿色加粗
      const content = match[1].slice(2, -2)
      result.push(<strong key={`bold-${match.index}`} className="text-green-700">{content}</strong>)
    } else if (match[2]) {
      // 处理优化点标记，改为红色
      result.push(<span key={`note-${match.index}`} className="text-red-600 font-medium">{match[2]}</span>)
    }

    lastIndex = match.index + match[0].length
  }

  // 添加剩余文本
  if (lastIndex < text.length) {
    result.push(<span key="text-end">{text.substring(lastIndex)}</span>)
  }

  return result
}

// 解析嵌套的 JSON 字符串字段（顶层 key 已由 api 拦截器转为驼峰命名）
const parseNestedJson = (data: any) => {
  return {
    ...data,
    score: data.score || 0,
    scoreBreakdown: data.scoreBreakdown ? (typeof data.scoreBreakdown === 'string' ? JSON.parse(data.scoreBreakdown) : data.scoreBreakdown) : {
      content: 0,
      structure: 0,
      language: 0,
      format: 0
    },
    overallComment: data.overallComment || '暂无总评',
    errorList: data.errorList ? (typeof data.errorList === 'string' ? JSON.parse(data.errorList) : data.errorList) : [],
    formatErrors: data.formatErrors ? (typeof data.formatErrors === 'string' ? JSON.parse(data.formatErrors) : data.formatErrors) : [],
    contentComments: data.contentComments ? (typeof data.contentComments === 'string' ? JSON.parse(data.contentComments) : data.contentComments) : [],
    suggestions: data.suggestions ? (typeof data.suggestions === 'string' ? JSON.parse(data.suggestions) : data.suggestions) : [],
    revisedVersion: data.revisedVersion || '暂无改写版本',
    essayContent: data.essayContent || '暂无原文',
    reviewReport: data.reviewReport ? (typeof data.reviewReport === 'string' ? JSON.parse(data.reviewReport) : data.reviewReport) : {
      strengths: [],
      weaknesses: [],
      improvementPlan: []
    },
    createdAt: data.createdAt || new Date().toISOString()
  }
}

const Correction: React.FC = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    window.scrollTo(0, 0)
    const fetchCorrection = async () => {
      console.log('[调试] 开始加载批改结果, id:', id)
      if (!id) {
        setError('缺少批改ID')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        const data = await correctionService.getCorrectionResult(id)
        console.log('[调试] 从后端获取的数据:', data)
        const convertedData = parseNestedJson(data)
        console.log('[调试] 转换后的数据:', convertedData)
        setResult(convertedData)
      } catch (err: any) {
        console.error('[调试] 获取批改结果失败:', err)
        setError(err.message || '获取批改结果失败，请稍后重试')
      } finally {
        setLoading(false)
      }
    }
    fetchCorrection()
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Spin size="large" tip="加载批改结果中..." />
          <div className="mt-4 text-gray-500">
            <p>批改ID: {id}</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
        <Card style={{ maxWidth: 600, width: '100%' }}>
          <Alert
            message="加载失败"
            description={error}
            type="error"
            showIcon
          />
          <div className="mt-4">
            <Button type="primary" onClick={() => navigate('/personal')}>
              返回个人中心
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  if (!result) {
    return null
  }

  const getScoreColor = (score: number) => {
    if (score >= 11) return '#10b981'
    if (score >= 8) return '#3b82f6'
    return '#f59e0b'
  }

  const getTagColor = (score: number) => {
    if (score >= 11) return 'success'
    if (score >= 8) return 'blue'
    return 'warning'
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/personal')}
        >
          返回个人中心
        </Button>
      </div>

      {/* 标题和总分 */}
      <div className="mb-8">
        <Title level={2} className="!mb-0">
          作文批改结果
        </Title>
        <div className="flex items-center gap-4 mt-2">
          <Tag color={getTagColor(result.score)} className="!text-lg !px-4 !py-1">
            总分: {result.score} / 15
          </Tag>
          <Text type="secondary">
            {new Date(result.createdAt).toLocaleString('zh-CN')}
          </Text>
        </div>
      </div>

      <Row gutter={[24, 24]}>
        {/* 左侧：分数和原文 */}
        <Col xs={24} lg={8}>
          {/* 分数和统计 */}
          <Card className="shadow-sm mb-6">
            <div className="text-center mb-6">
              <Title level={1} style={{ color: getScoreColor(result.score), margin: 0 }}>
                {result.score}
              </Title>
              <Text type="secondary">/ 15</Text>
            </div>

            <Divider />

            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <Text strong>内容</Text>
                  <Text>{result.scoreBreakdown?.content || 0} / 6</Text>
                </div>
                <Progress
                  percent={((result.scoreBreakdown?.content || 0) / 6) * 100}
                  strokeColor="#3b82f6"
                  showInfo={false}
                />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <Text strong>结构</Text>
                  <Text>{result.scoreBreakdown?.structure || 0} / 3</Text>
                </div>
                <Progress
                  percent={((result.scoreBreakdown?.structure || 0) / 3) * 100}
                  strokeColor="#10b981"
                  showInfo={false}
                />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <Text strong>语言</Text>
                  <Text>{result.scoreBreakdown?.language || 0} / 4</Text>
                </div>
                <Progress
                  percent={((result.scoreBreakdown?.language || 0) / 4) * 100}
                  strokeColor="#f59e0b"
                  showInfo={false}
                />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <Text strong>格式</Text>
                  <Text>{result.scoreBreakdown?.format || 0} / 2</Text>
                </div>
                <Progress
                  percent={((result.scoreBreakdown?.format || 0) / 2) * 100}
                  strokeColor="#8b5cf6"
                  showInfo={false}
                />
              </div>
            </div>
          </Card>

          {/* 原文 */}
          <Card
            title={
              <span className="flex items-center gap-2">
                <MessageOutlined />
                你的原文
              </span>
            }
            className="shadow-sm"
          >
            <div className="bg-gray-50 p-4 rounded-lg">
              {renderEssayWithErrors(result.essayContent, result.errorList)}
            </div>
            {result.errorList && result.errorList.length > 0 && (
              <div className="mt-3 text-xs text-gray-500">
                <span className="inline-block w-3 h-3 bg-red-100 border border-red-200 rounded mr-1 align-middle"></span>
                红色标记为错误位置，可悬停查看详细原因
              </div>
            )}
          </Card>
        </Col>

        {/* 右侧：详细内容 */}
        <Col xs={24} lg={16}>
          <Row gutter={[16, 16]}>
            {/* 总评 */}
            <Col xs={24}>
              <Card
                title={
                  <span className="flex items-center gap-2">
                    <MessageOutlined />
                    总评
                  </span>
                }
                className="shadow-sm"
              >
                <div className="text-gray-700 leading-relaxed">
                  {result.overallComment.split('\n').map((paragraph: string, index: number) => (
                    paragraph ? <Paragraph key={index} className="!mb-3">{paragraph}</Paragraph> : null
                  ))}
                </div>
              </Card>
            </Col>

            {/* 错误列表 */}
            {result.errorList && result.errorList.length > 0 && (
              <Col xs={24}>
                <Card
                  title={
                    <span className="flex items-center gap-2">
                      <CloseCircleOutlined className="text-red-500" />
                      详细错误分析
                    </span>
                  }
                  className="shadow-sm"
                >
                  <div className="space-y-4">
                    {result.errorList.map((error: any, index: number) => (
                      <div
                        key={index}
                        className="p-5 bg-red-50 rounded-lg border border-red-100"
                      >
                        <div className="flex gap-3">
                          <span className="text-red-600 font-bold shrink-0 text-lg">
                            {index + 1}.
                          </span>
                          <div className="flex-1">
                            <div className="flex gap-2 items-center mb-2">
                              <Tag color="red">
                                {error.type}
                              </Tag>
                              <Text delete className="text-red-600 font-medium">
                                {error.original}
                              </Text>
                              <Text type="secondary">→</Text>
                              <Text className="text-green-600 font-bold">
                                {error.corrected}
                              </Text>
                            </div>
                            {error.reason && (
                              <Text type="secondary" className="text-sm mb-2 block">
                                {error.reason}
                              </Text>
                            )}
                            {error.explanation && (
                              <div className="mt-3 p-3 bg-white rounded border border-gray-200">
                                <Text type="secondary" className="text-sm font-bold block mb-1">
                                  📚 详细解析：
                                </Text>
                                <Paragraph className="text-sm mb-0 text-gray-700">
                                  {error.explanation}
                                </Paragraph>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </Col>
            )}

            {/* 优化建议 */}
            {result.suggestions && result.suggestions.length > 0 && (
              <Col xs={24}>
                <Card
                  title={
                    <span className="flex items-center gap-2">
                      <BulbOutlined className="text-yellow-500" />
                      优化建议
                    </span>
                  }
                  className="shadow-sm"
                >
                  <ul className="space-y-2">
                    {result.suggestions.map((suggestion: string, index: number) => (
                      <li
                        key={index}
                        className="flex items-start gap-2 text-gray-700"
                      >
                        <span className="text-yellow-500 mt-1">•</span>
                        <span>{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </Col>
            )}

            {/* 高分改写 */}
            {result.revisedVersion && (
              <Col xs={24}>
                <Card
                  title={
                    <span className="flex items-center gap-2">
                      <TrophyOutlined className="text-green-500" />
                      高分改写
                    </span>
                  }
                  className="shadow-sm"
                >
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-lg">
                    <div
                      style={{
                        whiteSpace: 'pre-wrap',
                        fontFamily: 'inherit',
                        lineHeight: '1.8',
                        fontSize: '15px',
                      }}
                    >
                      {renderRevisedWithHighlights(result.revisedVersion)}
                    </div>
                  </div>
                </Card>
              </Col>
            )}
          </Row>
        </Col>
      </Row>
      <div className="text-center mt-8 pb-4">
        <span className="inline-block bg-gray-100 text-gray-500 text-sm rounded-full px-4 py-1.5">
          ✦ 本批改结果由AI辅助生成
        </span>
      </div>
    </div>
  )
}

export default Correction
