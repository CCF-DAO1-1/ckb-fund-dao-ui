import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import getPDSClient from "@/lib/pdsClient";

import { logger } from '@/lib/logger';
export const dynamic = "force-dynamic";
export const revalidate = 0;

const SERVER = process.env.NEXT_PUBLIC_API_ADDRESS || "";

/**
 * 获取当前用户的任务列表
 * GET /api/task
 * Query Parameters:
 *   - did: string (required) - 用户 DID
 *   - page: integer (min: 0) - 页码
 *   - per_page: integer (min: 0) - 每页数量
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const did = searchParams.get("did");
    const pageParam = searchParams.get("page");
    const perPageParam = searchParams.get("per_page");

    // 验证必需参数
    if (!did) {
      return NextResponse.json(
        { error: "did parameter is required" },
        { status: 400 }
      );
    }

    // 解析并验证 page 参数
    let page = 0;
    if (pageParam !== null) {
      const parsedPage = parseInt(pageParam, 10);
      if (isNaN(parsedPage) || parsedPage < 0) {
        return NextResponse.json(
          { error: "page must be a non-negative integer" },
          { status: 400 }
        );
      }
      page = parsedPage;
    }

    // 解析并验证 per_page 参数
    let perPage = 0;
    if (perPageParam !== null) {
      const parsedPerPage = parseInt(perPageParam, 10);
      if (isNaN(parsedPerPage) || parsedPerPage < 0) {
        return NextResponse.json(
          { error: "per_page must be a non-negative integer" },
          { status: 400 }
        );
      }
      perPage = parsedPerPage;
    }

    // 获取认证 token（从请求头或 session 中）
    let token: string | undefined;
    const authHeader = req.headers.get("authorization");
    if (authHeader) {
      token = authHeader;
    } else {
      try {
        const pdsClient = getPDSClient();
        token = pdsClient.session?.accessJwt;
        if (token) {
          token = `Bearer ${token}`;
        }
      } catch (error) {
        // 如果无法获取 token，继续执行（后端 API 可能会处理未认证的请求）
        logger.warn("Could not get token from session");
      }
    }

    // 构建查询参数
    const queryParams = new URLSearchParams({
      did,
      page: page.toString(),
      per_page: perPage.toString(),
    });

    // 调用后端 API
    const apiUrl = `${SERVER}/api/task?${queryParams.toString()}`;
    
    const response = await axios.get(apiUrl, {
      headers: {
        ...(token ? { Authorization: token } : {}),
      },
    });

    return NextResponse.json(response.data, {
      status: response.status,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    logger.error("Error fetching task list:");
    
    if (axios.isAxiosError(error)) {
      const status = error.response?.status || 500;
      const errorMessage = error.response?.data?.message || error.message || "Failed to fetch task list";
      
      return NextResponse.json(
        { error: errorMessage },
        { status }
      );
    }

    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
