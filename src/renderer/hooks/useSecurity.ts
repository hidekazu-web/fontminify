import { useCallback, useEffect } from 'react';
import { validateFileExtension, validateFileSize, sanitizeFileName, logSecurityEvent } from '../../shared/security';

/**
 * セキュリティ関連のフック
 */
export const useSecurity = () => {
  // ファイル検証
  const validateFile = useCallback((file: File) => {
    const errors: string[] = [];
    
    // ファイル拡張子の検証
    if (!validateFileExtension(file.name)) {
      errors.push('サポートされていないファイル形式です');
      logSecurityEvent('INVALID_FILE_EXTENSION', { filename: file.name });
    }
    
    // ファイルサイズの検証
    if (!validateFileSize(file.size)) {
      errors.push('ファイルサイズが制限を超えています（最大100MB）');
      logSecurityEvent('FILE_SIZE_EXCEEDED', { filename: file.name, size: file.size });
    }
    
    // ファイル名の検証
    const sanitizedName = sanitizeFileName(file.name);
    if (sanitizedName !== file.name) {
      errors.push('ファイル名に不正な文字が含まれています');
      logSecurityEvent('INVALID_FILENAME', { original: file.name, sanitized: sanitizedName });
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      sanitizedName
    };
  }, []);
  
  // セキュリティイベントのログ
  const logEvent = useCallback((event: string, details?: Record<string, unknown>) => {
    logSecurityEvent(event, details);
  }, []);
  
  // CSP違反の監視
  useEffect(() => {
    const handleCSPViolation = (event: SecurityPolicyViolationEvent) => {
      logSecurityEvent('CSP_VIOLATION', {
        blockedURI: event.blockedURI,
        documentURI: event.documentURI,
        effectiveDirective: event.effectiveDirective,
        originalPolicy: event.originalPolicy,
        referrer: event.referrer,
        violatedDirective: event.violatedDirective
      });
    };
    
    document.addEventListener('securitypolicyviolation', handleCSPViolation);
    
    return () => {
      document.removeEventListener('securitypolicyviolation', handleCSPViolation);
    };
  }, []);
  
  // エラー監視
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      logSecurityEvent('JAVASCRIPT_ERROR', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack
      });
    };
    
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      logSecurityEvent('UNHANDLED_PROMISE_REJECTION', {
        reason: event.reason,
        stack: event.reason?.stack
      });
    };
    
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);
  
  return {
    validateFile,
    logEvent,
    sanitizeFileName
  };
};