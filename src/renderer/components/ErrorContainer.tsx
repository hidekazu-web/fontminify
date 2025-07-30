import React from 'react';
import { useFontStore } from '../stores/fontStore';
import ErrorNotification from './ErrorNotification';

const ErrorContainer: React.FC = () => {
  const { errors, removeError } = useFontStore();

  if (errors.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {errors.map((error, index) => (
        <ErrorNotification
          key={`${error.timestamp}-${index}`}
          error={error}
          onDismiss={() => removeError(index)}
          autoHide={true}
        />
      ))}
    </div>
  );
};

export default ErrorContainer;