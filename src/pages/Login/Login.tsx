import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Form, Input, Button, Checkbox, message, Card } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { userService } from '../../services/userService'
import { useUserStore } from '../../stores/userStore'

const Login: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useUserStore()
  const [loading, setLoading] = useState(false)

  const from = (location.state as any)?.from || '/'

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true)
    try {
      const response = await userService.login(values.email, values.password)
      login(response.user, response.token)
      message.success('登录成功')
      if (response.user.role === 'admin') {
        navigate('/admin')
      } else {
        navigate(from)
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || '登录失败，请检查邮箱和密码'
      message.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12 px-4 bg-gradient-to-br from-primary-50 via-white to-accent-50">
      <Card className="w-full max-w-md border-0 card-shadow">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold gradient-text mb-2">欢迎回来</h1>
          <p className="text-gray-600">登录您的账号继续学习</p>
        </div>

        <Form
          name="login"
          onFinish={onFinish}
          size="large"
          layout="vertical"
          requiredMark={false}
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' },
            ]}
          >
            <Input
              prefix={<UserOutlined className="text-gray-400" />}
              placeholder="请输入邮箱"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined className="text-gray-400" />}
              placeholder="请输入密码"
            />
          </Form.Item>

          <Form.Item>
            <div className="flex items-center justify-between">
              <Form.Item name="remember" valuePropName="checked" noStyle>
                <Checkbox>记住我</Checkbox>
              </Form.Item>
              <a href="#" className="text-primary-600 hover:text-primary-700">
                忘记密码？
              </a>
            </div>
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              className="w-full h-12"
            >
              登录
            </Button>
          </Form.Item>
        </Form>

        <div className="text-center">
          <span className="text-gray-600">还没有账号？</span>
          <Link
            to="/register"
            className="text-primary-600 hover:text-primary-700 font-medium ml-1"
          >
            立即注册
          </Link>
        </div>
      </Card>
    </div>
  )
}

export default Login
