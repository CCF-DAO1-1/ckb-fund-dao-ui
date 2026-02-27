/**
 * 评论相关API接口定义
 */
import defineAPI from "./defineAPI";

// 评论作者类型（实际API返回）
export interface CommentAuthor {
  $type: string;
  created: string;
  did: string;
  displayName?: string;
  handle?: string;
  avatar?: string;
}

// 评论项类型（实际API返回）
export interface CommentItem {
  uri: string;
  cid: string;
  author: CommentAuthor;
  text: string; // 评论内容（HTML格式）
  proposal: string; // 评论的提案uri
  to?: { // 被回复人的信息（如果是回复）
    did: string; // 回复对象的DID
    displayName?: string; // 被回复人的显示名称
    handle?: string; // 被回复人的handle
    avatar?: string; // 被回复人的头像
  };
  parent_uri?: string; // 父评论的uri（如果是回复）
  like_count: string; // 点赞数（字符串格式）
  liked: boolean; // 当前用户是否已点赞
  reply_count?: string; // 回复数量
  created: string;
  updated?: string;
}

// 获取评论列表的参数类型
export interface GetCommentListParams {
  cursor?: string | null; // 分页游标（通常是最后一项的时间戳）
  limit?: number; // 每页数量，默认2
  proposal?: string; // 按提案 uri 过滤
  to?: string | null; // 按回复对象过滤（DID）
  viewer?: string | null; // 查看者的 DID，用于判断是否已点赞
}

// 评论列表响应类型（request.ts 会自动提取 data 字段）
export interface CommentListResponse {
  replies: CommentItem[];
  cursor: string | null; // 下一页的游标，null表示没有更多数据
}

/**
 * 获取评论列表
 * POST /api/reply/list
 * 
 * 参考文档: https://app.ccfdao.org/apidoc#tag/reply/post/api/reply/list
 */
export const getCommentList = defineAPI<
  GetCommentListParams,
  CommentListResponse
>(
  "/reply/list",
  "POST",
  {
    divider: {
      body: ["cursor", "limit", "proposal", "to", "viewer"],
    },
  }
);

