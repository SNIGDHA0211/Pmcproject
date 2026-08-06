/**
 * Turn backend / validation failures into short messages users can act on.
 * Handles DRF field maps, { success, message, errors: [] }, and nested lists.
 */

const FIELD_LABELS: Record<string, string> = {
  name: 'Project name',
  title: 'Project name',
  project_name: 'Project name',
  location: 'Location',
  project_start: 'Project start',
  contract_finish: 'Contract finish',
  forecast_finish: 'Forecast finish',
  original_contract_value: 'Original contract value',
  approved_vo: 'Approved VO',
  pending_vo: 'Pending VO',
  bac: 'Budget at completion (BAC)',
  working_hours_per_day: 'Working hours/day',
  working_days_per_month: 'Working days/month',
  assigned_users: 'Assigned users',
  project: 'Project',
  project_id: 'Project',
  job_no: 'Job number',
  report_date: 'Date',
  date: 'Date',
  scope: 'Scope',
  scope_id: 'Scope',
  executed_quantity: 'Executed quantity',
  planned_quantity: 'Planned quantity',
  remaining_quantity: 'Remaining quantity',
  cumulative_quantity: 'Cumulative quantity',
  remarks: 'Remarks',
  next_day_planned_work: 'Next day planned work',
  unresolved_issues: 'Unresolved issues',
  pending_letters: 'Pending letters',
  quality_status: 'Quality status',
  bill_status: 'Billing status',
  gfc_status: 'GFC status',
  issued_by: 'Issued by',
  designation: 'Designation',
  activities: 'Activities',
  password: 'Password',
  new_password: 'New password',
  confirm_password: 'Confirm password',
  username: 'Username',
  email: 'Email',
  role: 'Role',
  project_ids: 'Projects',
  projects: 'Projects',
  billing_status: 'Billing status',
  completion_notes: 'Completion notes',
  billing_completion_notes: 'Billing notes',
  non_field_errors: 'Form',
  detail: 'Error',
  message: 'Error',
};

const SKIP_BODY_KEYS = new Set([
  'success',
  'status',
  'code',
  'status_code',
  'statusCode',
]);

