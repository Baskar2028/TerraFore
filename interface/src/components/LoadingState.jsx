import React from 'react';

export default function LoadingState({ message = 'Analyzing project...' }) {
  return (
    <div className="loading-state-wrapper" role="status" aria-live="polite">
      <div className="spinner" aria-hidden="true" />
      <div className="empty-state-text">{message}</div>
    </div>
  );
}
