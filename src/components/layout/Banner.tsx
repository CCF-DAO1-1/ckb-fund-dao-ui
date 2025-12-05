"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import isMobile from "is-mobile";

export default function Banner() {
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

  // 移动端：使用移动端图片
  if (isMobileDevice) {
    return (
      <div className="banner banner-mobile">
        <Image
          src="/slogan-m.svg"
          alt="banner"
          width={640}
          height={80}
          priority
        />
      </div>
    );
  }

  // 桌面端：使用桌面端图片
  return (
    <div className="banner banner-desktop">
      <Image
        src="/slogan.svg"
        alt="banner"
        width={1104}
        height={100}
        priority
      />
    </div>
  );
}
