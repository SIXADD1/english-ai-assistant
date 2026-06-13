import React, { useEffect, useState } from 'react'
import { Card, Row, Col, Statistic, Progress, Tag, Table, Tabs, Button, Avatar, Spin, Popconfirm, Modal, message, Input, Form, Upload, Slider } from 'antd'
import {
  UserOutlined,
  BookOutlined,
  EditOutlined,
  TrophyOutlined,
  EyeOutlined,
  DeleteOutlined,
  StarFilled,
  BarChartOutlined,
  SettingOutlined,
  LockOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import type { UploadFile } from 'antd/es/upload'
import Cropper, { Area } from 'react-easy-crop'
import type { LearningStats } from '../../types'
import { useUserStore } from '../../stores/userStore'
import { userService } from '../../services/userService'
import { useNavigate } from 'react-router-dom'

const Personal: React.FC = () => {
  const { userInfo } = useUserStore()
  const navigate = useNavigate()
  const [stats, setStats] = useState<LearningStats | null>(null)
  const [records, setRecords] = useState<any[]>([])
  const [corrections, setCorrections] = useState<any[]>([])
  const [favorites, setFavorites] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRecordKeys, setSelectedRecordKeys] = useState<React.Key[]>([])
  const [selectedCorrectionKeys, setSelectedCorrectionKeys] = useState<React.Key[]>([])
  const [mockExamRecords, setMockExamRecords] = useState<any[]>([])
  const [selectedMockExamKeys, setSelectedMockExamKeys] = useState<React.Key[]>([])
  const [trainingDetail, setTrainingDetail] = useState<any>(null)
  const [profileVisible, setProfileVisible] = useState(false)
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [profileLoading, setProfileLoading] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [profileForm] = Form.useForm()
  const [passwordForm] = Form.useForm()
  const [avatarFile, setAvatarFile] = useState<UploadFile | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [cropImage, setCropImage] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [cropArea, setCropArea] = useState<Area | null>(null)

  const { updateUser } = useUserStore()

  const getCroppedBlob = (): Promise<Blob> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.src = cropImage!
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const scaleX = img.naturalWidth / img.width
        const scaleY = img.naturalHeight / img.height
        canvas.width = cropArea!.width * scaleX
        canvas.height = cropArea!.height * scaleY
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(
          img,
          cropArea!.x * scaleX,
          cropArea!.y * scaleY,
          cropArea!.width * scaleX,
          cropArea!.height * scaleY,
          0, 0,
          canvas.width,
          canvas.height
        )
        canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.9)
      }
    })
  }

  const handleCropConfirm = async () => {
    if (!cropImage || !cropArea) return
    const blob = await getCroppedBlob()
    const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' })
    setAvatarFile({ uid: '-1', name: 'avatar.jpg', status: 'done', originFileObj: file } as UploadFile)
    setCropImage(null)
  }

  const handleEditProfile = () => {
    profileForm.setFieldsValue({ username: userInfo?.username })
    setAvatarFile(null)
    setProfileVisible(true)
  }

  const handleSaveProfile = async () => {
    try {
      const values = await profileForm.validateFields()
      setProfileLoading(true)

      let newAvatarUrl: string | undefined
      if (avatarFile && avatarFile.originFileObj) {
        setAvatarUploading(true)
        const result = await userService.uploadAvatar(avatarFile.originFileObj as File)
        newAvatarUrl = result.avatarUrl
        setAvatarUploading(false)
      }

      const result = await userService.updateProfile({ username: values.username, avatarUrl: newAvatarUrl } as any)
      updateUser({ username: result.username, avatarUrl: result.avatarUrl })
      message.success('个人资料更新成功')
      setProfileVisible(false)
      setAvatarFile(null)
    } catch (e: any) {
      if (e?.errorFields) return
      message.error(e?.response?.data?.error || '更新失败')
    } finally {
      setProfileLoading(false)
      setAvatarUploading(false)
    }
  }

  const handleChangePassword = () => {
    passwordForm.resetFields()
    setPasswordVisible(true)
  }

  const handleSavePassword = async () => {
    try {
      const values = await passwordForm.validateFields()
      setPasswordLoading(true)
      await userService.changePassword(values.oldPassword, values.newPassword)
      message.success('密码修改成功，请重新登录')
      setPasswordVisible(false)
      setTimeout(() => {
        useUserStore.getState().logout()
        navigate('/login')
      }, 1500)
    } catch (e: any) {
      if (e?.errorFields) return
      message.error(e?.response?.data?.error || '修改失败')
    } finally {
      setPasswordLoading(false)
    }
  }

  const trainingTypeMap: Record<string, string> = {
    topic_analysis: '话题分析',
    material_apply: '素材运用',
    open_close: '开头结尾',
    format: '格式规范',
  }

  useEffect(() => {
    window.scrollTo(0, 0)
    const fetchUserData = async () => {
      setLoading(true)
      try { const d = await userService.getStats(); setStats(d) } catch (e) { console.error('stats失败:', e) }
      try { const d = await userService.getRecords(1, 100); setRecords(d.records || []) } catch (e) { console.error('records失败:', e) }
      try { const d = await userService.getCorrections(1, 100); setCorrections(d.corrections || []) } catch (e) { console.error('corrections失败:', e) }
      try { const d = await userService.getMockExamRecords(1, 100); setMockExamRecords(d.records || []) } catch (e) { console.error('模考记录失败:', e) }
      try { const d = await userService.getFavorites(1, 10); setFavorites(d.favorites || []) } catch (e) { console.error('favorites失败:', e) }
      setLoading(false)
    }
    fetchUserData()
  }, [])

  const handleDeleteRecord = async (id: string, _type?: string) => {
    try {
      await userService.deleteRecord(id)
      message.success('删除成功')
      setRecords(prev => prev.filter(r => r.id !== id))
      setSelectedRecordKeys(prev => prev.filter(k => k !== id))
    } catch (e) {
      message.error('删除失败')
    }
  }

  const handleBatchDeleteRecords = async () => {
    try {
      const ids = selectedRecordKeys.map(String)
      await userService.batchDeleteRecords(ids)
      message.success(`已删除 ${ids.length} 条记录`)
      setRecords(prev => prev.filter(r => !ids.includes(r.id)))
      setSelectedRecordKeys([])
    } catch (e) {
      message.error('批量删除失败')
    }
  }

  const handleUnfavorite = async (record: any) => {
    const materialId = record.materialId || record.id
    try {
      await userService.removeFavorite(materialId)
      message.success('已取消收藏')
      setFavorites(prev => prev.filter(f => f.id !== record.id))
    } catch {
      message.error('取消收藏失败')
    }
  }

  const handleDeleteCorrection = async (id: string) => {
    try {
      await userService.deleteRecord(id)
      message.success('删除成功')
      setCorrections(prev => prev.filter(r => r.id !== id))
      setSelectedCorrectionKeys(prev => prev.filter(k => k !== id))
    } catch (e) {
      message.error('删除失败')
    }
  }

  const handleBatchDeleteCorrections = async () => {
    try {
      const ids = selectedCorrectionKeys.map(String)
      await userService.batchDeleteRecords(ids)
      message.success(`已删除 ${ids.length} 条记录`)
      setCorrections(prev => prev.filter(r => !ids.includes(r.id)))
      setSelectedCorrectionKeys([])
    } catch (e) {
      message.error('批量删除失败')
    }
  }

  const handleDeleteMockExamRecord = async (id: string) => {
    try {
      await userService.deleteMockExamRecord(id)
      message.success('删除成功')
      setMockExamRecords(prev => prev.filter(r => r.id !== id))
      setSelectedMockExamKeys(prev => prev.filter(k => k !== id))
    } catch { message.error('删除失败') }
  }

  const handleBatchDeleteMockExamRecords = async () => {
    try {
      const ids = selectedMockExamKeys.map(String)
      await userService.batchDeleteMockExamRecords(ids)
      message.success(`已删除 ${ids.length} 条记录`)
      setMockExamRecords(prev => prev.filter(r => !ids.includes(r.id)))
      setSelectedMockExamKeys([])
    } catch { message.error('批量删除失败') }
  }

  const recordColumns = [
    { title: '标题', dataIndex: 'title', key: 'title' },
    {
      title: '得分',
      dataIndex: 'score',
      key: 'score',
      render: (score: number) => score != null ? <Tag color={score >= 11 ? 'green' : score >= 8 ? 'blue' : 'orange'}>{score}分</Tag> : <span className="text-gray-400">-</span>,
    },
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => date ? new Date(date).toLocaleString('zh-CN') : '-',
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        if (type === 'writing') return <Tag color="blue">写作</Tag>
        if (type === 'mock_exam') return <Tag color="orange">模考</Tag>
        const label = trainingTypeMap[type]
        return <Tag color="purple">{label || '训练'}</Tag>
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <div className="flex items-center gap-2">
          {record.type === 'writing' && record.correctionId ? (
            <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => navigate(`/correction/${record.correctionId}`)}>
              查看
            </Button>
          ) : record.type === 'mock_exam' ? (
            <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => navigate(`/mock-exam/result/${record.id}`)}>
              查看
            </Button>
          ) : record.type !== 'writing' ? (
            <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => setTrainingDetail(record)}>
              查看
            </Button>
          ) : null}
          <Popconfirm
            title="确定删除这条记录吗？"
            onConfirm={() => handleDeleteRecord(record.id, record.type)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </div>
      ),
    },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <Spin spinning={loading}>
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">个人中心</h1>
          <p className="text-gray-600">查看学习数据，管理个人收藏和写作记录</p>
        </div>

      {/* User Info */}
      <Card className="mb-6 border-0 card-shadow" styles={{ body: { padding: '2rem' } }}>
        <div className="flex items-center space-x-6">
          <Avatar
            size={80}
            src={userInfo?.avatarUrl || (userInfo as any)?.avatar || (userInfo as any)?.avatar_url || undefined}
            icon={(!userInfo?.avatarUrl && !(userInfo as any)?.avatar && !(userInfo as any)?.avatar_url) ? <UserOutlined /> : undefined}
            className="bg-primary-600"
          />
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-1">{userInfo?.username || '学习者'}</h2>
            <p className="text-gray-600 mb-2">{userInfo?.email || 'user@example.com'}</p>
            <Tag color="blue">{userInfo?.level === 'both' ? '四级+六级' : userInfo?.level === 'cet4' ? '四级' : '六级'}</Tag>
          </div>
          <div className="flex flex-col gap-2">
            <Button icon={<SettingOutlined />} onClick={handleEditProfile}>编辑资料</Button>
            <Button icon={<LockOutlined />} onClick={handleChangePassword}>修改密码</Button>
          </div>
        </div>
      </Card>

      {/* Stats Overview */}
      <Row gutter={[24, 24]} className="mb-6">
        <Col xs={12} md={6}>
          <Card className="border-0 card-shadow" styles={{ body: { padding: '1.5rem' } }}>
            <Statistic
              title="素材收藏数量"
              value={stats?.totalMaterials}
              prefix={<BookOutlined />}
              valueStyle={{ color: '#2563eb' }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card className="border-0 card-shadow" styles={{ body: { padding: '1.5rem' } }}>
            <Statistic
              title="写作次数"
              value={stats?.totalWritings}
              prefix={<EditOutlined />}
              valueStyle={{ color: '#9333ea' }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card className="border-0 card-shadow" styles={{ body: { padding: '1.5rem' } }}>
            <Statistic
              title="平均得分"
              value={stats?.averageScore}
              suffix="分"
              prefix={<TrophyOutlined />}
              valueStyle={{ color: '#10b981' }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card className="border-0 card-shadow" styles={{ body: { padding: '1.5rem' } }}>
            <Statistic
              title="模考次数"
              value={mockExamRecords.length}
              prefix={<BarChartOutlined />}
              valueStyle={{ color: '#f59e0b' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Records */}
      <Card className="border-0 card-shadow" styles={{ body: { padding: '1.5rem' } }}>
        <Tabs
          items={[
            {
              key: 'records',
              label: '学习记录',
              children: records.length > 0 ? (
                <div>
                  {selectedRecordKeys.length > 0 && (
                    <div className="mb-3">
                      <Popconfirm
                        title={`确定删除选中的 ${selectedRecordKeys.length} 条记录吗？`}
                        onConfirm={handleBatchDeleteRecords}
                        okText="确定"
                        cancelText="取消"
                      >
                        <Button danger icon={<DeleteOutlined />}>
                          批量删除 ({selectedRecordKeys.length})
                        </Button>
                      </Popconfirm>
                    </div>
                  )}
                  <Table
                    dataSource={records}
                    columns={recordColumns}
                    rowKey="id"
                    rowSelection={{
                      selectedRowKeys: selectedRecordKeys,
                      onChange: setSelectedRecordKeys,
                    }}
                    pagination={{ pageSize: 15 }}
                  />
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <BookOutlined className="text-4xl mb-4" />
                  <p>暂无学习记录</p>
                </div>
              ),
            },
            {
              key: 'corrections',
              label: '批改记录',
              children: corrections.length > 0 ? (
                <div>
                  {selectedCorrectionKeys.length > 0 && (
                    <div className="mb-3">
                      <Popconfirm
                        title={`确定删除选中的 ${selectedCorrectionKeys.length} 条记录吗？`}
                        onConfirm={handleBatchDeleteCorrections}
                        okText="确定"
                        cancelText="取消"
                      >
                        <Button danger icon={<DeleteOutlined />}>
                          批量删除 ({selectedCorrectionKeys.length})
                        </Button>
                      </Popconfirm>
                    </div>
                  )}
                  <Table
                    dataSource={corrections}
                    columns={[
                      { title: '标题', dataIndex: 'title', key: 'title' },
                      {
                        title: '得分',
                        dataIndex: 'score',
                        key: 'score',
                        render: (score: number) => (
                          <Tag color={score >= 11 ? 'green' : score >= 8 ? 'blue' : 'orange'}>
                            {score}分
                          </Tag>
                        ),
                      },
                      { title: '错误数', dataIndex: 'errors', key: 'errors', render: (n: number) => `${n}处` },
                      { title: '日期', dataIndex: 'date', key: 'date' },
                      {
                        title: '操作',
                        key: 'action',
                        render: (_: any, record: any) => (
                          <div className="flex items-center gap-2">
                            <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => navigate(`/correction/${record.id}`)}>
                              查看
                            </Button>
                            <Popconfirm
                              title="确定删除这条记录吗？"
                              onConfirm={() => handleDeleteCorrection(record.id)}
                              okText="确定"
                              cancelText="取消"
                            >
                              <Button type="link" size="small" danger icon={<DeleteOutlined />} />
                            </Popconfirm>
                          </div>
                        ),
                      },
                    ]}
                    rowKey="id"
                    rowSelection={{
                      selectedRowKeys: selectedCorrectionKeys,
                      onChange: setSelectedCorrectionKeys,
                    }}
                    pagination={{ pageSize: 15 }}
                  />
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <EditOutlined className="text-4xl mb-4" />
                  <p>暂无批改记录</p>
                </div>
              ),
            },
            {
              key: 'favorites',
              label: '我的收藏',
              children: favorites.length > 0 ? (
                <Table
                  dataSource={favorites}
                  columns={[
                    { title: '标题', dataIndex: 'title', key: 'title' },
                    { title: '分类', dataIndex: 'category', key: 'category', render: (cat: string) => {
                      const categoryMap: Record<string, string> = {
                        topic: '话题素材',
                        sentence: '句型模板',
                        transition: '过渡衔接',
                        opening: '开头素材',
                        closing: '结尾素材',
                      }
                      return <Tag color="green">{categoryMap[cat] || cat}</Tag>
                    }},
                    { title: '摘要', dataIndex: 'content', key: 'content' },
                    { title: '收藏日期', dataIndex: 'date', key: 'date', width: 120 },
                    {
                      title: '操作',
                      key: 'action',
                      width: 120,
                      render: (_: any, record: any) => (
                        <Popconfirm
                          title="确定取消收藏吗？"
                          onConfirm={() => handleUnfavorite(record)}
                          okText="确定"
                          cancelText="取消"
                        >
                          <Button type="link" icon={<StarFilled className="text-yellow-500" />}>
                            取消收藏
                          </Button>
                        </Popconfirm>
                      ),
                    },
                  ]}
                  rowKey="id"
                  pagination={{ pageSize: 15 }}
                />
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <BookOutlined className="text-4xl mb-4" />
                  <p>暂无收藏内容</p>
                </div>
              ),
            },
            {
              key: 'mockExams',
              label: '模考记录',
              children: mockExamRecords.length > 0 ? (
                <div>
                  {selectedMockExamKeys.length > 0 && (
                    <div className="mb-3">
                      <Popconfirm
                        title={`确定删除选中的 ${selectedMockExamKeys.length} 条模考记录吗？`}
                        onConfirm={handleBatchDeleteMockExamRecords}
                        okText="确定"
                        cancelText="取消"
                      >
                        <Button danger icon={<DeleteOutlined />}>
                          批量删除 ({selectedMockExamKeys.length})
                        </Button>
                      </Popconfirm>
                    </div>
                  )}
                  <Table
                    dataSource={mockExamRecords}
                    columns={[
                      { title: '试卷名称', dataIndex: 'title', key: 'title' },
                      {
                        title: '得分',
                        dataIndex: 'score',
                        key: 'score',
                        render: (score: number) => score != null ? (
                          <Tag color={score >= 60 ? 'green' : score >= 40 ? 'blue' : 'orange'}>
                            {score}分
                          </Tag>
                        ) : <span className="text-gray-400">-</span>,
                      },
                      {
                        title: '级别',
                        dataIndex: 'level',
                        key: 'level',
                        render: (level: string) => {
                          const m: Record<string, string> = { cet4: '四级', cet6: '六级', ky1: '考研一', ky2: '考研二' }
                          return <Tag>{m[level] || level || '-'}</Tag>
                        },
                      },
                      {
                        title: '状态',
                        dataIndex: 'status',
                        key: 'status',
                        render: (status: string) => status === 'completed' ? <Tag color="green">已完成</Tag> : <Tag color="orange">进行中</Tag>,
                      },
                      {
                        title: '日期',
                        dataIndex: 'date',
                        key: 'date',
                        render: (date: string) => date ? new Date(date).toLocaleString('zh-CN') : '-',
                      },
                      {
                        title: '操作',
                        key: 'action',
                        render: (_: any, record: any) => (
                          <div className="flex items-center gap-2">
                            <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => navigate(`/mock-exam/result/${record.id}`)}>
                              查看
                            </Button>
                            <Popconfirm
                              title="确定删除这条模考记录吗？"
                              onConfirm={() => handleDeleteMockExamRecord(record.id)}
                              okText="确定"
                              cancelText="取消"
                            >
                              <Button type="link" size="small" danger icon={<DeleteOutlined />} />
                            </Popconfirm>
                          </div>
                        ),
                      },
                    ]}
                    rowKey="id"
                    rowSelection={{
                      selectedRowKeys: selectedMockExamKeys,
                      onChange: setSelectedMockExamKeys,
                    }}
                    pagination={{ pageSize: 15 }}
                  />
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <TrophyOutlined className="text-4xl mb-4" />
                  <p>暂无模考记录</p>
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* Learning Progress */}
      <Card className="mt-6 border-0 card-shadow" styles={{ body: { padding: '1.5rem' } }}>
        <h3 className="text-xl font-bold mb-6">学习进度</h3>
        <Row gutter={[32, 32]}>
          <Col xs={24} md={12}>
            <div className="mb-4">
              <div className="flex justify-between mb-2">
                <span>素材学习</span>
                <span>60%</span>
              </div>
              <Progress percent={60} strokeColor="#2563eb" />
            </div>
            <div className="mb-4">
              <div className="flex justify-between mb-2">
                <span>专项训练</span>
                <span>45%</span>
              </div>
              <Progress percent={45} strokeColor="#9333ea" />
            </div>
          </Col>
          <Col xs={24} md={12}>
            <div className="mb-4">
              <div className="flex justify-between mb-2">
                <span>在线写作</span>
                <span>30%</span>
              </div>
              <Progress percent={30} strokeColor="#10b981" />
            </div>
            <div className="mb-4">
              <div className="flex justify-between mb-2">
                <span>模考练习</span>
                <span>15%</span>
              </div>
              <Progress percent={15} strokeColor="#f59e0b" />
            </div>
          </Col>
        </Row>
      </Card>
      </Spin>

      <Modal
        title={trainingDetail?.title || '训练详情'}
        open={!!trainingDetail}
        onCancel={() => setTrainingDetail(null)}
        footer={null}
        width={700}
      >
        {trainingDetail && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Tag color="purple">{trainingTypeMap[trainingDetail.type] || '训练'}</Tag>
              {trainingDetail.score != null && (
                <Tag color={trainingDetail.score >= 11 ? 'green' : trainingDetail.score >= 8 ? 'blue' : 'orange'}>
                  {trainingDetail.score}分
                </Tag>
              )}
              {trainingDetail.date && (
                <span className="text-gray-500 text-sm">
                  {new Date(trainingDetail.date).toLocaleString('zh-CN')}
                </span>
              )}
            </div>

            {trainingDetail.answer && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2 text-gray-700">你的答案</h4>
                <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">{trainingDetail.answer}</p>
              </div>
            )}

            {trainingDetail.aiFeedback && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2 text-blue-700">AI 反馈</h4>
                <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">{trainingDetail.aiFeedback}</p>
              </div>
            )}

            {!trainingDetail.answer && !trainingDetail.aiFeedback && (
              <div className="text-center py-8 text-gray-400">暂无详细内容</div>
            )}
          </div>
        )}
      </Modal>

      {/* 裁剪头像弹窗 */}
      <Modal
        title="裁剪头像"
        open={!!cropImage}
        onCancel={() => setCropImage(null)}
        onOk={handleCropConfirm}
        okText="确定"
        cancelText="取消"
        width={520}
      >
        <div className="relative w-full" style={{ height: 300 }}>
          {cropImage && (
            <Cropper
              image={cropImage}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, area) => setCropArea(area)}
            />
          )}
        </div>
        <div className="mt-4 flex items-center gap-3">
          <span className="text-sm text-gray-500">缩放</span>
          <Slider
            min={1}
            max={3}
            step={0.1}
            value={zoom}
            onChange={setZoom}
            className="flex-1"
          />
        </div>
      </Modal>

      {/* 编辑个人资料弹窗 */}
      <Modal
        title="编辑个人资料"
        open={profileVisible}
        onCancel={() => setProfileVisible(false)}
        onOk={handleSaveProfile}
        confirmLoading={profileLoading || avatarUploading}
        okText="保存"
        cancelText="取消"
      >
        <Form form={profileForm} layout="vertical" className="mt-4">
          <Form.Item label="头像">
            <Upload
              listType="picture-card"
              maxCount={1}
              fileList={avatarFile ? [avatarFile] : []}
              beforeUpload={(file) => {
                const isImage = file.type.startsWith('image/')
                if (!isImage) {
                  message.error('只能上传图片文件')
                  return Upload.LIST_IGNORE
                }
                const isLt2M = file.size / 1024 / 1024 < 2
                if (!isLt2M) {
                  message.error('图片大小不能超过 2MB')
                  return Upload.LIST_IGNORE
                }
                const reader = new FileReader()
                reader.onload = () => {
                  setCropImage(reader.result as string)
                  setCrop({ x: 0, y: 0 })
                  setZoom(1)
                }
                reader.readAsDataURL(file)
                return false
              }}
              onRemove={() => setAvatarFile(null)}
            >
              {!avatarFile && (
                <div>
                  <PlusOutlined />
                  <div className="mt-2">上传头像</div>
                </div>
              )}
            </Upload>
          </Form.Item>
          <Form.Item
            name="username"
            label="用户名"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 2, max: 20, message: '用户名长度2-20个字符' },
            ]}
          >
            <Input placeholder="请输入用户名" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 修改密码弹窗 */}
      <Modal
        title="修改密码"
        open={passwordVisible}
        onCancel={() => setPasswordVisible(false)}
        onOk={handleSavePassword}
        confirmLoading={passwordLoading}
        okText="确认修改"
        cancelText="取消"
      >
        <Form form={passwordForm} layout="vertical" className="mt-4">
          <Form.Item
            name="oldPassword"
            label="旧密码"
            rules={[{ required: true, message: '请输入旧密码' }]}
          >
            <Input.Password placeholder="请输入旧密码" />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码长度不能少于6位' },
            ]}
          >
            <Input.Password placeholder="请输入新密码" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="确认新密码"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: '请确认新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve()
                  }
                  return Promise.reject(new Error('两次密码输入不一致'))
                },
              }),
            ]}
          >
            <Input.Password placeholder="请再次输入新密码" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Personal
