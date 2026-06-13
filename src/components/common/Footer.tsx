import React from 'react'
import { useNavigate } from 'react-router-dom'
import { message } from 'antd'
import { GithubOutlined, MailOutlined, QuestionCircleOutlined } from '@ant-design/icons'
import { useUserStore } from '../../stores/userStore'
import { useExamStore } from '../../stores/examStore'

const Footer: React.FC = () => {
  const navigate = useNavigate()
  const { isLoggedIn } = useUserStore()
  const { examInProgress, requestNavigation } = useExamStore()

  const handleNavigation = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    e.preventDefault()
    if (!isLoggedIn) {
      message.warning('请先登录后再使用')
      navigate('/login')
      return
    }
    if (examInProgress) {
      requestNavigation(path)
      return
    }
    navigate(path)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  return (
    <footer className="bg-gray-900 text-white py-12 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-10 h-10 gradient-bg rounded-lg flex items-center justify-center">
                <QuestionCircleOutlined className="text-white text-xl" />
              </div>
              <span className="font-display font-bold text-xl">英语 AI 助手</span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed mb-4">
              专为四六级备考考生打造的智能英语作文辅导平台，提供素材学习、专项训练、在线写作、AI智能批改等全流程服务。
            </p>
            <div className="flex space-x-4 items-center">
              <a
                href="#"
                className="text-gray-400 hover:text-white transition-colors"
              >
                <GithubOutlined className="text-xl" />
              </a>
              <a
                href="mailto:2152533017@qq.com?subject=%E8%8B%B1%E8%AF%ADAI%E5%86%99%E4%BD%9C%E5%8A%A9%E6%89%8B%E5%92%A8%E8%AF%A2"
                className="text-gray-400 hover:text-white transition-colors"
                title="点击邮箱联系我们！欢迎您的反馈"
              >
                <MailOutlined className="text-xl" />
              </a>
              <span className="text-gray-400 text-sm">点击邮箱联系我们！欢迎您的反馈</span>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-4">产品功能</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <a href="/material" onClick={(e) => handleNavigation(e, '/material')} className="hover:text-white transition-colors cursor-pointer">
                  素材学习
                </a>
              </li>
              <li>
                <a href="/training" onClick={(e) => handleNavigation(e, '/training')} className="hover:text-white transition-colors cursor-pointer">
                  专项训练
                </a>
              </li>
              <li>
                <a href="/writing" onClick={(e) => handleNavigation(e, '/writing')} className="hover:text-white transition-colors cursor-pointer">
                  在线写作
                </a>
              </li>
              <li>
                <a href="/mock-exam" onClick={(e) => handleNavigation(e, '/mock-exam')} className="hover:text-white transition-colors cursor-pointer">
                  模考专区
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">帮助与支持</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  使用指南
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  常见问题
                </a>
              </li>
              <li>
                <a href="/feedback" onClick={(e) => handleNavigation(e, '/feedback')} className="hover:text-white transition-colors cursor-pointer">
                  意见反馈
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  关于我们
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8">
          <div className="text-center space-y-2">
            <p className="text-sm text-gray-400">© 2026 英语 AI 助手. All rights reserved.</p>
            <a
              href="https://beian.miit.gov.cn/#/Integrated/recordQuery"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-500 hover:text-gray-600 transition-colors"
            >
              湘ICP备2026022350号-1
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
