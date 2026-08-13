/**
 * PMC Portal Terms & Conditions — Shrikhande Consultants Limited
 */
import React, { useEffect } from 'react';
import { Icons } from './Icons';
import { OFFICE } from './landing/LandingOfficeMap';

interface TermsAndConditionsProps {
  onClose: () => void;
}

const CONTACT = {
  phoneDisplay: '+91-22-2784 4440 / 3305 / 4199 / 0751',
  email: 'scplvashi@gmail.com',
} as const;

const TERMS_VERSION = '1.0';
const LAST_UPDATED = 'August 2026';
const COPYRIGHT_YEAR = 2026;

const TermsAndConditions: React.FC<TermsAndConditionsProps> = ({ onClose }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      className="pmc-terms"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pmc-terms-title"
    >
      <button type="button" className="pmc-terms__backdrop" aria-label="Close" onClick={onClose} />

      <div className="pmc-terms__dialog">
        <header className="pmc-terms__header">
          <div className="pmc-terms__header-copy">
            <p className="pmc-terms__eyebrow">PMC Portal · Legal</p>
            <h2 id="pmc-terms-title" className="pmc-terms__title">
              Terms &amp; Conditions
            </h2>
            <p className="pmc-terms__meta">
              Version {TERMS_VERSION} · Last updated {LAST_UPDATED}
            </p>
          </div>
          <button type="button" className="pmc-terms__close" onClick={onClose} aria-label="Close">
            <Icons.Reject size={20} />
          </button>
        </header>

        <div className="pmc-terms__body">
          <p className="pmc-terms__intro">
            These Terms &amp; Conditions govern access to and use of the <strong>PMC Portal</strong>{' '}
            operated by <strong>{OFFICE.company}</strong> (“Shrikhande”, “we”, “us”). By signing in
            or using the Portal, you agree to these terms on behalf of yourself and, where
            applicable, your employer or project party.
          </p>

          <section className="pmc-terms__section">
            <h3>1. Operator &amp; contact</h3>
            <p>
              The Portal is provided for authorised personnel of Shrikhande Consultants Limited and
              approved project stakeholders for civil / construction PMC delivery.
            </p>
            <address className="pmc-terms__address">
              <span className="pmc-terms__address-label">{OFFICE.title}</span>
              <strong>{OFFICE.company}</strong>
              {OFFICE.lines.map((line) => (
                <span key={line}>{line}</span>
              ))}
              <span>
                Phone:{' '}
                <a href={`tel:+912227844440`}>{CONTACT.phoneDisplay}</a>
              </span>
              <span>
                Email:{' '}
                <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
              </span>
            </address>
          </section>

          <section className="pmc-terms__section">
            <h3>2. Authorised access</h3>
            <p>
              Access is limited to credentials issued by Shrikhande. You must keep your username and
              password confidential, and you are responsible for activity under your account.
              Role-based permissions (for example PMC Head, Team Lead, Site Engineer, Billing) define
              what you may view or update. Sharing accounts or attempting to access another role’s
              data without authorisation is prohibited.
            </p>
          </section>

          <section className="pmc-terms__section">
            <h3>3. Acceptable use of the Portal</h3>
            <p>
              You may use the Portal only for legitimate project management, reporting, and PMC
              governance purposes, including (as applicable) project registry, schedule and dates,
              DPR / WPR / MPR, financial and contract tracks, drawing register, correspondence,
              HSE / quality records, site and testing photos, meeting documents, reminders, and
              alerts. You must not misuse the system, upload unlawful content, or interfere with
              Portal security or integrity.
            </p>
          </section>

          <section className="pmc-terms__section">
            <h3>4. Accuracy of submitted data</h3>
            <p>
              Users who submit or approve site progress, manpower, plant &amp; machinery, financial
              figures, drawings, correspondence status, HSE incidents, or other project records must
              ensure the information is accurate and timely to the best of their knowledge.
              Deliberate falsification or material omission may lead to account suspension and
              escalation to project leadership.
            </p>
          </section>

          <section className="pmc-terms__section">
            <h3>5. Confidentiality &amp; intellectual property</h3>
            <p>
              Project data, drawings, reports, commercial information, and other materials in the
              Portal are confidential. They remain the property of the respective client, contractor,
              or Shrikhande as applicable under project agreements. You may not copy, export, or
              disclose Portal content except as required for your authorised role or as permitted by
              Shrikhande / the project owner.
            </p>
            <p>
              The PMC Portal software, branding, and related materials are protected by copyright and
              other intellectual property rights belonging to Shrikhande Consultants Limited and/or
              its licensors. © {COPYRIGHT_YEAR} Shrikhande Consultants Limited. All rights reserved.
            </p>
          </section>

          <section className="pmc-terms__section">
            <h3>6. HSE &amp; compliance records</h3>
            <p>
              Where HSE or quality modules are used, significant incidents and required monthly
              safety / quality updates should be recorded through the Portal as directed by project
              procedures. Portal entries support governance and may be used in reviews; they do not
              replace statutory reporting obligations under applicable Indian law.
            </p>
          </section>

          <section className="pmc-terms__section">
            <h3>7. Audit &amp; monitoring</h3>
            <p>
              Actions in the Portal (including submissions, approvals, and status changes) may be
              logged for security, audit, billing reconciliation, and project governance. Use of the
              Portal constitutes acknowledgement that such records may be reviewed by authorised
              Shrikhande personnel and, where required, by clients or regulators.
            </p>
          </section>

          <section className="pmc-terms__section">
            <h3>8. Availability &amp; liability</h3>
            <p>
              The Portal is provided for business use on an “as available” basis. Shrikhande does
              not warrant uninterrupted or error-free operation. To the extent permitted by law,
              Shrikhande is not liable for indirect or consequential loss arising from use of, or
              inability to use, the Portal. Nothing in these terms excludes liability that cannot be
              excluded under applicable law.
            </p>
          </section>

          <section className="pmc-terms__section">
            <h3>9. Governing law</h3>
            <p>
              These terms are governed by the laws of India. Subject to mandatory legal provisions,
              disputes shall be subject to the exclusive jurisdiction of the courts at Navi Mumbai /
              Mumbai, Maharashtra. Electronic records and communications related to the Portal are
              also subject to the Information Technology Act, 2000 and applicable rules.
            </p>
          </section>

          <section className="pmc-terms__section">
            <h3>10. Changes</h3>
            <p>
              Shrikhande may update these Terms &amp; Conditions from time to time. The version and
              “Last updated” date shown above apply to the current text. Continued use of the Portal
              after changes constitutes acceptance of the updated terms.
            </p>
          </section>

          <div className="pmc-terms__notice">
            <Icons.Issue className="pmc-terms__notice-icon" size={20} />
            <div>
              <h4>Confidentiality notice</h4>
              <p>
                Reports and exports generated from the Portal are intended solely for authorised
                recipients. If you receive information in error, please notify your Project Manager
                or contact {CONTACT.email} and delete the material.
              </p>
            </div>
          </div>
        </div>

        <footer className="pmc-terms__footer">
          <p className="pmc-terms__copyright">
            © {COPYRIGHT_YEAR} Shrikhande Consultants Limited. All rights reserved.
            <span className="pmc-terms__copyright-sub">
              PMC Portal · Enterprise Workflow · {OFFICE.lines[OFFICE.lines.length - 1]}
            </span>
          </p>
          <button type="button" className="pmc-terms__ack" onClick={onClose}>
            I understand
          </button>
        </footer>
      </div>

      <style>{`
        .pmc-terms {
          position: fixed;
          inset: 0;
          z-index: 120;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          font-family: "Source Sans 3", "Segoe UI", sans-serif;
        }
        .pmc-terms__backdrop {
          position: absolute;
          inset: 0;
          border: none;
          background: rgba(6, 12, 20, 0.88);
          backdrop-filter: blur(8px);
          cursor: pointer;
        }
        .pmc-terms__dialog {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          width: min(100%, 44rem);
          max-height: min(88vh, 52rem);
          overflow: hidden;
          border-radius: 0.5rem;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: #0f1720;
          box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5);
        }
        .pmc-terms__header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
          padding: 1.25rem 1.35rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(18, 26, 36, 0.95);
        }
        .pmc-terms__eyebrow {
          margin: 0 0 0.35rem;
          font-size: 0.65rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #ffb366;
        }
        .pmc-terms__title {
          margin: 0;
          font-family: Archivo, "Segoe UI", sans-serif;
          font-size: 1.35rem;
          font-weight: 800;
          color: #fff;
        }
        .pmc-terms__meta {
          margin: 0.35rem 0 0;
          font-size: 0.75rem;
          color: #94a3b8;
        }
        .pmc-terms__close {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 2.35rem;
          height: 2.35rem;
          border-radius: 0.4rem;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.04);
          color: #94a3b8;
          cursor: pointer;
        }
        .pmc-terms__close:hover {
          color: #fff;
          border-color: rgba(245, 158, 11, 0.4);
        }
        .pmc-terms__body {
          flex: 1;
          overflow: auto;
          padding: 1.25rem 1.35rem 1.5rem;
          color: rgba(203, 213, 225, 0.92);
          font-size: 0.9rem;
          line-height: 1.55;
        }
        .pmc-terms__intro {
          margin: 0 0 1.25rem;
        }
        .pmc-terms__intro strong {
          color: #fff;
          font-weight: 700;
        }
        .pmc-terms__section {
          margin-bottom: 1.15rem;
        }
        .pmc-terms__section h3 {
          margin: 0 0 0.4rem;
          font-family: Archivo, "Segoe UI", sans-serif;
          font-size: 0.95rem;
          font-weight: 800;
          color: #fff;
        }
        .pmc-terms__section p {
          margin: 0 0 0.55rem;
        }
        .pmc-terms__address {
          display: grid;
          gap: 0.15rem;
          margin: 0.65rem 0 0;
          padding: 0.85rem 1rem;
          border-radius: 0.4rem;
          border: 1px solid rgba(245, 158, 11, 0.22);
          background: rgba(245, 158, 11, 0.06);
          font-style: normal;
          font-size: 0.84rem;
          color: rgba(226, 232, 240, 0.9);
        }
        .pmc-terms__address-label {
          font-size: 0.62rem;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #ffb366;
          margin-bottom: 0.2rem;
        }
        .pmc-terms__address a {
          color: #ffb366;
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .pmc-terms__notice {
          display: flex;
          gap: 0.75rem;
          margin-top: 0.5rem;
          padding: 0.95rem 1rem;
          border-radius: 0.4rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.04);
        }
        .pmc-terms__notice-icon {
          flex-shrink: 0;
          color: #f59e0b;
          margin-top: 0.1rem;
        }
        .pmc-terms__notice h4 {
          margin: 0 0 0.3rem;
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #ffb366;
        }
        .pmc-terms__notice p {
          margin: 0;
          font-size: 0.8rem;
          color: #94a3b8;
        }
        .pmc-terms__footer {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 0.85rem;
          padding: 1rem 1.35rem;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(18, 26, 36, 0.95);
        }
        .pmc-terms__copyright {
          margin: 0;
          display: grid;
          gap: 0.2rem;
          font-size: 0.72rem;
          font-weight: 600;
          color: #94a3b8;
          max-width: 28rem;
        }
        .pmc-terms__copyright-sub {
          font-weight: 500;
          color: rgba(148, 163, 184, 0.8);
        }
        .pmc-terms__ack {
          border: none;
          border-radius: 0.4rem;
          padding: 0.75rem 1.25rem;
          font-family: inherit;
          font-size: 0.8rem;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: #0a1420;
          background: linear-gradient(135deg, #ffb020, #f59e0b);
          cursor: pointer;
          box-shadow: 0 8px 20px rgba(230, 138, 0, 0.28);
        }
        .pmc-terms__ack:hover {
          filter: brightness(1.04);
        }
        @media (min-width: 640px) {
          .pmc-terms {
            padding: 1.5rem;
          }
          .pmc-terms__header,
          .pmc-terms__body,
          .pmc-terms__footer {
            padding-left: 1.75rem;
            padding-right: 1.75rem;
          }
        }
      `}</style>
    </div>
  );
};

export default TermsAndConditions;
