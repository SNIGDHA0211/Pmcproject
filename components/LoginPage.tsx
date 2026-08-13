/**
 * Enterprise login — aligned with PMC Portal landing brand (navy / amber).
 */
import React from 'react';
import { Icons } from './Icons';
import './login/login.css';

type LoginPageProps = {
  username: string;
  password: string;
  showPassword: boolean;
  loginError: string;
  isLoginSubmitting: boolean;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onTogglePassword: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onOpenTerms: () => void;
  onGoToLanding: () => void;
  termsModal: React.ReactNode;
};

const LoginPage: React.FC<LoginPageProps> = ({
  username,
  password,
  showPassword,
  loginError,
  isLoginSubmitting,
  onUsernameChange,
  onPasswordChange,
  onTogglePassword,
  onSubmit,
  onOpenTerms,
  onGoToLanding,
  termsModal,
}) => {
  return (
    <div className="pmc-login">
      <div className="pmc-login__bg" aria-hidden="true" />
      <div className="pmc-login__wash" aria-hidden="true" />

      <header className="pmc-login__top">
        <button
          type="button"
          className="pmc-login__back"
          onClick={onGoToLanding}
          disabled={isLoginSubmitting}
        >
          <Icons.ArrowRight size={14} className="pmc-login__back-icon" strokeWidth={2.5} />
          PMC Portal
        </button>
        <span className="pmc-login__top-meta">Enterprise sign-in</span>
      </header>

      <main className="pmc-login__shell">
        <aside className="pmc-login__brand" aria-hidden="false">
          <div className="pmc-login__brand-inner">
            <img
              src="/images/Shrikhande-logo-bgremove.png"
              alt=""
              className="pmc-login__brand-logo"
            />
            <p className="pmc-login__brand-kicker">Shrikhande Consultants Limited</p>
            <h1 className="pmc-login__brand-title">PMC Portal</h1>
            <p className="pmc-login__brand-copy">
              Secure access to portfolio health, schedule, cost, quality, and safety for civil
              construction PMC delivery.
            </p>
            <ul className="pmc-login__brand-points">
              <li>Role-based workspace</li>
              <li>Site-to-board workflow</li>
              <li>India-ready PMC ops</li>
            </ul>
          </div>
        </aside>

        <section className="pmc-login__panel" aria-labelledby="pmc-login-heading">
          <div className="pmc-login__panel-head">
            <img
              src="/images/Shrikhande-logo-bgremove.png"
              alt="Shrikhande Consultants Limited"
              className="pmc-login__panel-logo"
            />
            <h2 id="pmc-login-heading" className="pmc-login__heading">
              Sign in
            </h2>
            <p className="pmc-login__subhead">
              Enter your PMC Portal credentials to continue.
            </p>
          </div>

          <form onSubmit={onSubmit} className="pmc-login__form" noValidate>
            {loginError ? (
              <div className="pmc-login__error" role="alert">
                {loginError}
              </div>
            ) : null}

            <label className="pmc-login__field">
              <span className="pmc-login__label">Username</span>
              <span className="pmc-login__control">
                <Icons.User size={17} className="pmc-login__field-icon" aria-hidden="true" />
                <input
                  type="text"
                  name="username"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => onUsernameChange(e.target.value)}
                  disabled={isLoginSubmitting}
                  placeholder="Enter username"
                  required
                />
              </span>
            </label>

            <label className="pmc-login__field">
              <span className="pmc-login__label">Password</span>
              <span className="pmc-login__control">
                <Icons.Lock size={17} className="pmc-login__field-icon" aria-hidden="true" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => onPasswordChange(e.target.value)}
                  disabled={isLoginSubmitting}
                  placeholder="Enter password"
                  required
                />
                <button
                  type="button"
                  className="pmc-login__reveal"
                  onClick={onTogglePassword}
                  disabled={isLoginSubmitting}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <Icons.EyeOff size={17} /> : <Icons.Eye size={17} />}
                </button>
              </span>
            </label>

            <p className="pmc-login__legal">
              By signing in, you agree to the{' '}
              <button type="button" onClick={onOpenTerms} disabled={isLoginSubmitting}>
                Terms &amp; Conditions
              </button>{' '}
              of Shrikhande Consultants Limited.
            </p>

            <button type="submit" className="pmc-login__submit" disabled={isLoginSubmitting}>
              {isLoginSubmitting ? (
                <>
                  <Icons.History size={16} className="pmc-login__spin" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign in to portal
                  <Icons.ArrowRight size={16} strokeWidth={2.5} />
                </>
              )}
            </button>
          </form>

          <p className="pmc-login__footer-link">
            New here?{' '}
            <button type="button" onClick={onGoToLanding} disabled={isLoginSubmitting}>
              Visit the landing page
            </button>
          </p>

          <p className="pmc-login__copyright">
            © {new Date().getFullYear()} Shrikhande Consultants Limited. All rights reserved.
          </p>
        </section>
      </main>

      {termsModal}
    </div>
  );
};

export default LoginPage;
