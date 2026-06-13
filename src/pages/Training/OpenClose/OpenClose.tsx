import React, { useState, useEffect } from 'react'
import { Card, Button, Input, Select, Tag, message, Spin, Popconfirm } from 'antd'
import { ArrowLeftOutlined, CheckCircleOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { trainingService, type TrainingExercise, type TrainingSubmitResult } from '../../../services/trainingService'

const { TextArea } = Input

const OpenClose: React.FC = () => {
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
      const data = await trainingService.getExercises({ type: 'open_close', level: level || undefined, pageSize: 50 })
      setExercises(data.exercises)
      try {
        const completed = await trainingService.getCompleted('open_close')
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
      await trainingService.resetTraining('open_close')
      setCompletedIds([])
      message.success('已全部重置为未完成')
    } catch {
      message.error('重置失败')
    }
  }

  const handleSubmit = async () => {
    if (!answer.trim()) {
      message.warning('请先完成写作')
      return
    }

    try {
      setSubmitting(true)
      const res = await trainingService.submitAnswer({
        exerciseId: selectedExercise!.id,
        type: 'open_close',
        userAnswer: answer,
      })
      setResult(res)
      setShowResult(true)
      if (res.score !== null && (res.score ?? 0) >= 7) {
        message.success(`得分：${res.score}/10，写得不错！`)
      } else if (res.score !== null) {
        message.info(`得分：${res.score}/10，继续努力`)
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
    sample?: string
    tips?: string[]
  } | null

  if (mode === 'doing' && selectedExercise) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
        <div className="mb-8">
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={backToList} className="mb-2">返回列表</Button>
          <h1 className="text-3xl font-bold">开头结尾训练</h1>
        </div>

        <Card className="mb-6 border-0 card-shadow" styles={{ body: { padding: '2rem' } }}>
          <div className="mb-6">
            <Tag color={selectedExercise.level === 'cet4' ? 'blue' : 'purple'} className="mb-4">
              {selectedExercise.level === 'cet4' ? '四级' : '六级'}
            </Tag>
            <h2 className="text-xl font-semibold mb-4">{selectedExercise.title}</h2>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-gray-800 whitespace-pre-wrap">{selectedExercise.content}</p>
            </div>
            {selectedExercise.requirements && (
              <p className="text-sm text-gray-500 mt-2">{selectedExercise.requirements}</p>
            )}
          </div>

          <div className="mb-6">
            <h3 className="font-semibold mb-2">请写出你的段落：</h3>
            <TextArea rows={8} placeholder="在这里输入你的写作内容..." value={answer} onChange={(e) => setAnswer(e.target.value)} disabled={showResult} className="text-lg" />
            <p className="text-sm text-gray-500 mt-2">字数：{answer.split(/\s+/).filter(Boolean).length} 词</p>
          </div>

          {!showResult ? (
            <div className="text-center">
              <Button type="primary" size="large" onClick={handleSubmit} loading={submitting}>提交</Button>
            </div>
          ) : (
            <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-0">
              <div className="mb-4">
                <h3 className="font-semibold mb-2 flex items-center">
                  <CheckCircleOutlined className="text-green-600 mr-2" />
                  得分：{result?.score ?? '—'}/10
                </h3>
              </div>
              {result?.feedback && (
                <div className="mb-4 bg-white p-4 rounded-lg border border-blue-100">
                  <h4 className="font-semibold text-blue-700 mb-2">AI 反馈：</h4>
                  <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{result.feedback.replace(/\*\*?([^*]+)\*?\*/g, '$1').replace(/#{1,6}\s?|`{1,3}|_{1,3}/g, '')}</p>
                  <p className="text-xs text-gray-500 mt-3 text-center bg-gray-50 rounded-full py-1">✦ 本批改结果由AI辅助生成</p>
                </div>
              )}
              {referenceAnswer?.sample && (
                <div className="mb-4 bg-white p-4 rounded-lg border border-green-100">
                  <h4 className="font-semibold text-green-700 mb-2">高分参考：</h4>
                  <p className="text-gray-800 leading-relaxed">{referenceAnswer.sample}</p>
                </div>
              )}
              <div className="text-center mt-4">
                <Button type="primary" onClick={backToList} size="large">返回列表</Button>
              </div>
            </Card>
          )}
        </Card>

        {referenceAnswer?.tips && referenceAnswer.tips.length > 0 && (
          <Card className="border-0 card-shadow" styles={{ body: { padding: '1.5rem' } }}>
            <h3 className="font-semibold mb-4">💡 写作技巧</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
              {referenceAnswer.tips.map((tip, i) => (<li key={i}>{tip}</li>))}
            </ul>
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
          <h1 className="text-3xl font-bold">开头结尾训练</h1>
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
                {ex.requirements && <p className="text-sm text-gray-500 mt-2">{ex.requirements}</p>}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default OpenClose
