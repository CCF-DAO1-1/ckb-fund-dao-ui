"use client";

import { useTranslation } from "../../../../utils/i18n";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useI18n } from "@/contexts/I18nContext";

export default function NoPermission() {
    const { t } = useTranslation();
    const router = useRouter();
    const { locale } = useI18n();

    return (
        <div className="error-page-container">
            <div className="error-icon-wrapper">
                <Image
                    src="/icon/nopremission.svg"
                    alt="No Permission"
                    fill
                    className="object-contain"
                />
            </div>

            <h1 className="error-title">
                {t("errors.noPermission") || "无权限查看当前页面!"}
            </h1>

            <button
                onClick={() => router.push(`/${locale}`)}
                className="error-back-btn"
            >
                {t("common.backToHome") || "返回主页"}
            </button>
        </div>
    );
}
