"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { MdFormatListBulleted, MdFormatListNumbered, MdInsertLink, MdImage } from "react-icons/md";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { ListItemNode, ListNode } from "@lexical/list";
import { LinkNode } from "@lexical/link";
import { DecoratorNode, NodeKey } from "lexical";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getRoot, $createParagraphNode, SerializedLexicalNode } from "lexical";
import { $generateHtmlFromNodes, $generateNodesFromDOM } from "@lexical/html";
import { $getSelection, $isRangeSelection } from "lexical";
import { $setBlocksType } from "@lexical/selection";
import { $createHeadingNode, $createQuoteNode } from "@lexical/rich-text";
import { FORMAT_TEXT_COMMAND } from "lexical";
import { INSERT_UNORDERED_LIST_COMMAND, INSERT_ORDERED_LIST_COMMAND } from "@lexical/list";
import { TOGGLE_LINK_COMMAND } from "@lexical/link";
import { uploadImage } from "@/server/pds";
import toast from "react-hot-toast";
import { useTranslation } from "@/utils/i18n";
import "@/styles/lexical-editor.css";

// 自定义图片节点
class ImageNode extends DecoratorNode<React.ReactElement> {
  __src: string;
  __alt: string;

  static getType(): string {
    return "image";
  }

  static clone(node: ImageNode): ImageNode {
    return new ImageNode(node.__src, node.__alt, node.__key);
  }

  constructor(src: string, alt: string, key?: NodeKey) {
    super(key);
    this.__src = src;
    this.__alt = alt;
  }

  createDOM(): HTMLElement {
    const img = document.createElement("img");
    img.src = this.__src;
    img.alt = this.__alt;
    img.style.maxWidth = "100%";
    img.style.height = "auto";
    img.style.display = "block";
    img.style.margin = "8px 0";
    img.style.borderRadius = "4px";
    return img;
  }

  updateDOM(): false {
    return false;
  }

  decorate(): React.ReactElement {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={this.__src}
        alt={this.__alt}
        style={{
          maxWidth: "100%",
          height: "auto",
          display: "block",
          margin: "8px 0",
          borderRadius: "4px",
        }}
      />
    );
  }

  static importDOM() {
    return {
      img: () => ({
        conversion: (domNode: HTMLImageElement) => {
          const { src, alt } = domNode;
          return { node: new ImageNode(src, alt || "") };
        },
        priority: 0 as const,
      }),
    };
  }

  static importJSON(serializedNode: SerializedLexicalNode): ImageNode {
    const node = serializedNode as { src?: string; alt?: string };
    const { src, alt } = node;
    return $createImageNode(src || "", alt || "");
  }

  exportJSON(): { type: string; src: string; alt: string; version: number } {
    return {
      type: "image",
      src: this.__src,
      alt: this.__alt,
      version: 1,
    };
  }
}

function $createImageNode(src: string, alt: string = "", key?: NodeKey): ImageNode {
  return new ImageNode(src, alt, key);
}

export type ToolbarPreset = "simple" | "full" | "custom";

export interface LexicalRichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: string | number;
  did?: string; // 用于图片上传
  toolbarPreset?: ToolbarPreset;
  loadingText?: string; // 加载状态文本
  className?: string;
  style?: React.CSSProperties;
}

