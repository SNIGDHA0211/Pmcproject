import React, { useState, useEffect, lazy, Suspense } from "react";
import Layout from "./components/Layout";

import { ThemeContext, getThemeClasses } from "./utils/theme";
import CreateProjectModal from "./components/CreateProjectModal";
import ProjectModal from "./components/ProjectModal";
import TermsAndConditions from "./components/TermsAndConditions";
import FinancialManagement, {
  SubTab,
  normalizeBillingFinancialSubTab,
  normalizeFinancialSubTab,
} from "./components/FinancialManagement";
import type { StatType } from "./components/Dashboard";
import type { TeamLeaderOverviewSection } from "./components/teamLeader/TeamLeaderOverviewShell";
import NotificationAlertToastStack, { type AlertToastItem } from "./components/NotificationAlertToastStack";
import {
  User,
  Project,
  UserRole,
  ProjectStatus,
  DPR,
  Document,
  Task,
  AppNotification,
} from "./types";
import { MOCK_USERS, INITIAL_PROJECTS, MOCK_DPRS } from "./services/mockData";
import { Icons } from "./components/Icons";
import SiteDeleteDialog, { type SiteDeleteDependency } from "./components/SiteDeleteDialog";
import CompleteProjectDialog, {
  type CompleteProjectConfirmPayload,
} from "./components/CompleteProjectDialog";
import CompleteBillingDialog from "./components/CompleteBillingDialog";
import DashboardToastStack, { type DashboardToastItem } from "./components/DashboardToastStack";
import TutorialVideosPanel from "./components/tutorialVideos/TutorialVideosPanel";
import { parseSiteDeleteDependencies } from "./components/ProjectSiteList";
import { STATUS_COLORS } from "./constants";
import { projectApi, operationsApi, dprApi, notificationApi, getApiErrorMessage, unwrapList } from "./services/api";
import { invalidateApiGetCache } from "./utils/apiGetCache";
import axios from "axios";
import { canCompleteProject, canDeleteProjectSite } from "./utils/userManagementAccess";
import {
  canCompleteProjectBilling,
  extractCompletionFields,
  getProjectCompletionBillingLabel,
  getProjectStatusLabel,
  isProjectCompleted,
} from "./utils/projectCompletion";
import { getLoginFailureMessage } from "./utils/loginCredentials";
import { makeNavReturn, type NavReturnContext } from "./utils/navReturn";
import { useAuth } from "./contexts/AuthContext";
import { websocketService, NotificationData } from "./services/websocket";
import { alertsApi, fetchAllAlerts } from "./services/alertsApi";
import { fetchReminderBadgeCounts, listReminders } from "./services/remindersApi";
import {
  buildReminderDueNotification,
  claimReminderDueToasts,
  isReminderDueNotification,
} from "./utils/reminderNotifications";
import { isReminderAlarmTimeReached, REMINDER_REFRESH_MS } from "./utils/reminderHelpers";
import { canUserHearReminderAudio, clearAllReminderAlarmStops, primeReminderAlarmAudio } from "./utils/reminderAlarm";
import ReminderAlarmEngine from "./components/reminders/ReminderAlarmEngine";
import {
  normalizeAlertRecord,
  normalizeWsAlertPayload,
  resolveAlertNavigation,
  resolveRoleLabel,
  sortNotificationsDesc,
} from "./utils/alertHelpers";
import {
  fetchPmcHeadActivityNotifications,
  isSyntheticActivityNotification,
  mergeActivityNotifications,
} from "./utils/pmcHeadActivityFeed";
import {
  enrichNotificationsActors,
  loadProjectsForActorFallback,
  projectToAssigneeInfo,
} from "./utils/projectActorFallback";
import { loadUserDirectory } from "./utils/userDirectory";
import {
  fetchPendingUpdatesSummary,
  type PendingUpdatesSummary,
} from "./utils/pmcHeadPendingUpdates";
import { userMatchesAssignee, extractAssigneeId, projectAssignedToUser } from "./utils/roleProjectAssignments";
import { clearAppDataCaches } from "./utils/authStorage";
import { scheduleIdleFinancialPrefetch } from "./utils/dashboardBootstrap";
import { buildPmcHeadDropdownProjects } from "./utils/pmcHeadExecutiveProjects";
import { sanitizeProjectDisplayName } from "./utils/hseSiteEngineerProjects";
import { isPmcHeadEquivalent } from "./utils/pmcRoleAccess";
import { ensureProjectCoverAssigned } from "./utils/projectCoverPhotos";
import { projectStore } from "./stores/projectStore";
import {
  useProjects,
  useSelectedProjectId,
} from "./hooks/useProjectStore";
import {
  clearAppRouteOnLogout,
  getDefaultTabForRole,
  isTabAllowedForRole,
  isLandingRoutePath,
  LANDING_ROUTE,
  LOGIN_ROUTE,
  navigateToTab,
  syncAuthenticatedNavigation,
  tabFromRouteForUser,
} from "./utils/roleRouting";
import {
  TAB_PATHS,
  getAppRoutePath,
  migratePathnameToHashRoute,
  subscribeAppRoutePath,
  syncAppRoutePath,
  tabFromRoutePath,
} from "./utils/appRouting";
import LandingPage from "./components/LandingPage";
import LoginPage from "./components/LoginPage";

/** Lazy tab screens — splits the initial JS payload without changing UI/behavior. */
const Dashboard = lazy(() => import("./components/Dashboard"));
const PMCHead360Dashboard = lazy(() => import("./components/PMCHead360Dashboard"));
const SiteExecution = lazy(() => import("./components/SiteExecution"));
const ProjectDetails = lazy(() => import("./components/ProjectDetails"));
const DPRRecords = lazy(() => import("./components/DPRRecords"));
const DPRReviewDashboard = lazy(() => import("./components/DPRReviewDashboard"));
const WPRReviewDashboard = lazy(() => import("./components/WPRReviewDashboard"));
const MPRReviewDashboard = lazy(() => import("./components/mpr/MPRReviewDashboard"));
const Projects = lazy(() => import("./components/Projects"));
const SiteEngineerDashboard = lazy(() => import("./components/SiteEngineerDashboard"));
const ProjectInit = lazy(() => import("./components/ProjectInit"));
const MonthlyScopePage = lazy(() => import("./components/MonthlyScopePage"));
const MyScopesPage = lazy(() => import("./components/MyScopesPage"));
const MachineryList = lazy(() => import("./components/MachineryList"));
const ManpowerManagement = lazy(() => import("./components/ManpowerManagement"));
const SitePhotosManagement = lazy(() => import("./components/sitePhotos/SitePhotosManagement"));
const TestingPhotosPage = lazy(() => import("./components/testingPhotos/TestingPhotosPage"));
const ProjectFeedbackPage = lazy(() => import("./components/projectFeedback/ProjectFeedbackPage"));
const UserManagementPage = lazy(() => import("./components/userManagement/UserManagementPage"));
const AlertsPage = lazy(() => import("./components/AlertsPage"));
const RemindersPage = lazy(() => import("./components/reminders/RemindersPage"));
const MeetingDocumentsPage = lazy(() => import("./components/meetingDocuments/MeetingDocumentsPage"));

const TabSuspenseFallback: React.FC = () => (
  <div className="flex min-h-[40vh] w-full items-center justify-center text-slate-500">
    <Icons.History className="animate-spin" size={28} />
  </div>
);

