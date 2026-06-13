import React, { useState, useEffect } from 'react'
import { Card, Button, Input, Select, Tag, message, Spin, Divider, Popconfirm } from 'antd'
import { ArrowLeftOutlined, CheckCircleOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { trainingService, type TrainingExercise, type TrainingSubmitResult } from '../../../services/trainingService'

const { TextArea } = Input

const Format: React.FC = () => {
  const navigate = useNavigate()
  const [exercises, setExercises] = useState<TrainingExercise[]>([])
  const [completedIds, setCompletedIds] = useState<string[]>([])
  const [mode, setMode] = useState<'list' | 'doing'>('list')
  const [selectedExercise, setSelectedExercise] = useState<TrainingExercise | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [level, setLevel] = useState<string>('')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [userFormat, setUserFormat] = useState({ salutation: '', body: '', closing: '', signature: '', date: '' })
  const [showResult, setShowResult] = useState(false)
  const [result, setResult] = useState<TrainingSubmitResult | null>(null)

  useEffect(() => {
    fetchExercises()
    window.scrollTo(0, 0)
  }, [level])

  const fetchExercises = async () => {
    try {
      setLoading(true)
      const data = await trainingService.getExercises({ type: 'format', level: level || undefined, pageSize: 50 })
      setExercises(data.exercises)
      try {
        const completed = await trainingService.getCompleted('format')
        setCompletedIds(completed.completedIds)
      } catch {}
    } catch {
      message.error('获取练习失败')
    } finally {
      setLoading(false)
    }
  }

  const startExercise = (exercise: TrainingExercise) => {
    setSelectedExercise(exercise)
    setMode('doing')
    setUserFormat({ salutation: '', body: '', closing: '', signature: '', date: '' })
    setShowResult(false)
    setResult(null)
  }

  const backToList = () => {
    setMode('list')
    setSelectedExercise(null)
    setShowResult(false)
    setResult(null)
    fetchExercises()
  }

  const handleReset = async () => {
    try {
      await trainingService.resetTraining('format')
      setCompletedIds([])
      message.success('已全部重置为未完成')
    } catch {
      message.error('重置失败')
    }
  }

  const handleSubmit = async () => {
    if (!userFormat.salutation.trim() || !userFormat.body.trim() || !userFormat.closing.trim()) {
      message.warning('请完成格式写作（称呼、正文、结尾必填）')
      return
    }

    const userAnswer = `称呼：${userFormat.salutation}\n正文：${userFormat.body}\n结尾：${userFormat.closing}\n署名：${userFormat.signature}\n日期：${userFormat.date}`

    try {
      setSubmitting(true)
      const res = await trainingService.submitAnswer({
        exerciseId: selectedExercise!.id,
        type: 'format',
        userAnswer,
      })
      setResult(res)
      setShowResult(true)
      if (res.score !== null && (res.score ?? 0) >= 7) {
        message.success(`得分：${res.score}/10，格式正确！`)
      } else if (res.score !== null) {
        message.info(`得分：${res.score}/10，还有提升空间`)
      } else {
        message.info('已提交')
      }
      setCompletedIds(prev => [...new Set([...prev, selectedExercise!.id])])
    } catch {
      message.error('提交失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  const referenceAnswer = (result?.referenceAnswer || selectedExercise?.answer) as {
    salutation?: string
    body?: string
    closing?: string
    signature?: string
    date?: string
  } | null

  const getTypeLabel = (exercise: TrainingExercise) => {
    const labels: Record<string, string> = { letter: '书信', notice: '通知', proposal: '倡议书', memo: '备忘录' }
    if (!exercise) return ''
    const answer = exercise.answer as any
    return labels[answer?.type] || ''
  }

  const stripMd = (text: string) => text.replace(/\*\*?([^*]+)\*?\*/g, '$1').replace(/#{1,6}\s?|`{1,3}|_{1,3}/g, '')

  if (mode === 'doing' && selectedExercise) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
        <div className="mb-8">
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={backToList} className="mb-2">返回列表</Button>
          <h1 className="text-3xl font-bold">格式规范训练</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-0 card-shadow" styles={{ body: { padding: '2rem' } }}>
            <Tag color="blue" className="mb-4">{getTypeLabel(selectedExercise)}格式</Tag>
            <Tag color={selectedExercise.level === 'cet4' ? 'blue' : 'purple'} className="mb-4 ml-2">{selectedExercise.level === 'cet4' ? '四级' : '六级'}</Tag>
            <h2 className="text-xl font-semibold mb-4">{selectedExercise.title}</h2>
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <p className="text-gray-800 whitespace-pre-wrap">{selectedExercise.content}</p>
            </div>
            {selectedExercise.requirements && <p className="text-sm text-gray-500 mb-4">{selectedExercise.requirements}</p>}

            <Divider>请完成格式写作</Divider>

            <div className="space-y-4">
              <div>
                <label className="font-semibold block mb-2">称呼：</label>
                <Input placeholder="例如：Dear ..., NOTICE" value={userFormat.salutation} onChange={(e) => setUserFormat({ ...userFormat, salutation: e.target.value })} disabled={showResult} />
              </div>
              <div>
                <label className="font-semibold block mb-2">正文：</label>
                <TextArea rows={6} placeholder="请输入正文内容..." value={userFormat.body} onChange={(e) => setUserFormat({ ...userFormat, body: e.target.value })} disabled={showResult} />
              </div>
              <div>
                <label className="font-semibold block mb-2">结尾：</label>
                <Input placeholder="例如：Yours sincerely, / Student Union" value={userFormat.closing} onChange={(e) => setUserFormat({ ...userFormat, closing: e.target.value })} disabled={showResult} />
              </div>
              <div>
                <label className="font-semibold block mb-2">署名：</label>
                <Input placeholder="请输入署名..." value={userFormat.signature} onChange={(e) => setUserFormat({ ...userFormat, signature: e.target.value })} disabled={showResult} />
              </div>
              <div>
                <label className="font-semibold block mb-2">日期（可选）：</label>
                <Input placeholder="例如：June 10, 2026" value={userFormat.date} onChange={(e) => setUserFormat({ ...userFormat, date: e.target.value })} disabled={showResult} />
              </div>
            </div>

            {!showResult ? (
              <Button type="primary" block className="mt-6" onClick={handleSubmit} loading={submitting}>提交格式</Button>
            ) : (
              <Button block className="mt-6" onClick={backToList}>返回列表</Button>
            )}
          </Card>

          <Card className="border-0 card-shadow bg-gradient-to-br from-green-50 to-blue-50" styles={{ body: { padding: '2rem' } }}>
            <h3 className="text-xl font-bold mb-4 flex items-center">
              <CheckCircleOutlined className="text-green-600 mr-2" />
              标准格式参考
            </h3>

            {result?.feedback && (
              <div className="mb-4 bg-white p-4 rounded-lg border border-blue-100">
                <h4 className="font-semibold text-blue-700 mb-2">AI 反馈 {result?.score ? `(${result.score}/10分)` : ''}：</h4>
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{stripMd(result.feedback)}</p>
                <p className="text-xs text-gray-500 mt-3 text-center bg-gray-50 rounded-full py-1">✦ 本批改结果由AI辅助生成</p>
              </div>
            )}

            {referenceAnswer && (
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-green-700 mb-1">称呼：</h4>
                  <Input value={stripMd(referenceAnswer.salutation || '')} readOnly />
                </div>
                <div>
                  <h4 className="font-semibold text-green-700 mb-1">正文：</h4>
                  <TextArea rows={6} value={stripMd(referenceAnswer.body || '')} readOnly />
                </div>
                <div>
                  <h4 className="font-semibold text-green-700 mb-1">结尾：</h4>
                  <Input value={stripMd(referenceAnswer.closing || '')} readOnly />
                </div>
                <div>
                  <h4 className="font-semibold text-green-700 mb-1">署名：</h4>
                  <Input value={stripMd(referenceAnswer.signature || '')} readOnly />
                </div>
                {referenceAnswer.date && (
                  <div>
                    <h4 className="font-semibold text-green-700 mb-1">日期：</h4>
                    <Input value={referenceAnswer.date} readOnly />
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/training')} className="mb-2">返回训练</Button>
          <h1 className="text-3xl font-bold">格式规范训练</h1>
        </div>
        <div className="flex items-center gap-2">
          <Popconfirm title="确定要全部重做吗？所有练习记录将被清除。" onConfirm={handleReset} okText="确定" cancelText="取消">
            <Button icon={<ReloadOutlined />} size="small">全部重做</Button>
          </Popconfirm>
          <Select placeholder="选择级别" value={level || undefined} onChange={(v) => setLevel(v)} allowClear style={{ width: 120 }} options={[{ label: '全部', value: '' }, { label: '四级', value: 'cet4' }, { label: '六级', value: 'cet6' }]} />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20"><Spin size="large" /></div>
      ) : exercises.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-500 mb-4">暂无练习数据</p>
          <Button icon={<ReloadOutlined />} onClick={fetchExercises}>刷新</Button>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <Input placeholder="搜索练习..." prefix={<SearchOutlined />} value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)} allowClear />
          </div>
          <div className="space-y-3">
            {exercises.filter(ex => !searchKeyword || ex.title.toLowerCase().includes(searchKeyword.toLowerCase())).map((ex) => {
            const isCompleted = completedIds.includes(ex.id)
            return (
              <Card key={ex.id} hoverable className="border-0 card-shadow" styles={{ body: { padding: '1.25rem' } }} onClick={() => startExercise(ex)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Tag color={isCompleted ? 'green' : 'default'}>{isCompleted ? '已完成' : '未完成'}</Tag>
                    <Tag color={ex.level === 'cet4' ? 'blue' : 'purple'}>{ex.level === 'cet4' ? '四级' : '六级'}</Tag>
                    <Tag color="orange">{getTypeLabel(ex)}格式</Tag>
                    <span className="font-semibold text-lg">{ex.title}</span>
                  </div>
                  <Button type="primary" ghost size="small">{isCompleted ? '重新练习' : '开始练习'}</Button>
                </div>
                {ex.requirements && <p className="text-sm text-gray-500 mt-2">{ex.requirements}</p>}
              </Card>
            )
          })}
        </div>
      </>
      )}
    </div>
  )
}

export default Format
