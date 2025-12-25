import { useCallback } from "react";
import { uploadImage } from "@/server/pds";
import toast from "react-hot-toast";
import { useTranslation } from "@/utils/i18n";

/**
 * Quill Toolbar Handler 上下文类型
 */
interface QuillToolbarContext {
  quill: {
    getSelection: (focus?: boolean) => { index: number; length: number } | null;
    getLength: () => number;
    insertEmbed: (index: number, type: string, value: string) => void;
    setSelection: (index: number) => void;
  };
}

/**
 * Quill 编辑器图片上传 Hook
 * @param did 用户 DID
 * @returns Quill 图片上传 handler 函数
 */
export function useImageUpload(did?: string) {
  const { t } = useTranslation();

  const imageHandler = useCallback(
    function (this: QuillToolbarContext) {
      const quill = this.quill;
      // 保存当前光标位置，如果获取不到则默认为文档末尾
      const range = quill.getSelection(true);

      const input = document.createElement("input");
      input.setAttribute("type", "file");
      input.setAttribute("accept", "image/*");
      input.click();

      input.onchange = async () => {
        const file = input.files?.[0];
        
        if (!file) {
          return;
        }

        // 检查用户是否登录
        if (!did) {
          toast.error(t("errors.userNotLoggedIn") || "Please login first");
          return;
        }

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
          const url = await uploadImage(file, did);

          // 使用之前保存的 range，如果为 null 则插入到文档末尾
          // 注意：quill.getLength() 返回的长度包含末尾的换行符
          const index = range ? range.index : quill.getLength() || 0;

          quill.insertEmbed(index, "image", url);
          // 插入后将光标移动到图片之后
          quill.setSelection(index + 1);

          toast.success(t("editor.uploadSuccess") || "Upload success");
        } catch (error) {
          console.error("图片上传错误:", error);
          const errorMessage =
            error instanceof Error
              ? error.message
              : t("editor.uploadError") || "Upload failed";
          
          // 根据错误类型显示不同的提示
          if (errorMessage.includes("File size exceeds")) {
            toast.error(t("editor.fileTooLarge") || "File size cannot exceed 5MB");
          } else if (errorMessage.includes("Only image files")) {
            toast.error(t("editor.invalidFileType") || "Only image files are supported");
          } else {
            toast.error(errorMessage);
          }
        } finally {
          toast.dismiss(loadingToast);
        }
      };
    },
    [did, t]
  );

  return imageHandler;
}

