import React, { useState, useEffect, createContext } from "react";
import Layout from "./components/Layout";

import { ThemeContext, getThemeClasses } from "./utils/theme";
import Dashboard, { StatType } from "./components/Dashboard";
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
import { authApi, projectApi, operationsApi, dprApi, notificationApi } from "./services/api";
import { websocketService, NotificationData } from "./services/websocket";
import { API_CONFIG } from "./config/apiConfig";

// Utility for Indian Currency Formatting
export const formatINR = (amount: number) => {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
  return `₹${amount.toLocaleString("en-IN")}`;
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const isInitialLoad = React.useRef(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [dprs, setDprs] = useState<DPR[]>([]);
  const [projectDocuments, setProjectDocuments] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null
  );
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [projectFilter, setProjectFilter] = useState<"all" | "attention">(
    "all"
  );

  // Modal States
  const [showTCModal, setShowTCModal] = useState(false);

  // Login Form States
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState(""); // Added username for login
  const [password, setPassword] = useState(""); // Updated default password
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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

  const TAB_PATHS: Record<string, string> = {
    dashboard: "/dashboard",
    site_engineer_dashboard: "/site-dashboard",
    team_projects: "/team-projects",
    project_init: "/project-init",
    execution: "/execution",
    projects: "/projects",
    dpr_records: "/dpr-records",
    wpr_records: "/wpr-records",
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [projectsRes, dprsRes] = await Promise.all([
        projectApi.getProjects(),
        dprApi.getDPRs() // Fetch from DPR API instead
      ]);

      // Handle both array response and paginated response
      const projectsData = Array.isArray(projectsRes.data) ? projectsRes.data : (projectsRes.data.results || projectsRes.data);

      console.log('Fetched projects:', projectsData.length, 'projects');

      // Transform backend projects to frontend format
      const backendProjects = projectsData.map((p: any) => {
        const createdById = p.created_by ? p.created_by.toString() : '';
        const createdByName = p.created_by_name || '';
        const createdAt = p.created_at || new Date().toISOString();
        const initialAudit = createdById
          ? [{
            id: `init-${p.id}`,
            action: "Project Initiated",
            performedBy: createdById,
            timestamp: createdAt,
            details: createdByName ? `Created by ${createdByName}` : "Created"
          }]
          : [];
        return ({
          id: p.id.toString(),
          title: p.name || '',
          client: p.client_name || '',
          location: p.location || '',
          budget: Number(p.budget) || 0,
          description: p.description || '',
          status: p.status === 'planning' ? ProjectStatus.IN_PROGRESS :
            p.status === 'active' ? ProjectStatus.IN_PROGRESS :
              p.status === 'completed' ? ProjectStatus.APPROVED :
                p.status === 'on_hold' ? ProjectStatus.REJECTED :
                  ProjectStatus.CREATED,
          workflowStatus: "SUBMITTED",
          lastUpdated: p.updated_at || new Date().toISOString(),
          createdAt: createdAt,
          updatedAt: p.updated_at || new Date().toISOString(),
          pmcHeadId: p.pmc_head?.toString() || '',
          teamLeadId: p.team_lead?.toString() || '',
          siteEngineerIds: (p.site_engineers || []).map((id: any) => id.toString()),
          billingEngineerId: p.billing_site_engineer?.toString() || '',
          qaqcEngineerId: p.qaqc_site_engineer?.toString() || '',
          coordinatorIds: (p.coordinators || []).map((id: any) => id.toString()),
          tasks: [],
          documents: [],
          sites: p.sites || [],
          activities: [],
          auditLogs: initialAudit,
          commencementDate: p.commencement_date || '',
          duration: p.duration || '',
          salientFeatures: p.salient_features || '',
          siteStaffDetails: p.site_staff_details || '',
          hasDocumentation: p.has_documentation || false,
          documentationFileUrl: p.documentation_file_url || null,
          hasISOChecklist: p.has_iso_checklist || false,
          hasTestFrequencyChart: p.has_test_frequency_chart || false,
          // Dashboard data
          plannedValue: p.planned_value || 0,
          earnedValue: p.earned_value || 0,
          actualCost: p.actual_cost || 0,
          grossBilled: p.gross_billed || 0,
          netBilled: p.net_billed || 0,
          netCollected: p.net_collected || 0,
          netDue: p.net_due || 0,
          totalManhours: p.total_manhours || 0,
          fatalities: p.fatalities || 0,
          significant: p.significant || 0,
          major: p.major || 0,
          minor: p.minor || 0,
          nearMiss: p.near_miss || 0,
        });
      });

      // Transform backend DPRs to frontend format
      // Handle both array response and paginated response
      const dprsData = Array.isArray(dprsRes.data) ? dprsRes.data : (dprsRes.data.results || dprsRes.data);

      // First set projects so we can use them for mapping
      setProjects(backendProjects);

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

      setProjects(backendProjects);
      setDprs(backendDPRs);

      // Fetch project documents for vault
      try {
        const docsRes = await projectApi.getProjectDocuments();
        setProjectDocuments(docsRes.data);
      } catch (docError) {
        console.error("Failed to fetch project documents:", docError);
      }
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
    const checkAuth = async () => {
      try {
        const response = await authApi.getUserProfile();
        const userData = response.data;

        // Map backend groups to frontend roles
        // Check both groups array and primary_role field
        const userGroups = userData.groups || [];
        const primaryRole = userData.primary_role || '';

        let role = UserRole.SITE_ENGINEER;
        if (userGroups.includes('PMC Head') || userGroups.includes('CEO') || primaryRole === 'PMC Head') role = UserRole.PMC_HEAD;
        else if (userGroups.includes('Team Leader') || primaryRole === 'Team Leader') role = UserRole.TEAM_LEAD;
        else if (userGroups.includes('Coordinator') || primaryRole === 'Coordinator') role = UserRole.COORDINATOR;
        else if (userGroups.includes('Site Engineer') || primaryRole === 'Site Engineer') role = UserRole.SITE_ENGINEER;

        setCurrentUser({
          id: userData.id.toString(),
          name: `${userData.first_name} ${userData.last_name}`.trim() || userData.username,
          email: userData.email,
          role: role
        });

        // Fetch real data after successful auth
        fetchData();
      } catch (error: any) {
        console.error("Auth check failed", error);
        // If 401, user is not authenticated, stay on login page
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    const pathname = window.location.pathname.toLowerCase();
    const pathToTab: Record<string, string> = {
      "/dashboard": "dashboard",
      "/site-dashboard": "site_engineer_dashboard",
      "/team-projects": "team_projects",
      "/project-init": "project_init",
      "/execution": "execution",
      "/projects": "projects",
      "/dpr-records": "dpr_records",
      "/dpr": "dpr_records",
      "/dpr_records": "dpr_records",
      "/wpr-records": "wpr_records",
      "/wpr": "wpr_records",
      "/wpr_records": "wpr_records",
    };

    const mappedTab = pathToTab[pathname];
    if (mappedTab) setActiveTab(mappedTab);
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const pathname = window.location.pathname.toLowerCase();
      if (pathname === "/dpr-records" || pathname === "/dpr" || pathname === "/dpr_records") {
        setActiveTab("dpr_records");
      } else if (pathname === "/wpr-records" || pathname === "/wpr" || pathname === "/wpr_records") {
        setActiveTab("wpr_records");
      } else if (pathname === "/projects") {
        setActiveTab("projects");
      } else if (pathname === "/execution") {
        setActiveTab("execution");
      } else if (pathname === "/team-projects") {
        setActiveTab("team_projects");
      } else if (pathname === "/site-dashboard") {
        setActiveTab("site_engineer_dashboard");
      } else if (pathname === "/project-init") {
        setActiveTab("project_init");
      } else if (pathname === "/dashboard") {
        setActiveTab("dashboard");
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const targetPath = TAB_PATHS[activeTab];
    if (!targetPath) return;
    if (window.location.pathname !== targetPath) {
      window.history.replaceState({}, "", targetPath);
    }
  }, [activeTab, currentUser]);

  // Team Lead: redirect to team_projects tab when on dashboard
  // Coordinator and PMC Head: redirect to projects tab to see portfolio (only on initial load)
  useEffect(() => {
    if (!isInitialLoad.current) return;

    if (activeTab === "dashboard" && currentUser) {
      isInitialLoad.current = false;
      if (currentUser.role === UserRole.TEAM_LEAD) {
        setActiveTab("team_projects");
      } else if (currentUser.role === UserRole.PMC_HEAD || currentUser.role === UserRole.COORDINATOR) {
        setActiveTab("projects");
      }
    }
  }, [currentUser?.role, activeTab]);

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

  const handleMarkRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

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

  const logout = () => {
    websocketService.disconnect();
    localStorage.removeItem('basicAuth');
    setCurrentUser(null);
    setSelectedProjectId(null);
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
      const title = data.title || "Notification";
      const message = data.message || "You have a new update.";
      const type = mapNotificationType(data.type);
      const projectId = data?.data?.project_id?.toString?.() || data?.project_id?.toString?.();
      const timestamp = data.timestamp
        ? new Date(data.timestamp).toLocaleString("en-IN")
        : new Date().toLocaleString("en-IN");

      const wsNotification: AppNotification = {
        id: `ws-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        userId: currentUser.id,
        projectId,
        title,
        message,
        type,
        timestamp,
        isRead: false,
        senderName: "System",
      };

      setNotifications((prev) => [wsNotification, ...prev]);
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
    try {
      const response = await authApi.login({ username, password });
      const userData = response.data;

      // Store Basic Auth for future requests
      const auth = btoa(`${username}:${password}`);
      localStorage.setItem('basicAuth', auth);

      // Map backend groups to frontend roles
      // Check both groups array and primary_role field
      const userGroups = userData.groups || [];
      const primaryRole = userData.primary_role || '';

      let role = UserRole.SITE_ENGINEER;
      if (userGroups.includes('PMC Head') || userGroups.includes('CEO') || primaryRole === 'PMC Head') role = UserRole.PMC_HEAD;
      else if (userGroups.includes('Team Leader') || primaryRole === 'Team Leader') role = UserRole.TEAM_LEAD;
      else if (userGroups.includes('Coordinator') || primaryRole === 'Coordinator') role = UserRole.COORDINATOR;
      else if (userGroups.includes('Site Engineer') || primaryRole === 'Site Engineer') role = UserRole.SITE_ENGINEER;

      setCurrentUser({
        id: userData.id.toString(),
        name: `${userData.first_name} ${userData.last_name}`.trim() || userData.username,
        email: userData.email,
        role: role
      });

      // Fetch real data after login
      fetchData();
    } catch (error: any) {
      console.error("Login failed", error);
      setLoginError(error.response?.data?.detail || "Invalid username or password");
    }
  };

  if (!currentUser) {
    const loginUser = currentUser as User | null;
    return (
      <div className="min-h-screen w-full relative font-['Inter'] selection:bg-indigo-500 selection:text-white animate-fade-in flex items-center justify-center">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url(/images/construction-bg.jpg)" }} />
        <div className="absolute inset-0 bg-slate-900/50" />
        <div className="relative z-10 flex items-center justify-center p-4 w-full">
          <div className="w-full max-w-[520px] rounded-3xl p-10 md:p-12 shadow-2xl animate-in zoom-in-95 duration-500 border border-white/10 bg-white/5 backdrop-blur-xl text-contrast text-center md:text-left">
            <div className="flex justify-center mb-6">
              <img
                src="/images/Shrikhande-logo-bgremove.png"
                alt="Shrikhande"
                className="h-16 md:h-20 w-auto object-contain"
              />
            </div>
            <div className="mb-8">
              <h2 className="text-4xl font-semibold mb-2 text-contrast">Welcome Back</h2>
              <p className="text-white/60 text-sm">
                Please enter your username and password
              </p>
            </div>
            <form onSubmit={handleLogin} className="space-y-6">
              {loginError && (
                <div className="p-4 bg-red-500/10 text-red-300 text-sm rounded-xl border border-red-500/30">
                  {loginError}
                </div>
              )}
              <div className="space-y-2">
                <div className="relative">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-12 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-semibold text-contrast placeholder-white/40 outline-none focus:ring-2 focus:ring-white/20 transition-all"
                    placeholder="Username"
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">
                    <Icons.User size={18} />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-12 pr-12 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-semibold text-contrast placeholder-white/40 outline-none focus:ring-2 focus:ring-white/20 transition-all"
                    placeholder="Password"
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">
                    <Icons.Lock size={18} />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors"
                  >
                    {showPassword ? (
                      <Icons.EyeOff size={18} />
                    ) : (
                      <Icons.Eye size={18} />
                    )}
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between py-2">
                <p className="text-[11px] text-white/60 font-medium leading-relaxed max-w-[260px] text-center sm:text-left">
                  By login, you agree to our{" "}
                  <button
                    type="button"
                    onClick={() => setShowTCModal(true)}
                    className="underline hover:text-contrast"
                  >
                    Terms & Conditions
                  </button>
                </p>
                <button
                  type="submit"
                  className="shrink-0 w-full sm:w-auto min-w-[140px] px-8 py-3 text-sm font-bold bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl shadow-lg shadow-orange-500/25 inline-flex items-center justify-center gap-2 transition-all"
                >
                  Login
                  <Icons.ArrowRight size={16} strokeWidth={2.5} />
                </button>
              </div>
            </form>
          </div>
        </div>
        {showTCModal && (
          <TermsAndConditions onClose={() => setShowTCModal(false)} />
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
        setActiveTab={(tab) => {
          setActiveTab(tab);
          const targetPath = TAB_PATHS[tab];
          if (targetPath && window.location.pathname !== targetPath) {
            window.history.pushState({}, "", targetPath);
          }
          setSelectedProjectId(null);
          setProjectFilter("all");
        }}
        notifications={notifications}
        onMarkRead={handleMarkRead}
      >
      {selectedProject ? (
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
      ) : activeTab === "site_engineer_dashboard" ? (
        <SiteEngineerDashboard user={currentUser} />
      ) : activeTab === "execution" ? (
        <SiteExecution
          projects={projects}
          onViewProject={(id) => {
            setSelectedProjectId(id);
            setActiveTab("projects");
          }}
        />
      ) : activeTab === "team_projects" ? (
        <Projects
          projects={projects}
          currentUser={currentUser}
          onViewProject={(id) => {
            setSelectedProjectId(id);
            setActiveTab("projects");
          }}
          onNavigate={(tab) => setActiveTab(tab)}
        />
      ) : activeTab === "projects" ? (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="flex items-center justify-between">
            <div>
              <h2 className={`text-2xl font-black uppercase tracking-tight ${themeClasses.textPrimary}`}>
                Enterprise Portfolio
              </h2>
              <p className={`text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                Live Project Registry
              </p>
            </div>
            <div className="flex gap-3">
              {currentUser.role === UserRole.PMC_HEAD && (
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className={`flex items-center gap-2 px-6 py-2.5 border rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${themeClasses.buttonSecondary} ${themeClasses.border}`}
                >
                  <Icons.Add size={16} />
                  Initiate Project
                </button>
              )}
            </div>
          </div>
          <div className={`rounded-[2rem] overflow-hidden border ${themeClasses.glassCard} ${themeClasses.border}`}>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={`border-b ${themeClasses.bgSecondary} ${themeClasses.border}`}>
                  <th className={`px-8 py-5 text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                    Resource Code
                  </th>
                  <th className={`px-8 py-5 text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                    Workflow Status
                  </th>
                  <th className={`px-8 py-5 text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                    Assigned Lead
                  </th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-right"></th>
                </tr>
              </thead>
              <tbody className={`divide-y ${themeClasses.border}`}>
                {projects.map((p) => (
                  <tr
                    key={p.id}
                    className={`transition-all group cursor-pointer ${themeClasses.bgHover}`}
                    onClick={() => setSelectedProjectId(p.id)}
                  >
                    <td className="px-8 py-6">
                      <p className={`font-black transition-colors text-base tracking-tight ${themeClasses.textPrimary}`}>
                        {p.title}
                      </p>
                      <p className={`text-[10px] font-black uppercase tracking-tighter ${themeClasses.textSecondary}`}>
                        {p.client}
                      </p>
                    </td>
                    <td className="px-8 py-6">
                      <span
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border ${STATUS_COLORS[p.status]
                          }`}
                      >
                        {p.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className={`px-8 py-6 text-xs font-black ${themeClasses.textPrimary}`}>
                      {(p as any).team_lead_name || "Awaiting Assignment"}
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className={`p-2 rounded-xl transition-all inline-block ${themeClasses.bgHover} ${themeClasses.textPrimary}`}>
                        <Icons.ChevronRight size={18} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
      ) : activeTab === "wpr_records" ? (
        <WPRReviewDashboard projects={projects} />
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
