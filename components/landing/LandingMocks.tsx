import React from 'react';

/** Static product-inspired UI scenes for the marketing landing page. Numbers are decorative chrome only. */

export function ScenePortfolio360() {
  return (
    <div className="lp-mock" aria-hidden="true">
      <div className="lp-mock__bar">
        <div className="lp-mock__title">Project 360° Overview</div>
        <div className="lp-mock__actions">
          <span className="lp-mock__chip">Client · Region · PM</span>
          <span className="lp-mock__chip lp-mock__chip--amber">Export Excel</span>
        </div>
      </div>
      <div className="lp-mock__body">
        <p className="lp-mock__label">Portfolio health at a glance</p>
        <div className="lp-mock__kpis">
          <div className="lp-mock__kpi lp-mock__kpi--critical">
            <span>Critical</span>
            <strong>2</strong>
          </div>
          <div className="lp-mock__kpi lp-mock__kpi--watch">
            <span>At Risk</span>
            <strong>5</strong>
          </div>
          <div className="lp-mock__kpi lp-mock__kpi--healthy">
            <span>On Track</span>
            <strong>14</strong>
          </div>
          <div className="lp-mock__kpi lp-mock__kpi--total">
            <span>Total</span>
            <strong>21</strong>
          </div>
        </div>
        <div className="lp-mock__rows">
          <div className="lp-mock__row">
            <span className="name">Western Corridor — Package B</span>
            <span className="vital lp-mock__pill lp-mock__pill--critical">Time</span>
            <span className="vital lp-mock__pill lp-mock__pill--watch">Cost</span>
            <span className="vital lp-mock__pill lp-mock__pill--healthy">Quality</span>
            <span className="vital lp-mock__pill lp-mock__pill--watch">Safety</span>
          </div>
          <div className="lp-mock__row">
            <span className="name">Metro Depot Civil Works</span>
            <span className="vital lp-mock__pill lp-mock__pill--watch">Time</span>
            <span className="vital lp-mock__pill lp-mock__pill--healthy">Cost</span>
            <span className="vital lp-mock__pill lp-mock__pill--healthy">Quality</span>
            <span className="vital lp-mock__pill lp-mock__pill--healthy">Safety</span>
          </div>
          <div className="lp-mock__row">
            <span className="name">River Bridge — Stage 3</span>
            <span className="vital lp-mock__pill lp-mock__pill--healthy">Time</span>
            <span className="vital lp-mock__pill lp-mock__pill--healthy">Cost</span>
            <span className="vital lp-mock__pill lp-mock__pill--watch">Quality</span>
            <span className="vital lp-mock__pill lp-mock__pill--healthy">Safety</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SceneExecutiveReview() {
  const tabs = [
    'Overview',
    'Schedule & Dates',
    'Financial',
    'People & Site',
    'Risk',
    'Compliance',
  ];

  return (
    <div className="lp-mock" aria-hidden="true">
      <div className="lp-mock__bar">
        <div className="lp-mock__title">PMC Executive Project Review</div>
        <div className="lp-mock__actions">
          <span className="lp-mock__chip">Export</span>
          <span className="lp-mock__chip lp-mock__chip--amber">Generate Brief</span>
          <span className="lp-mock__chip lp-mock__chip--rose">Escalate</span>
        </div>
      </div>
      <div className="lp-mock__body">
        <div className="lp-mock__tabs">
          {tabs.map((tab, i) => (
            <span key={tab} className={`lp-mock__tab${i === 0 ? ' is-active' : ''}`}>
              {tab}
            </span>
          ))}
        </div>
        <div className="lp-mock__updates">3 updates since last review — schedule slip · CPI watch · HSE monthly</div>
        <div className="lp-mock__metrics">
          <div className="lp-mock__metric">
            <span>Schedule</span>
            <strong>Watch</strong>
          </div>
          <div className="lp-mock__metric">
            <span>Financial CPI</span>
            <strong>0.94</strong>
          </div>
          <div className="lp-mock__metric">
            <span>HSE posture</span>
            <strong>Good</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SceneSiteToBoard() {
  return (
    <div className="lp-mock" aria-hidden="true">
      <div className="lp-mock__bar">
        <div className="lp-mock__title">Site-to-board loop</div>
        <div className="lp-mock__actions">
          <span className="lp-mock__chip">DPR · WPR · MPR</span>
        </div>
      </div>
      <div className="lp-mock__body">
        <div className="lp-mock__stack">
          <div className="lp-mock__register">
            <div className="lp-mock__register-head">
              <strong>DPR / WPR / MPR Review</strong>
              <span className="lp-mock__pill lp-mock__pill--pending">Pending</span>
            </div>
            <div className="lp-mock__register-lines">
              <div className="lp-mock__register-line">
                <span>Daily progress — Package B</span>
                <span>Awaiting review</span>
              </div>
              <div className="lp-mock__register-line">
                <span>MPR — generate PDF &amp; Excel</span>
                <span>Ready</span>
              </div>
            </div>
          </div>
          <div className="lp-mock__register">
            <div className="lp-mock__register-head">
              <strong>Drawing Register</strong>
              <span className="lp-mock__chip">Consultant cycle</span>
            </div>
            <div className="lp-mock__register-lines">
              <div className="lp-mock__register-line">
                <span>STR-042 Foundation plan</span>
                <span className="lp-mock__pill lp-mock__pill--approved">Approved</span>
              </div>
              <div className="lp-mock__register-line">
                <span>ARC-118 Facade detail</span>
                <span className="lp-mock__pill lp-mock__pill--review">In Review</span>
              </div>
              <div className="lp-mock__register-line">
                <span>MEP-027 Riser layout</span>
                <span className="lp-mock__pill lp-mock__pill--pending">Pending</span>
              </div>
            </div>
          </div>
          <div className="lp-mock__register">
            <div className="lp-mock__register-head">
              <strong>Correspondence &amp; Delivery</strong>
              <span className="lp-mock__pill lp-mock__pill--pending">Pending</span>
            </div>
            <div className="lp-mock__register-lines">
              <div className="lp-mock__register-line">
                <span>Client RFI response</span>
                <span>Due</span>
              </div>
              <div className="lp-mock__register-line">
                <span>Contractor submission</span>
                <span>Logged</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SceneLeadershipActions() {
  return (
    <div className="lp-mock" aria-hidden="true">
      <div className="lp-mock__bar">
        <div className="lp-mock__title">Leadership actions</div>
        <div className="lp-mock__actions">
          <span className="lp-mock__chip">Export Excel</span>
          <span className="lp-mock__chip lp-mock__chip--amber">Generate Brief</span>
          <span className="lp-mock__chip lp-mock__chip--rose">Escalate to Risk</span>
        </div>
      </div>
      <div className="lp-mock__body">
        <div className="lp-mock__brief">
          <pre className="lp-mock__md">{`# Executive meeting brief

## Portfolio
- Critical: Western Corridor — Package B
- At Risk: Metro Depot Civil Works

## Decisions needed
- Schedule recovery on Package B
- Drawing approvals backlog

## Tracks
- SCL · Contractor commercial`}</pre>
          <div className="lp-mock__brief-side">
            <span className="lp-mock__chip lp-mock__chip--amber">Copy / download markdown</span>
            <span className="lp-mock__chip lp-mock__chip--rose">Escalate to Risk</span>
            <p className="lp-mock__theme-note">Light / Dark theme</p>
          </div>
        </div>
      </div>
    </div>
  );
}
