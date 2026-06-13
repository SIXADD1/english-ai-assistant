import React, { useEffect, useState } from 'react'
import { Card, Spin, message, Segmented, Tabs } from 'antd'
import { BarChartOutlined, EditOutlined, ExperimentOutlined } from '@ant-design/icons'
import { adminService, type CorrectionStatsItem } from '../../services/adminService'

const CorrectionStats: React.FC = () => {
  const [correctionData, setCorrectionData] = useState<CorrectionStatsItem[]>([])
  const [trainingData, setTrainingData] = useState<CorrectionStatsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [granularity, setGranularity] = useState<string>('day')
  const [activeTab, setActiveTab] = useState<string>('correction')

  useEffect(() => {
    fetchData()
  }, [granularity])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [correction, training] = await Promise.all([
        adminService.getCorrectionStats(granularity),
        adminService.getTrainingStats(granularity),
      ])
      setCorrectionData(correction)
      setTrainingData(training)
    } catch {
      message.error('获取统计数据失败')
    } finally {
      setLoading(false)
    }
  }

  const formatLabel = (period: string) => {
    if (granularity === 'week') {
      const match = period.match(/(\d{4})W(\d{2})/)
      if (match) return `${match[1]} 第${match[2]}周`
    }
    if (granularity === 'month') {
      const [y, m] = period.split('-')
      return `${y}年${m}月`
    }
    if (granularity === 'year') return `${period}年`
    return period
  }

  const renderChart = (data: CorrectionStatsItem[], color: string, emptyText: string) => {
    if (data.length === 0 && !loading) {
      return <div className="text-center py-20 text-gray-400">{emptyText}</div>
    }
    const maxCount = Math.max(...data.map(d => d.count), 1)
    return (
      <div className="space-y-1 max-h-[70vh] overflow-y-auto">
        {data.map((item) => {
          const pct = (item.count / maxCount) * 100
          return (
            <div key={item.period} className="flex items-center gap-3 group">
              <div className="w-32 text-right text-sm text-gray-500 shrink-0">
                {formatLabel(item.period)}
              </div>
              <div className="flex-1">
                <div
                  className="h-8 rounded-r-md transition-all flex items-center px-2 min-w-[2rem]"
                  style={{ width: `${Math.max(pct, 1)}%`, backgroundColor: color }}
                >
                  <span className="text-white text-sm font-medium whitespace-nowrap">
                    {item.count} 次
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const totalCorrections = correctionData.reduce((s, d) => s + d.count, 0)
  const totalTraining = trainingData.reduce((s, d) => s + d.count, 0)

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <BarChartOutlined className="text-blue-500 text-xl" />
        <h1 className="text-2xl font-bold">批改次数统计</h1>
      </div>

      <div className="mb-4">
        <Segmented
          value={granularity}
          onChange={val => setGranularity(val as string)}
          options={[
            { value: 'day', label: '按日' },
            { value: 'week', label: '按周' },
            { value: 'month', label: '按月' },
            { value: 'year', label: '按年' },
          ]}
        />
      </div>

      <Spin spinning={loading}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'correction',
              label: (
                <span>
                  <EditOutlined className="mr-1" />
                  作文批改 <span className="text-blue-500 font-semibold">{totalCorrections}</span> 次
                </span>
              ),
              children: (
                <Card>{renderChart(correctionData, '#1677ff', '暂无批改记录')}</Card>
              ),
            },
            {
              key: 'training',
              label: (
                <span>
                  <ExperimentOutlined className="mr-1" />
                  专项训练 <span className="text-purple-500 font-semibold">{totalTraining}</span> 次
                </span>
              ),
              children: (
                <Card>{renderChart(trainingData, '#722ed1', '暂无训练记录')}</Card>
              ),
            },
          ]}
        />
      </Spin>
    </div>
  )
}

export default CorrectionStats
