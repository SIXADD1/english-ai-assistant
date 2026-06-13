import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Button, Space, message, Spin, Modal, Alert, Typography } from 'antd'
import { ArrowLeftOutlined, SaveOutlined, SendOutlined, ClockCircleOutlined } from '@ant-design/icons'
import TextArea from 'antd/es/input/TextArea'
import { questionService } from '../../services/questionService'
import { useWritingStore } from '../../stores/writingStore'
import type { Question } from '../../types'

const { Paragraph } = Typography

const WritingPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { setCurrentQuestion, setCurrentDraft, updateDraftContent } = useWritingStore()

  const [loading, setLoading] = useState(true)
  const [question, setQuestion] = useState<Question | null>(null)
  const [content, setContent] = useState('')
  const [wordCount, setWordCount] = useState(0)
  const [timeLeft, setTimeLeft] = useState(30 * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showSubmitModal, setShowSubmitModal] = useState(false)

  useEffect(() => {
    window.scrollTo(0, 0)
    if (id) {
      loadQuestion(id)
    }
  }, [id])

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false)
            message.warning('时间到！请提交您的作文。')
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRunning])

  const loadQuestion = async (questionId: string) => {
    try {
      setLoading(true)
      const data = await questionService.getQuestionById(questionId)
      setQuestion(data)
      setCurrentQuestion(data)

      const existingDraft = await questionService.getDraft(questionId)
      if (existingDraft) {
        setContent(existingDraft.content || '')
        setWordCount(countWords(existingDraft.content || ''))
        setCurrentDraft(existingDraft)
      } else {
        setContent('')
        setWordCount(0)
      }
      setIsRunning(true)
    } catch (error) {
      console.error('加载题目失败:', error)
      message.error('加载题目失败，请返回重试')
      setQuestion(null)
    } finally {
      setLoading(false)
    }
  }

  const countWords = (text: string): number => {
    const trimmed = text.trim()
    if (!trimmed) return 0
    return trimmed.split(/\s+/).filter(Boolean).length
  }

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setContent(value)
    setWordCount(countWords(value))
    setHasUnsavedChanges(true)
    updateDraftContent(value)
  }

  const handleSaveDraft = useCallback(async () => {
    if (!id || !content.trim()) return

    try {
      setIsSaving(true)
      const timeSpent = 30 * 60 - timeLeft
      const draft = await questionService.saveDraft(id, content, timeSpent)
      setCurrentDraft(draft)
      setHasUnsavedChanges(false)
      message.success('草稿保存成功')
    } catch (error) {
      message.error('保存草稿失败')
      console.error('保存草稿失败:', error)
    } finally {
      setIsSaving(false)
    }
  }, [id, content, timeLeft])

  useEffect(() => {
    if (hasUnsavedChanges && content.trim()) {
      const timeout = setTimeout(() => {
        handleSaveDraft()
      }, 5000)
      return () => clearTimeout(timeout)
    }
  }, [content, hasUnsavedChanges])

  const handleSubmit = async () => {
    if (!id) return

    const minWords = question?.wordCountMin || 120
    const maxWords = question?.wordCountMax || 180

    if (wordCount < minWords) {
      message.warning(`作文字数不足，请至少写 ${minWords} 词`)
      return
    }

    if (wordCount > maxWords * 1.2) {
      message.warning(`作文字数超出上限，请控制在 ${maxWords} 词以内`)
      return
    }

    setShowSubmitModal(false)
    setIsSubmitting(true)
    setIsRunning(false)

    try {
      const timeSpent = 30 * 60 - timeLeft
      const result = await questionService.submitWriting(id, content, timeSpent)

      if (result) {
        message.success('作文提交成功！正在等待AI批改...')
        const correctionId = result.id
        if (correctionId) {
          navigate(`/correction/${correctionId}`)
        } else {
          navigate('/personal')
        }
      } else {
        message.error('提交失败，请重试')
      }
    } catch (error: any) {
      if (error.response?.status === 503) {
        message.warning('AI批改服务暂时不可用，您的作文已保存')
        navigate('/personal')
      } else {
        message.error('提交失败，请重试')
        console.error('提交失败:', error)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBack = () => {
    if (hasUnsavedChanges) {
      Modal.confirm({
        title: '还有未保存的内容',
        content: '确定要返回吗？未保存的内容将会丢失。',
        okText: '保存并返回',
        cancelText: '直接返回',
        onOk: async () => {
          try {
            await handleSaveDraft()
          } catch (e) {
            console.error('保存失败:', e)
          }
          navigate('/writing')
        },
        onCancel: () => {
          navigate('/writing')
        },
      })
    } else {
      navigate('/writing')
    }
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const getTimeColor = () => {
    if (timeLeft <= 60) return '#ef4444'
    if (timeLeft <= 300) return '#f59e0b'
    return '#10b981'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Spin size="large" tip="加载题目中..." />
      </div>
    )
  }

  if (!question) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card style={{ textAlign: 'center' }}>
          <Paragraph>题目加载失败</Paragraph>
          <Button type="primary" onClick={() => navigate('/writing')}>
            返回写作页面
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Spin spinning={isSubmitting} tip="正在提交，请稍候...（30秒内）">
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            <Space>
              <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
                返回
              </Button>
              <span className="text-lg font-semibold">{question.title}</span>
            </Space>
            <Space size="large">
              <div className="flex items-center gap-2">
                <ClockCircleOutlined style={{ color: getTimeColor() }} />
                <span
                  style={{ color: getTimeColor(), fontSize: 20, fontWeight: 'bold' }}
                >
                  {formatTime(timeLeft)}
                </span>
              </div>
              <div className="text-gray-600">
                字数：<span className={wordCount < (question.wordCountMin || 120) ? 'text-red-500' : 'text-green-500'}>
                  {wordCount}
                </span> / {question.wordCountMin}-{question.wordCountMax}
              </div>
              <Button
                icon={<SaveOutlined />}
                onClick={handleSaveDraft}
                loading={isSaving}
                disabled={!content.trim()}
              >
                保存草稿
              </Button>
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={() => setShowSubmitModal(true)}
                disabled={!content.trim()}
              >
                提交批改
              </Button>
            </Space>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-6">
          <Card className="mb-4" styles={{ body: { padding: '1.5rem' } }}>
            <Alert
              message="写作要求"
              description={
                <div className="space-y-2">
                  <p className="font-medium">{question.content}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                      {question.level === 'cet4' ? '四级' : '六级'}
                    </span>
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
                      {question.type === 'argumentative' ? '议论文' :
                       question.type === 'letter' ? '书信' :
                       question.type === 'notice' ? '通知' :
                       question.type === 'poster' ? '海报' :
                       question.type === 'proposal' ? '倡议书' :
                       question.type === 'memo' ? '备忘录' : '其他'}
                    </span>
                    <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm">
                      {question.wordCountMin}-{question.wordCountMax}词
                    </span>
                  </div>
                </div>
              }
              type="info"
              showIcon
            />
          </Card>

          <Card styles={{ body: { padding: 0 } }}>
            <TextArea
              value={content}
              onChange={handleContentChange}
              placeholder="请在这里输入您的作文..."
              autoSize={{ minRows: 20, maxRows: 30 }}
              style={{
                border: 'none',
                borderRadius: 0,
                fontSize: 16,
                lineHeight: 1.8,
                padding: '1.5rem',
              }}
            />
          </Card>

          {wordCount > 0 && wordCount < (question.wordCountMin || 120) && (
            <Alert
              message="字数不足"
              description={`请至少写 ${question.wordCountMin} 词，当前字数：${wordCount} 词`}
              type="warning"
              showIcon
              className="mt-4"
            />
          )}
        </div>
      </Spin>

      <Modal
        title="确认提交"
        open={showSubmitModal}
        onOk={handleSubmit}
        onCancel={() => setShowSubmitModal(false)}
        okText="确认提交"
        cancelText="继续写作"
      >
        <div className="space-y-4">
          <p>确定要提交作文进行批改吗？</p>
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <p>字数：{wordCount} 词</p>
            <p>耗时：约 {Math.floor((30 * 60 - timeLeft) / 60)} 分钟</p>
          </div>
          <p className="text-gray-600 text-sm">
            提交后将无法修改，AI批改可能需要几分钟时间。
          </p>
        </div>
      </Modal>
    </div>
  )
}

export default WritingPage