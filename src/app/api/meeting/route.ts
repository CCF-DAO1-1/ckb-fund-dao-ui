import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import getPDSClient from "@/lib/pdsClient";

import { logger } from '@/lib/logger';
export const dynamic = "force-dynamic";
export const revalidate = 0;

const SERVER = process.env.NEXT_PUBLIC_API_ADDRESS || "";

/**
 * 获取所有AMA会议列表
 * GET /api/meeting
 */
export async function GET(req: NextRequest) {
  try {
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

    // 调用后端 API
    const apiUrl = `${SERVER}/api/meeting`;
    
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
    logger.error("Error fetching meeting list:");
    
    if (axios.isAxiosError(error)) {
      const status = error.response?.status || 500;
      const errorMessage = error.response?.data?.message || error.message || "Failed to fetch meeting list";
      
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

