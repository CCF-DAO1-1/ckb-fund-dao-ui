"use client";

import { useState, useEffect, useRef } from "react";
import CommentSection from "@/components/comment/CommentSection";
import { Comment } from "@/types/comment";
import { CommentItem } from "@/server/comment";
import { createPDSRecord } from "@/server/pds";
import useUserInfoStore from "@/store/userInfo";
import { getAvatarByDid } from "@/utils/avatarUtils";
import { ProposalDetailResponse } from "@/server/proposal";
import { getUserDisplayNameFromInfo, getUserDisplayNameFromStore } from "@/utils/userDisplayUtils";
import toast from "react-hot-toast";
import { useTranslation } from "@/utils/i18n";

interface ProposalCommentsProps {
  proposal: ProposalDetailResponse | null;
  apiComments: CommentItem[];
  commentsLoading: boolean;
  commentsError?: string;
  onRefetchComments: () => void;
  quotedText?: string;
  onGetCommentSubmit?: (submitFn: (content: string) => void) => void;
}

// 适配器函数：将API返回的CommentItem转换为组件需要的Comment类型
const adaptCommentItem = (item: CommentItem, currentUserDid?: string): Comment => {
  const displayName = getUserDisplayNameFromInfo({
    displayName: item.author.displayName,
    handle: item.author.handle,
    did: item.author.did,
  });
  
  // 格式化 to 字段的 handle（如果存在）
  const formattedTo = item.to ? {
    did: item.to.did,
    displayName: getUserDisplayNameFromInfo({
      displayName: item.to.displayName,
      handle: item.to.handle,
      did: item.to.did,
    }),
    handle: item.to.handle, // 保留原始 handle，但 displayName 优先
    avatar: item.to.avatar,
  } : undefined;
  
  return {
    id: item.cid,
    content: item.text,
    author: {
      id: item.author.did,
      name: displayName,
      avatar: item.author.avatar || getAvatarByDid(item.author.did),
      did: item.author.did,
    },
    createdAt: item.created,
    likes: parseInt(item.like_count) || 0,
    parentId: item.parent_uri || undefined,
    isLiked: item.liked || false,
    isAuthor: currentUserDid === item.author.did,
    to: formattedTo,
  };
};