// 工具栏按钮组件
function ToolbarPlugin({ 
  preset = "full",
  did 
}: { 
  preset?: ToolbarPreset;
  did?: string;
}) {
  const [editor] = useLexicalComposerContext();
  const { t } = useTranslation();
  
  // 跟踪当前格式状态
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isCode, setIsCode] = useState(false);
  const [blockType, setBlockType] = useState<string>("paragraph");

  // 监听选择变化，更新按钮状态
  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          setIsBold(selection.hasFormat("bold"));
          setIsItalic(selection.hasFormat("italic"));
          setIsUnderline(selection.hasFormat("underline"));
          setIsCode(selection.hasFormat("code"));
          
          // 检测块类型
          const anchorNode = selection.anchor.getNode();
          const element = anchorNode.getKey() === "root" 
            ? anchorNode 
            : anchorNode.getTopLevelElementOrThrow();
          
          const elementKey = element.getKey();
          const elementDOM = editor.getElementByKey(elementKey);
          
          if (elementDOM) {
            const type = elementDOM.tagName.toLowerCase();
            if (type === "h1" || type === "h2" || type === "h3") {
              setBlockType(type);
            } else if (type === "blockquote") {
              setBlockType("quote");
            } else if (type === "ul") {
              setBlockType("bullet");
            } else if (type === "ol") {
              setBlockType("number");
            } else {
              setBlockType("paragraph");
            }
          }
        }
      });
    });
  }, [editor]);

  const formatText = useCallback((format: string) => {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;

      if (format === "bold") {
        editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold");
      } else if (format === "italic") {
        editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic");
      } else if (format === "underline") {
        editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline");
      } else if (format === "strikethrough") {
        editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough");
      } else if (format === "heading1") {
        $setBlocksType(selection, () => $createHeadingNode("h1"));
      } else if (format === "heading2") {
        $setBlocksType(selection, () => $createHeadingNode("h2"));
      } else if (format === "heading3") {
        $setBlocksType(selection, () => $createHeadingNode("h3"));
      } else if (format === "code") {
        // 切换代码格式
        editor.dispatchCommand(FORMAT_TEXT_COMMAND, "code");
      } else if (format === "quote") {
        $setBlocksType(selection, () => $createQuoteNode());
      } else if (format === "paragraph") {
        // 转换为普通段落
        $setBlocksType(selection, () => $createParagraphNode());
      }
    });
  }, [editor]);

  const toggleList = useCallback((listType: "bullet" | "number") => {
    editor.dispatchCommand(
      listType === "bullet" ? INSERT_UNORDERED_LIST_COMMAND : INSERT_ORDERED_LIST_COMMAND,
      undefined
    );
  }, [editor]);

  const toggleLink = useCallback(() => {
    const url = prompt(t("editor.enterLinkUrl") || "Enter link URL:");
    if (url) {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, url);
    }
  }, [editor, t]);

  const insertImage = useCallback(async () => {
    if (!did) {
      toast.error(t("errors.userNotLoggedIn") || "Please login first");
      return;
    }

    const input = document.createElement("input");
    input.setAttribute("type", "file");
    input.setAttribute("accept", "image/*");
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      // 文件类型验证
      if (!file.type.startsWith("image/")) {
        toast.error(t("editor.invalidFileType") || "Only image files are supported");
        return;
      }

      // 文件大小验证 (5MB)
      const MAX_FILE_SIZE = 5 * 1024 * 1024;
      if (file.size > MAX_FILE_SIZE) {
        toast.error(t("editor.fileTooLarge") || "File size cannot exceed 5MB");
        return;
      }

      const loadingToast = toast.loading(t("editor.uploading") || "Uploading...");

      try {
        const imageUrl = await uploadImage(file, did);
        
        if (!imageUrl) {
          throw new Error("Invalid image URL returned");
        }

        editor.update(() => {
          const selection = $getSelection();
          const root = $getRoot();
          
          // 在编辑器上下文中创建图片节点
          // 使用 $createImageNode 辅助函数创建节点
          const imageNode = $createImageNode(imageUrl, file.name);
          
          // 创建段落节点来包含图片
          const paragraph = $createParagraphNode();
          paragraph.append(imageNode);
          
          if ($isRangeSelection(selection)) {
            // 如果有选择，在当前位置插入
            selection.insertNodes([paragraph]);
          } else {
            // 如果没有选择，在末尾插入
            root.append(paragraph);
          }
        });

        toast.success(t("editor.uploadSuccess") || "Upload success");
      } catch (error) {
        console.error("图片上传错误:", error);
        const errorMessage = error instanceof Error ? error.message : t("editor.uploadError") || "Upload failed";
        
        if (errorMessage.includes("File size exceeds") || errorMessage.includes("File size cannot exceed")) {
          toast.error(t("editor.fileTooLarge") || "File size cannot exceed 5MB");
        } else if (errorMessage.includes("Only image files")) {
          toast.error(t("editor.invalidFileType") || "Only image files are supported");
        } else if (errorMessage.includes("User DID is required") || errorMessage.includes("Please login")) {
          toast.error(t("errors.userNotLoggedIn") || "Please login first");
        } else {
          toast.error(errorMessage);
        }
      } finally {
        toast.dismiss(loadingToast);
        input.value = "";
      }
    };
  }, [editor, did, t]);

  // 工具栏按钮配置 - 参考 Lexical playground 的组织方式
  const formatButtons = [
    { 
      label: "B", 
      action: () => formatText("bold"), 
      className: `bold ${isBold ? "active" : ""}`, 
      title: t("editor.bold") || "Bold",
      format: "bold"
    },
    { 
      label: "I", 
      action: () => formatText("italic"), 
      className: `italic ${isItalic ? "active" : ""}`, 
      title: t("editor.italic") || "Italic",
      format: "italic"
    },
    { 
      label: "U", 
      action: () => formatText("underline"), 
      className: `underline ${isUnderline ? "active" : ""}`, 
      title: t("editor.underline") || "Underline",
      format: "underline"
    },
  ];

  // 块格式下拉菜单选项
  const blockFormatOptions = [
    { 
      value: "paragraph",
      label: t("editor.normal") || "Normal",
      icon: "≡",
      action: () => formatText("paragraph")
    },
    { 
      value: "h1",
      label: t("editor.heading1") || "Heading 1",
      icon: "H1",
      action: () => formatText("heading1")
    },
    { 
      value: "h2",
      label: t("editor.heading2") || "Heading 2",
      icon: "H2",
      action: () => formatText("heading2")
    },
    { 
      value: "h3",
      label: t("editor.heading3") || "Heading 3",
      icon: "H3",
      action: () => formatText("heading3")
    },
  ];

  // 获取当前块格式的显示文本
  const getBlockFormatLabel = () => {
    const option = blockFormatOptions.find(opt => opt.value === blockType);
    return option ? option.label : blockFormatOptions[0].label;
  };

  // 块格式下拉菜单状态
  const [showBlockFormatDropdown, setShowBlockFormatDropdown] = useState(false);
  const blockFormatDropdownRef = useRef<HTMLDivElement>(null);
  const dropdownMenuRef = useRef<HTMLDivElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);

  // 计算下拉菜单位置
  useEffect(() => {
    if (showBlockFormatDropdown && blockFormatDropdownRef.current) {
      const rect = blockFormatDropdownRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
      });
    } else {
      setDropdownPosition(null);
    }
  }, [showBlockFormatDropdown]);

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        blockFormatDropdownRef.current &&
        !blockFormatDropdownRef.current.contains(event.target as Node) &&
        dropdownMenuRef.current &&
        !dropdownMenuRef.current.contains(event.target as Node)
      ) {
        setShowBlockFormatDropdown(false);
      }
    };

    if (showBlockFormatDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showBlockFormatDropdown]);

  // 其他块级按钮（列表等）
  const otherBlockButtons = preset === "simple" ? [
    { 
      icon: <MdFormatListBulleted size={18} />,
      action: () => toggleList("bullet"), 
      title: t("editor.bulletList") || "Bullet List",
      className: blockType === "bullet" ? "active" : ""
    },
  ] : [
    { 
      icon: <MdFormatListBulleted size={18} />,
      action: () => toggleList("bullet"), 
      title: t("editor.bulletList") || "Bullet List",
      className: blockType === "bullet" ? "active" : ""
    },
    { 
      icon: <MdFormatListNumbered size={18} />,
      action: () => toggleList("number"), 
      title: t("editor.numberedList") || "Numbered List",
      className: blockType === "number" ? "active" : ""
    },
    { 
      label: "❝", 
      action: () => formatText("quote"), 
      title: t("editor.quote") || "Quote",
      className: blockType === "quote" ? "active" : ""
    },
  ];

  const insertButtons = [
    { 
      label: "<>", 
      action: () => formatText("code"), 
      title: t("editor.code") || "Code",
      className: isCode ? "active" : ""
    },
    { 
      icon: <MdInsertLink size={18} />,
      action: toggleLink, 
      title: t("editor.link") || "Link" 
    },
    { 
      icon: <MdImage size={18} />,
      action: insertImage, 
      title: t("editor.insertImage") || "Insert Image" 
    },
  ];

  // 添加分隔符来分组按钮（参考 Lexical playground）
  const Divider = () => <div className="lexical-toolbar-divider" />;

  return (
    <div className="lexical-toolbar">
      {/* 块格式下拉菜单 */}
      <div className="lexical-toolbar-dropdown" ref={blockFormatDropdownRef}>
        <button
          type="button"
          className={`lexical-toolbar-button lexical-toolbar-dropdown-button ${blockType === "paragraph" || blockType === "h1" || blockType === "h2" || blockType === "h3" ? "active" : ""}`}
          onClick={() => setShowBlockFormatDropdown(!showBlockFormatDropdown)}
          title={t("editor.blockFormat") || "Block Format"}
        >
          <span className="lexical-toolbar-dropdown-label">{getBlockFormatLabel()}</span>
          <span className="lexical-toolbar-dropdown-arrow">▼</span>
        </button>
        {showBlockFormatDropdown && dropdownPosition && typeof window !== "undefined" && createPortal(
          <div 
            ref={dropdownMenuRef}
            className="lexical-toolbar-dropdown-menu"
            style={{
              position: "absolute",
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
            }}
          >
            {blockFormatOptions.map((option) => (
              <div
                key={option.value}
                className={`lexical-toolbar-dropdown-item ${blockType === option.value ? "active" : ""}`}
                onClick={() => {
                  option.action();
                  setShowBlockFormatDropdown(false);
                }}
              >
                <span className="lexical-toolbar-dropdown-item-icon">{option.icon}</span>
                <span className="lexical-toolbar-dropdown-item-label">{option.label}</span>
              </div>
            ))}
          </div>,
          document.body
        )}
      </div>

      {/* 其他块级按钮 */}
      {otherBlockButtons.map((button, index) => (
        <button
          key={`block-${index}`}
          type="button"
          className={`lexical-toolbar-button ${button.className || ""}`}
          onClick={button.action}
          title={button.title || (button.label as string)}
        >
          {button.icon || button.label}
        </button>
      ))}
      
      {/* 分隔符 */}
      {(otherBlockButtons.length > 0) && (formatButtons.length > 0 || insertButtons.length > 0) && <Divider />}
      
      {/* 文本格式按钮组 */}
      {formatButtons.map((button, index) => (
        <button
          key={`format-${index}`}
          type="button"
          className={`lexical-toolbar-button ${button.className || ""}`}
          onClick={button.action}
          title={button.title || button.label}
        >
          {button.label}
        </button>
      ))}
      
      {/* 分隔符 */}
      {formatButtons.length > 0 && insertButtons.length > 0 && <Divider />}
      
      {/* 插入按钮组 */}
      {insertButtons.map((button, index) => (
        <button
          key={`insert-${index}`}
          type="button"
          className={`lexical-toolbar-button ${button.className || ""}`}
          onClick={button.action}
          title={button.title || (button.label as string)}
        >
          {button.icon || button.label}
        </button>
      ))}
    </div>
  );
}

