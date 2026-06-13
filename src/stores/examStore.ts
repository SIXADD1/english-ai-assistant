import { create } from 'zustand'

interface ExamState {
  examInProgress: boolean
  participationId: string | null
  pendingNavUrl: string | null
  leaveModalOpen: boolean
  setExamInProgress: (inProgress: boolean, participationId?: string) => void
  requestNavigation: (url: string) => void
  clearPendingNavigation: () => void
  closeLeaveModal: () => void
}

export const useExamStore = create<ExamState>((set) => ({
  examInProgress: false,
  participationId: null,
  pendingNavUrl: null,
  leaveModalOpen: false,
  setExamInProgress: (inProgress, participationId) =>
    set({ examInProgress: inProgress, participationId: participationId || null }),
  requestNavigation: (url) => set({ pendingNavUrl: url, leaveModalOpen: true }),
  clearPendingNavigation: () => set({ pendingNavUrl: null, leaveModalOpen: false }),
  closeLeaveModal: () => set({ leaveModalOpen: false }),
}))
