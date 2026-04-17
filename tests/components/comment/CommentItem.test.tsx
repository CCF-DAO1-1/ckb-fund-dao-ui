import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import CommentItem from '@/components/comment/CommentItem'
import { CommentItemProps } from '@/types/comment'

// Mock DOMPurify as it might complain in jsdom depending on setup
vi.mock('dompurify', () => ({
  default: {
    sanitize: vi.fn((str) => str)
  }
}))

// Mock Avatar to avoid testing nested components
vi.mock('@/components/common/Avatar', () => ({
  default: ({ did }: { did: string }) => <div data-testid="mock-avatar">{did}</div>
}))

// Mock I18nContext
vi.mock('@/contexts/I18nContext', () => ({
  useI18n: () => ({
    locale: 'zh',
    messages: {
      comment: {
        timeAgo: {
          justNow: '刚刚',
          minutesAgo: '分钟前',
          hoursAgo: '小时前',
          daysAgo: '天前'
        },
        reply: '回复',
        liking: '点赞中',
        share: '分享'
      }
    }
  })
}))

describe('CommentItem 组件', () => {
  const mockOnLike = vi.fn()
  const mockOnReply = vi.fn()
  const mockOnEdit = vi.fn()
  const mockOnDelete = vi.fn()

  const defaultProps: CommentItemProps = {
    comment: {
      id: 'comment-1',
      author: {
        id: 'user-1',
        did: 'did:key:123',
        name: 'Alice',
        avatar: 'https://example.com/avatar.png'
      },
      content: '这是一条测试评论',
      createdAt: new Date().toISOString(),
      likes: 10,
      isLiked: false,
      isAuthor: false
    },
    onLike: mockOnLike,
    onReply: mockOnReply,
    onEdit: mockOnEdit,
    onDelete: mockOnDelete
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('正确渲染评论内容和作者信息', () => {
    render(<CommentItem {...defaultProps} />)
    
    // 检查作者名称
    expect(screen.getByText('Alice')).toBeInTheDocument()
    // 检查是否显示刚刚（因为时间是 new Date()）
    expect(screen.getByText('刚刚')).toBeInTheDocument()
    // 检查内容
    expect(screen.getByText('这是一条测试评论')).toBeInTheDocument()
    // 检查点赞数量
    expect(screen.getByText('10')).toBeInTheDocument()
  })

  it('点击回复按钮时调用 onReply 方法', () => {
    render(<CommentItem {...defaultProps} />)
    
    // 找到回复按钮
    const replyButton = screen.getByText('回复')
    fireEvent.click(replyButton)
    
    // 验证 onReply 被正确调用：参数应为 (comment.id, comment.content)
    expect(mockOnReply).toHaveBeenCalledWith('comment-1', '这是一条测试评论')
  })

  it('点击点赞按钮时调用 onLike 方法', () => {
    render(<CommentItem {...defaultProps} />)
    
    // 点赞按钮包含图标，可以通过 role 或文本查找（如果没有明确文本可能需要更好的 query）
    // 当前组件渲染：<button className="comment-footer-button"><FaRegHeart/><span>10</span></button>
    // 以及未点赞状态，所以可以用 getByRole
    const buttons = screen.getAllByRole('button')
    // 按钮布局为：回复、点赞、分享，所以第二个按钮是点赞
    const likeButton = buttons[1]
    
    fireEvent.click(likeButton)
    expect(mockOnLike).toHaveBeenCalledWith('comment-1')
  })

  it('已点赞状态下不会再次触发 onLike', () => {
    const likedProps = {
      ...defaultProps,
      comment: {
        ...defaultProps.comment,
        isLiked: true
      }
    }
    
    render(<CommentItem {...likedProps} />)
    
    const buttons = screen.getAllByRole('button')
    const likeButton = buttons[1]
    
    expect(likeButton).toBeDisabled()
    fireEvent.click(likeButton)
    expect(mockOnLike).not.toHaveBeenCalled()
  })
})
