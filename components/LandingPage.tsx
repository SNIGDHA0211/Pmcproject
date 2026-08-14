/**
 * PMC Portal marketing landing page
 * Sections: Fixed header · Hero · Trust · Projects · Problem/Outcome · Features · Roles · Services · Final CTA
 */
import React, { useEffect, useRef, useState } from 'react';
import { LOGIN_ROUTE, syncAppRoutePath } from '../utils/appRouting';
import {
  SceneExecutiveReview,
  SceneLeadershipActions,
  ScenePortfolio360,
  SceneSiteToBoard,
} from './landing/LandingMocks';
import LandingOfficeMap, { OFFICE } from './landing/LandingOfficeMap';
import { LANDING_PROJECT_HIGHLIGHTS } from './landing/landingProjects';
import './landing/landing.css';

const CONTACT = {
  phoneDisplay: '+91-22-2784 4440 / 3305 / 4199 / 0751',
  phoneTel: '+912227844440',
  email: 'scplvashi@gmail.com',
} as const;

/** Real under-construction site photography only (no office/coding stock). */
const HERO_SLIDES = [
  '/images/construction-panorama-bg.png',
  '/images/construction-cranes-bg.jpg',
  '/images/construction-bg.jpg',
  '/images/construction-skyline.jpg',
] as const;

const TRUST_ITEMS = [
  'Shrikhande Consultants Limited',
  'Civil & Construction PMC',
  'Enterprise Workflow',
  'Role-based access',
  'India-ready PMC ops',
] as const;

const NAV_LINKS = [
  { id: 'home', label: 'Home' },
  { id: 'projects', label: 'Projects' },
  { id: 'features', label: 'Features' },
  { id: 'services', label: 'Services' },
  { id: 'roles', label: 'Roles' },
  { id: 'demo', label: 'Contact' },
] as const;

function enterPortal() {
  syncAppRoutePath(LOGIN_ROUTE, 'push');
}

function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
}

function scrollToTour() {
  scrollToId('features');
}

function useLandingMotion() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const revealSelector = [
      '.pmc-landing__scene',
      '.pmc-landing__reveal',
      '.pmc-landing__gallery-card',
      '.pmc-landing__role-card',
      '.pmc-landing__cap-group',
      '.pmc-landing__panel',
      '.pmc-landing__contact-item',
      '.pmc-landing__office-block',
      '.pmc-landing__contact-map',
      '.pmc-landing__trust',
      '.pmc-landing__footer-brand',
      '.pmc-landing__footer-office',
      '.pmc-landing__footer-contact',
    ].join(', ');

    const revealEls = root.querySelectorAll<HTMLElement>(revealSelector);

    if (reduce) {
      revealEls.forEach((el) => el.classList.add('is-visible'));
      root.classList.add('is-ready');
      return;
    }

    // Stagger siblings in grids / rows
    root
      .querySelectorAll(
        '.pmc-landing__gallery-grid, .pmc-landing__role-grid, .pmc-landing__cap-grid, .pmc-landing__split, .pmc-landing__contact, .pmc-landing__footer-inner, .pmc-landing__contact-layout',
      )
      .forEach((group) => {
        Array.from(group.children).forEach((child, i) => {
          if (child instanceof HTMLElement) {
            child.style.setProperty('--lp-stagger', `${i * 70}ms`);
          }
        });
      });

    requestAnimationFrame(() => root.classList.add('is-ready'));

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Re-animate on scroll down and up
          entry.target.classList.toggle('is-visible', entry.isIntersecting);
        });
      },
      { rootMargin: '0px 0px -10% 0px', threshold: [0, 0.12, 0.28] },
    );

    revealEls.forEach((el) => io.observe(el));

    const heroPhoto = root.querySelector<HTMLElement>('.pmc-landing__hero-stack');
    let raf = 0;
    const onScroll = () => {
      if (!heroPhoto) return;
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = Math.min(window.scrollY, 520);
        heroPhoto.style.transform = `translate3d(0, ${y * 0.14}px, 0) scale(${1 + y * 0.00005})`;
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      io.disconnect();
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return rootRef;
}

