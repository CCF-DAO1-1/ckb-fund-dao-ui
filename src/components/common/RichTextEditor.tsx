"use client";

import React, { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { useImageUpload } from "@/hooks/useImageUpload";
import "react-quill-new/dist/quill.snow.css";
import "@/styles/quill-editor.css";

// 动态导入ReactQuill，禁用SSR
const ReactQuill = dynamic(() => import("react-quill-new"), {
  ssr: false,
  loading: () => (
    <div
      className="rich-text-editor-loading"
      style={{
        height: "200px",
        marginBottom: "10px",
        border: "1px solid #4C525C",
        borderRadius: "6px",
        backgroundColor: "#262A33",
        padding: "12px",
        color: "#6b7280",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* 加载文本会在组件内部设置 */}
    </div>
  ),
});

export type ToolbarPreset = "simple" | "full" | "custom";

// Quill 工具栏配置类型
interface QuillToolbarConfig {
  container?: string[] | Array<string | Record<string, unknown>> | Array<Array<string | Record<string, unknown>>>;
  handlers?: Record<string, () => void>;
}

export interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: string | number;
  did?: string; // 用于图片上传
  toolbarPreset?: ToolbarPreset;
  customToolbar?: QuillToolbarConfig; // 自定义工具栏配置
  customFormats?: string[]; // 自定义格式
  loadingText?: string; // 加载状态文本
  className?: string;
  style?: React.CSSProperties;
}

// 默认工具栏配置
const defaultToolbars: Record<"simple" | "full", Array<string[] | Array<Record<string, unknown> | string>>> = {
  simple: [
    [{ header: [1, 2, false] }],
    ["bold", "italic", "underline"],
    ["blockquote", "code-block"],
    ["image"],
  ],
  full: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["blockquote", "code-block"],
    ["link", "image"],
    [{ color: [] }, { background: [] }],
    ["clean"],
  ],
};

// 默认格式配置
const defaultFormats: Record<"simple" | "full", string[]> = {
  simple: [
    "header",
    "bold",
    "italic",
    "underline",
    "blockquote",
    "image",
    "code-block",
  ],
  full: [
    "header",
    "bold",
    "italic",
    "underline",
    "strike",
    "list",
    "blockquote",
    "code-block",
    "link",
    "image",
    "color",
    "background",
  ],
};

export default function RichTextEditor({
  value,
  onChange,
  placeholder,
  height = "200px",
  did,
  toolbarPreset = "full",
  customToolbar,
  customFormats,
  loadingText,
  className = "",
  style,
}: RichTextEditorProps) {
  const [isClient, setIsClient] = useState(false);

  // 检查是否在客户端
  useEffect(() => {
    setIsClient(true);
  }, []);

  // 图片上传 handler
  const imageHandler = useImageUpload(did);

  // 根据预设或自定义配置生成工具栏
  const quillModules = useMemo(() => {
    let toolbarConfig: QuillToolbarConfig;

    if (customToolbar) {
      // 使用自定义工具栏
      toolbarConfig = customToolbar;
    } else {
      // 使用预设工具栏
      // 确保 toolbarPreset 不是 "custom"，因为 custom 需要使用 customToolbar
      const preset = toolbarPreset === "custom" ? "full" : toolbarPreset;
      const toolbarItems = defaultToolbars[preset] || defaultToolbars.full;
      toolbarConfig = {
        container: toolbarItems,
        handlers: {
          image: imageHandler,
        },
      };
    }

    return {
      toolbar: toolbarConfig,
    };
  }, [toolbarPreset, customToolbar, imageHandler]);

  // 根据预设或自定义配置生成格式
  const quillFormats = useMemo(() => {
    if (customFormats) {
      return customFormats;
    }
    // 确保 toolbarPreset 不是 "custom"，因为 custom 需要使用 customFormats
    const preset = toolbarPreset === "custom" ? "full" : toolbarPreset;
    return defaultFormats[preset] || defaultFormats.full;
  }, [toolbarPreset, customFormats]);

  // 合并样式
  const editorStyle = useMemo(() => {
    return {
      height: typeof height === "number" ? `${height}px` : height,
      ...style,
    };
  }, [height, style]);

  if (!isClient) {
    return (
      <div
        className={`rich-text-editor-loading ${className}`}
        style={{
          height: typeof height === "number" ? `${height}px` : height,
          marginBottom: "10px",
          border: "1px solid #4C525C",
          borderRadius: "6px",
          backgroundColor: "#262A33",
          padding: "12px",
          color: "#6b7280",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          ...style,
        }}
      >
        {loadingText || "加载中..."}
      </div>
    );
  }

  return (
    <div className={`editor-container ${className}`}>
      <div className="quill-wrapper">
        <ReactQuill
          theme="snow"
          value={value}
          onChange={onChange}
          modules={quillModules}
          formats={quillFormats}
          placeholder={placeholder}
          style={editorStyle}
        />
      </div>
    </div>
  );
}

