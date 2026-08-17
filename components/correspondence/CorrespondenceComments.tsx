import React, { useCallback, useEffect, useState } from 'react';
import { MessageSquare } from 'lucide-react';
import type { CorrespondenceComment, CorrespondenceType } from '../../types';
import {
  canShowCorrespondenceComments,
  CORRESPONDENCE_COMMENT_MAX_LENGTH,
  validateCorrespondenceCommentInput,
} from '../../utils/correspondence';
import { formatCorrespondenceAttachmentDateTime } from '../../utils/correspondenceAttachments';
import { getThemeClasses, useTheme } from '../../utils/theme';
import {
  addCorrespondenceComment,
  getCorrespondenceComments,
  getCorrespondenceCommentsErrorMessage,
  isSclCommentsBlockedError,
} from '../../services/correspondenceCommentsApi';

export interface CorrespondenceCommentsProps {
  correspondenceId: string | number;
  correspondenceType: CorrespondenceType | string;
  flowDirection?: string | null;
  onToast?: (message: string, type?: 'success' | 'error') => void;
  className?: string;
}

const CorrespondenceComments: React.FC<CorrespondenceCommentsProps> = ({
  correspondenceId,
  correspondenceType,
  flowDirection,
  onToast,
  className = '',
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);

  const allowed = canShowCorrespondenceComments({ correspondenceType, flowDirection });
  const [comments, setComments] = useState<CorrespondenceComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [draft, setDraft] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadComments = useCallback(async () => {
    if (!allowed || correspondenceId == null) return;
    setLoading(true);
    setLoadError(null);
    try {
      const rows = await getCorrespondenceComments(correspondenceId);
      setComments(rows);
    } catch (err) {
      if (isSclCommentsBlockedError(err)) {
        setBlocked(true);
        setComments([]);
        return;
      }
      setLoadError(getCorrespondenceCommentsErrorMessage(err, 'Failed to load comments.'));
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [allowed, correspondenceId]);

  useEffect(() => {
    if (!allowed) return;
    setBlocked(false);
    setComments([]);
    setDraft('');
    setValidationError(null);
    setLoadError(null);
  }, [allowed, correspondenceId]);

  useEffect(() => {
    if (!allowed || blocked) return;
    void loadComments();
  }, [allowed, blocked, correspondenceId, loadComments]);

  if (!allowed || blocked) {
    return null;
  }

  const inputClass = `w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition-shadow focus:ring-2 focus:ring-blue-500/20 ${themeClasses.input}`;
  const labelClass = `mb-1.5 block text-[10px] font-bold uppercase tracking-widest ${themeClasses.textSecondary}`;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const validation = validateCorrespondenceCommentInput(draft);
    if (validation) {
      setValidationError(validation);
      return;
    }
    setValidationError(null);
    setSubmitting(true);
    try {
      const created = await addCorrespondenceComment(correspondenceId, draft);
      setComments((prev) => [...prev, created]);
      setDraft('');
      onToast?.('Comment added successfully.', 'success');
    } catch (err) {
      if (isSclCommentsBlockedError(err)) {
        setBlocked(true);
        return;
      }
      onToast?.(
        getCorrespondenceCommentsErrorMessage(err, 'Failed to add comment.'),
        'error',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      className={`rounded-2xl border p-4 sm:p-5 ${
        isDarkTheme ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-slate-50/60'
      } ${className}`.trim()}
      aria-labelledby={`correspondence-comments-${correspondenceId}`}
    >
      <div className="mb-4 flex items-center gap-2">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${
            isDarkTheme ? 'bg-indigo-500/15 text-indigo-300' : 'bg-indigo-50 text-indigo-600'
          }`}
        >
          <MessageSquare size={17} aria-hidden="true" />
        </div>
        <h4
          id={`correspondence-comments-${correspondenceId}`}
          className={`text-sm font-black uppercase tracking-tight ${themeClasses.textPrimary}`}
        >
          Comments
        </h4>
      </div>

      {loading ? (
        <div className="space-y-3" aria-live="polite">
          <p className={`text-xs font-medium ${themeClasses.textMuted}`}>Loading comments…</p>
          {Array.from({ length: 2 }).map((_, index) => (
            <div
              key={index}
              className={`h-16 animate-pulse rounded-xl ${isDarkTheme ? 'bg-white/5' : 'bg-slate-100'}`}
            />
          ))}
        </div>
      ) : (
        <>
          {loadError && (
            <p className="mb-3 rounded-lg bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-500" role="alert">
              {loadError}
            </p>
          )}

          {comments.length === 0 && !loadError ? (
            <p className={`mb-4 text-sm ${themeClasses.textMuted}`}>No comments yet.</p>
          ) : (
            <ul className="mb-4 space-y-3">
              {comments.map((row) => (
                <li
                  key={row.id}
                  className={`rounded-xl border px-3.5 py-3 ${
                    isDarkTheme ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-white'
                  }`}
                >
                  <p className={`text-sm font-bold ${themeClasses.textPrimary}`}>
                    {row.commented_by.name}
                  </p>
                  <p className={`mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed ${themeClasses.textSecondary}`}>
                    {row.comment}
                  </p>
                  <p className={`mt-2 text-[11px] tabular-nums ${themeClasses.textMuted}`}>
                    {formatCorrespondenceAttachmentDateTime(row.created_at)}
                  </p>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={(event) => void handleSubmit(event)} className="space-y-3">
            <div>
              <label htmlFor={`correspondence-comment-${correspondenceId}`} className={labelClass}>
                Add a comment
              </label>
              <textarea
                id={`correspondence-comment-${correspondenceId}`}
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                rows={3}
                maxLength={CORRESPONDENCE_COMMENT_MAX_LENGTH}
                placeholder="Add a comment…"
                disabled={submitting}
                aria-invalid={validationError ? true : undefined}
                aria-describedby={
                  validationError ? `correspondence-comment-error-${correspondenceId}` : undefined
                }
                className={inputClass}
              />
            </div>
            {validationError && (
              <p
                id={`correspondence-comment-error-${correspondenceId}`}
                className="text-xs font-bold text-rose-500"
                role="alert"
              >
                {validationError}
              </p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-60"
            >
              {submitting ? 'Adding…' : 'Add Comment'}
            </button>
          </form>
        </>
      )}
    </section>
  );
};

export default React.memo(CorrespondenceComments);
