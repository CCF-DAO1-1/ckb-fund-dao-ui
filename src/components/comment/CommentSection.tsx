"use client";

import React from "react";
import { useI18n } from "@/contexts/I18nContext";

import "./comment.css";
import "./quill-editor.css";
import CommentItem from "./CommentItem";
import CommentQuote from "./CommentQuote";
import { CommentSectionProps } from "@/types/comment";

export default function CommentSection({
  comments = [],
  onAddComment,
  onLikeComment,
  onReplyComment,
  onEditComment,
  onDeleteComment,
  loading = false,
  error,
  quotedText = ""
}: CommentSectionProps) {
  const { messages } = useI18n();
  console.log('CommentSection rendered with quotedText:', quotedText);
  const handleAddComment = (content: string, parentId?: string) => {
    onAddComment(content, parentId);
  };

  const handleLikeComment = async (commentId: string) => {
    await onLikeComment(commentId);
  };

  const handleReplyComment = (commentId: string, content: string) => {
    onReplyComment(commentId, content);
  };

  const handleEditComment = (commentId: string, content: string) => {
    onEditComment(commentId, content);
  };

  const handleDeleteComment = (commentId: string) => {
    onDeleteComment(commentId);
  };

  return (
    <div className="comment-section">
      <div className="comment-header">
        <h3 className="comment-title">
          {loading ? messages.comment.loading : error ? `${messages.comment.loadFailed} ${error}` : `${messages.comment.commentsCount}(${comments.length})`}
        </h3>
      </div>
      <div className="comment-content">
        {!loading && !error && comments.length > 0 ? (
          comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              onLike={handleLikeComment}
              onReply={handleReplyComment}
              onEdit={handleEditComment}
              onDelete={handleDeleteComment}
            />
          ))
        ) : !loading && !error && comments.length === 0 ? (
          <div className="no-comments" style={{
            padding: '20px',
            textAlign: 'center',
            color: '#999'
          }}>
            {messages.comment.noComments}
          </div>
        ) : null}
      </div>
      <div className="comment-quote-section">
        <CommentQuote
          onSubmit={handleAddComment}
          placeholder={messages.comment.placeholder}
          quotedText={quotedText}
        />
      </div>
    </div>

  );
}
