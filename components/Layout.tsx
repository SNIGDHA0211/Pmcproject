
import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';
import { User, UserRole, AppNotification } from '../types';
import { ROLE_LABELS } from '../constants';
import { useTheme, getThemeClasses } from '../utils/theme';

interface LayoutProps {
  children: React.ReactNode;
  user: User;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  notifications: AppNotification[];
  onMarkRead: (id: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, user, onLogout, activeTab, setActiveTab, notifications, onMarkRead }) => {
  const { isDarkTheme, setIsDarkTheme } = useTheme();

  useEffect(() => {
    // Update HTML background for a seamless theme experience
    const html = document.documentElement;
    if (isDarkTheme) {
      html.style.backgroundColor = '#0b1d36';
    } else {
      html.style.backgroundColor = '#f8fafc'; // Matches blue-50
    }
  }, [isDarkTheme]);
  const themeClasses = getThemeClasses(isDarkTheme);
  const [showNotifications, setShowNotifications] = useState(false);
  const [sidebarOverlayOpen, setSidebarOverlayOpen] = useState(false);

  const userNotifications = notifications
    .filter(n => n.userId === user.id)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const unreadCount = userNotifications.filter(n => !n.isRead).length;

  const navigation = [
    { id: 'dashboard', label: 'Overview', icon: Icons.Dashboard, roles: [UserRole.PMC_HEAD, UserRole.SITE_ENGINEER, UserRole.COORDINATOR] },
    { id: 'site_engineer_dashboard', label: 'Site Dashboard', icon: Icons.Building2, roles: [UserRole.SITE_ENGINEER] },
    { id: 'team_projects', label: 'Projects', icon: Icons.Building, roles: [UserRole.TEAM_LEAD, UserRole.PMC_HEAD, UserRole.COORDINATOR] },
    { id: 'project_init', label: 'Initialize Project', icon: Icons.Add, roles: [UserRole.PMC_HEAD] },
    { id: 'commercials', label: 'Commercials', icon: Icons.Finance, roles: [UserRole.TEAM_LEAD, UserRole.PMC_HEAD] },
    { id: 'execution', label: 'Site Progress', icon: Icons.Execution, roles: [UserRole.TEAM_LEAD, UserRole.PMC_HEAD] },
    { id: 'hse', label: 'HSE (Safety)', icon: Icons.Safety, roles: [UserRole.TEAM_LEAD, UserRole.PMC_HEAD, UserRole.SITE_ENGINEER] },
    { id: 'projects', label: 'Portfolio', icon: Icons.Project, roles: [UserRole.PMC_HEAD, UserRole.TEAM_LEAD, UserRole.SITE_ENGINEER, UserRole.COORDINATOR] },
    { id: 'dpr_records', label: 'DPR Review', icon: Icons.Task, roles: [UserRole.PMC_HEAD, UserRole.TEAM_LEAD, UserRole.SITE_ENGINEER, UserRole.COORDINATOR] },
    { id: 'wpr_records', label: 'WPR Review', icon: Icons.Calendar, roles: [UserRole.PMC_HEAD, UserRole.TEAM_LEAD, UserRole.SITE_ENGINEER, UserRole.COORDINATOR] },
    { id: 'documents', label: 'Vault', icon: Icons.Document, roles: [UserRole.PMC_HEAD, UserRole.TEAM_LEAD, UserRole.COORDINATOR] },
  ];

  // Hide sidebar when viewing Projects dashboard (team_projects)
  const hideSidebar = activeTab === 'team_projects';
  const showSidebar = !hideSidebar || sidebarOverlayOpen;

  return (
    <div className={`relative h-screen overflow-hidden ${isDarkTheme ? 'bg-slate-900' : 'bg-gradient-to-br from-blue-50 to-indigo-100'}`}>
      {isDarkTheme && (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{
            backgroundImage: "url(/images/construction-bg.jpg)",
            backgroundColor: 'rgb(15 23 42)' // Fallback background
          }}
        />
      )}
      <div className={`flex h-full overflow-hidden relative z-10 animate-fade-in ${isDarkTheme ? 'text-white' : 'text-gray-900'}`}>
        {showSidebar && (
          <>
            {sidebarOverlayOpen && hideSidebar && (
              <div
                className="fixed inset-0 bg-black/50 z-40 md:z-40"
                onClick={() => setSidebarOverlayOpen(false)}
                aria-hidden="true"
              />
            )}
            <aside className={`w-64 flex flex-col flex-shrink-0 h-full animate-slide-in-left ${hideSidebar && sidebarOverlayOpen ? 'fixed left-0 top-0 z-50 shadow-2xl flex' : 'hidden md:flex'} ${isDarkTheme ? 'nav-dark' : 'nav-light'}`}>
              <div className={`p-6 border-b ${themeClasses.border}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <img
                      src="/images/Shrikhande-logo-bgremove.png"
                      alt="Shrikhande"
                      className="h-8 w-auto max-w-[140px] object-contain object-left"
                    />
                  </div>
                  {hideSidebar && sidebarOverlayOpen && (
                    <button type="button" onClick={() => setSidebarOverlayOpen(false)} className={`p-2 rounded-lg ${themeClasses.buttonSecondary}`} aria-label="Close sidebar">
                      <Icons.Close size={18} />
                    </button>
                  )}
                </div>
                <p className={`text-[10px] mt-1 uppercase font-black tracking-widest ${themeClasses.textSecondary}`}>Enterprise Command</p>
              </div>

              <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                {navigation.map((item, index) => {
                  if (!item.roles.includes(user.role)) return null;
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => { setActiveTab(item.id); setSidebarOverlayOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 opacity-0 animate-fade-in stagger-${Math.min(index + 1, 3)} ${isActive
                        ? (isDarkTheme ? 'active-pill' : 'active-pill-light')
                        : (isDarkTheme ? 'muted hover:bg-white/5 hover:text-contrast' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900')
                        }`}
                    >
                      <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                      <span className={`text-sm ${isActive ? 'font-black' : 'font-semibold'}`}>{item.label}</span>
                    </button>
                  );
                })}
              </nav>

              <div className={`p-4 mt-auto border-t ${themeClasses.border}`}>
                <div className={`flex items-center gap-3 px-2 py-3 rounded-2xl ${themeClasses.glassCard} ${themeClasses.border}`}>
                  <img src={user.avatar} className="w-10 h-10 rounded-xl object-cover" alt={user.name} />
                  <div className="flex-1 overflow-hidden">
                    <p className={`text-xs font-black truncate uppercase ${themeClasses.textPrimary}`}>{user.name}</p>
                    <p className={`text-[9px] truncate font-bold uppercase tracking-tighter ${themeClasses.textSecondary}`}>{ROLE_LABELS[user.role]}</p>
                  </div>
                  <button onClick={onLogout} className={`p-2 transition-colors ${isDarkTheme ? 'text-white/60 hover:text-rose-400' : 'text-gray-600 hover:text-rose-500'}`}>
                    <Icons.Logout size={16} />
                  </button>
                </div>
              </div>
            </aside>
          </>
        )}

        <main className={`flex-1 flex flex-col min-w-0 overflow-hidden ${hideSidebar ? 'w-full' : ''}`}>
          <header className={`h-16 flex items-center justify-between px-8 z-30 ${themeClasses.glassCard} ${themeClasses.border}`}>
            <div className="flex items-center gap-4 flex-1">
              {/* Sidebar toggle - when sidebar is hidden (e.g. Team Lead on Projects) */}
              {hideSidebar && (
                <button
                  type="button"
                  onClick={() => setSidebarOverlayOpen(true)}
                  className={`flex items-center gap-2 px-4 py-2 border rounded-xl text-xs font-bold transition-all mr-2 ${themeClasses.buttonSecondary} ${themeClasses.border}`}
                  title="Open menu"
                  aria-label="Open menu"
                >
                  <Icons.Sidebar size={18} />
                  Menu
                </button>
              )}
              {/* Back Button Bar - when sidebar hidden, for non–Team Lead (go to Overview) */}
              {hideSidebar && user.role !== UserRole.TEAM_LEAD && (
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`flex items-center gap-2 px-4 py-2 border rounded-xl text-xs font-bold transition-all mr-4 ${themeClasses.buttonSecondary} ${themeClasses.border}`}
                >
                  <Icons.ChevronRight size={16} className="rotate-180" />
                  Back
                </button>
              )}
              <h2 className={`text-sm font-black uppercase tracking-widest ${themeClasses.textPrimary}`}>MCS Terminal</h2>
              <div className="relative w-full max-w-md hidden md:block ml-8">
                <Icons.Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${themeClasses.textMuted}`} size={16} />
                <input
                  type="text"
                  placeholder="Search resources, projects, DPRs..."
                  className={`w-full pl-10 pr-4 py-2 rounded-xl text-xs font-bold outline-none focus:ring-4 transition-all ${themeClasses.input} ${themeClasses.border} ${themeClasses.textPrimary} ${themeClasses.placeholder} ${isDarkTheme ? 'focus:ring-white/10' : 'focus:ring-indigo-500/20'}`}
                />
              </div>
            </div>

            <div className="flex items-center gap-4 relative">
              <button
                onClick={() => setIsDarkTheme(!isDarkTheme)}
                className={`p-2 rounded-xl transition-colors ${themeClasses.buttonSecondary}`}
                title={isDarkTheme ? "Switch to light theme" : "Switch to dark theme"}
              >
                {isDarkTheme ? (
                  <Icons.Sun size={20} />
                ) : (
                  <Icons.Moon size={20} />
                )}
              </button>

              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className={`p-2 rounded-xl relative group transition-colors ${themeClasses.buttonSecondary}`}
              >
                <Icons.Notification size={20} />
                {unreadCount > 0 && (
                  <span className={`absolute top-1 right-1 w-4 h-4 bg-rose-500 rounded-full border-2 flex items-center justify-center text-[8px] text-white font-black ${
                    isDarkTheme ? 'border-slate-900' : 'border-white'
                  }`}>
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div className={`absolute top-full right-0 mt-2 w-80 rounded-2xl z-50 animate-in fade-in slide-in-from-top-2 ${
                  isDarkTheme ? 'glass-card' : 'bg-white border border-gray-200 shadow-lg'
                }`}>
                  <div className={`p-4 border-b flex items-center justify-between ${
                    isDarkTheme ? 'border-white/10' : 'border-gray-200'
                  }`}>
                    <h3 className={`text-[10px] font-black uppercase tracking-widest ${
                      isDarkTheme ? 'muted' : 'text-gray-600'
                    }`}>Notifications</h3>
                    {unreadCount > 0 && <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase ${
                      isDarkTheme ? 'bg-white/10 text-contrast' : 'bg-indigo-100 text-indigo-800'
                    }`}>Unread</span>}
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {userNotifications.length > 0 ? (
                      userNotifications.map(n => (
                        <div
                          key={n.id}
                          onClick={() => { onMarkRead(n.id); setShowNotifications(false); if (n.projectId) setActiveTab('dpr_records'); }}
                          className={`p-4 border-b cursor-pointer transition-colors relative ${
                            isDarkTheme
                              ? `border-white/5 hover:bg-white/10 ${!n.isRead ? 'bg-white/5' : ''}`
                              : `border-gray-200 hover:bg-gray-50 ${!n.isRead ? 'bg-indigo-50' : ''}`
                          }`}
                        >
                          <div className="flex gap-3">
                            <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${n.type === 'ALERT' ? 'bg-rose-500' :
                              n.type === 'SUCCESS' ? 'bg-emerald-500' : 'bg-indigo-500'
                              }`}></div>
                            <div>
                              <p className={`text-xs font-black leading-tight ${
                                isDarkTheme ? 'text-contrast' : 'text-gray-900'
                              }`}>{n.title}</p>
                              <p className={`text-[10px] mt-1 leading-normal font-medium ${
                                isDarkTheme ? 'muted' : 'text-gray-600'
                              }`}>{n.message}</p>
                              <p className={`text-[8px] mt-2 font-bold uppercase tracking-tight ${
                                isDarkTheme ? 'muted' : 'text-gray-500'
                              }`}>{n.timestamp}</p>
                            </div>
                          </div>
                          {!n.isRead && <div className={`absolute right-4 top-4 w-1.5 h-1.5 rounded-full ${
                            isDarkTheme ? 'bg-indigo-400' : 'bg-indigo-500'
                          }`}></div>}
                        </div>
                      ))
                      ) : (
                        <div className="p-10 text-center">
                          <Icons.Notification size={32} className={`mx-auto mb-2 ${
                            isDarkTheme ? 'text-white/20' : 'text-gray-300'
                          }`} />
                          <p className={`text-[10px] font-black uppercase ${
                            isDarkTheme ? 'muted' : 'text-gray-500'
                          }`}>No alerts found</p>
                        </div>
                      )}
                    </div>
                    <div className={`p-3 text-center rounded-b-2xl ${
                      isDarkTheme ? 'bg-white/5' : 'bg-gray-50'
                    }`}>
                      <button className={`text-[10px] font-black uppercase tracking-widest hover:underline ${
                        isDarkTheme ? '' : 'text-gray-700'
                      }`}>View All Activity</button>
                    </div>
                </div>
              )}

              <div className={`h-6 w-[1px] mx-2 ${
                isDarkTheme ? 'bg-white/10' : 'bg-gray-300'
              }`}></div>
              <div className="text-right">
                <p className={`text-[10px] font-black uppercase leading-none ${
                  isDarkTheme ? 'muted' : 'text-gray-600'
                }`}>Status</p>
                <p className="text-xs font-black uppercase status-badge">System Active</p>
              </div>
            </div>
          </header>

          <div key={activeTab} className="flex-1 overflow-y-auto p-8 scroll-smooth animate-slide-up" onClick={() => setShowNotifications(false)}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
