import React, { useState, useEffect, useRef } from 'react'
import { 
  Card, Button, Table, Modal, Form, Input, Select, InputNumber, Popover, Space,
  Tag, message, Popconfirm, Upload, Row, Col, Divider, Typography, Switch
} from 'antd'
import { 
  PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, AudioOutlined,
  PlusCircleOutlined, MinusCircleOutlined, SearchOutlined, ReloadOutlined,
  HolderOutlined, UpOutlined, DownOutlined
} from '@ant-design/icons'
import { 
  mockExamService, type MockExam, type Section, type SubQuestion, type SectionType,
  type ExamCategory, type ExamLevel, levelLabels, categoryLabels
} from '../../services/mockExamService'
import { useUserStore } from '../../stores/userStore'

const { Option } = Select
const { TextArea } = Input
const { Title } = Typography

const sectionTypes: { value: SectionType; label: string; description: string }[] = [
  { value: 'listening', label: '听力理解', description: '一段音频 + 多个选择题' },
  { value: 'reading_cloze', label: '选词填空', description: '一篇文章 + 10个空格 + 词库' },
  { value: 'reading_matching', label: '段落匹配', description: '一篇文章 + 10个匹配句子' },
  { value: 'reading_careful', label: '仔细阅读', description: '一篇文章 + 5个选择题' },
  { value: 'translation', label: '翻译', description: '一段中文翻译' },
  { value: 'writing', label: '写作', description: '议论文或应用文' },
]

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8) }

