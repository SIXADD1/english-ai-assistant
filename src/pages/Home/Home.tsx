import React from 'react'

const Home: React.FC = () => {
  return (
    <div style={{ 
      padding: '2rem', 
      textAlign: 'center', 
      minHeight: 'calc(100vh - 200px)', 
      display: 'flex', 
      flexDirection: 'column', 
      justifyContent: 'center' 
    }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', color: '#1f2937' }}>英语 AI 助手</h1>
      <p style={{ marginBottom: '1rem', color: '#6b7280' }}>欢迎使用！</p>
      
      <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
        <svg 
          width="400" 
          height="280" 
          viewBox="0 0 400 280" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          style={{ maxWidth: '100%', height: 'auto' }}
        >
          <defs>
            <linearGradient id="laptopGradient" x1="200" y1="130" x2="200" y2="250" gradientUnits="userSpaceOnUse">
              <stop stopColor="#60a5fa"/>
              <stop offset="1" stopColor="#3b82f6"/>
            </linearGradient>
            <linearGradient id="screenGradient" x1="200" y1="100" x2="200" y2="200" gradientUnits="userSpaceOnUse">
              <stop stopColor="#f8fafc"/>
              <stop offset="1" stopColor="#f1f5f9"/>
            </linearGradient>
          </defs>
          
          <circle cx="70" cy="100" r="4" fill="#34d399" opacity="0.6"/>
          <circle cx="100" cy="70" r="3" fill="#60a5fa" opacity="0.5"/>
          <circle cx="60" cy="180" r="3" fill="#34d399" opacity="0.5"/>
          <polygon points="55,130 60,140 50,140" fill="#60a5fa" opacity="0.5"/>
          <circle cx="330" cy="170" r="4" fill="#fbbf24" opacity="0.6"/>
          <polygon points="345,110 355,115 350,100" fill="#fbbf24" opacity="0.5"/>
          <circle cx="350" cy="140" r="3" fill="#60a5fa" opacity="0.5"/>
          <polygon points="360,180 370,185 365,175" fill="#34d399" opacity="0.5"/>
          <circle cx="150" cy="150" r="2" fill="#60a5fa" opacity="0.4"/>
          <circle cx="120" cy="130" r="2" fill="#34d399" opacity="0.4"/>
          <circle cx="280" cy="120" r="2" fill="#fbbf24" opacity="0.4"/>
          
          <ellipse cx="200" cy="260" rx="85" ry="10" fill="#cbd5e1" opacity="0.3"/>
          
          <rect x="105" y="110" width="190" height="130" rx="8" fill="url(#laptopGradient)"/>
          
          <rect x="115" y="120" width="170" height="100" rx="5" fill="url(#screenGradient)"/>
          
          <circle cx="140" cy="130" r="3" fill="#9ca3af"/>
          <circle cx="150" cy="130" r="3" fill="#9ca3af"/>
          <circle cx="160" cy="130" r="3" fill="#9ca3af"/>
          
          <rect x="135" y="155" width="130" height="55" rx="6" fill="white" stroke="#e2e8f0" strokeWidth="2"/>
          
          <rect x="145" y="168" width="110" height="4" rx="2" fill="#e2e8f0"/>
          <rect x="145" y="178" width="90" height="3" rx="1.5" fill="#e2e8f0"/>
          <rect x="145" y="188" width="100" height="3" rx="1.5" fill="#e2e8f0"/>
          <rect x="145" y="198" width="70" height="3" rx="1.5" fill="#34d399"/>
          
          <circle cx="200" cy="178" r="20" fill="#10b981"/>
          <path d="M192 178 L198 184 L212 170" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          
          <circle cx="270" cy="145" r="22" fill="white" stroke="#10b981" strokeWidth="2"/>
          <path d="M263 145 L268 150 L280 138" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          
          <rect x="65" y="200" width="40" height="20" rx="2" fill="#3b82f6"/>
          <rect x="60" y="215" width="50" height="20" rx="2" fill="#10b981"/>
          
          <rect x="85" y="155" width="8" height="70" rx="4" fill="#3b82f6"/>
          <polygon points="85,225 93,225 89,235" fill="#6b7280"/>
          <rect x="82" y="165" width="14" height="12" rx="2" fill="#93c5fd"/>
          
          <rect x="310" y="210" width="25" height="45" rx="3" fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="2"/>
          <path d="M318 220 Q320 230, 327 225 Q330 235, 325 238 Q328 248, 320 245" stroke="#10b981" strokeWidth="3" strokeLinecap="round" fill="none"/>
          <ellipse cx="322" cy="208" rx="10" ry="4" fill="#d1fae5"/>
        </svg>
      </div>
      
      <div>
        <h2 style={{ fontSize: '1.5rem', color: '#10b981', marginBottom: '0.5rem' }}>
          <span style={{ marginRight: '0.5rem' }}>✨</span>
          启动成功！
          <span style={{ marginLeft: '0.5rem' }}>✨</span>
        </h2>
        <p style={{ color: '#6b7280' }}>系统已准备就绪，祝你写作进步！</p>
      </div>
    </div>
  )
}

export default Home
