import React, { useEffect, useState } from 'react'
import { Card, Spin, message, Segmented } from 'antd'
import { UserAddOutlined } from '@ant-design/icons'
import { adminService, type CorrectionStatsItem } from '../../services/adminService'

const CHART_W = 900
const CHART_H = 360
const PADDING_L = 60
const PADDING_R = 40
const PADDING_T = 20
const PADDING_B = 50

const UserStats: React.FC = () => {
  const [data, setData] = useState<CorrectionStatsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [granularity, setGranularity] = useState<string>('day')

  useEffect(() => {
    fetchData()
  }, [granularity])

  const fetchData = async () => {
    try {
      setLoading(true)
      const result = await adminService.getUserStats(granularity)
      setData(result)
    } catch {
      message.error('获取用户统计数据失败')
    } finally {
      setLoading(false)
    }
  }

  const formatLabel = (period: string) => {
    if (granularity === 'week') {
      const match = period.match(/(\d{4})W(\d{2})/)
      if (match) return `${match[1]}W${match[2]}`
    }
    if (granularity === 'month') {
      const [y, m] = period.split('-')
      return `${y}/${m}`
    }
    if (granularity === 'year') return period
    return period.slice(5)
  }

  const total = data.reduce((s, d) => s + d.count, 0)

  const renderLineChart = () => {
    if (data.length === 0) {
      return <div className="text-center py-20 text-gray-400">暂无用户注册数据</div>
    }

    const maxCount = Math.max(...data.map(d => d.count), 1)
    const plotW = CHART_W - PADDING_L - PADDING_R
    const plotH = CHART_H - PADDING_T - PADDING_B

    const points = data.map((d, i) => {
      const x = data.length === 1 ? plotW / 2 : (i / (data.length - 1)) * plotW
      const y = plotH - (d.count / maxCount) * plotH
      return { x, y, ...d }
    })

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ')
    const areaPath = `${linePath} L${points[points.length - 1].x} ${plotH} L${points[0].x} ${plotH} Z`

    const yTicks = 5
    const yStep = Math.ceil(maxCount / yTicks)

    return (
      <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="w-full h-auto">
        <defs>
          <linearGradient id="lineGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        <g transform={`translate(${PADDING_L}, ${PADDING_T})`}>
          {Array.from({ length: yTicks + 1 }).map((_, i) => {
            const val = i * yStep
            const y = plotH - (val / maxCount) * plotH
            if (val > maxCount) return null
            return (
              <g key={i}>
                <line x1={0} y1={y} x2={plotW} y2={y} stroke="#f0f0f0" strokeWidth={1} />
                <text x={-8} y={y + 4} textAnchor="end" fontSize="12" fill="#999">
                  {val}
                </text>
              </g>
            )
          })}

          <path d={areaPath} fill="url(#lineGrad)" />
          <path d={linePath} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

          {points.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="5" fill="#fff" stroke="#2563eb" strokeWidth="2.5" />
              <text
                x={p.x}
                y={p.y - 12}
                textAnchor="middle"
                fontSize="12"
                fontWeight="600"
                fill="#2563eb"
              >
                {p.count}
              </text>
            </g>
          ))}

          {points.map((p, i) => {
            const label = formatLabel(p.period)
            const skip = data.length > 15 ? (data.length > 30 ? 3 : 2) : 1
            if (i % skip !== 0 && i !== data.length - 1) return null
            return (
              <text
                key={`l-${i}`}
                x={p.x}
                y={plotH + 18}
                textAnchor="middle"
                fontSize="11"
                fill="#999"
              >
                {label}
              </text>
            )
          })}
        </g>
      </svg>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <UserAddOutlined className="text-green-500 text-xl" />
        <h1 className="text-2xl font-bold">用户新增统计</h1>
      </div>

      <div className="mb-4 flex items-center justify-between">
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
        <span className="text-gray-500">
          累计新增用户：<span className="text-green-600 font-bold text-lg">{total}</span> 人
        </span>
      </div>

      <Spin spinning={loading}>
        <Card className="overflow-x-auto">{renderLineChart()}</Card>
      </Spin>
    </div>
  )
}

export default UserStats
