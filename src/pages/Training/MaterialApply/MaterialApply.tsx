import React, { useState, useEffect } from 'react'
import { Card, Button, Select, Input, Tag, message, Spin, Popconfirm } from 'antd'
import { ArrowLeftOutlined, CheckCircleOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { trainingService, type TrainingExercise, type TrainingSubmitResult } from '../../../services/trainingService'

const { TextArea } = Input

const MaterialApply: React.FC = () => {
  const navigate = useNavigate()
  const [exercises, setExercises] = useState<TrainingExercise[]>([])
  const [completedIds, setCompletedIds] = useState<string[]>([])
  const [mode, setMode] = useState<'list' | 'doing'>('list')
  const [selectedExercise, setSelectedExercise] = useState<TrainingExercise | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [level, setLevel] = useState<string>('')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [answer, setAnswer] = useState('')
  const [showResult, setShowResult] = useState(false)
  const [result, setResult] = useState<TrainingSubmitResult | null>(null)

  useEffect(() => {
    fetchExercises()
    window.scrollTo(0, 0)
  }, [level])

  const fetchExercises = async () => {
    try {
      setLoading(true)
      const data = await trainingService.getExercises({ type: 'material_apply', level: level || undefined, pageSize: 50 })
      setExercises(data.exercises)
      try {
        const completed = await trainingService.getCompleted('material_apply')
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
    setAnswer('')
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
      await trainingService.resetTraining('material_apply')
      setCompletedIds([])
      message.success('已全部重置为未完成')
    } catch {
      message.error('重置失败')
    }
  }

  const handleSubmit = async () => {
    if (!answer.trim()) {
      message.warning('请先完成改写')
      return
    }

    try {
      setSubmitting(true)
      const res = await trainingService.submitAnswer({
        exerciseId: selectedExercise!.id,
        type: 'material_apply',
        userAnswer: answer,
      })
      setResult(res)
      setShowResult(true)
      if (res.score !== null && (res.score ?? 0) >= 7) {
        message.success(`得分：${res.score}/10，改写优秀！`)
      } else if (res.score !== null) {
        message.info(`得分：${res.score}/10，继续加油`)
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
    target?: string
    improvements?: Array<{ original: string; improved: string; reason: string }>
  } | null

  if (mode === 'doing' && selectedExercise) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
        <div className="mb-8">
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={backToList} className="mb-2">返回列表</Button>
          <h1 className="text-3xl font-bold">素材应用训练</h1>
        </div>

        <Card className="mb-6 border-0 card-shadow" styles={{ body: { padding: '2rem' } }}>
          <div className="mb-6">
            <Tag color="blue" className="mb-4">{selectedExercise.level === 'cet4' ? '四级' : '六级'}</Tag>
            <h2 className="text-xl font-semibold mb-4">{selectedExercise.title}</h2>
          </div>

          <div className="mb-6">
            <h3 className="font-semibold mb-2">原句/原文：</h3>
            <div className="bg-red-50 p-4 rounded-lg border border-red-100">
              <p className="text-gray-800 italic whitespace-pre-wrap">{selectedExercise.content}</p>
            </div>
            {selectedExercise.requirements && (
              <p className="text-sm text-gray-500 mt-2">{selectedExercise.requirements}</p>
            )}
          </div>

          <div className="mb-6">
            <h3 className="font-semibold mb-2">请升级改写（运用高级词汇、复杂句式）：</h3>
            <TextArea rows={6} placeholder="在这里输入你的改写版本..." value={answer} onChange={(e) => setAnswer(e.target.value)} disabled={showResult} className="text-lg" />
          </div>
        </Card>

        {!showResult ? (
          <div className="text-center">
            <Button type="primary" size="large" onClick={handleSubmit} loading={submitting}>提交改写</Button>
          </div>
        ) : (
          <Card className="border-0 card-shadow bg-gradient-to-r from-purple-50 to-pink-50" styles={{ body: { padding: '2rem' } }}>
            <div className="flex items-start space-x-4 mb-4">
              <CheckCircleOutlined className="text-3xl text-green-600" />
              <div>
                <h3 className="text-xl font-bold mb-2">改写结果 {result && result.score !== null ? `— 得分：${result.score}/10` : ''}</h3>
                {result?.feedback && (
                  <div className="bg-white p-4 rounded-lg mb-4 border border-purple-100">
                    <h4 className="font-semibold text-purple-700 mb-2">AI 反馈：</h4>
                    <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{result.feedback.replace(/\*\*?([^*]+)\*?\*/g, '$1').replace(/#{1,6}\s?|`{1,3}|_{1,3}/g, '')}</p>
                    <p className="text-xs text-gray-500 mt-3 text-center bg-gray-50 rounded-full py-1">✦ 本批改结果由AI辅助生成</p>
                  </div>
                )}
                {referenceAnswer && (
                  <div className="space-y-3 text-gray-700 bg-white p-4 rounded-lg border border-green-100">
                    <h4 className="font-semibold text-green-700">参考答案：</h4>
                    {referenceAnswer.target && <p className="text-green-800 italic">{referenceAnswer.target}</p>}
                    {referenceAnswer.improvements && (
                      <div className="space-y-2">
                        {referenceAnswer.improvements.map((item, i) => (
                          <div key={i} className="p-2 bg-gray-50 rounded">
                            <p><span className="text-red-500 line-through">{item.original}</span></p>
                            <p><span className="text-green-600 font-semibold">{item.improved}</span></p>
                            <p className="text-xs text-gray-500">{item.reason}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="text-center mt-4">
              <Button type="primary" onClick={backToList} size="large">返回列表</Button>
            </div>
          </Card>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/training')} className="mb-2">返回训练</Button>
          <h1 className="text-3xl font-bold">素材应用训练</h1>
        </div>
        <div className="flex items-center gap-2">
          <Popconfirm title="确定要全部重做吗？所有练习记录将被清除。" onConfirm={handleReset} okText="确定" cancelText="取消">
            <Button icon={<ReloadOutlined />} size="small">全部重做</Button>
          </Popconfirm>
          <Select placeholder="选择级别" value={level || undefined} onChange={(v) => setLevel(v)} allowClear style={{ width: 120 }} options={[{ label: '全部', value: '' }, { label: '四级', value: 'cet4' }, { label: '六级', value: 'cet6' }]} />
        </div>
      </div>

      <div className="mb-4">
        <Input placeholder="搜索练习..." prefix={<SearchOutlined />} value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)} allowClear style={{ width: 280 }} />
      </div>
      {loading ? (
        <div className="text-center py-20"><Spin size="large" /></div>
      ) : exercises.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-500 mb-4">暂无练习数据</p>
          <Button icon={<ReloadOutlined />} onClick={fetchExercises}>刷新</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {exercises.filter(ex => !searchKeyword || ex.title.toLowerCase().includes(searchKeyword.toLowerCase())).map((ex) => {
            const isCompleted = completedIds.includes(ex.id)
            return (
              <Card key={ex.id} hoverable className="border-0 card-shadow" styles={{ body: { padding: '1.25rem' } }} onClick={() => startExercise(ex)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Tag color={isCompleted ? 'green' : 'default'}>{isCompleted ? '已完成' : '未完成'}</Tag>
                    <Tag color={ex.level === 'cet4' ? 'blue' : 'purple'}>{ex.level === 'cet4' ? '四级' : '六级'}</Tag>
                    <span className="font-semibold text-lg">{ex.title}</span>
                  </div>
                  <Button type="primary" ghost size="small">{isCompleted ? '重新练习' : '开始练习'}</Button>
                </div>
                {ex.requirements && <p className="text-sm text-gray-500 mt-2 ml-0">{ex.requirements}</p>}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default MaterialApply