const MockExamAdmin: React.FC = () => {
  const [exams, setExams] = useState<MockExam[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  
  // Filters
  const [searchText, setSearchText] = useState('')
  const [filterLevel, setFilterLevel] = useState<string | undefined>()
  const [filterCategory, setFilterCategory] = useState<string | undefined>()
  
  // Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  
  // Modal
  const [showModal, setShowModal] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [editingExam, setEditingExam] = useState<MockExam | null>(null)
  const [sections, setSections] = useState<Section[]>([])
  const [currentSectionIdx, setCurrentSectionIdx] = useState<number>(-1)
  const [form] = Form.useForm()
  const [tab, setTab] = useState<'info' | 'sections'>('info')
  const [dragId, setDragId] = useState<string | null>(null)
  const clozeTextareaRef = useRef<any>(null)
  const [newWord, setNewWord] = useState('')

  const insertBlank = () => {
    if (currentSectionIdx < 0) return
    const s = sections[currentSectionIdx]
    const textarea = clozeTextareaRef.current?.resizableTextArea?.textArea
    let pos = textarea?.selectionStart ?? s.passage?.length ?? 0
    const passage = s.passage || ''
    const before = passage.slice(0, pos)
    const after = passage.slice(pos)
    const newPassage = before + (before.endsWith('___') ? '' : (before ? ' ' : '') + '___' + (after.startsWith(' ') || !after ? '' : ' ')) + after
    // 计算新的光标位置
    const insertPos = before.length + (before && !before.endsWith('___') ? 1 : 0)
    const markerLen = '___'.length
    const newCursorPos = insertPos + markerLen + (after && !after.startsWith(' ') ? 1 : 0)
    // 同时添加一个子题目
    const q: SubQuestion = { id: genId(), score: 5, answer: '' }
    const newSections = sections.map((sec, i) => {
      if (i !== currentSectionIdx) return sec
      return { ...sec, passage: newPassage, questions: [...sec.questions, q] }
    })
    setSections(newSections)
    // 恢复光标位置
    setTimeout(() => {
      if (textarea) {
        textarea.focus()
        textarea.setSelectionRange(newCursorPos, newCursorPos)
      }
    }, 0)
  }

  const addWord = () => {
    if (currentSectionIdx < 0 || !newWord.trim()) return
    const s = sections[currentSectionIdx]
    const word = newWord.trim()
    if ((s.wordBank || []).includes(word)) { message.warning('词库中已存在该单词'); return }
    updateSection(currentSectionIdx, { ...s, wordBank: [...(s.wordBank || []), word] })
    setNewWord('')
  }

  const removeWord = (idx: number) => {
    if (currentSectionIdx < 0) return
    const s = sections[currentSectionIdx]
    updateSection(currentSectionIdx, { ...s, wordBank: (s.wordBank || []).filter((_, i) => i !== idx) })
  }

  const fetchExams = async (p?: number, ps?: number) => {
    setLoading(true)
    try {
      const data = await mockExamService.adminList({ 
        search: searchText || undefined,
        level: filterLevel, 
        category: filterCategory, 
        page: p || page, 
        pageSize: ps || pageSize 
      })
      setExams(data.exams)
      setTotal(data.total)
    } catch { message.error('获取模考列表失败') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchExams() }, [])

  const handleSearch = () => { setPage(1); fetchExams(1) }
  const handleReset = () => {
    setSearchText(''); setFilterLevel(undefined); setFilterCategory(undefined)
    setPage(1); setSelectedIds([])
    setTimeout(() => fetchExams(1), 0)
  }

  const handleAdd = () => {
    setEditingExam(null); setSections([]); setCurrentSectionIdx(-1); setTab('info')
    form.resetFields(); setShowModal(true)
  }

  const handleEdit = (exam: MockExam) => {
    setEditingExam(exam)
    setSections(exam.sections || [])
    setCurrentSectionIdx(-1)
    setTab('info')
    form.setFieldsValue({ 
      title: exam.title, description: exam.description, 
      level: exam.level, category: exam.category || 'mock',
      duration: exam.duration, enabled: exam.enabled !== false
    })
    setShowModal(true)
  }

  const handleView = (exam: MockExam) => { setEditingExam(exam); setShowDetail(true) }

  const handleDelete = async (id: string) => {
    try { await mockExamService.adminDelete(id); message.success('删除成功'); fetchExams() }
    catch { message.error('删除失败') }
  }

  const handleBatchDelete = () => {
    if (selectedIds.length === 0) { message.warning('请先选择试卷'); return }
    Modal.confirm({
      title: '批量删除', content: `确定删除选中的 ${selectedIds.length} 套试卷？`,
      okText: '确定', cancelText: '取消', okType: 'danger',
      onOk: async () => {
        try { await mockExamService.adminBatchDelete(selectedIds); message.success('批量删除成功'); setSelectedIds([]); fetchExams() }
        catch { message.error('删除失败') }
      }
    })
  }

  const handleBatchToggle = async (enabled: boolean) => {
    if (selectedIds.length === 0) { message.warning('请先选择试卷'); return }
    try { 
      await mockExamService.adminBatchToggle(selectedIds, enabled)
      message.success(enabled ? '批量启用成功' : '批量禁用成功')
      setSelectedIds([])
      fetchExams()
    } catch { message.error('操作失败') }
  }

  // Section management
  const addSection = () => {
    const s: Section = {
      id: genId(), type: 'listening', title: '',
      questions: [{ id: genId(), score: 5, answer: '', options: [
        { label: '', value: 'A' }, { label: '', value: 'B' }, { label: '', value: 'C' }, { label: '', value: 'D' }
      ]}]
    }
    setSections([...sections, s])
    setCurrentSectionIdx(sections.length)
    setTab('sections')
  }

  const removeSection = (idx: number) => {
    setSections(sections.filter((_, i) => i !== idx))
    if (currentSectionIdx === idx) setCurrentSectionIdx(-1)
    else if (currentSectionIdx > idx) setCurrentSectionIdx(currentSectionIdx - 1)
  }

  // Move section up/down
  const moveSection = (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1
    if (targetIdx < 0 || targetIdx >= sections.length) return
    const copy = [...sections];
    [copy[idx], copy[targetIdx]] = [copy[targetIdx], copy[idx]]
    setSections(copy)
    if (currentSectionIdx === idx) setCurrentSectionIdx(targetIdx)
    else if (currentSectionIdx === targetIdx) setCurrentSectionIdx(idx)
  }

  // HTML5 drag for reorder
  const onDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
    setDragId(id)
  }
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }
  const onDrop = (e: React.DragEvent, toId: string) => {
    e.preventDefault()
    setDragId(null)
    const fromId = e.dataTransfer.getData('text/plain')
    if (fromId === toId) return
    const fromIdx = sections.findIndex(s => s.id === fromId)
    const toIdx = sections.findIndex(s => s.id === toId)
    if (fromIdx === -1 || toIdx === -1) return
    const copy = [...sections];
    [copy[fromIdx], copy[toIdx]] = [copy[toIdx], copy[fromIdx]]
    setSections(copy)
    if (currentSectionIdx === fromIdx) setCurrentSectionIdx(toIdx)
    else if (currentSectionIdx === toIdx) setCurrentSectionIdx(fromIdx)
  }
  const onDragEnd = () => setDragId(null)

  const updateSection = (idx: number, section: Section) => {
    setSections(sections.map((s, i) => i === idx ? section : s))
  }

  const addSubQuestion = (sectionIdx: number) => {
    const s = sections[sectionIdx]
    const isChoice = ['listening', 'reading_careful'].includes(s.type)
    const q: SubQuestion = {
      id: genId(), score: 5, answer: '',
      options: isChoice ? [{ label: '', value: 'A' }, { label: '', value: 'B' }, { label: '', value: 'C' }, { label: '', value: 'D' }] : undefined
    }
    updateSection(sectionIdx, { ...s, questions: [...s.questions, q] })
  }

  const updateSubQuestion = (sectionIdx: number, qIdx: number, question: SubQuestion) => {
    const s = sections[sectionIdx]
    updateSection(sectionIdx, { ...s, questions: s.questions.map((q, i) => i === qIdx ? question : q) })
  }

  const removeSubQuestion = (sectionIdx: number, qIdx: number) => {
    const s = sections[sectionIdx]
    if (s.type === 'reading_cloze') {
      // 删除对应空格（找到第 qIdx 个 ___ 并移除）
      const passage = s.passage || ''
      let count = 0, pos = -1
      while (count <= qIdx) {
        pos = passage.indexOf('___', pos + 1)
        if (pos === -1) break
        count++
      }
      if (pos !== -1) {
        const before = passage.slice(0, pos).replace(/\s+$/, '')
        const after = passage.slice(pos + 3).replace(/^\s+/, '')
        const newPassage = before + (before && after ? ' ' : '') + after
        updateSection(sectionIdx, { ...s, passage: newPassage, questions: s.questions.filter((_, i) => i !== qIdx) })
        return
      }
    }
    updateSection(sectionIdx, { ...s, questions: s.questions.filter((_, i) => i !== qIdx) })
  }

  const handleSave = async () => {
    try {
      if (sections.length === 0) { message.error('请至少添加一个Section'); return }
      const values = form.getFieldsValue(true)
      if (!values.title?.trim()) { message.error('请填写试卷名称'); setTab('info'); return }
      if (!values.level) { message.error('请选择考试级别'); setTab('info'); return }
      if (!values.duration) { message.error('请设置考试时长'); setTab('info'); return }

      const saveData = {
        title: values.title, description: values.description || '',
        level: values.level as ExamLevel,
        category: (values.category || 'mock') as ExamCategory,
        duration: values.duration,
        enabled: values.enabled !== false,
        sections: sections.map(s => ({
          ...s, paragraphs: s.paragraphs || [], wordBank: s.wordBank || [],
          questions: s.questions.map(q => ({ ...q, options: q.options || [] }))
        }))
      }

      if (editingExam) {
        await mockExamService.adminUpdate(editingExam.id, saveData)
        message.success('更新成功')
      } else {
        await mockExamService.adminCreate(saveData)
        message.success('创建成功')
      }
      setShowModal(false); fetchExams()
    } catch (error) {
      message.error('保存失败: ' + (error as Error).message)
    }
  }

  const getTypeColor = (t: SectionType) => {
    if (t === 'listening') return 'blue'
    if (t.startsWith('reading')) return 'green'
    if (t === 'translation') return 'orange'
    if (t === 'writing') return 'purple'
    return 'gray'
  }

  const getLevelColor = (lv: string) => {
    if (lv === 'cet4') return 'blue'
    if (lv === 'cet6') return 'purple'
    if (lv === 'ky1') return 'red'
    if (lv === 'ky2') return 'orange'
    return 'gray'
  }

  const totalQuestions = (s: Section[]) => s.reduce((sum, sec) => sum + (sec.questions?.length || 0), 0)
  const totalScore = (s: Section[]) => parseFloat(s.reduce((sum, sec) => sum + (sec.questions || []).reduce((qs, q) => qs + (q.score || 0), 0), 0).toFixed(2))

  const columns = [
    { title: '试卷名称', dataIndex: 'title', key: 'title', ellipsis: true,
      render: (t: string, r: MockExam) => <span className={r.enabled === false ? 'text-gray-400' : ''}>{t}</span> },
    { title: '分类', dataIndex: 'category', key: 'category', width: 80,
      render: (c: string) => <Tag color={c === 'real' ? 'red' : 'blue'}>{categoryLabels[c as ExamCategory] || c}</Tag> },
    { title: '级别', dataIndex: 'level', key: 'level', width: 110,
      render: (lv: string) => <Tag color={getLevelColor(lv)}>{levelLabels[lv as ExamLevel] || lv}</Tag> },
    { title: '状态', dataIndex: 'enabled', key: 'enabled', width: 70,
      render: (e: boolean) => e === false ? <Tag color="red">禁用</Tag> : <Tag color="green">启用</Tag> },
    { title: '时长', dataIndex: 'duration', key: 'duration', width: 70, render: (d: number) => `${d}分` },
    { title: 'Sections', dataIndex: 'sections', key: 'sections', width: 70, render: (ss: Section[]) => ss?.length || 0 },
    { title: '题数', key: 'total', width: 60, render: (_: unknown, r: MockExam) => totalQuestions(r.sections || []) },
    { title: '总分', key: 'score', width: 80, render: (_: unknown, r: MockExam) => <span className="font-semibold text-blue-600">{totalScore(r.sections || [])}分</span> },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 150,
      render: (t: string) => t ? new Date(t).toLocaleString() : '-' },
    { title: '操作', key: 'actions', width: 210,
      render: (_: unknown, record: MockExam) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => handleView(record)}>查看</Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>编辑</Button>
          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)} okText="确定" cancelText="取消">
            <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      )}
  ]

  // === Section Editor ===
  const renderSectionEditor = () => {
    if (currentSectionIdx < 0 || currentSectionIdx >= sections.length) return (
      <Card className="h-full"><p className="text-gray-400 text-center mt-20">请选择一个Section编辑</p></Card>
    )
    const section = sections[currentSectionIdx]
    const setSec = (s: Section) => updateSection(currentSectionIdx, s)

    return (
      <Card title={`编辑 Section ${currentSectionIdx + 1}`} className="h-full overflow-y-auto" style={{ maxHeight: '70vh' }}
        extra={<Button danger size="small" onClick={() => removeSection(currentSectionIdx)}>删除此Section</Button>}
      >
        <div className="space-y-3">
          {/* Part label + Part title */}
          <div className="flex items-center space-x-2">
            <Input placeholder="Part编号 (如 Part II)" value={section.partLabel || ''} onChange={e => setSec({ ...section, partLabel: e.target.value })} style={{ width: 200 }} />
            <Input placeholder="Part名称 (如 Listening Comprehension)" value={section.partTitle || ''} onChange={e => setSec({ ...section, partTitle: e.target.value })} className="flex-1" />
          </div>

          {/* Section title */}
          <Input placeholder="Section标题 (如 Section A)" value={section.title} onChange={e => setSec({ ...section, title: e.target.value })} />

          {/* Directions */}
          <TextArea placeholder="Directions (答题说明)" rows={3} value={section.directions || ''} onChange={e => setSec({ ...section, directions: e.target.value })} />

          <Select value={section.type} onChange={v => {
            const isChoice = ['listening', 'reading_careful', 'reading_matching'].includes(v as string)
            setSec({ ...section, type: v as SectionType, questions: section.questions.map(q => ({
              ...q, options: isChoice ? (q.options?.length ? q.options : [{ label: '', value: 'A' }, { label: '', value: 'B' }, { label: '', value: 'C' }, { label: '', value: 'D' }]) : undefined
            }))})
          }}>
            {sectionTypes.map(t => <Option key={t.value} title={t.description}>{t.label}</Option>)}
          </Select>

          {section.type === 'listening' && (
            <div className="space-y-2">
              <TextArea placeholder="听力文本/说明" rows={3} value={section.passage || ''} onChange={e => setSec({ ...section, passage: e.target.value })} />
              {/* 听力音频：上传一次会自动同步到所有听力Section */}
              {(() => {
                const firstListeningIdx = sections.findIndex(s => s.type === 'listening')
                const isFirstListening = firstListeningIdx === currentSectionIdx
                const sharedAudioUrl = sections.find(s => s.type === 'listening' && s.audioUrl)?.audioUrl || ''

                if (isFirstListening || !sharedAudioUrl) {
                  return (
                    <>
                      <Upload.Dragger accept="audio/*" action="/api/upload/audio"
                        data={{ old_url: sharedAudioUrl || undefined }}
                        headers={{ Authorization: `Bearer ${useUserStore.getState().token}` }}
                        onChange={(info) => {
                          if (info.file.status === 'done' && info.file.response?.url) {
                            const url = info.file.response.url
                            // Sync to all listening sections
                            setSections(prev => prev.map(s => 
                              s.type === 'listening' ? { ...s, audioUrl: url } : s
                            ))
                            message.success('音频上传成功（已同步到所有听力Section）')
                          } else if (info.file.status === 'error') message.error('上传失败')
                        }}
                      >
                        <AudioOutlined className="text-2xl" />
                        <p>点击上传听力音频（所有听力Section共享）</p>
                      </Upload.Dragger>
                      {sharedAudioUrl && (
                        <div className="flex items-center justify-between bg-green-50 p-2 rounded">
                          <span className="text-sm text-green-600 truncate">已上传: {sharedAudioUrl}</span>
                          <Button size="small" danger onClick={() => {
                            setSections(prev => prev.map(s => 
                              s.type === 'listening' ? { ...s, audioUrl: '' } : s
                            ))
                          }}>删除</Button>
                        </div>
                      )}
                    </>
                  )
                }
                return (
                  <div className="bg-blue-50 p-2 rounded text-sm text-blue-600">
                    听力音频已在第一个听力Section中上传，所有听力Section共享同一音频。
                    {sharedAudioUrl && <div className="truncate mt-1 text-xs text-gray-500">{sharedAudioUrl}</div>}
                  </div>
                )
              })()}
            </div>
          )}

          {/* 阅读类：选词填空无文章标题 */}
          {section.type === 'reading_careful' && (
            <div className="space-y-2">
              <Input placeholder="文章标题" value={section.passageTitle || ''} onChange={e => setSec({ ...section, passageTitle: e.target.value })} />
              <TextArea placeholder="文章内容" rows={6} value={section.passage || ''} onChange={e => setSec({ ...section, passage: e.target.value })} />
            </div>
          )}

          {section.type === 'reading_cloze' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">文章内容（在光标位置点击「插入空格」生成题目，空格用 ___ 标记）</span>
                <Button size="small" type="primary" onClick={insertBlank}>插入空格（生成题目）</Button>
              </div>
              <TextArea ref={clozeTextareaRef} placeholder="文章内容" autoSize={{ minRows: 6, maxRows: 20 }} value={section.passage || ''} onChange={e => {
                const newPassage = e.target.value
                const blankCount = (newPassage.match(/___/g) || []).length
                let questions = [...section.questions]
                while (questions.length > blankCount) questions.pop()
                while (questions.length < blankCount) questions.push({ id: genId(), score: 5, answer: '' } as SubQuestion)
                setSec({ ...section, passage: newPassage, questions })
              }} />
              {/* 文章预览（和用户端一样的渲染） */}
              {section.passage && section.passage.includes('___') && (
                <Card size="small" title="文章预览" className="bg-gray-50">
                  <div className="text-gray-700 leading-8">
                    {(() => {
                      const parts = section.passage.split('___')
                      const wordBank = section.wordBank || []
                      const labels = wordBank.map((_, i) => String.fromCharCode(65 + i))
                      return parts.map((part, i) => {
                        if (i >= parts.length - 1) return <span key={i}>{part}</span>
                        const q = section.questions[i]
                        const answer = q?.answer || ''
                        const abbr = answer || `__${i + 1}__`
                        return (
                          <span key={i}>
                            {part}
                            <Popover trigger="click" placement="bottom" content={
                              <div style={{ width: 260 }}>
                                <div className="text-xs text-gray-400 mb-2">第 {i + 1} 空 — 选择正确答案</div>
                                <div className="flex flex-wrap gap-1.5">
                                  {wordBank.map((w, wi) => {
                                    const l = labels[wi]
                                    const sel = answer === w
                                    return (
                                      <Tag key={w} color={sel ? 'blue' : 'default'} className="cursor-pointer text-sm"
                                        onClick={() => q && updateSubQuestion(currentSectionIdx, i, { ...q, answer: w })}>
                                        {l}. {w}
                                      </Tag>
                                    )
                                  })}
                                </div>
                              </div>
                            }>
                              <button type="button"
                                className={`inline-flex items-center justify-center px-2 py-0.5 mx-0.5 rounded-[6px] cursor-pointer transition-colors font-mono text-sm border align-middle ${
                                  answer ? 'bg-blue-50 border-blue-400 text-blue-700 hover:border-blue-500' : 'bg-gray-100 border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-600'
                                }`}>
                                {answer ? `${i + 1}.${answer}` : abbr}
                              </button>
                            </Popover>
                          </span>
                        )
                      })
                    })()}
                  </div>
                </Card>
              )}
            </div>
          )}

          {section.type === 'reading_matching' && (
            <div className="space-y-2">
              <Input placeholder="文章标题" value={section.passageTitle || ''} onChange={e => setSec({ ...section, passageTitle: e.target.value })} />
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">段落列表</span>
                <Button size="small" onClick={() => setSec({ ...section, paragraphs: [...(section.paragraphs || []), ''] })}>添加段落</Button>
              </div>
              {(section.paragraphs || []).map((p, i) => (
                <div key={i} className="flex items-start space-x-2">
                  <span className="font-bold text-purple-600 mt-2 w-6 text-right">{String.fromCharCode(65 + i)}.</span>
                  <Input.TextArea placeholder={`段落 ${String.fromCharCode(65 + i)}`} value={p} autoSize={{ minRows: 2, maxRows: 8 }} className="flex-1"
                    onChange={e => { const arr = [...(section.paragraphs || [])]; arr[i] = e.target.value; setSec({ ...section, paragraphs: arr }) }} />
                </div>
              ))}
            </div>
          )}

          {section.type === 'reading_cloze' && (
            <div className="space-y-2">
              <span className="text-sm text-gray-500">词库（逐个添加）</span>
              <div className="flex flex-wrap gap-1">
                {(section.wordBank || []).map((w, i) => (
                  <Tag key={i} closable onClose={() => removeWord(i)} color="blue">{w}</Tag>
                ))}
                {(section.wordBank || []).length === 0 && <span className="text-xs text-gray-400">暂无单词，请在下方添加</span>}
              </div>
              <div className="flex items-center space-x-2">
                <Input size="small" placeholder="输入单词" value={newWord} onChange={e => setNewWord(e.target.value)}
                  onPressEnter={addWord} style={{ width: 160 }} />
                <Button size="small" onClick={addWord}>添加</Button>
              </div>
            </div>
          )}

          {(section.type === 'writing' || section.type === 'translation') && (
            <TextArea placeholder="写作/翻译要求" rows={3} value={section.requirements || ''} onChange={e => setSec({ ...section, requirements: e.target.value })} />
          )}

          <Divider />

          <div className="flex items-center justify-between">
            <span className="font-semibold">{section.type === 'reading_cloze' ? `空格/题目 (${section.questions.length}个，由文章中 ___ 自动生成)` : `子题目 (${section.questions.length})`}</span>
            {section.type !== 'reading_cloze' && (
              <Button size="small" icon={<PlusCircleOutlined />} onClick={() => addSubQuestion(currentSectionIdx)}>添加小题</Button>
            )}
          </div>
          <div className="space-y-3">
            {section.questions.map((q, qi) => (
              <Card key={q.id} size="small" title={section.type === 'reading_cloze' ? `第 ${qi + 1} 空` : `小题 ${qi + 1}`} className="border-2 border-blue-100 shadow-sm"
                extra={<Button size="small" danger icon={<MinusCircleOutlined />} onClick={() => removeSubQuestion(currentSectionIdx, qi)} />}
              >
                <div className="space-y-2">
                  {section.type !== 'reading_cloze' && section.type !== 'writing' && section.type !== 'translation' && (
                    <Input placeholder="小标题 (如 Question 1)" value={q.title || ''} onChange={e => updateSubQuestion(currentSectionIdx, qi, { ...q, title: e.target.value })} />
                  )}
                  <div className="pl-2 border-l-2 border-blue-200">
                    <span className="text-xs text-gray-400">分值</span>
                    <InputNumber placeholder="分值" value={q.score} min={0.01} step={0.01} precision={2} className="w-full" onChange={v => updateSubQuestion(currentSectionIdx, qi, { ...q, score: v || 0.01 })} />
                  </div>
                  {q.options && q.options.length > 0 && section.type !== 'reading_cloze' && section.type !== 'reading_matching' && (
                    <div className="space-y-1 pl-2 border-l-2 border-blue-200">
                      <span className="text-xs text-gray-400">选项</span>
                      {q.options.map((opt, oi) => (
                        <div key={oi} className="flex items-center space-x-2">
                          <span className="font-mono w-5 text-sm">{opt.value}.</span>
                          <Input size="small" value={opt.label} onChange={e => {
                            const opts = [...(q.options || [])]; opts[oi] = { ...opt, label: e.target.value }
                            updateSubQuestion(currentSectionIdx, qi, { ...q, options: opts })
                          }} />
                        </div>
                      ))}
                    </div>
                  )}
                  {section.type === 'reading_cloze' ? (
                    <div className="pl-2 border-l-2 border-blue-200">
                      <span className="text-xs text-gray-400">正确答案</span>
                      <Select placeholder="从词库选择" value={q.answer || undefined} onChange={v => updateSubQuestion(currentSectionIdx, qi, { ...q, answer: v })}
                        style={{ width: '100%' }}>
                        {(section.wordBank || []).map(w => <Option key={w} value={w}>{w}</Option>)}
                      </Select>
                    </div>
                  ) : section.type === 'reading_matching' ? (
                    <div className="pl-2 border-l-2 border-blue-200">
                      <span className="text-xs text-gray-400">正确答案（选择对应段落）</span>
                      <Select placeholder="选择段落" value={q.answer || undefined} onChange={v => updateSubQuestion(currentSectionIdx, qi, { ...q, answer: v })}
                        style={{ width: '100%' }}>
                        {(section.paragraphs || []).map((_, pi) => (
                          <Option key={pi + 1} value={String(pi + 1)}>段落 {String.fromCharCode(65 + pi)}</Option>
                        ))}
                      </Select>
                    </div>
                  ) : q.options && q.options.length > 0 ? (
                    <div className="pl-2 border-l-2 border-blue-200">
                      <span className="text-xs text-gray-400">正确答案</span>
                      <Select placeholder="选择正确答案" value={q.answer || undefined} onChange={v => updateSubQuestion(currentSectionIdx, qi, { ...q, answer: v })}
                        style={{ width: '100%' }}>
                        {q.options.map(opt => (
                          <Option key={opt.value} value={opt.value}>{opt.value}. {opt.label}</Option>
                        ))}
                      </Select>
                    </div>
                  ) : section.type === 'writing' || section.type === 'translation' ? (
                    <div className="pl-2 border-l-2 border-blue-200">
                      <span className="text-xs text-gray-400">参考答案</span>
                      <TextArea placeholder="参考答案" autoSize={{ minRows: 4, maxRows: 12 }} value={q.answer} onChange={e => updateSubQuestion(currentSectionIdx, qi, { ...q, answer: e.target.value })} />
                    </div>
                  ) : (
                    <div className="pl-2 border-l-2 border-blue-200">
                      <span className="text-xs text-gray-400">正确答案</span>
                      <Input placeholder="正确答案" value={q.answer} onChange={e => updateSubQuestion(currentSectionIdx, qi, { ...q, answer: e.target.value })} />
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="p-6">
      <Card title="模考管理" 
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>添加试卷</Button>}
      >
        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <Input.Search 
            placeholder="搜索试卷名称" 
            value={searchText} 
            onChange={e => setSearchText(e.target.value)}
            onSearch={handleSearch} 
            style={{ width: 240 }}
            enterButton={<SearchOutlined />}
          />
          <Select 
            placeholder="级别筛选" 
            value={filterLevel} 
            onChange={v => { setFilterLevel(v); setPage(1); setTimeout(() => fetchExams(1), 0) }}
            allowClear 
            style={{ width: 140 }}
          >
            {(Object.entries(levelLabels) as [ExamLevel, string][]).map(([k, v]) => <Option key={k} value={k}>{v}</Option>)}
          </Select>
          <Select 
            placeholder="分类筛选" 
            value={filterCategory} 
            onChange={v => { setFilterCategory(v); setPage(1); setTimeout(() => fetchExams(1), 0) }}
            allowClear 
            style={{ width: 120 }}
          >
            {(Object.entries(categoryLabels) as [ExamCategory, string][]).map(([k, v]) => <Option key={k} value={k}>{v}</Option>)}
          </Select>
          <Button icon={<ReloadOutlined />} onClick={handleReset}>重置</Button>
        </div>

        {/* Batch operations */}
        {selectedIds.length > 0 && (
          <div className="flex items-center space-x-3 mb-3 p-2 bg-blue-50 rounded">
            <span className="text-sm text-gray-600">已选 {selectedIds.length} 项</span>
            <Button size="small" icon={<DeleteOutlined />} danger onClick={handleBatchDelete}>批量删除</Button>
            <Button size="small" onClick={() => handleBatchToggle(true)}>全部启用</Button>
            <Button size="small" onClick={() => handleBatchToggle(false)}>全部禁用</Button>
            <Button size="small" onClick={() => setSelectedIds([])}>取消选择</Button>
          </div>
        )}

        <Table 
          loading={loading} 
          columns={columns} 
          dataSource={exams} 
          rowKey="id" 
          rowSelection={{
            selectedRowKeys: selectedIds,
            onChange: (keys) => setSelectedIds(keys as string[])
          }}
          pagination={{ 
            current: page, pageSize, total,
            onChange: (p, ps) => { setPage(p); setPageSize(ps); fetchExams(p, ps) },
            showSizeChanger: true, showTotal: (t) => `共 ${t} 套`
          }} 
          size="middle"
        />
      </Card>

      {/* Create/Edit Modal */}
      <Modal title={editingExam ? '编辑试卷' : '添加试卷'} open={showModal} onCancel={() => setShowModal(false)} width={1300} footer={null}>
        <div className="flex space-x-2 mb-4 border-b pb-2">
          <Button type={tab === 'info' ? 'primary' : 'default'} onClick={() => setTab('info')}>试卷信息</Button>
          <Button type={tab === 'sections' ? 'primary' : 'default'} onClick={() => setTab('sections')}>
            Section管理 ({sections.length}个 / {totalQuestions(sections)}题)
          </Button>
        </div>

        {tab === 'info' && (
          <div className="space-y-4">
            <Form form={form} layout="vertical" initialValues={{ category: 'mock', enabled: true }}>
              <Row gutter={16}>
                <Col span={12}><Form.Item label="试卷名称" name="title" rules={[{ required: true }]}><Input /></Form.Item></Col>
                <Col span={6}>
                  <Form.Item label="试卷分类" name="category" rules={[{ required: true }]}>
                    <Select>
                      {(Object.entries(categoryLabels) as [ExamCategory, string][]).map(([k, v]) => <Option key={k} value={k}>{v}</Option>)}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item label="考试级别" name="level" rules={[{ required: true }]}>
                    <Select>
                      {(Object.entries(levelLabels) as [ExamLevel, string][]).map(([k, v]) => <Option key={k} value={k}>{v}</Option>)}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={6}><Form.Item label="时长(分钟)" name="duration" rules={[{ required: true }]}><InputNumber min={30} max={180} className="w-full" /></Form.Item></Col>
                <Col span={6}>
                  <Form.Item label="启用状态" name="enabled" valuePropName="checked">
                    <Switch checkedChildren="启用" unCheckedChildren="禁用" />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item label="描述" name="description"><TextArea rows={2} /></Form.Item>
            </Form>
            <div className="flex justify-end space-x-4">
              <Button onClick={() => setShowModal(false)}>取消</Button>
              <Button type="primary" onClick={() => setTab('sections')}>下一步：编辑Section</Button>
            </div>
          </div>
        )}

        {tab === 'sections' && (
          <div className="flex space-x-4" style={{ minHeight: '60vh' }}>
            <div className="w-1/3 space-y-2 border-r pr-4">
              <div className="flex items-center justify-between mb-2">
                <Title level={5} className="!mb-0">Section列表</Title>
                <Button type="primary" icon={<PlusCircleOutlined />} onClick={addSection}>添加</Button>
              </div>
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {sections.length === 0 && <p className="text-gray-400 text-center py-8">暂无Section，请添加</p>}
                {sections.map((s, i) => (
                  <Card key={s.id} size="small"
                    draggable
                    onDragStart={(e) => onDragStart(e, s.id)}
                    onDragOver={onDragOver}
                    onDrop={(e) => onDrop(e, s.id)}
                    onDragEnd={onDragEnd}
                    className={`transition-all duration-150 ${dragId === s.id ? 'opacity-50' : ''} ${currentSectionIdx === i ? 'border-blue-500 bg-blue-50' : ''}`}
                    onClick={() => setCurrentSectionIdx(i)}
                    styles={{ body: { padding: '8px 12px' } }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1">
                        <HolderOutlined className="text-gray-400 cursor-grab mr-1" />
                        <Tag color={getTypeColor(s.type)}>{sectionTypes.find(t=>t.value===s.type)?.label}</Tag>
                        <span className="font-semibold text-sm">{s.title || `Section ${i+1}`}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="text-xs text-gray-400 mr-2">{s.questions.length}题</span>
                        <Button type="text" size="small" icon={<UpOutlined />} disabled={i === 0}
                          onClick={(e) => { e.stopPropagation(); moveSection(i, 'up') }} />
                        <Button type="text" size="small" icon={<DownOutlined />} disabled={i === sections.length - 1}
                          onClick={(e) => { e.stopPropagation(); moveSection(i, 'down') }} />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            <div className="flex-1">{renderSectionEditor()}</div>
          </div>
        )}

        <div className="flex justify-end space-x-4 mt-6 border-t pt-4">
          <Button onClick={() => setShowModal(false)}>取消</Button>
          <Button type="primary" onClick={handleSave}>保存试卷</Button>
        </div>
      </Modal>

      {/* View Detail Modal */}
      <Modal title="试卷详情" open={showDetail} onCancel={() => setShowDetail(false)} width={800} footer={null}>
        {editingExam && (
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <Tag color={editingExam.category === 'real' ? 'red' : 'blue'}>{categoryLabels[editingExam.category] || editingExam.category}</Tag>
              <Tag color={getLevelColor(editingExam.level)}>{levelLabels[editingExam.level] || editingExam.level}</Tag>
              <Tag color={editingExam.enabled === false ? 'red' : 'green'}>{editingExam.enabled === false ? '已禁用' : '已启用'}</Tag>
            </div>
            <p><strong>名称：</strong>{editingExam.title}</p>
            <p><strong>时长：</strong>{editingExam.duration}分钟</p>
            <p><strong>描述：</strong>{editingExam.description || '-'}</p>
            <Divider />
            <Title level={5}>Section结构 ({totalQuestions(editingExam.sections || [])}题)</Title>
            {(editingExam.sections || []).map((s, i) => (
              <Card key={s.id} size="small" title={<>{getSectionLabel(s.type)} - {s.title || `Section ${i+1}`}</>}>
                {s.questions.map((q, qi) => (
                  <div key={q.id} className="flex items-center justify-between py-1 border-b last:border-0">
                    <span>{qi+1}. {q.title || `小题${qi+1}`}</span>
                    <span className="text-sm text-gray-500">{q.score}分</span>
                  </div>
                ))}
              </Card>
            ))}
          </div>
        )}
      </Modal>
    </div>
  )
}

function getSectionLabel(t: SectionType) {
  const map: Record<string, string> = { listening: '听力', reading_cloze: '选词填空', reading_matching: '段落匹配', reading_careful: '仔细阅读', translation: '翻译', writing: '写作' }
  return map[t] || t
}

export default MockExamAdmin