// 同步 HTML 内容到 Lexical
function OnChangePlugin({ 
  onChange 
}: { 
  onChange: (value: string) => void;
}) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const htmlString = $generateHtmlFromNodes(editor, null);
        onChange(htmlString);
      });
    });
  }, [editor, onChange]);

  return null;
}

// 初始化内容插件
function InitialContentPlugin({ 
  initialHtml 
}: { 
  initialHtml: string;
}) {
  const [editor] = useLexicalComposerContext();
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    if (hasInitialized || !initialHtml) return;

    editor.update(() => {
      const parser = new DOMParser();
      const dom = parser.parseFromString(initialHtml, "text/html");
      const nodes = $generateNodesFromDOM(editor, dom);
      const root = $getRoot();
      root.clear();
      root.append(...nodes);
      setHasInitialized(true);
    });
  }, [editor, initialHtml, hasInitialized]);

  return null;
}

const theme = {
  paragraph: "lexical-paragraph",
  heading: {
    h1: "lexical-heading-h1",
    h2: "lexical-heading-h2",
    h3: "lexical-heading-h3",
  },
  quote: "lexical-quote",
  list: {
    nested: {
      listitem: "lexical-nested-listitem",
    },
    ol: "lexical-list-ol",
    ul: "lexical-list-ul",
    listitem: "lexical-listitem",
  },
  link: "lexical-link",
  text: {
    bold: "lexical-text-bold",
    italic: "lexical-text-italic",
    underline: "lexical-text-underline",
    strikethrough: "lexical-text-strikethrough",
  },
};

