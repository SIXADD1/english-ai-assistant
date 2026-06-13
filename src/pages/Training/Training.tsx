import React from 'react'
import { Link } from 'react-router-dom'
import { Card, Row, Col } from 'antd'
import {
  AimOutlined,
  BookOutlined,
  EditOutlined,
  FileTextOutlined,
} from '@ant-design/icons'

const modules = [
  {
    key: 'topic',
    title: '审题构思',
    subtitle: '专项训练',
    description: '针对四级、六级真题题干，完成抓取主旨、确定文体、梳理立意、搭建框架全步骤练习',
    icon: <AimOutlined className="text-4xl text-white" />,
    color: 'from-blue-500 to-blue-600',
    path: '/training/topic',
  },
  {
    key: 'material',
    title: '素材应用',
    subtitle: '专项训练',
    description: '联动素材库，完成词汇替换升级、句式改写、论据填充、段落扩写等实战练习',
    icon: <BookOutlined className="text-4xl text-white" />,
    color: 'from-purple-500 to-purple-600',
    path: '/training/material',
  },
  {
    key: 'open-close',
    title: '开头结尾',
    subtitle: '专项训练',
    description: '针对高频题型专项练习开头引入、结尾升华，提供高分改写版本对照学习',
    icon: <EditOutlined className="text-4xl text-white" />,
    color: 'from-green-500 to-green-600',
    path: '/training/open-close',
  },
  {
    key: 'format',
    title: '格式规范',
    subtitle: '专项训练',
    description: '攻克书信、通知、倡议书等应用文格式难题，格式填空、纠错、仿写三位一体',
    icon: <FileTextOutlined className="text-4xl text-white" />,
    color: 'from-orange-500 to-orange-600',
    path: '/training/format',
  },
]

const Training: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">专项训练</h1>
        <p className="text-gray-600">
          针对性突破审题跑偏、格式失分、素材不会用、不会搭建逻辑四大痛点
        </p>
      </div>

      <Row gutter={[24, 24]}>
        {modules.map((module) => (
          <Col xs={24} md={12} key={module.key}>
            <Link to={module.path}>
              <Card
                hoverable
                className="h-full border-0 card-shadow group"
                styles={{ body: { padding: '2rem' } }}
              >
                <div className="flex items-start space-x-6">
                  <div
                    className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${module.color} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}
                  >
                    {module.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="text-2xl font-bold">{module.title}</h3>
                      <span className="text-sm text-gray-500">{module.subtitle}</span>
                    </div>
                    <p className="text-gray-600 mb-4">{module.description}</p>
                    <span className="text-primary-600 font-medium group-hover:underline">
                      开始训练 →
                    </span>
                  </div>
                </div>
              </Card>
            </Link>
          </Col>
        ))}
      </Row>

      {/* Level Selection */}
      <Card className="mt-8 border-0 card-shadow bg-gradient-to-r from-primary-50 to-accent-50" styles={{ body: { padding: '2rem' } }}>
        <div className="text-center">
          <h3 className="text-xl font-bold mb-4">选择备考级别开始训练</h3>
          <div className="flex justify-center space-x-4">
            <div className="px-8 py-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer">
              <div className="text-3xl font-bold text-blue-600 mb-1">四级</div>
              <div className="text-sm text-gray-600">议论文 + 应用文</div>
            </div>
            <div className="px-8 py-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer">
              <div className="text-3xl font-bold text-purple-600 mb-1">六级</div>
              <div className="text-sm text-gray-600">聚焦议论文</div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default Training
