"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import getPDSClient from "@/lib/pdsClient";
import { USER_DOMAIN } from "@/constant/Network";
import { Secp256k1Keypair } from "@atproto/crypto";
import { useTranslation } from "@/utils/i18n";

interface ValidationResult {
  valid: boolean;
  error: string | null;
}

export function useAccountNameValidation() {
  const { t } = useTranslation();
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<boolean | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const validateAccountName = useCallback(async (name: string): Promise<ValidationResult> => {
    // 只允许字母、数字、连字符
    if (!/^[a-zA-Z0-9-]+$/.test(name)) {
      return { valid: false, error: t("validation.onlyLettersNumbersHyphens") };
    }
    // 不允许下划线
    if (name.includes("_")) {
      return { valid: false, error: t("validation.noUnderscore") };
    }
    // 不能以连字符开头或结尾
    if (name.startsWith("-") || name.endsWith("-")) {
      return { valid: false, error: t("validation.noHyphenStartEnd") };
    }
    // 长度校验
    if (name.length < 4 || name.length > 18) {
      return { valid: false, error: t("validation.lengthRequirement") };
    }
    
    try {
      const keyPair = await Secp256k1Keypair.create();
      const signingKey = keyPair.did();

      // 验证账户名是否可用
      // 注意：这里使用一个临时 DID 来检查账户名是否已被占用
      // 因为此时账户还未创建，所以使用一个占位符 DID
      const res = await getPDSClient().fans.web5.ckb.preCreateAccount({
        handle: name + `.${USER_DOMAIN}`,
        signingKey,
        did: 'did:ckb:n5d3aggygtfxs56gbjkcajxw', // 临时 DID，仅用于验证账户名可用性
      });
      console.log(res, 'res');
      return { valid: true, error: null };
    } catch (error) {
      console.error('Validation error:', error);
      return { valid: false, error: t("validation.accountNameUnavailable") };
    }
  }, [t]);

  const debouncedValidateAccountName = useCallback((name: string) => {
    // Clear existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Set validation state
    setIsValidating(true);
    setValidationResult(null);
    setValidationError(null);

    // Set new timer
    debounceTimer.current = setTimeout(async () => {
      const result = await validateAccountName(name);
      setValidationResult(result.valid);
      setValidationError(result.error);
      setIsValidating(false);
    }, 500); // 500ms debounce delay
  }, [validateAccountName]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  return {
    isValidating,
    validationResult,
    validationError,
    debouncedValidateAccountName,
  };
}
