'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { MdCheck, MdEdit } from "react-icons/md";
import { FaDiscord, FaTelegramPlane } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import useUserInfoStore from "@/store/userInfo";
import { useTranslation } from "@/utils/i18n";
import Avatar from "@/components/common/Avatar";
import { getUserDisplayNameFromStore } from "@/utils/userDisplayUtils";
import storage from "@/lib/storage";
import { useWallet } from "@/provider/WalletProvider";

interface UserProfileCardProps {
  className?: string;
}

export default function UserProfileCard({ className = '' }: UserProfileCardProps) {
  const { t, locale } = useTranslation();
  const { userInfo, userProfile, logout } = useUserInfoStore();
  const { isConnected, disconnect } = useWallet();

  const [isEditing, setIsEditing] = useState(false);
  const [expandedConnection, setExpandedConnection] = useState<string | null>(null);
  const [showLogoutButton, setShowLogoutButton] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const dateAreaRef = useRef<HTMLParagraphElement>(null);

  // 格式化加入日期
  const joinDate = useMemo(() => {
    const createdDate = userProfile?.created;
    if (!createdDate) return '';

    try {
      const date = new Date(createdDate);
      if (isNaN(date.getTime())) return '';

      if (locale === 'zh') {
        // 中文格式：2025年1月1日
        return date.toLocaleDateString('zh-CN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      } else {
        // 英文格式：January 1, 2025
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      }
    } catch {
      return '';
    }
  }, [userProfile?.created, locale]);

  const [userName, setUserName] = useState(getUserDisplayNameFromStore(userInfo, userProfile));

  // 当 userProfile 或 userInfo 更新时，更新 userName
  useEffect(() => {
    if (!isEditing) {
      const displayName = getUserDisplayNameFromStore(userInfo, userProfile);
      if (displayName) {
        setUserName(displayName);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userInfo?.did, userInfo?.handle, userProfile?.displayName, isEditing]);

  const nervosTalk = <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M5 8.64583V5L19 5.03646V8.64583H15.6283V15.3542L11.9634 19V5.14583L8.44503 8.64583H5Z" fill="white" />
  </svg>
    ;

  const socialConnections = [
    {
      id: 'nervos-talk',
      name: t('userProfile.connectWithNervosTalk'),
      icon: nervosTalk,
      connected: false,
      username: null
    },
    {
      id: 'x-twitter',
      name: t('userProfile.connectWithX'),
      icon: <FaXTwitter />,
      connected: false,
      username: null
    },
    {
      id: 'discord',
      name: t('userProfile.connectWithDiscord'),
      icon: <FaDiscord color='#5865F2' />,
      connected: true,
      username: null
    },
    {
      id: 'telegram',
      name: t('userProfile.connectWithTelegram'),
      icon: <FaTelegramPlane color='#0088cc' />,
      connected: false,
      username: null
    },
  ];

  const handleConnectionClick = (connectionId: string) => {
    if (expandedConnection === connectionId) {
      setExpandedConnection(null);
    } else {
      setExpandedConnection(connectionId);
    }
  };

  const handleConnect = (connectionId: string) => {
    console.log(t('userProfile.connectLog', { connectionId }));
    // 这里可以添加实际的连接逻辑
    setExpandedConnection(null);
  };

  const handleUnbind = (connectionId: string) => {
    console.log(t('userProfile.unbindLog', { connectionId }));
    // 这里可以添加实际的解绑逻辑
    setExpandedConnection(null);
  };

  // 处理日期区域双击事件
  const handleDateAreaDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setShowLogoutButton(!showLogoutButton);
  };

  // 处理登出
  const handleLogout = async () => {
    try {
      // 断开钱包连接
      if (isConnected) {
        try {
          await disconnect();
        } catch (err) {
          console.error("断开连接失败:", err);
        }
      }
      // 调用 store 的 logout 方法（清除 store 状态）
      logout();
      // 清除所有 localStorage
      storage.clear();
      // 刷新页面
      window.location.reload();
    } catch (err) {
      console.error("登出失败:", err);
    }
  };

  // 点击外部区域关闭展开菜单和登出按钮
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      // 检查点击是否在卡片外部，或者不在日期容器和登出按钮内
      if (cardRef.current && !cardRef.current.contains(target)) {
        setExpandedConnection(null);
        setShowLogoutButton(false);
      } else if (dateAreaRef.current && !dateAreaRef.current.contains(target)) {
        // 如果点击在卡片内但不在日期区域内，也关闭登出按钮（除非点击的是登出按钮本身）
        const logoutButton = (event.target as HTMLElement).closest('.logout-button');
        if (!logoutButton) {
          setShowLogoutButton(false);
        }
      }
    };

    // 使用 click 事件而不是 mousedown，避免干扰双击事件
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  return (
    <div ref={cardRef} className={`user-profile-card ${className} user-profile-card-disabled`}>
      <div className="disabled-overlay"></div>
      <div className="user-info">
        <div className="user-avatar">
          <Avatar
            did={userInfo?.did}
            size={64}
          />
          <div className="avatar-edit-icon">
            <MdEdit />
          </div>
        </div>
        <div className="user-name-section">
          {isEditing ? (
            <div className="user-name-edit-container">
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="user-name-input"
                onKeyPress={(e) => e.key === 'Enter' && setIsEditing(false)}
                autoFocus
              />
              <button
                className="user-name-confirm-button"
                onClick={() => setIsEditing(false)}
              >
                <MdCheck />
              </button>
            </div>
          ) : (
            <h2 className="user-name" onClick={() => setIsEditing(true)}>
              {userName}
            </h2>
          )}
          <div
            className="join-date-container"
            style={{
              position: 'relative',
              display: 'inline-block',
              pointerEvents: 'auto',
              zIndex: 101,
            }}
          >
            <p
              ref={dateAreaRef}
              className="join-date"
              onDoubleClick={handleDateAreaDoubleClick}
              style={{
                cursor: 'pointer',
                userSelect: 'none',
                pointerEvents: 'auto',
                position: 'relative',
                zIndex: 101,
              }}
            >
              {t('userProfile.joinedOn', { date: joinDate })}
            </p>
            {showLogoutButton && (
              <button
                className="logout-button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleLogout();
                }}
                onMouseDown={(e) => e.stopPropagation()}
                style={{
                  position: 'absolute',
                  left: '100%',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  marginLeft: '8px',
                  padding: '4px 12px',
                  backgroundColor: '#ff4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  whiteSpace: 'nowrap',
                  zIndex: 1002,
                  pointerEvents: 'auto',
                }}
              >
                {t('logout')}
              </button>
            )}
          </div>
        </div>


      </div>

      <div className="social-connections">
        {socialConnections.map((connection) => (
          <div key={connection.id} className="connection-item">
            <button
              className={`connection-button ${connection.connected ? 'connected' : ''}`}
              onClick={() => handleConnectionClick(connection.id)}
            >
              <div className="connection-info">
                <span className="connection-name">
                  {connection.connected && connection.username
                    ? connection.username
                    : connection.name
                  }
                </span>
                <span className="connection-icon">{connection.icon}</span>
              </div>
              {expandedConnection === connection.id && (
                <div className="connection-actions">
                  {connection.connected ? (
                    <button
                      className="unbind-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUnbind(connection.id);
                      }}
                    >
                      {t('userProfile.unbindAccount')}
                    </button>
                  ) : (
                    <button
                      className="connect-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleConnect(connection.id);
                      }}
                    >
                      {t('userProfile.connect')}
                    </button>
                  )}
                </div>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
