import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Card, Button, Progress, Tag, Layout, Spin, message, Divider } from 'antd'
import { LeftOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons'
import { mockExamService, type FullResult, type SectionType } from '../../services/mockExamService'

const { Header, Content } = Layout

const sectionLabels: Record<SectionType, string> = {
  listening: '听力理解', reading_cloze: '选词填空', reading_matching: '段落匹配',
  reading_careful: '仔细阅读', translation: '翻译', writing: '写作'
}

const typeColor = (t: SectionType) => {
  if (t === 'listening') return 'blue'; if (t.startsWith('reading')) return 'green'
  if (t === 'translation') return 'orange'; return 'purple'
}

const ExamResultPage: React.FC = () => {
  const navigate = useNavigate()
  const { participationId } = useParams<{ participationId: string }>()
  const [result, setResult] = useState<FullResult | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { window.scrollTo(0, 0) }, [])

  useEffect(() => {
    if (!participationId) return
    mockExamService.getResult(participationId)
      .then(r => setResult(r))
      .catch(() => message.error('获取成绩失败'))
      .finally(() => setLoading(false))
  }, [participationId])

  const questionGlobalIdx = useMemo(() => {
    const map: Record<string, number> = {}
    let idx = 0
    result?.sections?.forEach(s => {
      if (s.type === 'writing' || s.type === 'translation') return
      s.questions?.forEach(q => { map[q.id] = idx++ })
    })
    return map
  }, [result])

  const getGlobalIdx = (id: string) => (questionGlobalIdx[id] ?? 0) + 1

  const optionHighlight = (optValue: string, correctAnswer: string, userAnswer: string, isCorrect: boolean) => {
    const isCorrectAnswer = correctAnswer.toUpperCase() === optValue.toUpperCase()
    const isUserChoice = userAnswer.toUpperCase() === optValue.toUpperCase()
    if (isCorrectAnswer && isUserChoice) return 'bg-green-100 border-green-500'
    if (isCorrectAnswer) return 'bg-green-100 border-green-500'
    if (isUserChoice && !isCorrect) return 'bg-red-100 border-red-500'
    return 'bg-white border-gray-200'
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><Spin size="large" tip="加载成绩中..." /></div>
  }

  if (!result) {
    return <div className="flex items-center justify-center min-h-screen"><p className="text-gray-500">暂无结果</p></div>
  }

  const percentage = Math.round((result.totalScore / result.maxScore) * 100)
  const fmt = (n: number) => parseFloat(n.toFixed(2))
  const passed = percentage >= 60

  return (
    <Layout>
      <Header className="bg-white shadow-sm px-6 flex items-center">
        <div className="flex items-center space-x-4">
          <Button icon={<LeftOutlined />} onClick={() => navigate(-1)}>返回</Button>
          <h1 className="text-xl font-bold">考试成绩</h1>
          {result.title && <span className="text-gray-500 ml-2 text-sm">{result.title}</span>}
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
                    const s = result.sections[si]
                    if (s && types.includes(s.type)) { score += sr.totalScore; max += sr.maxScore }
                  })
                  return { score: fmt(score), max }
                }
                const listening = getCategoryScore(['listening'])
                const reading = getCategoryScore(['reading_cloze', 'reading_matching', 'reading_careful'])
                const writingScore = getCategoryScore(['writing'])
                const translationScore = getCategoryScore(['translation'])
                const items = [
                  { label: '听力', ...listening, color: '#1890ff' },
                  { label: '阅读', ...reading, color: '#722ed1' },
                  { label: '写作', ...writingScore, color: '#eb2f96' },
                  { label: '翻译', ...translationScore, color: '#13c2c2' },
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
                {result.sections.map((section, si) => {
                  const sr = result.sectionResults?.[si]
                  if (!sr) return null

                  return (
                    <Card key={section.id}
                      title={<div className="flex items-center space-x-3"><Tag color={typeColor(section.type as SectionType)}>{sectionLabels[section.type as SectionType]}</Tag><span>{section.title || `Section ${si + 1}`}</span></div>}
                      extra={<span className="text-sm"><span className="text-green-600 font-semibold">{fmt(sr.totalScore)}</span> / {fmt(sr.maxScore)} 分</span>}
                    >
                      {/* Audio for listening */}
                      {section.type === 'listening' && section.audioUrl && (
                        <div className="mb-4 p-3 bg-blue-50 rounded">
                          <audio controls src={section.audioUrl} className="w-full" style={{ height: 40 }} />
                        </div>
                      )}
                      {section.type === 'listening' && section.passage && (
                        <div className="mb-4 p-3 bg-gray-50 rounded text-sm text-gray-600 whitespace-pre-wrap">{section.passage}</div>
                      )}

                      {/* Passage for careful reading */}
                      {section.passage && section.type === 'reading_careful' && (
                        <details className="mb-4" open>
                          <summary className="cursor-pointer text-sm text-blue-600 font-medium mb-2">查看原文</summary>
                          <Card size="small" title={section.passageTitle || '阅读文章'} className="bg-gray-50">
                            <div className="whitespace-pre-wrap text-gray-700 text-sm leading-relaxed">{section.passage}</div>
                          </Card>
                        </details>
                      )}

                      {/* Cloze passage */}
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
                                        {userAns ? <span>{userAns}</span> : <span className="text-gray-400 italic">未作答</span>}
                                        {!isRight && <span className="text-green-600 ml-0.5">→{correctAnswer}</span>}
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
                              <span className="flex items-center"><span className="inline-block w-3 h-3 bg-green-50 border border-green-400 rounded mr-1" />回答正确</span>
                              <span className="flex items-center"><span className="inline-block w-3 h-3 bg-red-50 border border-red-400 rounded mr-1" />回答错误</span>
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
                        {sr.questionResults.map((qr, qi) => {
                          const sq = section.questions[qi]
                          if (!sq) return null
                          const globalNum = getGlobalIdx(sq.id)
                          const userAnswer = qr.userAnswer || ''
                          const correctAnswer = qr.correctAnswer || ''

                          return (
                            <div key={qr.subQuestionId} id={`question-${sq.id}`} className={`p-4 rounded mb-3 ${qr.isCorrect ? 'bg-green-50 border-l-4 border-green-500' : 'bg-red-50 border-l-4 border-red-500'}`}>
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                  {qr.isCorrect ? <CheckCircleOutlined className="text-green-600 text-lg" /> : <CloseCircleOutlined className="text-red-600 text-lg" />}
                                  <span className="font-semibold text-gray-800">
                                    {section.type !== 'writing' && section.type !== 'translation' ? `${globalNum}. ` : ''}{sq.title || ''}
                                  </span>
                                </div>
                                <Tag color={qr.isCorrect ? 'green' : 'red'}>{fmt(qr.score)}/{fmt(qr.maxScore)}分</Tag>
                              </div>

                              {/* Options for choice questions */}
                              {sq.options && sq.options.length > 0 && section.type !== 'reading_matching' ? (
                                <div className="space-y-1 ml-7">
                                  {sq.options.map(opt => {
                                    const hClass = optionHighlight(opt.value, correctAnswer, userAnswer, qr.isCorrect)
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
                                </div>
                              ) : section.type === 'reading_matching' ? (
                                <div className="ml-7 space-y-1">
                                  <div className="text-sm space-y-1">
                                    {(() => {
                                      let userPara = '', correctPara = ''
                                      try { const cu = JSON.parse(correctAnswer); correctPara = Object.values(cu)[0] as string || '' } catch { correctPara = correctAnswer }
                                      try { const uu = JSON.parse(userAnswer); userPara = Object.values(uu)[0] as string || '' } catch { userPara = userAnswer }
                                      return (
                                        <div className="flex items-center space-x-6 text-sm">
                                          <span><span className="text-gray-500">你的选择：</span>
                                            <Tag color={qr.isCorrect ? 'green' : 'red'}>{userPara || '未作答'}</Tag>
                                          </span>
                                          {!qr.isCorrect && <span><span className="text-gray-500">正确答案：</span><Tag color="green">{correctPara}</Tag></span>}
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
                                  {(section.type === 'writing' || section.type === 'translation') ? (
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
                        })}
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
                  {result.sections.map((s, si) => {
                    const sr = result.sectionResults[si]
                    if (!sr) return null
                    return (
                      <div key={s.id}>
                        <div className="flex items-center justify-between mb-1">
                          <Tag color={typeColor(s.type as SectionType)} className="text-xs">{sectionLabels[s.type as SectionType]}</Tag>
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
                                {isWritingOrTrans ? sectionLabels[s.type as SectionType] : globalNum}
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
            <Button type="primary" size="large" onClick={() => navigate(-1)}>返回</Button>
          </div>
        </div>
      </Content>
    </Layout>
  )
}

export default ExamResultPage
