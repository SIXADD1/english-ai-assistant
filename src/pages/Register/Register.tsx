import React, { useState, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Form, Input, Button, Select, message, Card } from 'antd'
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons'
import { userService } from '../../services/userService'
import { useUserStore } from '../../stores/userStore'

const Register: React.FC = () => {
  const navigate = useNavigate()
  const { login } = useUserStore()
  const [loading, setLoading] = useState(false)
  const [form] = Form.useForm()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const onFinish = async (values: {
    username: string
    email: string
    password: string
    confirmPassword: string
    level: string
  }) => {
    if (values.password !== values.confirmPassword) {
      message.error('两次输入的密码不一致')
      return
    }

    setLoading(true)
    try {
      const response = await userService.register(
        values.username,
        values.email,
        values.password,
        values.level
      )
      login(response.user, response.token)
      message.success('注册成功')
      navigate('/')
    } catch (error: any) {
      const errMsg = error?.response?.data?.error || '注册失败，请稍后重试'
      message.error(errMsg)
    } finally {
      setLoading(false)
    }
  }

  // 检查用户名的异步校验器（带防抖）
  const checkUsernameAvailability = useCallback(
    (_: any, value: string) => {
      if (!value || value.trim().length < 2) {
        return Promise.resolve()
      }

      return new Promise<void>((resolve, reject) => {
        if (debounceRef.current) {
          clearTimeout(debounceRef.current)
        }
        debounceRef.current = setTimeout(async () => {
          try {
            const available = await userService.checkUsername(value.trim())
            if (available) {
              resolve()
            } else {
              reject(new Error('用户名已存在'))
            }
          } catch {
            resolve() // 接口异常时不阻拦用户注册
          }
        }, 500)
      })
    },
    []
  )

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12 px-4 bg-gradient-to-br from-primary-50 via-white to-accent-50">
      <Card className="w-full max-w-md border-0 card-shadow">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold gradient-text mb-2">创建账号</h1>
          <p className="text-gray-600">开始你的四六级写作提分之旅</p>
        </div>

        <Form
          form={form}
          name="register"
          onFinish={onFinish}
          size="large"
          layout="vertical"
          requiredMark={false}
        >
          <Form.Item
            name="username"
            validateDebounce={800}
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 2, max: 20, message: '用户名长度为2-20个字符' },
              { validator: checkUsernameAvailability },
            ]}
          >
            <Input prefix={<UserOutlined className="text-gray-400" />} placeholder="请输入用户名" />
          </Form.Item>

          <Form.Item
            name="email"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' },
            ]}
          >
            <Input prefix={<MailOutlined className="text-gray-400" />} placeholder="请输入邮箱" />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码至少6个字符' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined className="text-gray-400" />}
              placeholder="请输入密码"
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            rules={[
              { required: true, message: '请确认密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve()
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'))
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined className="text-gray-400" />}
              placeholder="请确认密码"
            />
          </Form.Item>

          <Form.Item
            name="level"
            rules={[{ required: true, message: '请选择备考级别' }]}
          >
            <Select placeholder="请选择您的备考级别" size="large">
              <Select.Option value="cet4">大学英语四级</Select.Option>
              <Select.Option value="cet6">大学英语六级</Select.Option>
              <Select.Option value="both">四级+六级</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              className="w-full h-12"
            >
              注册
            </Button>
          </Form.Item>
        </Form>

        <div className="text-center">
          <span className="text-gray-600">已有账号？</span>
          <Link
            to="/login"
            className="text-primary-600 hover:text-primary-700 font-medium ml-1"
          >
            立即登录
          </Link>
        </div>
      </Card>
    </div>
  )
}

export default Register
