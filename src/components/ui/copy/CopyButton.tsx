'use client';

import React from 'react';
import './CopyButton.css';
import { FaCopy } from 'react-icons/fa';
import { handleCopy } from '@/utils/common';
import { useTranslation } from '@/utils/i18n';

interface CopyButtonProps {
  text: string;
  className?: string;
  ariaLabel?: string;
  onCopied?: () => void;
  children?: React.ReactNode;
  iconSize?: number;
  title?: string;
  style?: React.CSSProperties;
}

export default function CopyButton({
  text,
  className = '',
  ariaLabel,
  onCopied,
  children,
  iconSize,
  title,
  style,
}: CopyButtonProps) {
  const { t } = useTranslation();

  const onClick = () => {
    handleCopy(text, t("copy.success"));
    if (onCopied) onCopied();
  };

  return (
    <button
      className={`copy-button-reset ${className}`}
      onClick={onClick}
      aria-label={ariaLabel}
      title={title}
      type="button"
      style={style}
    >
      {children ?? <FaCopy size={iconSize} />}
    </button>
  );
}