function humanFieldLabel(field: string): string {
  const key = field.trim();
  if (!key) return 'Field';
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  if (FIELD_LABELS[key.toLowerCase()]) return FIELD_LABELS[key.toLowerCase()];
  return key
    .replace(/\[\d+\]/g, '')
    .replace(/[_.\[\]]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function flattenErrorValue(value: unknown): string {
  if (value == null || value === '') return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    return value.map(flattenErrorValue).filter(Boolean).join(' ');
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (typeof record.message === 'string' && record.message.trim()) {
      const field =
        typeof record.field === 'string' ? humanFieldLabel(record.field) : '';
      return field ? `${field}: ${record.message.trim()}` : record.message.trim();
    }
    if (typeof record.detail === 'string' && record.detail.trim()) {
      return record.detail.trim();
    }
    return Object.entries(record)
      .map(([key, nested]) => {
        if (SKIP_BODY_KEYS.has(key)) return '';
        const text = flattenErrorValue(nested);
        if (!text) return '';
        if (key === 'non_field_errors') return text;
        return `${humanFieldLabel(key)}: ${text}`;
      })
      .filter(Boolean)
      .join(' · ');
  }
  return '';
}

function collectFieldMessages(body: Record<string, unknown>): string[] {
  const messages: string[] = [];

  const errors = body.errors;
  if (Array.isArray(errors) && errors.length > 0) {
    for (const entry of errors) {
      const text = flattenErrorValue(entry);
      if (text) messages.push(text);
    }
  } else if (errors && typeof errors === 'object' && !Array.isArray(errors)) {
    const text = flattenErrorValue(errors);
    if (text) messages.push(text);
  }

  for (const [key, value] of Object.entries(body)) {
    if (SKIP_BODY_KEYS.has(key)) continue;
    if (key === 'errors' || key === 'message' || key === 'detail' || key === 'error') {
      continue;
    }
    if (value == null || value === '') continue;
    if (typeof value === 'object' && !Array.isArray(value) && !(value as Record<string, unknown>).message) {
      // Nested serializer errors: { activities: [{ scope: ["..."] }] }
      const nested = flattenErrorValue(value);
      if (nested) {
        messages.push(
          nested.includes(':') ? nested : `${humanFieldLabel(key)}: ${nested}`,
        );
      }
      continue;
    }
    const text = flattenErrorValue(value);
    if (!text) continue;
    if (key === 'non_field_errors') {
      messages.push(text);
    } else {
      messages.push(`${humanFieldLabel(key)}: ${text}`);
    }
  }

  return messages;
}

function readAxiosBody(error: unknown): Record<string, unknown> | string | null {
  if (!error || typeof error !== 'object') return null;
  const anyErr = error as {
    response?: { data?: unknown; status?: number };
    data?: unknown;
    message?: string;
  };
  const data = anyErr.response?.data ?? anyErr.data;
  if (typeof data === 'string') return data;
  if (data && typeof data === 'object') return data as Record<string, unknown>;
  return null;
}

export type UserFacingErrorOptions = {
  fallback?: string;
  /** Extra context, e.g. form name */
  context?: string;
};

/**
 * Convert any API / thrown error into one plain sentence for banners and toasts.
 */
export function formatUserFacingError(
  error: unknown,
  options: UserFacingErrorOptions = {},
): string {
  const fallback = options.fallback ?? 'Unable to save. Please check your input and try again.';
  const body = readAxiosBody(error);

  if (typeof body === 'string') {
    const trimmed = body.trim();
    if (!trimmed) return fallback;
    if (/<(?:!doctype|html)\b/i.test(trimmed)) return fallback;
    return trimmed;
  }

  if (body) {
    const fieldMessages = collectFieldMessages(body);
    if (fieldMessages.length > 0) {
      const unique = [...new Set(fieldMessages.map((m) => m.trim()).filter(Boolean))];
      return unique.join(' · ');
    }

    const top =
      flattenErrorValue(body.message) ||
      flattenErrorValue(body.detail) ||
      flattenErrorValue(body.error);
    if (top) {
      // Generic backend save failure with empty errors — add a usable hint
      if (
        /unable to save this record/i.test(top) ||
        /please check your input/i.test(top)
      ) {
        return `${top} Check required fields match what the server expects (dates, numbers, and names), then try again.`;
      }
      return top;
    }
  }

  const status =
    error && typeof error === 'object'
      ? (error as { response?: { status?: number } }).response?.status
      : undefined;

  if (status === 401) {
    return 'Your session expired. Please sign in again.';
  }
  if (status === 403) {
    return 'You do not have permission to do this.';
  }
  if (status === 404) {
    return 'The requested record was not found. Refresh and try again.';
  }
  if (status === 400) {
    return options.context
      ? `${options.context}: some fields are missing or invalid. Please review the form and try again.`
      : 'Some fields are missing or invalid. Please review the form and try again.';
  }
  if (status && status >= 500) {
    return 'The server had a problem saving this. Please try again in a moment.';
  }

  if (
    error &&
    typeof error === 'object' &&
    typeof (error as { message?: string }).message === 'string' &&
    (error as { message: string }).message &&
    !(error as { response?: unknown }).response
  ) {
    const msg = (error as { message: string }).message.trim();
    if (/network error/i.test(msg)) {
      return 'Unable to connect to the server. Check your network and try again.';
    }
    if (msg && msg !== 'Error') return msg;
  }

  return fallback;
}

/** Friendly label for a backend field key (for inline field errors). */
export function formatFieldLabel(field: string): string {
  return humanFieldLabel(field);
}

/**
 * Parse DRF-style payload into { fieldKey: message } for inline form highlighting.
 */
export function extractUserFacingFieldErrors(
  error: unknown,
): Record<string, string> {
  const body = readAxiosBody(error);
  if (!body || typeof body === 'string') return {};

  const out: Record<string, string> = {};
  const source =
    body.errors && typeof body.errors === 'object' && !Array.isArray(body.errors)
      ? (body.errors as Record<string, unknown>)
      : body;

  for (const [key, value] of Object.entries(source)) {
    if (SKIP_BODY_KEYS.has(key) || key === 'message' || key === 'detail' || key === 'error') {
      continue;
    }
    if (key === 'errors' && Array.isArray(value)) {
      value.forEach((entry, index) => {
        if (entry && typeof entry === 'object') {
          const row = entry as Record<string, unknown>;
          const field = typeof row.field === 'string' ? row.field : `item_${index}`;
          const text = flattenErrorValue(row.message ?? entry);
          if (text) out[field] = text;
        }
      });
      continue;
    }
    const text = flattenErrorValue(value);
    if (text) out[key] = text;
  }

  return out;
}