const LandingPage: React.FC = () => {
  const rootRef = useLandingMotion();
  const [navSolid, setNavSolid] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setNavSolid(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const goToSection = (id: string) => {
    setMenuOpen(false);
    scrollToId(id);
  };

  return (
    <div className="pmc-landing" ref={rootRef}>
      <header
        className={`pmc-landing__header${navSolid ? ' is-solid' : ''}${menuOpen ? ' is-open' : ''}`}
      >
        <div className="pmc-landing__header-bar">
          {/* Left — same content as before, CMS-style placement */}
          <a
            className="pmc-landing__header-brand"
            href="/"
            aria-label="PMC Portal home"
            onClick={(e) => {
              e.preventDefault();
              goToSection('home');
            }}
          >
            <img
              className="pmc-landing__header-logo"
              src="/images/Shrikhande-logo-bgremove.png"
              alt="Shrikhande Consultants Limited"
            />
            <span className="pmc-landing__header-divider" aria-hidden="true" />
            <span className="pmc-landing__header-titles">
              <strong>PMC Portal</strong>
              <span>Civil · Construction PMC</span>
            </span>
          </a>

          {/* Center — navigation */}
          <nav className="pmc-landing__header-nav" aria-label="Primary">
            {NAV_LINKS.map((link) => (
              <button
                key={link.id}
                type="button"
                className="pmc-landing__header-link"
                onClick={() => goToSection(link.id)}
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* Right — Login only */}
          <div className="pmc-landing__header-actions">
            <button type="button" className="pmc-landing__nav-enter" onClick={enterPortal}>
              Login
            </button>
            <button
              type="button"
              className="pmc-landing__menu-toggle"
              aria-expanded={menuOpen}
              aria-controls="pmc-landing-mobile-nav"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>

        <div
          id="pmc-landing-mobile-nav"
          className={`pmc-landing__mobile-nav${menuOpen ? ' is-open' : ''}`}
          hidden={!menuOpen}
        >
          <p className="pmc-landing__mobile-eyebrow">Construction Project Management Consultancy</p>
          {NAV_LINKS.map((link) => (
            <button
              key={link.id}
              type="button"
              className="pmc-landing__mobile-link"
              onClick={() => goToSection(link.id)}
            >
              {link.label}
            </button>
          ))}
          <button type="button" className="pmc-landing__btn pmc-landing__btn--primary" onClick={enterPortal}>
            Login to portal
          </button>
        </div>
      </header>

      <main>
        {/* 1) Hero — rugged full-bleed construction atmosphere */}
        <section id="home" className="pmc-landing__hero" aria-labelledby="pmc-landing-brand">
          <div className="pmc-landing__hero-bg" aria-hidden="true">
            <div className="pmc-landing__hero-stack">
              {HERO_SLIDES.map((src, i) => (
                <div
                  key={src}
                  className={`pmc-landing__hero-slide pmc-landing__hero-slide--${i + 1}`}
                  style={{ backgroundImage: `url(${src})` }}
                />
              ))}
            </div>
          </div>
          <div className="pmc-landing__hero-wash" aria-hidden="true" />
          <div className="pmc-landing__hero-blueprint" aria-hidden="true" />
          <div className="pmc-landing__hero-grain" aria-hidden="true" />
          <div className="pmc-landing__hero-accent" aria-hidden="true" />

          <div className="pmc-landing__hero-layout">
            <div className="pmc-landing__hero-inner">
              <div className="pmc-landing__brand-lockup">
                <p className="pmc-landing__brand-kicker">
                  Construction PMC · Civil Engineering Projects · India
                </p>
                <h1 id="pmc-landing-brand" className="pmc-landing__brand-name">
                  PMC Portal
                </h1>
                <p className="pmc-landing__brand-sub">
                  Shrikhande Consultants Limited · Enterprise Workflow
                </p>
              </div>

              <p className="pmc-landing__headline">
                Enterprise command for every project on site.
              </p>
              <p className="pmc-landing__support">
                Portfolio health, schedule, cost, quality, and safety — from boardroom to DPR — in
                one Shrikhande PMC system for civil construction delivery.
              </p>

              <div className="pmc-landing__cta-group">
                <button
                  type="button"
                  className="pmc-landing__btn pmc-landing__btn--primary"
                  onClick={enterPortal}
                >
                  Login
                </button>
                <button
                  type="button"
                  className="pmc-landing__btn pmc-landing__btn--ghost"
                  onClick={scrollToTour}
                >
                  Watch overview
                </button>
              </div>
            </div>

            <div className="pmc-landing__hero-visual">
              <LandingOfficeMap variant="hero" />
            </div>
          </div>
        </section>

        {/* 2) Trust strip — infinite marquee */}
        <aside className="pmc-landing__trust" aria-label="Trust signals">
          <p className="pmc-landing__sr-only">{TRUST_ITEMS.join(' · ')}</p>
          <div className="pmc-landing__trust-viewport" aria-hidden="true">
            <div className="pmc-landing__trust-inner">
              {[0, 1].map((copy) => (
                <div key={copy} className="pmc-landing__trust-group">
                  {TRUST_ITEMS.map((item) => (
                    <span key={`${copy}-${item}`} className="pmc-landing__trust-item">
                      {item}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Projects gallery — selected civil portfolio */}
        <section
          id="projects"
          className="pmc-landing__section pmc-landing__gallery"
          aria-labelledby="gallery-heading"
        >
          <div className="pmc-landing__section-inner">
            <div className="pmc-landing__reveal">
              <p className="pmc-landing__eyebrow">Selected civil works</p>
              <h2 id="gallery-heading" className="pmc-landing__h2">
                PMC supervision across India.
              </h2>
              <p className="pmc-landing__lede">
                A snapshot of live Shrikhande portfolios — metro, highways, flyovers, and urban
                buildings. Hover a card for a short public scope summary.
              </p>
            </div>

            <div className="pmc-landing__gallery-grid pmc-landing__gallery-grid--projects">
              {LANDING_PROJECT_HIGHLIGHTS.map((project, index) => (
                <figure
                  key={project.title}
                  className="pmc-landing__gallery-card"
                  style={{ transitionDelay: `${index * 90}ms` }}
                  tabIndex={0}
                  aria-label={`${project.title} — ${project.location}`}
                >
                  <div className="pmc-landing__gallery-media">
                    <img
                      src={project.image}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      style={{ objectPosition: project.imagePosition ?? 'center' }}
                    />
                    <div className="pmc-landing__gallery-shade" aria-hidden="true" />
                    <div className="pmc-landing__gallery-hover" aria-hidden="true">
                      <p className="pmc-landing__gallery-hover-title">{project.title}</p>
                      <p className="pmc-landing__gallery-hover-scope">{project.scope}</p>
                    </div>
                  </div>
                  <figcaption>
                    <span className="pmc-landing__gallery-label">{project.title}</span>
                    <span className="pmc-landing__gallery-caption">{project.location}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* 3) Problem → outcome */}
        <section className="pmc-landing__section pmc-landing__problem" aria-labelledby="problem-heading">
          <div className="pmc-landing__section-inner pmc-landing__problem-layout">
            <div className="pmc-landing__reveal">
              <p className="pmc-landing__eyebrow">From site noise to command clarity</p>
              <h2 id="problem-heading" className="pmc-landing__h2">
                Fragmented reports hide risk. One portfolio view surfaces it.
              </h2>
              <p className="pmc-landing__lede">
                Late drawings, scattered DPRs, and blind spots on cost and HSE delay decisions.
                PMC Portal brings Portfolio 360° and Executive Project Review into one leadership
                surface.
              </p>

              <div className="pmc-landing__split">
                <div className="pmc-landing__panel">
                  <h3>Without a command system</h3>
                  <p>
                    Fragmented site reports. Late drawings. Blind spots on cost and HSE until the
                    weekly meeting — or later.
                  </p>
                </div>
                <div className="pmc-landing__panel pmc-landing__panel--outcome">
                  <h3>With PMC Portal</h3>
                  <p>
                    Spot Critical / At Risk / On Track early. Drill into schedule delays, financial
                    CPI, HSE, drawings approval, correspondence pending, and leadership decisions —
                    then act.
                  </p>
                </div>
              </div>
            </div>

            <div className="pmc-landing__problem-visual pmc-landing__reveal" aria-hidden="true">
              <div className="pmc-landing__problem-frame">
                <img
                  src="/images/construction-panorama-bg.png"
                  alt=""
                  loading="lazy"
                  decoding="async"
                />
                <div className="pmc-landing__problem-overlay">
                  <span>Project 360°</span>
                  <strong>Portfolio health at a glance</strong>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4) Product tour / Features */}
        <section
          id="features"
          className="pmc-landing__section pmc-landing__tour"
          aria-labelledby="tour-heading"
        >
          <div className="pmc-landing__section-inner">
            <div className="pmc-landing__reveal">
              <p className="pmc-landing__eyebrow">Features</p>
              <h2 id="tour-heading" className="pmc-landing__h2">
                From portfolio health to the next decision.
              </h2>
              <p className="pmc-landing__lede">
                Four leadership surfaces — not a feature dump. Each one maps to a real module in
                PMC Portal.
              </p>
            </div>

            <article className="pmc-landing__scene">
              <div className="pmc-landing__scene-copy">
                <p className="pmc-landing__eyebrow">Scene A</p>
                <h2 className="pmc-landing__h2">Project 360° Overview</h2>
                <p>
                  Multi-project portfolio health with Critical / At Risk / On Track. Filter by
                  client, region, PM, or billing — then export to Excel.
                </p>
              </div>
              <div className="pmc-landing__scene-visual">
                <ScenePortfolio360 />
              </div>
            </article>

            <article className="pmc-landing__scene pmc-landing__scene--flip">
              <div className="pmc-landing__scene-copy">
                <p className="pmc-landing__eyebrow">Scene B</p>
                <h2 className="pmc-landing__h2">Executive Project Review</h2>
                <p>
                  One project shell with Overview, Schedule &amp; Dates, Financial, People &amp;
                  Site, Risk, and Compliance — ready for leadership walkthroughs.
                </p>
              </div>
              <div className="pmc-landing__scene-visual">
                <SceneExecutiveReview />
              </div>
            </article>

            <article className="pmc-landing__scene">
              <div className="pmc-landing__scene-copy">
                <p className="pmc-landing__eyebrow">Scene C</p>
                <h2 className="pmc-landing__h2">Site-to-board loop</h2>
                <p>
                  DPR, WPR, and MPR Review feed upward. Drawing Register tracks consultant
                  approval. Correspondence &amp; Delivery Status keeps client and contractor
                  documents in view.
                </p>
              </div>
              <div className="pmc-landing__scene-visual">
                <SceneSiteToBoard />
              </div>
            </article>

            <article className="pmc-landing__scene pmc-landing__scene--flip">
              <div className="pmc-landing__scene-copy">
                <p className="pmc-landing__eyebrow">Scene D</p>
                <h2 className="pmc-landing__h2">Leadership actions</h2>
                <p>
                  Export for the pack. Generate Brief for the meeting. Escalate to Risk when a
                  project needs the board&apos;s attention.
                </p>
              </div>
              <div className="pmc-landing__scene-visual">
                <SceneLeadershipActions />
              </div>
            </article>
          </div>
        </section>

        {/* 5) Roles */}
        <section
          id="roles"
          className="pmc-landing__section pmc-landing__roles"
          aria-labelledby="roles-heading"
        >
          <div className="pmc-landing__section-inner">
            <div className="pmc-landing__reveal">
              <p className="pmc-landing__eyebrow">Built for PMC personas</p>
              <h2 id="roles-heading" className="pmc-landing__h2">
                One portal. Three operating altitudes.
              </h2>
              <p className="pmc-landing__lede">
                True multi-persona PMC access — not a generic PM tool with roles bolted on.
              </p>
            </div>

            <div className="pmc-landing__role-grid">
              <div
                className="pmc-landing__role-card pmc-landing__reveal"
                style={{ transitionDelay: '0ms' }}
              >
                <div
                  className="pmc-landing__role-photo"
                  style={{ backgroundImage: 'url(/images/construction-panorama-bg.png)' }}
                  aria-hidden="true"
                />
                <h3>Leadership</h3>
                <p className="who">PMC Head · Head Office · Manager · CEO</p>
                <p>Portfolio command, executive review, user management, and meeting-ready actions.</p>
              </div>
              <div
                className="pmc-landing__role-card pmc-landing__reveal"
                style={{ transitionDelay: '80ms' }}
              >
                <div
                  className="pmc-landing__role-photo"
                  style={{ backgroundImage: 'url(/images/construction-skyline.jpg)' }}
                  aria-hidden="true"
                />
                <h3>Team Leader</h3>
                <p className="who">Delivery ownership</p>
                <p>Project overview and delivery ops — schedule, people, and site coordination.</p>
              </div>
              <div
                className="pmc-landing__role-card pmc-landing__reveal"
                style={{ transitionDelay: '160ms' }}
              >
                <div
                  className="pmc-landing__role-photo"
                  style={{ backgroundImage: 'url(/images/construction-crane-b.jpg)' }}
                  aria-hidden="true"
                />
                <h3>Site engineers</h3>
                <p className="who">Site · Billing · QAQC · HSE</p>
                <p>Field scopes, physical progress, quality, safety, and billing — by role.</p>
              </div>
            </div>

            <p className="pmc-landing__roles-note pmc-landing__reveal">
              Clients and contractors appear as project parties with dual SCL / Contractor
              commercial and schedule tracks — not as a separate login role in this app.
            </p>
          </div>
        </section>

        {/* 6) Services / Capability grid */}
        <section
          id="services"
          className="pmc-landing__section pmc-landing__capability"
          aria-labelledby="capability-heading"
        >
          <div className="pmc-landing__section-inner">
            <div className="pmc-landing__reveal">
              <p className="pmc-landing__eyebrow">Civil PMC services in the portal</p>
              <h2 id="capability-heading" className="pmc-landing__h2">
                Construction-native modules for site and office.
              </h2>
              <p className="pmc-landing__lede">
                From portfolio registry to HSE and meeting documents — the site-to-board loop for
                civil construction projects in one system.
              </p>
            </div>

            <div className="pmc-landing__cap-grid pmc-landing__reveal">
              <div className="pmc-landing__cap-group">
                <h3>Portfolio &amp; projects</h3>
                <ul>
                  <li>Project 360° Overview</li>
                  <li>Executive Project Review</li>
                  <li>Initialize Project + Enterprise Portfolio registry</li>
                  <li>User Management (leadership)</li>
                </ul>
              </div>
              <div className="pmc-landing__cap-group">
                <h3>Site execution</h3>
                <ul>
                  <li>Site Progress — physical / construction progress</li>
                  <li>Monthly Scope / My Scopes</li>
                  <li>Manpower Management — planned vs actual</li>
                  <li>Plant Machinery — equipment register</li>
                  <li>Site Photos + Testing Photos (QA/QC)</li>
                  <li>DPR Review / WPR Review / MPR Review (PDF &amp; Excel)</li>
                </ul>
              </div>
              <div className="pmc-landing__cap-group">
                <h3>Commercial</h3>
                <ul>
                  <li>Financial Management — Physical Progress, Cashflow, Planned vs Actual</li>
                  <li>Contract Performance, Budget vs Cost, Invoicing</li>
                  <li>Contract Values — SCL + Contractor tracks</li>
                </ul>
              </div>
              <div className="pmc-landing__cap-group">
                <h3>Governance &amp; leadership</h3>
                <ul>
                  <li>Drawing Register — submissions, consultant cycle, approval status</li>
                  <li>Correspondence &amp; Delivery Status</li>
                  <li>HSE — incidents &amp; monthly safety posture</li>
                  <li>Meeting Documents (MOM / EDL)</li>
                  <li>Reminders + Alerts (real-time alert feed)</li>
                  <li>Guided tours + Watch Tutorial videos</li>
                  <li>Generate Brief · Escalate to Risk · Light/Dark theme</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* 7) Contact / Final CTA */}
        <section className="pmc-landing__final" id="demo" aria-labelledby="final-heading">
          <div className="pmc-landing__final-bg" aria-hidden="true" />
          <div className="pmc-landing__final-wash" aria-hidden="true" />
          <div className="pmc-landing__section-inner pmc-landing__reveal">
            <p className="pmc-landing__eyebrow">Contact · Shrikhande Consultants Limited</p>
            <h2 id="final-heading" className="pmc-landing__h2">
              Run your projects like a command system
            </h2>
            <p className="pmc-landing__lede">
              See Time, Cost, Quality, and Safety in one place — then brief, export, and escalate
              with confidence. Speak with our team or log in to the portal.
            </p>

            <div className="pmc-landing__contact-layout">
              <div className="pmc-landing__contact-panel">
                <div className="pmc-landing__office-block">
                  <p className="pmc-landing__contact-label">{OFFICE.title}</p>
                  <p className="pmc-landing__office-company">{OFFICE.company}</p>
                  <address className="pmc-landing__office-address">
                    {OFFICE.lines.map((line) => (
                      <span key={line}>{line}</span>
                    ))}
                  </address>
                </div>

                <div className="pmc-landing__contact">
                  <a className="pmc-landing__contact-item" href={`tel:${CONTACT.phoneTel}`}>
                    <span className="pmc-landing__contact-label">Phone</span>
                    <span className="pmc-landing__contact-value">{CONTACT.phoneDisplay}</span>
                  </a>
                  <a className="pmc-landing__contact-item" href={`mailto:${CONTACT.email}`}>
                    <span className="pmc-landing__contact-label">Email</span>
                    <span className="pmc-landing__contact-value">{CONTACT.email}</span>
                  </a>
                </div>

                <div className="pmc-landing__cta-group pmc-landing__cta-group--contact">
                  <button
                    type="button"
                    className="pmc-landing__btn pmc-landing__btn--primary"
                    onClick={enterPortal}
                  >
                    Login
                  </button>
                </div>
              </div>

              <div className="pmc-landing__contact-map">
                <LandingOfficeMap variant="contact" />
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="pmc-landing__footer">
        <div className="pmc-landing__footer-inner">
          <div className="pmc-landing__footer-brand">
            <p className="pmc-landing__footer-product">PMC Portal</p>
            <p className="pmc-landing__footer-tag">Enterprise Workflow · Shrikhande Consultants Limited</p>
          </div>

          <address className="pmc-landing__footer-office">
            <p className="pmc-landing__footer-office-title">{OFFICE.title}</p>
            <p className="pmc-landing__footer-office-company">{OFFICE.company}</p>
            {OFFICE.lines.map((line) => (
              <span key={line} className="pmc-landing__footer-office-line">
                {line}
              </span>
            ))}
          </address>

          <div className="pmc-landing__footer-contact">
            <a href={`tel:${CONTACT.phoneTel}`}>{CONTACT.phoneDisplay}</a>
            <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
          </div>
        </div>
        <p className="pmc-landing__footer-copy">
          © 2026 Shrikhande Consultants Limited. All rights reserved.
        </p>
      </footer>
    </div>
  );
};

export default LandingPage;
