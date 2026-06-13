import React, { useEffect, useState } from 'react'
import { Card, Row, Col, Statistic, Spin, message } from 'antd'
import { UserOutlined, BookOutlined, FileTextOutlined, CheckCircleOutlined, ArrowUpOutlined, ClockCircleOutlined } from '@ant-design/icons'
import { adminService, type AdminStats } from '../../services/adminService'

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      setLoading(true)
      const data = await adminService.getStats()
      setStats(data)
    } catch (error) {
      message.error('获取统计数据失败')
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      title: '总用户数',
      icon: <UserOutlined className="text-blue-500" />,
      value: stats?.totalUsers || 0,
      suffix: '人',
      bgColor: 'bg-blue-50',
    },
    {
      title: '素材数量',
      icon: <BookOutlined className="text-green-500" />,
      value: stats?.totalMaterials || 0,
      suffix: '条',
      bgColor: 'bg-green-50',
    },
    {
      title: '题目数量',
      icon: <FileTextOutlined className="text-purple-500" />,
      value: stats?.totalQuestions || 0,
      suffix: '道',
      bgColor: 'bg-purple-50',
    },
    {
      title: '批改次数',
      icon: <CheckCircleOutlined className="text-orange-500" />,
      value: stats?.totalCorrections || 0,
      suffix: '次',
      bgColor: 'bg-orange-50',
    },
    {
      title: '今日新增用户',
      icon: <ArrowUpOutlined className="text-red-500" />,
      value: stats?.todayNewUsers || 0,
      suffix: '人',
      bgColor: 'bg-red-50',
    },
    {
      title: '今日批改',
      icon: <ClockCircleOutlined className="text-cyan-500" />,
      value: stats?.todayCorrections || 0,
      suffix: '次',
      bgColor: 'bg-cyan-50',
    },
  ]

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">管理员仪表盘</h1>
      
      <Spin spinning={loading}>
        <Row gutter={[16, 16]}>
          {statCards.map((card) => (
            <Col key={card.title} xs={12} sm={12} lg={4}>
              <Card className={`${card.bgColor} border-0`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm mb-1">{card.title}</p>
                    <Statistic value={card.value} suffix={card.suffix} className="text-2xl" />
                  </div>
                  <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm">
                    {card.icon}
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </Spin>
    </div>
  )
}

export default Dashboard