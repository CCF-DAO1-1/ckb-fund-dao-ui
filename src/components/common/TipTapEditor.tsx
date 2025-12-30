"use client";

import React, { useEffect, useRef, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TipTapImage from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { uploadImage } from "@/server/pds";
import toast from "react-hot-toast";
import { useTranslation } from "@/utils/i18n";
import {
  MdFormatBold,
  MdFormatItalic,
  MdStrikethroughS,
  MdFormatUnderlined,
  MdCode,
  MdFormatListBulleted,
  MdFormatListNumbered,
  MdFormatQuote,
  MdInsertLink,
  MdImage,
  MdUndo,
  MdRedo,
  MdTitle,
} from "react-icons/md";
import "@/styles/tiptap-editor.css";

export type ToolbarPreset = "simple" | "full" | "custom";

export interface TipTapEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: string | number;
  did?: string; // 用于图片上传
  toolbarPreset?: ToolbarPreset;
  loadingText?: string;
  className?: string;
  style?: React.CSSProperties;
  editable?: boolean;
  mode?: "wysiwyg" | "sv" | "ir"; // 为了兼容 VditorRichTextEditor 的接口，但 TipTap 不支持这些模式
}

// 图片压缩函数
const compressImage = async (
  file: File,
  maxWidth = 1920,
  maxHeight = 1080,
  quality = 0.8
): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const imgElement = document.createElement("img");
      imgElement.onload = () => {
        const canvas = document.createElement("canvas");
        let width = imgElement.width;
        let height = imgElement.height;

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

        ctx.drawImage(imgElement, 0, 0, width, height);

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
      imgElement.onerror = () => reject(new Error("Failed to load image"));
      imgElement.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
};