function onError(error: Error) {
  console.error("Lexical editor error:", error);
}

export default function LexicalRichTextEditor({
  value,
  onChange,
  placeholder,
  height = "200px",
  did,
  toolbarPreset = "full",
  loadingText,
  className = "",
  style,
}: LexicalRichTextEditorProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const editorStyle = {
    height: typeof height === "number" ? `${height}px` : height,
    ...style,
  };

  const initialConfig = {
    namespace: "LexicalRichTextEditor",
    theme,
    onError,
    nodes: [
      HeadingNode,
      QuoteNode,
      ListNode,
      ListItemNode,
      LinkNode,
      ImageNode,
    ],
    editorState: value ? undefined : null,
  };

  if (!isClient) {
    return (
      <div
        className={`lexical-editor-loading ${className}`}
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
    <div className={`lexical-editor-container ${className}`} style={editorStyle}>
      <LexicalComposer initialConfig={initialConfig}>
        <div className="lexical-editor-wrapper">
          <ToolbarPlugin preset={toolbarPreset} did={did} />
          <div className="lexical-editor-inner">
            <RichTextPlugin
              contentEditable={
                <ContentEditable className="lexical-content-editable" />
              }
              placeholder={
                <div className="lexical-placeholder">
                  {placeholder || "Enter text..."}
                </div>
              }
              ErrorBoundary={LexicalErrorBoundary}
            />
            <HistoryPlugin />
            <AutoFocusPlugin />
            <ListPlugin />
            <LinkPlugin />
            <OnChangePlugin onChange={onChange} />
            <InitialContentPlugin initialHtml={value} />
          </div>
        </div>
      </LexicalComposer>
    </div>
  );
}

