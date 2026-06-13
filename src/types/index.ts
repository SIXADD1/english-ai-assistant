export interface User {
  id: string
  username: string
  email: string
  level: 'cet4' | 'cet6' | 'both'
  role: 'user' | 'admin'
  avatar?: string
  avatarUrl?: string
  createdAt: string
  status?: string
}

export interface Material {
  id: string
  title: string
  content: string
  translation?: string
  category: 'topic' | 'sentence' | 'transition' | 'opening' | 'closing'
  type?: string
  tags: string[]
  usageScenario?: string
  tips?: string
  isCommon: boolean
  level?: 'cet4' | 'cet6'
  favoritesCount: number
  isFavorite?: boolean
  isActive?: boolean
  createdAt: string
}

export interface Question {
  id: string
  title: string
  content: string
  requirements?: string
  type: 'argumentative' | 'letter' | 'notice' | 'poster' | 'proposal' | 'memo' | 'other'
  level: 'cet4' | 'cet6'
  topic: string
  difficulty: 'easy' | 'medium' | 'hard'
  year?: number
  isAiGenerated?: boolean
  wordCountMin: number
  wordCountMax: number
  isActive?: boolean
  createdAt: string
}

export interface Draft {
  id: string
  userId: string
  questionId: string
  content: string
  wordCount: number
  status: 'draft' | 'submitted'
  timeSpent: number
  createdAt: string
  updatedAt: string
}

export interface CorrectionError {
  type: string
  position: { start: number; end: number }
  original: string
  corrected: string
  reason: string
}

export interface CorrectionResult {
  id: string
  draftId: string
  score: number
  scoreBreakdown: {
    content: number
    structure: number
    language: number
    format: number
  }
  overallComment: string
  errorList: CorrectionError[]
  formatErrors: string[]
  contentComments: string[]
  suggestions: string[]
  revisedVersion: string
  reviewReport: {
    strengths: string[]
    weaknesses: string[]
    improvementPlan: string[]
  }
  createdAt: string
}

export interface TrainingRecord {
  id: string
  userId: string
  type: 'topic' | 'material' | 'open-close' | 'format'
  score: number
  feedback: string
  createdAt: string
}

export interface CheckIn {
  id: string
  userId: string
  date: string
  type: 'material' | 'writing'
  createdAt: string
}

export interface LearningStats {
  totalMaterials: number
  favoriteMaterials: number
  totalWritings: number
  averageScore: number
  totalTimeSpent: number
  streak: number
  checkInDays: number
}
