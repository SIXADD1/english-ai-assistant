import nodeFetch from 'node-fetch'
globalThis.fetch = nodeFetch

import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { Pool } from 'pg'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import multer from 'multer'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load .env from current working directory and fallback to project root
dotenv.config()
dotenv.config({ path: path.resolve(__dirname, '../.env') })

const app = express()
const PORT = process.env.PORT || 3001
const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET 环境变量未设置，服务拒绝启动')
  process.exit(1)
}

// 将旧格式(扁平题目)兼容转换为Section格式
function normalizeToSections(questions) {
  if (!questions || !Array.isArray(questions) || questions.length === 0) return []
  // 已经是Section格式（子项有questions属性）
  if (questions[0].questions !== undefined) return questions
  // 旧格式：每道题包装成一个Section
  return questions.map((q, idx) => ({
    id: q.id || `old_sec_${idx}`,
    type: q.type === 'listening' ? 'listening' :
          q.type === 'reading' || q.type === 'vocabulary' || q.type === 'grammar' ? 'reading_careful' :
          q.type === 'cloze' ? 'reading_cloze' :
          q.type === 'writing' ? 'writing' :
          q.type === 'translation' ? 'translation' : 'reading_careful',
    title: q.title || `题目 ${idx + 1}`,
    passage: q.content || '',
    requirements: q.requirements || '',
    passageTitle: q.title || '',
    questions: [{
      id: q.id || `old_q_${idx}`,
      title: q.title || '',
      score: q.score || 1,
      answer: q.answer || '',
      options: q.options || undefined
    }]
  }))
}

app.use(helmet())
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with']
}))
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))

// 头像上传
const uploadsDir = path.join(__dirname, '..', 'uploads')
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })
app.use('/uploads', express.static(uploadsDir))

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    cb(null, req.user?.id + '_' + Date.now() + path.extname(file.originalname))
  }
})
const upload = multer({ 
  storage, 
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('仅支持 JPG/PNG/GIF/WebP 图片格式'), false)
    }
  }
})

// 音频上传（无类型限制，仅限大小）
const uploadAudio = multer({ 
  storage, 
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/mp4', 'audio/x-m4a', 'audio/aac']
    if (allowedMimes.includes(file.mimetype) || file.mimetype.startsWith('audio/')) {
      cb(null, true)
    } else {
      cb(new Error('仅支持音频文件格式'), false)
    }
  }
})

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/cet_writing'
})

// Multer 文件类型错误处理
app.use((err, req, res, next) => {
  if (err.message?.startsWith('仅支持')) {
    return res.status(400).json({ error: err.message })
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: '文件大小超出限制（最大50MB）' })
  }
  next(err)
})

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]
  
  if (!token) {
    return res.sendStatus(401)
  }
  
  try {
    const user = jwt.verify(token, JWT_SECRET)
    // 验证数据库中用户是否还存在
    const dbResult = await pool.query('SELECT id FROM users WHERE id = $1', [user.id])
    if (dbResult.rows.length === 0) {
      return res.status(401).json({ error: '用户不存在，请重新登录' })
    }
    req.user = user
    next()
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.sendStatus(403)
    }
    console.error('Token验证失败:', err.message)
    return res.status(500).json({ error: '服务器内部错误' })
  }
}

const authenticateAdmin = async (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]
  
  if (!token) {
    return res.sendStatus(401)
  }
  
  jwt.verify(token, JWT_SECRET, async (err, user) => {
    if (err) {
      return res.sendStatus(403)
    }
    
    const result = await pool.query(
      'SELECT role FROM users WHERE id = $1',
      [user.id]
    )
    
    if (result.rows.length === 0 || result.rows[0].role !== 'admin') {
      return res.status(403).json({ error: '管理员权限不足' })
    }
    
    req.user = { ...user, role: 'admin' }
    next()
  })
}

// 限流器
const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 分钟
  max: 5, // 最多 5 次
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const retryAfter = Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000)
    res.status(429).json({
      error: `登录尝试过于频繁，请在${retryAfter}秒后重试（1分钟内最多5次）`,
    })
  },
})

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 小时
  max: 3, // 最多 3 次
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const retryAfter = Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000)
    res.status(429).json({
      error: `注册请求过于频繁，请在${Math.ceil(retryAfter / 60)}分钟后重试（1小时内最多3次）`,
    })
  },
})

const checkUsernameLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 分钟
  max: 20, // 最多 20 次
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: '请求过于频繁，请稍后再试',
    })
  },
})

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1')
    res.json({ status: 'healthy', database: 'connected' })
  } catch (error) {
    console.error('服务器错误:', error.message); res.status(500).json({ status: 'error', message: '服务器内部错误，请稍后重试' })
  }
})

