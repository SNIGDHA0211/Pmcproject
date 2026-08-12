
import React, { useState, useEffect, useRef, useCallback, useMemo, Fragment } from 'react';
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
import AlertNotificationItem from './alerts/AlertNotificationItem';
import { isTabAllowedForRole } from '../utils/roleRouting';
import { isPmcHeadEquivalent } from '../utils/pmcRoleAccess';
import { canAccessUserManagement } from '../utils/userManagementAccess';
import type { NavReturnContext } from '../utils/navReturn';
import { navReturnLabel } from '../utils/navReturn';

/** Client-friendly section titles + one-line hints (UX only — ids/routes unchanged). */
const SIDEBAR_SECTION_META: Record<string, { title: string; hint: string }> = {
  Command: { title: 'Workspace', hint: 'Plan and manage projects' },
  Field: { title: 'On site', hint: 'Progress, photos, and field work' },
  Reviews: { title: 'Reviews', hint: 'Portfolio and report checks' },
  Meetings: { title: 'Meetings', hint: 'MOM and meeting files' },
  Support: { title: 'Support', hint: 'Reminders, alerts, and help' },
};

interface LayoutProps {
  children: React.ReactNode;
  user: User;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  teamLeaderProjectsView?: 'overview' | 'full';
  onTeamLeaderBackToOverview?: () => void;
  /** When set and user is on a connected section, show Back to the overview/source. */
  navReturn?: NavReturnContext | null;
  onNavBack?: () => void;
  notifications: AppNotification[];
  onMarkRead: (id: string, isRead?: boolean) => void;
  /** Lazy-load alert history when the notification bell opens (Sprint 1). */
  onRequestNotifications?: () => void;
  onNavigateToAlerts?: () => void;
  onNotificationClick?: (notification: AppNotification) => void;
  /** Overdue + due-today reminder count for sidebar badge */
  reminderBadgeCount?: number;
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
  teamLeaderProjectsView = 'overview',
  onTeamLeaderBackToOverview,
  navReturn = null,
  onNavBack,
  notifications,
  onMarkRead,
  onRequestNotifications,
  onNavigateToAlerts,
  onNotificationClick,
  reminderBadgeCount = 0,
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
      html.style.backgroundColor = '#0a1420';
      html.dataset.theme = 'dark';
    } else {
      html.style.backgroundColor = '#e8f4fb';
      html.dataset.theme = 'light';
    }
  }, [isDarkTheme]);
  const themeClasses = getThemeClasses(isDarkTheme);
  const [showNotifications, setShowNotifications] = useState(false);
  const [sidebarOverlayOpen, setSidebarOverlayOpen] = useState(false);
  /** Desktop icon-rail: false = icons only, true = full labels */
  const [sidebarExpanded, setSidebarExpanded] = useState(() => {
    try {
      const stored = localStorage.getItem('pmc.sidebarRailExpanded');
      if (stored === '0') return false;
      if (stored === '1') return true;
    } catch {
      /* ignore */
    }
    return true;
  });
  /** Collapsed nav sections (keys = original section ids like Command). */
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem('pmc.sidebarSectionsCollapsed');
      if (raw) return JSON.parse(raw) as Record<string, boolean>;
    } catch {
      /* ignore */
    }
    return {};
  });
  const teamLeaderTourRef = useRef<TeamLeaderSidebarTourHandle>(null);

  const persistSidebarExpanded = useCallback((expanded: boolean) => {
    setSidebarExpanded(expanded);
    try {
      localStorage.setItem('pmc.sidebarRailExpanded', expanded ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, []);

  const toggleSectionCollapsed = useCallback((sectionKey: string) => {
    setCollapsedSections((prev) => {
      const next = { ...prev, [sectionKey]: !prev[sectionKey] };
      try {
        localStorage.setItem('pmc.sidebarSectionsCollapsed', JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const closeSidebarOverlay = useCallback(() => {
    if (!isOnboardingTourActive) setSidebarOverlayOpen(false);
  }, [isOnboardingTourActive]);

  const toggleSidebarOverlay = useCallback(() => {
    setSidebarOverlayOpen((prev) => !prev);
  }, []);

  const expandSidebarRail = useCallback(() => {
    persistSidebarExpanded(true);
  }, [persistSidebarExpanded]);

  const collapseSidebarRail = useCallback(() => {
    if (isOnboardingTourActive) return;
    persistSidebarExpanded(false);
  }, [isOnboardingTourActive, persistSidebarExpanded]);

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
  const isPMCHead = isPmcHeadEquivalent(user);
  const canViewAlertsPage = isTabAllowedForRole('alerts', user.role, user.username, user);

  const getTourClassName = (id: string): string => {
    const classMap: Record<string, string> = {
      team_projects: "projects-menu",
      commercials: "commercials-menu",
      execution: "site-progress-menu",
      monthly_scope: "monthly-scope-menu",
      manpower_management: "manpower-menu",
      financial_management: "financial-menu",
      site_photos: "site-photos-menu",
      testing_photos: "testing-photos-menu",
      project_feedback: "project-feedback-menu",
      user_management: "user-management-menu",
      machinery_list: "plant-menu",
      hse: "hse-menu",
      projects: "portfolio-menu",
      dpr_records: "dpr-menu",
      wpr_records: "wpr-menu",
      mpr_records: "mpr-menu",
      documents: "vault-menu",
    };
    return classMap[id] || "";
  };

  const navigation = [
    {
      id: "dashboard",
      label: "Overview",
      icon: Icons.Dashboard,
      section: "Command",
      roles: [UserRole.PMC_HEAD, UserRole.PMC_HEAD_OFFICE, UserRole.COORDINATOR],
    },
    {
      id: "site_engineer_dashboard",
      label: "Dashboard",
      icon: Icons.Building2,
      section: "Command",
      roles: [UserRole.SITE_ENGINEER],
    },
    {
      id: "my_scopes",
      label: "My Scopes",
      icon: Icons.Task,
      section: "Command",
      roles: [
        UserRole.SITE_ENGINEER,
        UserRole.BILLING_SITE_ENGINEER,
        UserRole.QAQC_SITE_ENGINEER,
        UserRole.HSE_SITE_ENGINEER,
      ],
    },
    {
      id: "team_projects",
      label: user.role === UserRole.TEAM_LEAD ? "Overview" : "Projects",
      icon: Icons.Building,
      section: "Command",
      roles: [UserRole.TEAM_LEAD, UserRole.PMC_HEAD, UserRole.PMC_HEAD_OFFICE, UserRole.COORDINATOR],
    },
    {
      id: "project_init",
      label: "Initialize Project",
      icon: Icons.Add,
      section: "Command",
      roles: [UserRole.PMC_HEAD, UserRole.PMC_HEAD_OFFICE, UserRole.COORDINATOR],
    },
    {
      id: "user_management",
      label: "User Management",
      icon: Icons.User,
      section: "Command",
      roles: [UserRole.PMC_HEAD, UserRole.PMC_HEAD_OFFICE, UserRole.CEO],
    },
    {
      id: "execution",
      label: "Site Progress",
      icon: Icons.Execution,
      section: "Field",
      roles: [UserRole.TEAM_LEAD, UserRole.PMC_HEAD, UserRole.PMC_HEAD_OFFICE, UserRole.COORDINATOR, UserRole.SITE_ENGINEER],
    },
    {
      id: "monthly_scope",
      label: "Monthly Scope",
      icon: Icons.Task,
      section: "Field",
      roles: [UserRole.TEAM_LEAD],
    },
    {
      id: "manpower_management",
      label: "Manpower Management",
      icon: Icons.Labor,
      section: "Field",
      roles: [UserRole.TEAM_LEAD, UserRole.SITE_ENGINEER],
    },
    {
      id: "financial_management",
      label: "Financial Management",
      icon: Icons.Finance,
      section: "Field",
      roles: [UserRole.TEAM_LEAD, UserRole.BILLING_SITE_ENGINEER],
    },
    {
      id: "site_photos",
      label: "Site Photos",
      icon: Icons.Upload,
      section: "Field",
      roles: [UserRole.TEAM_LEAD, UserRole.PMC_HEAD, UserRole.PMC_HEAD_OFFICE, UserRole.COORDINATOR, UserRole.SITE_ENGINEER],
    },
    {
      id: "testing_photos",
      label: "Testing Photos",
      icon: Icons.ClipboardList,
      section: "Field",
      roles: [UserRole.PMC_HEAD, UserRole.PMC_HEAD_OFFICE, UserRole.COORDINATOR, UserRole.TEAM_LEAD, UserRole.QAQC_SITE_ENGINEER],
    },
    {
      id: "project_feedback",
      label: "Project Feedback",
      icon: Icons.Comment,
      section: "Field",
      roles: [UserRole.PMC_HEAD, UserRole.PMC_HEAD_OFFICE, UserRole.COORDINATOR, UserRole.TEAM_LEAD, UserRole.SITE_ENGINEER],
    },
    {
      id: "machinery_list",
      label: "Plant Machinery",
      icon: Icons.Labor,
      section: "Field",
      roles: [UserRole.SITE_ENGINEER, UserRole.TEAM_LEAD],
    },
    {
      id: "projects",
      label: "Portfolio",
      icon: Icons.Project,
      section: "Reviews",
      roles: [
        UserRole.PMC_HEAD,
        UserRole.PMC_HEAD_OFFICE,
        UserRole.TEAM_LEAD,
        UserRole.COORDINATOR,
      ],
    },
    {
      id: "dpr_records",
      label: "DPR Review",
      icon: Icons.Task,
      section: "Reviews",
      roles: [
        UserRole.PMC_HEAD,
        UserRole.PMC_HEAD_OFFICE,
        UserRole.TEAM_LEAD,
        UserRole.SITE_ENGINEER,
        UserRole.COORDINATOR,
      ],
    },
    {
      id: "wpr_records",
      label: "WPR Review",
      icon: Icons.Calendar,
      section: "Reviews",
      roles: [
        UserRole.PMC_HEAD,
        UserRole.PMC_HEAD_OFFICE,
        UserRole.TEAM_LEAD,
        UserRole.SITE_ENGINEER,
        UserRole.COORDINATOR,
      ],
    },
    {
      id: "mpr_records",
      label: "MPR Review",
      icon: Icons.Document,
      section: "Reviews",
      roles: [
        UserRole.PMC_HEAD,
        UserRole.PMC_HEAD_OFFICE,
        UserRole.TEAM_LEAD,
        UserRole.SITE_ENGINEER,
        UserRole.COORDINATOR,
      ],
    },
    {
      id: "meeting_documents",
      label: "Meeting Documents",
      icon: Icons.ClipboardList,
      section: "Meetings",
      roles: [UserRole.PMC_HEAD, UserRole.PMC_HEAD_OFFICE, UserRole.TEAM_LEAD, UserRole.COORDINATOR],
    },
    {
      id: "reminders",
      label: "Reminders",
      icon: Icons.Clock,
      section: "Support",
      roles: [
        UserRole.TEAM_LEAD,
        UserRole.PMC_HEAD,
        UserRole.PMC_HEAD_OFFICE,
        UserRole.COORDINATOR,
        UserRole.SITE_ENGINEER,
      ],
    },
    {
      id: "alerts",
      label: "Alerts",
      icon: Icons.Notification,
      section: "Support",
      roles: [UserRole.TEAM_LEAD, UserRole.PMC_HEAD, UserRole.PMC_HEAD_OFFICE, UserRole.COORDINATOR],
    },
  ];

  // Projects tab used to fully hide the sidebar; all roles now keep the icon rail.
  const isProjectsTab = activeTab === "team_projects";

  const handleMainBodyClick = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (!window.matchMedia('(min-width: 768px)').matches) return;
    if (!sidebarExpanded) return;
    collapseSidebarRail();
  }, [collapseSidebarRail, sidebarExpanded]);

  useEffect(() => {
    if (isOnboardingTourActive) {
      persistSidebarExpanded(true);
      if (!sidebarOverlayOpen) {
        setSidebarOverlayOpen(true);
      }
    }
  }, [isOnboardingTourActive, sidebarOverlayOpen, persistSidebarExpanded]);

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
    if (!mq.matches) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [sidebarOverlayOpen]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const onChange = () => {
      if (mq.matches) closeSidebarOverlay();
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [closeSidebarOverlay]);

  const navItemRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    const activeEl = navItemRefs.current[activeTab];
    activeEl?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [activeTab, sidebarOverlayOpen, sidebarExpanded]);

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

  const sidebarClassName =
    `fixed inset-y-0 left-0 z-50 ${sidebarOverlayOpen
      ? 'translate-x-0 shadow-2xl pointer-events-auto'
      : '-translate-x-full pointer-events-none'
    } md:relative md:z-auto md:flex md:translate-x-0 md:shadow-none md:pointer-events-auto`;

  const visibleNavigation = useMemo(() => {
    const source =
      user.role === UserRole.SITE_ENGINEER
        ? SITE_ENGINEER_NAV_IDS.map((id) => navigation.find((item) => item.id === id)).filter(
            (item): item is (typeof navigation)[number] => Boolean(item),
          )
        : navigation;

    return source.filter((item) => {
      if (user.role === UserRole.SITE_ENGINEER) return true;
      if (item.id === 'user_management') {
        return canAccessUserManagement(user);
      }
      if (item.id === 'financial_management') {
        const isTeamLead = user.role === UserRole.TEAM_LEAD;
        const isBillingEngineer = user.role === UserRole.BILLING_SITE_ENGINEER;
        const isSpecialUser = user.username === 'pmc_bse';
        return isTeamLead || isBillingEngineer || isSpecialUser;
      }
      return item.roles.includes(user.role);
    });
  }, [user.role, user.username, user.isSuperuser]);

  const isDesktopRailCollapsed = !sidebarExpanded;
  const sidebarWidthCss = sidebarExpanded ? '16.25rem' : '4.5rem';

  const resolveNavLabel = useCallback(
    (item: { id: string; label: string }) => {
      if (user.role === UserRole.SITE_ENGINEER) {
        return SITE_ENGINEER_NAV_LABELS[item.id] ?? item.label;
      }
      if (item.id === 'my_scopes' && user.role === UserRole.QAQC_SITE_ENGINEER) return 'QAQC Dashboard';
      if (item.id === 'my_scopes' && user.role === UserRole.HSE_SITE_ENGINEER) return 'HSE Dashboard';
      if (item.id === 'my_scopes' && user.role === UserRole.BILLING_SITE_ENGINEER) {
        return 'Billing Dashboard';
      }
      if (item.id === 'financial_management' && user.role === UserRole.BILLING_SITE_ENGINEER) {
        return 'Financial Management';
      }
      return item.label;
    },
    [user.role],
  );

  const activeNavLabel = useMemo(() => {
    const item = visibleNavigation.find((n) => n.id === activeTab);
    return item ? resolveNavLabel(item) : 'Overview';
  }, [visibleNavigation, activeTab, resolveNavLabel]);

  // Keep the section that holds the active page open
  useEffect(() => {
    const item = visibleNavigation.find((n) => n.id === activeTab);
    const section = item && 'section' in item ? (item as { section?: string }).section : undefined;
    if (!section) return;
    setCollapsedSections((prev) => {
      if (!prev[section]) return prev;
      const next = { ...prev, [section]: false };
      try {
        localStorage.setItem('pmc.sidebarSectionsCollapsed', JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, [activeTab, visibleNavigation]);

  return (
    <div className={`relative h-screen overflow-hidden ${isDarkTheme ? 'bg-[#0a1420]' : 'bg-[#e8f4fb]'}`}>
      {/* Shared construction panorama — opacity + overlays tuned per theme */}
      <div
        className={`absolute inset-0 bg-cover bg-no-repeat ${
          isDarkTheme ? 'opacity-[0.48] saturate-[1.05]' : 'opacity-[0.38] saturate-[0.95] brightness-[1.05]'
        }`}
        style={{
          backgroundImage: 'url(/images/construction-panorama-bg.png)',
          backgroundPosition: 'center 42%',
        }}
        aria-hidden
      />
      <div
        className={`pointer-events-none absolute inset-0 ${
          isDarkTheme
            ? 'bg-gradient-to-br from-[#0a1420]/88 via-[#101820]/70 to-[#1a2332]/80'
            : 'bg-gradient-to-br from-[#e8f4fb]/86 via-[#f5f9fc]/68 to-[#fff4e4]/48'
        }`}
        aria-hidden
      />
      <div
        className={`pointer-events-none absolute inset-0 ${
          isDarkTheme
            ? 'bg-[radial-gradient(ellipse_at_72%_28%,rgba(230,168,40,0.16)_0%,transparent_52%),radial-gradient(ellipse_at_20%_80%,rgba(56,120,180,0.10)_0%,transparent_50%)]'
            : 'bg-[radial-gradient(ellipse_at_80%_22%,rgba(255,196,70,0.20)_0%,transparent_46%),radial-gradient(ellipse_at_18%_12%,rgba(90,168,220,0.18)_0%,transparent_44%)]'
        }`}
        aria-hidden
      />
      <div
        className={`flex h-full overflow-hidden relative z-10 animate-fade-in ${isDarkTheme ? 'text-white' : 'text-gray-900'}`}
        style={{ '--app-sidebar-width': sidebarWidthCss } as React.CSSProperties}
      >
        <>
          {sidebarOverlayOpen && (
            <div
              className="sidebar-backdrop fixed inset-0 z-40 bg-black/50 md:hidden"
              onClick={closeSidebarOverlay}
              aria-hidden="true"
            />
          )}
          <aside
            className={`app-sidebar flex h-full flex-shrink-0 flex-col ${
              sidebarExpanded
                ? 'w-[16.25rem] max-w-[min(16.25rem,92vw)]'
                : 'w-[16.25rem] max-w-[min(16.25rem,92vw)] md:w-[4.5rem] md:max-w-[4.5rem]'
            } ${isDesktopRailCollapsed ? 'is-rail-collapsed' : ''} ${sidebarClassName} ${
              isDarkTheme ? 'nav-dark' : 'nav-light'
            }`}
          >
            <div
              className={`sidebar-header border-b px-3 pb-2.5 pt-3 ${
                isDarkTheme ? 'border-cyan-400/15' : 'border-cyan-200/50'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  className="sidebar-logo-wrap min-w-0 flex-1 text-left"
                  onClick={() => {
                    if (isDesktopRailCollapsed) expandSidebarRail();
                    else collapseSidebarRail();
                  }}
                  title={sidebarExpanded ? 'Collapse menu' : 'Expand menu'}
                  aria-label={sidebarExpanded ? 'Collapse menu' : 'Expand menu'}
                >
                  <img
                    src="/images/Shrikhande-logo-bgremove.png"
                    alt="Shrikhande Consultants Limited"
                    className="sidebar-logo-full h-8 w-auto max-w-[11rem] object-contain object-left"
                  />
                  <span className="sidebar-logo-mark mx-auto h-8 w-8 items-center justify-center">
                    <img
                      src="/images/sc-favicon.png"
                      alt="SC"
                      className="h-7 w-7 object-contain"
                    />
                  </span>
                </button>
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
              <div
                className={`sidebar-role-badge sidebar-chrome mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${
                  isDarkTheme ? 'sidebar-role-badge-dark' : 'sidebar-role-badge-light'
                }`}
              >
                <Icons.Safety size={11} strokeWidth={2.2} className="shrink-0 opacity-90" />
                <span className="truncate">{ROLE_LABELS[user.role] ?? user.role}</span>
              </div>
              <div
                className={`sidebar-here-chip sidebar-chrome mt-2 rounded-xl px-2.5 py-1.5 ${
                  isDarkTheme ? 'sidebar-here-chip-dark' : 'sidebar-here-chip-light'
                }`}
                title={`You are viewing ${activeNavLabel}`}
              >
                <p
                  className={`text-[9px] font-bold uppercase tracking-[0.14em] ${
                    isDarkTheme ? 'text-cyan-300/70' : 'text-cyan-700/70'
                  }`}
                >
                  You are here
                </p>
                <p
                  className={`truncate text-[12px] font-bold leading-tight ${
                    isDarkTheme ? 'text-slate-100' : 'text-slate-800'
                  }`}
                >
                  {activeNavLabel}
                </p>
              </div>
            </div>

            <nav className="sidebar-nav-scroll flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden px-2 py-2.5">
              {visibleNavigation.map((item, index) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                const stagger = Math.min(index + 1, 6);
                const navLabel = resolveNavLabel(item);
                const sectionLabel = 'section' in item ? (item as { section?: string }).section : undefined;
                const previousSection =
                  index > 0 && 'section' in visibleNavigation[index - 1]
                    ? (visibleNavigation[index - 1] as { section?: string }).section
                    : undefined;
                const showSectionHeader = Boolean(sectionLabel && sectionLabel !== previousSection);
                const showAlertBadge = item.id === 'alerts' && unreadCount > 0;
                const showReminderBadge = item.id === 'reminders' && reminderBadgeCount > 0;
                const sectionMeta = sectionLabel
                  ? SIDEBAR_SECTION_META[sectionLabel] ?? {
                      title: sectionLabel,
                      hint: '',
                    }
                  : null;
                const sectionCollapsed = Boolean(
                  sectionLabel && collapsedSections[sectionLabel] && !isActive,
                );
                const hideItem = sectionCollapsed;

                return (
                  <Fragment key={item.id}>
                    {showSectionHeader && sectionLabel && sectionMeta && (
                      <div
                        className={`sidebar-section-block ${index === 0 ? 'mt-0' : 'mt-2.5'} mb-1`}
                      >
                        {index > 0 && (
                          <div
                            className={`mb-2 h-px w-full ${isDarkTheme ? 'bg-cyan-400/15' : 'bg-cyan-200/60'}`}
                            aria-hidden
                          />
                        )}
                        <button
                          type="button"
                          className={`sidebar-section-toggle sidebar-chrome group flex w-full items-start gap-2 rounded-xl px-2 py-1.5 text-left transition-colors ${
                            isDarkTheme
                              ? 'hover:bg-cyan-400/[0.07]'
                              : 'hover:bg-cyan-50/70'
                          }`}
                          onClick={() => toggleSectionCollapsed(sectionLabel)}
                          aria-expanded={!collapsedSections[sectionLabel]}
                          title={
                            collapsedSections[sectionLabel]
                              ? `Expand ${sectionMeta.title}`
                              : `Collapse ${sectionMeta.title}`
                          }
                        >
                          <span className="min-w-0 flex-1">
                            <span
                              className={`sidebar-section-label block text-[10px] font-black uppercase tracking-[0.14em] ${
                                isDarkTheme ? 'text-cyan-300/65' : 'text-cyan-800/55'
                              }`}
                            >
                              {sectionMeta.title}
                            </span>
                            {sectionMeta.hint ? (
                              <span
                                className={`mt-0.5 block text-[10px] font-medium leading-snug ${
                                  isDarkTheme ? 'text-slate-500' : 'text-slate-400'
                                }`}
                              >
                                {sectionMeta.hint}
                              </span>
                            ) : null}
                          </span>
                          <Icons.ChevronDown
                            size={14}
                            className={`mt-0.5 shrink-0 opacity-60 transition-transform duration-300 ${
                              collapsedSections[sectionLabel] ? '-rotate-90' : 'rotate-0'
                            } ${isDarkTheme ? 'text-slate-400' : 'text-slate-500'}`}
                          />
                        </button>
                      </div>
                    )}
                    {showSectionHeader && isDesktopRailCollapsed && index > 0 && (
                      <div
                        className={`mx-auto my-1.5 hidden h-px w-6 md:block ${
                          isDarkTheme ? 'bg-white/15' : 'bg-slate-200'
                        }`}
                        aria-hidden
                      />
                    )}
                    {!hideItem && (
                      <button
                        ref={(el) => {
                          navItemRefs.current[item.id] = el;
                        }}
                        type="button"
                        title={navLabel}
                        aria-label={navLabel}
                        aria-current={isActive ? 'page' : undefined}
                        onClick={() => {
                          setActiveTab(item.id);
                          expandSidebarRail();
                          closeSidebarOverlay();
                        }}
                        style={isActive ? undefined : { animationDelay: `${stagger * 0.035}s` }}
                        className={`sidebar-nav-item w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left ${getTourClassName(item.id)} ${getNavItemClassName(isActive)} ${isActive ? 'is-active' : 'sidebar-nav-enter'
                          } ${sectionCollapsed ? 'sidebar-nav-hidden' : ''}`}
                      >
                        <span className={`sidebar-nav-icon shrink-0 ${isActive ? 'text-inherit' : ''}`}>
                          <Icon size={17} strokeWidth={isActive ? 2.25 : 1.85} />
                        </span>
                        <span
                          className={`sidebar-chrome min-w-0 flex-1 truncate text-[13px] leading-tight transition-transform duration-200 ${
                            isActive ? 'font-bold text-inherit' : 'font-semibold'
                          }`}
                        >
                          {navLabel}
                        </span>
                        {showAlertBadge && (
                          <span className="sidebar-alert-badge inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-md px-1.5 text-[10px] font-black tabular-nums">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </span>
                        )}
                        {showReminderBadge && (
                          <span className="sidebar-alert-badge inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-md bg-amber-500 px-1.5 text-[10px] font-black tabular-nums text-white">
                            {reminderBadgeCount > 99 ? '99+' : reminderBadgeCount}
                          </span>
                        )}
                        {isActive && (
                          <Icons.ChevronRight
                            size={14}
                            className="sidebar-chrome sidebar-active-chevron shrink-0 opacity-70"
                          />
                        )}
                      </button>
                    )}
                  </Fragment>
                );
              })}
            </nav>

            <div
              className={`sidebar-footer mt-auto border-t ${
                isDarkTheme ? 'border-cyan-400/15' : 'border-cyan-200/50'
              }`}
            >
              <div className="sidebar-footer-inner flex flex-col gap-1.5 p-2.5">
                <div
                  className={`profile-menu sidebar-profile-card group flex items-center gap-2.5 rounded-xl px-2.5 py-2 ${
                    isDarkTheme ? 'sidebar-profile-card-dark' : 'sidebar-profile-card-light'
                  }`}
                  title={user.name}
                >
                  <UserAvatar
                    src={user.avatar}
                    name={user.name}
                    className="h-8 w-8 shrink-0 rounded-full"
                    isDarkTheme={isDarkTheme}
                  />
                  <div className="sidebar-chrome min-w-0 flex-1 overflow-hidden">
                    <p className={`truncate text-[13px] font-bold leading-tight ${themeClasses.textPrimary}`}>
                      {user.name}
                    </p>
                    <p
                      className={`truncate text-[10px] font-semibold leading-tight tracking-wide ${themeClasses.textSecondary}`}
                    >
                      {ROLE_LABELS[user.role] ?? user.role}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onLogout}
                  title="Logout"
                  aria-label="Logout"
                  className={`sidebar-logout-row sidebar-nav-item flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13px] font-semibold ${
                    isDarkTheme ? 'sidebar-logout-row-dark' : 'sidebar-logout-row-light'
                  }`}
                >
                  <Icons.Logout size={16} strokeWidth={1.8} className="shrink-0" />
                  <span className="sidebar-chrome">Logout</span>
                </button>
              </div>
            </div>
          </aside>
        </>

        <main
          className="flex-1 flex flex-col min-w-0 overflow-hidden transition-[margin] duration-300"
        >
          <header
            className={`flex h-14 shrink-0 items-center justify-between gap-2 border-b px-3 sm:h-16 sm:px-5 md:px-8 ${themeClasses.glassCard} ${themeClasses.border} z-30`}
          >
            {/* ── LEFT SIDE ── */}
            <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">

              {/* Desktop — expand / collapse icon rail (all roles) */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (sidebarExpanded) collapseSidebarRail();
                  else expandSidebarRail();
                }}
                className={`hidden md:flex items-center justify-center h-9 w-9 shrink-0 rounded-xl border transition-all ${themeClasses.buttonSecondary} ${themeClasses.border}`}
                title={sidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
                aria-label={sidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
                aria-expanded={sidebarExpanded}
              >
                {sidebarExpanded ? (
                  <Icons.ChevronRight size={18} className="rotate-180" />
                ) : (
                  <Icons.Sidebar size={18} />
                )}
              </button>

              {/* Hamburger — mobile drawer */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSidebarOverlay();
                }}
                className={`flex md:hidden items-center justify-center h-9 w-9 shrink-0 rounded-xl border transition-all ${themeClasses.buttonSecondary} ${themeClasses.border} ${sidebarOverlayOpen ? (isDarkTheme ? 'bg-white/10' : 'bg-slate-100') : ''
                  }`}
                title={sidebarOverlayOpen ? 'Close menu' : 'Open menu'}
                aria-label={sidebarOverlayOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={sidebarOverlayOpen}
              >
                {sidebarOverlayOpen ? <Icons.Close size={18} /> : <Icons.Menu size={18} />}
              </button>

              {/* Back — Team Leader nested full project view */}
              {isProjectsTab &&
                user.role === UserRole.TEAM_LEAD &&
                teamLeaderProjectsView === 'full' && (
                  <button
                    type="button"
                    onClick={() => onTeamLeaderBackToOverview?.()}
                    className={`flex h-9 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition-all ${themeClasses.buttonSecondary} ${themeClasses.border}`}
                  >
                    <Icons.ChevronRight size={15} className="rotate-180" />
                    <span className="hidden sm:inline">Back to Overview</span>
                    <span className="sm:hidden">Back</span>
                  </button>
                )}

              {/* Back — return to connected overview / previous section (all roles) */}
              {navReturn &&
                navReturn.tab !== activeTab &&
                !(
                  isProjectsTab &&
                  user.role === UserRole.TEAM_LEAD &&
                  teamLeaderProjectsView === 'full'
                ) && (
                  <button
                    type="button"
                    onClick={() => onNavBack?.()}
                    className={`flex h-9 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition-all ${themeClasses.buttonSecondary} ${themeClasses.border}`}
                    title={`Back to ${navReturnLabel(navReturn)}`}
                  >
                    <Icons.ChevronRight size={15} className="rotate-180" />
                    <span className="hidden sm:inline">Back to {navReturnLabel(navReturn)}</span>
                    <span className="sm:hidden">Back</span>
                  </button>
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
                onClick={() => {
                  const next = !showNotifications;
                  setShowNotifications(next);
                  if (next) onRequestNotifications?.();
                }}
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
                  className={`absolute top-full right-0 mt-2 rounded-2xl z-50 animate-in fade-in slide-in-from-top-2 ${isPMCHead ? 'w-[22rem] sm:w-96' : 'w-80'} ${isDarkTheme
                    ? "glass-card"
                    : "bg-white border border-gray-200 shadow-lg"
                    }`}
                >
                  <div
                    className={`p-4 border-b flex items-center justify-between ${isDarkTheme ? "border-white/10" : "border-gray-200"
                      }`}
                  >
                    <div>
                      <h3
                        className={`text-[10px] font-black uppercase tracking-widest ${isDarkTheme ? "muted" : "text-gray-600"
                          }`}
                      >
                        Alerts{unreadCount > 0 ? ` (${unreadCount})` : ''}
                      </h3>
                      {isPMCHead && (
                        <p className={`mt-0.5 text-[9px] font-bold ${isDarkTheme ? 'text-white/50' : 'text-slate-400'}`}>
                          Team leader & site engineer updates
                        </p>
                      )}
                    </div>
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
                        <AlertNotificationItem
                          key={n.id}
                          notification={n}
                          isDarkTheme={isDarkTheme}
                          compact
                          onClick={() => {
                            void onMarkRead(n.id, true);
                            setShowNotifications(false);
                            onNotificationClick?.(n);
                          }}
                        />
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
                          {isPMCHead
                            ? 'No team updates yet.'
                            : 'No notifications available.'}
                        </p>
                        {isPMCHead && (
                          <p className={`mt-2 text-[9px] font-medium leading-relaxed ${isDarkTheme ? 'text-white/40' : 'text-slate-400'}`}>
                            You will see who updated what, with date and time, when a TL or site engineer changes project data.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  {canViewAlertsPage && (
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
                  )}
                </div>
              )}
            </div>
          </header>

          <div
            key={activeTab}
            className={`app-main-scroll relative flex-1 overflow-y-auto scroll-smooth animate-fade-in ${
              isDarkTheme ? 'app-main-scroll-dark' : 'app-main-scroll-light'
            }`}
            onClick={() => {
              setShowNotifications(false);
              handleMainBodyClick();
            }}
          >
            <div className="relative z-[1] p-4 md:p-8">{children}</div>
          </div>
        </main>
      </div>
      {user.role === UserRole.TEAM_LEAD && (
        <TeamLeaderSidebarTour
          ref={teamLeaderTourRef}
          onRequestOpenSidebar={() => {
            setSidebarOverlayOpen(true);
            persistSidebarExpanded(true);
          }}
          onTourStateChange={onOnboardingTourStateChange}
          isTourRunning={isAnyTourRunning}
          onCollapseSidebarAfterProjects={() => {
            setSidebarOverlayOpen(false);
            persistSidebarExpanded(false);
          }}
        />
      )}
    </div>
  );
};

export default Layout;
