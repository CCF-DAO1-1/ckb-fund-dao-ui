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
  mode?: "wysiwyg" | "sv" | "ir"; // 编辑器模式：所见即所得、分屏预览、即时渲染（默认使用 IR 模式，符合 bbs-fe 风格）
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
  mode = "ir", // 默认使用 IR 模式（即时渲染），符合 bbs-fe 项目风格
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

  // 图片压缩函数（优化版：智能压缩策略）
  const compressImage = useCallback(
    async (file: File, maxWidth = 1920, maxHeight = 1080, quality = 0.85): Promise<File> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            let width = img.width;
            let height = img.height;

            // 计算新尺寸（保持宽高比）
            if (width > maxWidth || height > maxHeight) {
              const ratio = Math.min(maxWidth / width, maxHeight / height);
              width = width * ratio;
              height = height * ratio;
            }

            // 确保尺寸为整数
            width = Math.round(width);
            height = Math.round(height);

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext("2d");
            if (!ctx) {
              reject(new Error("Failed to get canvas context"));
              return;
            }

            // 使用更好的图片渲染质量
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
            ctx.drawImage(img, 0, 0, width, height);

            // 根据文件类型选择输出格式
            let outputType = file.type;
            if (!outputType || outputType === "image/jpeg") {
              outputType = "image/jpeg";
            } else if (outputType === "image/png") {
              outputType = "image/png";
            } else if (outputType === "image/webp") {
              outputType = "image/webp";
            }

            // 动态调整质量，如果压缩后仍然很大，降低质量
            const maxSize = 2 * 1024 * 1024; // 2MB 目标大小

            const tryCompress = (q: number) => {
              canvas.toBlob(
                (blob) => {
                  if (!blob) {
                    reject(new Error("Failed to compress image"));
                    return;
                  }
                  
                  // 如果文件仍然太大且质量可以继续降低，递归压缩
                  if (blob.size > maxSize && q > 0.5) {
                    tryCompress(q - 0.1);
                  } else {
                    const compressedFile = new File([blob], file.name, {
                      type: outputType,
                      lastModified: Date.now(),
                    });
                    resolve(compressedFile);
                  }
                },
                outputType,
                q
              );
            };

            tryCompress(quality);
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

  // 文件验证函数
  const validateImageFile = useCallback((file: File): { valid: boolean; error?: string } => {
    // 检查文件是否存在
    if (!file) {
      return { valid: false, error: "No file provided" };
    }

    // 检查文件类型
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp", "image/bmp", "image/svg+xml"];
    const validExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg"];
    
    const fileName = file.name.toLowerCase();
    const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));
    const hasValidType = validTypes.includes(file.type) || file.type.startsWith("image/");

    if (!hasValidType && !hasValidExtension) {
      return { 
        valid: false, 
        error: t("editor.invalidFileType") || "Only image files are supported (JPG, PNG, GIF, WEBP, BMP, SVG)" 
      };
    }

    // 检查文件大小 (10MB 原始限制，压缩后 5MB)
    const MAX_ORIGINAL_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_ORIGINAL_SIZE) {
      return { 
        valid: false, 
        error: t("editor.fileTooLargeOriginal") || "File size cannot exceed 10MB. Large images will be automatically compressed." 
      };
    }

    // 检查文件是否为空
    if (file.size === 0) {
      return { valid: false, error: t("editor.emptyFile") || "File is empty" };
    }

    return { valid: true };
  }, [t]);

  // 单张图片上传处理函数（增强版：支持重试和更好的错误处理）
  const uploadSingleImage = useCallback(
    async (file: File, retryCount = 0): Promise<string> => {
      if (!did) {
        toast.error(t("errors.userNotLoggedIn") || "Please login first");
        throw new Error("User not logged in");
      }

      // 文件验证
      const validation = validateImageFile(file);
      if (!validation.valid) {
        toast.error(validation.error || t("editor.invalidFile") || "Invalid file");
        throw new Error(validation.error || "Invalid file");
      }

      // 文件大小验证 (5MB 最终限制)
      const MAX_FILE_SIZE = 5 * 1024 * 1024;
      let fileToUpload = file;

      // 如果文件较大，尝试压缩（超过 1MB 或接近限制时）
      if (file.size > 1024 * 1024 || file.size > MAX_FILE_SIZE * 0.8) {
        try {
          fileToUpload = await compressImage(file);
          // 压缩后仍然过大
          if (fileToUpload.size > MAX_FILE_SIZE) {
            toast.error(t("editor.fileTooLarge") || "File size cannot exceed 5MB after compression");
            throw new Error("File size cannot exceed 5MB after compression");
          }
        } catch (error) {
          // 压缩失败，检查原始文件大小
          if (file.size > MAX_FILE_SIZE) {
            toast.error(t("editor.fileTooLarge") || "File size cannot exceed 5MB");
            throw new Error("File size cannot exceed 5MB");
          }
          // 如果压缩失败但文件不大，继续使用原文件
          console.warn("Image compression failed, using original file:", error);
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

        // 如果是网络错误且重试次数未达上限，尝试重试
        const MAX_RETRIES = 2;
        if (
          retryCount < MAX_RETRIES &&
          (errorMessage.includes("network") || 
           errorMessage.includes("timeout") ||
           errorMessage.includes("fetch"))
        ) {
          console.log(`Retrying upload (${retryCount + 1}/${MAX_RETRIES})...`);
          // 等待一段时间后重试
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
          return uploadSingleImage(file, retryCount + 1);
        }

        // 根据错误类型显示不同的提示
        if (errorMessage.includes("File size exceeds") || errorMessage.includes("File size cannot exceed")) {
          toast.error(t("editor.fileTooLarge") || "File size cannot exceed 5MB");
        } else if (errorMessage.includes("Only image files") || errorMessage.includes("Only image files are supported")) {
          toast.error(t("editor.invalidFileType") || "Only image files are supported");
        } else if (errorMessage.includes("User DID is required") || errorMessage.includes("Please login") || errorMessage.includes("User not logged in")) {
          toast.error(t("errors.userNotLoggedIn") || "Please login first");
        } else if (errorMessage.includes("Session expired") || errorMessage.includes("Token has expired")) {
          toast.error(t("errors.sessionExpired") || "Session expired, please login again");
        } else {
          toast.error(errorMessage);
        }
        throw error;
      }
    },
    [did, t, compressImage, validateImageFile]
  );

  // 图片上传处理函数（支持多文件，增强版：更好的进度显示和错误处理）
  const handleImageUpload = useCallback(
    async (files: File[]): Promise<string> => {
      if (!files || files.length === 0) {
        throw new Error("No files provided");
      }

      // 限制同时上传的文件数量（防止过多并发请求）
      const MAX_CONCURRENT_UPLOADS = 3;
      const results: string[] = [];
      let successCount = 0;
      let failCount = 0;
      let currentIndex = 0;

      // 单文件上传
      if (files.length === 1) {
        const fileName = files[0].name;
        const loadingToast = toast.loading(
          `${t("editor.uploading") || "Uploading..."} ${fileName}...`
        );
        try {
          const imageUrl = await uploadSingleImage(files[0]);
          toast.success(
            `${t("editor.uploadSuccess") || "Upload success"}: ${fileName}`,
            { id: loadingToast }
          );
          return `![${fileName}](${imageUrl})`;
        } catch (error) {
          toast.error(
            `${t("editor.uploadFailed") || "Upload failed"}: ${fileName}`,
            { id: loadingToast }
          );
          throw error;
        }
      }

      // 多文件上传，批量处理（限制并发）
      const loadingToast = toast.loading(
        `${t("editor.uploading") || "Uploading..."} (0/${files.length})`
      );

      try {
        // 并发上传，但限制并发数
        const uploadPromises: Promise<void>[] = [];
        
        for (let i = 0; i < Math.min(MAX_CONCURRENT_UPLOADS, files.length); i++) {
          uploadPromises.push(processNextFile());
        }

        await Promise.all(uploadPromises);

        // 显示最终结果
        if (successCount > 0 && failCount === 0) {
          toast.success(
            `${t("editor.uploadSuccess") || "Upload success"}: ${successCount} ${files.length > 1 ? t("editor.files") || "files" : t("editor.file") || "file"}`,
            { id: loadingToast }
          );
        } else if (successCount > 0 && failCount > 0) {
          toast.success(
            `${t("editor.uploadSuccess") || "Upload success"}: ${successCount} ${t("editor.files") || "files"}, ${t("editor.uploadFailed") || "Failed"}: ${failCount}`,
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

      // 处理下一个文件的辅助函数
      async function processNextFile(): Promise<void> {
        while (currentIndex < files.length) {
          const index = currentIndex++;
          const file = files[index];
          
          try {
            // 更新进度
            toast.loading(
              `${t("editor.uploading") || "Uploading..."} (${index + 1}/${files.length}): ${file.name}`,
              { id: loadingToast }
            );

            const imageUrl = await uploadSingleImage(file);
            results.push(`![${file.name}](${imageUrl})`);
            successCount++;
          } catch (error) {
            failCount++;
            console.error(`上传文件 ${file.name} 失败:`, error);
          }

          // 如果还有文件，继续处理
          if (currentIndex < files.length) {
            await processNextFile();
          }
        }
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
    // 参考 bbs-fe 项目的工具栏配置，提供更完整的编辑功能
    const toolbarConfig: string[] = [];
    if (toolbarPreset === "full") {
      if (mode === "wysiwyg") {
        // WYSIWYG 模式下的工具栏（所见即所得模式）
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
          "|",
          "quote",
          "code",
          "|",
          "upload",
          "|",
          "undo",
          "redo",
          "|",
          "fullscreen",
          "preview",
          "outline"
        );
      } else if (mode === "ir") {
        // IR 模式下的工具栏（即时渲染模式）
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
          "code",
          "inline-code",
          "|",
          "upload",
          "link-to-img",
          "|",
          "table",
          "|",
          "undo",
          "redo",
          "|",
          "fullscreen",
          "preview",
          "outline"
        );
      } else {
        // SV 模式下的工具栏（分屏预览模式）
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
          "code",
          "inline-code",
          "|",
          "upload",
          "link-to-img",
          "|",
          "table",
          "|",
          "undo",
          "redo",
          "|",
          "both",
          "preview",
          "fullscreen",
          "outline"
        );
      }
    } else if (toolbarPreset === "simple") {
      // 简化工具栏
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
    // 参考 bbs-fe 项目的配置，优化编辑器体验
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vditorConfig: any = {
      value: value || "",
      placeholder: placeholder || "Enter text...",
      height: typeof height === "number" ? height : parseInt(height) || 200,
      mode,
      minHeight: 200, // 最小高度
      maxHeight: 800, // 最大高度（超过后出现滚动条）
      cache: {
        id: editorIdRef.current,
        enable: true,
      },
      // 编辑器选项
      options: {
        // 启用快捷键
        hint: {
          emoji: {
            "+1": "👍",
            "-1": "👎",
            "confused": "😕",
            "eyes": "👀",
            "heart": "❤️",
            "hooray": "🎉",
            "laugh": "😄",
            "rocket": "🚀",
          },
        },
        // 确保图片能够正确渲染
        preview: {
          markdown: {
            imageIsImage: true, // 将图片链接识别为图片
          },
          // 优化预览配置，避免不必要的网络请求
          delay: 1000, // 延迟预览，避免频繁请求
          maxWidth: 800,
          // 禁用自动加载，避免 XHR 请求
          parse: false,
        },
      },
      upload: {
        accept: "image/*",
        url: "", // 不使用默认上传，使用自定义处理
        linkToImgUrl: "", // 不使用默认链接转图片
        handler: async (files: File[]) => {
          try {
            // 支持多文件上传
            const markdown = await handleImageUpload(files);
            
            // Vditor 的 handler 返回的字符串会被自动插入到编辑器中
            // 在 IR 模式下，Markdown 图片语法应该自动渲染为图片
            // 返回格式：每张图片之间用两个换行符分隔，确保正确渲染
            if (markdown) {
              // 确保返回的 Markdown 格式正确，Vditor 会自动渲染
              // 添加换行符确保图片独立成行
              return "\n\n" + markdown + "\n\n";
            }
            
            return "";
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
                  if (markdown && vditorRef.current) {
                    // 使用 Vditor 的 insertValue 方法插入图片（如果可用）
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const vditorInstance = vditorRef.current as any;
                    if (typeof vditorInstance.insertValue === 'function') {
                      // 使用 insertValue 在光标位置插入，会自动渲染
                      vditorInstance.insertValue("\n\n" + markdown + "\n\n");
                      const newValue = vditorInstance.getValue();
                      onChange(newValue);
                    } else {
                      // 如果没有 insertValue，使用 setValue
                      const currentValue = vditorRef.current.getValue() || "";
                      const newValue = currentValue ? currentValue + "\n\n" + markdown + "\n\n" : markdown + "\n\n";
                      vditorRef.current.setValue(newValue);
                      onChange(newValue);
                    }
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
                  if (markdown && vditorRef.current) {
                    // 使用 Vditor 的 insertValue 方法插入图片（如果可用）
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const vditorInstance = vditorRef.current as any;
                    if (typeof vditorInstance.insertValue === 'function') {
                      // 使用 insertValue 在光标位置插入，会自动渲染
                      vditorInstance.insertValue("\n\n" + markdown + "\n\n");
                      const newValue = vditorInstance.getValue();
                      onChange(newValue);
                    } else {
                      // 如果没有 insertValue，使用 setValue
                      const currentValue = vditorRef.current.getValue() || "";
                      const newValue = currentValue ? currentValue + "\n\n" + markdown + "\n\n" : markdown + "\n\n";
                      vditorRef.current.setValue(newValue);
                      onChange(newValue);
                    }
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
        // 标记为用户输入，避免在同步 value 时导致失焦
        isUserInputRef.current = true;
        // 使用 requestAnimationFrame 延迟 onChange 调用，避免立即触发外部状态更新导致失焦
        requestAnimationFrame(() => {
          onChange(newValue);
          // 在下一个帧重置标志，给外部状态更新足够的时间
          requestAnimationFrame(() => {
            isUserInputRef.current = false;
          });
        });
      },
      focus: () => {
        // 聚焦时的处理
      },
      blur: () => {
        // 失焦时的处理
      },
    };

    // 设置工具栏配置
    // 在 wysiwyg 模式下，使用 customWysiwygToolbar
    // 在其他模式下，使用 toolbar
    if (mode === "wysiwyg") {
      // WYSIWYG 模式下，设置 customWysiwygToolbar
      // 如果工具栏配置不为空，使用配置的工具栏
      if (toolbarConfig && toolbarConfig.length > 0) {
        vditorConfig.customWysiwygToolbar = toolbarConfig;
      } else {
        // 如果没有配置，使用默认工具栏
        vditorConfig.customWysiwygToolbar = () => [];
      }
    } else if (toolbarConfig && toolbarConfig.length > 0) {
      // SV 或 IR 模式下，使用 toolbar
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
  // 使用 ref 跟踪是否正在用户输入，避免在用户输入时更新导致失焦
  const isUserInputRef = useRef(false);
  
  useEffect(() => {
    if (vditorRef.current && value !== undefined) {
      try {
        // 检查 Vditor 实例是否完全初始化
        // 确保 vditorRef.current 存在且有必要的属性
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const vditorInstance = vditorRef.current as any;
        
        // 检查 Vditor 实例是否完全初始化（检查内部属性）
        if (
          vditorInstance &&
          typeof vditorInstance.getValue === 'function' &&
          vditorInstance.vditor &&
          vditorInstance.vditor.currentMode !== undefined
        ) {
          const currentValue = vditorInstance.getValue();
          // 只有当值真正不同且不是用户输入时才更新
          // 使用更严格的比较，避免字符串格式差异导致的误判
          const normalizedCurrent = currentValue?.trim() || "";
          const normalizedValue = value?.trim() || "";
          if (normalizedCurrent !== normalizedValue && !isUserInputRef.current) {
            // 保存当前焦点状态和光标位置
            const editorElement = containerRef.current?.querySelector('.vditor-ir__editor, .vditor-wysiwyg__editor, .vditor-sv__editor') as HTMLElement;
            const hadFocus = document.activeElement === editorElement || editorElement?.contains(document.activeElement);
            
            // 使用 requestAnimationFrame 确保在下一个渲染周期更新，避免失焦
            requestAnimationFrame(() => {
              if (vditorInstance && typeof vditorInstance.setValue === 'function') {
                vditorInstance.setValue(value);
                
                // 如果之前有焦点，恢复焦点
                if (hadFocus && editorElement) {
                  requestAnimationFrame(() => {
                    if (editorElement && document.contains(editorElement)) {
                      editorElement.focus();
                      // 尝试恢复光标位置
                      const selection = window.getSelection();
                      if (selection && selection.rangeCount > 0) {
                        const range = selection.getRangeAt(0);
                        if (editorElement.contains(range.commonAncestorContainer)) {
                          selection.removeAllRanges();
                          selection.addRange(range);
                        }
                      }
                    }
                  });
                }
              }
            });
          }
          // 重置用户输入标志
          isUserInputRef.current = false;
        }
      } catch (error) {
        // 如果 Vditor 实例还未完全初始化，静默忽略错误
        // 避免在组件卸载或实例未完全初始化时输出错误
        if (process.env.NODE_ENV === 'development') {
          console.warn('Vditor instance not ready yet:', error);
        }
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

