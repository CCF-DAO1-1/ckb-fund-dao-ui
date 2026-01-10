import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

import { logger } from '@/lib/logger';
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    // 读取 public 目录下的 chart.csv 文件
    const filePath = join(process.cwd(), "public", "chart.csv");
    const fileContents = await readFile(filePath, "utf-8");
    
    return new NextResponse(fileContents, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    logger.error("Error reading chart.csv:");
    return NextResponse.json(
      { error: "Failed to load chart data" },
      { status: 500 }
    );
  }
}

