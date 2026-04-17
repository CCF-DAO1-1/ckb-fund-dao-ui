import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import CreateProposal from '@/app/[locale]/proposal/create/page'
import storage from '@/lib/storage'
import { createPDSRecord } from '@/server/pds'
import { getProposalDetail } from '@/server/proposal'
import toast from 'react-hot-toast'

// Mock dependencies
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush })
}))

vi.mock('@/utils/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key })
}))

vi.mock('@/contexts/I18nContext', () => ({
  useI18n: () => ({ locale: 'zh' })
}))

vi.mock('@/store/userInfo', () => ({
  default: () => ({
    userInfo: { did: 'did:key:123', handle: 'test.web5.bbs.fans' }
  })
}))

vi.mock('@/lib/storage', () => ({
  default: {
    setProposalDraft: vi.fn(),
    getProposalDraft: vi.fn(),
    clearExpiredDrafts: vi.fn(),
    removeProposalDraft: vi.fn(),
  }
}))

vi.mock('@/server/pds', () => ({
  createPDSRecord: vi.fn(),
}))

vi.mock('@/server/proposal', () => ({
  getProposalDetail: vi.fn(),
}))

vi.mock('react-hot-toast', () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
    loading: vi.fn(() => 'toast-id'),
    dismiss: vi.fn(),
  }
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  }
}))

// Mock child components to isolate tests and simplify data injection
vi.mock('@/components/proposal-steps/ProposalSettings', () => ({
  default: ({ formData, onInputChange, onDateChange }: any) => (
    <div data-testid="proposal-settings">
      <input 
        data-testid="input-title" 
        name="title" 
        value={formData.title} 
        onChange={onInputChange} 
      />
      <input 
        data-testid="input-type" 
        name="proposalType" 
        value={formData.proposalType} 
        onChange={onInputChange} 
      />
      <button type="button" data-testid="btn-set-date" onClick={() => onDateChange(new Date('2026-05-01'))}>
        Set Date
      </button>
    </div>
  )
}))

vi.mock('@/components/proposal-steps/ProjectBackground', () => ({
  default: ({ onInputChange }: any) => (
    <div data-testid="project-background">
      <button type="button" data-testid="btn-set-background" onClick={() => onInputChange('<p>Mock Background Text</p>')}>Set Background</button>
    </div>
  )
}))

vi.mock('@/components/proposal-steps/ProjectGoals', () => ({
  default: ({ onInputChange }: any) => (
    <div data-testid="project-goals">
      <button type="button" data-testid="btn-set-goals" onClick={() => onInputChange('<p>Mock Goals Text</p>')}>Set Goals</button>
    </div>
  )
}))

vi.mock('@/components/proposal-steps/TeamIntroduction', () => ({
  default: ({ onInputChange }: any) => (
    <div data-testid="team-introduction">
      <button type="button" data-testid="btn-set-team" onClick={() => onInputChange('<p>Mock Team Text</p>')}>Set Team</button>
    </div>
  )
}))

vi.mock('@/components/proposal-steps/ProjectBudget', () => ({
  default: ({ onInputChange }: any) => (
    <div data-testid="project-budget">
      <input 
        data-testid="input-budget" 
        name="budget" 
        onChange={onInputChange} 
      />
    </div>
  )
}))

vi.mock('@/components/proposal-steps/ProjectMilestones', () => ({
  default: ({ addMilestone, updateMilestone, onMilestoneDateChange, formData }: any) => (
    <div data-testid="project-milestones">
      <button type="button" data-testid="btn-add-milestone" onClick={addMilestone}>Add Milestone</button>
      {formData.milestones.map((m: any) => (
        <div key={m.id}>
           <button 
             type="button" 
             data-testid={`btn-update-milestone-${m.id}`} 
             onClick={() => {
                updateMilestone(m.id, 'title', 'Step 1');
                updateMilestone(m.id, 'description', 'Step 1 description');
                onMilestoneDateChange(m.id, new Date('2026-06-01'));
             }}>
             Update
           </button>
        </div>
      ))}
    </div>
  )
}))

vi.mock('@/components/proposal/PreviewModal', () => ({
  default: () => <div data-testid="preview-modal" />
}))

// Helper method to jump to the last step for submitting
const jumpToSubmitStep = () => {
    // There are 6 steps. Navigation can be done directly by clicking step indicators.
    const step6Indicator = screen.getByText('proposalCreate.steps.milestones')
    fireEvent.click(step6Indicator)
}