export default function ProposalComments({ 
  proposal, 
  apiComments, 
  commentsLoading, 
  commentsError, 
  onRefetchComments: _onRefetchComments,
  quotedText: externalQuotedText = "",
  onGetCommentSubmit
}: ProposalCommentsProps) {
  // 暂时不使用 onRefetchComments，避免发送评论后重新获取
  void _onRefetchComments;
  
  const { t } = useTranslation();
  const { userInfo, userProfile } = useUserInfoStore();
  
  const [comments, setComments] = useState<Comment[]>([]);
  const [quotedText, setQuotedText] = useState(externalQuotedText);
  const [replyToCommentId, setReplyToCommentId] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  // 使用 ref 跟踪已处理的评论 ID，避免重复处理导致刷新
  const processedCommentIdsRef = useRef<Set<string>>(new Set());

  // 当外部传入的 quotedText 变化时，更新内部状态
  useEffect(() => {
    if (externalQuotedText) {
      setQuotedText(externalQuotedText);
    }
  }, [externalQuotedText]);

  // 处理 API 返回的评论数据，转换为平铺的列表结构
  useEffect(() => {
    // 首次加载时，如果 apiComments 为空，清空列表
    if (isInitialLoad) {
      if (!apiComments || apiComments.length === 0) {
        setComments([]);
        setIsInitialLoad(false);
        processedCommentIdsRef.current.clear();
        return;
      }
      setIsInitialLoad(false);
    } else {
      // 非首次加载时，如果 apiComments 为空，保持现有列表（可能是用户刚添加的评论）
      if (!apiComments || apiComments.length === 0) {
        return;
      }
    }

    const adaptedComments = apiComments.map(item => 
      adaptCommentItem(item, userInfo?.did)
    );

    setComments(prevComments => {
      // 创建现有评论的 Map，用于快速查找和保持位置
      const existingCommentMap = new Map(prevComments.map(c => [c.id, c]));
      // 创建新评论的 Map，用于查找新评论
      const newCommentMap = new Map(adaptedComments.map(c => [c.id, c]));
      
      // 1. 更新已存在的评论数据（点赞数、点赞状态等），但保持原有位置
      // 只有当数据真正变化时才更新，避免不必要的重新渲染
      let hasDataChanged = false;
      const updatedExistingComments = prevComments.map(existingComment => {
        const updatedComment = newCommentMap.get(existingComment.id);
        if (updatedComment) {
          // 检查数据是否真的变化了
          const likesChanged = existingComment.likes !== updatedComment.likes;
          const isLikedChanged = existingComment.isLiked !== updatedComment.isLiked;
          
          if (likesChanged || isLikedChanged) {
            hasDataChanged = true;
            // 更新数据但保持原有位置
            return {
              ...existingComment,
              likes: updatedComment.likes,
              isLiked: updatedComment.isLiked,
              // 保留其他可能被用户修改的状态（如临时添加的评论）
            };
          }
        }
        // 数据没有变化，返回原对象（保持引用不变，避免重新渲染）
        return existingComment;
      });
      
      // 2. 找出新评论（不在现有列表中的评论）
      const newComments = adaptedComments.filter(
        newComment => !existingCommentMap.has(newComment.id) && 
                      !processedCommentIdsRef.current.has(newComment.id)
      );
      
      // 3. 如果有新评论或数据变化，才更新状态
      if (newComments.length > 0 || hasDataChanged) {
        // 将新评论 ID 添加到已处理集合
        newComments.forEach(comment => {
          processedCommentIdsRef.current.add(comment.id);
        });
        
        if (newComments.length > 0) {
          // 新评论按时间降序排序（最新的在前）
          const sortedNewComments = newComments.sort((a, b) => {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          });
          // 将新评论添加到开头，保持现有评论的顺序
          return [...sortedNewComments, ...updatedExistingComments];
        }
        
        // 只有数据变化，没有新评论
        return updatedExistingComments;
      }
      
      // 既没有新评论，也没有数据变化，返回原数组（保持引用不变，避免重新渲染）
      return prevComments;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiComments, userInfo?.did]);

  // 评论处理函数
  const handleAddComment = async (content: string, parentId?: string) => {
    if (!proposal?.uri || !userInfo?.did) {
      console.error('缺少必要的参数：proposal.uri 或 userInfo.did');
      return;
    }

    try {
      const record: {
        $type: 'app.dao.reply';
        proposal: string;
        text: string;
        parent?: string;
        to?: string;
      } = {
        $type: 'app.dao.reply',
        proposal: proposal.uri,
        text: content,
      };

      const targetCommentId = replyToCommentId || parentId;
      
      if (targetCommentId) {
        const parentComment = apiComments?.find(c => c.cid === targetCommentId || c.uri === targetCommentId);
        if (parentComment) {
          record.parent = parentComment.uri;
          if (parentComment.author?.did) {
            record.to = parentComment.author.did;
          }
        }
      }

      const result = await createPDSRecord({
        record,
        did: userInfo.did,
      });

      if (result) {
        const displayName = getUserDisplayNameFromStore(userInfo, userProfile);
        
        const newComment: Comment = {
          id: result.cid || `temp-${Date.now()}`,
          content: content,
          author: {
            id: userInfo.did,
            name: displayName,
            avatar: getAvatarByDid(userInfo.did),
            did: userInfo.did,
          },
          createdAt: new Date().toISOString(),
          likes: 0,
          isLiked: false,
          isAuthor: true,
          parentId: record.parent,
          to: targetCommentId ? apiComments?.find(c => c.cid === targetCommentId || c.uri === targetCommentId)?.to : undefined,
        };
        
        // 将新评论添加到已处理集合，避免 refetch 时重复处理
        if (newComment.id) {
          processedCommentIdsRef.current.add(newComment.id);
        }
        
        setComments(prev => [newComment, ...prev]);
        setQuotedText("");
        setReplyToCommentId(null);
        toast.success(t('proposalComments.success') || '评论发布成功');
      }
    } catch (error) {
      console.error('发布评论失败:', error);
      
      // 检查是否是 session 过期错误
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('Session expired') || (error as any)?.isSessionExpired) {
        toast.error(t('proposalComments.errors.sessionExpired') || '登录已过期，请重新登录');
        // 可以在这里触发登出逻辑或跳转到登录页
        return;
      }
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!userInfo?.did) {
      console.error('用户未登录');
      return;
    }

    const targetComment = apiComments?.find(c => c.cid === commentId);
    if (!targetComment) {
      console.error('找不到评论:', commentId);
      return;
    }

    if (targetComment.liked) {
      console.log('已经点赞过该评论');
      return;
    }

    try {
      setComments(comments.map(comment => {
        if (comment.id === commentId) {
          return {
            ...comment,
            likes: comment.likes + 1,
            isLiked: true
          };
        }
        return comment;
      }));

      await createPDSRecord({
        record: {
          $type: 'app.dao.like',
          to: targetComment.uri,
          viewer: userInfo.did,
        },
        did: userInfo.did,
      });
    } catch (error) {
      console.error('评论点赞失败:', error);
      
      setComments(comments.map(comment => {
        if (comment.id === commentId) {
          return {
            ...comment,
            likes: comment.likes - 1,
            isLiked: false
          };
        }
        return comment;
      }));
    }
  };

  // 参考 bbs-fe 的实现：格式化引用内容，包含作者信息
  const handleReplyComment = (commentId: string, content: string) => {
    // 找到被引用的评论，获取作者信息
    const targetComment = apiComments?.find(c => c.cid === commentId || c.uri === commentId);
    const authorName = targetComment?.author?.displayName || targetComment?.author?.handle || '用户';
    
    // 格式化引用内容：参考 bbs-fe 的格式，包含作者信息
    // 如果内容已经是 HTML，提取纯文本；否则直接使用
    const textContent = content.replace(/<[^>]*>/g, '').trim();
    
    // 构建引用格式：作者名 + 内容
    const formattedQuote = `<p><strong>${authorName}</strong> 说：</p>${content}`;
    
    setQuotedText(formattedQuote);
    setReplyToCommentId(commentId);
    window.location.hash = '#comment-section';
    setTimeout(() => {
      const commentSection = document.getElementById('comment-section');
      if (commentSection) {
        commentSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const handleEditComment = (commentId: string, content: string) => {
    setComments(comments.map(comment => {
      if (comment.id === commentId) {
        return {
          ...comment,
          content,
          updatedAt: new Date().toISOString()
        };
      }
      return comment;
    }));
  };

  const handleDeleteComment = (commentId: string) => {
    setComments(comments.filter(comment => comment.id !== commentId));
  };

  // 暴露评论提交函数给父组件
  useEffect(() => {
    if (onGetCommentSubmit) {
      onGetCommentSubmit(handleAddComment);
    }
  }, [onGetCommentSubmit]);

  return (
    <div id="comment-section">
      <CommentSection
        comments={comments}
        onAddComment={handleAddComment}
        onLikeComment={handleLikeComment}
        onReplyComment={handleReplyComment}
        onEditComment={handleEditComment}
        onDeleteComment={handleDeleteComment}
        loading={commentsLoading}
        error={commentsError}
        quotedText={quotedText}
      />
    </div>
  );
}
