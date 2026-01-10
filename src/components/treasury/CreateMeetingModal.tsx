"use client";

import React, { useState, useEffect } from "react";
import Modal from "@/components/ui/modal/Modal";
import { useTranslation } from "@/utils/i18n";
import toast from "react-hot-toast";
import useUserInfoStore from "@/store/userInfo";
import { createMeeting } from "@/server/task";
import CustomDatePicker from "@/components/ui/DatePicker";
import { generateSignature } from "@/lib/signature";

import { logger } from '@/lib/logger';
export interface CreateMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  proposalUri?: string;
}



export default function CreateMeetingModal({
  isOpen,
  onClose,
  onSuccess,
  proposalUri,
}: CreateMeetingModalProps) {
  const { t } = useTranslation();
  const { userInfo } = useUserInfoStore();
  const [meetingDate, setMeetingDate] = useState<Date | null>(null);
  const [meetingTime, setMeetingTime] = useState<Date | null>(null);
  const [meetingLink, setMeetingLink] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);



  const handleSubmit = async () => {
    if (!userInfo?.did) {
      toast.error(t("createMeeting.errors.userNotLoggedIn") || "请先登录");
      return;
    }

    // 验证会议日期
    if (!meetingDate) {
      toast.error(t("createMeeting.errors.dateRequired") || "请选择会议日期");
      return;
    }

    // 验证会议时间
    if (!meetingTime) {
      toast.error(t("createMeeting.errors.timeRequired") || "请选择会议时间");
      return;
    }

    // 验证会议链接
    if (!meetingLink.trim()) {
      toast.error(t("createMeeting.errors.linkRequired") || "请输入会议链接");
      return;
    }

    // 验证链接格式（基本URL验证）
    try {
      new URL(meetingLink.trim());
    } catch {
      toast.error(t("createMeeting.errors.invalidLink") || "请输入有效的会议链接");
      return;
    }

    setIsSubmitting(true);

    try {
      // 合并日期和时间为一个完整的 Date 对象
      const combinedDateTime = new Date(meetingDate);
      combinedDateTime.setHours(meetingTime.getHours());
      combinedDateTime.setMinutes(meetingTime.getMinutes());
      combinedDateTime.setSeconds(0);
      combinedDateTime.setMilliseconds(0);

      // 将 Date 对象转换为 ISO 8601 格式
      const meetingTimeISO = combinedDateTime.toISOString();

      // 1. 构建参数对象（用于签名）
      const params = {
        proposal_uri: proposalUri || "",
        start_time: meetingTimeISO,
        url: meetingLink.trim(),
        title: title.trim(),
        description: description.trim(),
        timestamp: Math.floor(Date.now() / 1000), // UTC 时间戳（秒）
      };

      // 生成签名和 signing_key_did
      const { signed_bytes: signedBytes, signing_key_did: signingKeyDid } = await generateSignature(params);

      // 7. 调用 API
      const response = await createMeeting({
        did: userInfo.did,
        params: params,
        signed_bytes: signedBytes,
        signing_key_did: signingKeyDid,
      });

      if (response) {
        toast.success(t("createMeeting.success") || "会议创建成功");
        setMeetingDate(null);
        setMeetingTime(null);
        setMeetingLink("");
        setTitle("");
        setDescription("");
        onSuccess?.();
        onClose();
      } else {
        throw new Error(t("createMeeting.errors.submitFailed") || "提交失败");
      }
    } catch (error) {
      logger.error("创建会议失败:");
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(errorMessage || t("createMeeting.errors.submitFailed") || "提交失败，请重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setMeetingDate(null);
      setMeetingTime(null);
      setMeetingLink("");
      setTitle("");
      setDescription("");
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t("createMeeting.title") || "组织AMA会议"}
      size="large"
      buttons={[
        {
          text: t("common.cancel") || "取消",
          onClick: handleClose,
          variant: "secondary",
          disabled: isSubmitting,
        },
        {
          text: t("createMeeting.submit") || "提交",
          onClick: handleSubmit,
          variant: "primary",
          disabled: isSubmitting || !meetingDate || !meetingTime || !meetingLink.trim(),
        },
      ]}
    >
      <div style={{ padding: "20px 0" }}>



        <div
          style={{
            display: "flex",
            gap: "12px",
            marginBottom: "16px",
            flexWrap: "wrap"
          }}
        >
          {/* 日期选择器 */}
          <div style={{ flex: "1", minWidth: "200px" }}>
            <label
              htmlFor="meeting-date"
              style={{
                display: "block",
                marginBottom: "8px",
                color: "#FFFFFF",
                fontSize: "14px",
                fontWeight: 500,
              }}
            >
              {t("createMeeting.dateLabel") || "会议日期"}
            </label>
            <div style={{ width: "100%" }}
            >
              <CustomDatePicker
                selected={meetingDate}
                onChange={(date) => setMeetingDate(date)}
                placeholderText={t("createMeeting.datePlaceholder") || "请选择会议日期"}
                disabled={isSubmitting}
                minDate={new Date()}
                dateFormat="yyyy-MM-dd"
                className="form-input"
              />
            </div>
          </div>
          {/* 时间选择器 */}
          <div style={{ flex: "1", minWidth: "200px" }}>
            <label
              htmlFor="meeting-time"
              style={{
                display: "block",
                marginBottom: "8px",
                color: "#FFFFFF",
                fontSize: "14px",
                fontWeight: 500,
              }}
            >
              {t("createMeeting.timeLabel") || "会议时间"}
            </label>
            <div style={{ width: "100%" }}
            >
              <CustomDatePicker
                selected={meetingTime}
                onChange={(date) => setMeetingTime(date)}
                placeholderText={t("createMeeting.timePlaceholder") || "请选择会议时间"}
                disabled={isSubmitting}
                showTimeSelect={true}
                showTimeSelectOnly={true}
                timeIntervals={10}
                timeFormat="HH:mm"
                timeCaption={t("createMeeting.timeCaption") || "时间"}
                dateFormat="HH:mm"
                className="form-input"
              />
            </div>
          </div>
        </div>

      </div>
      {/* 会议标题 */}
      <div style={{ marginBottom: "16px" }}>
        <label
          htmlFor="meeting-title"
          style={{
            display: "block",
            marginBottom: "8px",
            color: "#FFFFFF",
            fontSize: "14px",
            fontWeight: 500,
          }}
        >
          {t("createMeeting.titleLabel") || "会议标题"}
        </label>
        <input
          id="meeting-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("createMeeting.titlePlaceholder") || "请输入会议标题"}
          disabled={isSubmitting}
          style={{
            width: "100%",
            maxWidth: "460px",
            padding: "12px",
            backgroundColor: "#1A1D23",
            border: "1px solid #4C525C",
            borderRadius: "6px",
            color: "#FFFFFF",
            fontSize: "14px",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>
      {/* 会议描述 */}
      <div style={{ marginBottom: "16px" }}>
        <label
          htmlFor="meeting-description"
          style={{
            display: "block",
            marginBottom: "8px",
            color: "#FFFFFF",
            fontSize: "14px",
            fontWeight: 500,
          }}
        >
          {t("createMeeting.descriptionLabel") || "会议描述"}
        </label>
        <textarea
          id="meeting-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("createMeeting.descriptionPlaceholder") || "请输入会议描述（可选）"}
          disabled={isSubmitting}
          rows={3}
          style={{
            width: "100%",
            maxWidth: "460px",
            padding: "12px",
            backgroundColor: "#1A1D23",
            border: "1px solid #4C525C",
            borderRadius: "6px",
            color: "#FFFFFF",
            fontSize: "14px",
            outline: "none",
            boxSizing: "border-box",
            resize: "vertical",
          }}
        />
      </div>
      {/* 会议链接 */}
      <div style={{ marginBottom: "16px" }}>
        <label
          htmlFor="meeting-link"
          style={{
            display: "block",
            marginBottom: "8px",
            color: "#FFFFFF",
            fontSize: "14px",
            fontWeight: 500,
          }}
        >
          {t("createMeeting.linkLabel") || "会议链接"}
        </label>
        <input
          id="meeting-link"
          type="url"
          value={meetingLink}
          onChange={(e) => setMeetingLink(e.target.value)}
          placeholder={t("createMeeting.linkPlaceholder") || "请输入会议链接（如 Zoom、腾讯会议等）"}
          disabled={isSubmitting}
          style={{
            width: "100%",
            maxWidth: "460px",
            padding: "12px",
            backgroundColor: "#1A1D23",
            border: "1px solid #4C525C",
            borderRadius: "6px",
            color: "#FFFFFF",
            fontSize: "14px",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>
      {proposalUri && (
        <div style={{
          marginTop: "12px",
          fontSize: "12px",
          color: "#8A949E",
          wordBreak: "break-all",
          overflowWrap: "break-word",
          lineHeight: "1.5"
        }}>
          <div style={{ marginBottom: "4px", fontWeight: 500 }}>
            {t("createMeeting.proposalUri") || "提案 URI"}:
          </div>
          <div style={{
            wordBreak: "break-all",
            overflowWrap: "break-word",
            color: "#CCCCCC"
          }}>
            {proposalUri}
          </div>
        </div>
      )
      }
    </Modal >
  );
}

