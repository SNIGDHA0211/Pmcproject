import { describe, expect, it } from 'vitest';
import {
  canShowCorrespondenceComments,
  validateCorrespondenceCommentInput,
} from '../utils/correspondence';
import {
  isSclCommentsBlockedError,
  normalizeCorrespondenceComment,
} from '../services/correspondenceCommentsApi';

describe('canShowCorrespondenceComments', () => {
  it('shows comments for Client correspondence', () => {
    expect(
      canShowCorrespondenceComments({
        correspondenceType: 'CLIENT',
        flowDirection: 'INBOUND',
      }),
    ).toBe(true);
  });

  it('shows comments for Contractor correspondence', () => {
    expect(
      canShowCorrespondenceComments({
        correspondenceType: 'CONTRACTOR',
        flowDirection: 'INBOUND',
      }),
    ).toBe(true);
  });

  it('hides comments for SCL Delivered (OUTBOUND_SCL)', () => {
    expect(
      canShowCorrespondenceComments({
        correspondenceType: 'CLIENT',
        flowDirection: 'OUTBOUND_SCL',
      }),
    ).toBe(false);
  });

  it('hides comments for unrelated types', () => {
    expect(
      canShowCorrespondenceComments({
        correspondenceType: 'OTHER',
        flowDirection: 'INBOUND',
      }),
    ).toBe(false);
  });
});

describe('validateCorrespondenceCommentInput', () => {
  it('rejects empty comment', () => {
    expect(validateCorrespondenceCommentInput('   ')).toBe('Comment cannot be empty.');
  });

  it('accepts valid comment', () => {
    expect(validateCorrespondenceCommentInput('Please review the attached drawing.')).toBeNull();
  });
});

describe('normalizeCorrespondenceComment', () => {
  it('normalizes backend comment shape', () => {
    expect(
      normalizeCorrespondenceComment({
        id: 44,
        comment: 'Please review the attached drawing.',
        commented_by: { id: 23, name: 'Team Leader' },
        created_at: '2026-08-17T10:15:00Z',
      }),
    ).toEqual({
      id: 44,
      comment: 'Please review the attached drawing.',
      commented_by: { id: 23, name: 'Team Leader' },
      created_at: '2026-08-17T10:15:00Z',
    });
  });
});

describe('isSclCommentsBlockedError', () => {
  it('detects SCL delivered protection message', () => {
    expect(
      isSclCommentsBlockedError({
        response: {
          status: 400,
          data: {
            message: 'Comments are not available for SCL Delivered correspondence.',
          },
        },
      }),
    ).toBe(true);
  });
});
