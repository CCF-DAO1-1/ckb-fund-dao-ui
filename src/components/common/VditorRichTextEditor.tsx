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

  // 图片压缩函数（可选）
  const compressImage = useCallback(
    async (file: File, maxWidth = 1920, maxHeight = 1080, quality = 0.8): Promise<File> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            let width = img.width;
            let height = img.height;

            // 计算新尺寸
            if (width > maxWidth || height > maxHeight) {
              if (width > height) {
                height = (height * maxWidth) / width;
                width = maxWidth;
              } else {
                width = (width * maxHeight) / height;
                height = maxHeight;
              }
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext("2d");
            if (!ctx) {
              reject(new Error("Failed to get canvas context"));
              return;
            }

            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  reject(new Error("Failed to compress image"));
                  return;
                }
                const compressedFile = new File([blob], file.name, {
                  type: file.type,
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              },
              file.type,
              quality
            );
          };
          img.onerror = () => reject(new Error("Failed to load image"));
          img.src = e.target?.result as string;
        };
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });
    },
    []
  );

  // 单张图片上传处理函数
  const uploadSingleImage = useCallback(
    async (file: File): Promise<string> => {
      if (!did) {
        toast.error(t("errors.userNotLoggedIn") || "Please login first");
        throw new Error("User not logged in");
      }

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
      let fileToUpload = file;

      // 如果文件过大，尝试压缩
      if (file.size > MAX_FILE_SIZE) {
        try {
          fileToUpload = await compressImage(file);
          // 压缩后仍然过大
          if (fileToUpload.size > MAX_FILE_SIZE) {
            toast.error(t("editor.fileTooLarge") || "File size cannot exceed 5MB");
            throw new Error("File size cannot exceed 5MB");
          }
        } catch {
          // 压缩失败，检查原始文件大小
          if (file.size > MAX_FILE_SIZE) {
            toast.error(t("editor.fileTooLarge") || "File size cannot exceed 5MB");
            throw new Error("File size cannot exceed 5MB");
          }
        }
      }

      try {
        const imageUrl = await uploadImage(fileToUpload, did);
        if (!imageUrl) {
          throw new Error("Invalid image URL returned");
        }
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
      }
    },
    [did, t, compressImage]
  );

  // 图片上传处理函数（支持多文件）
  const handleImageUpload = useCallback(
    async (files: File[]): Promise<string> => {
      if (!files || files.length === 0) {
        throw new Error("No files provided");
      }

      // 单文件上传，返回单个图片的 Markdown
      if (files.length === 1) {
        const loadingToast = toast.loading(t("editor.uploading") || "Uploading...");
        try {
          const imageUrl = await uploadSingleImage(files[0]);
          toast.success(t("editor.uploadSuccess") || "Upload success");
          return `![${files[0].name}](${imageUrl})`;
        } finally {
          toast.dismiss(loadingToast);
        }
      }

      // 多文件上传，批量处理
      const loadingToast = toast.loading(
        `${t("editor.uploading") || "Uploading..."} (0/${files.length})`
      );
      const results: string[] = [];
      let successCount = 0;
      let failCount = 0;

      try {
        for (let i = 0; i < files.length; i++) {
          try {
            const imageUrl = await uploadSingleImage(files[i]);
            results.push(`![${files[i].name}](${imageUrl})`);
            successCount++;
            toast.loading(
              `${t("editor.uploading") || "Uploading..."} (${i + 1}/${files.length})`,
              { id: loadingToast }
            );
          } catch (error) {
            failCount++;
            console.error(`上传文件 ${files[i].name} 失败:`, error);
          }
        }

        // 显示结果
        if (successCount > 0 && failCount === 0) {
          toast.success(
            `${t("editor.uploadSuccess") || "Upload success"} (${successCount} ${files.length > 1 ? "files" : "file"})`,
            { id: loadingToast }
          );
        } else if (successCount > 0 && failCount > 0) {
          toast.success(
            `${t("editor.uploadSuccess") || "Upload success"}: ${successCount} ${files.length > 1 ? "files" : "file"}, ${t("editor.uploadFailed") || "Failed"}: ${failCount}`,
            { id: loadingToast }
          );
        } else {
          toast.error(t("editor.uploadError") || "Upload failed", { id: loadingToast });
        }

        // 返回所有成功上传的图片 Markdown，用换行分隔
        return results.join("\n\n");
      } catch (error) {
        toast.dismiss(loadingToast);
        throw error;
      }
    },
    [t, uploadSingleImage]
  );

  // 图片链接转图片处理函数
  const handleLinkToImage = useCallback(
    async (url: string): Promise<string> => {
      if (!url || !url.trim()) {
        throw new Error("Invalid URL");
      }

      // 验证 URL 格式
      try {
        new URL(url);
      } catch {
        throw new Error("Invalid URL format");
      }

      // 检查是否是图片 URL
      const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp"];
      const isImageUrl = imageExtensions.some((ext) => url.toLowerCase().includes(ext));

      if (!isImageUrl) {
        // 如果不是明显的图片 URL，尝试获取图片
        // 这里可以添加更复杂的逻辑，比如通过 API 获取图片
        // 目前直接返回 Markdown 格式
        return `![Image](${url})`;
      }

      return `![Image](${url})`;
    },
    []
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
            // 支持多文件上传
            const markdown = await handleImageUpload(files);
            return markdown;
          } catch (error) {
            console.error("Upload failed:", error);
            return "";
          }
        },
        // 支持多文件选择
        multiple: true,
        // 文件大小限制提示
        max: 5 * 1024 * 1024, // 5MB
      },
      // 图片链接转图片功能
      linkToImg: {
        handler: async (url: string) => {
          try {
            const markdown = await handleLinkToImage(url);
            return markdown;
          } catch (error) {
            console.error("Link to image failed:", error);
            toast.error(t("editor.uploadError") || "Failed to convert link to image");
            return "";
          }
        },
      },
      after: () => {
        // 编辑器初始化完成后的回调
        if (vditorRef.current && value) {
          try {
            // 检查 Vditor 实例是否完全初始化
            if (typeof vditorRef.current.setValue === 'function') {
              vditorRef.current.setValue(value);
            }
          } catch (error) {
            console.warn('Failed to set initial value:', error);
          }
        }

        // 强制设置编辑器背景色和内边距
        if (containerRef.current) {
          const editorElements = containerRef.current.querySelectorAll(
            ".vditor-content__editor, .vditor-wysiwyg__editor, .vditor-ir__editor, .vditor-sv__editor, [contenteditable='true']"
          );
          editorElements.forEach((el) => {
            const htmlEl = el as HTMLElement;
            htmlEl.style.backgroundColor = "#262A33";
            htmlEl.style.color = "#FFFFFF";
            htmlEl.style.paddingLeft = "10px";
            htmlEl.style.paddingRight = "10px";
          });

          // 设置所有可能的容器背景和内边距
          const containers = containerRef.current.querySelectorAll(
            ".vditor-content, .vditor-wysiwyg, .vditor-ir, .vditor-sv, .vditor-body"
          );
          containers.forEach((el) => {
            const htmlEl = el as HTMLElement;
            htmlEl.style.backgroundColor = "#262A33";
            htmlEl.style.paddingLeft = "10px";
            htmlEl.style.paddingRight = "10px";
          });

          // 设置工具栏的内边距
          const toolbars = containerRef.current.querySelectorAll(".vditor-toolbar");
          toolbars.forEach((el) => {
            const htmlEl = el as HTMLElement;
            htmlEl.style.paddingLeft = "10px";
            htmlEl.style.paddingRight = "10px";
          });
        }

        // 添加粘贴图片支持
        if (vditorRef.current && containerRef.current) {
          const editorElement = containerRef.current.querySelector(".vditor-content") as HTMLElement;
          if (editorElement) {
            // 处理粘贴事件
            editorElement.addEventListener("paste", async (e: ClipboardEvent) => {
              const items = e.clipboardData?.items;
              if (!items || !did) return;

              const imageFiles: File[] = [];

              // 遍历剪贴板项
              for (let i = 0; i < items.length; i++) {
                const item = items[i];
                if (item.type.startsWith("image/")) {
                  const file = item.getAsFile();
                  if (file) {
                    imageFiles.push(file);
                  }
                }
              }

              // 如果有图片，阻止默认行为并上传
              if (imageFiles.length > 0) {
                e.preventDefault();
                try {
                  const markdown = await handleImageUpload(imageFiles);
                  if (markdown && vditorRef.current && typeof vditorRef.current.getValue === 'function' && typeof vditorRef.current.setValue === 'function') {
                    const currentValue = vditorRef.current.getValue();
                    vditorRef.current.setValue(currentValue + "\n\n" + markdown);
                  }
                } catch (error) {
                  console.error("粘贴图片上传失败:", error);
                }
              }
            });

            // 处理拖拽上传
            editorElement.addEventListener("dragover", (e: DragEvent) => {
              e.preventDefault();
              e.stopPropagation();
            });

            editorElement.addEventListener("drop", async (e: DragEvent) => {
              e.preventDefault();
              e.stopPropagation();

              const files = Array.from(e.dataTransfer?.files || []);
              const imageFiles = files.filter((file) => file.type.startsWith("image/"));

              if (imageFiles.length > 0 && did) {
                try {
                  const markdown = await handleImageUpload(imageFiles);
                  if (markdown && vditorRef.current && typeof vditorRef.current.getValue === 'function' && typeof vditorRef.current.setValue === 'function') {
                    // 在当前位置插入图片，Vditor 会自动处理插入位置
                    const currentValue = vditorRef.current.getValue();
                    vditorRef.current.setValue(currentValue + "\n\n" + markdown + "\n\n");
                  }
                } catch (error) {
                  console.error("拖拽图片上传失败:", error);
                }
              }
            });
          }
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
        try {
          if (typeof vditorRef.current.destroy === 'function') {
            vditorRef.current.destroy();
          }
        } catch (error) {
          console.warn('Error destroying Vditor instance:', error);
        } finally {
          vditorRef.current = null;
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClient, mode, toolbarPreset, handleImageUpload, handleLinkToImage, did]); // 包含上传处理函数和 did

  // 同步外部 value 变化到编辑器
  useEffect(() => {
    if (vditorRef.current && value !== undefined) {
      try {
        // 检查 Vditor 实例是否完全初始化
        if (typeof vditorRef.current.getValue === 'function') {
          const currentValue = vditorRef.current.getValue();
          if (currentValue !== value) {
            vditorRef.current.setValue(value);
          }
        }
      } catch (error) {
        // 如果 Vditor 实例还未完全初始化，忽略错误
        console.warn('Vditor instance not ready yet:', error);
      }
    }
  }, [value]);

  // 合并样式
  const editorStyle = {
    height: typeof height === "number" ? `${height}px` : height,
    backgroundColor: "#262A33", // 确保容器有背景色
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

