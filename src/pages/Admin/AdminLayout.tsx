import React from 'react'
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Button, Avatar } from 'antd'
import { 
  DashboardOutlined, 
  UserOutlined, 
  BookOutlined, 
  FileTextOutlined, 
  LogoutOutlined,
  HomeOutlined,
  SettingOutlined,
  ExperimentOutlined,
  BarChartOutlined,
  UserAddOutlined,
  BellOutlined
} from '@ant-design/icons'
import { useUserStore } from '../../stores/userStore'
import Dashboard from './Dashboard'
import UserManagement from './UserManagement'
import MaterialManagement from './MaterialManagement'
import QuestionManagement from './QuestionManagement'
import ConfigManagement from './ConfigManagement'
import TrainingExerciseManagement from './TrainingExerciseManagement'
import CorrectionStats from './CorrectionStats'
import UserStats from './UserStats'
import FeedbackManagement from './FeedbackManagement'
import NotificationManagement from './NotificationManagement'
import MockExamAdmin from './MockExamAdmin'

const { Sider, Content, Header } = Layout

const menuItems = [
  { key: 'dashboard', label: '仪表盘', icon: <DashboardOutlined /> },
  { key: 'users', label: '用户管理', icon: <UserOutlined /> },
  { key: 'materials', label: '素材管理', icon: <BookOutlined /> },
  { key: 'training', label: '专项训练', icon: <ExperimentOutlined /> },
  { key: 'questions', label: '在线写作', icon: <FileTextOutlined /> },
  { key: 'mock-exam', label: '模考管理', icon: <ExperimentOutlined /> },
  { key: 'feedback', label: '用户反馈', icon: <HomeOutlined /> },
  { key: 'notifications', label: '通知管理', icon: <BellOutlined /> },
  { key: 'configs', label: '系统配置', icon: <SettingOutlined /> },
  { key: 'correction-stats', label: '批改统计', icon: <BarChartOutlined /> },
  { key: 'user-stats', label: '用户统计', icon: <UserAddOutlined /> },
]

const AdminLayout: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { userInfo, logout } = useUserStore()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const currentKey = location.pathname.split('/').filter(Boolean)[1] || 'dashboard'

  return (
    <Layout className="min-h-screen">
      <Sider width={256} className="bg-gray-900 text-white">
        <div className="p-6 border-b border-gray-700">
          <Link to="/admin" className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <HomeOutlined className="text-white text-xl" />
            </div>
            <span className="font-bold text-lg text-white">管理后台</span>
          </Link>
        </div>
        <Menu
          mode="inline"
          theme="dark"
          selectedKeys={[currentKey]}
          className="bg-gray-900 border-none"
        >
          {menuItems.map((item) => (
            <Menu.Item 
              key={item.key} 
              icon={item.icon}
              onClick={() => navigate(`/admin/${item.key}`)}
            >
              {item.label}
            </Menu.Item>
          ))}
        </Menu>
      </Sider>
      <Layout>
        <Header className="bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <div className="flex items-center space-x-4">
            <span className="text-lg font-semibold">四六级英语写作智能辅导系统</span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Avatar className="bg-blue-600">
                <UserOutlined />
              </Avatar>
              <span>{userInfo?.username}</span>
            </div>
            <Button 
              type="primary" 
              danger 
              icon={<LogoutOutlined />}
              onClick={handleLogout}
            >
              退出登录
            </Button>
          </div>
        </Header>
        <Content className="bg-gray-50 min-h-[calc(100vh-64px)]">
          <Routes>
            <Route index element={<Dashboard />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="materials" element={<MaterialManagement />} />
            <Route path="questions" element={<QuestionManagement />} />
            <Route path="mock-exam" element={<MockExamAdmin />} />
            <Route path="training" element={<TrainingExerciseManagement />} />
            <Route path="feedback" element={<FeedbackManagement />} />
            <Route path="notifications" element={<NotificationManagement />} />
            <Route path="configs" element={<ConfigManagement />} />
            <Route path="correction-stats" element={<CorrectionStats />} />
            <Route path="user-stats" element={<UserStats />} />
          </Routes>
        </Content>
        <footer className="bg-gray-800 border-t border-gray-700 py-4 text-center">
          <a
            href="https://beian.miit.gov.cn/#/Integrated/recordQuery"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-400 hover:text-gray-300 transition-colors"
          >
            湘ICP备2026022350号-1
          </a>
        </footer>
      </Layout>
    </Layout>
  )
}

export default AdminLayout