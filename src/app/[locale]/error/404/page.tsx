"use client";

import { useTranslation } from "../../../../utils/i18n";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useI18n } from "@/contexts/I18nContext";

export default function NotFound() {
    const { t } = useTranslation();
    const router = useRouter();
    const { locale } = useI18n();

    return (
        <div className="error-page-container">
            <div className="error-icon-wrapper">
                <Image
                    src="/icon/notfound.svg"
                    alt="Not Found"
                    fill
                    className="object-contain"
                />
            </div>

            <h1 className="error-title">
                {t("errors.notFound") || "页面未找到"}
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

