"use client";

import React, { useState, useEffect } from "react";
import Modal from "@/components/ui/modal/Modal";
import { useTranslation } from "@/utils/i18n";
import toast from "react-hot-toast";
import useUserInfoStore from "@/store/userInfo";
import { submitMeetingReport } from "@/server/task";
import storage from "@/lib/storage";
import { Secp256k1Keypair } from "@atproto/crypto";
import * as cbor from '@ipld/dag-cbor';
import { uint8ArrayToHex } from "@/lib/dag-cbor";
import VditorRichTextEditor from "@/components/common/VditorRichTextEditor";
import axios from "axios";
import getPDSClient from "@/lib/pdsClient";

export interface SubmitMeetingReportModalProps {
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

export default function SubmitMeetingReportModal({
  isOpen,
  onClose,
  onSuccess,
  proposalUri,
}: SubmitMeetingReportModalProps) {
  const { t } = useTranslation();
  const { userInfo } = useUserInfoStore();
  const [selectedMeetingId, setSelectedMeetingId] = useState<string>("");
  const [reportContent, setReportContent] = useState("");
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
        setMeetings([]);
      } finally {
        setLoadingMeetings(false);
      }
    };

    fetchMeetings();
  }, [isOpen]);

  // 重置表单
  useEffect(() => {
    if (!isOpen) {
      setSelectedMeetingId("");
      setReportContent("");
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!userInfo?.did) {
      toast.error(t("submitMeetingReport.errors.userNotLoggedIn") || "请先登录");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. 构建参数对象（用于签名）
      const params: {
        proposal_uri: string;
        meeting_id?: string | number;
        report_content?: string;
        timestamp: number;
      } = {
        proposal_uri: proposalUri || "",
        timestamp: Math.floor(Date.now() / 1000), // UTC 时间戳（秒）
      };

      // 如果选择了会议，添加 meeting_id
      if (selectedMeetingId) {
        params.meeting_id = selectedMeetingId;
      }

      // 如果有报告内容，添加 report_content
      if (reportContent.trim()) {
        params.report_content = reportContent.trim();
      }

      // 2. 使用 cbor.encode 编码参数
      const unsignedCommit = cbor.encode(params);

      // 3. 从 storage 获取 signKey 并创建 keyPair
      const storageInfo = storage.getToken();
      if (!storageInfo?.signKey) {
        throw new Error(t("submitMeetingReport.errors.userNotLoggedIn") || "用户未登录");
      }

      const keyPair = await Secp256k1Keypair.import(storageInfo.signKey.slice(2));

      // 4. 用 keyPair.sign 签名
      const signature = await keyPair.sign(unsignedCommit);

      // 5. 转换为 hex 字符串
      const signedBytes = uint8ArrayToHex(signature);

      // 6. 获取 signing_key_did
      const signingKeyDid = keyPair.did();

      // 7. 调用 API
      const response = await submitMeetingReport({
        did: userInfo.did,
        params: params,
        signed_bytes: signedBytes,
        signing_key_did: signingKeyDid,
      });

      if (response) {
        toast.success(t("submitMeetingReport.success") || "AMA报告提交成功");
        onSuccess?.();
        onClose();
      } else {
        throw new Error(t("submitMeetingReport.errors.submitFailed") || "提交失败");
      }
    } catch (error) {
      console.error("提交AMA报告失败:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(errorMessage || t("submitMeetingReport.errors.submitFailed") || "提交失败，请重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setSelectedMeetingId("");
      setReportContent("");
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t("submitMeetingReport.title") || "提交AMA报告"}
      size="large"
      buttons={[
        {
          text: t("common.cancel") || "取消",
          onClick: handleClose,
          variant: "secondary",
          disabled: isSubmitting,
        },
        {
          text: t("submitMeetingReport.submit") || "提交",
          onClick: handleSubmit,
          variant: "primary",
          disabled: isSubmitting,
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
            {t("submitMeetingReport.meetingLabel") || "选择会议（可选）"}
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
                ? (t("submitMeetingReport.loadingMeetings") || "加载中...") 
                : (t("submitMeetingReport.selectPlaceholder") || "请选择会议（可选）")}
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

        {/* 报告内容 */}
        <div style={{ marginBottom: "16px" }}>
          <label
            htmlFor="report-content"
            style={{
              display: "block",
              marginBottom: "8px",
              color: "#FFFFFF",
              fontSize: "14px",
              fontWeight: 500,
            }}
          >
            {t("submitMeetingReport.contentLabel") || "报告内容（可选）"}
          </label>
          <div style={{ minHeight: "200px" }}>
            <VditorRichTextEditor
              value={reportContent}
              onChange={setReportContent}
              mode="ir"
              toolbarPreset="simple"
              placeholder={t("submitMeetingReport.contentPlaceholder") || "请输入报告内容..."}
            />
          </div>
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
              {t("submitMeetingReport.proposalUri") || "提案 URI"}:
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

