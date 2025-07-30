import { useState, useCallback } from 'react';
import { AppError, FontMinifyError, handleError } from '../../shared/errors';

interface ErrorState {
  errors: AppError[];
  hasErrors: boolean;
}

interface UseErrorHandlerReturn {
  errors: AppError[];
  hasErrors: boolean;
  addError: (error: unknown, filePath?: string) => void;
  removeError: (index: number) => void;
  clearErrors: () => void;
  handleAsyncError: <T>(promise: Promise<T>, filePath?: string) => Promise<T | null>;
}

export const useErrorHandler = (): UseErrorHandlerReturn => {
  const [state, setState] = useState<ErrorState>({
    errors: [],
    hasErrors: false,
  });

  const addError = useCallback((error: unknown, filePath?: string) => {
    const fontMinifyError = handleError(error, filePath);
    const appError = fontMinifyError.toJSON();

    setState(prevState => ({
      errors: [...prevState.errors, appError],
      hasErrors: true,
    }));

    // コンソールにもログ出力
    console.error('FontMinify Error:', fontMinifyError);
  }, []);

  const removeError = useCallback((index: number) => {
    setState(prevState => {
      const newErrors = prevState.errors.filter((_, i) => i !== index);
      return {
        errors: newErrors,
        hasErrors: newErrors.length > 0,
      };
    });
  }, []);

  const clearErrors = useCallback(() => {
    setState({
      errors: [],
      hasErrors: false,
    });
  }, []);

  const handleAsyncError = useCallback(async <T>(
    promise: Promise<T>,
    filePath?: string
  ): Promise<T | null> => {
    try {
      return await promise;
    } catch (error) {
      addError(error, filePath);
      return null;
    }
  }, [addError]);

  return {
    errors: state.errors,
    hasErrors: state.hasErrors,
    addError,
    removeError,
    clearErrors,
    handleAsyncError,
  };
};