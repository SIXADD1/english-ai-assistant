import React, { useState, useEffect } from 'react'
import { Form, Input, Button, Rate, Select, message } from 'antd'
import { SendOutlined, StarOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { useUserStore } from '../../stores/userStore'

const { TextArea } = Input
const { Option } = Select

const Feedback: React.FC = () => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()
  const { isLoggedIn } = useUserStore()

  useEffect(() => {
    if (!isLoggedIn) {
      message.info('请先登录后再提交反馈')
      navigate('/login', { state: { from: '/feedback' } })
    }
  }, [isLoggedIn, navigate])

  useEffect(() => {
    // 初始化表单默认值
    form.setFieldsValue({ rating: 5 })
  }, [])

  if (!isLoggedIn) {
    return null
  }

  const handleSubmit = async () => {
    form.validateFields().then(async (values) => {
      setLoading(true)
      try {
        console.log('提交的数据:', values)
        const response = await api.post('/feedback', values)
        console.log('响应:', response)
        message.success('感谢您的反馈！我们会认真处理您的意见。')
        form.resetFields()
      } catch (error: any) {
        console.error('提交失败:', error.response?.data || error.message)
        message.error(error.response?.data?.error || '提交失败，请稍后重试')
      } finally {
        setLoading(false)
      }
    }).catch((info) => {
      console.log('表单验证失败:', info)
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">意见反馈</h1>
          <p className="text-gray-500">您的意见对我们非常重要，感谢您的宝贵反馈！</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <Form
            form={form}
            layout="vertical"
            className="space-y-6"
          >
            <Form.Item
              name="rating"
              label="满意度评价"
              rules={[{ required: true, message: '请选择满意度' }]}
            >
              <Rate
                allowHalf={false}
                defaultValue={5}
                character={<StarOutlined />}
                className="text-yellow-500"
                onChange={(value) => {
                  form.setFieldsValue({ rating: value })
                }}
              />
            </Form.Item>

            <Form.Item
              name="category"
              label="反馈类型"
              rules={[{ required: true, message: '请选择反馈类型' }]}
            >
              <Select placeholder="请选择反馈类型">
                <Option value="suggestion">功能建议</Option>
                <Option value="bug">问题报告</Option>
                <Option value="content">内容问题</Option>
                <Option value="other">其他</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="content"
              label="反馈内容"
              rules={[
                { required: true, message: '请输入反馈内容' },
                { min: 10, message: '反馈内容至少需要10个字符' }
              ]}
            >
              <TextArea
                rows={6}
                placeholder="请详细描述您的意见或建议..."
                className="resize-none"
              />
            </Form.Item>

            <Form.Item
              name="contact"
              label="联系方式（选填）"
            >
              <Input
                placeholder="您的邮箱或手机号（便于我们回复您）"
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                onClick={handleSubmit}
                loading={loading}
                block
                icon={<SendOutlined />}
                className="bg-blue-600 hover:bg-blue-700"
              >
                提交反馈
              </Button>
            </Form.Item>
          </Form>
        </div>

        <div className="mt-6 text-center text-sm text-gray-400">
          <p>我们会在3个工作日内处理您的反馈</p>
        </div>
      </div>
    </div>
  )
}

export default Feedback
