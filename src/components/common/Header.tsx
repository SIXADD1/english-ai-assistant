import React from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Button, Avatar, Dropdown, Space, message, Modal } from 'antd'
import {
  HomeOutlined,
  UserOutlined,
  LogoutOutlined,
  BookOutlined,
  EditOutlined,
  FileTextOutlined,
  TeamOutlined,
  TrophyOutlined,
} from '@ant-design/icons'
import { useUserStore } from '../../stores/userStore'
import { useExamStore } from '../../stores/examStore'
import NotificationPopover from './NotificationPopover'

const Header: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { userInfo, isLoggedIn, logout } = useUserStore()
  const { examInProgress, pendingNavUrl, leaveModalOpen, requestNavigation, closeLeaveModal, clearPendingNavigation } = useExamStore()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const guardedNavigate = (path: string) => {
    // 如果不在考试中，或当前就在目标页面，直接导航
    if (!examInProgress || location.pathname === path) {
      navigate(path)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    // 在考试中，先弹出确认框
    requestNavigation(path)
  }

  const handleAbandonAndLeave = () => {
    clearPendingNavigation()
    if (pendingNavUrl) {
      navigate(pendingNavUrl)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人中心',
      onClick: () => guardedNavigate('/personal'),
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ]

  const navItems = [
    { key: 'home', label: '首页', path: '/', icon: <HomeOutlined /> },
    { key: 'material', label: '素材学习', path: '/material', icon: <BookOutlined /> },
    { key: 'training', label: '专项训练', path: '/training', icon: <EditOutlined /> },
    { key: 'writing', label: '在线写作', path: '/writing', icon: <FileTextOutlined /> },
    { key: 'mock-exam', label: '模考专区', path: '/mock-exam', icon: <TrophyOutlined /> },
  ]

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-16">
          {/* Logo */}
          <button
            onClick={() => guardedNavigate('/')}
            className="flex items-center space-x-2 shrink-0 bg-transparent border-none cursor-pointer"
          >
            <div className="w-10 h-10 gradient-bg rounded-lg flex items-center justify-center">
              <TeamOutlined className="text-white text-xl" />
            </div>
            <span className="font-display font-bold text-xl gradient-text">
              英语 AI 助手
            </span>
          </button>

          {/* Nav - evenly distributed in center */}
          <nav className="hidden md:flex flex-1 justify-evenly mx-8">
            {navItems.map((item) => {
                  let isActive = false
                  if (item.key === 'home') {
                    isActive = location.pathname === '/'
                  } else {
                    isActive = location.pathname.startsWith(item.path)
                  }
                  
                  if (item.key === 'home') {
                    return (
                      <button
                        key={item.key}
                        onClick={() => guardedNavigate(item.path)}
                        className={`flex items-center space-x-1 px-3 py-2 rounded-md text-base font-bold transition-colors border-b-2 cursor-pointer ${
                          isActive
                            ? 'text-primary-600 border-primary-600 bg-primary-50'
                            : 'text-gray-700 border-transparent hover:text-primary-600 hover:bg-primary-50 hover:border-primary-300'
                        }`}
                      >
                        {item.icon}
                        <span>{item.label}</span>
                      </button>
                    )
                  }
                  
                  const handleClick = () => {
                    if (!isLoggedIn) {
                      message.warning('请先登录后再使用')
                      navigate('/login')
                      return
                    }
                    guardedNavigate(item.path)
                  }
                  
                  return (
                    <button
                      key={item.key}
                      onClick={handleClick}
                      className={`flex items-center space-x-1 px-3 py-2 rounded-md text-base font-bold transition-colors border-b-2 cursor-pointer ${
                        isActive
                          ? 'text-primary-600 border-primary-600 bg-primary-50'
                          : 'text-gray-700 border-transparent hover:text-primary-600 hover:bg-primary-50 hover:border-primary-300'
                      }`}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </button>
                  )
                })}
            </nav>

          <div className="flex items-center space-x-4 shrink-0">
            {isLoggedIn && userInfo ? (
              <>
                <NotificationPopover />
                <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
                  <Space className="cursor-pointer">
                    <Avatar
                      size={48}
                      src={userInfo.avatarUrl || (userInfo as any)?.avatar_url || (userInfo as any)?.avatar}
                      icon={<UserOutlined />}
                      className="bg-primary-600"
                    />
                    <span className="hidden md:inline text-base font-bold">
                      {userInfo.username}
                    </span>
                  </Space>
                </Dropdown>
              </>
            ) : (
              <Space>
                <Link to="/login">
                  <Button type="text">登录</Button>
                </Link>
                <Link to="/register">
                  <Button type="primary">注册</Button>
                </Link>
              </Space>
            )}
          </div>
        </div>
      </div>

      {/* 考试中途离开确认弹窗 */}
      <Modal
        title="确认离开考试？"
        open={leaveModalOpen}
        onCancel={closeLeaveModal}
        footer={null}
        closable={false}
        maskClosable={false}
      >
        <p className="text-gray-600 mb-4">
          你正在进行模考，离开页面将会<strong className="text-red-500">放弃本次考试</strong>。
        </p>
        <p className="text-gray-500 text-sm mb-4">
          建议先完成考试并交卷后再访问其他页面。
        </p>
        <div className="flex justify-end space-x-3">
          <Button onClick={closeLeaveModal}>继续考试</Button>
          <Button danger onClick={handleAbandonAndLeave}>放弃并离开</Button>
        </div>
      </Modal>
    </header>
  )
}

export default Header