// 检查用户名是否已存在
app.get('/api/auth/check-username', checkUsernameLimiter, async (req, res) => {
  try {
    const { username } = req.query
    if (!username || username.trim().length < 2) {
      return res.json({ available: true })
    }
    
    const result = await pool.query(
      'SELECT id FROM users WHERE username = $1',
      [username.trim()]
    )
    
    res.json({ available: result.rows.length === 0 })
  } catch (error) {
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

app.post('/api/auth/register', registerLimiter, async (req, res) => {
  try {
    const { username, email, password, level } = req.body
    
    // 密码强度验证
    if (!password || password.length < 6) {
      return res.status(400).json({ error: '密码长度不能少于6位' })
    }
    if (password.length > 128) {
      return res.status(400).json({ error: '密码长度不能超过128位' })
    }
    
    // 分别检查用户名和邮箱
    const existingUsername = await pool.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    )
    if (existingUsername.rows.length > 0) {
      return res.status(400).json({ error: '用户名已存在' })
    }
    
    const existingEmail = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    )
    if (existingEmail.rows.length > 0) {
      return res.status(400).json({ error: '邮箱已注册' })
    }
    
    const passwordHash = await bcrypt.hash(password, 10)
    const userId = uuidv4()
    
    await pool.query(
      'INSERT INTO users (id, username, email, password_hash, level) VALUES ($1, $2, $3, $4, $5)',
      [userId, username, email, passwordHash, level || 'both']
    )

    // 自动发送欢迎通知
    try {
      await pool.query(
        `INSERT INTO notification_recipients (user_id, notification_id)
         VALUES ($1, md5('welcome_default')::uuid)
         ON CONFLICT DO NOTHING`,
        [userId]
      )
    } catch (err) {
      console.error('发送欢迎通知失败:', err.message)
    }
    
    const token = jwt.sign({ id: userId, email }, JWT_SECRET, { expiresIn: '7d' })
    
    res.json({
      user: { id: userId, username, email, level },
      token
    })
  } catch (error) {
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

app.post('/api/auth/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body
    
    const remaining = req.rateLimit?.remaining ?? '?'
    
    const result = await pool.query(
      'SELECT id, username, email, password_hash, level, role, status, avatar_url FROM users WHERE email = $1',
      [email]
    )
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: `用户不存在（还剩${remaining}次尝试机会）` })
    }
    
    const user = result.rows[0]
    let validPassword = false
    try {
      validPassword = await bcrypt.compare(password, user.password_hash)
      console.log(`[登录] bcrypt.compare 结果=${validPassword}, email=${email}`)
    } catch (e) {
      console.error(`[登录] bcrypt.compare 异常:`, e.message)
      validPassword = false
    }

    if (!validPassword) {
      console.log(`[登录] 密码验证失败, email=${email}`)
      return res.status(401).json({ error: `密码错误（还剩${remaining}次尝试机会）` })
    }
    
    if (user.status === 'inactive') {
      return res.status(401).json({ error: '账号已被禁用' })
    }
    
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' })
    
    res.json({
      user: { id: user.id, username: user.username, email: user.email, level: user.level, role: user.role, status: user.status, avatar_url: user.avatar_url },
      token
    })
  } catch (error) {
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

app.get('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, email, level, role, status, avatar_url, created_at FROM users WHERE id = $1',
      [req.user.id]
    )
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '用户不存在' })
    }
    
    res.json(result.rows[0])
  } catch (error) {
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

// 上传头像
app.post('/api/user/avatar', authenticateToken, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请选择图片文件' })
    }
    
    // 删除旧头像
    const oldUser = await pool.query('SELECT avatar_url FROM users WHERE id = $1', [req.user.id])
    if (oldUser.rows[0]?.avatar_url?.startsWith('/uploads/')) {
      const oldPath = path.join(uploadsDir, oldUser.rows[0].avatar_url.replace('/uploads/', ''))
      try { if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath) } catch {}
    }
    
    const avatarUrl = '/uploads/' + req.file.filename
    await pool.query('UPDATE users SET avatar_url = $1 WHERE id = $2', [avatarUrl, req.user.id])
    res.json({ avatarUrl })
  } catch (error) {
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

// 上传音频文件
app.post('/api/upload/audio', authenticateToken, uploadAudio.single('file'), async (req, res) => {
  try {
    console.log('收到音频上传请求:', {
      user: req.user?.id,
      file: req.file,
      body: req.body,
      headers: req.headers
    })
    
    if (!req.file) {
      console.error('音频上传失败: 没有文件')
      return res.status(400).json({ error: '请选择音频文件' })
    }
    
    // 删除旧音频文件（避免冗余）
    const oldUrl = req.body.old_url
    if (oldUrl && oldUrl.startsWith('/uploads/')) {
      const oldPath = path.join(uploadsDir, oldUrl.replace('/uploads/', ''))
      try { if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath) } catch {}
    }
    
    const audioUrl = '/uploads/' + req.file.filename
    console.log('音频上传成功:', audioUrl)
    res.json({ url: audioUrl })
  } catch (error) {
    console.error('音频上传错误:', error.message, error.stack)
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

// 更新个人资料（用户名、头像）
app.put('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const { username, avatarUrl } = req.body

    if (username && username.trim()) {
      const exist = await pool.query(
        'SELECT id FROM users WHERE username = $1 AND id != $2',
        [username.trim(), req.user.id]
      )
      if (exist.rows.length > 0) {
        return res.status(400).json({ error: '用户名已被占用' })
      }
    }

    const setParts = []
    const values = []
    let idx = 1

    if (username && username.trim()) {
      setParts.push(`username = $${idx++}`)
      values.push(username.trim())
    }
    if (avatarUrl !== undefined) {
      setParts.push(`avatar_url = $${idx++}`)
      values.push(avatarUrl)
    }

    if (setParts.length === 0) {
      return res.status(400).json({ error: '没有需要更新的字段' })
    }

    values.push(req.user.id)
    await pool.query(
      `UPDATE users SET ${setParts.join(', ')} WHERE id = $${idx}`,
      values
    )

    const updated = await pool.query(
      'SELECT id, username, email, level, role, status, avatar_url, created_at FROM users WHERE id = $1',
      [req.user.id]
    )

    res.json(updated.rows[0])
  } catch (error) {
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

// 修改密码
app.put('/api/user/password', authenticateToken, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: '旧密码和新密码不能为空' })
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: '新密码长度不能少于6位' })
    }

    const result = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.user.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '用户不存在' })
    }

    const valid = await bcrypt.compare(oldPassword, result.rows[0].password_hash)
    if (!valid) {
      return res.status(400).json({ error: '旧密码不正确' })
    }

    const newHash = await bcrypt.hash(newPassword, 10)
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [newHash, req.user.id]
    )

    res.json({ success: true })
  } catch (error) {
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

app.get('/api/user/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id
    
    const draftResult = await pool.query(
      'SELECT COUNT(*) as total_drafts, COALESCE(SUM(time_spent), 0) as total_time FROM drafts WHERE user_id = $1 AND status = $2',
      [userId, 'submitted']
    )
    
    const correctionResult = await pool.query(
      `SELECT COUNT(*) as total_corrections, AVG(c.score) as average_score 
       FROM corrections c 
       JOIN drafts d ON c.draft_id = d.id 
       WHERE d.user_id = $1`,
      [userId]
    )
    
    const favoriteResult = await pool.query(
      'SELECT COUNT(*) as favorite_materials FROM material_favorites WHERE user_id = $1',
      [userId]
    )
    
    const trainingResult = await pool.query(
      'SELECT COUNT(*) as total_trainings FROM training_records WHERE user_id = $1',
      [userId]
    )
    
    const checkinResult = await pool.query(
      'SELECT COUNT(DISTINCT date) as checkin_days FROM checkins WHERE user_id = $1',
      [userId]
    )
    
    res.json({
      totalWritings: parseInt(draftResult.rows[0].total_drafts) || 0,
      totalCorrections: parseInt(correctionResult.rows[0].total_corrections) || 0,
      averageScore: correctionResult.rows[0].average_score ? parseFloat(correctionResult.rows[0].average_score).toFixed(1) : '0.0',
      favoriteMaterials: parseInt(favoriteResult.rows[0].favorite_materials) || 0,
      totalTrainings: parseInt(trainingResult.rows[0].total_trainings) || 0,
      checkInDays: parseInt(checkinResult.rows[0].checkin_days) || 0,
      streak: parseInt(checkinResult.rows[0].checkin_days) || 0,
      totalTimeSpent: parseInt(draftResult.rows[0].total_time) || 0,
      totalMaterials: parseInt(favoriteResult.rows[0].favorite_materials) || 0,
    })
  } catch (error) {
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

app.get('/api/user/records', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id
    const { page = 1, pageSize = 10 } = req.query
    
    const offset = (page - 1) * pageSize
    
    const draftResult = await pool.query(
      `SELECT d.id, q.title, c.score, c.id as correction_id, d.created_at as date, 'writing' as type 
       FROM drafts d 
       LEFT JOIN questions q ON d.question_id = q.id
       LEFT JOIN corrections c ON c.draft_id = d.id
       WHERE d.user_id = $1 AND d.status = 'submitted'
       ORDER BY d.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, pageSize, offset]
    )

    let trainingRecords = []
    try {
      const trainingResult = await pool.query(
        `SELECT tr.id, te.title, tr.score, tr.created_at, tr.type, tr.answer, tr.ai_feedback, tr.exercise_id
         FROM training_records tr 
         LEFT JOIN training_exercises te ON tr.exercise_id = te.id
         WHERE tr.user_id = $1
         ORDER BY tr.created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, pageSize, offset]
      )
      trainingRecords = trainingResult.rows.map(row => ({
        id: row.id,
        title: row.title || '训练练习',
        score: row.score,
        date: row.created_at,
        type: row.type || 'training',
        answer: row.answer,
        aiFeedback: row.ai_feedback,
        exerciseId: row.exercise_id,
      }))
    } catch (e) {
      console.log('training_records表可能不存在，跳过:', e.message)
    }
    
    const formatDate = (d) => {
      if (!d) return ''
      if (typeof d === 'string') return d.split('T')[0]
      return d.toISOString().split('T')[0]
    }
    
    const allRecords = [
      ...draftResult.rows.map(row => ({
        id: row.id,
        title: row.title || '写作练习',
        score: row.score,
        correctionId: row.correction_id,
        date: row.date,
        type: row.type,
      })),
      ...trainingRecords,
    ]
    
    allRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    
    res.json({
      records: allRecords.slice(0, pageSize),
    })
  } catch (error) {
    console.error('records查询失败:', error)
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

app.delete('/api/user/records/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    
    const corrResult = await pool.query('SELECT draft_id FROM corrections WHERE id = $1', [id])
    const draftId = corrResult.rows.length > 0 ? corrResult.rows[0].draft_id : id
    
    await pool.query('DELETE FROM corrections WHERE id = $1', [id])
    await pool.query('DELETE FROM corrections WHERE draft_id = $1', [draftId])
    await pool.query('DELETE FROM drafts WHERE id = $1 AND user_id = $2', [draftId, req.user.id])
    await pool.query('DELETE FROM training_records WHERE id = $1 AND user_id = $2', [id, req.user.id])
    res.json({ success: true })
  } catch (error) {
    console.error('删除记录失败:', error)
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

app.post('/api/user/records/batch-delete', authenticateToken, async (req, res) => {
  try {
    const { ids } = req.body
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: '请提供要删除的记录ID列表' })
    }
    
    const idPlaceholders = ids.map((_, i) => `$${i + 1}`).join(',')
    
    const correctionResult = await pool.query(
      `SELECT draft_id FROM corrections WHERE id IN (${idPlaceholders})`,
      ids
    )
    const extraDraftIds = correctionResult.rows.map(r => r.draft_id).filter(Boolean)
    const allDraftIds = [...new Set([...ids, ...extraDraftIds])]
    const draftPlaceholders = allDraftIds.map((_, i) => `$${i + 1}`).join(',')
    
    await pool.query(`DELETE FROM corrections WHERE id IN (${idPlaceholders})`, ids)
    await pool.query(`DELETE FROM corrections WHERE draft_id IN (${draftPlaceholders})`, allDraftIds)
    await pool.query(
      `DELETE FROM drafts WHERE id IN (${draftPlaceholders}) AND user_id = $${allDraftIds.length + 1}`,
      [...allDraftIds, req.user.id]
    )
    await pool.query(
      `DELETE FROM training_records WHERE id IN (${idPlaceholders}) AND user_id = $${ids.length + 1}`,
      [...ids, req.user.id]
    )
    res.json({ success: true, deletedCount: ids.length })
  } catch (error) {
    console.error('批量删除失败:', error)
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

// Mock Exam Records
app.get('/api/user/mock-exam-records', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id
    const { page = 1, pageSize = 10 } = req.query
    const offset = (page - 1) * pageSize

    const result = await pool.query(
      `SELECT mep.id, me.title, mep.score, mep.status, mep.completed_at as date, me.level, me.category
       FROM mock_exam_participations mep
       LEFT JOIN mock_exams me ON me.id = mep.mock_exam_id
       WHERE mep.user_id = $1 AND mep.status IN ('completed')
       ORDER BY mep.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, pageSize, offset]
    )
    
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM mock_exam_participations WHERE user_id = $1 AND status = 'completed'`,
      [userId]
    )
    
    res.json({
      records: result.rows,
      total: parseInt(countResult.rows[0].count),
    })
  } catch (error) {
    console.error('获取模考记录失败:', error)
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

app.delete('/api/user/mock-exam-records/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    await pool.query(
      'DELETE FROM mock_exam_participations WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    )
    res.json({ success: true })
  } catch (error) {
    console.error('删除模考记录失败:', error)
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

app.post('/api/user/mock-exam-records/batch-delete', authenticateToken, async (req, res) => {
  try {
    const { ids } = req.body
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: '请提供要删除的记录ID列表' })
    }
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',')
    await pool.query(
      `DELETE FROM mock_exam_participations WHERE id IN (${placeholders}) AND user_id = $${ids.length + 1}`,
      [...ids, req.user.id]
    )
    res.json({ success: true, deletedCount: ids.length })
  } catch (error) {
    console.error('批量删除模考记录失败:', error)
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

app.get('/api/user/corrections', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id
    const { page = 1, pageSize = 10 } = req.query
    
    const offset = (page - 1) * pageSize
    
    const result = await pool.query(
      `SELECT c.id, q.title, c.score, c.created_at as date, 
              COALESCE(jsonb_array_length(c.error_list), 0) as errors
       FROM corrections c
       JOIN drafts d ON c.draft_id = d.id
       LEFT JOIN questions q ON d.question_id = q.id
       WHERE d.user_id = $1
       ORDER BY c.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, pageSize, offset]
    )

    const formatDate = (d) => {
      if (!d) return ''
      if (typeof d === 'string') return d.split('T')[0]
      return d.toISOString().split('T')[0]
    }
    
    res.json({
      corrections: result.rows.map(row => ({
        id: row.id,
        title: row.title || '写作练习',
        score: row.score,
        date: formatDate(row.date),
        errors: parseInt(row.errors) || 0,
      })),
    })
  } catch (error) {
    console.error('corrections查询失败:', error)
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

app.get('/api/user/favorites', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id
    const { page = 1, pageSize = 10 } = req.query
    
    const offset = (page - 1) * pageSize
    
    const result = await pool.query(
      `SELECT mf.id, m.id as material_id, m.title, m.content, m.category, mf.created_at as date
       FROM material_favorites mf
       JOIN materials m ON mf.material_id = m.id
       WHERE mf.user_id = $1 AND m.is_active = true
       ORDER BY mf.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, pageSize, offset]
    )

    console.log(`个人中心收藏: user=${userId} count=${result.rows.length}`)

    const formatDate = (d) => {
      if (!d) return ''
      if (typeof d === 'string') return d.split('T')[0]
      return d.toISOString().split('T')[0]
    }
    
    res.json({
      favorites: result.rows.map(row => ({
        id: row.id,
        materialId: row.material_id,
        title: row.title,
        content: row.content?.substring(0, 100) + '...',
        category: row.category,
        date: formatDate(row.date),
      })),
    })
  } catch (error) {
    console.error('favorites查询失败:', error)
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

app.post('/api/user/favorites/:materialId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id
    const { materialId } = req.params
    
    await pool.query(
      'INSERT INTO material_favorites (user_id, material_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [userId, materialId]
    )
    
    res.json({ success: true })
  } catch (error) {
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

app.delete('/api/user/favorites/:materialId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id
    const { materialId } = req.params
    
    await pool.query(
      'DELETE FROM material_favorites WHERE user_id = $1 AND material_id = $2',
      [userId, materialId]
    )
    
    res.json({ success: true })
  } catch (error) {
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

app.post('/api/user/checkin', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id
    const { type = 'daily' } = req.body
    const today = new Date().toISOString().split('T')[0]
    
    await pool.query(
      'INSERT INTO checkins (user_id, date, type) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      [userId, today, type]
    )
    
    res.json({ success: true })
  } catch (error) {
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

app.get('/api/admin/users', authenticateAdmin, async (req, res) => {
  try {
    const { page = 1, pageSize = 20, keyword, status, role } = req.query
    const offset = (page - 1) * pageSize
    
    let query = 'SELECT id, username, email, level, role, status, avatar_url, created_at FROM users'
    const params = []
    let paramIndex = 1
    
    const conditions = []
    
    if (keyword) {
      conditions.push(`(username ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`)
      params.push(`%${keyword}%`)
      paramIndex++
    }
    
    if (status) {
      conditions.push(`status = $${paramIndex}`)
      params.push(status)
      paramIndex++
    }
    
    if (role) {
      conditions.push(`role = $${paramIndex}`)
      params.push(role)
      paramIndex++
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ')
    }
    
    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    params.push(pageSize, offset)
    
    const result = await pool.query(query, params)
    
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM users' + (conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : ''),
      params.slice(0, paramIndex - 1)
    )
    
    res.json({
      users: result.rows,
      total: parseInt(countResult.rows[0].count)
    })
  } catch (error) {
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

app.put('/api/admin/users/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { username, email, level, role, status, password } = req.body

    console.log(`[用户更新] id=${id}, 包含密码=${!!password}`)

    const setParts = ['username = $1', 'email = $2', 'level = $3', 'role = $4', 'status = $5']
    const values = [username, email, level, role, status]
    let paramIndex = 6

    if (password && password.trim()) {
      if (password.length < 6) {
        return res.status(400).json({ error: '密码长度不能少于6位' })
      }
      if (password.length > 128) {
        return res.status(400).json({ error: '密码长度不能超过128位' })
      }
      const passwordHash = await bcrypt.hash(password, 10)
      console.log(`[用户更新] 密码已哈希, 长度=${passwordHash.length}`)
      setParts.push(`password_hash = $${paramIndex}`)
      values.push(passwordHash)
      paramIndex++
    } else {
      console.log(`[用户更新] 密码为空, 不更新密码字段`)
    }

    values.push(id)

    const result = await pool.query(
      `UPDATE users SET ${setParts.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '用户不存在' })
    }

    console.log(`[用户更新] 成功, email=${result.rows[0].email}`)
    res.json(result.rows[0])
  } catch (error) {
    console.error(`[用户更新] 失败:`, error.message)
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

app.delete('/api/admin/users/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params
    
    const adminCheck = await pool.query('SELECT role FROM users WHERE id = $1', [id])
    if (adminCheck.rows.length > 0 && adminCheck.rows[0].role === 'admin') {
      return res.status(400).json({ error: '不能删除管理员账号' })
    }
    
    await pool.query('DELETE FROM users WHERE id = $1', [id])
    
    res.json({ success: true })
  } catch (error) {
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

app.get('/api/admin/materials', authenticateAdmin, async (req, res) => {
  try {
    const { page = 1, pageSize = 20, keyword, category, level } = req.query
    const offset = (page - 1) * pageSize
    
    let query = 'SELECT m.*, u.username as created_by_name FROM materials m LEFT JOIN users u ON m.created_by = u.id'
    const params = []
    let paramIndex = 1
    
    const conditions = []
    
    if (keyword) {
      conditions.push(`(m.title ILIKE $${paramIndex} OR m.content ILIKE $${paramIndex})`)
      params.push(`%${keyword}%`)
      paramIndex++
    }
    
    if (category) {
      conditions.push(`m.category = $${paramIndex}`)
      params.push(category)
      paramIndex++
    }
    
    if (level) {
      conditions.push(`m.level = $${paramIndex}`)
      params.push(level)
      paramIndex++
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ')
    }
    
    query += ` ORDER BY m.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    params.push(pageSize, offset)
    
    const result = await pool.query(query, params)
    
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM materials m' + (conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : ''),
      params.slice(0, paramIndex - 1)
    )
    
    res.json({
      materials: result.rows,
      total: parseInt(countResult.rows[0].count)
    })
  } catch (error) {
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

app.post('/api/admin/materials', authenticateAdmin, async (req, res) => {
  try {
    const { title, content, translation, category, type, tags, usageScenario, tips, isCommon, level } = req.body
    const materialId = uuidv4()
    
    await pool.query(
      'INSERT INTO materials (id, title, content, translation, category, type, tags, usage_scenario, tips, is_common, level, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)',
      [materialId, title, content, translation, category, type, tags, usageScenario, tips, isCommon, level, req.user.id]
    )
    
    res.json({ id: materialId, success: true })
  } catch (error) {
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

app.put('/api/admin/materials/batch-toggle', authenticateAdmin, async (req, res) => {
  try {
    const { isActive, category } = req.body
    await pool.query("ALTER TABLE materials ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true")
    let query = 'UPDATE materials SET is_active = $1'
    const params = [isActive]
    if (category) {
      query += ' WHERE category = $2'
      params.push(category)
    }
    await pool.query(query, params)
    if (!isActive) {
      if (category) {
        await pool.query(
          'DELETE FROM material_favorites WHERE material_id IN (SELECT id FROM materials WHERE category = $1)',
          [category]
        )
      } else {
        await pool.query('DELETE FROM material_favorites')
      }
    }
    res.json({ success: true })
  } catch (error) {
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

app.put('/api/admin/materials/:id/toggle-active', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { isActive } = req.body
    await pool.query("ALTER TABLE materials ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true")
    await pool.query('UPDATE materials SET is_active = $1 WHERE id = $2', [isActive, id])
    if (!isActive) {
      await pool.query('DELETE FROM material_favorites WHERE material_id = $1', [id])
    }
    res.json({ success: true })
  } catch (error) {
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

app.put('/api/admin/materials/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { title, content, translation, category, type, tags, usageScenario, tips, isCommon, level, isActive } = req.body
    
    const result = await pool.query(
      'UPDATE materials SET title = $1, content = $2, translation = $3, category = $4, type = $5, tags = $6, usage_scenario = $7, tips = $8, is_common = $9, level = $10, is_active = $11 WHERE id = $12 RETURNING *',
      [title, content, translation, category, type, tags, usageScenario, tips, isCommon, level, isActive !== undefined ? isActive : true, id]
    )
    
    if (isActive === false) {
      await pool.query('DELETE FROM material_favorites WHERE material_id = $1', [id])
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '素材不存在' })
    }
    
    res.json(result.rows[0])
  } catch (error) {
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

app.delete('/api/admin/materials/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params
    
    await pool.query('DELETE FROM material_favorites WHERE material_id = $1', [id])
    await pool.query('DELETE FROM materials WHERE id = $1', [id])
    
    res.json({ success: true })
  } catch (error) {
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

app.get('/api/admin/questions', authenticateAdmin, async (req, res) => {
  try {
    const { page = 1, pageSize = 20, keyword, type, level, topic, difficulty, year } = req.query
    const offset = (page - 1) * pageSize
    
    let query = 'SELECT q.*, u.username as created_by_name FROM questions q LEFT JOIN users u ON q.created_by = u.id'
    const params = []
    let paramIndex = 1
    
    const conditions = []
    
    if (keyword) {
      conditions.push(`(q.title ILIKE $${paramIndex} OR q.content ILIKE $${paramIndex})`)
      params.push(`%${keyword}%`)
      paramIndex++
    }
    
    if (type) {
      conditions.push(`q.type = $${paramIndex}`)
      params.push(type)
      paramIndex++
    }
    
    if (level) {
      conditions.push(`q.level = $${paramIndex}`)
      params.push(level)
      paramIndex++
    }
    
    if (topic) {
      conditions.push(`q.topic = $${paramIndex}`)
      params.push(topic)
      paramIndex++
    }
    
    if (difficulty) {
      conditions.push(`q.difficulty = $${paramIndex}`)
      params.push(difficulty)
      paramIndex++
    }

    if (year) {
      conditions.push(`q.year = $${paramIndex}`)
      params.push(parseInt(year))
      paramIndex++
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ')
    }
    
    query += ` ORDER BY q.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    params.push(pageSize, offset)
    
    const result = await pool.query(query, params)

    const countQuery = 'SELECT COUNT(*) FROM questions q' + (conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '')
    const countParams = conditions.length > 0 ? params.slice(0, conditions.length) : []
    const countResult = await pool.query(countQuery, countParams)
    
    res.json({
      questions: result.rows,
      total: parseInt(countResult.rows[0].count)
    })
  } catch (error) {
    console.error('题目查询失败:', error)
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

app.get('/api/admin/questions/years', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT DISTINCT year FROM questions WHERE year IS NOT NULL ORDER BY year DESC'
    )
    res.json({ years: result.rows.map(r => r.year) })
  } catch (error) {
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

app.post('/api/admin/questions', authenticateAdmin, async (req, res) => {
  try {
    const { title, content, requirements, type, level, topic, difficulty, year, isAiGenerated, wordCountMin, wordCountMax } = req.body
    const questionId = uuidv4()
    
    await pool.query(
      'INSERT INTO questions (id, title, content, requirements, type, level, topic, difficulty, year, is_ai_generated, word_count_min, word_count_max, created_by, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)',
      [questionId, title, content, requirements, type, level, topic, difficulty, year, isAiGenerated, wordCountMin, wordCountMax, req.user.id, true]
    )
    
    res.json({ id: questionId, success: true })
  } catch (error) {
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

app.put('/api/admin/questions/batch-toggle', authenticateAdmin, async (req, res) => {
  try {
    const { isActive, type, level } = req.body
    await pool.query("ALTER TABLE questions ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true")
    let query = 'UPDATE questions SET is_active = $1'
    const params = [isActive]
    let paramIndex = 2
    if (type) {
      query += ` WHERE type = $${paramIndex}`
      params.push(type)
      paramIndex++
    }
    if (level) {
      query += (params.length > 1 ? ' AND' : ' WHERE') + ` level = $${paramIndex}`
      params.push(level)
    }
    await pool.query(query, params)
    res.json({ success: true })
  } catch (error) {
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

app.put('/api/admin/questions/:id/toggle-active', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { isActive } = req.body
    await pool.query("ALTER TABLE questions ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true")
    await pool.query('UPDATE questions SET is_active = $1 WHERE id = $2', [isActive, id])
    res.json({ success: true })
  } catch (error) {
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

app.put('/api/admin/questions/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { title, content, requirements, type, level, topic, difficulty, year, isAiGenerated, wordCountMin, wordCountMax, isActive } = req.body
    
    const result = await pool.query(
      'UPDATE questions SET title = $1, content = $2, requirements = $3, type = $4, level = $5, topic = $6, difficulty = $7, year = $8, is_ai_generated = $9, word_count_min = $10, word_count_max = $11, is_active = $12 WHERE id = $13 RETURNING *',
      [title, content, requirements, type, level, topic, difficulty, year, isAiGenerated, wordCountMin, wordCountMax, isActive !== undefined ? isActive : true, id]
    )
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '题目不存在' })
    }
    
    res.json(result.rows[0])
  } catch (error) {
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

app.delete('/api/admin/questions/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params
    
    await pool.query('DELETE FROM questions WHERE id = $1', [id])
    
    res.json({ success: true })
  } catch (error) {
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

app.get('/api/admin/stats', authenticateAdmin, async (req, res) => {
  try {
    const userCount = await pool.query('SELECT COUNT(*) FROM users')
    const materialCount = await pool.query('SELECT COUNT(*) FROM materials')
    const questionCount = await pool.query('SELECT COUNT(*) FROM questions')
    let totalCorrections = 0
    let todayCorrections = 0
    try {
      const correctionCount = await pool.query('SELECT COUNT(*) FROM correction_stats')
      const todayCount = await pool.query("SELECT COUNT(*) FROM correction_stats WHERE created_at >= CURRENT_DATE")
      totalCorrections = parseInt(correctionCount.rows[0].count)
      todayCorrections = parseInt(todayCount.rows[0].count)
    } catch {
      const correctionCount = await pool.query('SELECT COUNT(*) FROM corrections')
      const todayCount = await pool.query("SELECT COUNT(*) FROM corrections WHERE created_at >= CURRENT_DATE")
      totalCorrections = parseInt(correctionCount.rows[0].count)
      todayCorrections = parseInt(todayCount.rows[0].count)
    }
    
    const todayUsers = await pool.query("SELECT COUNT(*) FROM users WHERE created_at >= CURRENT_DATE")
    
    res.json({
      totalUsers: parseInt(userCount.rows[0].count),
      totalMaterials: parseInt(materialCount.rows[0].count),
      totalQuestions: parseInt(questionCount.rows[0].count),
      totalCorrections,
      todayNewUsers: parseInt(todayUsers.rows[0].count),
      todayCorrections
    })
  } catch (error) {
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

app.get('/api/admin/correction-stats', authenticateAdmin, async (req, res) => {
  try {
    const { granularity = 'day' } = req.query
    let dateFormat
    if (granularity === 'day') dateFormat = 'YYYY-MM-DD'
    else if (granularity === 'week') dateFormat = 'IYYY"W"IW'
    else if (granularity === 'month') dateFormat = 'YYYY-MM'
    else if (granularity === 'year') dateFormat = 'YYYY'
    else dateFormat = 'YYYY-MM-DD'

    let result
    try {
      result = await pool.query(
        `SELECT TO_CHAR(created_at, $1) AS period, COUNT(*)::int AS count
         FROM correction_stats
         GROUP BY period
         ORDER BY period`,
        [dateFormat]
      )
    } catch {
      result = await pool.query(
        `SELECT TO_CHAR(created_at, $1) AS period, COUNT(*)::int AS count
         FROM corrections
         GROUP BY period
         ORDER BY period`,
        [dateFormat]
      )
    }

    res.json(result.rows)
  } catch (error) {
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

app.get('/api/admin/training-stats', authenticateAdmin, async (req, res) => {
  try {
    const { granularity = 'day' } = req.query
    let dateFormat
    if (granularity === 'day') dateFormat = 'YYYY-MM-DD'
    else if (granularity === 'week') dateFormat = 'IYYY"W"IW'
    else if (granularity === 'month') dateFormat = 'YYYY-MM'
    else if (granularity === 'year') dateFormat = 'YYYY'
    else dateFormat = 'YYYY-MM-DD'

    let result
    try {
      result = await pool.query(
        `SELECT TO_CHAR(created_at, $1) AS period, COUNT(*)::int AS count
         FROM training_stats
         GROUP BY period
         ORDER BY period`,
        [dateFormat]
      )
    } catch {
      result = await pool.query(
        `SELECT TO_CHAR(created_at, $1) AS period, COUNT(*)::int AS count
         FROM training_records
         GROUP BY period
         ORDER BY period`,
        [dateFormat]
      )
    }

    res.json(result.rows)
  } catch (error) {
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

app.get('/api/admin/user-stats', authenticateAdmin, async (req, res) => {
  try {
    const { granularity = 'day' } = req.query
    let dateFormat
    if (granularity === 'day') dateFormat = 'YYYY-MM-DD'
    else if (granularity === 'week') dateFormat = 'IYYY"W"IW'
    else if (granularity === 'month') dateFormat = 'YYYY-MM'
    else if (granularity === 'year') dateFormat = 'YYYY'
    else dateFormat = 'YYYY-MM-DD'

    const result = await pool.query(
      `SELECT TO_CHAR(created_at, $1) AS period, COUNT(*)::int AS count
       FROM users
       GROUP BY period
       ORDER BY period`,
      [dateFormat]
    )

    res.json(result.rows)
  } catch (error) {
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

app.get('/api/materials', async (req, res) => {
  try {
    const { category, level, keyword, page = 1, pageSize = 20 } = req.query
    const offset = (page - 1) * pageSize
    
    let query = 'SELECT * FROM materials WHERE 1=1 AND is_active = true'
    const params = []
    let paramIndex = 1
    
    if (category) {
      query += ` AND category = $${paramIndex}`
      params.push(category)
      paramIndex++
    }
    
    if (level) {
      query += ` AND (level = $${paramIndex} OR level IS NULL)`
      params.push(level)
      paramIndex++
    }
    
    if (keyword) {
      query += ` AND (title ILIKE $${paramIndex} OR content ILIKE $${paramIndex})`
      params.push(`%${keyword}%`)
      paramIndex++
    }
    
    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    params.push(pageSize, offset)
    
    const result = await pool.query(query, params)
    
    let countQuery = 'SELECT COUNT(*) FROM materials WHERE 1=1 AND is_active = true'
    const countParams = []
    let ci = 1
    if (category) { countQuery += ` AND category = $${ci}`; countParams.push(category); ci++ }
    if (level) { countQuery += ` AND (level = $${ci} OR level IS NULL)`; countParams.push(level); ci++ }
    if (keyword) { countQuery += ` AND (title ILIKE $${ci} OR content ILIKE $${ci})`; countParams.push(`%${keyword}%`); ci++ }
    const countResult = await pool.query(countQuery, countParams)
    
    res.json({
      materials: result.rows,
      total: parseInt(countResult.rows[0].count)
    })
  } catch (error) {
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

app.get('/api/materials/favorites', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT m.* FROM materials m
       JOIN material_favorites mf ON m.id = mf.material_id
       WHERE mf.user_id = $1 AND m.is_active = true`,
      [req.user.id]
    )
    console.log(`获取收藏: user=${req.user.id} count=${result.rows.length}`)
    
    res.json(result.rows)
  } catch (error) {
    console.error('获取收藏失败:', error.message)
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

app.get('/api/materials/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM materials WHERE id = $1 AND is_active = true',
      [req.params.id]
    )
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '素材不存在' })
    }
    
    res.json(result.rows[0])
  } catch (error) {
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

app.post('/api/materials/favorite', authenticateToken, async (req, res) => {
  try {
    const { materialId } = req.body
    
    const result = await pool.query(
      'INSERT INTO material_favorites (user_id, material_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.user.id, materialId]
    )
    console.log(`收藏操作: user=${req.user.id} material=${materialId} inserted=${result.rowCount}`)
    
    res.json({ success: true })
  } catch (error) {
    console.error('收藏失败:', error.message)
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

app.delete('/api/materials/favorite/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM material_favorites WHERE user_id = $1 AND material_id = $2',
      [req.user.id, req.params.id]
    )
    
    res.json({ success: true })
  } catch (error) {
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

app.get('/api/questions', async (req, res) => {
  try {
    const { level, type, topic, difficulty, year, page = 1, pageSize = 20 } = req.query
    const offset = (page - 1) * pageSize
    
    let query = 'SELECT * FROM questions WHERE is_active = true'
    const params = []
    let paramIndex = 1
    
    const conditions = []
    
    if (level) {
      conditions.push(`level = $${paramIndex}`)
      params.push(level)
      paramIndex++
    }
    
    if (type) {
      conditions.push(`type = $${paramIndex}`)
      params.push(type)
      paramIndex++
    }
    
    if (topic) {
      conditions.push(`topic = $${paramIndex}`)
      params.push(topic)
      paramIndex++
    }
    
    if (difficulty) {
      conditions.push(`difficulty = $${paramIndex}`)
      params.push(difficulty)
      paramIndex++
    }
    
    if (year) {
      conditions.push(`year = $${paramIndex}`)
      params.push(parseInt(year))
      paramIndex++
    }
    
    if (conditions.length > 0) {
      query += ' AND ' + conditions.join(' AND ')
    }
    
    query += ` ORDER BY year DESC, created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    params.push(pageSize, offset)
    
    const result = await pool.query(query, params)
    
    const countQuery = 'SELECT COUNT(*) FROM questions WHERE is_active = true' + (conditions.length > 0 ? ' AND ' + conditions.join(' AND ') : '')
    const countParams = conditions.length > 0 ? params.slice(0, conditions.length) : []
    const countResult = await pool.query(countQuery, countParams)
    
    res.json({
      questions: result.rows,
      total: parseInt(countResult.rows[0].count)
    })
  } catch (error) {
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

app.get('/api/questions/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM questions WHERE id = $1 AND is_active = true',
      [req.params.id]
    )
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '题目不存在' })
    }
    
    res.json(result.rows[0])
  } catch (error) {
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

app.post('/api/draft/save', authenticateToken, async (req, res) => {
  try {
    const { questionId, content, timeSpent } = req.body
    const wordCount = content.split(/\s+/).filter(Boolean).length
    
    const existingDraft = await pool.query(
      'SELECT id FROM drafts WHERE user_id = $1 AND question_id = $2 AND status = $3',
      [req.user.id, questionId, 'draft']
    )
    
    if (existingDraft.rows.length > 0) {
      await pool.query(
        'UPDATE drafts SET content = $1, word_count = $2, time_spent = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4',
        [content, wordCount, timeSpent, existingDraft.rows[0].id]
      )
      
      res.json({ id: existingDraft.rows[0].id, wordCount })
    } else {
      const draftId = uuidv4()
      
      await pool.query(
        'INSERT INTO drafts (id, user_id, question_id, content, word_count, time_spent, status) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [draftId, req.user.id, questionId, content, wordCount, timeSpent, 'draft']
      )
      
      res.json({ id: draftId, wordCount })
    }
  } catch (error) {
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

app.get('/api/draft/:questionId', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM drafts WHERE user_id = $1 AND question_id = $2 AND status = $3',
      [req.user.id, req.params.questionId, 'draft']
    )
    
    res.json(result.rows[0] || null)
  } catch (error) {
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

app.post('/api/training/save', authenticateToken, async (req, res) => {
  try {
    const { questionId, type, answer, score, feedback } = req.body

    const recordId = uuidv4()

    await pool.query(
      'INSERT INTO training_records (id, user_id, question_id, type, answer, score, feedback) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [recordId, req.user.id, questionId, type, answer, score, feedback]
    )

    try { await pool.query('INSERT INTO training_stats (user_id) VALUES ($1)', [req.user.id]) } catch {}

    res.json({ id: recordId, success: true })
  } catch (error) {
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

app.post('/api/writing/submit', authenticateToken, async (req, res) => {
  try {
    const { questionId, content, timeSpent } = req.body
    const wordCount = content.split(/\s+/).filter(Boolean).length

    const draftId = uuidv4()

    await pool.query(
      'INSERT INTO drafts (id, user_id, question_id, content, word_count, time_spent, status) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [draftId, req.user.id, questionId, content, wordCount, timeSpent, 'submitted']
    )

    const questionResult = await pool.query(
      'SELECT content as question_content, type, level FROM questions WHERE id = $1',
      [questionId]
    )

    if (questionResult.rows.length === 0) {
      return res.status(404).json({ error: '题目不存在' })
    }

    const question = questionResult.rows[0]

    let correctionId = null
    try {
      const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000'
      const aiResponse = await fetch(`${aiServiceUrl}/api/correction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          essay_content: content,
          question_content: question.question_content,
          level: question.level,
          essay_type: question.type
        })
      })

      if (aiResponse.ok) {
        const correctionResult = await aiResponse.json()
        correctionId = uuidv4()

        await pool.query(
          `INSERT INTO corrections (id, draft_id, score, score_breakdown, overall_comment, error_list, format_errors, content_comments, suggestions, revised_version, review_report)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            correctionId,
            draftId,
            correctionResult.score,
            JSON.stringify(correctionResult.score_breakdown),
            correctionResult.overall_comment,
            JSON.stringify(correctionResult.error_list || []),
            JSON.stringify(correctionResult.format_errors || []),
            JSON.stringify(correctionResult.content_comments || []),
            JSON.stringify(correctionResult.suggestions || []),
            correctionResult.revised_version,
            JSON.stringify(correctionResult.review_report || {})
          ]
        )

        await pool.query(
          'INSERT INTO correction_stats (user_id) VALUES ($1)',
          [req.user.id]
        )
      }
    } catch (aiError) {
      console.log('AI批改失败，将保存草稿但不生成批改结果:', aiError.message)
    }

    res.json({ id: correctionId || draftId, draftId, wordCount, status: 'submitted', hasCorrection: !!correctionId })
  } catch (error) {
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

app.post('/api/correction/submit', authenticateToken, async (req, res) => {
  try {
    const { draftId } = req.body
    
    const draftResult = await pool.query(
      'SELECT d.*, q.content as question_content, q.type, q.level FROM drafts d JOIN questions q ON d.question_id = q.id WHERE d.id = $1 AND d.user_id = $2',
      [draftId, req.user.id]
    )
    
    if (draftResult.rows.length === 0) {
      return res.status(404).json({ error: '草稿不存在' })
    }
    
    const draft = draftResult.rows[0]
    
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000'
    const aiResponse = await fetch(`${aiServiceUrl}/api/correction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        essay_content: draft.content,
        question_content: draft.question_content,
        level: draft.level,
        essay_type: draft.type
      })
    })
    
    if (!aiResponse.ok) {
      throw new Error('AI批改服务错误')
    }
    
    const correctionResult = await aiResponse.json()
    
    const correctionId = uuidv4()
    
    await pool.query(
      `INSERT INTO corrections (id, draft_id, score, score_breakdown, overall_comment, error_list, format_errors, content_comments, suggestions, revised_version, review_report)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [correctionId, draftId, correctionResult.score, JSON.stringify(correctionResult.score_breakdown || {}),
       correctionResult.overall_comment, JSON.stringify(correctionResult.error_list || []),
       JSON.stringify(correctionResult.format_errors || []), JSON.stringify(correctionResult.content_comments || []),
       JSON.stringify(correctionResult.suggestions || []), correctionResult.revised_version,
       JSON.stringify(correctionResult.review_report || {})]
    )

    await pool.query(
      'INSERT INTO correction_stats (user_id) VALUES ($1)',
      [req.user.id]
    )
    
    res.json({ id: correctionId, ...correctionResult })
  } catch (error) {
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

app.get('/api/correction/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, d.content as essay_content FROM corrections c
       JOIN drafts d ON c.draft_id = d.id
       WHERE c.id = $1 AND d.user_id = $2`,
      [req.params.id, req.user.id]
    )
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '批改结果不存在' })
    }
    
    res.json(result.rows[0])
  } catch (error) {
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

app.get('/api/correction/history', authenticateToken, async (req, res) => {
  try {
    const { page = 1, pageSize = 10 } = req.query
    const offset = (page - 1) * pageSize
    
    const result = await pool.query(
      `SELECT c.id, c.score, c.created_at, q.title, q.type, q.level
       FROM corrections c
       JOIN drafts d ON c.draft_id = d.id
       JOIN questions q ON d.question_id = q.id
       WHERE d.user_id = $1
       ORDER BY c.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, pageSize, offset]
    )
    
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM corrections c JOIN drafts d ON c.draft_id = d.id WHERE d.user_id = $1',
      [req.user.id]
    )
    
    res.json({
      corrections: result.rows,
      total: parseInt(countResult.rows[0].count)
    })
  } catch (error) {
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

app.get('/api/personal/stats', authenticateToken, async (req, res) => {
  try {
    const materialCount = await pool.query(
      'SELECT COUNT(*) FROM material_favorites WHERE user_id = $1',
      [req.user.id]
    )
    
    const writingCount = await pool.query(
      'SELECT COUNT(*) FROM drafts WHERE user_id = $1 AND status = $2',
      [req.user.id, 'submitted']
    )
    
    const avgScore = await pool.query(
      `SELECT AVG(score) as avg_score FROM corrections c
       JOIN drafts d ON c.draft_id = d.id
       WHERE d.user_id = $1`,
      [req.user.id]
    )
    
    const totalTime = await pool.query(
      'SELECT SUM(time_spent) as total_time FROM drafts WHERE user_id = $1',
      [req.user.id]
    )
    
    const streakResult = await pool.query(
      `SELECT COUNT(DISTINCT date) as streak FROM checkins
       WHERE user_id = $1 AND date >= CURRENT_DATE - INTERVAL '30 days'`,
      [req.user.id]
    )
    
    res.json({
      favoriteMaterials: parseInt(materialCount.rows[0].count),
      totalWritings: parseInt(writingCount.rows[0].count),
      averageScore: parseFloat(avgScore.rows[0].avg_score) || 0,
      totalTimeSpent: parseInt(totalTime.rows[0].total_time) || 0,
      streak: parseInt(streakResult.rows[0].streak)
    })
  } catch (error) {
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

app.post('/api/checkin', authenticateToken, async (req, res) => {
  try {
    const { type } = req.body
    const today = new Date().toISOString().split('T')[0]
    
    await pool.query(
      'INSERT INTO checkins (user_id, date, type) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      [req.user.id, today, type]
    )
    
    res.json({ success: true, date: today, type })
  } catch (error) {
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

app.get('/api/mock-exam/list', authenticateToken, async (req, res) => {
  try {
    const { level, status, page = 1, pageSize = 8 } = req.query
    const offset = (page - 1) * pageSize
    const params = []
    let paramIndex = 1
    
    let query = `SELECT DISTINCT ON (me.id) me.*, 
      COALESCE(mep.status, 'pending') as participation_status,
      mep.score,
      mep.max_score,
      mep.id as participation_id
    FROM mock_exams me
    LEFT JOIN mock_exam_participations mep ON me.id = mep.mock_exam_id AND mep.user_id = $1 WHERE me.enabled IS NOT FALSE AND 1=1`
    params.push(req.user.id)
    paramIndex++
    
    let countQuery = 'SELECT COUNT(DISTINCT me.id) FROM mock_exams me LEFT JOIN mock_exam_participations mep ON me.id = mep.mock_exam_id WHERE me.enabled IS NOT FALSE'
    const countParams = []
    let ci = 1
    
    if (level) {
      query += ` AND me.level = $${paramIndex}`
      params.push(level)
      paramIndex++
      countQuery += ` AND me.level = $${ci}`
      countParams.push(level)
      ci++
    }
    
    if (status === 'completed') {
      query += ` AND mep.status = 'completed'`
      countQuery += ` AND mep.status = 'completed'`
    } else if (status === 'pending') {
      query += ` AND (mep.status IS NULL OR mep.status != 'completed')`
      countQuery += ` AND (mep.status IS NULL OR mep.status != 'completed')`
    }
    
    query += ` ORDER BY me.id, CASE WHEN mep.status = 'completed' THEN 0 ELSE 1 END, mep.created_at DESC NULLS LAST LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    params.push(pageSize, offset)
    
    const statsQuery = `SELECT 
      (SELECT COUNT(*) FROM mock_exams WHERE enabled IS NOT FALSE) as total,
      COUNT(DISTINCT CASE WHEN mep.status = 'completed' THEN me.id END) as completed,
      COALESCE(ROUND(AVG(CASE WHEN mep.status = 'completed' THEN mep.score END)), 0) as avg_score,
      COALESCE(ROUND(100.0 * COUNT(DISTINCT CASE WHEN mep.status = 'completed' AND mep.max_score > 0 AND (mep.score::numeric / mep.max_score) >= 0.6 THEN me.id END) / NULLIF(COUNT(DISTINCT CASE WHEN mep.status = 'completed' THEN me.id END), 0)), 0) as pass_rate
    FROM mock_exams me
    LEFT JOIN mock_exam_participations mep ON me.id = mep.mock_exam_id AND mep.user_id = $1
    WHERE me.enabled IS NOT FALSE`
    
    const [result, countResult, statsResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, countParams),
      pool.query(statsQuery, [req.user.id]),
    ])
    
    res.json({
      exams: result.rows.map(r => {
        // 始终从 questions JSON 计算试卷满分
        let totalMaxScore = 100
        try {
          const sections = normalizeToSections(r.questions)
          const computed = sections.reduce((sum, sec) => sum + (sec.questions || []).reduce((s, q) => s + (q.score || 0), 0), 0)
          if (computed > 0) totalMaxScore = Math.round(computed * 100) / 100
        } catch {}
        return { ...r, max_score: totalMaxScore, sections: normalizeToSections(r.questions) }
      }),
      total: parseInt(countResult.rows[0].count),
      stats: statsResult.rows[0],
    })
  } catch (error) {
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

app.get('/api/mock-exam/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const result = await pool.query(
      `SELECT me.*, 
        COALESCE(mep.status, 'pending') as participation_status,
        mep.score,
        mep.id as participation_id,
        mep.started_at,
        mep.completed_at
      FROM mock_exams me
      LEFT JOIN mock_exam_participations mep ON me.id = mep.mock_exam_id AND mep.user_id = $2
      WHERE me.id = $1`,
      [id, req.user.id]
    )
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '模考不存在' })
    }
    
    res.json({ ...result.rows[0], sections: normalizeToSections(result.rows[0].questions) })
  } catch (error) {
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

app.post('/api/mock-exam/start', authenticateToken, async (req, res) => {
  try {
    const { exam_id } = req.body
    
    const examResult = await pool.query(
      'SELECT * FROM mock_exams WHERE id = $1',
      [exam_id]
    )
    
    if (examResult.rows.length === 0) {
      return res.status(404).json({ error: '模考不存在' })
    }

    // 用 INSERT ON CONFLICT 避免竞态：先尝试插入 in_progress，冲突则复用已有的
    const newId = uuidv4()
    await pool.query(
      `INSERT INTO mock_exam_participations (id, user_id, mock_exam_id, status, started_at)
       VALUES ($1, $2, $3, 'in_progress', $4)
       ON CONFLICT (user_id, mock_exam_id) WHERE status = 'in_progress' DO NOTHING`,
      [newId, req.user.id, exam_id, new Date()]
    )
    
    // 查询 in_progress 记录（可能是刚插入的，也可能是冲突后已存在的）
    const participation = await pool.query(
      `SELECT id, started_at FROM mock_exam_participations
       WHERE mock_exam_id = $1 AND user_id = $2 AND status = 'in_progress'`,
      [exam_id, req.user.id]
    )
    
    const participationId = participation.rows[0].id
    const startedAt = participation.rows[0].started_at
    
    res.json({
      participation_id: participationId,
      started_at: startedAt,
      duration: examResult.rows[0].duration,
      sections: normalizeToSections(examResult.rows[0].questions)
    })
  } catch (error) {
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

// 放弃考试（离开页面时直接删除记录，不留痕迹）
app.post('/api/mock-exam/abandon', authenticateToken, async (req, res) => {
  try {
    const { participation_id } = req.body
    await pool.query(
      "DELETE FROM mock_exam_participations WHERE id = $1 AND user_id = $2 AND status = 'in_progress'",
      [participation_id, req.user.id]
    )
    res.json({ success: true })
  } catch (error) {
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

app.post('/api/mock-exam/submit', authenticateToken, async (req, res) => {
  try {
    const { participation_id, answers } = req.body
    
    const participationResult = await pool.query(
      'SELECT * FROM mock_exam_participations WHERE id = $1 AND user_id = $2',
      [participation_id, req.user.id]
    )
    if (participationResult.rows.length === 0) {
      return res.status(404).json({ error: '参与记录不存在' })
    }
    
    const participation = participationResult.rows[0]
    const examResult = await pool.query('SELECT * FROM mock_exams WHERE id = $1', [participation.mock_exam_id])
    if (examResult.rows.length === 0) {
      return res.status(404).json({ error: '模考不存在' })
    }
    
    const exam = examResult.rows[0]
    const sections = exam.questions  // DB column is 'questions' but stores sections array
    let grandTotal = 0
    let grandMax = 0
    const sectionResults = []
    
    for (const section of sections) {
      let secScore = 0
      let secMax = 0
      const subResults = []
      
      for (const sq of section.questions) {
        const userAnswer = answers[sq.id] || ''
        let score = 0
        let isCorrect = false
        let feedback = ''
        const maxScore = sq.score || 1
        secMax += maxScore
        
        if (section.type === 'writing' || section.type === 'translation') {
          if (userAnswer.trim()) {
            // 前置检测：中文字数占比过高则判定为非英文作答，直接给 0 分
            const chineseChars = (userAnswer.match(/[\u4e00-\u9fff]/g) || []).length
            const totalChars = userAnswer.replace(/\s/g, '').length
            if (totalChars > 0 && chineseChars / totalChars > 0.5) {
              score = 0
              feedback = section.type === 'translation' 
                ? '你的作答中大部分为中文，翻译题请使用英文作答。英译汉不需要逐字对译，但需用英文表达原文含义。'
                : '你的作答中大部分为中文，作文题请使用英文作答。请仔细审题后用英语重新完成写作。'
            } else {
            try {
              const ctrl = new AbortController()
              const tid = setTimeout(() => ctrl.abort(), 30000)
              const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000'
              const aiResp = await fetch(`${aiServiceUrl}/api/score`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  text: userAnswer,
                  requirements: section.requirements || section.title || '',
                  level: exam.level,
                  type: section.type === 'translation' ? 'translation' : 'essay'
                }),
                signal: ctrl.signal
              })
              clearTimeout(tid)
              if (aiResp.ok) {
                const corr = await aiResp.json()
                score = corr.score ? Math.round(corr.score / 100 * maxScore) : 0
                feedback = corr.feedback || '当前AI服务不可用'
              } else {
                feedback = '当前AI服务不可用'
              }
            } catch (e) {
              console.error(`AI批改${section.type === 'writing' ? '作文' : '翻译'}失败:`, e.message)
              const wordCount = userAnswer.split(/\s+/).filter(w => w.length > 0).length
              score = wordCount > 50 ? Math.round(maxScore * 0.5) : wordCount > 20 ? Math.round(maxScore * 0.3) : 0
              feedback = '当前AI服务不可用'
            }
            } // else chinese check
          }
          secScore += score
          subResults.push({ sub_question_id: sq.id, score, max_score: maxScore, is_correct: false, user_answer: userAnswer, correct_answer: sq.answer || '', feedback })
          continue
        }
        
        // Multiple choice / cloze / matching
        if (userAnswer) {
          const correctAns = (sq.answer || '').trim()
          const userAns = userAnswer.trim()
          if (sq.options?.length) {
            // choice question - compare value
            isCorrect = userAns.toUpperCase() === correctAns.toUpperCase()
          } else if (section.type === 'reading_cloze') {
            isCorrect = userAns.toLowerCase() === correctAns.toLowerCase()
          } else if (section.type === 'reading_matching') {
            // user answer format: {"A": 1}, correct answer: "1"
            // Extract the paragraph number from user's JSON and compare
            try {
              const ua = JSON.parse(userAns)
              const uaVal = String(Object.values(ua)[0] || '')
              isCorrect = uaVal === correctAns.trim()
            } catch { isCorrect = userAns === correctAns }
          } else {
            isCorrect = userAns.toLowerCase() === correctAns.toLowerCase()
          }
          score = isCorrect ? maxScore : 0
        }
        
        secScore += score
        subResults.push({ sub_question_id: sq.id, score, max_score: maxScore, is_correct: isCorrect, user_answer: userAnswer, correct_answer: sq.answer || '' })
      }
      
      grandTotal += secScore
      grandMax += secMax
      sectionResults.push({
        section_id: section.id,
        section_title: section.title,
        type: section.type,
        total_score: Math.round(secScore * 100) / 100,
        max_score: Math.round(secMax * 100) / 100,
        question_results: subResults,
        feedback: section.type === 'writing' || section.type === 'translation' ? { message: section.type === 'writing' ? '作文评分完成' : '翻译评分完成' } : null
      })
    }
    
    const finalTotal = Math.round(grandTotal * 100) / 100
    const finalMax = Math.round(grandMax * 100) / 100
    
    await pool.query(
      'UPDATE mock_exam_participations SET status = $1, score = $2, max_score = $3, completed_at = $4, section_results = $6 WHERE id = $5',
      ['completed', finalTotal, finalMax, new Date(), participation_id, JSON.stringify(sectionResults)]
    )
    
    res.json({
      participation_id,
      total_score: finalTotal,
      max_score: finalMax,
      section_results: sectionResults,
      completed_at: new Date()
    })
  } catch (error) {
    console.error('提交失败:', error)
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

app.get('/api/mock-exam/result/:participationId', authenticateToken, async (req, res) => {
  try {
    const { participationId } = req.params
    
    const result = await pool.query(
      `SELECT mep.*, me.title, me.description, me.level, me.duration, me.questions
      FROM mock_exam_participations mep
      JOIN mock_exams me ON mep.mock_exam_id = me.id
      WHERE mep.id = $1 AND mep.user_id = $2`,
      [participationId, req.user.id]
    )
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '结果不存在' })
    }
    
    const row = result.rows[0]
    // 从 questions JSON 中计算满分
    let maxScore = 100
    try {
      const sections = typeof row.questions === 'string' ? JSON.parse(row.questions) : row.questions
      if (Array.isArray(sections)) {
        maxScore = sections.reduce((sum, sec) => {
          const secScore = (sec.questions || []).reduce((s, q) => s + (q.score || 0), 0)
          return sum + secScore
        }, 0)
      }
    } catch { /* fall back to 100 */ }
    
    // Round all score values to 2 decimal places to fix floating point precision
    const sectionResults = (row.section_results || []).map(sr => ({
      ...sr,
      total_score: Math.round((sr.total_score || 0) * 100) / 100,
      max_score: Math.round((sr.max_score || 0) * 100) / 100,
      question_results: (sr.question_results || []).map(qr => ({
        ...qr,
        score: Math.round((qr.score || 0) * 100) / 100,
        max_score: Math.round((qr.max_score || 0) * 100) / 100
      }))
    }))
    
    res.json({
      participation_id: row.id,
      total_score: Math.round((row.score || 0) * 100) / 100,
      max_score: Math.round(maxScore * 100) / 100,
      section_results: sectionResults,
      completed_at: row.completed_at,
      sections: normalizeToSections(row.questions),
      title: row.title,
      level: row.level,
      duration: row.duration
    })
  } catch (error) {
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

app.get('/api/admin/mock-exam/list', authenticateAdmin, async (req, res) => {
  try {
    const { search, level, category, page = 1, pageSize = 10 } = req.query
    const offset = (page - 1) * pageSize
    
    let baseWhere = 'WHERE 1=1'
    const params = []
    const countParams = []
    let pi = 1, ci = 1
    
    if (search) {
      baseWhere += ` AND title ILIKE $${pi}`
      params.push(`%${search}%`)
      countParams.push(`%${search}%`)
      pi++; ci++
    }
    if (level) {
      baseWhere += ` AND level = $${pi}`
      params.push(level)
      countParams.push(level)
      pi++; ci++
    }
    if (category) {
      baseWhere += ` AND category = $${pi}`
      params.push(category)
      countParams.push(category)
      pi++; ci++
    }
    
    const query = `SELECT * FROM mock_exams ${baseWhere} ORDER BY created_at DESC LIMIT $${pi} OFFSET $${pi + 1}`
    params.push(pageSize, offset)
    
    const countQuery = `SELECT COUNT(*) FROM mock_exams ${baseWhere}`
    
    const [result, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, countParams)
    ])
    
    res.json({
      exams: result.rows.map(r => ({ ...r, sections: normalizeToSections(r.questions) })),
      total: parseInt(countResult.rows[0].count)
    })
  } catch (error) {
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

// 批量删除
app.post('/api/admin/mock-exam/batch-delete', authenticateAdmin, async (req, res) => {
  try {
    const { ids } = req.body
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: '请选择要删除的试卷' })
    }
    await pool.query(`DELETE FROM mock_exam_participations WHERE mock_exam_id = ANY($1)`, [ids])
    await pool.query(`DELETE FROM mock_exams WHERE id = ANY($1)`, [ids])
    res.json({ message: `已删除 ${ids.length} 套试卷` })
  } catch (error) {
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

// 批量启用/禁用
app.post('/api/admin/mock-exam/batch-toggle', authenticateAdmin, async (req, res) => {
  try {
    const { ids, enabled } = req.body
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: '请选择试卷' })
    }
    await pool.query(`UPDATE mock_exams SET enabled = $1 WHERE id = ANY($2)`, [enabled, ids])
    res.json({ message: `已${enabled ? '启用' : '禁用'} ${ids.length} 套试卷` })
  } catch (error) {
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

app.post('/api/admin/mock-exam', authenticateAdmin, async (req, res) => {
  try {
    const { title, description, level, duration, sections, category = 'mock', enabled = true } = req.body
    
    if (!title || title.trim() === '' || !level || duration === undefined) {
      return res.status(400).json({ error: '缺少必填字段: title, level, duration' })
    }
    
    if (!sections || !Array.isArray(sections) || sections.length === 0) {
      return res.status(400).json({ error: 'Section列表不能为空' })
    }
    
    const result = await pool.query(
      'INSERT INTO mock_exams (id, title, description, level, duration, questions, category, enabled) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [uuidv4(), title, description, level, duration, JSON.stringify(sections), category, enabled]
    )
    
    res.json(result.rows[0])
  } catch (error) {
    console.error('模考创建失败:', error.message)
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

app.put('/api/admin/mock-exam/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { title, description, level, duration, sections, category, enabled } = req.body
    
    if (!title || title.trim() === '' || !level || duration === undefined) {
      return res.status(400).json({ error: '缺少必填字段: title, level, duration' })
    }
    
    if (!sections || !Array.isArray(sections) || sections.length === 0) {
      return res.status(400).json({ error: 'Section列表不能为空' })
    }
    
    const result = await pool.query(
      'UPDATE mock_exams SET title = $1, description = $2, level = $3, duration = $4, questions = $5, category = $6, enabled = $7 WHERE id = $8 RETURNING *',
      [title, description, level, duration, JSON.stringify(sections), category || 'mock', enabled !== undefined ? enabled : true, id]
    )
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '模考不存在' })
    }
    
    res.json(result.rows[0])
  } catch (error) {
    console.error('模考更新失败:', error.message)
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

app.delete('/api/admin/mock-exam/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params
    
    await pool.query('DELETE FROM mock_exam_participations WHERE mock_exam_id = $1', [id])
    const result = await pool.query('DELETE FROM mock_exams WHERE id = $1 RETURNING *', [id])
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '模考不存在' })
    }
    
    res.json({ message: '删除成功' })
  } catch (error) {
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

app.get('/api/admin/configs', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM system_configs ORDER BY config_key');
    res.json(result.rows);
  } catch (error) {
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' });
  }
});

app.put('/api/admin/configs', authenticateAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { configs } = req.body;
    
    for (const config of configs) {
      await client.query(
        'UPDATE system_configs SET config_value = $1 WHERE config_key = $2',
        [config.config_value, config.config_key]
      );
    }
    
    await client.query('COMMIT');
    
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    try {
      await fetch(`${aiServiceUrl}/api/config/reload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (aiError) {
      console.log('AI服务配置刷新失败（可能未启动）:', aiError.message);
    }
    
    res.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' });
  } finally {
    client.release();
  }
});

app.get('/api/admin/configs/:key', authenticateAdmin, async (req, res) => {
  try {
    const { key } = req.params;
    const result = await pool.query('SELECT * FROM system_configs WHERE config_key = $1', [key]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '配置项不存在' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' });
  }
});

app.get('/api/configs', async (req, res) => {
  try {
    const result = await pool.query("SELECT config_key, config_value FROM system_configs WHERE config_key LIKE 'ai_%'");
    const configs = {};
    result.rows.forEach(row => {
      configs[row.config_key] = row.config_value;
    });
    res.json(configs);
  } catch (error) {
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' });
  }
});

// =============================================
// 专项训练 API
// =============================================

app.get('/api/training/exercises', async (req, res) => {
  try {
    const { type, level, page = 1, pageSize = 20 } = req.query
    const offset = (page - 1) * pageSize

    let query = 'SELECT id, type, title, content, requirements, level, sort_order, created_at FROM training_exercises WHERE is_active = true'
    const params = []
    let paramIndex = 1

    if (type) {
      query += ` AND type = $${paramIndex}`
      params.push(type)
      paramIndex++
    }
    if (level) {
      query += ` AND level = $${paramIndex}`
      params.push(level)
      paramIndex++
    }

    query += ` ORDER BY sort_order ASC, created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    params.push(pageSize, offset)

    const result = await pool.query(query, params)

    const countQuery = 'SELECT COUNT(*) FROM training_exercises WHERE is_active = true'
      + (type ? ` AND type = $1` : '')
      + (level ? ` AND level = $${type ? '2' : '1'}` : '')
    const countParams = []
    if (type) countParams.push(type)
    if (level) countParams.push(level)
    const countResult = await pool.query(countQuery, countParams)

    res.json({
      exercises: result.rows,
      total: parseInt(countResult.rows[0].count)
    })
  } catch (error) {
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

app.get('/api/training/exercises/:id', async (req, res) => {
  try {
    const { id } = req.params
    const result = await pool.query('SELECT * FROM training_exercises WHERE id = $1 AND is_active = true', [id])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '练习不存在' })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

app.post('/api/training/submit', authenticateToken, async (req, res) => {
  try {
    const { exerciseId, type, answer, userAnswer } = req.body
    const finalAnswer = answer || userAnswer
    const exerciseType = type

    let exercise = null
    if (exerciseId) {
      const exerciseResult = await pool.query('SELECT * FROM training_exercises WHERE id = $1', [exerciseId])
      if (exerciseResult.rows.length > 0) {
        exercise = exerciseResult.rows[0]
      }
    }

    let aiScore = null
    let aiFeedback = null

    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000'
    try {
      const aiResponse = await fetch(`${aiServiceUrl}/api/training/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: exerciseType || exercise?.type,
          content: exercise?.content || '',
          requirements: exercise?.requirements || '',
          referenceAnswer: exercise?.answer || null,
          userAnswer: finalAnswer || ''
        })
      })

      if (aiResponse.ok) {
        const aiResult = await aiResponse.json()
        aiScore = aiResult.score
        aiFeedback = aiResult.feedback
      }
    } catch (aiError) {
      console.log('AI服务评分失败，使用本地评分:', aiError.message)
      aiScore = calculateLocalScore(exerciseType || exercise?.type, finalAnswer, exercise?.answer)
      aiFeedback = 'AI服务暂不可用，已使用基础评分。请稍后再试以获取详细反馈。'
    }

    const recordId = uuidv4()
    await pool.query(
      'INSERT INTO training_records (id, user_id, question_id, exercise_id, type, answer, score, feedback, ai_feedback) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
      [recordId, req.user.id, null, exerciseId, exerciseType || exercise?.type, finalAnswer, aiScore, aiFeedback, aiFeedback]
    )

    try { await pool.query('INSERT INTO training_stats (user_id) VALUES ($1)', [req.user.id]) } catch {}

    res.json({
      id: recordId,
      score: aiScore,
      feedback: aiFeedback,
      referenceAnswer: exercise?.answer || null
    })
  } catch (error) {
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

function calculateLocalScore(type, userAnswer, referenceAnswer) {
  if (!userAnswer || !referenceAnswer) return null

  if (type === 'topic_analysis') {
    let score = 0
    if (userAnswer.length > 20) score += 3
    if (userAnswer.length > 50) score += 2
    if (typeof referenceAnswer === 'object' && referenceAnswer.mainPoint) {
      const refWords = referenceAnswer.mainPoint.split(/\s+/)
      const userWords = userAnswer.split(/\s+/)
      const intersection = refWords.filter(w => userWords.includes(w)).length
      if (intersection >= 2) score += 3
    }
    return Math.min(score, 8)
  }

  if (type === 'material_apply' || type === 'open_close') {
    const userWords = userAnswer.split(/\s+/).filter(Boolean)
    let score = 3
    if (userWords.length >= 30) score += 2
    if (userWords.length >= 60) score += 2
    if (userWords.length >= 100) score += 2
    return Math.min(score, 8)
  }

  if (type === 'format') {
    let score = 3
    if (userAnswer.length > 30) score += 2
    if (userAnswer.length > 80) score += 3
    return Math.min(score, 8)
  }

  return 5
}

app.get('/api/training/history', authenticateToken, async (req, res) => {
  try {
    const { page = 1, pageSize = 10, type } = req.query
    const offset = (page - 1) * pageSize

    let query = `SELECT tr.*, te.title as exercise_title, te.type as exercise_type 
                 FROM training_records tr 
                 LEFT JOIN training_exercises te ON tr.exercise_id = te.id 
                 WHERE tr.user_id = $1`
    const params = [req.user.id]
    let paramIndex = 2

    if (type) {
      query += ` AND tr.type = $${paramIndex}`
      params.push(type)
      paramIndex++
    }

    query += ` ORDER BY tr.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    params.push(pageSize, offset)

    const result = await pool.query(query, params)

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM training_records WHERE user_id = $1' + (type ? ` AND type = $2` : ''),
      type ? [req.user.id, type] : [req.user.id]
    )

    res.json({
      records: result.rows,
      total: parseInt(countResult.rows[0].count)
    })
  } catch (error) {
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

app.get('/api/training/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id

    const totalResult = await pool.query('SELECT COUNT(*) FROM training_records WHERE user_id = $1', [userId])
    const avgScoreResult = await pool.query('SELECT AVG(score) FROM training_records WHERE user_id = $1 AND score IS NOT NULL', [userId])

    const typeStatsResult = await pool.query(
      `SELECT type, COUNT(*) as count, AVG(score) as avg_score 
       FROM training_records 
       WHERE user_id = $1 AND score IS NOT NULL 
       GROUP BY type`,
      [userId]
    )

    res.json({
      totalExercises: parseInt(totalResult.rows[0].count) || 0,
      averageScore: avgScoreResult.rows[0].avg ? parseFloat(avgScoreResult.rows[0].avg).toFixed(1) : '0.0',
      typeStats: typeStatsResult.rows
    })
  } catch (error) {
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

app.get('/api/training/completed', authenticateToken, async (req, res) => {
  try {
    const { type } = req.query
    const userId = req.user.id

    let result
    try {
      let query = `SELECT DISTINCT tr.exercise_id
                   FROM training_records tr
                   LEFT JOIN training_resets rst ON rst.user_id = tr.user_id AND rst.type = tr.type
                   WHERE tr.user_id = $1
                     AND (rst.reset_at IS NULL OR tr.created_at > rst.reset_at)`
      const params = [userId]

      if (type) {
        query += ' AND tr.type = $2'
        params.push(type)
      }
      result = await pool.query(query, params)
    } catch {
      let query = 'SELECT DISTINCT exercise_id FROM training_records WHERE user_id = $1'
      const params = [userId]
      if (type) {
        query += ' AND type = $2'
        params.push(type)
      }
      result = await pool.query(query, params)
    }

    res.json({ completedIds: result.rows.map(r => r.exercise_id).filter(Boolean) })
  } catch (error) {
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

app.delete('/api/training/reset', authenticateToken, async (req, res) => {
  try {
    const { type } = req.query
    if (!type) return res.status(400).json({ error: '缺少type参数' })

    try {
      await pool.query(
        `INSERT INTO training_resets (user_id, type, reset_at) VALUES ($1, $2, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id, type) DO UPDATE SET reset_at = CURRENT_TIMESTAMP`,
        [req.user.id, type]
      )
    } catch {
      await pool.query(
        `CREATE TABLE IF NOT EXISTS training_resets (
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          type VARCHAR(50) NOT NULL,
          reset_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (user_id, type)
        )`
      )
      await pool.query(
        `INSERT INTO training_resets (user_id, type, reset_at) VALUES ($1, $2, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id, type) DO UPDATE SET reset_at = CURRENT_TIMESTAMP`,
        [req.user.id, type]
      )
    }

    res.json({ success: true })
  } catch (error) {
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

// =============================================
// 管理后台 - 训练练习管理 API
// =============================================

app.get('/api/admin/training/exercises', authenticateAdmin, async (req, res) => {
  try {
    const { page = 1, pageSize = 20, type, level } = req.query
    const offset = (page - 1) * pageSize

    let query = 'SELECT * FROM training_exercises WHERE 1=1'
    const params = []
    let paramIndex = 1

    if (type) {
      query += ` AND type = $${paramIndex}`
      params.push(type)
      paramIndex++
    }
    if (level) {
      query += ` AND level = $${paramIndex}`
      params.push(level)
      paramIndex++
    }

    query += ` ORDER BY type, sort_order ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    params.push(pageSize, offset)

    const result = await pool.query(query, params)

    let countQuery = 'SELECT COUNT(*) FROM training_exercises WHERE 1=1'
    const countParams = []
    let countIdx = 1
    if (type) { countQuery += ` AND type = $${countIdx}`; countParams.push(type); countIdx++ }
    if (level) { countQuery += ` AND level = $${countIdx}`; countParams.push(level); countIdx++ }
    const countResult = await pool.query(countQuery, countParams)

    res.json({
      exercises: result.rows,
      total: parseInt(countResult.rows[0].count)
    })
  } catch (error) {
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

app.post('/api/admin/training/exercises', authenticateAdmin, async (req, res) => {
  try {
    const { type, title, content, requirements, level, answer, sortOrder, isActive } = req.body

    const id = uuidv4()
    await pool.query(
      `INSERT INTO training_exercises (id, type, title, content, requirements, level, answer, sort_order, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [id, type, title, content, requirements, level, JSON.stringify(answer), Number(sortOrder) || 0, isActive !== undefined ? !!isActive : true]
    )

    res.json({ id, success: true })
  } catch (error) {
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

app.put('/api/admin/training/exercises/batch-toggle', authenticateAdmin, async (req, res) => {
  try {
    const { isActive, type } = req.body
    let query = 'UPDATE training_exercises SET is_active = $1'
    const params = [isActive]
    if (type) {
      query += ' WHERE type = $2'
      params.push(type)
    }
    await pool.query(query, params)
    res.json({ success: true })
  } catch (error) {
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

app.put('/api/admin/training/exercises/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { type, title, content, requirements, level, answer, sortOrder, isActive } = req.body

    const checkResult = await pool.query('SELECT id FROM training_exercises WHERE id = $1', [id])
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: '练习不存在' })
    }

    await pool.query(
      `UPDATE training_exercises 
       SET type = $1, title = $2, content = $3, requirements = $4, level = $5, 
           answer = $6, sort_order = $7, is_active = $8, updated_at = CURRENT_TIMESTAMP
       WHERE id = $9`,
      [type, title, content, requirements, level, JSON.stringify(answer), Number(sortOrder) || 0, isActive !== undefined ? !!isActive : true, id]
    )

    res.json({ success: true })
  } catch (error) {
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

app.delete('/api/admin/training/exercises/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params

    const checkResult = await pool.query('SELECT id FROM training_exercises WHERE id = $1', [id])
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: '练习不存在' })
    }

    await pool.query('DELETE FROM training_exercises WHERE id = $1', [id])

    res.json({ success: true })
  } catch (error) {
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

// 反馈API
app.post('/api/feedback', async (req, res) => {
  try {
    console.log('[反馈API] 收到请求:', req.body)
    console.log('[反馈API] 请求头:', req.headers)
    const { rating, category, content, contact } = req.body

    // 获取用户ID（如果已登录）
    const authHeader = req.headers['authorization']
    let userId = null
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1]
        console.log('[反馈API] Token:', token)
        const decoded = jwt.verify(token, JWT_SECRET)
        console.log('[反馈API] 解码结果:', decoded)
        userId = decoded.id
        console.log('[反馈API] 用户ID:', userId)
      } catch (e) {
        console.log('[反馈API] Token验证失败:', e.message)
      }
    } else {
      console.log('[反馈API] 没有Authorization头')
    }

    if (!rating || !category || !content) {
      console.log('[反馈API] 参数不完整')
      return res.status(400).json({ error: '请填写完整的反馈信息' })
    }

    const id = uuidv4()
    console.log('[反馈API] 准备插入数据:', { id, userId, rating, category, content, contact })
    await pool.query(
      `INSERT INTO feedback (id, user_id, rating, category, content, contact) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, userId, Number(rating), category, content, contact]
    )

    console.log('[反馈API] 插入成功:', id)
    res.json({ id, success: true })
  } catch (error) {
    console.error('[反馈API] 错误:', error.message)
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

app.get('/api/admin/feedback', authenticateAdmin, async (req, res) => {
  try {
    const { page = 1, pageSize = 10 } = req.query
    const offset = (Number(page) - 1) * Number(pageSize)

    const result = await pool.query(
      `SELECT f.*, u.username, u.email 
       FROM feedback f 
       LEFT JOIN users u ON f.user_id = u.id::text
       ORDER BY f.created_at DESC 
       LIMIT $1 OFFSET $2`,
      [Number(pageSize), offset]
    )

    const countResult = await pool.query('SELECT COUNT(*) FROM feedback')

    res.json({
      data: result.rows,
      total: Number(countResult.rows[0].count),
      page: Number(page),
      pageSize: Number(pageSize)
    })
  } catch (error) {
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

app.delete('/api/admin/feedback/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params

    const checkResult = await pool.query('SELECT id FROM feedback WHERE id = $1', [id])
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: '反馈不存在' })
    }

    await pool.query('DELETE FROM feedback WHERE id = $1', [id])

    res.json({ success: true })
  } catch (error) {
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

// 初始化数据库表
// ========== 通知管理 API ==========

// 获取用户的通知列表
app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const { page = 1, pageSize = 20, type, unreadOnly } = req.query
    const userId = req.user.id
    const offset = (page - 1) * pageSize
    
    let query = `
      SELECT 
        nr.id,
        nr.is_read,
        nr.is_deleted,
        nr.read_at,
        nr.created_at,
        n.id as notification_id,
        n.title,
        n.content,
        n.type,
        n.created_at as notification_created_at
      FROM notification_recipients nr
      JOIN notifications n ON nr.notification_id = n.id
      WHERE nr.user_id = $1 AND nr.is_deleted = false
    `
    const params = [userId]
    let paramIndex = 2
    
    if (unreadOnly === 'true') {
      query += ` AND nr.is_read = false`
    }
    
    if (type) {
      query += ` AND n.type = $${paramIndex}`
      params.push(type)
      paramIndex++
    }
    
    query += ` ORDER BY nr.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    params.push(pageSize, offset)
    
    const result = await pool.query(query, params)
    
    // 获取未读数量
    const unreadCount = await pool.query(
      `SELECT COUNT(*) FROM notification_recipients WHERE user_id = $1 AND is_read = false AND is_deleted = false`,
      [userId]
    )
    
    res.json({
      notifications: result.rows,
      unreadCount: parseInt(unreadCount.rows[0].count),
      total: result.rows.length
    })
  } catch (error) {
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

// 获取未读通知数量
app.get('/api/notifications/unread-count', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id
    
    const result = await pool.query(
      `SELECT COUNT(*) FROM notification_recipients WHERE user_id = $1 AND is_read = false AND is_deleted = false`,
      [userId]
    )
    
    res.json({ unreadCount: parseInt(result.rows[0].count) })
  } catch (error) {
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

// 标记通知为已读
app.put('/api/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id
    
    await pool.query(
      `UPDATE notification_recipients SET is_read = true, read_at = NOW() WHERE id = $1 AND user_id = $2`,
      [id, userId]
    )
    
    res.json({ success: true })
  } catch (error) {
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

// 全部标记为已读
app.put('/api/notifications/read-all', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id
    
    await pool.query(
      `UPDATE notification_recipients SET is_read = true, read_at = NOW() WHERE user_id = $1 AND is_read = false AND is_deleted = false`,
      [userId]
    )
    
    res.json({ success: true })
  } catch (error) {
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

// 删除所有已读通知
app.delete('/api/notifications/read', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id
    
    await pool.query(
      `UPDATE notification_recipients SET is_deleted = true WHERE user_id = $1 AND is_read = true AND is_deleted = false`,
      [userId]
    )
    
    res.json({ success: true })
  } catch (error) {
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

// 删除通知（单个）
app.delete('/api/notifications/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id
    
    await pool.query(
      `UPDATE notification_recipients SET is_deleted = true WHERE id = $1 AND user_id = $2`,
      [id, userId]
    )
    
    res.json({ success: true })
  } catch (error) {
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

// ========== 管理员通知 API ==========

// 获取所有通知（管理员）
app.get('/api/admin/notifications', authenticateAdmin, async (req, res) => {
  try {
    const { page = 1, pageSize = 20, type } = req.query
    const offset = (page - 1) * pageSize
    
    let query = `
      SELECT 
        n.id,
        n.title,
        n.content,
        n.type,
        n.created_by,
        n.created_at,
        COALESCE(u.username, '系统') as creator_name,
        (SELECT COUNT(*) FROM notification_recipients nr2 JOIN users u2 ON nr2.user_id = u2.id WHERE nr2.notification_id = n.id AND u2.role != 'admin') as recipient_count,
        (SELECT COUNT(*) FROM notification_recipients nr3 JOIN users u3 ON nr3.user_id = u3.id WHERE nr3.notification_id = n.id AND nr3.is_read = true AND u3.role != 'admin') as read_count
      FROM notifications n
      LEFT JOIN users u ON n.created_by = u.id
      WHERE 1=1
    `
    const params = []
    let paramIndex = 1
    
    if (type) {
      query += ` AND n.type = $${paramIndex}`
      params.push(type)
      paramIndex++
    }
    
    query += ` ORDER BY n.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    params.push(pageSize, offset)
    
    const result = await pool.query(query, params)
    
    // 确保字段名正确（PostgreSQL 可能返回大写）
    const notifications = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      content: row.content,
      type: row.type,
      creator_name: row.creator_name || row.creatorName || '系统',
      created_at: row.created_at || row.createdAt,
      recipient_count: row.recipient_count || row.recipientCount || 0,
      read_count: row.read_count || row.readCount || 0,
    }))
    
    res.json({
      notifications,
      total: notifications.length
    })
  } catch (error) {
    console.error('获取通知失败:', error)
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

// 创建通知（管理员）
app.post('/api/admin/notifications', authenticateAdmin, async (req, res) => {
  try {
    const { title, content, type, targetUsers } = req.body
    const adminId = req.user.id
    
    if (!title || !content) {
      return res.status(400).json({ error: '标题和内容不能为空' })
    }
    
    // 创建通知
    const notificationResult = await pool.query(
      `INSERT INTO notifications (title, content, type, created_by) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, title, content, type, created_at`,
      [title, content, type || 'system', adminId]
    )
    
    const notification = notificationResult.rows[0]
    
    // 确定目标用户（排除管理员）
    let userQuery
    if (targetUsers === 'all') {
      userQuery = "SELECT id FROM users WHERE role != 'admin'"
    } else if (targetUsers === 'active') {
      userQuery = "SELECT id FROM users WHERE status = 'active' AND role != 'admin'"
    } else if (Array.isArray(targetUsers) && targetUsers.length > 0) {
      userQuery = {
        text: `SELECT id FROM users WHERE id = ANY($1) AND role != 'admin'`,
        values: [targetUsers]
      }
    } else {
      return res.status(400).json({ error: '请选择目标用户' })
    }
    
    const usersResult = await pool.query(userQuery)
    const users = usersResult.rows
    
    // 批量插入通知接收者记录
    if (users.length > 0) {
      const recipientValues = users.map((u, i) => 
        `($${i * 2 + 1}, $${i * 2 + 2})`
      ).join(', ')
      
      const recipientParams = users.flatMap(u => [u.id, notification.id])
      
      await pool.query(
        `INSERT INTO notification_recipients (user_id, notification_id) VALUES ${recipientValues} ON CONFLICT DO NOTHING`,
        recipientParams
      )
    }
    
    res.json({
      success: true,
      notification,
      recipientCount: users.length
    })
  } catch (error) {
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

// 删除通知（管理员）
app.delete('/api/admin/notifications/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params
    
    await pool.query(
      `DELETE FROM notification_recipients WHERE notification_id = $1`,
      [id]
    )
    
    await pool.query(
      `DELETE FROM notifications WHERE id = $1`,
      [id]
    )
    
    res.json({ success: true })
  } catch (error) {
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

// 获取欢迎通知（管理员）
app.get('/api/admin/notifications/welcome', authenticateAdmin, async (req, res) => {
  try {
    const welcomeId = "md5('welcome_default')::uuid"
    const result = await pool.query(
      `SELECT id, title, content, type, created_at FROM notifications WHERE id = ${welcomeId}`
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '欢迎通知不存在' })
    }
    res.json(result.rows[0])
  } catch (error) {
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

// 修改欢迎通知（管理员）
app.put('/api/admin/notifications/welcome', authenticateAdmin, async (req, res) => {
  try {
    const { title, content } = req.body
    if (!title || !content) {
      return res.status(400).json({ error: '标题和内容不能为空' })
    }
    const welcomeId = "md5('welcome_default')::uuid"
    const result = await pool.query(
      `UPDATE notifications SET title = $1, content = $2, updated_at = NOW() WHERE id = ${welcomeId} RETURNING id, title, content, type, updated_at`,
      [title, content]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '欢迎通知不存在' })
    }
    res.json(result.rows[0])
  } catch (error) {
    console.error('服务器错误:', error.message); res.status(500).json({ error: '服务器内部错误，请稍后重试' })
  }
})

// ========== 数据库初始化 ==========

const initDatabase = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS feedback (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36),
        rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
        category VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        contact VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('反馈表初始化完成')
    
    // 初始化通知表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text)::uuid,
        title VARCHAR(200) NOT NULL,
        content TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'system',
        priority VARCHAR(20) DEFAULT 'normal',
        is_active BOOLEAN DEFAULT true,
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('通知表初始化完成')
    
    // 初始化通知接收者表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notification_recipients (
        id UUID PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text)::uuid,
        notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        is_read BOOLEAN DEFAULT false,
        is_deleted BOOLEAN DEFAULT false,
        read_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(notification_id, user_id)
      )
    `)
    console.log('通知接收者表初始化完成')
    
    // 确保欢迎通知存在（固定通知，新用户注册时自动发送）
    await pool.query(`
      INSERT INTO notifications (id, title, content, type, created_by)
      VALUES (
        md5('welcome_default')::uuid,
        '欢迎加入四六级写作智能辅导平台！',
        '你好，欢迎来到四六级写作智能辅导平台！\n\n在这里你可以：\n• 浏览写作素材库，积累高分句式和词汇\n• 参加专项训练，提升审题、素材运用等能力\n• 在线写作并提交AI智能批改\n• 查看详细的批改报告和高分改写\n\n祝你学习愉快，顺利通过四六级考试！',
        'system',
        NULL
      )
      ON CONFLICT (id) DO NOTHING
    `)
    console.log('欢迎通知初始化完成')

    // 清理重复参与记录：同一用户同一试卷仅保留最新的 completed 和 in_progress 各一条
    try {
      await pool.query(`
        DELETE FROM mock_exam_participations mep
        WHERE mep.status = 'in_progress'
        AND EXISTS (
          SELECT 1 FROM mock_exam_participations mep2
          WHERE mep2.mock_exam_id = mep.mock_exam_id
          AND mep2.user_id = mep.user_id
          AND mep2.status = 'completed'
        )
      `)
      // 删除重复的 completed（保留最新的）
      await pool.query(`
        DELETE FROM mock_exam_participations mep
        USING mock_exam_participations mep2
        WHERE mep.mock_exam_id = mep2.mock_exam_id
        AND mep.user_id = mep2.user_id
        AND mep.status = 'completed' AND mep2.status = 'completed'
        AND mep.created_at < mep2.created_at
      `)
    } catch (e) { console.log('清理重复参与记录跳过:', e.message) }

    // 添加唯一约束：同一用户同一试卷只能有一条 in_progress
    try {
      await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_participation_one_in_progress ON mock_exam_participations (user_id, mock_exam_id) WHERE status = 'in_progress'`)
    } catch (e) { console.log('创建唯一索引跳过:', e.message) }
    
    // 初始化模考种子数据（使用 seed_log 追踪，仅首次部署时插入）
    // 确保新字段存在
    try { await pool.query(`ALTER TABLE mock_exams ADD COLUMN IF NOT EXISTS category VARCHAR(20) DEFAULT 'mock'`) } catch {}
    try { await pool.query(`ALTER TABLE mock_exams ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT true`) } catch {}
    try { await pool.query(`ALTER TABLE mock_exam_participations ADD COLUMN IF NOT EXISTS answers JSONB`) } catch {}
    try { await pool.query(`ALTER TABLE mock_exam_participations ADD COLUMN IF NOT EXISTS section_results JSONB`) } catch {}
    try { await pool.query(`ALTER TABLE mock_exam_participations ADD COLUMN IF NOT EXISTS max_score INT`) } catch {}
    
    // 创建种子部署追踪表
    await pool.query(`CREATE TABLE IF NOT EXISTS seed_log (seed_name TEXT PRIMARY KEY, deployed_at TIMESTAMP DEFAULT NOW())`)
    
    const seedDeployed = await pool.query(`SELECT 1 FROM seed_log WHERE seed_name = 'mock_exams'`)
    if (seedDeployed.rows.length === 0) {
      console.log('首次部署，插入种子试卷...')
      await pool.query(`
      INSERT INTO mock_exams (id, title, description, level, duration, questions, category, enabled) VALUES 
      (
        md5('cet4_mock_1')::uuid,
        '2024年6月四级真题模拟',
        '基于四级真题结构，涵盖写作、听力、阅读、翻译四大部分',
        'cet4',
        125,
        $1,
        'mock',
        true
      ),
      (
        md5('cet6_mock_1')::uuid,
        '2024年12月六级真题模拟',
        '基于六级真题结构，涵盖写作、听力、阅读、翻译四大部分',
        'cet6',
        130,
        $2,
        'mock',
        true
      )
      ON CONFLICT (id) DO NOTHING
    `, [
      JSON.stringify([
        { id: 'sec1', type: 'writing', title: 'Part I: Writing', requirements: 'Directions: For this part, you are allowed 30 minutes to write a short essay on the topic of "The Importance of Lifelong Learning". You should write at least 120 words but no more than 180 words.', questions: [{ id: 's1q1', score: 15, answer: '' }] },
        { id: 'sec2', type: 'listening', title: 'Section A: News Report', passage: 'In this section, you will hear three news reports. At the end of each news report, you will hear two or three questions. Both the news report and the questions will be spoken only once.', questions: [
          { id: 's2q1', title: 'Question 1', score: 2, answer: 'B', options: [{ label: 'It was about a traffic accident.', value: 'A' }, { label: 'It was about a natural disaster.', value: 'B' }, { label: 'It was about a political event.', value: 'C' }, { label: 'It was about a sports competition.', value: 'D' }] },
          { id: 's2q2', title: 'Question 2', score: 2, answer: 'A', options: [{ label: 'To provide emergency aid.', value: 'A' }, { label: 'To report the news.', value: 'B' }, { label: 'To take photos.', value: 'C' }, { label: 'To interview survivors.', value: 'D' }] },
          { id: 's2q3', title: 'Question 3', score: 2, answer: 'C', options: [{ label: 'Monday morning.', value: 'A' }, { label: 'Tuesday afternoon.', value: 'B' }, { label: 'Wednesday evening.', value: 'C' }, { label: 'Thursday night.', value: 'D' }] }
        ]},
        { id: 'sec3', type: 'listening', title: 'Section B: Long Conversation', passage: 'In this section, you will hear a long conversation. At the end of the conversation, you will hear four questions.', questions: [
          { id: 's3q1', title: 'Question 4', score: 2, answer: 'D', options: [{ label: 'Teacher and student.', value: 'A' }, { label: 'Doctor and patient.', value: 'B' }, { label: 'Boss and employee.', value: 'C' }, { label: 'Interviewer and candidate.', value: 'D' }] },
          { id: 's3q2', title: 'Question 5', score: 2, answer: 'B', options: [{ label: 'He was late for the meeting.', value: 'A' }, { label: 'He has relevant experience.', value: 'B' }, { label: 'He knew the boss personally.', value: 'C' }, { label: 'He graduated from a top school.', value: 'D' }] },
          { id: 's3q3', title: 'Question 6', score: 2, answer: 'A', options: [{ label: 'Next Monday.', value: 'A' }, { label: 'Next Tuesday.', value: 'B' }, { label: 'Next Wednesday.', value: 'C' }, { label: 'Next Thursday.', value: 'D' }] },
          { id: 's3q4', title: 'Question 7', score: 2, answer: 'C', options: [{ label: 'The salary is too low.', value: 'A' }, { label: 'The location is far.', value: 'B' }, { label: 'He needs to think about it.', value: 'C' }, { label: 'He has another offer.', value: 'D' }] }
        ]},
        { id: 'sec4', type: 'reading_cloze', title: 'Section A: Banked Cloze', passageTitle: 'The Future of Work', passage: 'The way we work is changing rapidly. Technology has transformed the workplace, and many traditional jobs are being replaced by automation. According to a recent study, nearly half of all current jobs could be ___1___ by machines within the next two decades. However, experts argue that while some jobs will disappear, new ones will be ___2___. The key is for workers to develop skills that cannot easily be replicated by machines. Critical thinking, creativity, and emotional intelligence are likely to become increasingly ___3___ in the future job market. Companies are already investing heavily in retraining programs to ensure their employees can ___4___ to the changing landscape. Governments are also taking steps to prepare the workforce for this transition. Some have introduced ___5___ that provide funding for lifelong learning. The ___6___ from manual to cognitive work has been ongoing for decades, but the pace has accelerated. Workers who fail to update their skills risk being left behind. The most successful individuals will be those who embrace change and view learning as a ___7___ process rather than a one-time event. Educational institutions must also adapt their curriculums to meet the ___8___ of a rapidly evolving economy. As one researcher noted, "The future belongs to those who are ___9___ to learn, unlearn, and relearn." This ___10___ captures the essence of what it means to thrive in the modern workplace.',
        wordBank: ['replaced', 'created', 'valuable', 'adapt', 'policies', 'shift', 'continuous', 'demands', 'willing', 'philosophy', 'temporary', 'impossible', 'expensive', 'resistant', 'declined'],
        questions: [
          { id: 's4q1', score: 1, answer: 'replaced' }, { id: 's4q2', score: 1, answer: 'created' },
          { id: 's4q3', score: 1, answer: 'valuable' }, { id: 's4q4', score: 1, answer: 'adapt' },
          { id: 's4q5', score: 1, answer: 'policies' }, { id: 's4q6', score: 1, answer: 'shift' },
          { id: 's4q7', score: 1, answer: 'continuous' }, { id: 's4q8', score: 1, answer: 'demands' },
          { id: 's4q9', score: 1, answer: 'willing' }, { id: 's4q10', score: 1, answer: 'philosophy' }
        ]},
        { id: 'sec5', type: 'reading_matching', title: 'Section B: Long Reading', passageTitle: 'How Smartphones Changed Society', passage: 'Smartphones have become an integral part of modern life. They have transformed the way we communicate, work, and entertain ourselves. This passage explores the various impacts of smartphones on different aspects of society.',
        paragraphs: [
          'A: The first iPhone was released in 2007, marking the beginning of the smartphone era. Since then, the adoption of smartphones has been nothing short of revolutionary. Today, over 6 billion people worldwide own a smartphone, making it one of the most rapidly adopted technologies in human history. The impact of this device extends far beyond simple communication.',
          'B: One of the most significant changes brought about by smartphones is in the realm of social interaction. People now spend an average of 3 hours per day on their phones, much of it on social media platforms. While this has made it easier to stay in touch with friends and family, it has also raised concerns about the quality of these interactions. Some researchers argue that digital communication lacks the depth and authenticity of face-to-face conversations.',
          'C: The workplace has also been transformed by smartphones. Remote work, which became widespread during the COVID-19 pandemic, would not have been possible without mobile technology. Employees can now collaborate across time zones and access work documents from anywhere. However, the blurring of boundaries between work and personal life has led to increased stress and burnout for many professionals.',
          'D: In the field of education, smartphones have created new opportunities for learning. Students can access vast libraries of information instantly, participate in online courses, and use educational apps to supplement their studies. Yet critics point out that smartphones can also be a major distraction in the classroom, with many students struggling to resist the temptation to check social media during lectures.',
          'E: The healthcare industry has benefited enormously from smartphone technology. Health tracking apps allow individuals to monitor their fitness levels, sleep patterns, and nutrition. Telemedicine, which enables patients to consult doctors remotely, has become increasingly popular. These developments have the potential to make healthcare more accessible and affordable for millions of people around the world.',
          'F: Smartphones have also changed the way we consume entertainment. Streaming services, mobile games, and social media provide endless sources of amusement. However, there is growing concern about smartphone addiction, particularly among young people. Studies have shown that excessive screen time is linked to higher rates of anxiety and depression in teenagers.',
          'G: The environmental impact of smartphones is another important consideration. The production of smartphones requires rare earth minerals, whose extraction often causes environmental damage. Moreover, the short lifespan of most smartphones contributes to the growing problem of electronic waste. Manufacturers are under increasing pressure to make their products more sustainable.',
          'H: Looking to the future, smartphones are likely to become even more integrated into our daily lives. Technologies such as augmented reality, artificial intelligence, and 5G connectivity promise to expand the capabilities of these devices further. The challenge for society will be to harness the benefits of smartphones while mitigating their negative effects.'
        ],
        questions: [
          { id: 's5q1', title: 'Smartphones have made it possible for people to have medical consultations from home.', score: 2, answer: '{"E":"E"}' },
          { id: 's5q2', title: 'The rapid adoption of smartphones is among the fastest of any technology in history.', score: 2, answer: '{"A":"A"}' },
          { id: 's5q3', title: 'Excessive use of smartphones among young people is associated with mental health issues.', score: 2, answer: '{"F":"F"}' },
          { id: 's5q4', title: 'Working remotely has become more stressful for some people due to unclear boundaries.', score: 2, answer: '{"C":"C"}' },
          { id: 's5q5', title: 'The production process of smartphones involves materials that harm the environment.', score: 2, answer: '{"G":"G"}' },
          { id: 's5q6', title: 'Some researchers believe online communication is not as meaningful as talking in person.', score: 2, answer: '{"B":"B"}' },
          { id: 's5q7', title: 'Students often find it difficult to concentrate in class because of their phones.', score: 2, answer: '{"D":"D"}' },
          { id: 's5q8', title: 'Future technologies will make smartphones even more capable.', score: 2, answer: '{"H":"H"}' }
        ]},
        { id: 'sec6', type: 'reading_careful', title: 'Section C: Careful Reading', passageTitle: 'The Science of Sleep', passage: 'Sleep is essential for human health and well-being. During sleep, the body repairs itself, consolidates memories, and releases important hormones. Adults typically need between 7 and 9 hours of sleep per night, yet many people fail to get adequate rest. Chronic sleep deprivation has been linked to a range of health problems, including obesity, heart disease, and impaired cognitive function. Recent research has shed new light on the mechanisms behind sleep and its importance for brain health. Scientists have discovered that during deep sleep, the brain clears out toxins that accumulate during waking hours, including proteins associated with Alzheimers disease. This finding underscores the critical role that sleep plays in maintaining long-term brain health.',
        questions: [
          { id: 's6q1', title: 'Question 1: What is the recommended amount of sleep for adults?', score: 2, answer: 'C', options: [{ label: '5-6 hours', value: 'A' }, { label: '6-7 hours', value: 'B' }, { label: '7-9 hours', value: 'C' }, { label: '9-10 hours', value: 'D' }] },
          { id: 's6q2', title: 'Question 2: According to the passage, what happens during deep sleep?', score: 2, answer: 'B', options: [{ label: 'The body produces more fat.', value: 'A' }, { label: 'The brain clears out toxins.', value: 'B' }, { label: 'Blood pressure increases.', value: 'C' }, { label: 'Muscles stop working.', value: 'D' }] },
          { id: 's6q3', title: 'Question 3: Chronic sleep deprivation is linked to which of the following?', score: 2, answer: 'D', options: [{ label: 'Improved memory.', value: 'A' }, { label: 'Weight loss.', value: 'B' }, { label: 'Better concentration.', value: 'C' }, { label: 'Heart disease.', value: 'D' }] },
          { id: 's6q4', title: 'Question 4: Which disease is mentioned in connection with sleep?', score: 2, answer: 'A', options: [{ label: 'Alzheimer\'s disease.', value: 'A' }, { label: 'Parkinson\'s disease.', value: 'B' }, { label: 'Diabetes.', value: 'C' }, { label: 'Cancer.', value: 'D' }] },
          { id: 's6q5', title: 'Question 5: What is the main purpose of this passage?', score: 2, answer: 'B', options: [{ label: 'To describe different sleep disorders.', value: 'A' }, { label: 'To explain the importance of sleep for health.', value: 'B' }, { label: 'To give advice on how to sleep better.', value: 'C' }, { label: 'To discuss the history of sleep research.', value: 'D' }] }
        ]},
        { id: 'sec7', type: 'translation', title: 'Part IV: Translation', requirements: 'Directions: For this part, you are allowed 30 minutes to translate a passage from Chinese into English. 中国书法是中国传统文化的重要组成部分，有着数千年的历史。它不仅是一种书写方式，更是一种艺术表现形式。书法作品通过笔墨的运用展现了中国文化的独特魅力。许多中国人从小就开始学习书法，因为它能培养耐心和专注力。', questions: [{ id: 's7q1', score: 15, answer: '' }] }
      ]),
      JSON.stringify([
        { id: 'sec1', type: 'writing', title: 'Part I: Writing', requirements: 'Directions: For this part, you are allowed 30 minutes to write an essay on the topic of "Artificial Intelligence: Opportunities and Challenges". You should write at least 150 words but no more than 200 words.', questions: [{ id: 's1q1', score: 15, answer: '' }] },
        { id: 'sec2', type: 'listening', title: 'Section A: Long Conversation', passage: 'In this section, you will hear a long conversation. At the end of the conversation, you will hear four questions.', questions: [
          { id: 's2q1', title: 'Question 1', score: 2, answer: 'C', options: [{ label: 'Apply for a new job.', value: 'A' }, { label: 'Travel abroad.', value: 'B' }, { label: 'Choose a major.', value: 'C' }, { label: 'Buy a house.', value: 'D' }] },
          { id: 's2q2', title: 'Question 2', score: 2, answer: 'A', options: [{ label: 'Engineering.', value: 'A' }, { label: 'History.', value: 'B' }, { label: 'Art.', value: 'C' }, { label: 'Medicine.', value: 'D' }] },
          { id: 's2q3', title: 'Question 3', score: 2, answer: 'D', options: [{ label: 'It is too difficult.', value: 'A' }, { label: 'It is boring.', value: 'B' }, { label: 'It pays well.', value: 'C' }, { label: 'It is interesting.', value: 'D' }] },
          { id: 's2q4', title: 'Question 4', score: 2, answer: 'B', options: [{ label: 'Talk to her parents.', value: 'A' }, { label: 'Consult a career advisor.', value: 'B' }, { label: 'Take both courses.', value: 'C' }, { label: 'Drop out of school.', value: 'D' }] }
        ]},
        { id: 'sec3', type: 'listening', title: 'Section B: Passages', passage: 'In this section, you will hear a passage. At the end of the passage, you will hear some questions.', questions: [
          { id: 's3q1', title: 'Question 5', score: 2, answer: 'B', options: [{ label: 'The history of the Internet.', value: 'A' }, { label: 'The benefits of reading.', value: 'B' }, { label: 'The dangers of social media.', value: 'C' }, { label: 'The importance of exercise.', value: 'D' }] },
          { id: 's3q2', title: 'Question 6', score: 2, answer: 'A', options: [{ label: 'It improves vocabulary.', value: 'A' }, { label: 'It causes eye strain.', value: 'B' }, { label: 'It wastes time.', value: 'C' }, { label: 'It is expensive.', value: 'D' }] },
          { id: 's3q3', title: 'Question 7', score: 2, answer: 'C', options: [{ label: '10 minutes.', value: 'A' }, { label: '20 minutes.', value: 'B' }, { label: '30 minutes.', value: 'C' }, { label: '60 minutes.', value: 'D' }] }
        ]},
        { id: 'sec4', type: 'reading_cloze', title: 'Section A: Banked Cloze', passageTitle: 'Climate Change and Agriculture', passage: 'Climate change poses a significant threat to global agriculture. Rising temperatures and changing weather patterns are already affecting crop yields in many regions. Scientists warn that if ___1___ continue to rise, food production could decline dramatically in the coming decades. Some crops are particularly ___2___ to heat stress, including wheat and rice, which are staple foods for billions of people. Farmers are being forced to ___3___ their practices to cope with these new challenges. Many are switching to drought-resistant crop varieties and implementing more efficient irrigation systems. Governments have introduced ___4___ to support farmers during this transition. However, experts argue that more needs to be done at the international level. The effects of climate change do not respect national ___5___, and coordinated global action is essential. Some researchers are working on developing crops that can ___6___ extreme weather conditions. These genetically modified organisms could play a ___7___ role in ensuring food security. Yet public acceptance remains a ___8___ issue that needs to be addressed. As one scientist noted, technology alone cannot solve the problem. ___9___ changes in consumption patterns and food waste reduction are equally important. The ___10___ of this issue requires urgent attention from policymakers worldwide.',
        wordBank: ['temperatures', 'vulnerable', 'modify', 'subsidies', 'borders', 'withstand', 'crucial', 'controversial', 'Behavioral', 'urgency', 'solutions', 'stable', 'natural', 'rarely', 'declining'],
        questions: [
          { id: 's4q1', score: 1, answer: 'temperatures' }, { id: 's4q2', score: 1, answer: 'vulnerable' },
          { id: 's4q3', score: 1, answer: 'modify' }, { id: 's4q4', score: 1, answer: 'subsidies' },
          { id: 's4q5', score: 1, answer: 'borders' }, { id: 's4q6', score: 1, answer: 'withstand' },
          { id: 's4q7', score: 1, answer: 'crucial' }, { id: 's4q8', score: 1, answer: 'controversial' },
          { id: 's4q9', score: 1, answer: 'Behavioral' }, { id: 's4q10', score: 1, answer: 'urgency' }
        ]},
        { id: 'sec5', type: 'reading_matching', title: 'Section B: Long Reading', passageTitle: 'The Rise of E-Commerce', paragraphs: [
          'A: E-commerce has grown exponentially over the past two decades. What began as a niche market for tech-savvy consumers has evolved into a trillion-dollar industry that touches nearly every aspect of modern life. Companies like Amazon and Alibaba have become household names, reshaping the retail landscape in profound ways.',
          'B: One of the primary advantages of e-commerce is convenience. Consumers can shop from anywhere at any time, without the need to travel to physical stores. This flexibility has been particularly valuable for people with disabilities, those living in remote areas, and busy professionals who have limited time for shopping.',
          'C: The impact on traditional retail has been devastating for many businesses. Brick-and-mortar stores have struggled to compete with the lower prices and wider selection offered by online retailers. Many famous retail chains have filed for bankruptcy in recent years, unable to adapt to the changing market.',
          'D: Small businesses have found both opportunities and challenges in the e-commerce era. While online platforms allow them to reach customers far beyond their local area, they also face intense competition from larger players. Success often depends on finding a niche market that is too small for major retailers to target.',
          'E: The environmental impact of e-commerce is complex. On one hand, online shopping reduces the need for consumers to drive to stores, potentially lowering carbon emissions. On the other hand, the packaging waste from millions of individual deliveries has become a serious environmental concern.',
          'F: Logistics and delivery systems have had to evolve rapidly to keep pace with e-commerce growth. Same-day and next-day delivery have become the norm in many urban areas. Companies are investing heavily in automated warehouses and drone delivery technology to make the process even faster and more efficient.',
          'G: Consumer data has become one of the most valuable assets in the e-commerce industry. Online retailers can track browsing habits, purchase history, and even mouse movements to personalize the shopping experience. This has raised significant privacy concerns, leading to stricter regulations in many countries.',
          'H: Looking ahead, virtual and augmented reality technologies promise to transform e-commerce yet again. Customers may soon be able to try on clothes virtually or see how furniture would look in their homes before making a purchase. These innovations could blur the line between online and offline shopping experiences.'
        ],
        questions: [
          { id: 's5q1', title: 'Shoppers can make purchases at any time thanks to e-commerce.', score: 2, answer: '{"B":"B"}' },
          { id: 's5q2', title: 'Many physical stores have gone out of business due to online competition.', score: 2, answer: '{"C":"C"}' },
          { id: 's5q3', title: 'Packaging from online deliveries contributes to environmental problems.', score: 2, answer: '{"E":"E"}' },
          { id: 's5q4', title: 'Companies are developing drone technology for faster deliveries.', score: 2, answer: '{"F":"F"}' },
          { id: 's5q5', title: 'Small businesses need to find specialized markets to succeed online.', score: 2, answer: '{"D":"D"}' },
          { id: 's5q6', title: 'Virtual reality could change how people shop in the future.', score: 2, answer: '{"H":"H"}' },
          { id: 's5q7', title: 'Online retailers collect detailed information about customer behavior.', score: 2, answer: '{"G":"G"}' },
          { id: 's5q8', title: 'E-commerce started as a small market before growing into a major industry.', score: 2, answer: '{"A":"A"}' }
        ]},
        { id: 'sec6', type: 'reading_careful', title: 'Section C: Careful Reading', passageTitle: 'Urban Green Spaces', passage: 'Urban green spaces parks, gardens, and tree-lined streets play a vital role in the health and well-being of city residents. Studies have shown that access to green spaces can reduce stress, improve mood, and even lower blood pressure. Despite these benefits, many cities around the world are losing their green areas to development. As urban populations continue to grow, the pressure on available land increases. City planners face the challenge of balancing the need for housing and infrastructure with the preservation of natural spaces. Some innovative cities are finding creative solutions, such as vertical gardens and rooftop parks, to bring nature back into the urban environment. These initiatives not only improve the quality of life for residents but also help combat the urban heat island effect, where cities become significantly warmer than surrounding rural areas.',
        questions: [
          { id: 's6q1', title: 'Question 1: What is a benefit of urban green spaces?', score: 2, answer: 'D', options: [{ label: 'Higher property taxes.', value: 'A' }, { label: 'More traffic congestion.', value: 'B' }, { label: 'Increased noise levels.', value: 'C' }, { label: 'Reduced stress levels.', value: 'D' }] },
          { id: 's6q2', title: 'Question 2: Why are cities losing green spaces?', score: 2, answer: 'B', options: [{ label: 'Climate change.', value: 'A' }, { label: 'Urban development.', value: 'B' }, { label: 'Natural disasters.', value: 'C' }, { label: 'Government neglect.', value: 'D' }] },
          { id: 's6q3', title: 'Question 3: What is the urban heat island effect?', score: 2, answer: 'A', options: [{ label: 'Cities being warmer than rural areas.', value: 'A' }, { label: 'Parks being cooler than streets.', value: 'B' }, { label: 'Buildings blocking wind.', value: 'C' }, { label: 'Pollution trapping heat.', value: 'D' }] },
          { id: 's6q4', title: 'Question 4: Which solution is mentioned for bringing nature back to cities?', score: 2, answer: 'C', options: [{ label: 'Building more roads.', value: 'A' }, { label: 'Planting crops in parks.', value: 'B' }, { label: 'Creating rooftop gardens.', value: 'C' }, { label: 'Removing old buildings.', value: 'D' }] },
          { id: 's6q5', title: 'Question 5: What is the main challenge for city planners?', score: 2, answer: 'C', options: [{ label: 'Finding enough workers.', value: 'A' }, { label: 'Getting government approval.', value: 'B' }, { label: 'Balancing development and green spaces.', value: 'C' }, { label: 'Reducing the city population.', value: 'D' }] }
        ]},
        { id: 'sec7', type: 'translation', title: 'Part IV: Translation', requirements: 'Directions: For this part, you are allowed 30 minutes to translate a passage from Chinese into English. 近年来，中国的共享经济发展迅速，已成为全球共享经济的领导者之一。共享单车、共享充电宝等服务给人们的生活带来了极大的便利。这种新型商业模式不仅提高了资源利用效率，还创造了大量的就业机会。', questions: [{ id: 's7q1', score: 15, answer: '' }] }
      ])
    ])
    // 标记种子已部署，后续重启不会再插入
    await pool.query(`INSERT INTO seed_log (seed_name) VALUES ('mock_exams') ON CONFLICT DO NOTHING`)
    console.log('模考种子数据插入完成')
    }
    const existing = await pool.query('SELECT COUNT(*) as cnt FROM mock_exams')
    const count = parseInt(existing.rows[0].cnt)
    console.log(`模考数据初始化完成（共 ${count} 套试卷）`)
  } catch (error) {
    console.error('初始化数据库失败:', error.message)
  }
}

app.listen(PORT, async () => {
  await initDatabase()
  console.log(`Server running on port ${PORT}`)
})