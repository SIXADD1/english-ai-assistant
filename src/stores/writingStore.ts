import { create } from 'zustand'
import type { Question, Draft, CorrectionResult } from '../types'

interface WritingState {
  currentQuestion: Question | null
  currentDraft: Draft | null
  timer: number
  isTimerRunning: boolean
  isSubmitting: boolean
  correctionResult: CorrectionResult | null
  setCurrentQuestion: (question: Question | null) => void
  setCurrentDraft: (draft: Draft | null) => void
  updateDraftContent: (content: string) => void
  startTimer: () => void
  stopTimer: () => void
  resetTimer: () => void
  setTimer: (time: number) => void
  setSubmitting: (submitting: boolean) => void
  setCorrectionResult: (result: CorrectionResult | null) => void
}

export const useWritingStore = create<WritingState>((set) => ({
  currentQuestion: null,
  currentDraft: null,
  timer: 30 * 60,
  isTimerRunning: false,
  isSubmitting: false,
  correctionResult: null,
  setCurrentQuestion: (question) => set({ currentQuestion: question }),
  setCurrentDraft: (draft) => set({ currentDraft: draft }),
  updateDraftContent: (content) =>
    set((state) => ({
      currentDraft: state.currentDraft
        ? { ...state.currentDraft, content }
        : null,
    })),
  startTimer: () => set({ isTimerRunning: true }),
  stopTimer: () => set({ isTimerRunning: false }),
  resetTimer: () => set({ timer: 30 * 60, isTimerRunning: false }),
  setTimer: (time) => set({ timer: time }),
  setSubmitting: (submitting) => set({ isSubmitting: submitting }),
  setCorrectionResult: (result) => set({ correctionResult: result }),
}))