describe('CreateProposal 页面', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  it('初始渲染应停留在第一步：提案设置，并尝试清理过期草稿', () => {
    render(<CreateProposal />)
    expect(storage.clearExpiredDrafts).toHaveBeenCalled()
    expect(screen.getByTestId('proposal-settings')).toBeInTheDocument()
    // 检查下一步按钮
    expect(screen.getByText('proposalCreate.buttons.nextStep')).toBeInTheDocument()
  })

  it('若存在草稿，应该被正确加载进表单数据', () => {
    vi.mocked(storage.getProposalDraft).mockReturnValueOnce({
      title: 'Saved Draft Title',
      proposalType: 'funding',
      background: '',
      goals: '',
      team: '',
      budget: '',
      milestones: []
    } as any)

    render(<CreateProposal />)
    
    // storage.getProposalDraft 应该被正确调用传入 did
    expect(storage.getProposalDraft).toHaveBeenCalledWith('did:key:123')
    
    // 表单应当包含草稿数据
    const titleInput = screen.getByTestId('input-title') as HTMLInputElement
    expect(titleInput.value).toBe('Saved Draft Title')
  })

  it('多步表单切换逻辑验证', () => {
    render(<CreateProposal />)
    
    // 初始在第一步
    expect(screen.getByTestId('proposal-settings')).toBeInTheDocument()
    
    // 点击下一步到第二步
    fireEvent.click(screen.getByText('proposalCreate.buttons.nextStep'))
    expect(screen.getByTestId('project-background')).toBeInTheDocument()
    
    // 也可以直接点击步骤条跳转最后一步
    jumpToSubmitStep()
    expect(screen.getByTestId('project-milestones')).toBeInTheDocument()
  })

  it('空数据下点击提交会显示对应的 Toast 错误消息', async () => {
    render(<CreateProposal />)
    
    // 跳转到最后一步
    jumpToSubmitStep()
    
    // 此时应该出现提交按钮
    const submitBtn = screen.getByText('proposalCreate.buttons.submitProposal')
    fireEvent.click(submitBtn)
    
    // 因为 proposalType 必填未填，应该报相关错
    expect(toast.error).toHaveBeenCalledWith('proposalCreate.errors.proposalTypeRequired')
    expect(createPDSRecord).not.toHaveBeenCalled()
  })

  it('模拟正常全量填写并成功提交', async () => {
    // 模拟API调用返回
    vi.mocked(createPDSRecord).mockResolvedValue({ uri: 'at://did:key:123/app.dao.proposal/1234' } as any)
    vi.mocked(getProposalDetail).mockResolvedValue({ id: '123' } as any) // 模拟立刻索引成功

    render(<CreateProposal />)

    // step 1
    fireEvent.change(screen.getByTestId('input-title'), { target: { name: 'title', value: 'Perfect Proposal' } })
    fireEvent.change(screen.getByTestId('input-type'), { target: { name: 'proposalType', value: 'funding' } })
    fireEvent.click(screen.getByTestId('btn-set-date'))
    
    // step 2
    fireEvent.click(screen.getByText('proposalCreate.steps.projectBackground'))
    fireEvent.click(screen.getByTestId('btn-set-background'))
    
    // step 3
    fireEvent.click(screen.getByText('proposalCreate.steps.projectGoals'))
    fireEvent.click(screen.getByTestId('btn-set-goals'))
    
    // step 4
    fireEvent.click(screen.getByText('proposalCreate.steps.teamIntroduction'))
    fireEvent.click(screen.getByTestId('btn-set-team'))
    
    // step 5
    fireEvent.click(screen.getByText('proposalCreate.steps.projectBudget'))
    fireEvent.change(screen.getByTestId('input-budget'), { target: { name: 'budget', value: '100 CKB' } })

    // step 6
    jumpToSubmitStep()
    fireEvent.click(screen.getByTestId('btn-add-milestone'))
    
    // 添加后需要再次渲染拿到更新后的 milestone id
    const updateButtons = screen.getAllByTestId(/btn-update-milestone-/)
    expect(updateButtons.length).toBeGreaterThan(0)
    fireEvent.click(updateButtons[0])

    // 现在数据应该全填好了，尝试提交
    const submitBtn = screen.getByText('proposalCreate.buttons.submitProposal')
    fireEvent.click(submitBtn)

    // 让微任务队列执行（例如 state update和API mock resolve）
    await Promise.resolve()
    
    // 检查是否有由于验证不通过产生的报错！
    if (vi.mocked(toast.error).mock.calls.length > 0) {
        throw new Error('Form validation failed: ' + JSON.stringify(vi.mocked(toast.error).mock.calls))
    }

    // 验证 API 已经开始被调用
    expect(createPDSRecord).toHaveBeenCalled()
    
    // 由于提交逻辑中有 await new Promise 5秒的延迟
    // 因为这里启用了 fakeTimers，我们需要向前快进时间
    await vi.advanceTimersByTimeAsync(6000)
    
    // 接着还有轮询重试逻辑 2秒 (在循环内)
    await vi.advanceTimersByTimeAsync(3000)

    expect(mockPush).toHaveBeenCalledWith('/zh/proposal/' + encodeURIComponent('at://did:key:123/app.dao.proposal/1234'))
    expect(storage.removeProposalDraft).toHaveBeenCalledWith('did:key:123')
  })
})
