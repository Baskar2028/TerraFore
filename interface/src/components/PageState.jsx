import React from 'react';
import { AlertCircle, Inbox } from 'lucide-react';
import LoadingState from './LoadingState';

/** Standard loading / error / empty wrapper. */
export default function PageState({ loading, error, empty, emptyText = 'No data to show.', onRetry, children }) {
  if (loading) return <div className="tf-card"><div className="tf-card-body"><LoadingState message="Loading..." /></div></div>;
  if (error) {
    return (
      <div className="alert-banner alert-danger" role="alert">
        <AlertCircle size={20} style={{ flexShrink: 0 }} />
        <div>
          <strong>Could not load data.</strong> {error}
          {onRetry && <div style={{ marginTop: 8 }}><button className="btn btn-secondary" onClick={onRetry}>Retry</button></div>}
        </div>
      </div>
    );
  }
  if (empty) {
    return <div className="tf-card"><div className="tf-card-body"><div className="empty-state"><Inbox size={36} className="empty-state-icon" /><div className="empty-state-text">{emptyText}</div></div></div></div>;
  }
  return children;
}
