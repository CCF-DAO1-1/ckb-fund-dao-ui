"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import LanguageSwitcher from "@/components/common/LanguageSwitcher";
import Link from "next/link";
import { CiCirclePlus } from "react-icons/ci";
import { usePathname } from "next/navigation";
import { useI18n } from "@/contexts/I18nContext";
import { useTranslation } from "@/utils/i18n";
import { LoginModal } from "@/components/user-login";
import useUserInfoStore from "@/store/userInfo";
import Avatar from "@/components/common/Avatar";
import { IoMenu, IoClose } from "react-icons/io5";
import isMobile from "is-mobile";
import "@/styles/LoginModal.css";
import { getUserDisplayNameFromStore } from "@/utils/userDisplayUtils";

export default function Header() {
  const pathname = usePathname();
  const { locale } = useI18n();
  const { t } = useTranslation();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { userInfo, userProfile } = useUserInfoStore();
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  useEffect(() => {
    // 确保只在客户端执行
    if (typeof window === 'undefined') return;

    const checkMobile = () => {
      // 检测设备类型或窗口宽度
      const isMobileDeviceType = isMobile();
      const isSmallScreen = window.innerWidth <= 1024;
      setIsMobileDevice(isMobileDeviceType || isSmallScreen);
    };

    // 初始检测
    checkMobile();

    // 监听窗口大小变化
    window.addEventListener("resize", checkMobile);

    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  // 点击菜单项时关闭移动端菜单
  const handleMenuClick = () => {
    setIsMobileMenuOpen(false);
  };


  const homeHref = `/${locale}`;
  const treasuryHref = `/${locale}/treasury`;
  const managementHref = `/${locale}/management`;
  const managementCenterHref = `/${locale}/management-center`;
  const userCenterHref = `/${locale}/user-center`;
  // const ruleHref = `https://pebble-lumber-0be.notion.site/Community-Fund-DAO-v1-1-Web5-23924205dae080ed9290e95519c57ab1`;
  const ruleHref = `https://talk.nervos.org/t/dis-community-fund-dao-v1-1-web5-community-fund-dao-v1-1-web5-optimization-proposal/8973`;
  const createProposalHref = `${homeHref}/proposal/create`;

  const isActive = (href: string) => {
    if (!pathname) return false;
    // 主页需要精确匹配 locale 根
    if (href === homeHref) {
      return pathname === homeHref || pathname === `${homeHref}/`;
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      <div className="header-container">
        <div className="logo">
          <Image
            src={isMobileDevice ? "/nervos-logo-short.svg" : "/header_logo.svg"}
            width={isMobileDevice ? 151 : 330}
            height={isMobileDevice ? 32 : 36}
            alt="CKB Community Fund DAO"
            priority
          />
        </div>

        {/* 桌面端导航 */}
        {!isMobileDevice && (
          <ul className="navs">
            <li>
              <Link href={homeHref} className={isActive(homeHref) ? "active" : ""}>
                {t("header.governanceHome")}
              </Link>
            </li>
            <li>
              <Link
                href={treasuryHref}
                className={isActive(treasuryHref) ? "active" : ""}
              >
                {t("header.treasury")}
              </Link>
            </li>
            <li>
              <Link
                href={managementHref}
                className={isActive(managementHref) ? "active" : ""}
              >
                {t("header.propertyInfo")}
              </Link>
            </li>
            <li>
              <Link
                href={ruleHref}
                target="_blank"
                className={isActive(ruleHref) ? "active" : ""}
              >
                {t("header.governanceRules")}
              </Link>
            </li>
          </ul>
        )}

        <div className="header-actions">
          <LanguageSwitcher />

          {/* 桌面端创建提案按钮 */}
          {!isMobileDevice && (
            <Link href={createProposalHref} className="button-secondary">
              <CiCirclePlus style={{ marginRight: "4px", fontSize: "18px", strokeWidth: "1" }} />
              {t("header.createProposal")}
            </Link>
          )}

          {userInfo ? (
            <div>
              <Link href={userCenterHref}>
                <button className="button-normal user-button">
                  <Avatar
                    did={userInfo?.did}
                    size={20}
                  />
                  <span>{getUserDisplayNameFromStore(userInfo, userProfile)}</span>
                </button>
              </Link>
            </div>
          ) : (
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="button-normal"
            >
              {t("header.login")}
            </button>
          )}

          {/* 移动端菜单按钮 */}
          {isMobileDevice && (
            <button
              className="mobile-menu-button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <IoClose size={24} />
              ) : (
                <IoMenu size={24} />
              )}
            </button>
          )}
        </div>

        {/* 登录弹窗 */}
        <LoginModal
          isOpen={isLoginModalOpen}
          onClose={() => setIsLoginModalOpen(false)}
        />
      </div>

      {/* 移动端侧边栏菜单 */}
      <div className={`mobile-sidebar ${isMobileMenuOpen ? "open" : ""}`}>
        <div className="mobile-sidebar-overlay" onClick={handleMenuClick}></div>
        <div className="mobile-sidebar-content">


          <nav className="mobile-sidebar-nav">
            <Link
              href={homeHref}
              className={`mobile-nav-item ${isActive(homeHref) ? "active" : ""}`}
              onClick={handleMenuClick}
            >
              {t("header.governanceHome")}
            </Link>
            <Link
              href={treasuryHref}
              className={`mobile-nav-item ${isActive(treasuryHref) ? "active" : ""}`}
              onClick={handleMenuClick}
            >
              {t("header.treasury")}
            </Link>
            <Link
              href={managementHref}
              className={`mobile-nav-item ${isActive(managementHref) ? "active" : ""}`}
              onClick={handleMenuClick}
            >
              {t("header.propertyInfo")}
            </Link>
            <Link
              href={managementCenterHref}
              className={`mobile-nav-item ${isActive(managementCenterHref) ? "active" : ""}`}
              onClick={handleMenuClick}
            >
              {t("header.propertyManagement")}
            </Link>
            <Link
              href={ruleHref}
              target="_blank"
              className={`mobile-nav-item ${isActive(ruleHref) ? "active" : ""}`}
              onClick={handleMenuClick}
            >
              {t("header.governanceRules")}
            </Link>
            {/* <Link
              href={createProposalHref}
              className={`mobile-nav-item ${isActive(createProposalHref) ? "active" : ""}`}
              onClick={handleMenuClick}
            >
              {t("header.createProposal")}
            </Link> */}
          </nav>
        </div>
      </div>
    </>
  );
}
