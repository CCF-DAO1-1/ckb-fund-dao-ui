import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ManagementCenter from '@/components/treasury/ManagementCenter'

// 1. Mock useRouter
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush })
}))

// 2. Mock i18n
vi.mock('@/utils/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      // 提供一个简单的字典模拟
      if (key === 'taskTypes.createVote') return '创建投票'
      return key
    }
  })
}))
vi.mock('@/contexts/I18nContext', () => ({
  useI18n: () => ({ locale: 'zh' })
}))

// 3. Mock 自定义 Hooks
const mockRefetch = vi.fn()
const mockSetPage = vi.fn()
const mockModalsOpen = vi.fn()
const mockModalsClose = vi.fn()

let hookReturnValues: any = {
  errorCode: null,
  loading: false,
  error: null,
  tasks: [],
  page: 1,
  totalPages: 1,
}

vi.mock('@/hooks/useTaskList', () => ({
  useTaskList: () => ({
    ...hookReturnValues,
    refetch: mockRefetch,
    setPage: mockSetPage,
  })
}))

vi.mock('@/hooks/useManagementModals', () => ({
  useManagementModals: () => ({
    open: mockModalsOpen,
    close: mockModalsClose,
    onSuccess: vi.fn(),
    taskModal: { isOpen: false, selectedProposal: null },
    updateAddrModal: { isOpen: false },
    sendFundsModal: { isOpen: false },
    createMeetingModal: { isOpen: false },
    submitMeetingReportModal: { isOpen: false },
    submitDelayReportModal: { isOpen: false },
    submitMilestoneReportModal: { isOpen: false },
    submitAcceptanceReportModal: { isOpen: false },
  })
}))

// 4. Mock 子组件 (避免测试环境复杂化，隔离功能)
vi.mock('@/components/treasury/TaskTable', () => ({
  default: ({ onAction, proposals }: any) => (
    <div data-testid="mock-task-table">
      {proposals.map((p: any) => (
        <div key={p.uri} data-testid={`proposal-row-${p.uri}`}>
          <button 
            type="button"
            data-testid={`action-submitRectificationReport-${p.uri}`} 
            onClick={() => onAction('submitRectificationReport', p)}
          >Rectification</button>
          <button 
            type="button"
            data-testid={`action-createVote-${p.uri}`} 
            onClick={() => onAction('createVote', p)}
          >Vote</button>
          <button 
            type="button"
            data-testid={`action-sendFunds-${p.uri}`} 
            onClick={() => onAction('sendFunds', p)}
          >Send</button>
        </div>
      ))}
    </div>
  )
}))

// Mock util 避免复杂转换在单元测试中失败
vi.mock('@/utils/managementCenterUtils', () => ({
  adaptTaskData: (task: any) => ({ ...task, isAdapted: true }),
  markNewTasks: (adapted: any) => adapted, // 透传
}))

vi.mock('@/lib/postUriHref', () => ({
  postUriToHref: (uri: string) => `formatted-${uri}`
}))

// 对用到的其他的 Modals 统一用空组件占位，防止编译或深层依赖的问题
vi.mock('@/components/proposal/TaskProcessingModal', () => ({ default: () => <div /> }))
vi.mock('@/components/treasury/UpdateReceiverAddrModal', () => ({ default: () => <div /> }))
vi.mock('@/components/treasury/SendFundsModal', () => ({ default: () => <div /> }))
vi.mock('@/components/treasury/CreateMeetingModal', () => ({ default: () => <div /> }))
vi.mock('@/components/treasury/SubmitMeetingReportModal', () => ({ default: () => <div /> }))
vi.mock('@/components/treasury/SubmitMilestoneReportModal', () => ({ default: () => <div /> }))
vi.mock('@/components/treasury/SubmitDelayReportModal', () => ({ default: () => <div /> }))
vi.mock('@/components/treasury/SubmitAcceptanceReportModal', () => ({ default: () => <div /> }))

describe('ManagementCenter 组件', () => {

  beforeEach(() => {
    vi.clearAllMocks()
    hookReturnValues = {
      errorCode: null,
      loading: false,
      error: null,
      tasks: [{ uri: '123_test_uri' }],
      page: 1,
      totalPages: 5,
    }
  })

  it('1.1 基础渲染与分页组件功能', () => {
    render(<ManagementCenter />)
    expect(screen.getByTestId('mock-task-table')).toBeInTheDocument()
    
    // 验证分页加载
    expect(screen.getByText('1 / 5')).toBeInTheDocument()
    
    // 找到分页按钮：上一页(<)与下一页(>)
    const prevBtn = screen.getByLabelText('上一页')
    const nextBtn = screen.getByLabelText('下一页')
    
    expect(prevBtn).toBeDisabled() // 当前是第1页，不能上一页
    expect(nextBtn).not.toBeDisabled()

    fireEvent.click(nextBtn)
    expect(mockSetPage).toHaveBeenCalledWith(2)
  })

  it('1.2 触发 errorCode 403 时的页面越权自动跳转情况反馈', () => {
    hookReturnValues.errorCode = 403
    render(<ManagementCenter />)
    
    // 监听 useEffect 依赖 errorCode 的路由强制变更
    expect(mockPush).toHaveBeenCalledWith('/zh/error/403')
  })

  it('1.3.1 分发逻辑: 当操作为 submitRectificationReport 时', () => {
    render(<ManagementCenter />)
    const btn = screen.getByTestId('action-submitRectificationReport-123_test_uri')
    fireEvent.click(btn)
    
    // 应该把 123_test_uri 变身 formatted-123_test_uri 并发送路由
    expect(mockPush).toHaveBeenCalledWith('/zh/proposal/admin-edit/formatted-123_test_uri')
    expect(mockModalsOpen).not.toHaveBeenCalled()
  })

  it('1.3.2 分发逻辑: 当操作为 createVote 拦截定制化', () => {
    render(<ManagementCenter />)
    const btn = screen.getByTestId('action-createVote-123_test_uri')
    fireEvent.click(btn)
    
    // createVote 时会在 payload 追加 taskType
    expect(mockModalsOpen).toHaveBeenCalledWith('createVote', expect.objectContaining({
      uri: '123_test_uri',
      taskType: '创建投票'
    }))
  })

  it('1.3.3 分发逻辑: 通用场景下的透传表现', () => {
    render(<ManagementCenter />)
    const btn = screen.getByTestId('action-sendFunds-123_test_uri')
    fireEvent.click(btn)
    
    expect(mockModalsOpen).toHaveBeenCalledWith('sendFunds', expect.objectContaining({
      uri: '123_test_uri'
    }))
  })
})
