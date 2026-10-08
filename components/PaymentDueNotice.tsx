import React from 'react';
import { AlertTriangle, CalendarClock } from 'lucide-react';
import type { User } from '../types';
import { PAYMENT_NOTICE, daysUntilPortalPause } from '../config/paymentNotice';
import './paymentDueNotice.css';

function formatPauseDate(value: string): string {
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return value;
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const PaymentDueNotice: React.FC<{ user: User; isDark: boolean }> = ({ user, isDark }) => {
  if (!PAYMENT_NOTICE.enabled || !PAYMENT_NOTICE.roles.includes(user.role)) return null;

  const days = daysUntilPortalPause();
  if (days == null) return null;

  const dateLabel = formatPauseDate(PAYMENT_NOTICE.pauseDate);
  const isUrgent = days <= 3;

  let message: React.ReactNode;
  let countdown: string;
  if (days > 1) {
    message = (
      <>
        Payment for PMC Portal services is overdue. Portal access will be{' '}
        <strong>temporarily paused in {days} days (on {dateLabel})</strong> unless outstanding dues are
        cleared. Please coordinate with your accounts team to avoid any interruption.
      </>
    );
    countdown = `${days} days left`;
  } else if (days === 1) {
    message = (
      <>
        Payment for PMC Portal services is overdue. Portal access will be{' '}
        <strong>temporarily paused tomorrow ({dateLabel})</strong> unless outstanding dues are cleared.
        Please arrange settlement at the earliest.
      </>
    );
    countdown = '1 day left';
  } else if (days === 0) {
    message = (
      <>
        Portal access is <strong>scheduled to be paused today ({dateLabel})</strong> due to overdue
        payment. Please clear outstanding dues immediately to continue uninterrupted service.
      </>
    );
    countdown = 'Pausing today';
  } else {
    message = (
      <>
        Payment for PMC Portal services remains overdue and access is <strong>due to be paused</strong>.
        Please clear outstanding dues immediately to continue uninterrupted service.
      </>
    );
    countdown = 'Overdue';
  }

  return (
    <div
      className={`pmc-pay-notice ${isDark ? 'is-dark' : 'is-light'} ${isUrgent ? 'is-urgent' : ''}`}
      role="status"
      aria-live="polite"
    >
      <span className="pmc-pay-notice-icon" aria-hidden="true">
        <AlertTriangle size={16} strokeWidth={2.4} />
      </span>
      <p className="pmc-pay-notice-text">
        <span className="pmc-pay-notice-title">Payment Overdue — Service Continuity Notice</span>
        <span className="pmc-pay-notice-body">{message}</span>
      </p>
      <span className="pmc-pay-notice-chip">
        <CalendarClock size={13} strokeWidth={2.4} aria-hidden="true" />
        {countdown}
      </span>
    </div>
  );
};

export default PaymentDueNotice;
