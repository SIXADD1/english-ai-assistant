import React, { useEffect, useState } from 'react'
import { Card, Form, Input, InputNumber, Button, message, Spin } from 'antd'
import { SaveOutlined } from '@ant-design/icons'
import { adminService, type SystemConfig } from '../../services/adminService'

const ConfigManagement: React.FC = () => {
  const [configs, setConfigs] = useState<SystemConfig[]>([])
  const [loading, setLoading] = useState(false)
  const [form] = Form.useForm()

  useEffect(() => {
    fetchConfigs()
  }, [])

  const fetchConfigs = async () => {
    try {
      setLoading(true)
      const data = await adminService.getConfigs()
      setConfigs(data)
      
      const formValues: Record<string, any> = {}
      data.forEach(config => {
        formValues[config.configKey] = config.configValue
      })
      form.setFieldsValue(formValues)
    } catch (error) {
      message.error('获取配置失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (values: any) => {
    try {
      setLoading(true)
      
      const configUpdates = configs.map(config => ({
        configKey: config.configKey,
        configValue: values[config.configKey] || ''
      }))
      
      await adminService.updateConfigs(configUpdates)
      message.success('配置保存成功')
      fetchConfigs()
    } catch (error) {
      message.error('配置保存失败')
    } finally {
      setLoading(false)
    }
  }

  const renderConfigField = (config: SystemConfig) => {
    const label = config.description || config.configKey
    
    switch (config.configType) {
      case 'number':
        return (
          <Form.Item
            key={config.configKey}
            name={config.configKey}
            label={label}
            rules={[{ required: true, message: '请输入值' }]}
          >
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
        )
      case 'password':
        return (
          <Form.Item
            key={config.configKey}
            name={config.configKey}
            label={label}
          >
            <Input.Password />
          </Form.Item>
        )
      default:
        return (
          <Form.Item
            key={config.configKey}
            name={config.configKey}
            label={label}
          >
            <Input />
          </Form.Item>
        )
    }
  }

  const aiConfigs = configs.filter(c => c.configKey.startsWith('ai_'))

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">系统配置</h1>
      </div>

      <Spin spinning={loading}>
        <Card title="AI服务配置">
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSave}
            initialValues={
              aiConfigs.reduce((acc, config) => {
                acc[config.configKey] = config.configValue
                return acc
              }, {} as Record<string, any>)
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {aiConfigs.map(renderConfigField)}
            </div>
            
            <div className="mt-6">
              <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
                loading={loading}
              >
                保存配置
              </Button>
            </div>
          </Form>
        </Card>
      </Spin>
    </div>
  )
}

export default ConfigManagement
