"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "../../../utils/i18n";
import "react-tooltip/dist/react-tooltip.css";
// 路由式导航（Notion 渲染后不再需要页面内 query 控制）
import dynamic from "next/dynamic";
import "katex/dist/katex.min.css";
import "prismjs/themes/prism.css";
import "react-notion-x/src/styles.css";
import type { ExtendedRecordMap } from "notion-types";


import { logger } from '@/lib/logger';
const NotionRenderer = dynamic(
  () => import("react-notion-x").then((m) => m.NotionRenderer),
  { ssr: false }
);
//

export default function Rule() {
  useTranslation();

  const containerRef = useRef<HTMLDivElement | null>(null);

  const notionPageId = "23924205dae080ed9290e95519c57ab1";
  const [recordMap, setRecordMap] = useState<ExtendedRecordMap | null>(null);
  const [toc, setToc] = useState<Array<{ id: string; text: string; indentLevel: number }>>([]);
  const [activeTocId, setActiveTocId] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/notion?pageId=${notionPageId}`, { cache: "no-store" });
        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          const msg = errJson?.error || `request failed: ${res.status}`;
          setError(msg);
          logger.error("/api/notion error:", msg);
          return;
        }
        const json = await res.json();
        const map = json.recordMap as ExtendedRecordMap | undefined;
        if (!map) {
          setError("recordMap is empty");
          logger.error("recordMap is empty");
          return;
        }
        setRecordMap(map);
        logger.log("recordMap loaded");
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        logger.error(msg, e);
      }
    };
    load();
  }, []);
 
  // 基于渲染后的 Notion DOM 生成目录并监听可见性
  useEffect(() => {
    if (!recordMap) return;
    const root = containerRef.current;
    
    if (!root) return;
    const timer = setTimeout(() => {
      const wrapper = root.querySelector('.notion-wrapper') || root;
      const headings = Array.from(wrapper.querySelectorAll<HTMLElement>('h1, h2, h3'));
      const list: Array<{ id: string; text: string; indentLevel: number }> = [];
      headings.forEach((h) => {
        const id = h.getAttribute('id') || h.parentElement?.getAttribute('data-block-id') || '';
        const text = h.textContent?.trim() || '';
        if (!id || !text) return;
        const indentLevel = h.tagName === 'H1' ? 0 : h.tagName === 'H2' ? 1 : 2;
        list.push({ id, text, indentLevel });
      });
      setToc(list);
      logger.log('TOC list generated');
      const targets = list.map((i) => document.getElementById(i.id)).filter(Boolean) as Element[];
      if (!targets.length) return;
      const io = new IntersectionObserver(
        (entries) => {
          const visible = entries
            .filter((e) => e.isIntersecting)
            .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
          if (visible[0]) setActiveTocId(visible[0].target.id);
        },
        { rootMargin: '-120px 0px -70% 0px', threshold: [0, 1] }
      );
      targets.forEach((el) => io.observe(el));
      return () => io.disconnect();
    }, 200);
    return () => clearTimeout(timer);
  }, [recordMap]);

  const scrollToId = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveTocId(id);
  };


  return (
    <div className="container">
      <main>
        1111
        {error ? (
          <div style={{ color: '#f87171', marginBottom: 12 }}>加载失败：{error}</div>
        ) : null}
        <div className="rule_layout" ref={containerRef}>
          <aside className="rule_sidebar">
            <nav>
              <ul>
                {toc.map((item) => (
                  <li key={item.id}>
                    <button
                      className={`rule_nav_item ${activeTocId === item.id ? 'active' : ''}`}
                      style={{ paddingLeft: 12 + item.indentLevel * 12 }}
                      onClick={() => scrollToId(item.id)}
                    >
                      {item.text}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>
          <section className="rule_content">
            {/* Notion 内容渲染 */}
            {recordMap ? (
              <div className="notion-wrapper">
                <NotionRenderer recordMap={recordMap} fullPage={false} darkMode={true} disableHeader={true} />
              </div>
            ) : null}
          </section>
        </div>
      </main>
    </div>
  );
}

// 本地内容渲染已移除，全部采用 Notion 渲染
