import React, { useState, useEffect } from "react";
import Layout from "./components/Layout";

import { ThemeContext, getThemeClasses } from "./utils/theme";
import Dashboard, { StatType } from "./components/Dashboard";
import PMCHead360Dashboard from "./components/PMCHead360Dashboard";
import SiteExecution from "./components/SiteExecution";
import ProjectDetails from "./components/ProjectDetails";
import DPRRecords from "./components/DPRRecords";
import DPRReviewDashboard from "./components/DPRReviewDashboard";
import WPRReviewDashboard from "./components/WPRReviewDashboard";
import Projects from "./components/Projects";
import CreateProjectModal from "./components/CreateProjectModal";
import ProjectModal from "./components/ProjectModal";
import TermsAndConditions from "./components/TermsAndConditions";
import SiteEngineerDashboard from "./components/SiteEngineerDashboard";
import ProjectInit from "./components/ProjectInit";
import MonthlyScopePage from "./components/MonthlyScopePage";
import MyScopesPage from "./components/MyScopesPage";
import MachineryList from "./components/MachineryList";
import ManpowerManagement from "./components/ManpowerManagement";
import SitePhotosManagement from "./components/sitePhotos/SitePhotosManagement";
import FinancialManagement, {
  SubTab,
  normalizeBillingFinancialSubTab,
  normalizeFinancialSubTab,
} from "./components/FinancialManagement";
import type { TeamLeaderOverviewSection } from "./components/teamLeader/TeamLeaderOverviewShell";
import AlertsPage from "./components/AlertsPage";
import MeetingDocumentsPage from "./components/meetingDocuments/MeetingDocumentsPage";
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
import { STATUS_COLORS } from "./constants";
import { projectApi, operationsApi, dprApi, notificationApi, getApiErrorMessage, unwrapList } from "./services/api";
import { getLoginFailureMessage } from "./utils/loginCredentials";
import { useAuth } from "./contexts/AuthContext";
import { websocketService, NotificationData } from "./services/websocket";
import { alertsApi, fetchAllAlerts } from "./services/alertsApi";
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
} from "./utils/projectActorFallback";
import { loadUserDirectory } from "./utils/userDirectory";
import {
  fetchPendingUpdatesSummary,
  type PendingUpdatesSummary,
} from "./utils/pmcHeadPendingUpdates";
import { userMatchesAssignee, extractAssigneeId, projectAssignedToUser } from "./utils/roleProjectAssignments";
import { normalizeBackendProjectRow, buildPmcHeadDropdownProjects, buildPmcHeadExecutiveProjectOptions, getKnownExecutiveProjectStubs, getHseExecutiveProjectStubs, seedProjectRowCache } from "./utils/pmcHeadExecutiveProjects";
import {
  clearAppRouteOnLogout,
  getDefaultTabForRole,
  isTabAllowedForRole,
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

const App: React.FC = () => {
  const { user: currentUser, loading: authLoading, login, logout: authLogout } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const currentUserRef = React.useRef(currentUser);
  currentUserRef.current = currentUser;
  const [projects, setProjects] = useState<Project[]>([]);
  const projectsRef = React.useRef(projects);
  projectsRef.current = projects;
  const [dprs, setDprs] = useState<DPR[]>([]);
  const [projectDocuments, setProjectDocuments] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null
  );
  const [financialDataVersion, setFinancialDataVersion] = useState(0);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [projectFilter, setProjectFilter] = useState<"all" | "attention">(
    "all"
  );

  const [isOnboardingTourActive, setIsOnboardingTourActive] = useState(false);
  const [isAnyTourRunning, setIsAnyTourRunning] = useState(false);
  const [financialSection, setFinancialSection] = useState<SubTab>('progress');
  const [financialSectionLocked, setFinancialSectionLocked] = useState(false);
  const [financialReturnTab, setFinancialReturnTab] = useState<string | null>(null);
  const [financialInitialProjectId, setFinancialInitialProjectId] = useState<string | null>(null);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alertsRefreshing, setAlertsRefreshing] = useState(false);
  const [pendingUpdates, setPendingUpdates] = useState<PendingUpdatesSummary | null>(null);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [teamLeaderProjectsView, setTeamLeaderProjectsView] = useState<'overview' | 'full'>('overview');
  const [teamLeaderScrollSection, setTeamLeaderScrollSection] = useState<TeamLeaderOverviewSection | null>(null);
  const [alertToasts, setAlertToasts] = useState<AlertToastItem[]>([]);
  const alertToastIdRef = React.useRef(0);

  // Modal States
  const [showTCModal, setShowTCModal] = useState(false);

  // Login Form States
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState(""); // Added username for login
  const [password, setPassword] = useState(""); // Updated default password
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
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
    setIsLoading(true);
    try {
      const isPmcHead = currentUser?.role === UserRole.PMC_HEAD;
      const [projectsRes, dprsRes] = await Promise.all([
        projectApi.getProjects(isPmcHead ? { page_size: 1000 } : undefined),
        dprApi.getDPRs(),
      ]);

      const projectsData = unwrapList(projectsRes.data);
      if (isPmcHead) {
        seedProjectRowCache(projectsData);
      }

      const dprsData = unwrapList(dprsRes.data);

      const backendProjects = projectsData
        .map((p) => normalizeBackendProjectRow(p as Record<string, unknown>))
        .filter((project) => project.id);

      console.log('Fetched projects:', backendProjects.length, 'projects');

      // Transform backend DPRs to frontend format
      const backendDPRs = dprsData.map((d: any) => {
        // Build work description from activities if available
        let workDescription = '';
        if (d.activities && Array.isArray(d.activities) && d.activities.length > 0) {
          workDescription = d.activities
            .map((act: any) => `${act.activity}${act.deliverables ? ` - ${act.deliverables}` : ''}`)
            .join('; ');
        } else {
          workDescription = d.work_done || '';
        }

        // Calculate manpower from activities or use provided value
        let manpower = 0;
        if (d.activities && Array.isArray(d.activities) && d.activities.length > 0) {
          const avgProgress = d.activities.reduce((sum: number, act: any) => sum + (act.target_achieved || 0), 0) / d.activities.length;
          manpower = Math.max(1, Math.floor(avgProgress / 10)) || 1;
        } else {
          manpower = d.manpower_count || 0;
        }

        // Find project ID from project name (use backendProjects since projects state isn't updated yet)
        const project = backendProjects.find((p: Project) => p.title === d.project_name);
        const projectId = project?.id || d.project?.toString() || "";

        return {
          id: d.id?.toString() || Date.now().toString(),
          projectId: projectId,
          projectName: d.project_name || "Unknown Project",
          date: d.report_date ? new Date(d.report_date).toLocaleDateString("en-GB") : new Date().toLocaleDateString("en-GB"),
          workDescription: workDescription || 'No description available',
          manpower: manpower,
          status: (d.status || 'PENDING').toUpperCase(),
          submittedBy: d.issued_by || currentUser?.id || '',
          submittedByName: d.issued_by || 'Unknown',
          submittedAt: d.created_at ? new Date(d.created_at).toLocaleDateString("en-GB") : new Date().toLocaleDateString("en-GB"),
          labor: d.labor_log || undefined,
          machinery: d.machinery_log || undefined,
          activityProgress: d.activities?.map((act: any) => ({
            activityId: act.id?.toString() || '',
            todayProgress: act.target_achieved || 0
          })) || undefined,
          criticalIssues: d.unresolved_issues || d.critical_issues || '',
          billingStatus: d.bill_status || d.billing_status || '',
        };
      });

      let projectsForState = backendProjects;
      if (isPmcHead) {
        projectsForState = buildPmcHeadDropdownProjects(
          backendProjects,
          getKnownExecutiveProjectStubs(backendProjects),
          getHseExecutiveProjectStubs(backendProjects),
        );
      }

      setProjects(projectsForState);
      setDprs(backendDPRs);

      if (isPmcHead) {
        void buildPmcHeadExecutiveProjectOptions(backendProjects)
          .then(({ projects: executiveProjects }) => {
            if (executiveProjects.length > 0) {
              setProjects(executiveProjects);
            }
          })
          .catch(() => {
            // stubs already shown
          });
      }

      // Fetch project documents for vault (non-blocking)
      void projectApi
        .getProjectDocuments()
        .then((docsRes) => {
          setProjectDocuments(docsRes.data);
        })
        .catch((docError) => {
          console.error('Failed to fetch project documents:', docError);
        });
    } catch (error) {
      console.error("Failed to fetch data from backend:", error);
      // Set empty arrays to prevent UI from breaking
      setProjects([]);
      setDprs([]);
      setProjectDocuments([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!currentUser) return;
    fetchData();
  }, [currentUser?.id]);

  useEffect(() => {
    if (authLoading) return;

    if (!currentUser) {
      clearAppRouteOnLogout();
      setActiveTab("dashboard");
      setSelectedProjectId(null);
      setFinancialSectionLocked(false);
      setFinancialReturnTab(null);
      setProjectFilter("all");
      return;
    }

    const tab = syncAuthenticatedNavigation(currentUser, { honorCurrentUrl: true });
    setActiveTab(tab);
  }, [currentUser?.id, currentUser?.role, authLoading]);

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
    if (!isTabAllowedForRole(activeTab, currentUser.role, currentUser.username)) {
      const tab = getDefaultTabForRole(currentUser.role);
      setActiveTab(tab);
      navigateToTab(tab, "replace");
    }
  }, [activeTab, currentUser?.role, currentUser?.username, authLoading]);

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
          if (currentUser?.role === UserRole.PMC_HEAD && p.teamLeadId) {
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
      // Refresh DPR list from API to show the newly submitted DPR
      const dprsRes = await dprApi.getDPRs();
      const dprsData = Array.isArray(dprsRes.data) ? dprsRes.data : (dprsRes.data.results || dprsRes.data);

      const backendDPRs = dprsData.map((d: any) => {
        // Build work description from activities if available
        let workDescription = '';
        if (d.activities && Array.isArray(d.activities) && d.activities.length > 0) {
          workDescription = d.activities
            .map((act: any) => `${act.activity}${act.deliverables ? ` - ${act.deliverables}` : ''}`)
            .join('; ');
        } else {
          workDescription = d.work_done || '';
        }

        // Calculate manpower from activities or use provided value
        let manpower = 0;
        if (d.activities && Array.isArray(d.activities) && d.activities.length > 0) {
          const avgProgress = d.activities.reduce((sum: number, act: any) => sum + (act.target_achieved || 0), 0) / d.activities.length;
          manpower = Math.max(1, Math.floor(avgProgress / 10)) || 1;
        } else {
          manpower = d.manpower_count || 0;
        }

        // Find project ID from project name (use projects state)
        const project = projects.find((p: Project) => p.title === d.project_name);
        const projectId = project?.id || d.project?.toString() || "";

        return {
          id: d.id?.toString() || Date.now().toString(),
          projectId: projectId,
          projectName: d.project_name || "Unknown Project",
          date: d.report_date ? new Date(d.report_date).toLocaleDateString("en-GB") : new Date().toLocaleDateString("en-GB"),
          workDescription: workDescription || 'No description available',
          manpower: manpower,
          status: (d.status || 'PENDING').toUpperCase(),
          submittedBy: d.issued_by || currentUser?.id || '',
          submittedByName: d.issued_by || currentUser?.name || 'Unknown',
          submittedAt: d.created_at ? new Date(d.created_at).toLocaleDateString("en-GB") : new Date().toLocaleDateString("en-GB"),
          labor: d.labor_log || undefined,
          machinery: d.machinery_log || undefined,
          activityProgress: d.activities?.map((act: any) => ({
            activityId: act.id?.toString() || '',
            todayProgress: act.target_achieved || 0
          })) || undefined,
          criticalIssues: d.unresolved_issues || d.critical_issues || '',
          billingStatus: d.bill_status || d.billing_status || '',
        };
      });

      setDprs(backendDPRs);
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

  const fetchAlerts = React.useCallback(async (options?: { silent?: boolean }) => {
    if (!currentUser) return;
    if (!options?.silent) setAlertsLoading(true);
    else setAlertsRefreshing(true);
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
      if (currentUser.role === UserRole.PMC_HEAD) {
        try {
          const [directory, assigneeProjects] = await Promise.all([
            loadUserDirectory(),
            loadProjectsForActorFallback(),
          ]);
          const activityAlerts = await fetchPmcHeadActivityNotifications(
            currentUser.id,
          );
          merged = mergeActivityNotifications(mapped, activityAlerts);
          merged = enrichNotificationsActors(merged, directory, assigneeProjects);
          setPendingLoading(true);
          try {
            const pending = await fetchPendingUpdatesSummary(merged);
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
      } else {
        setPendingUpdates(null);
      }

      setNotifications((prev) => {
        const readSyntheticIds = new Set(
          prev
            .filter((n) => isSyntheticActivityNotification(n.id) && n.isRead)
            .map((n) => n.id),
        );
        const sorted = sortNotificationsDesc(merged);
        if (readSyntheticIds.size === 0) return sorted;
        return sorted.map((n) =>
          readSyntheticIds.has(n.id) ? { ...n, isRead: true } : n,
        );
      });
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

    if (currentUser?.role === UserRole.PMC_HEAD) {
      const moduleKey = (notification.moduleName || "").trim().toLowerCase();
      if (moduleKey === "site photos") {
        setActiveTab("site_photos");
        const sitePhotosPath = TAB_PATHS.site_photos;
        if (sitePhotosPath && getAppRoutePath() !== sitePhotosPath) {
          syncAppRoutePath(sitePhotosPath, "push");
        }
        return;
      }

      const nav = resolveAlertNavigation(notification);
      if (nav?.tab && isTabAllowedForRole(nav.tab, UserRole.PMC_HEAD, currentUser.username)) {
        setActiveTab(nav.tab);
        const navPath = TAB_PATHS[nav.tab];
        if (navPath && getAppRoutePath() !== navPath) {
          syncAppRoutePath(navPath, "push");
        }
        return;
      }

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
      setFinancialReturnTab(nav.returnTab ?? null);
      if (projectId) setFinancialInitialProjectId(projectId);
    } else {
      setFinancialSectionLocked(false);
      setFinancialReturnTab(null);
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
      void fetchAlerts({ silent: true });
    }
  };

  useEffect(() => {
    if (activeTab !== 'team_projects') {
      setTeamLeaderProjectsView('overview');
      setTeamLeaderScrollSection(null);
    }
  }, [activeTab]);

  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      return;
    }
    void fetchAlerts();
  }, [currentUser?.id, fetchAlerts]);

  useEffect(() => {
    if (!currentUser || activeTab !== 'alerts') return;
    void fetchAlerts({ silent: true });
  }, [activeTab, currentUser?.id, fetchAlerts]);

  useEffect(() => {
    if (!currentUser || activeTab !== 'alerts') return;
    const intervalId = window.setInterval(() => {
      void fetchAlerts({ silent: true });
    }, 60_000);
    return () => window.clearInterval(intervalId);
  }, [activeTab, currentUser?.id, fetchAlerts]);

  useEffect(() => {
    if (!currentUser) return;
    const refreshIfOnAlerts = () => {
      if (document.visibilityState !== 'visible') return;
      if (activeTab !== 'alerts') return;
      void fetchAlerts({ silent: true });
    };
    window.addEventListener('focus', refreshIfOnAlerts);
    document.addEventListener('visibilitychange', refreshIfOnAlerts);
    return () => {
      window.removeEventListener('focus', refreshIfOnAlerts);
      document.removeEventListener('visibilitychange', refreshIfOnAlerts);
    };
  }, [activeTab, currentUser?.id, fetchAlerts]);

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
      const newProject: Project = {
        id: savedProject.id.toString(),
        title: savedProject.name,
        client: savedProject.client_name,
        location: savedProject.location,
        budget: Number(savedProject.budget),
        description: savedProject.description,
        status: ProjectStatus.IN_PROGRESS, // Default status for UI
        workflowStatus: "SUBMITTED",
        lastUpdated: new Date().toISOString(),
        tasks: [],
        documents: [], // Handle docs separately if needed
        sites: [],
        auditLogs: [{
          id: `a-${Date.now()}`,
          action: "Project Initiated",
          performedBy: (savedProject.created_by?.toString?.() || savedProject.created_by || currentUser?.id || "sys"),
          timestamp: savedProject.created_at || new Date().toISOString(),
          details: savedProject.created_by_name ? `Created by ${savedProject.created_by_name}` : "Created and stored in backend"
        }],
        ...projectData // Keep other frontend-only fields
      } as Project;

      // Add to local state for immediate UI update
      setProjects(prev => [newProject, ...prev]);
      setIsCreateModalOpen(false);

      // Refresh data from backend to ensure consistency and make it available to other dashboards
      await fetchData();

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
        } else if (currentUser?.role === UserRole.COORDINATOR) {
          await dprApi.approveCoordinator(id);
        } else if (currentUser?.role === UserRole.PMC_HEAD) {
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
              else if (currentUser?.role === UserRole.COORDINATOR) nextStatus = "PENDING_PMC_HEAD";
              else if (currentUser?.role === UserRole.PMC_HEAD) nextStatus = "APPROVED";
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

      // Refresh data if in new system to update the list
      if (activeTab === "dpr_records") {
        fetchData();
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

      // Refresh data if in new system to update the list
      if (activeTab === "dpr_records") {
        fetchData();
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
    setFinancialReturnTab(null);
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
    return (
      <div className="min-h-screen w-full relative font-['Inter'] selection:bg-indigo-500 selection:text-white overflow-hidden">

        {/* Background */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url(/images/construction-bg.jpg)",
          }}
        />

        {/* Overlay */}
        <div className="absolute inset-0 bg-slate-900/60" />

        {/* Center Container */}
        <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-6 sm:px-6 lg:px-8">

          {/* Login Card */}
          <div
            className="
            w-full
            max-w-sm
            sm:max-w-md
            lg:max-w-xl
            rounded-3xl
            border border-white/10
            bg-white/5
            backdrop-blur-xl
            shadow-2xl
            p-6
            sm:p-8
            md:p-10
            lg:p-12
            animate-in
            zoom-in-95
            duration-500
          "
          >
            {/* Logo */}
            <div className="flex justify-center mb-6 sm:mb-8">
              <img
                src="/images/Shrikhande-logo-bgremove.png"
                alt="Shrikhande"
                className="
                h-12
                sm:h-14
                md:h-16
                lg:h-20
                w-auto
                object-contain
              "
              />
            </div>

            {/* Heading */}
            <div className="text-center mb-6 sm:mb-8">
              <h2
                className="
                text-2xl
                sm:text-3xl
                md:text-4xl
                font-semibold
                text-white
                mb-2
              "
              >
                Welcome Back
              </h2>

              <p className="text-white/60 text-xs sm:text-sm">
                Please enter your username and password
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">

              {/* Error */}
              {loginError && (
                <div className="p-3 sm:p-4 bg-red-500/10 text-red-300 text-sm rounded-xl border border-red-500/30">
                  {loginError}
                </div>
              )}

              {/* Username */}
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoginSubmitting}
                  placeholder="Username"
                  className="
                  w-full
                  h-12
                  sm:h-14
                  pl-11
                  pr-4
                  rounded-2xl
                  bg-white/5
                  border border-white/10
                  text-white
                  text-sm
                  font-medium
                  placeholder-white/40
                  outline-none
                  focus:ring-2
                  focus:ring-white/20
                  transition-all
                  disabled:opacity-60
                "
                />

                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">
                  <Icons.User size={18} />
                </div>
              </div>

              {/* Password */}
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoginSubmitting}
                  placeholder="Password"
                  className="
                  w-full
                  h-12
                  sm:h-14
                  pl-11
                  pr-12
                  rounded-2xl
                  bg-white/5
                  border border-white/10
                  text-white
                  text-sm
                  font-medium
                  placeholder-white/40
                  outline-none
                  focus:ring-2
                  focus:ring-white/20
                  transition-all
                  disabled:opacity-60
                "
                />

                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">
                  <Icons.Lock size={18} />
                </div>

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoginSubmitting}
                  className="
                  absolute
                  right-4
                  top-1/2
                  -translate-y-1/2
                  text-white/40
                  hover:text-white/70
                  transition-colors
                "
                >
                  {showPassword ? (
                    <Icons.EyeOff size={18} />
                  ) : (
                    <Icons.Eye size={18} />
                  )}
                </button>
              </div>

              {/* Footer */}
              <div className="pt-2 flex flex-col gap-4">

                <p className="text-[11px] sm:text-xs text-white/60 text-center leading-relaxed">
                  By login, you agree to our{" "}
                  <button
                    type="button"
                    onClick={() => setShowTCModal(true)}
                    disabled={isLoginSubmitting}
                    className="underline hover:text-white"
                  >
                    Terms & Conditions
                  </button>
                </p>

                <button
                  type="submit"
                  disabled={isLoginSubmitting}
                  className="
                  w-full
                  h-12
                  sm:h-14
                  rounded-xl
                  font-semibold
                  text-white
                  bg-gradient-to-r
                  from-orange-500
                  to-amber-500
                  hover:from-orange-600
                  hover:to-amber-600
                  shadow-lg
                  shadow-orange-500/25
                  transition-all
                  flex
                  items-center
                  justify-center
                  gap-2
                  disabled:opacity-70
                "
                >
                  {isLoginSubmitting ? (
                    <>
                      <Icons.History
                        size={16}
                        className="animate-spin"
                      />
                      Logging in...
                    </>
                  ) : (
                    <>
                      Login
                      <Icons.ArrowRight
                        size={16}
                        strokeWidth={2.5}
                      />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {showTCModal && (
          <TermsAndConditions
            onClose={() => setShowTCModal(false)}
          />
        )}
      </div>
    );
  }

  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const themeClasses = getThemeClasses(isDarkTheme);

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
        setActiveTab={(tab) => {
          const nextTab = isTabAllowedForRole(tab, currentUser.role, currentUser.username)
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
          setFinancialReturnTab(null);
          setSelectedProjectId(null);
          setProjectFilter("all");
        }}
        notifications={notifications}
        onMarkRead={handleMarkRead}
        onNavigateToAlerts={() => {
          setActiveTab("alerts");
          const targetPath = TAB_PATHS.alerts;
          if (targetPath && getAppRoutePath() !== targetPath) {
            syncAppRoutePath(targetPath, "push");
          }
        }}
        onNotificationClick={handleAlertNavigation}
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
          currentUser.role === UserRole.PMC_HEAD ? (
            <PMCHead360Dashboard
              user={currentUser}
              projects={projects}
              dprs={dprs}
              onViewProject={(id) => {
                setSelectedProjectId(id);
                setActiveTab("team_projects");
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
                setActiveTab("projects");
              }}
              onReviewProjects={() => {
                setSelectedProjectId(null);
                setActiveTab("projects");
                setProjectFilter("attention");
              }}
              onStatClick={handleStatClick}
              onSubmitDPR={handleSubmitDPR}
            />
          )
        ) : activeTab === "site_engineer_dashboard" ? (
          <SiteEngineerDashboard
            user={currentUser}
            projects={projects}
            onNavigate={setActiveTab}
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
              setFinancialReturnTab("my_scopes");
              if (projectId) {
                setFinancialInitialProjectId(projectId);
              }
              setActiveTab("financial_management");
              const targetPath = TAB_PATHS.financial_management;
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
              setActiveTab("projects");
            }}
          />
        ) : activeTab === "team_projects" ? (
          <Projects
            projects={projects}
            currentUser={currentUser}
            selectedProjectId={selectedProjectId}
            onViewProject={(id) => {
              setSelectedProjectId(id);
            }}
            onNavigate={(navData) => {
              if (typeof navData === 'object' && navData.tab && navData.section) {
                setFinancialSection(normalizeFinancialSubTab(navData.section));
                setFinancialSectionLocked(true);
                setFinancialReturnTab(navData.returnTab ?? null);
                setActiveTab(navData.tab);
                const targetPath = TAB_PATHS[navData.tab];
                if (targetPath && getAppRoutePath() !== targetPath) {
                  syncAppRoutePath(targetPath, "push");
                }
              } else if (typeof navData === 'string') {
                setFinancialSectionLocked(false);
                setFinancialReturnTab(null);
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
            {/* Page header */}
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className={`text-xl font-black uppercase tracking-tight sm:text-2xl ${themeClasses.textPrimary}`}>
                  Enterprise Portfolio
                </h2>
                <p className={`text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                  Live Project Registry
                </p>
              </div>
              <div className="flex shrink-0 gap-3">
                {currentUser.role === UserRole.PMC_HEAD && (
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
                <table className="w-full min-w-[460px] border-collapse text-left">
                  <thead>
                    <tr className={`border-b ${themeClasses.bgSecondary} ${themeClasses.border}`}>
                      <th className={`px-4 py-4 text-[10px] font-black uppercase tracking-widest sm:px-8 sm:py-5 ${themeClasses.textSecondary}`}>
                        Resource Code
                      </th>
                      <th className={`px-4 py-4 text-[10px] font-black uppercase tracking-widest sm:px-8 sm:py-5 ${themeClasses.textSecondary}`}>
                        Workflow Status
                      </th>
                      <th className={`hidden px-4 py-4 text-[10px] font-black uppercase tracking-widest sm:table-cell sm:px-8 sm:py-5 ${themeClasses.textSecondary}`}>
                        Assigned Lead
                      </th>
                      <th className="px-4 py-4 text-right sm:px-8 sm:py-5" />
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${themeClasses.border}`}>
                    {projects.map((p) => (
                      <tr
                        key={p.id}
                        className={`group cursor-pointer transition-all ${themeClasses.bgHover}`}
                        onClick={() => setSelectedProjectId(p.id)}
                      >
                        <td className="px-4 py-4 sm:px-8 sm:py-6">
                          <p className={`text-sm font-black tracking-tight transition-colors sm:text-base ${themeClasses.textPrimary}`}>
                            {p.title}
                          </p>
                          <p className={`text-[10px] font-black uppercase tracking-tighter ${themeClasses.textSecondary}`}>
                            {p.client}
                          </p>
                          {/* Show lead inline on mobile */}
                          <p className={`mt-1 text-[10px] font-bold sm:hidden ${themeClasses.textSecondary}`}>
                            {(p as any).team_lead_name || "Awaiting Assignment"}
                          </p>
                        </td>
                        <td className="px-4 py-4 sm:px-8 sm:py-6">
                          <span className={`inline-block rounded-xl border px-2.5 py-1 text-[10px] font-black uppercase sm:px-3 sm:py-1.5 ${STATUS_COLORS[p.status]}`}>
                            {p.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className={`hidden px-4 py-4 text-xs font-black sm:table-cell sm:px-8 sm:py-6 ${themeClasses.textPrimary}`}>
                          {(p as any).team_lead_name || "Awaiting Assignment"}
                        </td>
                        <td className="px-4 py-4 text-right sm:px-8 sm:py-6">
                          <div className={`inline-block rounded-xl p-1.5 transition-all sm:p-2 ${themeClasses.bgHover} ${themeClasses.textPrimary}`}>
                            <Icons.ChevronRight size={16} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
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
            returnTab={financialReturnTab}
            variant={currentUser.role === UserRole.BILLING_SITE_ENGINEER ? 'billing' : 'default'}
            onReturnToProject={
              financialReturnTab
                ? () => {
                  setActiveTab(financialReturnTab);
                  setFinancialSectionLocked(false);
                  setFinancialReturnTab(null);
                  setFinancialInitialProjectId(null);
                  const targetPath = TAB_PATHS[financialReturnTab];
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
            variant={currentUser.role === UserRole.PMC_HEAD ? 'executive' : 'default'}
            pendingUpdates={currentUser.role === UserRole.PMC_HEAD ? pendingUpdates : null}
            pendingLoading={currentUser.role === UserRole.PMC_HEAD ? pendingLoading : false}
            onRefresh={() => void fetchAlerts({ silent: true })}
            onMarkRead={handleMarkRead}
            onNavigate={handleAlertNavigation}
          />
        ) : activeTab === "meeting_documents" ? (
          <MeetingDocumentsPage projects={projects} />
        ) : activeTab === "wpr_records" ? (
          <WPRReviewDashboard
            projects={projects}
            currentUser={currentUser}
            selectedProjectId={selectedProjectId}
          />
        ) : activeTab === "project_init" ? (
          <ProjectInit
            user={currentUser}
            onProjectCreated={() => {
              fetchData();
            }}
          />
        ) : (
          <div className="text-center py-20 uppercase font-black tracking-widest text-slate-300">
            Workspace Provisioning...
          </div>
        )}
        <NotificationAlertToastStack toasts={alertToasts} />
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
