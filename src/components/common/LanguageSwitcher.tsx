'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useI18n } from '@/contexts/I18nContext';
import { PiGlobeLight } from "react-icons/pi";
import isMobile from "is-mobile";

export default function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const [isClient, setIsClient] = React.useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  useEffect(() => {
    setIsClient(true);

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

  const handleLanguageChange = (newLocale: 'en' | 'zh') => {
    if (!isClient) return;

    setLocale(newLocale);

    // 更新URL路径
    const currentPath = pathname;
    const newPath = currentPath.replace(/^\/[a-z]{2}/, `/${newLocale}`);
    router.push(newPath);
  };

  // 移动端直接切换语言
  const handleMobileToggle = () => {
    const newLocale = locale === 'zh' ? 'en' : 'zh';
    handleLanguageChange(newLocale);
  };

  // 语言选项
  const languages: Array<{ code: 'en' | 'zh', name: string, display: string }> = [
    { code: 'zh', name: '简体中文', display: 'ZH' },
    { code: 'en', name: 'English', display: 'EN' }
  ];

  const currentLanguage = languages.find(lang => lang.code === locale) || languages[0];

  // 移动端：只显示当前语言，点击切换
  if (isMobileDevice) {
    return (
      <div className="language-switcher-container">
        <button
          className="language-switcher"
          onClick={handleMobileToggle}
        >
          {currentLanguage.display}
        </button>
      </div>
    );
  }

  // 桌面端：显示图标+语言，hover显示下拉菜单
  return (
    <div
      className="language-switcher-container"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button className="language-switcher">
        <PiGlobeLight />
        {currentLanguage.display}
      </button>

      {isHovered && (
        <div className="language-dropdown">
          {languages.map((language) => (
            <button
              key={language.code}
              className={`language-option ${language.code === locale ? 'active' : ''}`}
              onClick={() => handleLanguageChange(language.code)}
            >
              {language.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
