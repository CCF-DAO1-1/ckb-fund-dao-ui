import { NextRequest, NextResponse } from "next/server";
import { NotionAPI } from "notion-client";

import { logger } from '@/lib/logger';
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const rawId = req.nextUrl.searchParams.get("pageId");
  logger.log("/api/notion pageId:", { pageId: rawId || 'undefined' });
  if (!rawId) {
    return NextResponse.json({ error: "pageId required" }, { status: 400 });
  }
  try {
    const token = process.env.NOTION_TOKEN || process.env.NOTION_TOKEN_V2 || "";
    const kyDefaults = { timeout: 12000, retry: 0 } as const;
    const api = new NotionAPI(token ? { authToken: token } : {});
    const pageId = (await import("notion-utils")).idToUuid(rawId);

    const maxRetries = 3;
    let lastErr: unknown = null;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const recordMap = await api.getPage(pageId, {
          fetchMissingBlocks: true,
          fetchCollections: false,
          fetchRelationPages: false,
          signFileUrls: false,
        });
        logger.log("recordMap fetched successfully");
        if (recordMap && recordMap.block && Object.keys(recordMap.block).length > 0) {
          return NextResponse.json(
            { recordMap },
            { headers: { "Cache-Control": "no-store" } }
          );
        }
        lastErr = new Error("empty recordMap");
      } catch (e) {
        lastErr = e;
        logger.error("Notion API fetch error", e);
      }
      const backoff = 500 * Math.pow(2, attempt); // 500ms, 1000ms, 2000ms
      await new Promise((r) => setTimeout(r, backoff));
    }

    const message = lastErr instanceof Error ? lastErr.message : "notion error";
    logger.error("Notion API error after retries:", { error: message });
    return NextResponse.json(
      { error: message },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "notion error";
    logger.error("Notion API error:", err);
    return NextResponse.json(
      { error: message },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}


