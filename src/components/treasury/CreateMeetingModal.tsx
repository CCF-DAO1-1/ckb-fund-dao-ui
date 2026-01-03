"use client";

import React, { useState, useEffect } from "react";
import Modal from "@/components/ui/modal/Modal";
import { useTranslation } from "@/utils/i18n";
import toast from "react-hot-toast";
import useUserInfoStore from "@/store/userInfo";
import { createMeeting } from "@/server/task";
import storage from "@/lib/storage";
import { Secp256k1Keypair } from "@atproto/crypto";
import * as cbor from '@ipld/dag-cbor';
import { uint8ArrayToHex } from "@/lib/dag-cbor";
import axios from "axios";
import getPDSClient from "@/lib/pdsClient";

export interface CreateMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  proposalUri?: string;
}

// 会议项类型
export interface MeetingItem {
  id: string | number;
  meeting_time: string;
  meeting_link: string;
  proposal_uri?: string;
  [key: string]: unknown;
}

// 会议列表响应类型
export interface MeetingListResponse {
  meetings?: MeetingItem[];
  [key: string]: unknown;
}

export default function CreateMeetingModal({
  isOpen,
  onClose,
  onSuccess,
  proposalUri,
}: CreateMeetingModalProps) {
  const { t } = useTranslation();
  const { userInfo } = useUserInfoStore();
  const [meetingTime, setMeetingTime] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [selectedMeetingId, setSelectedMeetingId] = useState<string>("");
  const [meetings, setMeetings] = useState<MeetingItem[]>([]);
  const [loadingMeetings, setLoadingMeetings] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 获取会议列表
  useEffect(() => {
    if (!isOpen) return;

    const fetchMeetings = async () => {
      setLoadingMeetings(true);
      try {
        // 获取认证 token
        const pdsClient = getPDSClient();
        const token = pdsClient.session?.accessJwt;
        
        const response = await axios.get<MeetingListResponse>("/api/meeting", {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        // 处理响应数据
        if (response.data) {
          if (Array.isArray(response.data)) {
            setMeetings(response.data);
          } else if (Array.isArray(response.data.meetings)) {
            setMeetings(response.data.meetings);
          } else {
            setMeetings([]);
          }
        } else {
          setMeetings([]);
        }
      } catch (error) {
        console.error("获取会议列表失败:", error);
        // 不显示错误提示，因为可能没有会议数据
        setMeetings([]);
      } finally {
        setLoadingMeetings(false);
      }
    };

    fetchMeetings();
  }, [isOpen]);

  // 当选择会议时，自动填充会议链接和时间
  useEffect(() => {
    if (selectedMeetingId && meetings.length > 0) {
      const selectedMeeting = meetings.find(m => String(m.id) === selectedMeetingId);
      if (selectedMeeting) {
        setMeetingLink(selectedMeeting.meeting_link || "");
        // 如果会议有时间，转换为 datetime-local 格式
        if (selectedMeeting.meeting_time) {
          try {
            const meetingDate = new Date(selectedMeeting.meeting_time);
            if (!isNaN(meetingDate.getTime())) {
              // 转换为 datetime-local 格式 (YYYY-MM-DDTHH:mm)
              const year = meetingDate.getFullYear();
              const month = String(meetingDate.getMonth() + 1).padStart(2, '0');
              const day = String(meetingDate.getDate()).padStart(2, '0');
              const hours = String(meetingDate.getHours()).padStart(2, '0');
              const minutes = String(meetingDate.getMinutes()).padStart(2, '0');
              setMeetingTime(`${year}-${month}-${day}T${hours}:${minutes}`);
            }
          } catch (error) {
            console.error("解析会议时间失败:", error);
          }
        }
      }
    }
  }, [selectedMeetingId, meetings]);

  const handleSubmit = async () => {
    if (!userInfo?.did) {
      toast.error(t("createMeeting.errors.userNotLoggedIn") || "请先登录");
      return;
    }

    // 验证会议时间
    if (!meetingTime.trim()) {
      toast.error(t("createMeeting.errors.timeRequired") || "请输入会议时间");
      return;
    }

    // 验证会议时间格式（ISO 8601）
    try {
      const timeDate = new Date(meetingTime);
      if (isNaN(timeDate.getTime())) {
        throw new Error("Invalid date");
      }
    } catch {
      toast.error(t("createMeeting.errors.invalidTime") || "请输入有效的会议时间");
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
      // 将 datetime-local 格式转换为 ISO 8601 格式
      let meetingTimeISO = meetingTime.trim();
      if (meetingTimeISO && !meetingTimeISO.includes('T')) {
        // 如果格式是 YYYY-MM-DD HH:mm，转换为 YYYY-MM-DDTHH:mm
        meetingTimeISO = meetingTimeISO.replace(' ', 'T');
      }
      // 确保是 ISO 8601 格式（如果缺少时区信息，添加 Z 表示 UTC）
      if (meetingTimeISO && !meetingTimeISO.endsWith('Z') && !meetingTimeISO.includes('+') && !meetingTimeISO.includes('-', 10)) {
        // 如果没有时区信息，假设是本地时间，转换为 ISO 8601
        const localDate = new Date(meetingTimeISO);
        if (!isNaN(localDate.getTime())) {
          meetingTimeISO = localDate.toISOString();
        }
      }

      // 1. 构建参数对象（用于签名）
      const params = {
        proposal_uri: proposalUri || "",
        meeting_time: meetingTimeISO,
        meeting_link: meetingLink.trim(),
        timestamp: Math.floor(Date.now() / 1000), // UTC 时间戳（秒）
      };

      // 2. 使用 cbor.encode 编码参数
      const unsignedCommit = cbor.encode(params);

      // 3. 从 storage 获取 signKey 并创建 keyPair
      const storageInfo = storage.getToken();
      if (!storageInfo?.signKey) {
        throw new Error(t("createMeeting.errors.userNotLoggedIn") || "用户未登录");
      }

      const keyPair = await Secp256k1Keypair.import(storageInfo.signKey.slice(2));

      // 4. 用 keyPair.sign 签名
      const signature = await keyPair.sign(unsignedCommit);

      // 5. 转换为 hex 字符串
      const signedBytes = uint8ArrayToHex(signature);

      // 6. 获取 signing_key_did
      const signingKeyDid = keyPair.did();

      // 7. 调用 API
      const response = await createMeeting({
        did: userInfo.did,
        params: params,
        signed_bytes: signedBytes,
        signing_key_did: signingKeyDid,
      });

      if (response) {
        toast.success(t("createMeeting.success") || "会议创建成功");
        setMeetingTime("");
        setMeetingLink("");
        onSuccess?.();
        onClose();
      } else {
        throw new Error(t("createMeeting.errors.submitFailed") || "提交失败");
      }
    } catch (error) {
      console.error("创建会议失败:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(errorMessage || t("createMeeting.errors.submitFailed") || "提交失败，请重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setMeetingTime("");
      setMeetingLink("");
      setSelectedMeetingId("");
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
          disabled: isSubmitting || !meetingTime.trim() || !meetingLink.trim(),
        },
      ]}
    >
      <div style={{ padding: "20px 0" }}>
        {/* 会议选择 */}
        <div style={{ marginBottom: "16px" }}>
          <label
            htmlFor="meeting-select"
            style={{
              display: "block",
              marginBottom: "8px",
              color: "#FFFFFF",
              fontSize: "14px",
              fontWeight: 500,
            }}
          >
            {t("createMeeting.selectLabel") || "选择会议"}
          </label>
          <select
            id="meeting-select"
            value={selectedMeetingId}
            onChange={(e) => setSelectedMeetingId(e.target.value)}
            disabled={isSubmitting || loadingMeetings}
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
              cursor: isSubmitting || loadingMeetings ? "not-allowed" : "pointer",
            }}
          >
            <option value="">
              {loadingMeetings 
                ? (t("createMeeting.loadingMeetings") || "加载中...") 
                : (t("createMeeting.selectPlaceholder") || "请选择会议（可选）")}
            </option>
            {meetings.map((meeting) => {
              // 格式化会议显示文本
              let displayText = meeting.meeting_link || String(meeting.id);
              if (meeting.meeting_time) {
                try {
                  const meetingDate = new Date(meeting.meeting_time);
                  if (!isNaN(meetingDate.getTime())) {
                    const formattedDate = meetingDate.toLocaleString('zh-CN', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    });
                    displayText = `${formattedDate} - ${meeting.meeting_link || '会议'}`;
                  }
                } catch {
                  // 如果日期解析失败，只显示链接
                  displayText = meeting.meeting_link || String(meeting.id);
                }
              }
              return (
                <option key={meeting.id} value={String(meeting.id)}>
                  {displayText}
                </option>
              );
            })}
          </select>
        </div>
        <div style={{ marginBottom: "16px" }}>
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
          <input
            id="meeting-time"
            type="datetime-local"
            value={meetingTime}
            onChange={(e) => setMeetingTime(e.target.value)}
            placeholder={t("createMeeting.timePlaceholder") || "请选择会议时间"}
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
        )}
      </div>
    </Modal>
  );
}

