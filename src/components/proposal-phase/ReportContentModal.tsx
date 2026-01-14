"use client";

import React, { useEffect, useRef } from "react";
import Modal from "@/components/ui/modal/Modal";
import Vditor from "vditor";
import "vditor/dist/index.css";
import { useTranslation } from "@/utils/i18n";

interface ReportContentModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    content: string;
}

export default function ReportContentModal({
    isOpen,
    onClose,
    title,
    content,
}: ReportContentModalProps) {
    const { t } = useTranslation();
    const previewRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen && content && previewRef.current) {
            Vditor.preview(previewRef.current, content, {
                mode: "dark", // Or dynamic based on theme
                icon: "ant", // or material
            });
        }
    }, [isOpen, content]);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            size="large"
            buttons={[
                {
                    text: t("common.close") || "关闭",
                    onClick: onClose,
                    variant: "secondary",
                },
            ]}
        >
            <div className="report-content-preview" style={{ padding: "20px 0", minHeight: "200px" }}>
                <div ref={previewRef} className="vditor-reset" style={{ color: "#fff" }} />
            </div>
        </Modal>
    );
}
