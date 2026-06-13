import React, { useState, useEffect } from 'react'
import { Card, Button, Radio, Input, Space, Tag, message, Spin, Select, Popconfirm } from 'antd'
import { CheckCircleOutlined, ArrowLeftOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { trainingService, type TrainingExercise, type TrainingSubmitResult } from '../../../services/trainingService'

const { TextArea } = Input

const TopicAnalysis: React.FC = () => {
  const navigate = useNavigate()
  const [exercises, setExercises] = useState<TrainingExercise[]>([])
  const [completedIds, setCompletedIds] = useState<string[]>([])
  const [mode, setMode] = useState<'list' | 'doing'>('list')
  const [selectedExercise, setSelectedExercise] = useState<TrainingExercise | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [level, setLevel] = useState<string>('')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [mainPoint, setMainPoint] = useState('')
  const [writingType, setWritingType] = useState('')
  const [structure, setStructure] = useState('')
  const [showResult, setShowResult] = useState(false)
  const [result, setResult] = useState<TrainingSubmitResult | null>(null)

  useEffect(() => {
    fetchExercises()
    window.scrollTo(0, 0)
  }, [level])

  const fetchExercises = async () => {
    try {
      setLoading(true)
      const data = await trainingService.getExercises({ type: 'topic_analysis', level: level || undefined, pageSize: 50 })
      setExercises(data.exercises)
      try {
        const completed = await trainingService.getCompleted('topic_analysis')
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
    setMainPoint('')
    setWritingType('')
    setStructure('')
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
      await trainingService.resetTraining('topic_analysis')
      setCompletedIds([])
      message.success('已全部重置为未完成')
    } catch {
      message.error('重置失败')
    }
  }

  const handleSubmit = async () => {
    if (!mainPoint.trim() || !writingType || !structure.trim()) {
      message.warning('请完成所有审题分析项')
      return
    }

    const userAnswer = `核心主旨：${mainPoint}\n文体类型：${writingType}\n行文框架：${structure}`

    try {
      setSubmitting(true)
      const res = await trainingService.submitAnswer({
        exerciseId: selectedExercise!.id,
        type: 'topic_analysis',
        userAnswer,
      })
      setResult(res)
      setShowResult(true)
      if (res.score !== null && (res.score ?? 0) >= 7) {
        message.success(`得分：${res.score}/10，审题正确！`)
      } else if (res.score !== null) {
        message.warning(`得分：${res.score}/10，还有提升空间`)
      } else {
        message.info('已提交，无AI评分')
      }
      setCompletedIds(prev => [...new Set([...prev, selectedExercise!.id])])
    } catch {
      message.error('提交失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  const referenceAnswer = (result?.referenceAnswer || selectedExercise?.answer) as {
    mainPoint?: string
    writingType?: string
    structure?: string[]
  } | null

  if (mode === 'doing' && selectedExercise) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
        <div className="mb-8">
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={backToList} className="mb-2">返回列表</Button>
          <h1 className="text-3xl font-bold">审题构思训练</h1>
        </div>

        <Card className="mb-6 border-0 card-shadow" styles={{ body: { padding: '2rem' } }}>
          <div className="mb-6">
            <Tag color={selectedExercise.level === 'cet4' ? 'blue' : 'purple'} className="mb-4">
              {selectedExercise.level === 'cet4' ? '四级' : '六级'}
            </Tag>
            <h2 className="text-xl font-semibold mb-4">{selectedExercise.title}</h2>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{selectedExercise.content}</p>
            </div>
            {selectedExercise.requirements && (
              <div className="mt-3 text-sm text-gray-500">要求：{selectedExercise.requirements}</div>
            )}
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">1. 核心主旨是什么？</h3>
              <TextArea rows={2} placeholder="请输入你认为的作文核心主旨..." value={mainPoint} onChange={(e) => setMainPoint(e.target.value)} disabled={showResult} />
            </div>
            <div>
              <h3 className="font-semibold mb-2">2. 文体类型是什么？</h3>
              <Radio.Group value={writingType} onChange={(e) => setWritingType(e.target.value)} disabled={showResult}>
                <Space direction="vertical">
                  <Radio value="议论文">议论文</Radio>
                  <Radio value="建议信">建议信</Radio>
                  <Radio value="道歉信">道歉信</Radio>
                  <Radio value="感谢信">感谢信</Radio>
                  <Radio value="通知">通知</Radio>
                  <Radio value="倡议书">倡议书</Radio>
                </Space>
              </Radio.Group>
            </div>
            <div>
              <h3 className="font-semibold mb-2">3. 你会如何搭建文章结构？</h3>
              <TextArea rows={4} placeholder="请描述你的行文框架..." value={structure} onChange={(e) => setStructure(e.target.value)} disabled={showResult} />
            </div>
          </div>
        </Card>

        {!showResult ? (
          <div className="text-center">
            <Button type="primary" size="large" onClick={handleSubmit} loading={submitting}>提交审题</Button>
          </div>
        ) : (
          <Card className="border-0 card-shadow bg-gradient-to-r from-blue-50 to-purple-50" styles={{ body: { padding: '2rem' } }}>
            <div className="flex items-start space-x-4 mb-4">
              <CheckCircleOutlined className="text-3xl text-green-600" />
              <div>
                <h3 className="text-xl font-bold mb-2">审题结果 {result && result.score !== null ? `— 得分：${result.score}/10` : ''}</h3>
                {result?.feedback && (
                  <div className="bg-white p-4 rounded-lg mb-4 border border-blue-100">
                    <h4 className="font-semibold text-blue-700 mb-2">AI 反馈：</h4>
                    <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{result.feedback.replace(/\*\*?([^*]+)\*?\*/g, '$1').replace(/#{1,6}\s?|`{1,3}|_{1,3}/g, '')}</p>
                    <p className="text-xs text-gray-500 mt-3 text-center bg-gray-50 rounded-full py-1">✦ 本批改结果由AI辅助生成</p>
                  </div>
                )}
                {referenceAnswer && (
                  <div className="space-y-2 text-gray-700 bg-white p-4 rounded-lg border border-green-100">
                    <h4 className="font-semibold text-green-700 mb-2">参考答案：</h4>
                    {referenceAnswer.mainPoint && <p><strong>核心主旨：</strong>{referenceAnswer.mainPoint}</p>}
                    {referenceAnswer.writingType && <p><strong>文体类型：</strong>{referenceAnswer.writingType}</p>}
                    {referenceAnswer.structure && (
                      <>
                        <p><strong>行文框架：</strong></p>
                        <ul className="list-disc list-inside ml-4">
                          {referenceAnswer.structure.map((s, i) => (<li key={i}>{s}</li>))}
                        </ul>
                      </>
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
          <h1 className="text-3xl font-bold">审题构思训练</h1>
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
          <p className="text-gray-500 mb-4">暂无练习数据，请选择级别后刷新</p>
          <Button icon={<ReloadOutlined />} onClick={fetchExercises}>刷新</Button>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <Input placeholder="搜索练习标题..." prefix={<SearchOutlined />} value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)} allowClear />
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

export default TopicAnalysis