const App: React.FC = () => {
  const { user: currentUser, loading: authLoading, login, logout: authLogout } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const currentUserRef = React.useRef(currentUser);
  currentUserRef.current = currentUser;
  const projects = useProjects();
  const projectsRef = React.useRef(projects);
  projectsRef.current = projects;
  const setProjects = React.useCallback(
    (updater: Project[] | ((prev: Project[]) => Project[])) => {
      const prev = projectStore.getState().projects;
      const next = typeof updater === "function" ? updater(prev) : updater;
      projectStore.replaceProjects(next);
    },
    [],
  );
  const [dprs, setDprs] = useState<DPR[]>([]);
  const [projectDocuments, setProjectDocuments] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  /** Sprint 1: secondary modules hydrate only when opened */
  const alertsHydratedRef = React.useRef(false);
  const activityHydratedRef = React.useRef(false);
  const dprsHydratedRef = React.useRef(false);
  const documentsHydratedRef = React.useRef(false);
  const selectedProjectId = useSelectedProjectId();
  const setSelectedProjectId = React.useCallback((id: string | null) => {
    projectStore.selectProject(id);
  }, []);
  const [financialDataVersion, setFinancialDataVersion] = useState(0);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [projectFilter, setProjectFilter] = useState<"all" | "attention">(
    "all"
  );

  const [isOnboardingTourActive, setIsOnboardingTourActive] = useState(false);
  const [isAnyTourRunning, setIsAnyTourRunning] = useState(false);
  const [financialSection, setFinancialSection] = useState<SubTab>('progress');
  const [financialSectionLocked, setFinancialSectionLocked] = useState(false);
  /** When user drills from an overview into a connected section — Layout Back returns here. */
  const [navReturn, setNavReturn] = useState<NavReturnContext | null>(null);
  const [financialInitialProjectId, setFinancialInitialProjectId] = useState<string | null>(null);
  const [testingPhotosInitialProjectId, setTestingPhotosInitialProjectId] = useState<string | null>(null);
  const [remindersInitialProjectId, setRemindersInitialProjectId] = useState<string | null>(null);
  const [reminderBadgeCount, setReminderBadgeCount] = useState(0);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alertsRefreshing, setAlertsRefreshing] = useState(false);
  const [pendingUpdates, setPendingUpdates] = useState<PendingUpdatesSummary | null>(null);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [teamLeaderProjectsView, setTeamLeaderProjectsView] = useState<'overview' | 'full'>('overview');
  const [teamLeaderScrollSection, setTeamLeaderScrollSection] = useState<TeamLeaderOverviewSection | null>(null);
  const [alertToasts, setAlertToasts] = useState<AlertToastItem[]>([]);
  const alertToastIdRef = React.useRef(0);
  const [portfolioToasts, setPortfolioToasts] = useState<DashboardToastItem[]>([]);
  const [portfolioDeleteTarget, setPortfolioDeleteTarget] = useState<Project | null>(null);
  const [isPortfolioDeleting, setIsPortfolioDeleting] = useState(false);
  const [portfolioDeleteDeps, setPortfolioDeleteDeps] = useState<SiteDeleteDependency[]>([]);
  const [portfolioDeleteDepError, setPortfolioDeleteDepError] = useState<string | null>(null);
  const [portfolioDeleteError, setPortfolioDeleteError] = useState<string | null>(null);
  const [portfolioCompleteTarget, setPortfolioCompleteTarget] = useState<Project | null>(null);
  const [isPortfolioCompleting, setIsPortfolioCompleting] = useState(false);
  const [portfolioCompleteError, setPortfolioCompleteError] = useState<string | null>(null);
  const [portfolioBillingTarget, setPortfolioBillingTarget] = useState<Project | null>(null);
  const [isPortfolioCompletingBilling, setIsPortfolioCompletingBilling] = useState(false);
  const [portfolioBillingError, setPortfolioBillingError] = useState<string | null>(null);

  // Modal States
  const [showTCModal, setShowTCModal] = useState(false);
  /** Public hash while logged out: `#/welcome` (landing) or `#/login`. */
  const [unauthPath, setUnauthPath] = useState(() => getAppRoutePath());

  // Login Form States
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState(""); // Added username for login
  const [password, setPassword] = useState(""); // Updated default password
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isLoginSubmitting, setIsLoginSubmitting] = useState(false);

  // Theme State
  const [isDarkTheme, setIsDarkTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : true;
  });

  // Save theme preference
  const handleThemeChange = (isDark: boolean) => {
    setIsDarkTheme(isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  };

  useEffect(() => {
    migratePathnameToHashRoute();
  }, []);

  const fetchData = async () => {
    if (!currentUser) return;
    projectStore.setBootstrapUser(currentUser);
    try {
      await projectStore.refreshProjects();
    } catch (error) {
      console.error("Failed to fetch data from backend:", error);
    }
  };

  /** After project mutations: invalidate once, then single refresh (projects + overview). */
  const refreshProjectsAfterMutation = React.useCallback(async () => {
    if (!currentUser) return;
    projectStore.setBootstrapUser(currentUser);
    try {
      await projectStore.refreshAfterMutation();
    } catch (error) {
      console.error("Failed to refresh projects after mutation:", error);
    }
  }, [currentUser?.id]);

  const mapDprRows = React.useCallback(
    (dprsData: any[], projectList: Project[]): DPR[] =>
      dprsData.map((d: any) => {
        let workDescription = '';
        if (d.activities && Array.isArray(d.activities) && d.activities.length > 0) {
          workDescription = d.activities
            .map((act: any) => `${act.activity}${act.deliverables ? ` - ${act.deliverables}` : ''}`)
            .join('; ');
        } else {
          workDescription = d.work_done || '';
        }

        let manpower = 0;
        if (d.activities && Array.isArray(d.activities) && d.activities.length > 0) {
          const avgProgress =
            d.activities.reduce((sum: number, act: any) => sum + (act.target_achieved || 0), 0) /
            d.activities.length;
          manpower = Math.max(1, Math.floor(avgProgress / 10)) || 1;
        } else {
          manpower = d.manpower_count || 0;
        }

        const dprProjectName = sanitizeProjectDisplayName(d.project_name);
        const project = projectList.find(
          (p: Project) =>
            p.title === d.project_name ||
            p.title === dprProjectName ||
            p.apiName === d.project_name,
        );
        const projectId = project?.id || d.project?.toString() || '';

        return {
          id: d.id?.toString() || Date.now().toString(),
          projectId,
          projectName: dprProjectName || 'Unknown Project',
          date: d.report_date
            ? new Date(d.report_date).toLocaleDateString('en-GB')
            : new Date().toLocaleDateString('en-GB'),
          workDescription: workDescription || 'No description available',
          manpower,
          status: (d.status || 'PENDING').toUpperCase(),
          submittedBy: d.issued_by || currentUser?.id || '',
          submittedByName: d.issued_by || currentUser?.name || 'Unknown',
          submittedAt: d.created_at
            ? new Date(d.created_at).toLocaleDateString('en-GB')
            : new Date().toLocaleDateString('en-GB'),
          labor: d.labor_log || undefined,
          machinery: d.machinery_log || undefined,
          activityProgress:
            d.activities?.map((act: any) => ({
              activityId: act.id?.toString() || '',
              todayProgress: act.target_achieved || 0,
            })) || undefined,
          criticalIssues: d.unresolved_issues || d.critical_issues || '',
          billingStatus: d.bill_status || d.billing_status || '',
        };
      }),
    [currentUser?.id, currentUser?.name],
  );

  const fetchDprs = React.useCallback(async () => {
    try {
      const dprsRes = await dprApi.getDPRs();
      const dprsData = unwrapList(dprsRes.data);
      setDprs(mapDprRows(dprsData, projectsRef.current));
      dprsHydratedRef.current = true;
    } catch (error) {
      console.error('Failed to fetch DPRs:', error);
      setDprs([]);
    }
  }, [mapDprRows]);

  const fetchProjectDocumentsLazy = React.useCallback(async () => {
    try {
      const docsRes = await projectApi.getProjectDocuments();
      setProjectDocuments(docsRes.data);
      documentsHydratedRef.current = true;
    } catch (docError) {
      console.error('Failed to fetch project documents:', docError);
    }
  }, []);

  useEffect(() => {
    if (!currentUser) {
      projectStore.clearStore();
      return;
    }

    projectStore.setBootstrapUser(currentUser);
    // Sprint 2 + Project Store: Overview + Projects start together — neither awaits the other.
    const { overview, projects: projectsPromise } = projectStore.bootstrapParallel();
    void overview;
    void projectsPromise;
  }, [currentUser?.id]);

  // Sprint 2: after projects land, idle-prefetch financial/chart GETs (not alerts/DPR).
  const idlePrefetchDoneRef = React.useRef<string | null>(null);
  useEffect(() => {
    if (!currentUser || projects.length === 0) return;
    // Once per login session after first project list arrives
    const sessionKey = String(currentUser.id);
    if (idlePrefetchDoneRef.current === sessionKey) return;

    const shouldPrefetch =
      isPmcHeadEquivalent(currentUser) ||
      currentUser.role === UserRole.TEAM_LEAD ||
      currentUser.role === UserRole.BILLING_SITE_ENGINEER;
    if (!shouldPrefetch) return;

    idlePrefetchDoneRef.current = sessionKey;
    const names = projects
      .slice(0, 5)
      .map((p) => (p.apiName || p.title || '').trim())
      .filter(Boolean);
    scheduleIdleFinancialPrefetch(names);
  }, [currentUser?.id, currentUser?.role, projects.length]);

  useEffect(() => {
    if (authLoading) return;

    if (!currentUser) {
      setActiveTab("dashboard");
      setSelectedProjectId(null);
      setFinancialSectionLocked(false);
      setNavReturn(null);
      setProjectFilter("all");
      const path = getAppRoutePath();
      if (!isLandingRoutePath(path) && path !== LOGIN_ROUTE) {
        syncAppRoutePath(LOGIN_ROUTE, "replace");
        setUnauthPath(LOGIN_ROUTE);
      } else {
        setUnauthPath(isLandingRoutePath(path) ? LANDING_ROUTE : path);
      }
      return;
    }

    const tab = syncAuthenticatedNavigation(currentUser, { honorCurrentUrl: true });
    setActiveTab(tab);
  }, [currentUser?.id, currentUser?.role, authLoading]);

  useEffect(() => {
    if (currentUser || authLoading) return;
    return subscribeAppRoutePath(() => {
      const path = getAppRoutePath();
      if (!isLandingRoutePath(path) && path !== LOGIN_ROUTE) {
        syncAppRoutePath(LOGIN_ROUTE, "replace");
        setUnauthPath(LOGIN_ROUTE);
      } else {
        setUnauthPath(isLandingRoutePath(path) ? LANDING_ROUTE : path);
      }
    });
  }, [currentUser, authLoading]);

  useEffect(() => {
    return subscribeAppRoutePath(() => {
      const user = currentUserRef.current;
      if (!user || authLoading) return;
      const tab = tabFromRouteForUser(user);
      setActiveTab((prev) => (prev === tab ? prev : tab));
      const targetPath = TAB_PATHS[tab];
      if (targetPath && getAppRoutePath() !== targetPath) {
        navigateToTab(tab, "replace");
      }
    });
  }, [authLoading]);

  useEffect(() => {
    if (!currentUser || authLoading) return;
    const targetPath = TAB_PATHS[activeTab];
    if (!targetPath) return;
    if (getAppRoutePath() !== targetPath) {
      syncAppRoutePath(targetPath, "replace");
    }
  }, [activeTab, currentUser?.id, authLoading]);

  useEffect(() => {
    if (!currentUser || authLoading) return;
    if (!isTabAllowedForRole(activeTab, currentUser.role, currentUser.username, currentUser)) {
      const tab = getDefaultTabForRole(currentUser.role);
      setActiveTab(tab);
      navigateToTab(tab, "replace");
    }
  }, [activeTab, currentUser?.role, currentUser?.username, currentUser?.isSuperuser, authLoading]);

  // Team Lead: auto-select their assigned project (no project switcher in header)
  useEffect(() => {
    if (currentUser?.role !== UserRole.TEAM_LEAD || projects.length === 0) return;
    const assigned = projects.find(
      (project) =>
        project.teamLeadId &&
        (project.teamLeadId === currentUser.id ||
          (currentUser.username && project.teamLeadId === currentUser.username)),
    );
    if (assigned && selectedProjectId !== assigned.id) {
      setSelectedProjectId(assigned.id);
    }
  }, [currentUser?.id, currentUser?.username, currentUser?.role, projects, selectedProjectId]);

  const addNotification = (
    userId: string,
    title: string,
    message: string,
    type: AppNotification["type"],
    projectId?: string
  ) => {
    const newNotif: AppNotification = {
      id: `n-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      userId,
      projectId,
      title,
      message,
      type,
      timestamp: "Just now",
      isRead: false,
      senderName: currentUser?.name,
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  const normalizeWebsocketPayload = (raw: unknown): any => {
    if (typeof raw === "string") {
      try {
        return JSON.parse(raw);
      } catch {
        return { message: raw };
      }
    }
    if (raw && typeof raw === "object") {
      return raw;
    }
    return {};
  };

  const parseIncomingNotification = (eventData: unknown) => {
    const parsed = normalizeWebsocketPayload(eventData);
    const nestedMessage = parsed?.message;
    const payload =
      typeof nestedMessage === "string"
        ? normalizeWebsocketPayload(nestedMessage)
        : parsed;
    return payload && typeof payload === "object" ? payload : {};
  };

  const mapNotificationType = (incomingType?: string): AppNotification["type"] => {
    const normalized = (incomingType || "").toUpperCase();
    if (normalized.includes("REJECT")) return "ALERT";
    if (normalized.includes("APPROVE") || normalized.includes("CREATED") || normalized.includes("SUBMIT")) return "SUCCESS";
    if (normalized.includes("UPDATE")) return "UPDATE";
    return "INFO";
  };

  const showBrowserNotification = (title: string, message: string) => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "granted") {
      new Notification(title, {
        body: message,
        icon: "/favicon.ico",
      });
    }
  };

  useEffect(() => {
    const handleClientNotification = (event: Event) => {
      const customEvent = event as CustomEvent;
      const payload = customEvent?.detail || {};
      const title = payload.title || "Notification";
      const message = payload.message || "You have a new update.";
      const projectId = payload?.data?.project_id?.toString?.() || payload?.project_id?.toString?.();
      const type = mapNotificationType(payload.type);
      const timestamp = payload.timestamp
        ? new Date(payload.timestamp).toLocaleString("en-IN")
        : new Date().toLocaleString("en-IN");

      const localNotification: AppNotification = {
        id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        userId: currentUser?.id || "system",
        projectId,
        title,
        message,
        type,
        timestamp,
        isRead: false,
        senderName: "System",
      };

      setNotifications((prev) => [localNotification, ...prev]);
      showBrowserNotification(title, message);
    };

    window.addEventListener("pmc:notification", handleClientNotification);
    return () => {
      window.removeEventListener("pmc:notification", handleClientNotification);
    };
  }, [currentUser?.id]);

  const handleUpdateStatus = (
    projectId: string,
    newStatus: ProjectStatus,
    comment?: string
  ) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === projectId) {
          if (isPmcHeadEquivalent(currentUser) && p.teamLeadId) {
            addNotification(
              p.teamLeadId,
              "Status Change Alert",
              `Project "${p.title}" status updated to ${newStatus} by Head.`,
              "UPDATE",
              projectId
            );
          }

          return {
            ...p,
            status: newStatus,
            updatedAt: new Date().toISOString(),
            rejectionComments: comment,
            auditLogs: [
              {
                id: `a-${Date.now()}`,
                action: `Status change to ${newStatus}`,
                performedBy: currentUser?.id || "sys",
                timestamp: new Date().toISOString(),
                details: comment || `Transitioned to ${newStatus}`,
                statusFrom: p.status,
                statusTo: newStatus,
              },
              ...p.auditLogs,
            ],
          };
        }
        return p;
      })
    );
  };

  const handleSubmitDPR = async (dprData: any) => {
    // Form already submits to API directly, just refresh the DPR list
    try {
      invalidateApiGetCache(['/dpr']);
      await fetchDprs();
    } catch (error: any) {
      console.error("Failed to refresh DPR list:", error);
      // Don't show error alert here as form already handles submission errors
    }
  };

  const resolveProjectIdByName = (projectName?: string): string | undefined => {
    if (!projectName) return undefined;
    const normalized = projectName.trim().toLowerCase();
    const match = projectsRef.current.find(
      (p) => p.title === projectName || p.title?.trim().toLowerCase() === normalized,
    );
    return match?.id;
  };

  const showAlertToast = (title: string, message: string) => {
    const id = ++alertToastIdRef.current;
    setAlertToasts((prev) => [...prev, { id, title, message }]);
    window.setTimeout(() => {
      setAlertToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  const fetchAlerts = React.useCallback(async (options?: {
    silent?: boolean;
    /** PMC Head 8-module activity + pending summary — only on Alerts page */
    includeActivity?: boolean;
  }) => {
    if (!currentUser) return;
    if (!options?.silent) setAlertsLoading(true);
    else setAlertsRefreshing(true);
    const includeActivity = Boolean(options?.includeActivity);
    try {
      const rows = await fetchAllAlerts();
      const mapped = rows.map((row) =>
        normalizeAlertRecord(
          row,
          currentUser.id,
          resolveProjectIdByName(row.project_name),
        ),
      );

      let merged = sortNotificationsDesc(mapped);
      if (isPmcHeadEquivalent(currentUser) && includeActivity) {
        try {
          // One projects + directory load shared by activity feed, enrich, and pending summary.
          const liveProjects = projectsRef.current;
          const [directory, assigneeProjects] = await Promise.all([
            loadUserDirectory(),
            liveProjects.length > 0
              ? Promise.resolve(liveProjects.map(projectToAssigneeInfo))
              : loadProjectsForActorFallback(),
          ]);
          const activityAlerts = await fetchPmcHeadActivityNotifications(
            currentUser.id,
            { directory, projects: assigneeProjects },
          );
          merged = mergeActivityNotifications(mapped, activityAlerts);
          merged = enrichNotificationsActors(merged, directory, assigneeProjects);
          activityHydratedRef.current = true;
          setPendingLoading(true);
          try {
            const pending = await fetchPendingUpdatesSummary(merged, {
              directory,
              projects: assigneeProjects,
            });
            setPendingUpdates(pending);
          } catch (pendingError) {
            console.warn("Failed to load pending updates summary:", pendingError);
            setPendingUpdates(null);
          } finally {
            setPendingLoading(false);
          }
        } catch (activityError) {
          console.warn("Failed to load PMC Head activity alerts:", activityError);
          setPendingUpdates(null);
        }
      } else if (!includeActivity && !activityHydratedRef.current) {
        // Keep prior pending panel empty until Alerts page loads activity.
        setPendingUpdates(null);
      }

      setNotifications((prev) => {
        const readSyntheticIds = new Set(
          prev
            .filter((n) => isSyntheticActivityNotification(n.id) && n.isRead)
            .map((n) => n.id),
        );
        const reminderDuePrev = prev.filter((n) => isReminderDueNotification(n.id));
        let next = merged;
        if (!includeActivity && activityHydratedRef.current) {
          const syntheticPrev = prev.filter((n) => isSyntheticActivityNotification(n.id));
          if (syntheticPrev.length > 0) {
            next = mergeActivityNotifications(merged, syntheticPrev);
          }
        }
        if (reminderDuePrev.length > 0) {
          const serverIds = new Set(next.map((n) => n.id));
          const keepReminders = reminderDuePrev.filter((n) => !serverIds.has(n.id));
          if (keepReminders.length > 0) {
            next = [...keepReminders, ...next];
          }
        }
        const sorted = sortNotificationsDesc(next);
        const finalList =
          readSyntheticIds.size === 0
            ? sorted
            : sorted.map((n) =>
                readSyntheticIds.has(n.id) ? { ...n, isRead: true } : n,
              );

        return finalList;
      });
      alertsHydratedRef.current = true;
    } catch (error) {
      console.error("Failed to load alerts:", error);
    } finally {
      setAlertsLoading(false);
      setAlertsRefreshing(false);
    }
  }, [currentUser?.id, currentUser?.role]);

  const upsertNotification = (incoming: AppNotification) => {
    setNotifications((prev) => {
      const withoutDup = prev.filter((n) => n.id !== incoming.id);
      return sortNotificationsDesc([incoming, ...withoutDup]);
    });
  };

  const handleAlertNavigation = (notification: AppNotification) => {
    const projectId =
      notification.projectId || resolveProjectIdByName(notification.projectName);
    if (projectId) {
      setSelectedProjectId(projectId);
    }

    const isReminderDue =
      (notification.notificationType || '').toUpperCase() === 'REMINDER_DUE' ||
      (notification.actionType || '').toUpperCase() === 'REMINDER_DUE' ||
      (notification.moduleName || '').trim().toLowerCase() === 'reminders';

    if (isReminderDue && isTabAllowedForRole('reminders', currentUser!.role, currentUser!.username, currentUser)) {
      setRemindersInitialProjectId(projectId || null);
      setNavReturn(makeNavReturn('alerts'));
      setActiveTab('reminders');
      const remindersPath = TAB_PATHS.reminders;
      if (remindersPath && getAppRoutePath() !== remindersPath) {
        syncAppRoutePath(remindersPath, 'push');
      }
      return;
    }

    if (isPmcHeadEquivalent(currentUser)) {
      const moduleKey = (notification.moduleName || "").trim().toLowerCase();
      if (moduleKey === "site photos") {
        setNavReturn(makeNavReturn('alerts'));
        setActiveTab("site_photos");
        const sitePhotosPath = TAB_PATHS.site_photos;
        if (sitePhotosPath && getAppRoutePath() !== sitePhotosPath) {
          syncAppRoutePath(sitePhotosPath, "push");
        }
        return;
      }

      const nav = resolveAlertNavigation(notification);
      if (nav?.tab && isTabAllowedForRole(nav.tab, currentUser!.role, currentUser!.username, currentUser)) {
        setNavReturn(makeNavReturn('alerts'));
        setActiveTab(nav.tab);
        const navPath = TAB_PATHS[nav.tab];
        if (navPath && getAppRoutePath() !== navPath) {
          syncAppRoutePath(navPath, "push");
        }
        return;
      }

      setNavReturn(makeNavReturn('alerts'));
      setActiveTab("team_projects");
      const targetPath = TAB_PATHS.team_projects;
      if (targetPath && getAppRoutePath() !== targetPath) {
        syncAppRoutePath(targetPath, "push");
      }
      return;
    }

    const nav = resolveAlertNavigation(notification);
    if (!nav) return;

    if (nav.section) {
      setFinancialSection(normalizeFinancialSubTab(nav.section));
      setFinancialSectionLocked(true);
      setNavReturn(
        nav.returnTab
          ? makeNavReturn(nav.returnTab)
          : makeNavReturn(activeTab === 'alerts' ? 'alerts' : 'team_projects'),
      );
      if (projectId) setFinancialInitialProjectId(projectId);
    } else {
      setFinancialSectionLocked(false);
      setNavReturn(makeNavReturn('alerts'));
    }

    setActiveTab(nav.tab);
    const targetPath = TAB_PATHS[nav.tab];
    if (targetPath && getAppRoutePath() !== targetPath) {
      syncAppRoutePath(targetPath, "push");
    }
  };

  const handleMarkRead = async (id: string, isRead = true) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead } : n)),
    );
    if (isSyntheticActivityNotification(id)) return;

    try {
      await alertsApi.update(id, { is_read: isRead });
    } catch (error) {
      console.error("Failed to update alert read status:", error);
      void fetchAlerts({
        silent: true,
        includeActivity: activeTab === 'alerts',
      });
    }
  };

  useEffect(() => {
    if (activeTab !== 'team_projects') {
      setTeamLeaderProjectsView('overview');
      setTeamLeaderScrollSection(null);
    }
  }, [activeTab]);

  // Reset secondary hydration when session ends
  useEffect(() => {
    if (currentUser) return;
    setNotifications([]);
    setPendingUpdates(null);
    setDprs([]);
    setProjectDocuments([]);
    alertsHydratedRef.current = false;
    activityHydratedRef.current = false;
    dprsHydratedRef.current = false;
    documentsHydratedRef.current = false;
    idlePrefetchDoneRef.current = null;
  }, [currentUser]);

  // Priority 4: Alerts page — history + activity/pending (first visit + poll while open)
  useEffect(() => {
    if (!currentUser || activeTab !== 'alerts') return;
    void fetchAlerts({
      silent: alertsHydratedRef.current,
      includeActivity: true,
    });
  }, [activeTab, currentUser?.id, fetchAlerts]);

  useEffect(() => {
    if (!currentUser || activeTab !== 'alerts') return;
    const intervalId = window.setInterval(() => {
      void fetchAlerts({ silent: true, includeActivity: true });
    }, 60_000);
    return () => window.clearInterval(intervalId);
  }, [activeTab, currentUser?.id, fetchAlerts]);

  useEffect(() => {
    if (!currentUser) return;
    const refreshIfOnAlerts = () => {
      if (document.visibilityState !== 'visible') return;
      if (activeTab !== 'alerts') return;
      void fetchAlerts({ silent: true, includeActivity: true });
    };
    window.addEventListener('focus', refreshIfOnAlerts);
    document.addEventListener('visibilitychange', refreshIfOnAlerts);
    return () => {
      window.removeEventListener('focus', refreshIfOnAlerts);
      document.removeEventListener('visibilitychange', refreshIfOnAlerts);
    };
  }, [activeTab, currentUser?.id, fetchAlerts]);

  // Priority 4: DPR list — only when DPR Review or coordinator dashboard needs it
  useEffect(() => {
    if (!currentUser) return;
    const needsAppDprs =
      activeTab === 'dpr_records' ||
      (activeTab === 'dashboard' && !isPmcHeadEquivalent(currentUser));
    if (!needsAppDprs) return;
    void fetchDprs();
  }, [activeTab, currentUser?.id, currentUser?.role, fetchDprs]);

  // Documents vault — only when non–PMC-Head dashboard needs document KPIs
  useEffect(() => {
    if (!currentUser) return;
    const needsDocs = activeTab === 'dashboard' && !isPmcHeadEquivalent(currentUser);
    if (!needsDocs || documentsHydratedRef.current) return;
    void fetchProjectDocumentsLazy();
  }, [activeTab, currentUser?.id, currentUser?.role, fetchProjectDocumentsLazy]);

  const handleRequestNotifications = React.useCallback(() => {
    if (!currentUser) return;
    // Bell / notification panel: alert history only (no 8-module activity blast)
    void fetchAlerts({
      silent: alertsHydratedRef.current,
      includeActivity: false,
    });
  }, [currentUser?.id, fetchAlerts]);

  const navigateToReminders = React.useCallback(() => {
    if (!currentUser) return;
    if (!isTabAllowedForRole('reminders', currentUser.role, currentUser.username, currentUser)) {
      return;
    }
    setRemindersInitialProjectId(null);
    setActiveTab('reminders');
    const remindersPath = TAB_PATHS.reminders;
    if (remindersPath && getAppRoutePath() !== remindersPath) {
      syncAppRoutePath(remindersPath, 'push');
    }
  }, [currentUser]);

  const refreshReminderBadge = React.useCallback(async () => {
    if (!currentUser) {
      setReminderBadgeCount(0);
      return;
    }
    if (!isTabAllowedForRole('reminders', currentUser.role, currentUser.username, currentUser)) {
      setReminderBadgeCount(0);
      return;
    }
    try {
      const counts = await fetchReminderBadgeCounts();
      setReminderBadgeCount(counts.total);
    } catch {
      // Keep last known count on transient API errors
    }
  }, [currentUser]);

  /** Prime alarm audio after any user gesture (browser autoplay policy). */
  useEffect(() => {
    if (!currentUser) {
      clearAllReminderAlarmStops();
      return;
    }
    const unlock = () => void primeReminderAlarmAudio();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser) return;
    void refreshReminderBadge();
    const timer = window.setInterval(() => {
      void refreshReminderBadge();
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [currentUser?.id, currentUser?.role, refreshReminderBadge]);

  /** Poll due reminders for the logged-in assignee and push Alerts/bell + toast + audio. */
  useEffect(() => {
    if (!currentUser) return;
    if (!isTabAllowedForRole('reminders', currentUser.role, currentUser.username, currentUser)) {
      return;
    }

    let cancelled = false;

    const syncDueReminderAlerts = async () => {
      const user = currentUserRef.current;
      if (!user) return;
      try {
        const mine = await listReminders({
          scope: 'mine',
          page_size: 100,
          ordering: 'due_at',
          skipCache: true,
        });
        if (cancelled) return;

        const dueRows = mine.results.filter((row) => {
          const status = (row.status || '').toLowerCase();
          return status !== 'completed' && status !== 'dismissed';
        });
        const alarmDueRows = dueRows.filter((row) => isReminderAlarmTimeReached(row));
        const dueNotifs = alarmDueRows.map((row) => buildReminderDueNotification(row, user.id));
        const dueIds = new Set(dueNotifs.map((n) => n.id));

        setNotifications((prev) => {
          const kept = prev.filter((n) => {
            if (!isReminderDueNotification(n.id)) return true;
            return dueIds.has(n.id);
          });
          const existingIds = new Set(kept.map((n) => n.id));
          const additions = dueNotifs.filter((n) => !existingIds.has(n.id));
          if (additions.length === 0 && kept.length === prev.length) {
            return sortNotificationsDesc(
              kept.map((n) => {
                if (!isReminderDueNotification(n.id)) return n;
                const newer = dueNotifs.find((d) => d.id === n.id);
                return newer ? { ...newer, isRead: n.isRead } : n;
              }),
            );
          }
          const merged = [
            ...kept.map((n) => {
              if (!isReminderDueNotification(n.id)) return n;
              const newer = dueNotifs.find((d) => d.id === n.id);
              return newer ? { ...newer, isRead: n.isRead } : n;
            }),
            ...additions,
          ];
          return sortNotificationsDesc(merged);
        });

        const freshToastIds = claimReminderDueToasts(alarmDueRows.map((r) => r.id));
        for (const notifId of freshToastIds) {
          const notif = dueNotifs.find((n) => n.id === notifId);
          if (!notif) continue;
          showAlertToast(notif.title, notif.message);
          showBrowserNotification(notif.title, notif.message);
        }

        void refreshReminderBadge();
      } catch (error) {
        console.warn('Failed to sync due reminder alerts:', error);
      }
    };

    void syncDueReminderAlerts();
    const timer = window.setInterval(() => {
      void syncDueReminderAlerts();
    }, REMINDER_REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [currentUser?.id, currentUser?.role, currentUser?.username]);

  const handleCreateProject = async (projectData: Partial<Project>, initialDocs: Partial<Document>[], documentationFile?: File) => {
    try {
      // Prepare data for backend using FormData for file support
      const formData = new FormData();
      formData.append('name', projectData.title || "");
      formData.append('client_name', projectData.client || "");
      formData.append('description', projectData.description || "");
      formData.append('location', projectData.location || "");
      if (projectData.commencementDate) formData.append('commencement_date', projectData.commencementDate);
      formData.append('duration', projectData.duration || "");
      formData.append('budget', (projectData.budget || 0).toString());
      formData.append('salient_features', projectData.salientFeatures || "");
      formData.append('site_staff_details', projectData.siteStaffDetails || "");
      formData.append('has_documentation', String(projectData.hasDocumentation));
      formData.append('has_iso_checklist', String(projectData.hasISOChecklist));
      formData.append('has_test_frequency_chart', String(projectData.hasTestFrequencyChart));
      formData.append('status', 'planning');
      if (projectData.commencementDate) formData.append('start_date', projectData.commencementDate);

      if (documentationFile) {
        formData.append('documentation_file', documentationFile);
      }

      const response = await projectApi.createProject(formData);
      const savedProject = response.data;

      // Transform backend data back to frontend format
      const createdAt = savedProject.created_at || new Date().toISOString();
      const newProject: Project = {
        ...projectData,
        id: savedProject.id.toString(),
        title: sanitizeProjectDisplayName(savedProject.name),
        apiName: savedProject.name,
        client: savedProject.client_name,
        location: savedProject.location,
        budget: Number(savedProject.budget),
        description: savedProject.description,
        status: ProjectStatus.CREATED,
        createdAt,
        updatedAt: savedProject.updated_at || createdAt,
        workflowStatus: "SUBMITTED",
        lastUpdated: createdAt,
        tasks: [],
        documents: [],
        sites: [],
        auditLogs: [{
          id: `a-${Date.now()}`,
          action: "Project Initiated",
          performedBy: (savedProject.created_by?.toString?.() || savedProject.created_by || currentUser?.id || "sys"),
          timestamp: createdAt,
          details: savedProject.created_by_name ? `Created by ${savedProject.created_by_name}` : "Created and stored in backend"
        }],
      } as Project;

      // Auto-assign a unique professional cover (no upload prompt)
      ensureProjectCoverAssigned(newProject.id, newProject.title, newProject.location);

      // Add to local state for immediate UI update (kept through portfolio rebuild)
      setProjects((prev) => {
        const withoutDup = prev.filter((p) => String(p.id) !== String(newProject.id));
        return buildPmcHeadDropdownProjects([newProject, ...withoutDup]);
      });
      setIsCreateModalOpen(false);

      // Refresh once via Project Store (invalidate + single refresh pass)
      clearAppDataCaches();
      projectStore.setBootstrapUser(currentUser);
      await projectStore.refreshAfterMutation();

      addNotification(
        currentUser?.id || "admin",
        "Project Initiated",
        `New project "${newProject.title}" has been successfully created and stored.`,
        "SUCCESS",
        newProject.id
      );
    } catch (error: any) {
      console.error("Failed to create project in backend:", error);

      // Handle authentication errors (401) - interceptor will handle token refresh
      if (error.response?.status === 401) {
        // The interceptor will handle token refresh or logout
        // Just show a user-friendly message
        alert("Your session has expired. Please try again after logging in.");
        return;
      }

      // Handle other errors
      const errorMsg = error.response?.data
        ? (typeof error.response.data === 'string'
          ? error.response.data
          : JSON.stringify(error.response.data))
        : error.message || "Unknown error occurred";
      alert(`Failed to save project: ${errorMsg}`);
    }
  };

  const handleApproveDPR = async (id: string) => {
    try {
      // If we are on the new DPR Review dashboard, use the dprApi instead
      if (activeTab === "dpr_records") {
        if (currentUser?.role === UserRole.TEAM_LEAD) {
          await dprApi.approveTeamLead(id);
        } else if (isPmcHeadEquivalent(currentUser)) {
          // PMC Manager has Head access — finalize like PMC Head
          await dprApi.approvePMCHead(id);
        } else {
          // Default fallback for Site Engineer or other roles if they can somehow trigger this
          await dprApi.approveTeamLead(id);
        }
      } else {
        // Old system
        await operationsApi.approveReport(id);
      }

      // Update local state on success
      setDprs((prev) =>
        prev.map((d) => {
          if (d.id === id) {
            addNotification(
              d.submittedBy,
              "DPR Approved",
              `Your daily report for "${d.projectName}" on ${d.date} has been approved by ${currentUser?.name}.`,
              "SUCCESS",
              d.projectId
            );

            let nextStatus: DPR['status'] = "APPROVED";
            if (activeTab === "dpr_records") {
              if (currentUser?.role === UserRole.TEAM_LEAD) nextStatus = "PENDING_COORDINATOR";
              else if (isPmcHeadEquivalent(currentUser)) nextStatus = "APPROVED";
            }

            return {
              ...d,
              status: nextStatus,
              reviewedBy: currentUser?.id,
              reviewedByName: currentUser?.name,
              reviewedAt: new Date().toLocaleDateString("en-GB"),
            };
          }
          return d;
        })
      );

      // Refresh projects if in new system to update the list
      if (activeTab === "dpr_records") {
        void fetchData();
      }
    } catch (error: any) {
      console.error("Failed to approve DPR:", error);
      alert(error.response?.data?.error || "Failed to approve DPR. Please try again.");
    }
  };

  const handleRejectDPR = async (id: string, reason: string) => {
    try {
      // If we are on the new DPR Review dashboard, use the dprApi instead
      if (activeTab === "dpr_records") {
        await dprApi.rejectDPR(id, reason);
      } else {
        // Old system
        await operationsApi.rejectReport(id, reason);
      }

      // Update local state on success
      setDprs((prev) =>
        prev.map((d) => {
          if (d.id === id) {
            addNotification(
              d.submittedBy,
              "DPR Rejected",
              `Your daily report for "${d.projectName
              }" was rejected: ${reason.substring(0, 30)}...`,
              "ALERT",
              d.projectId
            );
            return {
              ...d,
              status: "REJECTED",
              rejectionReason: reason,
              reviewedBy: currentUser?.id,
              reviewedByName: currentUser?.name,
              reviewedAt: new Date().toLocaleDateString("en-GB"),
            };
          }
          return d;
        })
      );

      // Refresh projects if in new system to update the list
      if (activeTab === "dpr_records") {
        void fetchData();
      }
    } catch (error: any) {
      console.error("Failed to reject DPR:", error);
      alert(error.response?.data?.error || "Failed to reject DPR. Please try again.");
    }
  };

  const handleUpdateProject = (
    projectId: string,
    updatedData: Partial<Project>,
    newDocs: Partial<Document>[]
  ) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === projectId) {
          const formattedNewDocs: Document[] = newDocs.map((d) => ({
            id: d.id || `doc-${Date.now()}`,
            name: d.name || "Unnamed Document",
            type: d.type || "PDF",
            url: "#",
            uploadedBy: currentUser?.id || "sys",
            uploadedAt: new Date().toISOString(),
            status: "PENDING",
            version: 1,
          }));
          return {
            ...p,
            ...updatedData,
            documents: [...p.documents, ...formattedNewDocs],
            updatedAt: new Date().toISOString(),
          };
        }
        return p;
      })
    );
  };

  const handleAssignTeam = (
    projectId: string,
    leadId: string,
    coordIds: string[]
  ) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === projectId) {
          addNotification(
            leadId,
            "Project Assigned",
            `You have been assigned as Team Lead for "${p.title}".`,
            "INFO",
            projectId
          );
          coordIds.forEach((id) =>
            addNotification(
              id,
              "Project Assigned",
              `You have been assigned as Coordinator for "${p.title}".`,
              "INFO",
              projectId
            )
          );
          return {
            ...p,
            teamLeadId: leadId,
            coordinatorIds: coordIds,
            status: ProjectStatus.ASSIGNED,
            updatedAt: new Date().toISOString(),
          };
        }
        return p;
      })
    );
  };

  const handleAddTask = (projectId: string, taskData: Partial<Task>) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === projectId) {
          const newTask: Task = {
            id: `t-${Date.now()}`,
            title: taskData.title || "New Milestone",
            description: taskData.description || "",
            assignedTo: taskData.assignedTo || "",
            status: "PENDING",
            dueDate: taskData.dueDate || new Date().toISOString(),
          };
          if (newTask.assignedTo)
            addNotification(
              newTask.assignedTo,
              "New Milestone Task",
              `You have a new task: ${newTask.title}`,
              "INFO",
              projectId
            );
          return {
            ...p,
            tasks: [...p.tasks, newTask],
            updatedAt: new Date().toISOString(),
          };
        }
        return p;
      })
    );
  };

  const handleStatClick = (type: StatType) => {
    setNavReturn(makeNavReturn('dashboard', 'Overview'));
    switch (type) {
      case "portfolio":
        setActiveTab("projects");
        break;
      case "dprs":
        setActiveTab("dpr_records");
        break;
      case "execution":
        setActiveTab("execution");
        break;
      case "attention":
        setActiveTab("projects");
        setProjectFilter("attention");
        break;
      default:
        setActiveTab("projects");
    }
  };

  const logout = async () => {
    websocketService.disconnect();
    await authLogout();
    setSelectedProjectId(null);
    setFinancialSectionLocked(false);
    setNavReturn(null);
    setProjectFilter("all");
    clearAppRouteOnLogout();
    setActiveTab("dashboard");
  };

  useEffect(() => {
    if (!currentUser) {
      websocketService.disconnect();
      return;
    }

    if (typeof window === "undefined" || !("WebSocket" in window)) return;

    // Request notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {
        // Ignore browser permission errors and keep in-app notifications working.
      });
    }

    // Handle incoming WebSocket messages
    const handleWebSocketMessage = (data: NotificationData) => {
      const user = currentUserRef.current;
      if (!user) return;

      const payload = parseIncomingNotification(data);
      const merged = { ...(data as unknown as Record<string, unknown>), ...payload };
      const projectId =
        resolveProjectIdByName(String(merged.project_name || "")) ||
        (merged.project_id != null ? String(merged.project_id) : undefined);

      const alert = normalizeWsAlertPayload(merged, user.id, projectId);
      if (alert) {
        upsertNotification(alert);
        showAlertToast(alert.title, alert.message);
        showBrowserNotification(alert.title, alert.message);
        return;
      }

      const title = data.title || "Notification";
      const message = data.message || "You have a new update.";
      const type = mapNotificationType(data.type || data.notification_type);
      const timestamp = data.timestamp || data.created_at
        ? new Date(String(data.timestamp || data.created_at)).toLocaleString("en-IN")
        : new Date().toLocaleString("en-IN");

      const wsNotification: AppNotification = {
        id: data.id != null ? String(data.id) : `ws-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        userId: user.id,
        projectId,
        title,
        message,
        type,
        timestamp,
        isRead: false,
        senderName: data.sender || "System",
        senderUsername: data.sender_username,
        senderRole: resolveRoleLabel(String(data.sender_role || "")),
        moduleName: data.module_name,
        projectName: data.project_name,
        actionType: data.action_type,
        notificationType: data.notification_type || data.type,
        createdAt: data.created_at || data.timestamp,
      };

      upsertNotification(wsNotification);
      showAlertToast(title, message);
      showBrowserNotification(title, message);
    };

    // Connect to WebSocket and listen for messages
    websocketService.onMessage(handleWebSocketMessage);
    websocketService.connect();

    return () => {
      websocketService.removeMessageListener(handleWebSocketMessage);
    };
  }, [currentUser?.id]);

  const goToLandingPage = () => {
    syncAppRoutePath(LANDING_ROUTE, "push");
    setUnauthPath(LANDING_ROUTE);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setIsLoginSubmitting(true);
    try {
      const loggedInUser = await login(username, password);
      setPassword("");
      const homeTab = syncAuthenticatedNavigation(loggedInUser, {
        honorCurrentUrl: false,
        method: "replace",
      });
      setActiveTab(homeTab);
    } catch (error: unknown) {
      console.error("Login failed", error);
      setLoginError(getLoginFailureMessage(error, getApiErrorMessage(error, "Invalid username or password")));
    } finally {
      setIsLoginSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-3 text-white/80">
          <Icons.History className="animate-spin" size={28} />
          <p className="text-sm font-semibold">Restoring session...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    if (unauthPath === LOGIN_ROUTE) {
      return (
        <LoginPage
          username={username}
          password={password}
          showPassword={showPassword}
          loginError={loginError}
          isLoginSubmitting={isLoginSubmitting}
          onUsernameChange={setUsername}
          onPasswordChange={setPassword}
          onTogglePassword={() => setShowPassword((prev) => !prev)}
          onSubmit={handleLogin}
          onOpenTerms={() => setShowTCModal(true)}
          onGoToLanding={goToLandingPage}
          termsModal={
            showTCModal ? (
              <TermsAndConditions onClose={() => setShowTCModal(false)} />
            ) : null
          }
        />
      );
    }

    return <LandingPage />;
  }

  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const themeClasses = getThemeClasses(isDarkTheme);
  const canDeletePortfolioSite = canDeleteProjectSite(currentUser);
  const canCompletePortfolioProject = canCompleteProject(currentUser);

  const showPortfolioToast = (message: string, type: "success" | "error" = "success") => {
    const id = Date.now() + Math.random();
    setPortfolioToasts((prev) => [...prev, { id, message, type }]);
    window.setTimeout(() => {
      setPortfolioToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  };

  const closePortfolioDeleteDialog = () => {
    if (isPortfolioDeleting) return;
    setPortfolioDeleteTarget(null);
    setPortfolioDeleteDeps([]);
    setPortfolioDeleteDepError(null);
    setPortfolioDeleteError(null);
  };

  const handleConfirmPortfolioDelete = async () => {
    if (!portfolioDeleteTarget || isPortfolioDeleting) return;

    setIsPortfolioDeleting(true);
    setPortfolioDeleteError(null);
    setPortfolioDeleteDepError(null);
    setPortfolioDeleteDeps([]);

    try {
      const response = await projectApi.deleteProject(portfolioDeleteTarget.id);
      const message =
        (response.data &&
          typeof response.data === "object" &&
          typeof (response.data as { message?: string }).message === "string" &&
          (response.data as { message: string }).message) ||
        "Project deleted successfully.";

      const deletedId = portfolioDeleteTarget.id;
      setPortfolioDeleteTarget(null);
      projectStore.removeProject(deletedId);
      showPortfolioToast(message, "success");
      void refreshProjectsAfterMutation();
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        const status = err.response.status;
        const data = err.response.data;

        if (status === 400) {
          setPortfolioDeleteDeps(parseSiteDeleteDependencies(data));
          setPortfolioDeleteDepError(
            getApiErrorMessage(
              err,
              "This project cannot be deleted because it is referenced by existing records.",
            ),
          );
          return;
        }

        if (status === 403) {
          const msg = "You do not have permission to delete this project.";
          setPortfolioDeleteError(msg);
          showPortfolioToast(msg, "error");
          return;
        }

        if (status === 404) {
          const msg = "The selected project no longer exists.";
          setPortfolioDeleteTarget(null);
          projectStore.removeProject(portfolioDeleteTarget.id);
          showPortfolioToast(msg, "error");
          await refreshProjectsAfterMutation();
          return;
        }

        const msg = getApiErrorMessage(err, "Failed to delete project.");
        setPortfolioDeleteError(msg);
        showPortfolioToast(msg, "error");
        return;
      }

      const msg = getApiErrorMessage(err, "Failed to delete project.");
      setPortfolioDeleteError(msg);
      showPortfolioToast(msg, "error");
    } finally {
      setIsPortfolioDeleting(false);
    }
  };

  const closePortfolioCompleteDialog = () => {
    if (isPortfolioCompleting) return;
    setPortfolioCompleteTarget(null);
    setPortfolioCompleteError(null);
  };

  const closePortfolioBillingDialog = () => {
    if (isPortfolioCompletingBilling) return;
    setPortfolioBillingTarget(null);
    setPortfolioBillingError(null);
  };

  const handleConfirmPortfolioComplete = async (
    payload: CompleteProjectConfirmPayload,
  ) => {
    if (!portfolioCompleteTarget || isPortfolioCompleting) return;
    if (isProjectCompleted(portfolioCompleteTarget)) {
      setPortfolioCompleteError("Project is already marked as completed.");
      return;
    }

    setIsPortfolioCompleting(true);
    setPortfolioCompleteError(null);

    try {
      const body: {
        billing_status: "Pending" | "Completed";
        completion_notes?: string;
        billing_completion_notes?: string;
      } = {
        billing_status: payload.billingStatus,
      };
      if (payload.completionNotes) body.completion_notes = payload.completionNotes;
      if (
        payload.billingStatus === "Completed" &&
        payload.billingCompletionNotes
      ) {
        body.billing_completion_notes = payload.billingCompletionNotes;
      }

      const response = await projectApi.completeProject(
        portfolioCompleteTarget.id,
        body,
      );
      const data =
        response.data && typeof response.data === "object"
          ? (response.data as Record<string, unknown>)
          : {};
      const message =
        typeof data.message === "string" && data.message.trim()
          ? data.message
          : "Project marked as completed successfully.";

      const nested =
        data.data && typeof data.data === "object"
          ? (data.data as Record<string, unknown>)
          : data.project && typeof data.project === "object"
            ? (data.project as Record<string, unknown>)
            : data;
      const completion = extractCompletionFields(nested);
      const completedId = portfolioCompleteTarget.id;

      setProjects((prev) =>
        prev.map((p) =>
          String(p.id) === String(completedId)
            ? {
                ...p,
                status: ProjectStatus.APPROVED,
                completedAt: completion.completedAt || new Date().toISOString(),
                completedBy:
                  completion.completedBy ||
                  currentUser?.name ||
                  currentUser?.username ||
                  currentUser?.id ||
                  null,
                completionNotes:
                  completion.completionNotes ??
                  (payload.completionNotes || null),
                billingStatus:
                  completion.billingStatus ?? payload.billingStatus ?? "Pending",
                billingCompletedAt: completion.billingCompletedAt ?? null,
                billingCompletedBy: completion.billingCompletedBy ?? null,
                billingCompletionNotes:
                  completion.billingCompletionNotes ??
                  (payload.billingCompletionNotes || null),
                updatedAt: new Date().toISOString(),
              }
            : p,
        ),
      );

      setPortfolioCompleteTarget(null);
      showPortfolioToast(message, "success");
      void refreshProjectsAfterMutation();
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 403) {
        const msg =
          "You do not have permission to mark this project as completed.";
        setPortfolioCompleteError(msg);
        showPortfolioToast(msg, "error");
        return;
      }
      if (axios.isAxiosError(err) && err.response?.status === 400) {
        const msg = getApiErrorMessage(
          err,
          "Unable to complete project. Check billing status and try again.",
        );
        setPortfolioCompleteError(msg);
        showPortfolioToast(msg, "error");
        return;
      }
      const msg = getApiErrorMessage(err, "Failed to mark project as completed.");
      setPortfolioCompleteError(msg);
      showPortfolioToast(msg, "error");
    } finally {
      setIsPortfolioCompleting(false);
    }
  };

  const handleConfirmPortfolioBilling = async (
    billingCompletionNotes: string,
  ) => {
    if (!portfolioBillingTarget || isPortfolioCompletingBilling) return;
    if (!canCompleteProjectBilling(portfolioBillingTarget)) {
      setPortfolioBillingError(
        "Billing can only be completed after the project is marked as completed.",
      );
      return;
    }

    setIsPortfolioCompletingBilling(true);
    setPortfolioBillingError(null);

    try {
      const body =
        billingCompletionNotes.trim().length > 0
          ? { billing_completion_notes: billingCompletionNotes.trim() }
          : {};
      const response = await projectApi.completeProjectBilling(
        portfolioBillingTarget.id,
        body,
      );
      const data =
        response.data && typeof response.data === "object"
          ? (response.data as Record<string, unknown>)
          : {};
      const message =
        typeof data.message === "string" && data.message.trim()
          ? data.message
          : "Billing marked as completed successfully.";
      const nested =
        data.data && typeof data.data === "object"
          ? (data.data as Record<string, unknown>)
          : data;
      const completion = extractCompletionFields(nested);
      const projectId = portfolioBillingTarget.id;

      setProjects((prev) =>
        prev.map((p) =>
          String(p.id) === String(projectId)
            ? {
                ...p,
                billingStatus: completion.billingStatus ?? "Completed",
                billingCompletedAt:
                  completion.billingCompletedAt || new Date().toISOString(),
                billingCompletedBy:
                  completion.billingCompletedBy ||
                  currentUser?.name ||
                  currentUser?.username ||
                  currentUser?.id ||
                  null,
                billingCompletionNotes:
                  completion.billingCompletionNotes ??
                  (billingCompletionNotes.trim() || null),
                updatedAt: new Date().toISOString(),
              }
            : p,
        ),
      );

      setPortfolioBillingTarget(null);
      showPortfolioToast(message, "success");
      void refreshProjectsAfterMutation();
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 403) {
        const msg = "You do not have permission to complete billing.";
        setPortfolioBillingError(msg);
        showPortfolioToast(msg, "error");
        return;
      }
      if (axios.isAxiosError(err) && err.response?.status === 400) {
        const msg = getApiErrorMessage(
          err,
          "Billing can only be completed after the project is marked as completed.",
        );
        setPortfolioBillingError(msg);
        showPortfolioToast(msg, "error");
        return;
      }
      const msg = getApiErrorMessage(err, "Failed to mark billing as completed.");
      setPortfolioBillingError(msg);
      showPortfolioToast(msg, "error");
    } finally {
      setIsPortfolioCompletingBilling(false);
    }
  };

  return (
    <ThemeContext.Provider value={{ isDarkTheme, setIsDarkTheme: handleThemeChange }}>
      <Layout
        user={currentUser}
        onLogout={logout}
        activeTab={activeTab}
        teamLeaderProjectsView={teamLeaderProjectsView}
        onTeamLeaderBackToOverview={() => {
          setTeamLeaderProjectsView('overview');
          setTeamLeaderScrollSection(null);
        }}
        navReturn={navReturn}
        onNavBack={() => {
          if (!navReturn) return;
          const target = navReturn.tab;
          setNavReturn(null);
          setFinancialSectionLocked(false);
          setFinancialInitialProjectId(null);
          if (target === 'team_projects' && currentUser.role === UserRole.TEAM_LEAD) {
            setTeamLeaderProjectsView('overview');
            setTeamLeaderScrollSection(null);
          }
          setActiveTab(target);
          const targetPath = TAB_PATHS[target];
          if (targetPath && getAppRoutePath() !== targetPath) {
            syncAppRoutePath(targetPath, "push");
          }
        }}
        setActiveTab={(tab) => {
          const nextTab = isTabAllowedForRole(tab, currentUser.role, currentUser.username, currentUser)
            ? tab
            : getDefaultTabForRole(currentUser.role);
          if (nextTab === 'team_projects' && activeTab === 'team_projects') {
            setTeamLeaderProjectsView('overview');
            setTeamLeaderScrollSection(null);
          }
          setActiveTab(nextTab);
          const targetPath = TAB_PATHS[nextTab];
          if (targetPath && getAppRoutePath() !== targetPath) {
            syncAppRoutePath(targetPath, "push");
          }
          setFinancialSectionLocked(false);
          setNavReturn(null);
          if (nextTab !== "testing_photos") {
            setTestingPhotosInitialProjectId(null);
          }
          setRemindersInitialProjectId(null);
          setSelectedProjectId(null);
          setProjectFilter("all");
        }}
        notifications={notifications}
        onMarkRead={handleMarkRead}
        onRequestNotifications={handleRequestNotifications}
        onNavigateToAlerts={() => {
          setNavReturn(null);
          setActiveTab("alerts");
          const targetPath = TAB_PATHS.alerts;
          if (targetPath && getAppRoutePath() !== targetPath) {
            syncAppRoutePath(targetPath, "push");
          }
        }}
        onNotificationClick={handleAlertNavigation}
        reminderBadgeCount={reminderBadgeCount}
        projects={projects}
        selectedProjectId={selectedProjectId}
        onSelectProject={(id) => {
          setSelectedProjectId(id);
        }}
        isOnboardingTourActive={isOnboardingTourActive}
        onOnboardingTourStateChange={setIsOnboardingTourActive}
        isAnyTourRunning={isAnyTourRunning}
        onAnyTourStateChange={setIsAnyTourRunning}
      >
        <Suspense fallback={<TabSuspenseFallback />}>
        {activeTab === "projects" && selectedProject ? (
          <ProjectDetails
            project={selectedProject}
            currentUser={currentUser}
            onBack={() => setSelectedProjectId(null)}
            onUpdateStatus={handleUpdateStatus}
            onUpdateProject={handleUpdateProject}
            onAssignTeam={handleAssignTeam}
            onAddTask={handleAddTask}
            onRefresh={() => fetchData()}
          />
        ) : activeTab === "dashboard" ? (
          isPmcHeadEquivalent(currentUser) ? (
            <PMCHead360Dashboard
              user={currentUser}
              projects={projects}
              dprs={dprs}
              onViewProject={(id) => {
                setSelectedProjectId(id);
                setNavReturn(makeNavReturn('dashboard', 'Overview'));
                setActiveTab("team_projects");
                const targetPath = TAB_PATHS.team_projects;
                if (targetPath && getAppRoutePath() !== targetPath) {
                  syncAppRoutePath(targetPath, "push");
                }
              }}
              onInitializeProject={() => {
                setSelectedProjectId(null);
                setNavReturn(makeNavReturn('dashboard', 'Overview'));
                setActiveTab("project_init");
                const targetPath = TAB_PATHS.project_init;
                if (targetPath && getAppRoutePath() !== targetPath) {
                  syncAppRoutePath(targetPath, "push");
                }
              }}
              onProjectDeleted={(deletedId) => {
                projectStore.removeProject(deletedId);
                void refreshProjectsAfterMutation();
              }}
            />
          ) : (
            <Dashboard
              user={currentUser}
              projects={projects}
              dprs={dprs}
              projectDocuments={projectDocuments}
              onViewProject={(id) => {
                setSelectedProjectId(id);
                setNavReturn(makeNavReturn('dashboard', 'Overview'));
                setActiveTab("projects");
                const targetPath = TAB_PATHS.projects;
                if (targetPath && getAppRoutePath() !== targetPath) {
                  syncAppRoutePath(targetPath, "push");
                }
              }}
              onReviewProjects={() => {
                setSelectedProjectId(null);
                setNavReturn(makeNavReturn('dashboard', 'Overview'));
                setActiveTab("projects");
                setProjectFilter("attention");
                const targetPath = TAB_PATHS.projects;
                if (targetPath && getAppRoutePath() !== targetPath) {
                  syncAppRoutePath(targetPath, "push");
                }
              }}
              onStatClick={handleStatClick}
              onSubmitDPR={handleSubmitDPR}
            />
          )
        ) : activeTab === "site_engineer_dashboard" ? (
          <SiteEngineerDashboard
            user={currentUser}
            projects={projects}
            onNavigate={(tab) => {
              setNavReturn(makeNavReturn('site_engineer_dashboard', 'Overview'));
              setActiveTab(tab);
              const targetPath = TAB_PATHS[tab];
              if (targetPath && getAppRoutePath() !== targetPath) {
                syncAppRoutePath(targetPath, "push");
              }
            }}
          />
        ) : activeTab === "machinery_list" ? (
          <MachineryList
            projects={
              currentUser.role === UserRole.SITE_ENGINEER
                ? projects.filter((p) =>
                  (p.siteEngineerIds ?? []).some((id) => userMatchesAssignee(currentUser, id)),
                )
                : projects
            }
          />
        ) : activeTab === "my_scopes" ? (
          <MyScopesPage
            user={currentUser}
            projects={projects}
            financialDataVersion={financialDataVersion}
            onNavigateFinancial={(section, projectId) => {
              setFinancialSection(normalizeBillingFinancialSubTab(section));
              setFinancialSectionLocked(true);
              setNavReturn(makeNavReturn('my_scopes'));
              if (projectId) {
                setFinancialInitialProjectId(projectId);
              }
              setActiveTab("financial_management");
              const targetPath = TAB_PATHS.financial_management;
              if (targetPath && getAppRoutePath() !== targetPath) {
                syncAppRoutePath(targetPath, "push");
              }
            }}
            onNavigateTestingPhotos={(projectId) => {
              setTestingPhotosInitialProjectId(projectId ?? null);
              setNavReturn(makeNavReturn('my_scopes'));
              setActiveTab("testing_photos");
              const targetPath = TAB_PATHS.testing_photos;
              if (targetPath && getAppRoutePath() !== targetPath) {
                syncAppRoutePath(targetPath, "push");
              }
            }}
          />
        ) : activeTab === "execution" ? (
          <SiteExecution
            projects={
              currentUser.role === UserRole.SITE_ENGINEER
                ? projects.filter((p) =>
                  (p.siteEngineerIds ?? []).some((id) => userMatchesAssignee(currentUser, id)),
                )
                : projects
            }
            onViewProject={(id) => {
              setSelectedProjectId(id);
              setNavReturn(makeNavReturn('execution', 'Site Progress'));
              setActiveTab("projects");
              const targetPath = TAB_PATHS.projects;
              if (targetPath && getAppRoutePath() !== targetPath) {
                syncAppRoutePath(targetPath, "push");
              }
            }}
          />
        ) : activeTab === "team_projects" ? (
          <Projects
            projects={projects}
            currentUser={currentUser}
            selectedProjectId={selectedProjectId}
            tutorialSection={
              currentUser.role === UserRole.TEAM_LEAD ? 'tl_overview' : 'projects'
            }
            onViewProject={(id) => {
              setSelectedProjectId(id);
            }}
            onNavigate={(navData) => {
              const returnCtx = makeNavReturn(
                'team_projects',
                currentUser.role === UserRole.TEAM_LEAD ? 'Overview' : 'Projects',
              );
              if (typeof navData === 'object' && navData.tab === 'testing_photos') {
                setTestingPhotosInitialProjectId(navData.projectId ?? null);
                setFinancialSectionLocked(false);
                setNavReturn(returnCtx);
                setActiveTab('testing_photos');
                const targetPath = TAB_PATHS.testing_photos;
                if (targetPath && getAppRoutePath() !== targetPath) {
                  syncAppRoutePath(targetPath, "push");
                }
              } else if (typeof navData === 'object' && navData.tab && navData.section) {
                setFinancialSection(normalizeFinancialSubTab(navData.section));
                setFinancialSectionLocked(true);
                setNavReturn(
                  navData.returnTab ? makeNavReturn(navData.returnTab) : returnCtx,
                );
                setActiveTab(navData.tab);
                const targetPath = TAB_PATHS[navData.tab];
                if (targetPath && getAppRoutePath() !== targetPath) {
                  syncAppRoutePath(targetPath, "push");
                }
              } else if (typeof navData === 'string') {
                setFinancialSectionLocked(false);
                setNavReturn(returnCtx);
                setActiveTab(navData);
                const targetPath = TAB_PATHS[navData];
                if (targetPath && getAppRoutePath() !== targetPath) {
                  syncAppRoutePath(targetPath, "push");
                }
              }
            }}
            financialDataVersion={financialDataVersion}
            onTourStateChange={setIsAnyTourRunning}
            teamLeaderView={teamLeaderProjectsView}
            onTeamLeaderViewChange={setTeamLeaderProjectsView}
            teamLeaderScrollSection={teamLeaderScrollSection}
            onTeamLeaderScrollSectionConsumed={() => setTeamLeaderScrollSection(null)}
          />
        ) : activeTab === "projects" ? (
          <div className="space-y-6 animate-in fade-in duration-500">
            <DashboardToastStack toasts={portfolioToasts} />
            {/* Page header */}
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className={`text-xl font-black uppercase tracking-tight sm:text-2xl ${themeClasses.textPrimary}`}>
                  Enterprise Portfolio
                </h2>
                <p className={`text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                  Live Project Registry · completed projects stay listed below
                </p>
              </div>
              <div className="flex shrink-0 gap-3">
                {isPmcHeadEquivalent(currentUser) && (
                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className={`flex items-center gap-2 rounded-2xl border px-4 py-2 text-xs font-black uppercase tracking-widest transition-all sm:px-6 sm:py-2.5 ${themeClasses.buttonSecondary} ${themeClasses.border}`}
                  >
                    <Icons.Add size={16} />
                    <span className="hidden sm:inline">Initiate Project</span>
                    <span className="sm:hidden">New</span>
                  </button>
                )}
              </div>
            </div>

            {/* Portfolio table — scrollable on small screens */}
            <div className={`overflow-hidden rounded-2xl border sm:rounded-[2rem] ${themeClasses.glassCard} ${themeClasses.border}`}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] border-collapse text-left">
                  <thead>
                    <tr className={`border-b ${themeClasses.bgSecondary} ${themeClasses.border}`}>
                      <th className={`px-4 py-4 text-[10px] font-black uppercase tracking-widest sm:px-8 sm:py-5 ${themeClasses.textSecondary}`}>
                        Resource Code
                      </th>
                      <th className={`px-4 py-4 text-[10px] font-black uppercase tracking-widest sm:px-8 sm:py-5 ${themeClasses.textSecondary}`}>
                        Workflow Status
                      </th>
                      {canCompletePortfolioProject && (
                        <th className={`px-4 py-4 text-[10px] font-black uppercase tracking-widest sm:px-6 sm:py-5 ${themeClasses.textSecondary}`}>
                          Complete
                        </th>
                      )}
                      <th className={`px-4 py-4 text-right text-[10px] font-black uppercase tracking-widest sm:px-8 sm:py-5 ${themeClasses.textSecondary}`}>
                        {canDeletePortfolioSite ? "Actions" : ""}
                      </th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${themeClasses.border}`}>
                    {projects.map((p) => {
                      const completed = isProjectCompleted(p);
                      return (
                      <tr
                        key={p.id}
                        className={`group cursor-pointer transition-all ${themeClasses.bgHover} ${
                          completed ? (isDarkTheme ? "bg-emerald-950/20" : "bg-emerald-50/40") : ""
                        }`}
                        onClick={() => setSelectedProjectId(p.id)}
                      >
                        <td className="px-4 py-4 sm:px-8 sm:py-6">
                          <p className={`text-sm font-black tracking-tight transition-colors sm:text-base ${themeClasses.textPrimary}`}>
                            {p.title}
                          </p>
                          <p className={`text-[10px] font-black uppercase tracking-tighter ${themeClasses.textSecondary}`}>
                            {p.client}
                          </p>
                        </td>
                        <td className="px-4 py-4 sm:px-8 sm:py-6">
                          <span
                            className={`inline-block max-w-[16rem] rounded-xl border px-2.5 py-1 text-[10px] font-black uppercase leading-snug sm:px-3 sm:py-1.5 ${
                              completed
                                ? isDarkTheme
                                  ? "border-emerald-500/40 bg-emerald-600/15 text-emerald-300"
                                  : "border-emerald-200 bg-emerald-50 text-emerald-800"
                                : STATUS_COLORS[p.status]
                            }`}
                          >
                            {completed
                              ? getProjectCompletionBillingLabel(p)
                              : getProjectStatusLabel(p)}
                          </span>
                        </td>
                        {canCompletePortfolioProject && (
                          <td className="px-4 py-4 sm:px-6 sm:py-6">
                            {!completed ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPortfolioCompleteError(null);
                                  setPortfolioCompleteTarget(p);
                                }}
                                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                                  isDarkTheme
                                    ? "border-emerald-500/40 bg-emerald-600/15 text-emerald-300 hover:bg-emerald-600/30"
                                    : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                }`}
                                aria-label={`Mark ${p.title} as completed`}
                              >
                                <Icons.Approve size={14} aria-hidden />
                                Mark as Complete
                              </button>
                            ) : canCompleteProjectBilling(p) ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPortfolioBillingError(null);
                                  setPortfolioBillingTarget(p);
                                }}
                                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                                  isDarkTheme
                                    ? "border-sky-500/40 bg-sky-600/15 text-sky-300 hover:bg-sky-600/30"
                                    : "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100"
                                }`}
                                aria-label={`Complete billing for ${p.title}`}
                              >
                                <Icons.Approve size={14} aria-hidden />
                                Complete Billing
                              </button>
                            ) : (
                              <span className={`text-[10px] font-bold uppercase tracking-widest ${themeClasses.textSecondary}`}>
                                Billing Done
                              </span>
                            )}
                          </td>
                        )}
                        <td className="px-4 py-4 text-right sm:px-8 sm:py-6">
                          <div className="inline-flex items-center justify-end gap-2">
                            {canDeletePortfolioSite && !completed && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPortfolioDeleteDeps([]);
                                  setPortfolioDeleteDepError(null);
                                  setPortfolioDeleteError(null);
                                  setPortfolioDeleteTarget(p);
                                }}
                                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                                  isDarkTheme
                                    ? "border-rose-500/40 bg-rose-600/15 text-rose-300 hover:bg-rose-600/30"
                                    : "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                                }`}
                                aria-label={`Delete ${p.title}`}
                              >
                                <Icons.Trash size={14} aria-hidden />
                                Delete
                              </button>
                            )}
                            <div className={`inline-block rounded-xl p-1.5 transition-all sm:p-2 ${themeClasses.bgHover} ${themeClasses.textPrimary}`}>
                              <Icons.ChevronRight size={16} />
                            </div>
                          </div>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <SiteDeleteDialog
              open={Boolean(portfolioDeleteTarget)}
              entityLabel="Project"
              siteName={
                portfolioDeleteTarget
                  ? sanitizeProjectDisplayName(portfolioDeleteTarget.title) ||
                    portfolioDeleteTarget.title
                  : undefined
              }
              onCancel={closePortfolioDeleteDialog}
              onConfirm={() => void handleConfirmPortfolioDelete()}
              isDeleting={isPortfolioDeleting}
              dependencyError={portfolioDeleteDepError}
              dependencies={portfolioDeleteDeps}
              errorMessage={portfolioDeleteError}
            />

            <CompleteProjectDialog
              open={Boolean(portfolioCompleteTarget)}
              projectName={
                portfolioCompleteTarget
                  ? sanitizeProjectDisplayName(portfolioCompleteTarget.title) ||
                    portfolioCompleteTarget.title
                  : undefined
              }
              onCancel={closePortfolioCompleteDialog}
              onConfirm={(payload) => void handleConfirmPortfolioComplete(payload)}
              isSubmitting={isPortfolioCompleting}
              errorMessage={portfolioCompleteError}
            />

            <CompleteBillingDialog
              open={Boolean(portfolioBillingTarget)}
              projectName={
                portfolioBillingTarget
                  ? sanitizeProjectDisplayName(portfolioBillingTarget.title) ||
                    portfolioBillingTarget.title
                  : undefined
              }
              onCancel={closePortfolioBillingDialog}
              onConfirm={(notes) => void handleConfirmPortfolioBilling(notes)}
              isSubmitting={isPortfolioCompletingBilling}
              errorMessage={portfolioBillingError}
            />

            <TutorialVideosPanel section="portfolio" />
          </div>
        ) : activeTab === "dpr_records" ? (
          <DPRReviewDashboard
            api={dprApi}
            user={currentUser}
            projects={projects}
            onApprove={handleApproveDPR}
            onReject={handleRejectDPR}
          />
        ) : activeTab === "monthly_scope" ? (
          <MonthlyScopePage user={currentUser} projects={projects} />
        ) : activeTab === "manpower_management" ? (
          <ManpowerManagement projects={projects} currentUser={currentUser} />
        ) : activeTab === "site_photos" ? (
          <SitePhotosManagement projects={projects} currentUser={currentUser} />
        ) : activeTab === "testing_photos" ? (
          <TestingPhotosPage
            projects={projects}
            currentUser={currentUser}
            initialProjectId={testingPhotosInitialProjectId}
          />
        ) : activeTab === "project_feedback" ? (
          <ProjectFeedbackPage projects={projects} currentUser={currentUser} />
        ) : activeTab === "user_management" ? (
          <UserManagementPage projects={projects} currentUser={currentUser} />
        ) : activeTab === "financial_management" ? (
          <FinancialManagement
            projects={
              currentUser.role === UserRole.BILLING_SITE_ENGINEER
                ? projects.filter((p) => projectAssignedToUser(p, currentUser, 'billing'))
                : projects
            }
            currentUser={currentUser}
            onSaveSuccess={() => setFinancialDataVersion(v => v + 1)}
            initialSubTab={financialSection}
            initialProjectId={financialInitialProjectId}
            lockToInitialSection={financialSectionLocked}
            returnTab={navReturn?.tab ?? null}
            variant={currentUser.role === UserRole.BILLING_SITE_ENGINEER ? 'billing' : 'default'}
            onReturnToProject={
              navReturn
                ? () => {
                  const target = navReturn.tab;
                  setActiveTab(target);
                  setFinancialSectionLocked(false);
                  setNavReturn(null);
                  setFinancialInitialProjectId(null);
                  const targetPath = TAB_PATHS[target];
                  if (targetPath && getAppRoutePath() !== targetPath) {
                    syncAppRoutePath(targetPath, "push");
                  }
                }
                : undefined
            }
          />
        ) : activeTab === "alerts" ? (
          <AlertsPage
            notifications={notifications.filter((n) => n.userId === currentUser.id)}
            loading={alertsLoading}
            refreshing={alertsRefreshing}
            variant={isPmcHeadEquivalent(currentUser) ? 'executive' : 'default'}
            pendingUpdates={isPmcHeadEquivalent(currentUser) ? pendingUpdates : null}
            pendingLoading={isPmcHeadEquivalent(currentUser) ? pendingLoading : false}
            onRefresh={() => void fetchAlerts({ silent: true, includeActivity: true })}
            onMarkRead={handleMarkRead}
            onNavigate={handleAlertNavigation}
          />
        ) : activeTab === "reminders" ? (
          <RemindersPage
            projects={projects}
            currentUser={currentUser}
            initialProjectId={remindersInitialProjectId}
            onBadgeCountsChange={() => void refreshReminderBadge()}
          />
        ) : activeTab === "meeting_documents" ? (
          <MeetingDocumentsPage projects={projects} />
        ) : activeTab === "wpr_records" ? (
          <WPRReviewDashboard
            projects={projects}
            currentUser={currentUser}
            selectedProjectId={selectedProjectId}
          />
        ) : activeTab === "mpr_records" ? (
          <MPRReviewDashboard
            projects={projects}
            currentUser={currentUser}
            selectedProjectId={selectedProjectId}
          />
        ) : activeTab === "project_init" ? (
          <ProjectInit
            user={currentUser}
            onProjectCreated={() => {
              clearAppDataCaches();
              projectStore.setBootstrapUser(currentUser);
              void projectStore.refreshAfterMutation();
            }}
          />
        ) : (
          <div className="text-center py-20 uppercase font-black tracking-widest text-slate-300">
            Workspace Provisioning...
          </div>
        )}
        </Suspense>
        <NotificationAlertToastStack toasts={alertToasts} />
        {currentUser && canUserHearReminderAudio(currentUser) ? (
          <ReminderAlarmEngine
            user={currentUser}
            onNavigateToReminders={navigateToReminders}
          />
        ) : null}
        {isCreateModalOpen && (
          <CreateProjectModal
            onClose={() => setIsCreateModalOpen(false)}
            onSubmit={handleCreateProject}
          />
        )}
      </Layout>
    </ThemeContext.Provider>
  );
};

export default App;