export default function TipTapEditor({
  value,
  onChange,
  placeholder = "Enter text...",
  height = "200px",
  did,
  toolbarPreset = "full",
  className = "",
  style,
  editable = true,
}: TipTapEditorProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    [did, t]
  );

  // 创建编辑器实例
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // 禁用默认的图片扩展，使用自定义的
        // @ts-expect-error - StarterKit 类型定义可能不完整，但 image 选项确实存在
        image: false,
      }),
      TipTapImage.configure({
        inline: true,
        allowBase64: false,
        HTMLAttributes: {
          class: "tiptap-image",
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "tiptap-link",
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Underline,
    ],
    content: value || "",
    editable,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
    },
    editorProps: {
      attributes: {
        class: "tiptap-editor-content",
      },
    },
  });

  // 图片上传处理函数（支持多文件）
  const handleImageUpload = useCallback(
    async (files: File[]) => {
      if (!files || files.length === 0) {
        throw new Error("No files provided");
      }

      if (!editor) {
        throw new Error("Editor not initialized");
      }

      const loadingToast = toast.loading(
        `${t("editor.uploading") || "Uploading..."} (0/${files.length})`
      );
      let successCount = 0;
      let failCount = 0;

      try {
        for (let i = 0; i < files.length; i++) {
          try {
            const imageUrl = await uploadSingleImage(files[i]);
            // 在编辑器中插入图片
            editor.chain().focus().setImage({ src: imageUrl, alt: files[i].name }).run();
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
      } catch (error) {
        toast.dismiss(loadingToast);
        throw error;
      }
    },
    [t, uploadSingleImage, editor]
  );

  // 设置编辑器的事件处理
  useEffect(() => {
    if (!editor) return;

    const handlePaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
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
        event.preventDefault();
        handleImageUpload(imageFiles);
      }
    };

    const handleDrop = (event: DragEvent) => {
      const files = Array.from(event.dataTransfer?.files || []);
      const imageFiles = files.filter((file) => file.type.startsWith("image/"));

      if (imageFiles.length > 0 && did) {
        event.preventDefault();
        handleImageUpload(imageFiles);
      }
    };

    // 获取编辑器 DOM 元素
    const editorElement = editor.view.dom;
    editorElement.addEventListener("paste", handlePaste);
    editorElement.addEventListener("drop", handleDrop);

    return () => {
      editorElement.removeEventListener("paste", handlePaste);
      editorElement.removeEventListener("drop", handleDrop);
    };
  }, [editor, did, handleImageUpload]);

  // 同步外部 value 变化到编辑器
  useEffect(() => {
    if (editor && value !== undefined) {
      const currentHtml = editor.getHTML();
      if (currentHtml !== value) {
        editor.commands.setContent(value, false);
      }
    }
  }, [value, editor]);

  // 处理文件选择
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) {
        handleImageUpload(files);
      }
      // 重置 input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [handleImageUpload]
  );

  // 工具栏按钮处理函数
  const handleBold = () => editor?.chain().focus().toggleBold().run();
  const handleItalic = () => editor?.chain().focus().toggleItalic().run();
  const handleStrike = () => editor?.chain().focus().toggleStrike().run();
  const handleUnderline = () => editor?.chain().focus().toggleUnderline().run();
  const handleCode = () => editor?.chain().focus().toggleCode().run();
  const handleHeading = (level: 1 | 2 | 3) => () => editor?.chain().focus().toggleHeading({ level }).run();
  const handleBulletList = () => editor?.chain().focus().toggleBulletList().run();
  const handleOrderedList = () => editor?.chain().focus().toggleOrderedList().run();
  const handleBlockquote = () => editor?.chain().focus().toggleBlockquote().run();
  const handleCodeBlock = () => editor?.chain().focus().toggleCodeBlock().run();
  const handleUndo = () => editor?.chain().focus().undo().run();
  const handleRedo = () => editor?.chain().focus().redo().run();
  const handleImage = () => fileInputRef.current?.click();
  const handleLink = () => {
    const url = window.prompt("Enter URL:");
    if (url) {
      editor?.chain().focus().setLink({ href: url }).run();
    }
  };

  if (!editor) {
    return (
      <div
        className={`tiptap-editor-loading ${className}`}
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
        Loading editor...
      </div>
    );
  }

  const editorStyle = {
    height: typeof height === "number" ? `${height}px` : height,
    backgroundColor: "#262A33",
    ...style,
  };

  return (
    <div className={`tiptap-editor-container ${className}`} style={editorStyle}>
      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: "none" }}
        onChange={handleFileSelect}
      />

      {/* 工具栏 */}
      {toolbarPreset !== "custom" && (
        <div className="tiptap-toolbar">
          {toolbarPreset === "full" && (
            <>
              <div className="tiptap-toolbar-group">
                <button
                  type="button"
                  onClick={handleHeading(1)}
                  className={editor.isActive("heading", { level: 1 }) ? "active" : ""}
                  title="Heading 1"
                >
                  <MdTitle style={{ fontSize: "18px" }} />
                </button>
                <button
                  type="button"
                  onClick={handleHeading(2)}
                  className={editor.isActive("heading", { level: 2 }) ? "active" : ""}
                  title="Heading 2"
                >
                  <MdTitle style={{ fontSize: "16px" }} />
                </button>
                <button
                  type="button"
                  onClick={handleHeading(3)}
                  className={editor.isActive("heading", { level: 3 }) ? "active" : ""}
                  title="Heading 3"
                >
                  <MdTitle style={{ fontSize: "14px" }} />
                </button>
              </div>

              <div className="tiptap-toolbar-divider" />

              <div className="tiptap-toolbar-group">
                <button
                  type="button"
                  onClick={handleBold}
                  className={editor.isActive("bold") ? "active" : ""}
                  title="Bold"
                >
                  <MdFormatBold />
                </button>
                <button
                  type="button"
                  onClick={handleItalic}
                  className={editor.isActive("italic") ? "active" : ""}
                  title="Italic"
                >
                  <MdFormatItalic />
                </button>
                <button
                  type="button"
                  onClick={handleStrike}
                  className={editor.isActive("strike") ? "active" : ""}
                  title="Strike"
                >
                  <MdStrikethroughS />
                </button>
                <button
                  type="button"
                  onClick={handleUnderline}
                  className={editor.isActive("underline") ? "active" : ""}
                  title="Underline"
                >
                  <MdFormatUnderlined />
                </button>
                <button
                  type="button"
                  onClick={handleCode}
                  className={editor.isActive("code") ? "active" : ""}
                  title="Code"
                >
                  <MdCode />
                </button>
              </div>

              <div className="tiptap-toolbar-divider" />

              <div className="tiptap-toolbar-group">
                <button
                  type="button"
                  onClick={handleBulletList}
                  className={editor.isActive("bulletList") ? "active" : ""}
                  title="Bullet List"
                >
                  <MdFormatListBulleted />
                </button>
                <button
                  type="button"
                  onClick={handleOrderedList}
                  className={editor.isActive("orderedList") ? "active" : ""}
                  title="Ordered List"
                >
                  <MdFormatListNumbered />
                </button>
                <button
                  type="button"
                  onClick={handleBlockquote}
                  className={editor.isActive("blockquote") ? "active" : ""}
                  title="Blockquote"
                >
                  <MdFormatQuote />
                </button>
                <button
                  type="button"
                  onClick={handleCodeBlock}
                  className={editor.isActive("codeBlock") ? "active" : ""}
                  title="Code Block"
                >
                  <MdCode style={{ fontSize: "20px" }} />
                </button>
              </div>

              <div className="tiptap-toolbar-divider" />

              <div className="tiptap-toolbar-group">
                <button
                  type="button"
                  onClick={handleLink}
                  className={editor.isActive("link") ? "active" : ""}
                  title="Link"
                >
                  <MdInsertLink />
                </button>
                <button
                  type="button"
                  onClick={handleImage}
                  title="Image"
                >
                  <MdImage />
                </button>
              </div>

              <div className="tiptap-toolbar-divider" />

              <div className="tiptap-toolbar-group">
                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={!editor.can().undo()}
                  title="Undo"
                >
                  <MdUndo />
                </button>
                <button
                  type="button"
                  onClick={handleRedo}
                  disabled={!editor.can().redo()}
                  title="Redo"
                >
                  <MdRedo />
                </button>
              </div>
            </>
          )}

          {toolbarPreset === "simple" && (
            <>
              <div className="tiptap-toolbar-group">
                <button
                  type="button"
                  onClick={handleHeading(1)}
                  className={editor.isActive("heading", { level: 1 }) ? "active" : ""}
                  title="Heading 1"
                >
                  <MdTitle style={{ fontSize: "18px" }} />
                </button>
                <button
                  type="button"
                  onClick={handleBold}
                  className={editor.isActive("bold") ? "active" : ""}
                  title="Bold"
                >
                  <MdFormatBold />
                </button>
                <button
                  type="button"
                  onClick={handleItalic}
                  className={editor.isActive("italic") ? "active" : ""}
                  title="Italic"
                >
                  <MdFormatItalic />
                </button>
                <button
                  type="button"
                  onClick={handleLink}
                  className={editor.isActive("link") ? "active" : ""}
                  title="Link"
                >
                  <MdInsertLink />
                </button>
                <button
                  type="button"
                  onClick={handleBulletList}
                  className={editor.isActive("bulletList") ? "active" : ""}
                  title="Bullet List"
                >
                  <MdFormatListBulleted />
                </button>
                <button
                  type="button"
                  onClick={handleOrderedList}
                  className={editor.isActive("orderedList") ? "active" : ""}
                  title="Ordered List"
                >
                  <MdFormatListNumbered />
                </button>
                <button
                  type="button"
                  onClick={handleBlockquote}
                  className={editor.isActive("blockquote") ? "active" : ""}
                  title="Blockquote"
                >
                  <MdFormatQuote />
                </button>
                <button
                  type="button"
                  onClick={handleImage}
                  title="Image"
                >
                  <MdImage />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* 编辑器内容 */}
      <EditorContent editor={editor} className="tiptap-editor-wrapper" />
    </div>
  );
}

