"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Vditor from "vditor";
import "vditor/dist/index.css";
import { uploadImage } from "@/server/pds";
import toast from "react-hot-toast";
import { useTranslation } from "@/utils/i18n";
import "@/styles/vditor-editor.css";

export type ToolbarPreset = "simple" | "full" | "custom";

export interface VditorRichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: string | number;
  did?: string; // 用于图片上传
  toolbarPreset?: ToolbarPreset;
  loadingText?: string; // 加载状态文本
  className?: string;
  style?: React.CSSProperties;
  mode?: "wysiwyg" | "sv" | "ir"; // 编辑器模式：所见即所得、分屏预览、即时渲染
}

export default function VditorRichTextEditor({
  value,
  onChange,
  placeholder,
  height = "200px",
  did,
  toolbarPreset = "full",
  loadingText,
  className = "",
  style,
  mode = "wysiwyg",
}: VditorRichTextEditorProps) {
  const [isClient, setIsClient] = useState(false);
  const vditorRef = useRef<Vditor | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const editorIdRef = useRef<string>(`vditor-${Math.random().toString(36).substr(2, 9)}`);
  const { t } = useTranslation();

  // 检查是否在客户端
  useEffect(() => {
    setIsClient(true);
  }, []);

  // 图片上传处理函数
  const handleImageUpload = useCallback(
    async (files: File[]): Promise<string> => {
      if (!did) {
        toast.error(t("errors.userNotLoggedIn") || "Please login first");
        throw new Error("User not logged in");
      }

      const file = files[0];
      if (!file) {
        throw new Error("No file provided");
      }

      // 文件类型验证
      if (!file.type.startsWith("image/")) {
        toast.error(t("editor.invalidFileType") || "Only image files are supported");
        throw new Error("Only image files are supported");
      }

      // 文件大小验证 (5MB)
      const MAX_FILE_SIZE = 5 * 1024 * 1024;
      if (file.size > MAX_FILE_SIZE) {
        toast.error(t("editor.fileTooLarge") || "File size cannot exceed 5MB");
        throw new Error("File size cannot exceed 5MB");
      }

      const loadingToast = toast.loading(t("editor.uploading") || "Uploading...");

      try {
        const imageUrl = await uploadImage(file, did);
        if (!imageUrl) {
          throw new Error("Invalid image URL returned");
        }
        toast.success(t("editor.uploadSuccess") || "Upload success");
        return imageUrl;
      } catch (error) {
        console.error("图片上传错误:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : t("editor.uploadError") || "Upload failed";

        if (errorMessage.includes("File size exceeds") || errorMessage.includes("File size cannot exceed")) {
          toast.error(t("editor.fileTooLarge") || "File size cannot exceed 5MB");
        } else if (errorMessage.includes("Only image files")) {
          toast.error(t("editor.invalidFileType") || "Only image files are supported");
        } else if (errorMessage.includes("User DID is required") || errorMessage.includes("Please login")) {
          toast.error(t("errors.userNotLoggedIn") || "Please login first");
        } else {
          toast.error(errorMessage);
        }
        throw error;
      } finally {
        toast.dismiss(loadingToast);
      }
    },
    [did, t]
  );

  // 初始化 Vditor
  useEffect(() => {
    if (!isClient || !containerRef.current) return;

    // 如果已经初始化，先销毁
    if (vditorRef.current) {
      vditorRef.current.destroy();
      vditorRef.current = null;
    }

    // 工具栏配置
    // 注意：在 wysiwyg 模式下，某些工具栏选项可能不支持
    const toolbarConfig: string[] = [];
    if (toolbarPreset === "full") {
      if (mode === "wysiwyg") {
        // WYSIWYG 模式下的工具栏
        toolbarConfig.push(
          "headings",
          "bold",
          "italic",
          "strike",
          "link",
          "|",
          "list",
          "ordered-list",
          "|",
          "quote",
     
         
         
          "upload",
      
        );
      } else {
        // SV 或 IR 模式下的工具栏 - 移除预览相关按钮
        toolbarConfig.push(
          "headings",
          "bold",
          "italic",
          "strike",
          "link",
          "|",
          "list",
          "ordered-list",
          "check",
          "outdent",
          "indent",
          "|",
          "quote",
          "line",
         
          "|",
         
          "upload",
         
        );
      }
    } else if (toolbarPreset === "simple") {
      toolbarConfig.push(
        "headings",
        "bold",
        "italic",
        "strike",
        "link",
        "|",
        "list",
        "ordered-list",
        "|",
        "quote",
       
        "|",
        "upload",
        "|",
        "fullscreen"
      );
    }

    // 创建 Vditor 配置对象
    // 在 wysiwyg 模式下，不设置 toolbar 以避免 customWysiwygToolbar 错误
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vditorConfig: any = {
      value: value || "",
      placeholder: placeholder || "Enter text...",
      height: typeof height === "number" ? height : parseInt(height) || 200,
      mode,
      cache: {
        id: editorIdRef.current,
        enable: true,
      },
      upload: {
        accept: "image/*",
        url: "", // 不使用默认上传，使用自定义处理
        linkToImgUrl: "", // 不使用默认链接转图片
        handler: async (files: File[]) => {
          try {
            const imageUrl = await handleImageUpload(files);
            // 返回图片 Markdown 格式
            return `![${files[0].name}](${imageUrl})`;
          } catch (error) {
            console.error("Upload failed:", error);
            return "";
          }
        },
      },
      after: () => {
        // 编辑器初始化完成后的回调
        if (vditorRef.current && value) {
          // 设置初始值
          vditorRef.current.setValue(value);
        }
      },
      input: (newValue: string) => {
        // 内容变化时触发
        onChange(newValue);
      },
      focus: () => {
        // 聚焦时的处理
      },
      blur: () => {
        // 失焦时的处理
      },
    };

    // 在 wysiwyg 模式下，设置 customWysiwygToolbar 为函数以避免错误
    // 在其他模式下，使用配置的工具栏
    if (mode === "wysiwyg") {
      // WYSIWYG 模式下，设置 customWysiwygToolbar 为一个返回空数组的函数
      vditorConfig.customWysiwygToolbar = () => [];
    } else if (toolbarConfig && toolbarConfig.length > 0) {
      vditorConfig.toolbar = toolbarConfig;
    }

    // 创建 Vditor 实例
    const vditor = new Vditor(containerRef.current, vditorConfig);

    vditorRef.current = vditor;

    // 清理函数
    return () => {
      if (vditorRef.current) {
        vditorRef.current.destroy();
        vditorRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClient, mode, toolbarPreset]); // 注意：不包含 value、onChange 和 did，避免重复初始化

  // 同步外部 value 变化到编辑器
  useEffect(() => {
    if (vditorRef.current && value !== undefined) {
      const currentValue = vditorRef.current.getValue();
      if (currentValue !== value) {
        vditorRef.current.setValue(value);
      }
    }
  }, [value]);

  // 合并样式
  const editorStyle = {
    height: typeof height === "number" ? `${height}px` : height,
    ...style,
  };

  if (!isClient) {
    return (
      <div
        className={`vditor-editor-loading ${className}`}
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
        }}
      >
        {loadingText || "Loading editor..."}
      </div>
    );
  }

  return (
    <div className={`vditor-editor-container ${className}`} style={editorStyle}>
      <div ref={containerRef} className="vditor-editor-wrapper" />
    </div>
  );
}

