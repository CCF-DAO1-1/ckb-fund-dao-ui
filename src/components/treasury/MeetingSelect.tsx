"use client";

import React, { useState, useEffect } from "react";
import { useTranslation } from "@/utils/i18n";
import { getMeetingList, MeetingItem } from "@/server/task";

import { logger } from '@/lib/logger';
// 重新导出 MeetingItem 供外部使用
export type { MeetingItem };

interface MeetingSelectProps {
    value: string;
    onChange: (meeting: MeetingItem | null) => void;
    disabled?: boolean;
    proposalUri?: string; // 提案URI，用于过滤特定提案的会议
}

export default function MeetingSelect({
    value,
    onChange,
    disabled = false,
    proposalUri,
}: MeetingSelectProps) {
    const { t } = useTranslation();
    const [meetings, setMeetings] = useState<MeetingItem[]>([]);
    const [loading, setLoading] = useState(false);

    // 获取会议列表
    useEffect(() => {
        const fetchMeetings = async () => {
            setLoading(true);
            try {
                // requestAPI 会自动解包 response.data.data，所以返回的直接是 MeetingItem[]
                const response = await getMeetingList({
                    proposal: proposalUri,
                });

                // response 直接是数组（被 requestAPI 自动解包）
                if (Array.isArray(response)) {
                    setMeetings(response);
                } else {
                    setMeetings([]);
                }
            } catch (error) {
                logger.error("获取会议列表失败:");
                // 不显示错误提示，因为可能没有会议数据
                setMeetings([]);
            } finally {
                setLoading(false);
            }
        };

        fetchMeetings();
    }, [proposalUri]);

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedId = e.target.value;
        if (!selectedId) {
            onChange(null);
            return;
        }
        const meeting = meetings.find((m) => String(m.id) === selectedId);
        onChange(meeting || null);
    };

    return (
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
                value={value}
                onChange={handleChange}
                disabled={disabled || loading}
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
                    cursor: disabled || loading ? "not-allowed" : "pointer",
                }}
            >
                <option value="">
                    {loading
                        ? (t("createMeeting.loadingMeetings") || "加载中...")
                        : (t("createMeeting.selectPlaceholder") || "请选择会议（可选）")}
                </option>
                {meetings.map((meeting) => {
                    // 格式化会议显示文本 - 使用 title 和 start_time
                    let displayText = meeting.title || meeting.url || String(meeting.id);
                    if (meeting.start_time) {
                        try {
                            const meetingDate = new Date(meeting.start_time);
                            if (!isNaN(meetingDate.getTime())) {
                                const formattedDate = meetingDate.toLocaleString('zh-CN', {
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                });
                                displayText = `${formattedDate} - ${meeting.title || '会议'}`;
                            }
                        } catch {
                            // 如果日期解析失败，只显示标题
                            displayText = meeting.title || meeting.url || String(meeting.id);
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
    );
}
