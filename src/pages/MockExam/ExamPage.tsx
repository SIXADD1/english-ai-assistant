import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { 
  Card, Button, Radio, Input, Select, Progress, Tag, Modal, message,
  Layout, Divider, Badge, Popover, Spin, Tooltip
} from 'antd'
import { 
  ClockCircleOutlined, FlagOutlined, CheckCircleOutlined, CloseCircleOutlined,
  LeftOutlined, RightOutlined,
  SendOutlined, BarChartOutlined, SoundOutlined, FileTextOutlined
} from '@ant-design/icons'
import {
  mockExamService, type StartExamResponse, type ExamResult,
  type Section, type SubQuestion, type SectionType
} from '../../services/mockExamService'
import { useExamStore } from '../../stores/examStore'

const { Header, Content, Sider } = Layout
const { Option } = Select

interface SubAnswer {
  userAnswer: string
  flagged: boolean
}

const ExamPage: React.FC = () => {
  const navigate = useNavigate()
  const { examId } = useParams<{ examId: string }>()
  const { setExamInProgress, examInProgress } = useExamStore()
  const [examData, setExamData] = useState<StartExamResponse | null>(null)
  const [sectionIndex, setSectionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, SubAnswer>>({})
  const [timeLeft, setTimeLeft] = useState(0)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<ExamResult | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false)
  const [showBackConfirm, setShowBackConfirm] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const skipScrollTop = useRef(false)
  const [showFullPaper, setShowFullPaper] = useState(false)
  const [openBlankId, setOpenBlankId] = useState<string | null>(null)
  const submitRef = useRef<{ isSubmitted: boolean; examData: typeof examData; submit: () => void }>({
    isSubmitted: false, examData: null, submit: () => {}
  })

  const fmt = (n: number) => parseFloat(n.toFixed(2))

  // 内联渲染选词填空文章（空格为可点击 pill）
  const renderClozePassage = (section: Section) => {
    const parts = (section.passage || '').split('___')
    const wordBank = section.wordBank || []
    const labels = wordBank.map((_, i) => String.fromCharCode(65 + i)) // A, B, C, ...
    return (
      <span className="leading-8">
        {parts.map((part, i) => {
          if (i >= parts.length - 1) return <span key={i}>{part}</span>
          const q = section.questions[i]
          if (!q) return <span key={i}>{part}___</span>
          const gIdx = getGlobalIdx(q.id)
          const userAnswer = answers[q.id]?.userAnswer || ''
          return (
            <span key={i}>
              {part}
              <Popover
                open={openBlankId === q.id}
                onOpenChange={(open) => setOpenBlankId(open ? q.id : null)}
                trigger={['hover', 'click']}
                placement="bottom"
                overlayStyle={{ maxWidth: 300 }}
                content={
                  <div style={{ width: 260 }}>
                    <div className="text-xs text-gray-400 mb-2">第 {gIdx} 题 — 从下方词库选择一个单词填入空格</div>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {wordBank.map((w, wi) => {
                        const l = labels[wi]
                        const selected = userAnswer === w
                        return (
                          <Tag
                            key={w}
                            color={selected ? 'blue' : 'default'}
                            className="cursor-pointer text-sm hover:scale-105 transition-transform"
                            onClick={() => { setAnswer(q.id, w); setOpenBlankId(null) }}
                          >
                            {l}. {w}
                          </Tag>
                        )
                      })}
                    </div>
                    {userAnswer && (
                      <Button size="small" block onClick={() => { setAnswer(q.id, ''); setOpenBlankId(null) }}>
                        清除选择
                      </Button>
                    )}
                  </div>
                }
              >
                <button
                  type="button"
                  className={`inline-flex items-center justify-center px-2 py-0.5 mx-0.5 rounded-[6px] cursor-pointer transition-all font-mono text-sm border align-middle ${
                    userAnswer
                      ? 'bg-blue-50 border-blue-400 text-blue-700 hover:border-blue-500 hover:shadow'
                      : 'bg-gray-100 border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 hover:shadow'
                  }`}
                >
                  {userAnswer ? `${gIdx}.${userAnswer}` : `__${gIdx}__`}
                </button>
              </Popover>
            </span>
          )
        })}
      </span>
    )
  }

  const currentSection = examData?.sections[sectionIndex]
  const totalSections = examData?.sections.length || 0
  const totalQuestions = examData?.sections.reduce((s, sec) => s + sec.questions.length, 0) || 0

  // Global question index map (questionId -> global index starting from 1, skip writing/translation)
  const questionGlobalIdx = useMemo(() => {
    const map: Record<string, number> = {}
    let idx = 0
    examData?.sections.forEach(s => {
      if (s.type === 'writing' || s.type === 'translation') return
      s.questions.forEach(q => {
        map[q.id] = idx++
      })
    })
    return map
  }, [examData])

  const getGlobalIdx = (questionId: string) => (questionGlobalIdx[questionId] ?? 0) + 1

  useEffect(() => {
    const fetchExam = async () => {
      try {
        const data = await mockExamService.startExam(examId!)
        setExamData(data)
        setTimeLeft(data.duration * 60)
        setExamInProgress(true, data.participationId)
      } catch { message.error('获取试卷失败'); navigate('/mock-exam') }
    }
    fetchExam()
    window.scrollTo(0, 0)
  }, [examId, navigate, setExamInProgress])

  // 阻止浏览器刷新/关闭页面
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!isSubmitted && examInProgress) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isSubmitted, examInProgress])

  // 离开页面时标记放弃 + 清除考试状态
  useEffect(() => {
    const participationId = examData?.participationId
    return () => {
      if (participationId && !isSubmitted) {
        mockExamService.abandonExam(participationId).catch(() => {})
      }
      setExamInProgress(false)
    }
  }, [examData?.participationId, isSubmitted, setExamInProgress])

  // Timer
  useEffect(() => {
    if (timeLeft <= 0 || isSubmitted) return
    const timer = setInterval(() => setTimeLeft(t => t - 1), 1000)
    return () => clearInterval(timer)
  }, [timeLeft, isSubmitted])

  // 保持 submitRef 与最新状态同步
  useEffect(() => {
    submitRef.current = { isSubmitted, examData, submit: handleSubmit }
  })

  // Auto-submit when time runs out
  useEffect(() => {
    if (timeLeft <= 0) {
      const { isSubmitted: submitted, examData: data, submit } = submitRef.current
      if (!submitted && data) {
        message.warning('考试时间已到，正在自动交卷...')
        submit()
      }
    }
  }, [timeLeft])

  // Scroll to top when section changes via prev/next buttons
  useEffect(() => {
    if (skipScrollTop.current) {
      skipScrollTop.current = false
      return
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [sectionIndex])

  const goToSection = (idx: number) => {
    skipScrollTop.current = false  // allow scroll-to-top for prev/next
    setSectionIndex(idx)
  }

  const scrollToQuestion = (sectionIdx: number, questionId: string) => {
    if (sectionIdx !== sectionIndex) {
      skipScrollTop.current = true
      setSectionIndex(sectionIdx)
    }
    setTimeout(() => {
      const el = document.getElementById(`question-${questionId}`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, sectionIdx !== sectionIndex ? 150 : 50)
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60), s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  // Answer helpers
  const setAnswer = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: { ...prev[questionId], userAnswer: value } }))
  }
  const toggleFlag = (questionId: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: { ...prev[questionId], flagged: !prev[questionId]?.flagged } }))
  }
  const isAnswered = (id: string) => !!answers[id]?.userAnswer
  const isFlagged = (id: string) => !!answers[id]?.flagged
  const getAnsweredCount = () => Object.values(answers).filter(a => a.userAnswer).length

  // Match answer helper
  const handleMatchingAnswer = (questionId: string, itemValue: string, paragraphIdx: number) => {
    const prev = answers[questionId]?.userAnswer
    let matches: Record<string, number> = {}
    try { if (prev) matches = JSON.parse(prev) } catch {}
    matches[itemValue] = paragraphIdx + 1
    setAnswer(questionId, JSON.stringify(matches))
  }

  // Submit
  const handleSubmit = async () => {
    if (!examData || isSubmitted) return
    setSubmitting(true)
    try {
      const flatAnswers: Record<string, string> = {}
      Object.entries(answers).forEach(([k, v]) => { flatAnswers[k] = v.userAnswer })
      const response = await mockExamService.submitExam(examData.participationId, flatAnswers)
      setIsSubmitted(true)
      setExamInProgress(false)
      setResult(response); setShowResult(true)
    } catch { 
      message.error('提交失败，请检查网络后重试')
    }
    finally { setSubmitting(false) }
  }

  const handleConfirmSubmit = () => {
    const unanswered = totalQuestions - getAnsweredCount()
    if (unanswered > 0) {
      Modal.confirm({
        title: '确认交卷', content: `还有 ${unanswered} 道题目未作答，确定要交卷吗？`,
        okText: '确定交卷', cancelText: '继续答题',
        onOk: () => { setShowSubmitConfirm(false); handleSubmit() }
      })
    } else { setShowSubmitConfirm(false); handleSubmit() }
  }

  // Section type labels
  const sectionLabels: Record<SectionType, string> = {
    listening: '听力理解', reading_cloze: '选词填空', reading_matching: '段落匹配',
    reading_careful: '仔细阅读', translation: '翻译', writing: '写作'
  }

  const typeColor = (t: SectionType) => {
    if (t === 'listening') return 'blue'; if (t.startsWith('reading')) return 'green'
    if (t === 'translation') return 'orange'; return 'purple'
  }

  // === Render Question Content (per sub-question) ===
  const renderSubQuestion = (sq: SubQuestion, _idx: number, section: Section) => {
    const aid = answers[sq.id]
    const userAnswer = aid?.userAnswer || ''

    if (section.type === 'reading_matching') {
      const matches: Record<string, number> = userAnswer ? JSON.parse(userAnswer) : {}
      return (
        <div key={sq.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded">
          <span className="font-bold text-blue-600 w-6">{getGlobalIdx(sq.id)}.</span>
          <span className="flex-1">{sq.title || sq.options?.[0]?.label}</span>
          <Select value={matches[sq.options?.[0]?.value || 'A'] || undefined}
            onChange={(v) => handleMatchingAnswer(sq.id, sq.options?.[0]?.value || 'A', Number(v) - 1)}
            placeholder="选择段落" style={{ width: 120 }}>
            {(section.paragraphs || []).map((_, pi) => {
              const letter = String.fromCharCode(65 + pi)
              return <Option key={pi + 1} value={pi + 1}>段落 {letter}</Option>
            })}
          </Select>
        </div>
      )
    }

    // Choice-based questions (listening, reading_careful)
    if (sq.options?.length) {
      return (
        <div key={sq.id} className="border rounded p-4 mb-3">
          <p className="font-semibold text-gray-700 mb-3">{getGlobalIdx(sq.id)}. {sq.title || '请选择正确答案'}</p>
          <Radio.Group value={userAnswer} className="w-full">
            <div className="space-y-2">
              {sq.options.map(opt => (
                <div key={opt.value}
                  className={`p-2 rounded border cursor-pointer ${userAnswer === opt.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
                  onClick={() => setAnswer(sq.id, userAnswer === opt.value ? '' : opt.value)}
                >
                  <Radio value={opt.value} checked={userAnswer === opt.value}>{opt.value}. {opt.label}</Radio>
                </div>
              ))}
            </div>
          </Radio.Group>
        </div>
      )
    }

    // Cloze — inline pill in passage + dropdown below for dual-answer
    if (section.type === 'reading_cloze') {
      const labels = (section.wordBank || []).map((_, i) => String.fromCharCode(65 + i))
      return (
        <div key={sq.id} className="flex items-center space-x-2 py-2">
          <span className="font-mono text-gray-500 text-sm w-8">{getGlobalIdx(sq.id)}.</span>
          <Select value={userAnswer || undefined} onChange={v => setAnswer(sq.id, v)}
            placeholder="选择单词" style={{ width: 200 }}>
            {(section.wordBank || []).map((w, wi) => <Option key={w} value={w}>{labels[wi]}. {w}</Option>)}
          </Select>
        </div>
      )
    }

    // Writing / Translation
    const wordCount = userAnswer.trim() ? userAnswer.trim().split(/\s+/).filter(Boolean).length : 0
    return (
      <div key={sq.id} className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="font-semibold text-gray-700">{sq.title || sectionLabels[section.type]}</p>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-blue-600 font-medium bg-blue-50 rounded-full px-3 py-0.5">字数：{wordCount}</span>
            <span className="text-xs text-gray-400">{sq.score}分</span>
          </div>
        </div>
        <Input.TextArea rows={section.type === 'writing' ? 12 : 6} value={userAnswer}
          onChange={e => setAnswer(sq.id, e.target.value)}
          placeholder={section.type === 'writing' ? '请输入你的作文...' : '请输入你的翻译...'} />
      </div>
    )
  }

  // === Render Section ===
  const renderSection = () => {
    if (!currentSection) return null

    return (
      <div>
        {/* Audio for listening */}
        {currentSection.type === 'listening' && (
          <div className="bg-blue-50 rounded-lg p-4 mb-4">
            {!examData?.sections?.some(s => s.type === 'listening' && s.audioUrl) && <span className="text-red-500">⚠ 本试卷未设置听力音频</span>}
            {currentSection.passage && <p className="text-gray-600 whitespace-pre-wrap">{currentSection.passage}</p>}
          </div>
        )}

        {/* Passage for reading sections */}
        {['reading_cloze', 'reading_careful', 'reading_matching'].includes(currentSection.type) && currentSection.passage && (
          <details className="mb-4" open>
            <summary className="cursor-pointer text-sm text-blue-600 font-medium mb-2">查看原文</summary>
            <Card title={currentSection.passageTitle || '阅读文章'} className="bg-gray-50">
              <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                {currentSection.type === 'reading_cloze'
                  ? renderClozePassage(currentSection)
                  : currentSection.passage}
              </div>
              {currentSection.type === 'reading_cloze' && currentSection.wordBank && currentSection.wordBank.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200 flex flex-wrap gap-1">
                  <span className="text-xs text-gray-400 mr-1">词库：</span>
                  {currentSection.wordBank.map(w => <Tag key={w} className="text-xs">{w}</Tag>)}
                </div>
              )}
            </Card>
          </details>
        )}

        {/* Paragraphs for matching */}
        {currentSection.type === 'reading_matching' && currentSection.paragraphs && (
          <Card title={<div className="text-center">{currentSection.passageTitle || '段落列表'}</div>} className="mb-4 bg-purple-50">
            <div className="space-y-2">
              {currentSection.paragraphs.map((p, i) => (
                <details key={i} open className="bg-white rounded border group">
                  <summary className="flex items-start cursor-pointer p-3 list-none">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-purple-100 text-purple-600 text-xs font-bold mr-2 mt-0.5 group-open:bg-purple-200 shrink-0">
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="text-sm text-gray-400 group-open:hidden italic">点击展开段落</span>
                    <span className="hidden group-open:inline text-xs text-purple-400 italic mr-2">点击收起</span>
                  </summary>
                  <div className="px-3 pb-3 pt-0 ml-7 text-gray-700 leading-relaxed whitespace-pre-wrap">{p}</div>
                </details>
              ))}
            </div>
          </Card>
        )}

        {/* Requirements for writing/translation */}
        {(currentSection.type === 'writing' || currentSection.type === 'translation') && currentSection.requirements && (
          <div className="bg-yellow-50 rounded p-4 mb-4">
            <p className="font-semibold text-gray-700 mb-1">要求：</p>
            <p className="whitespace-pre-wrap">{currentSection.requirements}</p>
          </div>
        )}

        {/* Sub-questions */}
        <div className="space-y-1">
          {currentSection.questions.map((q, i) => (
            <div key={q.id} id={`question-${q.id}`} className="relative scroll-mt-4">
              <div className="flex items-center">
                {isAnswered(q.id) && <Badge status="success" className="mr-2" />}
                {!isAnswered(q.id) && <Badge status="default" className="mr-2" />}
                <div className="flex-1">
                  {renderSubQuestion(q, i, currentSection)}
                </div>
                <Tooltip title={isFlagged(q.id) ? '取消标记' : '标记此题目'}>
                  <Button type="text" size="small"
                    icon={<FlagOutlined className={isFlagged(q.id) ? 'text-red-500' : 'text-gray-400'} style={{ fontSize: 18 }} />}
                    onClick={() => toggleFlag(q.id)} />
                </Tooltip>
              </div>
              {(currentSection.type !== 'writing' && currentSection.type !== 'translation') && (
                <span className="text-xs text-gray-400 absolute -top-1 right-10">{q.score}分</span>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // === Render Full Paper (all sections at once) ===
  const renderFullPaper = () => (
    <div className="space-y-8">
      {examData?.sections.map((s, si) => {
        const secAnswered = s.questions.filter(q => isAnswered(q.id)).length
        const secTotal = s.questions.length
        return (
          <div key={s.id}>
            {/* Part label */}
            {s.partLabel && (
              <h3 className="text-lg font-bold text-center text-gray-800 mt-2 mb-1">
                {s.partLabel}{s.partTitle ? `     ${s.partTitle}` : ''}
              </h3>
            )}
            <Card
              title={<div className="flex items-center space-x-3"><Tag color={typeColor(s.type)}>{sectionLabels[s.type]}</Tag><span>{s.title || `Section ${si + 1}`}</span><Tag color={secAnswered === secTotal ? 'green' : 'orange'}>{secAnswered}/{secTotal}已答</Tag></div>}
              extra={<span className="text-blue-600 font-semibold">{fmt(s.questions.reduce((sum, q) => sum + q.score, 0))}分</span>}
            >
              {/* Directions */}
              {s.directions && (
                <div className="mb-4 p-3 bg-gray-50 rounded border text-sm text-gray-700 leading-relaxed">
                  {s.directions}
                </div>
              )}
            {/* Audio for listening */}
            {s.type === 'listening' && (
              <div className="bg-blue-50 rounded-lg p-4 mb-4">
                {!examData?.sections?.some(sec => sec.type === 'listening' && sec.audioUrl) && <span className="text-red-500 text-sm">⚠ 本试卷未设置听力音频</span>}
                {s.passage && <p className="text-gray-600 whitespace-pre-wrap">{s.passage}</p>}
              </div>
            )}

            {/* Passage for reading */}
            {['reading_cloze', 'reading_careful', 'reading_matching'].includes(s.type) && s.passage && (
              <details className="mb-4" open>
                <summary className="cursor-pointer text-sm text-blue-600 font-medium mb-2">查看原文</summary>
                <Card size="small" title={s.passageTitle || '阅读文章'} className="bg-gray-50">
                  <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                    {s.type === 'reading_cloze'
                      ? renderClozePassage(s)
                      : s.passage}
                  </div>
                  {s.type === 'reading_cloze' && s.wordBank && s.wordBank.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200 flex flex-wrap gap-1">
                      <span className="text-xs text-gray-400 mr-1">词库：</span>
                      {s.wordBank.map(w => <Tag key={w} className="text-xs">{w}</Tag>)}
                    </div>
                  )}
                </Card>
              </details>
            )}

            {/* Paragraphs for matching */}
            {s.type === 'reading_matching' && s.paragraphs && s.paragraphs.length > 0 && (
              <Card title={<div className="text-center">{s.passageTitle || '段落列表'}</div>} className="mb-4 bg-purple-50" size="small">
                <div className="space-y-2">
                  {s.paragraphs.map((p, i) => (
                    <details key={i} open className="bg-white rounded border group">
                      <summary className="flex items-start cursor-pointer p-3 list-none">
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-purple-100 text-purple-600 text-xs font-bold mr-2 mt-0.5 group-open:bg-purple-200 shrink-0">
                          {String.fromCharCode(65 + i)}
                        </span>
                        <span className="text-sm text-gray-400 group-open:hidden italic">点击展开段落</span>
                        <span className="hidden group-open:inline text-xs text-purple-400 italic mr-2">点击收起</span>
                      </summary>
                      <div className="px-3 pb-3 pt-0 ml-7 text-gray-700 leading-relaxed whitespace-pre-wrap">{p}</div>
                    </details>
                  ))}
                </div>
              </Card>
            )}

            {/* Requirements for writing/translation */}
            {(s.type === 'writing' || s.type === 'translation') && s.requirements && (
              <div className="bg-yellow-50 rounded p-4 mb-4">
                <p className="font-semibold text-gray-700 mb-1">要求：</p>
                <p className="whitespace-pre-wrap">{s.requirements}</p>
              </div>
            )}

            {/* Sub-questions */}
            <div className="space-y-1">
              {s.questions.map(q => (
                <div key={q.id} id={`question-${q.id}`} className="relative scroll-mt-4">
                  <div className="flex items-start">
                    {isAnswered(q.id) ? <Badge status="success" className="mr-2 mt-1" /> : <Badge status="default" className="mr-2 mt-1" />}
                    <div className="flex-1">
                      {renderSubQuestion(q, 0, s)}
                    </div>
                    <Tooltip title={isFlagged(q.id) ? '取消标记' : '标记此题目'}>
                      <Button type="text" size="small"
                        icon={<FlagOutlined className={isFlagged(q.id) ? 'text-red-500' : 'text-gray-400'} style={{ fontSize: 18 }} />}
                        onClick={() => toggleFlag(q.id)} />
                    </Tooltip>
                  </div>
                  {(s.type !== 'writing' && s.type !== 'translation') && (
                    <span className="text-xs text-gray-400 absolute -top-1 right-10">{q.score}分</span>
                  )}
                </div>
              ))}
            </div>
          </Card>
          </div>
        )
      })}
    </div>
  )
  const renderSubQuestionResult = (qr: import('../../services/mockExamService').SubQuestionResult, qi: number, section: Section) => {
    const sq = section.questions[qi]
    if (!sq) return null
    const globalNum = getGlobalIdx(sq.id)

    const userAnswer = qr.userAnswer || ''
    const correctAnswer = qr.correctAnswer || ''

    const optionHighlight = (optValue: string) => {
      const isCorrectAnswer = correctAnswer.toUpperCase() === optValue.toUpperCase()
      const isUserChoice = userAnswer.toUpperCase() === optValue.toUpperCase()
      if (isCorrectAnswer && isUserChoice) return 'bg-green-100 border-green-500'
      if (isCorrectAnswer) return 'bg-green-100 border-green-500'
      if (isUserChoice && !qr.isCorrect) return 'bg-red-100 border-red-500'
      return 'bg-white border-gray-200'
    }

    return (
      <div key={qr.subQuestionId} id={`question-${sq.id}`} className={`p-4 rounded mb-3 ${qr.isCorrect ? 'bg-green-50 border-l-4 border-green-500' : 'bg-red-50 border-l-4 border-red-500'}`}>
        {/* Question header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            {qr.isCorrect ? <CheckCircleOutlined className="text-green-600 text-lg" /> : <CloseCircleOutlined className="text-red-600 text-lg" />}
            <span className="font-semibold text-gray-800">
              {section.type !== 'writing' && section.type !== 'translation' ? `${globalNum}. ` : ''}{sq.title || ''}
            </span>
          </div>
          <Tag color={qr.isCorrect ? 'green' : 'red'}>{fmt(qr.score)}/{fmt(qr.maxScore)}分</Tag>
        </div>

        {/* Options display for choice questions */}
        {sq.options && sq.options.length > 0 && section.type !== 'reading_matching' ? (
          <div className="space-y-1 ml-7">
            {sq.options.map(opt => {
              const hClass = optionHighlight(opt.value)
              const isCorrect = correctAnswer.toUpperCase() === opt.value.toUpperCase()
              const isUser = userAnswer.toUpperCase() === opt.value.toUpperCase()
              return (
                <div key={opt.value} className={`p-2 rounded border flex items-center space-x-2 ${hClass}`}>
                  <span className="font-mono font-bold w-6">{opt.value}.</span>
                  <span className="flex-1">{opt.label}</span>
                  {isCorrect && <Tag color="green" className="ml-1">正确答案</Tag>}
                  {isUser && !qr.isCorrect && <Tag color="red" className="ml-1">你的选择</Tag>}
                  {isUser && qr.isCorrect && <Tag color="green" className="ml-1">你的选择</Tag>}
                </div>
              )
            })}
            {/* User answer / correct answer summary when wrong */}
            {!qr.isCorrect && (
              <div className="mt-2 text-sm flex items-center space-x-6">
                <span><span className="text-gray-500">你的答案：</span><span className="text-red-600 font-semibold">{userAnswer || '(未作答)'}</span></span>
                <span><span className="text-gray-500">正确答案：</span><span className="text-green-600 font-semibold">{correctAnswer}</span></span>
              </div>
            )}
          </div>
        ) : section.type === 'reading_matching' ? (
          <div className="ml-7 space-y-1">
            <div className="text-sm space-y-1">
              {(() => {
                let userPara = '', correctPara = ''
                try { const uu = JSON.parse(userAnswer); userPara = Object.values(uu)[0] as string || '' } catch { userPara = userAnswer }
                // correctAnswer is a plain string like "1" (paragraph index), not JSON
                correctPara = correctAnswer
                const toLetter = (v: string) => {
                  const n = parseInt(v)
                  return !isNaN(n) && n >= 1 && n <= 26 ? String.fromCharCode(64 + n) : v
                }
                return (
                  <div className="flex items-center space-x-6 text-sm">
                    <span><span className="text-gray-500">你的选择：</span>
                      <Tag color={qr.isCorrect ? 'green' : 'red'}>{userPara ? toLetter(userPara) : '未作答'}</Tag>
                    </span>
                    {!qr.isCorrect && <span><span className="text-gray-500">正确答案：</span><Tag color="green">{toLetter(correctPara)}</Tag></span>}
                  </div>
                )
              })()}
            </div>
          </div>
        ) : section.type === 'reading_cloze' ? (
          <div className="ml-7 text-sm space-y-1">
            {(() => {
              const wordBank = section.wordBank || []
              const labels = wordBank.map((_, i) => String.fromCharCode(65 + i))
              const wordToLabel = Object.fromEntries(wordBank.map((w, i) => [w, labels[i]]))
              const correctLabel = correctAnswer ? (wordToLabel[correctAnswer] ? `${wordToLabel[correctAnswer]}.${correctAnswer}` : correctAnswer) : ''
              const userLabel = userAnswer ? (wordToLabel[userAnswer] ? `${wordToLabel[userAnswer]}.${userAnswer}` : userAnswer) : ''
              return (
                <div className="flex items-center space-x-6">
                  {qr.isCorrect ? (
                    <span><span className="text-green-600 font-semibold">{userLabel}</span> <Tag color="green">正确</Tag></span>
                  ) : (
                    <>
                      <span><span className="text-gray-500">你的答案：</span><Tag color="red">{userLabel || '未作答'}</Tag></span>
                      <span><span className="text-gray-500">正确答案：</span><Tag color="green">{correctLabel}</Tag></span>
                    </>
                  )}
                </div>
              )
            })()}
          </div>
        ) : (
          <div className="ml-7 text-sm space-y-1">
            {section.type === 'writing' || section.type === 'translation' ? (
              <>
                <details className="cursor-pointer" open>
                  <summary className="text-blue-600 font-medium">查看你的作答</summary>
                  <div className="mt-2 p-3 bg-white rounded border whitespace-pre-wrap">{userAnswer || '(未作答)'}</div>
                </details>
                <div className="text-gray-500 mt-1">
                  {section.type === 'writing' ? '作文' : '翻译'}评分：<span className="text-blue-600 font-semibold">{fmt(qr.score)}/{fmt(qr.maxScore)}分</span>
                </div>
                {qr.feedback && (
                  <div className="mt-2 p-3 bg-blue-50 rounded border border-blue-200 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                    <span className="font-medium text-blue-700">AI 评语：</span>{qr.feedback}
                  </div>
                )}
                {correctAnswer && (
                  <details className="cursor-pointer mt-2" open>
                    <summary className="text-green-600 font-medium">查看参考答案</summary>
                    <div className="mt-2 p-3 bg-green-50 rounded border border-green-200 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{correctAnswer}</div>
                  </details>
                )}
              </>
            ) : (
              <div className="flex items-center space-x-4">
                <span><span className="text-gray-500">你的答案：</span>
                  <span className={qr.isCorrect ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>{userAnswer || '(未作答)'}</span>
                </span>
                {!qr.isCorrect && (
                  <span><span className="text-gray-500">正确答案：</span><span className="text-green-600 font-semibold">{correctAnswer}</span></span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  const renderResult = () => {
    if (!result || !examData) return null
    const percentage = Math.round((result.totalScore / result.maxScore) * 100)
    const passed = percentage >= 60

    return (
      <Layout>
        <Header className="bg-white shadow-sm px-6 flex items-center">
          <div className="flex items-center space-x-4">
            <Button icon={<LeftOutlined />} onClick={() => navigate('/mock-exam')}>返回列表</Button>
            <h1 className="text-xl font-bold">考试成绩</h1>
          </div>
        </Header>
        <Content className="p-6">
          <div className="max-w-6xl mx-auto">
            <Card className="mb-6">
              <div className="flex items-center justify-center space-x-12">
                <Progress type="circle" percent={percentage} strokeColor={passed ? '#52c41a' : '#f5222d'} size={140} />
                <div>
                  <h2 className={`text-3xl font-bold mb-2 ${passed ? 'text-green-600' : 'text-red-600'}`}>
                    {passed ? '恭喜通过！' : '未通过'}
                  </h2>
                  <p className="text-xl text-gray-600 mb-2">总分：{fmt(result.totalScore)} / {fmt(result.maxScore)} 分</p>
                  <div className="flex items-center space-x-6 text-sm text-gray-500">
                    <span>正确 {(result.sectionResults || []).reduce((s, sr) => s + sr.questionResults.filter(r => r.isCorrect).length, 0)} 题</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Score breakdown */}
            <Card title="各模块得分" className="mb-6">
              <div className="grid grid-cols-4 gap-4">
                {(() => {
                  const getCategoryScore = (types: string[]) => {
                    let score = 0, max = 0
                    ;(result.sectionResults || []).forEach((sr, si) => {
                      const s = examData.sections[si]
                      if (s && types.includes(s.type)) { score += sr.totalScore; max += sr.maxScore }
                    })
                    return { score: fmt(score), max }
                  }
                  const listening = getCategoryScore(['listening'])
                  const reading = getCategoryScore(['reading_cloze', 'reading_matching', 'reading_careful'])
                  const writing = getCategoryScore(['writing'])
                  const translation = getCategoryScore(['translation'])
                  const items = [
                    { label: '听力', ...listening, color: '#1890ff' },
                    { label: '阅读', ...reading, color: '#722ed1' },
                    { label: '写作', ...writing, color: '#eb2f96' },
                    { label: '翻译', ...translation, color: '#13c2c2' },
                  ]
                  return items.filter(it => it.max > 0).map(it => {
                    const pct = Math.round((it.score / it.max) * 100)
                    return (
                      <div key={it.label} className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-xs text-gray-500 mb-1">{it.label}</div>
                        <div className="text-2xl font-bold mb-1" style={{ color: it.color }}>{fmt(it.score)}<span className="text-sm text-gray-400 font-normal">/{fmt(it.max)}</span></div>
                        <Progress percent={pct} strokeColor={it.color} showInfo={false} size="small" />
                      </div>
                    )
                  })
                })()}
              </div>
            </Card>

            <div className="flex gap-6">
              {/* Main review content */}
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold mb-4">试卷回顾</h3>
            <div className="space-y-6">
              {(result.sectionResults || []).map((sr, si) => {
                const section = examData.sections[si]
                if (!section) return null

                return (
                  <Card key={sr.sectionId}
                    title={<div className="flex items-center space-x-3"><Tag color={typeColor(section.type)}>{sectionLabels[section.type]}</Tag><span>{section.title || `Section ${si + 1}`}</span></div>}
                    extra={<span className="text-sm"><span className="text-green-600 font-semibold">{fmt(sr.totalScore)}</span> / {fmt(sr.maxScore)} 分</span>}
                  >
                    {/* Section materials */}
                    {/* Audio for listening */}
                    {section.type === 'listening' && section.audioUrl && (
                      <div className="mb-4 p-3 bg-blue-50 rounded">
                        <audio controls src={section.audioUrl} className="w-full" style={{ height: 40 }} />
                      </div>
                    )}
                    {section.type === 'listening' && section.passage && (
                      <div className="mb-4 p-3 bg-gray-50 rounded text-sm text-gray-600 whitespace-pre-wrap">{section.passage}</div>
                    )}

                    {/* Passage for reading */}
                    {section.passage && section.type === 'reading_careful' && (
                      <details className="mb-4" open>
                        <summary className="cursor-pointer text-sm text-blue-600 font-medium mb-2">查看原文</summary>
                        <Card size="small" title={section.passageTitle || '阅读文章'} className="bg-gray-50">
                          <div className="whitespace-pre-wrap text-gray-700 text-sm leading-relaxed">{section.passage}</div>
                        </Card>
                      </details>
                    )}

                    {/* Cloze: show passage with blanks, user answers inline, like the exam */}
                    {section.type === 'reading_cloze' && section.passage && (
                      <details className="mb-4" open>
                        <summary className="cursor-pointer text-sm text-blue-600 font-medium mb-2">查看原文</summary>
                        <Card size="small" title={section.passageTitle || '选词填空'} className="bg-gray-50">
                          <div className="text-gray-700 text-sm leading-8">
                          {section.passage.split('___').map((part, i, arr) => {
                            const correctAnswer = section.questions[i]?.answer || ''
                            const qr = sr.questionResults[i]
                            const userAns = qr?.userAnswer || ''
                            const isRight = qr?.isCorrect || false
                            const clozeGIdx = getGlobalIdx(section.questions[i]?.id || '')
                            return (
                              <span key={i}>
                                {part}
                                {i < arr.length - 1 && (
                                  <span className={`inline-block px-1.5 mx-0.5 border rounded text-xs font-mono align-middle ${
                                    isRight ? 'bg-green-50 border-green-400 text-green-700' : 'bg-red-50 border-red-400 text-red-700'
                                  }`}>
                                    <span className="font-semibold">{clozeGIdx}.</span>
                                    {userAns ? (
                                      <span>{userAns}</span>
                                    ) : (
                                      <span className="text-gray-400 italic">未作答</span>
                                    )}
                                    {!isRight && (
                                      <span className="text-green-600 ml-0.5">→{correctAnswer}</span>
                                    )}
                                  </span>
                                )}
                              </span>
                            )
                          })}
                        </div>
                        {section.wordBank && section.wordBank.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1">
                            <span className="text-xs text-gray-400 mr-1">词库：</span>
                            {section.wordBank.map(w => <Tag key={w} className="text-xs">{w}</Tag>)}
                          </div>
                        )}
                        <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                          <span className="flex items-center"><span className="inline-block w-3 h-3 bg-green-50 border border-green-400 rounded mr-1" /> 回答正确</span>
                          <span className="flex items-center"><span className="inline-block w-3 h-3 bg-red-50 border border-red-400 rounded mr-1" /> 回答错误</span>
                        </div>
                      </Card>
                      </details>
                    )}

                    {/* Paragraphs for matching */}
                    {section.type === 'reading_matching' && section.paragraphs && section.paragraphs.length > 0 && (
                      <div className="mb-4">
                        <div className="text-sm text-blue-600 font-medium mb-2 text-center">{section.passageTitle || '段落原文'}</div>
                        <div className="space-y-2">
                          {section.paragraphs.map((p, i) => (
                            <details key={i} open className="bg-purple-50 rounded border group">
                              <summary className="flex items-start cursor-pointer p-2 list-none">
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-purple-200 text-purple-700 text-xs font-bold mr-2 mt-0.5 group-open:bg-purple-300 shrink-0">
                                  {String.fromCharCode(65 + i)}
                                </span>
                                <span className="text-xs text-gray-400 group-open:hidden italic">点击展开段落</span>
                                <span className="hidden group-open:inline text-xs text-purple-400 italic mr-2">点击收起</span>
                              </summary>
                              <div className="px-2 pb-2 pt-0 ml-7 text-sm text-gray-700 whitespace-pre-wrap">{p}</div>
                            </details>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Requirements for writing/translation */}
                    {(section.type === 'writing' || section.type === 'translation') && section.requirements && (
                      <div className="mb-4 p-3 bg-yellow-50 rounded text-sm">
                        <p className="font-semibold text-gray-700 mb-1">题目要求：</p>
                        <p className="whitespace-pre-wrap">{section.requirements}</p>
                      </div>
                    )}

                    {/* Question results */}
                    <div className="space-y-1">
                      {sr.questionResults.map((qr, qi) => renderSubQuestionResult(qr, qi, section))}
                    </div>
                  </Card>
                )
              })}
            </div>
              </div>

              {/* Answer sheet sidebar */}
              <div className="w-56 shrink-0 max-h-[calc(100vh-180px)] overflow-y-auto">
                <Card title="答题卡" size="small">
                  <div className="space-y-3">
                    {examData.sections.map((s, si) => {
                      const sr = result.sectionResults[si]
                      if (!sr) return null
                      return (
                        <div key={s.id}>
                          <div className="flex items-center justify-between mb-1">
                            <Tag color={typeColor(s.type)} className="text-xs">{sectionLabels[s.type]}</Tag>
                            <span className="text-xs text-gray-400">
                              {s.questions.filter((_, qi) => sr.questionResults[qi]?.isCorrect).length}/{s.questions.length}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {s.questions.map((q, qi) => {
                              const qr = sr.questionResults[qi]
                              const isRight = qr?.isCorrect
                              const globalNum = getGlobalIdx(q.id)
                              const isWritingOrTrans = s.type === 'writing' || s.type === 'translation'
                              const scrollToQ = () => {
                                const el = document.getElementById(`question-${q.id}`)
                                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                              }
                              return (
                                <Button key={q.id} size="small"
                                  className={`min-w-[28px] h-7 p-0 ${isRight ? 'bg-green-100 border-green-400 text-green-700' : 'bg-red-100 border-red-400 text-red-700'}`}
                                  onClick={scrollToQ}
                                >
                                  {isWritingOrTrans ? sectionLabels[s.type] : globalNum}
                                </Button>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <Divider className="!my-2" />
                  <div className="space-y-1 text-xs text-gray-500">
                    <div className="flex items-center space-x-1"><span className="inline-block w-2.5 h-2.5 bg-green-100 border border-green-400 rounded" /><span>正确</span></div>
                    <div className="flex items-center space-x-1"><span className="inline-block w-2.5 h-2.5 bg-red-100 border border-red-400 rounded" /><span>错误</span></div>
                  </div>
                </Card>
              </div>
            </div>
            <div className="text-center mt-6">
              <span className="inline-block bg-gray-100 text-gray-500 text-sm rounded-full px-4 py-1.5">
                ✦ 作文、翻译内容批改结果由AI辅助生成
              </span>
            </div>
            <div className="text-center mt-8 pb-8">
              <Button type="primary" size="large" onClick={() => navigate('/mock-exam')}>返回模考列表</Button>
            </div>
          </div>
        </Content>
      </Layout>
    )
  }

  // Main render
  if (showResult) {
    return <Spin spinning={submitting}>{renderResult()}</Spin>
  }

  if (!examData) {
    return <div className="flex items-center justify-center min-h-screen"><Spin size="large" tip="加载试卷中..." /></div>
  }

  const answeredCount = getAnsweredCount()
  const listeningAudioUrl = examData?.sections?.find(s => s.type === 'listening' && s.audioUrl)?.audioUrl

  return (
    <Spin spinning={submitting} tip="正在提交试卷，请稍候...（30秒内）" size="large">
      <Layout className="min-h-screen">
        <Header className="bg-white shadow-sm px-6" style={{ paddingTop: 8, height: 'auto', minHeight: 56 }}>
          <div className="flex items-center justify-between pb-2">
            <div className="flex items-center space-x-4">
              <Button icon={<LeftOutlined />} onClick={() => setShowBackConfirm(true)}>返回</Button>
              <h1 className="text-xl font-bold">模考答题</h1>
            </div>
            <div className="flex items-center space-x-6">
              <div className={`flex items-center space-x-2 ${timeLeft < 300 ? 'text-red-600 animate-pulse' : 'text-gray-600'}`}>
                <ClockCircleOutlined className="text-xl" />
                <span className="text-xl font-mono font-bold">{formatTime(timeLeft)}</span>
              </div>
              <Button type="primary" danger icon={<SendOutlined />} onClick={() => setShowSubmitConfirm(true)}>交卷</Button>
              <Button 
                icon={<FileTextOutlined />} 
                type={showFullPaper ? 'default' : 'default'}
                onClick={() => { setShowFullPaper(v => !v); window.scrollTo(0, 0); }}
                className={showFullPaper ? 'border-blue-500 text-blue-600' : ''}
              >
                {showFullPaper ? '退出查看' : '查看试卷'}
              </Button>
            </div>
          </div>
        </Header>

        {/* Persistent audio player for listening sections */}
        {listeningAudioUrl && (
          <div className="bg-blue-600 px-6 py-2 flex items-center space-x-3" style={{ minHeight: 48 }}>
            <SoundOutlined className="text-white text-lg" />
            <audio ref={audioRef} controls src={listeningAudioUrl} className="flex-1" style={{ height: 32, maxWidth: 600 }} />
            <span className="text-white text-sm whitespace-nowrap">听力音频持续播放，完成所有听力题目后手动暂停</span>
          </div>
        )}

        <Layout>
          <Content className="p-6">
            <div className="max-w-4xl mx-auto">
              {showFullPaper ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">
                      整张试卷概览
                      <span className="text-sm text-gray-500 ml-3 font-normal">已答 {answeredCount}/{totalQuestions}</span>
                    </h2>
                    <Progress percent={Math.round((answeredCount / totalQuestions) * 100)} size="small" style={{ width: 120 }} />
                  </div>
                  {renderFullPaper()}
                </>
              ) : (
                <>
                  {/* Section header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <h2 className="text-lg font-semibold">Section {sectionIndex + 1} / {totalSections}</h2>
                      {currentSection && (
                        <Tag color={typeColor(currentSection.type)}>{sectionLabels[currentSection.type]}</Tag>
                      )}
                    </div>
                    <span className="text-sm text-gray-500">本Section: {currentSection?.questions.length || 0}题</span>
                  </div>

                  {/* Part label */}
                  {currentSection?.partLabel && (
                    <h3 className="text-lg font-bold text-center text-gray-800 mt-2 mb-1">
                      {currentSection.partLabel}{currentSection.partTitle ? `     ${currentSection.partTitle}` : ''}
                    </h3>
                  )}

                  {/* Section title card */}
                  {currentSection && (
                    <Card title={currentSection.title || `${sectionLabels[currentSection.type]} - Section ${sectionIndex + 1}`}
                      extra={<span className="text-blue-600 font-semibold">
                        {fmt(currentSection.questions.reduce((s, q) => s + q.score, 0))}分
                      </span>}
                    >
                      {/* Directions */}
                      {currentSection.directions && (
                        <div className="mb-4 p-3 bg-gray-50 rounded border text-sm text-gray-700 leading-relaxed">
                          {currentSection.directions}
                        </div>
                      )}
                      {renderSection()}
                    </Card>
                  )}

                  {/* Section navigation */}
                  <div className="flex items-center justify-between mt-6">
                    <Button icon={<LeftOutlined />} disabled={sectionIndex === 0}
                      onClick={() => goToSection(Math.max(0, sectionIndex - 1))}>上一Section</Button>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">已答 {answeredCount}/{totalQuestions}</span>
                      <Progress percent={Math.round((answeredCount / totalQuestions) * 100)} size="small" style={{ width: 120 }} />
                    </div>
                    <Button icon={<RightOutlined />} disabled={sectionIndex >= totalSections - 1}
                      onClick={() => goToSection(Math.min(totalSections - 1, sectionIndex + 1))}>下一Section</Button>
                  </div>
                </>
              )}
            </div>
          </Content>

          {/* Sider: Section navigator */}
          {!showFullPaper && (
          <Sider width={280} className="bg-gray-50">
            <div className="p-4">
              <h3 className="font-semibold mb-4 flex items-center"><BarChartOutlined className="mr-2" />答题卡</h3>
              <div className="space-y-4">
                {examData.sections.map((s, si) => {
                  const secAnswered = s.questions.filter(q => isAnswered(q.id)).length
                  const secTotal = s.questions.length
                  return (
                    <div key={s.id}>
                      <div className="flex items-center justify-between mb-1">
                        <Tag color={typeColor(s.type)} className="text-xs">{sectionLabels[s.type]}</Tag>
                        <span className="text-xs text-gray-500">{secAnswered}/{secTotal}</span>
                      </div>
                      <div className={`grid grid-cols-5 gap-1 p-2 rounded ${si === sectionIndex ? 'bg-blue-50' : ''}`}>
                        {s.questions.map((q, _qi) => {
                          const isWritingOrTrans = s.type === 'writing' || s.type === 'translation'
                          const globalNum = getGlobalIdx(q.id)
                          return (
                          <Popover key={q.id} content={isWritingOrTrans ? sectionLabels[s.type] : `第${globalNum}题`}>
                            <Button size="small"
                              className={isAnswered(q.id) ? 'bg-green-100 border-green-400 text-green-700' : 'bg-white border-gray-200'}
                              onClick={() => scrollToQuestion(si, q.id)}
                            >
                              {isWritingOrTrans ? sectionLabels[s.type] : globalNum}
                              {isFlagged(q.id) && <FlagOutlined className="text-xs text-red-500 ml-0.5" />}
                            </Button>
                          </Popover>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>

              <Divider className="my-4" />
              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2"><div className="w-3 h-3 bg-green-100 border border-green-400 rounded" /><span>已作答</span></div>
                <div className="flex items-center space-x-2"><div className="w-3 h-3 bg-white border border-gray-300 rounded" /><span>未作答</span></div>
                <div className="flex items-center space-x-2"><FlagOutlined className="text-red-500" /><span>已标记</span></div>
              </div>
            </div>
          </Sider>
          )}
        </Layout>

        {/* 考试中途离开确认弹窗 */}
        <Modal
          title="确认离开考试？"
          open={showBackConfirm}
          onCancel={() => setShowBackConfirm(false)}
          footer={null}
          closable={false}
          maskClosable={false}
        >
          <p className="text-gray-600 mb-4">
            你正在进行模考，离开页面将会<strong className="text-red-500">放弃本次考试</strong>。
          </p>
          <p className="text-gray-500 text-sm mb-4">
            建议先完成考试并交卷后再访问其他页面。
          </p>
          <div className="flex justify-end space-x-3">
            <Button onClick={() => setShowBackConfirm(false)}>继续考试</Button>
            <Button danger onClick={() => {
              setShowBackConfirm(false)
              setExamInProgress(false)
              navigate('/mock-exam')
            }}>放弃并离开</Button>
          </div>
        </Modal>

        {/* Submit confirm modal */}
        <Modal title="确认交卷" open={showSubmitConfirm} onCancel={() => setShowSubmitConfirm(false)}
          footer={<>
            <Button onClick={() => setShowSubmitConfirm(false)}>继续答题</Button>
            <Button type="primary" danger loading={submitting} onClick={handleConfirmSubmit}>确认交卷</Button>
          </>}
        >
          <div className="text-center">
            <ClockCircleOutlined className="text-4xl text-blue-600 mb-4" />
            <h3 className="text-lg font-semibold mb-2">确定要交卷吗？</h3>
            <p>已完成 {answeredCount} / {totalQuestions} 道题目</p>
          </div>
        </Modal>
      </Layout>
    </Spin>
  )
}

export default ExamPage
