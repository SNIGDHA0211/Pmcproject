
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Icons } from './Icons';
import { User, UserRole, AppNotification, Project } from '../types';
import { ROLE_LABELS } from '../constants';
import { useTheme, getThemeClasses } from '../utils/theme';
import {
  SITE_ENGINEER_NAV_IDS,
  SITE_ENGINEER_NAV_LABELS,
} from '../utils/siteEngineerProjects';
import TeamLeaderSidebarTour, {
  type TeamLeaderSidebarTourHandle,
} from './tours/TeamLeaderSidebarTour';
import UserAvatar from './UserAvatar';

interface LayoutProps {
  children: React.ReactNode;
  user: User;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  notifications: AppNotification[];
  onMarkRead: (id: string, isRead?: boolean) => void;
  onNavigateToAlerts?: () => void;
  onNotificationClick?: (notification: AppNotification) => void;
  projects?: Project[];
  selectedProjectId?: string | null;
  onSelectProject?: (id: string | null) => void;
  isOnboardingTourActive?: boolean;
  onOnboardingTourStateChange?: (isActive: boolean) => void;
  isAnyTourRunning?: boolean;
  onAnyTourStateChange?: (isActive: boolean) => void;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  user,
  onLogout,
  activeTab,
  setActiveTab,
  notifications,
  onMarkRead,
  onNavigateToAlerts,
  onNotificationClick,
  projects = [],
  selectedProjectId = null,
  onSelectProject,
  isOnboardingTourActive = false,
  onOnboardingTourStateChange,
  isAnyTourRunning = false,
  onAnyTourStateChange,
}) => {
  const { isDarkTheme, setIsDarkTheme } = useTheme();

  useEffect(() => {
    // Update HTML background for a seamless theme experience
    const html = document.documentElement;
    if (isDarkTheme) {
      html.style.backgroundColor = "#0b1d36";
    } else {
      html.style.backgroundColor = "#f8fafc"; // Matches blue-50
    }
  }, [isDarkTheme]);
  const themeClasses = getThemeClasses(isDarkTheme);
  const [showNotifications, setShowNotifications] = useState(false);
  const [sidebarOverlayOpen, setSidebarOverlayOpen] = useState(false);
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const teamLeaderTourRef = useRef<TeamLeaderSidebarTourHandle>(null);

  const closeSidebarOverlay = useCallback(() => {
    if (!isOnboardingTourActive) setSidebarOverlayOpen(false);
  }, [isOnboardingTourActive]);

  const toggleSidebarOverlay = useCallback(() => {
    setSidebarOverlayOpen((prev) => !prev);
  }, []);

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const teamLeaderTourCompleted =
    typeof window !== 'undefined' && localStorage.getItem('teamLeaderTourCompleted') === 'true';

  const userNotifications = notifications
    .filter((n) => n.userId === user.id)
    .sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });

  const unreadCount = userNotifications.filter((n) => !n.isRead).length;

  const getTourClassName = (id: string): string => {
    const classMap: Record<string, string> = {
      team_projects: "projects-menu",
      commercials: "commercials-menu",
      execution: "site-progress-menu",
      monthly_scope: "monthly-scope-menu",
      manpower_management: "manpower-menu",
      financial_management: "financial-menu",
      site_photos: "site-photos-menu",
      machinery_list: "plant-menu",
      hse: "hse-menu",
      projects: "portfolio-menu",
      dpr_records: "dpr-menu",
      wpr_records: "wpr-menu",
      documents: "vault-menu",
    };
    return classMap[id] || "";
  };

  const navigation = [
    {
      id: "dashboard",
      label: "Overview",
      icon: Icons.Dashboard,
      roles: [UserRole.PMC_HEAD, UserRole.COORDINATOR],
    },
    {
      id: "site_engineer_dashboard",
      label: "Dashboard",
      icon: Icons.Building2,
      roles: [UserRole.SITE_ENGINEER],
    },
    {
      id: "my_scopes",
      label: "My Scopes",
      icon: Icons.Task,
      roles: [
        UserRole.SITE_ENGINEER,
        UserRole.BILLING_SITE_ENGINEER,
        UserRole.QAQC_SITE_ENGINEER,
      ],
    },
    {
      id: "team_projects",
      label: "Projects",
      icon: Icons.Building,
      roles: [UserRole.TEAM_LEAD, UserRole.PMC_HEAD, UserRole.COORDINATOR],
    },
    {
      id: "project_init",
      label: "Initialize Project",
      icon: Icons.Add,
      roles: [UserRole.PMC_HEAD],
    },
    // {
    //   id: "commercials",
    //   label: "Commercials",
    //   icon: Icons.Finance,
    //   roles: [UserRole.TEAM_LEAD, UserRole.PMC_HEAD],
    // },
    {
      id: "execution",
      label: "Site Progress",
      icon: Icons.Execution,
      roles: [UserRole.TEAM_LEAD, UserRole.PMC_HEAD, UserRole.SITE_ENGINEER],
    },
    {
      id: "monthly_scope",
      label: "Monthly Scope",
      icon: Icons.Task,
      roles: [UserRole.TEAM_LEAD],
    },
    {
      id: "manpower_management",
      label: "Manpower Management",
      icon: Icons.Labor,
      roles: [UserRole.TEAM_LEAD, UserRole.SITE_ENGINEER],
    },
    {
      id: "financial_management",
      label: "Financial Management",
      icon: Icons.Finance,
      roles: [UserRole.TEAM_LEAD, UserRole.BILLING_SITE_ENGINEER],
    },
    {
      id: "site_photos",
      label: "Site Photos",
      icon: Icons.Upload,
      roles: [UserRole.TEAM_LEAD, UserRole.PMC_HEAD, UserRole.COORDINATOR, UserRole.SITE_ENGINEER],
    },
    {
      id: "machinery_list",
      label: "Plant Machinery",
      icon: Icons.Labor,
      roles: [UserRole.SITE_ENGINEER, UserRole.TEAM_LEAD],
    },
    // {
    //   id: "hse",
    //   label: "HSE (Safety)",
    //   icon: Icons.Safety,
    //   roles: [UserRole.TEAM_LEAD, UserRole.PMC_HEAD, UserRole.SITE_ENGINEER],
    // },
    {
      id: "projects",
      label: "Portfolio",
      icon: Icons.Project,
      roles: [
        UserRole.PMC_HEAD,
        UserRole.TEAM_LEAD,
        UserRole.COORDINATOR,
      ],
    },
    {
      id: "dpr_records",
      label: "DPR Review",
      icon: Icons.Task,
      roles: [
        UserRole.PMC_HEAD,
        UserRole.TEAM_LEAD,
        UserRole.SITE_ENGINEER,
        UserRole.COORDINATOR,
      ],
    },
    {
      id: "wpr_records",
      label: "WPR Review",
      icon: Icons.Calendar,
      roles: [
        UserRole.PMC_HEAD,
        UserRole.TEAM_LEAD,
        UserRole.SITE_ENGINEER,
        UserRole.COORDINATOR,
      ],
    },
    {
      id: "alerts",
      label: "Alerts",
      icon: Icons.Notification,
      roles: [UserRole.TEAM_LEAD],
    },
    // {
    //   id: "documents",
    //   label: "Vault",
    //   icon: Icons.Document,
    //   roles: [UserRole.PMC_HEAD, UserRole.TEAM_LEAD, UserRole.COORDINATOR],
    // },
  ];

  // Hide sidebar when viewing Projects dashboard (team_projects)
  const hideSidebar = activeTab === "team_projects";

  useEffect(() => {
    if (isOnboardingTourActive && hideSidebar && !sidebarOverlayOpen) {
      console.log(
        "[Layout] Tour active — forcing sidebar open to keep Joyride targets stable",
      );
      setSidebarOverlayOpen(true);
    }
  }, [isOnboardingTourActive, hideSidebar, sidebarOverlayOpen]);

  useEffect(() => {
    if (!sidebarOverlayOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSidebarOverlay();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sidebarOverlayOpen, closeSidebarOverlay]);

  useEffect(() => {
    if (!sidebarOverlayOpen) return;
    const mq = window.matchMedia('(max-width: 767px)');
    const lockScroll = hideSidebar || mq.matches;
    if (!lockScroll) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [sidebarOverlayOpen, hideSidebar]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const onChange = () => {
      if (mq.matches && !hideSidebar) closeSidebarOverlay();
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [hideSidebar, closeSidebarOverlay]);

  const navItemRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    if (!sidebarOverlayOpen && hideSidebar) return;
    const activeEl = navItemRefs.current[activeTab];
    activeEl?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [activeTab, sidebarOverlayOpen, hideSidebar]);

  const getNavItemClassName = useCallback(
    (isActive: boolean) => {
      if (isActive) {
        return isDarkTheme
          ? 'sidebar-nav-active-dark active-pill'
          : 'sidebar-nav-active-light active-pill-light';
      }
      return isDarkTheme ? 'sidebar-nav-item-idle-dark muted' : 'sidebar-nav-item-idle-light';
    },
    [isDarkTheme]
  );

  const sidebarClassName = hideSidebar
    ? `fixed inset-y-0 left-0 z-50 ${sidebarOverlayOpen
      ? 'translate-x-0 shadow-2xl pointer-events-auto'
      : '-translate-x-full pointer-events-none'
    }`
    : `fixed inset-y-0 left-0 z-50 ${sidebarOverlayOpen
      ? 'translate-x-0 shadow-2xl pointer-events-auto'
      : '-translate-x-full pointer-events-none'
    } md:relative md:z-auto md:flex md:translate-x-0 md:shadow-none md:pointer-events-auto`;

  return (
    <div
      className={`relative h-screen overflow-hidden ${isDarkTheme ? "bg-slate-900" : "bg-gradient-to-br from-blue-50 to-indigo-100"}`}
    >
      {isDarkTheme && (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{
            backgroundImage: "url(/images/construction-bg.jpg)",
            backgroundColor: "rgb(15 23 42)", // Fallback background
          }}
        />
      )}
      <div
        className={`flex h-full overflow-hidden relative z-10 animate-fade-in ${isDarkTheme ? 'text-white' : 'text-gray-900'}`}
        style={{ '--app-sidebar-width': hideSidebar ? '0px' : '16rem' } as React.CSSProperties}
      >
        <>
          {sidebarOverlayOpen && (
            <div
              className={`sidebar-backdrop fixed inset-0 z-40 bg-black/50 ${hideSidebar ? '' : 'md:hidden'}`}
              onClick={closeSidebarOverlay}
              aria-hidden="true"
            />
          )}
          <aside
            className={`app-sidebar flex h-full w-64 max-w-[min(16rem,88vw)] flex-shrink-0 flex-col ${sidebarClassName} ${isDarkTheme ? 'nav-dark' : 'nav-light'
              }`}
          >
            <div className={`border-b px-4 py-4 ${themeClasses.border}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="sidebar-logo-wrap min-w-0 flex-1">
                  <img
                    src="/images/Shrikhande-logo-bgremove.png"
                    alt="Shrikhande"
                    className="h-9 w-auto"
                  />
                </div>
                {sidebarOverlayOpen && (
                  <button
                    type="button"
                    onClick={closeSidebarOverlay}
                    className={`sidebar-icon-btn shrink-0 md:hidden ${isDarkTheme ? 'sidebar-icon-btn-dark text-slate-400' : 'sidebar-icon-btn-light text-slate-600'}`}
                    aria-label="Close sidebar"
                  >
                    <Icons.Close size={18} strokeWidth={1.8} />
                  </button>
                )}
              </div>
            </div>

            <nav className="flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden px-3 py-4">
              {(user.role === UserRole.SITE_ENGINEER
                ? SITE_ENGINEER_NAV_IDS.map((id) => navigation.find((item) => item.id === id)).filter(
                  (item): item is (typeof navigation)[number] => Boolean(item),
                )
                : navigation
              ).map((item, index) => {
                if (user.role !== UserRole.SITE_ENGINEER) {
                  if (item.id === 'financial_management') {
                    const isTeamLead = user.role === UserRole.TEAM_LEAD;
                    const isBillingEngineer = user.role === UserRole.BILLING_SITE_ENGINEER;
                    const isSpecialUser = user.username === 'pmc_bse';
                    if (!isTeamLead && !isBillingEngineer && !isSpecialUser) return null;
                  } else if (!item.roles.includes(user.role)) {
                    return null;
                  }
                }
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                const stagger = Math.min(index + 1, 5);
                const navLabel =
                  user.role === UserRole.SITE_ENGINEER
                    ? SITE_ENGINEER_NAV_LABELS[item.id] ?? item.label
                    : item.id === 'my_scopes' && user.role === UserRole.QAQC_SITE_ENGINEER
                      ? 'QAQC Dashboard'
                      : item.id === 'my_scopes' && user.role === UserRole.BILLING_SITE_ENGINEER
                        ? 'Billing Dashboard'
                        : item.id === 'financial_management' && user.role === UserRole.BILLING_SITE_ENGINEER
                          ? 'Financial Management'
                          : item.label;
                return (
                  <button
                    key={item.id}
                    ref={(el) => {
                      navItemRefs.current[item.id] = el;
                    }}
                    type="button"
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => {
                      setActiveTab(item.id);
                      closeSidebarOverlay();
                    }}
                    style={isActive ? undefined : { animationDelay: `${stagger * 0.04}s` }}
                    className={`sidebar-nav-item w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left ${getTourClassName(item.id)} ${getNavItemClassName(isActive)} ${isActive ? '' : 'sidebar-nav-enter'
                      }`}
                  >
                    <span className={`sidebar-nav-icon ${isActive ? 'text-inherit' : ''}`}>
                      <Icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
                    </span>
                    <span
                      className={`truncate text-sm transition-transform duration-200 ${isActive ? 'font-bold text-inherit' : 'font-semibold'
                        }`}
                    >
                      {navLabel}
                    </span>
                  </button>
                );
              })}
            </nav>

            <div className={`mt-auto border-t ${themeClasses.border}`}>
              <div className="p-3">
                <div
                  className={`profile-menu sidebar-profile-card group flex items-center gap-2.5 rounded-xl px-2.5 py-2 ${themeClasses.glassCard} ${themeClasses.border} ${isDarkTheme ? 'sidebar-profile-card-dark' : 'sidebar-profile-card-light'
                    }`}
                >
                  <UserAvatar
                    src={user.avatar}
                    name={user.name}
                    className="h-9 w-9 rounded-lg"
                    isDarkTheme={isDarkTheme}
                  />
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <p className={`truncate text-sm font-bold leading-tight ${themeClasses.textPrimary}`}>
                      {user.name}
                    </p>
                    <p
                      className={`truncate text-[11px] font-semibold uppercase leading-tight tracking-wide ${themeClasses.textSecondary}`}
                    >
                      {ROLE_LABELS[user.role] ?? user.role}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onLogout}
                    title="Sign out"
                    className={`sidebar-icon-btn shrink-0 ${isDarkTheme
                      ? 'sidebar-icon-btn-dark text-white/60 hover:!text-rose-400'
                      : 'sidebar-icon-btn-light text-slate-500 hover:!text-rose-500'
                      }`}
                  >
                    <Icons.Logout size={18} strokeWidth={1.8} />
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </>

        <main
          className={`flex-1 flex flex-col min-w-0 overflow-hidden ${hideSidebar ? "w-full" : ""}`}
        >
          <header
            className={`flex h-14 shrink-0 items-center justify-between gap-2 border-b px-3 sm:h-16 sm:px-5 md:px-8 ${themeClasses.glassCard} ${themeClasses.border} z-30`}
          >
            {/* ── LEFT SIDE ── */}
            <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">

              {/* Hamburger — mobile drawer when sidebar is pinned on desktop */}
              {!hideSidebar && (
                <button
                  type="button"
                  onClick={toggleSidebarOverlay}
                  className={`flex md:hidden items-center justify-center h-9 w-9 shrink-0 rounded-xl border transition-all ${themeClasses.buttonSecondary} ${themeClasses.border} ${sidebarOverlayOpen ? (isDarkTheme ? 'bg-white/10' : 'bg-slate-100') : ''
                    }`}
                  title={sidebarOverlayOpen ? 'Close menu' : 'Open menu'}
                  aria-label={sidebarOverlayOpen ? 'Close menu' : 'Open menu'}
                  aria-expanded={sidebarOverlayOpen}
                >
                  {sidebarOverlayOpen ? <Icons.Close size={18} /> : <Icons.Menu size={18} />}
                </button>
              )}

              {/* Menu button — when sidebar is hidden (Projects tab) */}
              {hideSidebar && (
                <button
                  type="button"
                  onClick={toggleSidebarOverlay}
                  className={`flex items-center justify-center gap-2 h-9 min-w-9 px-3 border rounded-xl text-xs font-bold transition-all shrink-0 ${themeClasses.buttonSecondary} ${themeClasses.border} ${sidebarOverlayOpen ? (isDarkTheme ? 'bg-white/10' : 'bg-slate-100') : ''
                    }`}
                  title={sidebarOverlayOpen ? 'Close menu' : 'Open menu'}
                  aria-label={sidebarOverlayOpen ? 'Close menu' : 'Open menu'}
                  aria-expanded={sidebarOverlayOpen}
                >
                  {sidebarOverlayOpen ? <Icons.Close size={16} /> : <Icons.Sidebar size={16} />}
                  <span className="hidden sm:inline">{sidebarOverlayOpen ? 'Close' : 'Menu'}</span>
                </button>
              )}

              {/* Back button — when sidebar hidden & non-Team Lead */}
              {hideSidebar && user.role !== UserRole.TEAM_LEAD && (
                <button
                  onClick={() => setActiveTab("dashboard")}
                  className={`flex items-center gap-1.5 h-9 px-3 border rounded-xl text-xs font-bold transition-all shrink-0 ${themeClasses.buttonSecondary} ${themeClasses.border}`}
                >
                  <Icons.ChevronRight size={15} className="rotate-180" />
                  <span className="hidden sm:inline">Back</span>
                </button>
              )}

              {/* Project Selector — Projects tab only (hidden for Team Leader — single assigned project) */}
              {activeTab === "team_projects" &&
                projects.length > 0 &&
                user.role !== UserRole.TEAM_LEAD && (
                  <div className="relative min-w-0 shrink">
                    <button
                      onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                      className={`flex items-center gap-2 h-9 px-3 border rounded-xl transition-all ${isDarkTheme
                        ? "bg-white/5 border-white/10 hover:bg-white/10 text-white"
                        : "bg-white border-slate-200 hover:border-indigo-300 shadow-sm text-slate-900"
                        }`}
                    >
                      <span className="max-w-[100px] truncate text-xs font-bold sm:max-w-[140px] md:max-w-[200px]">
                        {selectedProject ? selectedProject.title : "Select Project"}
                      </span>
                      <Icons.ChevronRight
                        className={`shrink-0 transition-transform duration-200 ${isProjectDropdownOpen ? "rotate-90" : "rotate-0"} ${themeClasses.textMuted}`}
                        size={13}
                      />
                    </button>

                    {isProjectDropdownOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setIsProjectDropdownOpen(false)}
                        />
                        <div
                          className={`absolute top-full left-0 mt-2 w-64 rounded-2xl shadow-2xl z-50 overflow-hidden border animate-in fade-in slide-in-from-top-2 ${isDarkTheme
                            ? "bg-slate-800 border-white/10"
                            : "bg-white border-slate-200"
                            }`}
                        >
                          <div className="max-h-80 overflow-y-auto py-2">
                            {projects.map((p) => (
                              <button
                                key={p.id}
                                onClick={() => {
                                  onSelectProject?.(p.id);
                                  setIsProjectDropdownOpen(false);
                                }}
                                className={`w-full px-4 py-3 text-left text-xs font-bold transition-colors flex items-center justify-between group ${selectedProjectId === p.id
                                  ? isDarkTheme
                                    ? "bg-indigo-500/20 text-indigo-400"
                                    : "bg-indigo-50 text-indigo-600"
                                  : isDarkTheme
                                    ? "text-slate-300 hover:bg-white/5"
                                    : "text-slate-600 hover:bg-slate-50"
                                  }`}
                              >
                                <span className="truncate">{p.title}</span>
                                {selectedProjectId === p.id && (
                                  <Icons.Check size={12} />
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
            </div>

            <div className="relative z-[110] flex items-center gap-4">
              {user.role === UserRole.TEAM_LEAD && (
                <button
                  type="button"
                  onClick={() => teamLeaderTourRef.current?.startTour()}
                  disabled={isAnyTourRunning || isOnboardingTourActive}
                  title={teamLeaderTourCompleted ? 'Restart sidebar tour' : 'Start sidebar tour'}
                  aria-label={teamLeaderTourCompleted ? 'Restart sidebar tour' : 'Start sidebar tour'}
                  className={`team-leader-tour-btn inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${isDarkTheme
                    ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20'
                    : 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                    }`}
                >
                  <Icons.Help size={16} />
                  <span className="hidden md:inline">
                    {teamLeaderTourCompleted ? 'Restart Tour' : 'Help'}
                  </span>
                </button>
              )}
              <button
                onClick={() => setIsDarkTheme(!isDarkTheme)}
                className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${themeClasses.buttonSecondary}`}
                title={isDarkTheme ? "Switch to light theme" : "Switch to dark theme"}
                aria-label={isDarkTheme ? "Switch to light theme" : "Switch to dark theme"}
              >
                {isDarkTheme ? <Icons.Sun size={18} /> : <Icons.Moon size={18} />}
              </button>

              {/* Notification bell */}
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className={`relative flex h-9 items-center justify-center gap-1.5 rounded-xl px-2.5 transition-colors sm:px-3 ${themeClasses.buttonSecondary}`}
                aria-label={unreadCount > 0 ? `Alerts (${unreadCount})` : 'Alerts'}
              >
                <Icons.Notification size={18} />
                <span className={`hidden text-[10px] font-black uppercase tracking-wider sm:inline ${themeClasses.textSecondary}`}>
                  Alerts{unreadCount > 0 ? ` (${unreadCount})` : ''}
                </span>
                {unreadCount > 0 && (
                  <span
                    className={`absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 bg-rose-500 text-[8px] font-black text-white ${isDarkTheme ? "border-slate-900" : "border-white"
                      }`}
                  >
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div
                  className={`absolute top-full right-0 mt-2 w-80 rounded-2xl z-50 animate-in fade-in slide-in-from-top-2 ${isDarkTheme
                    ? "glass-card"
                    : "bg-white border border-gray-200 shadow-lg"
                    }`}
                >
                  <div
                    className={`p-4 border-b flex items-center justify-between ${isDarkTheme ? "border-white/10" : "border-gray-200"
                      }`}
                  >
                    <h3
                      className={`text-[10px] font-black uppercase tracking-widest ${isDarkTheme ? "muted" : "text-gray-600"
                        }`}
                    >
                      Alerts{unreadCount > 0 ? ` (${unreadCount})` : ''}
                    </h3>
                    {unreadCount > 0 && (
                      <span
                        className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase ${isDarkTheme
                          ? "bg-white/10 text-contrast"
                          : "bg-indigo-100 text-indigo-800"
                          }`}
                      >
                        Unread
                      </span>
                    )}
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {userNotifications.length > 0 ? (
                      userNotifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            void onMarkRead(n.id, true);
                            setShowNotifications(false);
                            onNotificationClick?.(n);
                          }}
                          className={`p-4 border-b cursor-pointer transition-colors relative ${isDarkTheme
                            ? `border-white/5 hover:bg-white/10 ${!n.isRead ? "bg-white/5" : ""}`
                            : `border-gray-200 hover:bg-gray-50 ${!n.isRead ? "bg-indigo-50" : ""}`
                            }`}
                        >
                          <div className="flex gap-3">
                            <div
                              className={`mt-1 w-2 h-2 rounded-full shrink-0 ${n.type === "ALERT"
                                ? "bg-rose-500"
                                : n.type === "SUCCESS"
                                  ? "bg-emerald-500"
                                  : "bg-indigo-500"
                                }`}
                            ></div>
                            <div>
                              <p
                                className={`text-xs font-black leading-tight ${isDarkTheme
                                  ? "text-contrast"
                                  : "text-gray-900"
                                  }`}
                              >
                                {n.title}
                              </p>
                              <p
                                className={`text-[10px] mt-1 leading-normal font-medium ${isDarkTheme ? "muted" : "text-gray-600"
                                  }`}
                              >
                                {n.message}
                              </p>
                              <p
                                className={`text-[8px] mt-2 font-bold uppercase tracking-tight ${isDarkTheme ? "muted" : "text-gray-500"
                                  }`}
                              >
                                {n.moduleName ? `${n.moduleName} · ` : ''}
                                {n.timestamp}
                              </p>
                            </div>
                          </div>
                          {!n.isRead && (
                            <div
                              className={`absolute right-4 top-4 w-1.5 h-1.5 rounded-full ${isDarkTheme ? "bg-indigo-400" : "bg-indigo-500"
                                }`}
                            ></div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="p-10 text-center">
                        <Icons.Notification
                          size={32}
                          className={`mx-auto mb-2 ${isDarkTheme ? "text-white/20" : "text-gray-300"
                            }`}
                        />
                        <p
                          className={`text-[10px] font-black uppercase ${isDarkTheme ? "muted" : "text-gray-500"
                            }`}
                        >
                          No notifications available.
                        </p>
                      </div>
                    )}
                  </div>
                  <div
                    className={`p-3 text-center rounded-b-2xl ${isDarkTheme ? "bg-white/5" : "bg-gray-50"
                      }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setShowNotifications(false);
                        onNavigateToAlerts?.();
                      }}
                      className={`text-[10px] font-black uppercase tracking-widest hover:underline ${isDarkTheme ? "" : "text-gray-700"
                        }`}
                    >
                      View All Alerts
                    </button>
                  </div>
                </div>
              )}
            </div>
          </header>

          <div
            key={activeTab}
            className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth animate-fade-in"
            onClick={() => setShowNotifications(false)}
          >
            {children}
          </div>
        </main>
      </div>
      {user.role === UserRole.TEAM_LEAD && (
        <TeamLeaderSidebarTour
          ref={teamLeaderTourRef}
          onRequestOpenSidebar={() => setSidebarOverlayOpen(true)}
          onTourStateChange={onOnboardingTourStateChange}
          isTourRunning={isAnyTourRunning}
          onCollapseSidebarAfterProjects={() => {
            setSidebarOverlayOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default Layout;
