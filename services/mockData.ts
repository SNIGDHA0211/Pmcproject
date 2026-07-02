
import { User, Project, UserRole, ProjectStatus, DPR } from '../types';

export const MOCK_USERS: User[] = [
  { 
    id: 'u1', 
    name: 'Haridas More', 
    role: UserRole.PMC_HEAD, 
    email: 'h.more@pmc-nexus.com', 
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150&h=150'
  },
  { 
    id: 'u2', 
    name: 'Jitendra Wagh', 
    role: UserRole.TEAM_LEAD, 
    email: 'j.wagh@pmc-nexus.com', 
    avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=150&h=150'
  },
  { 
    id: 'u3', 
    name: 'Subhash Jawale', 
    role: UserRole.SITE_ENGINEER, 
    email: 's.jawale@pmc-nexus.com', 
    avatar: 'https://images.unsplash.com/photo-1506919258185-6078bba55d2a?auto=format&fit=crop&q=80&w=150&h=150'
  },
  { 
    id: 'u4', 
    name: 'Yatish Bhanjinakhawa', 
    role: UserRole.COORDINATOR, 
    email: 'y.bhanji@pmc-nexus.com', 
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150&h=150'
  },
];

export const INITIAL_PROJECTS: Project[] = [
  {
    id: 'p-chembur-1030',
    title: 'Commercial Building at C.T.S No 1030 - Chembur',
    client: 'M-FOUR ATLAS PVT LTD',
    description: 'Construction of Commercial complex with Multiplex, Kengeri. Project includes Double Basement and G+9 floors. Average height of the structure is 41.85 mtr.',
    status: ProjectStatus.IN_PROGRESS,
    pmcHeadId: 'u1',
    teamLeadId: 'u2',
    siteEngineerIds: ['u3'],
    coordinatorIds: ['u4'],
    createdAt: '2024-11-22T00:00:00Z',
    updatedAt: '2025-12-31T23:59:59Z',
    budget: 91835879,
    location: 'Village Chembur, M/W Ward, Mumbai-400071',
    performance: {
      spi: 0.92,
      cpi: 0.88,
      plannedValue: 45000000,
      earnedValue: 32981998,
      actualCost: 37500000
    },
    safety: {
      fatalities: 0,
      significant: 0,
      major: 0,
      minor: 2,
      nearMiss: 8,
      lossOfManhours: 1240,
      totalManhours: 84520
    },
    finances: {
      originalValue: 91835879,
      approvedVO: 0,
      revisedValue: 91835879,
      grossBilled: 32981998,
      netCollected: 32981998,
      netDue: 0
    },
    progress: {
      engineering: 100,
      procurement: 85,
      construction: 36
    },
    activities: [
      { id: 'a1', description: 'Excavation (8031 cum)', unit: 'Cum', totalScope: 8031, cumulativePrevious: 8031, category: 'Civil' },
      { id: 'a2', description: 'Waler beam & Strut fixing (-4.85m)', unit: 'Nos', totalScope: 100, cumulativePrevious: 90, category: 'Civil' },
      { id: 'a3', description: 'PCC Backfilling', unit: 'Sq.mt', totalScope: 1172, cumulativePrevious: 742, category: 'Civil' },
      { id: 'a4', description: 'Waterproofing', unit: 'Sq.mt', totalScope: 1808, cumulativePrevious: 1438, category: 'Civil' },
      { id: 'a5', description: 'Retaining Wall', unit: 'Cum', totalScope: 658, cumulativePrevious: 366, category: 'Civil' },
      { id: 'a6', description: 'Raft / LA Work', unit: 'Cum', totalScope: 658, cumulativePrevious: 658, category: 'Civil' },
      { id: 'a7', description: 'Column / Shear Wall / Pardi', unit: 'Cum', totalScope: 315, cumulativePrevious: 182, category: 'Civil' }
    ],
    documents: [
      { id: 'd1', name: 'GFC_Lower_Basement_B-3582-D-11.pdf', type: 'PDF', url: '#', uploadedBy: 'u4', uploadedAt: '2025-02-05T09:00:00Z', status: 'VERIFIED', version: 1 },
      { id: 'd2', name: 'Structural_Audit_Report.pdf', type: 'PDF', url: '#', uploadedBy: 'u2', uploadedAt: '2025-12-10T14:00:00Z', status: 'VERIFIED', version: 1 }
    ],
    auditLogs: [],
    tasks: [
      { id: 't1', title: 'PCC Backfilling skin wall', description: 'Work up to ground floor', assignedTo: 'u3', status: 'PENDING', dueDate: '2026-01-15' },
      { id: 't2', title: 'Retaining Wall Waterproofing', description: 'Up to ground floor level', assignedTo: 'u3', status: 'PENDING', dueDate: '2026-01-20' }
    ]
  },
  {
    id: 'p-thane-logistics',
    title: 'Thane Multi-Modal Logistics Hub',
    client: 'Reliance Infrastructure Ltd',
    description: 'Development of state-of-the-art cold storage and distribution terminal with integrated rail-linkages.',
    status: ProjectStatus.APPROVED,
    pmcHeadId: 'u1',
    teamLeadId: 'u2',
    siteEngineerIds: ['u3'],
    coordinatorIds: ['u4'],
    createdAt: '2023-01-15T00:00:00Z',
    updatedAt: '2025-11-30T00:00:00Z',
    budget: 450000000,
    location: 'Kalwa-Kharegaon, Thane',
    progress: { engineering: 100, procurement: 100, construction: 100 },
    activities: [],
    documents: [],
    auditLogs: [],
    tasks: []
  },
  {
    id: 'p-navi-residential',
    title: 'Navi Mumbai Sky-Terminal Residential',
    client: 'Hiranandani Group',
    description: 'Ultra-luxury high-rise residential towers with sky-bridge amenities and helipad.',
    status: ProjectStatus.SUBMITTED,
    pmcHeadId: 'u1',
    teamLeadId: 'u2',
    siteEngineerIds: ['u3'],
    coordinatorIds: ['u4'],
    createdAt: '2024-05-10T00:00:00Z',
    updatedAt: '2025-12-28T00:00:00Z',
    budget: 1250000000,
    location: 'Vashi Sector 17, Navi Mumbai',
    progress: { engineering: 100, procurement: 95, construction: 82 },
    activities: [],
    documents: [],
    auditLogs: [],
    tasks: []
  }
];

export const MOCK_DPRS: DPR[] = [
  {
    id: 'dpr-chembur-01',
    projectId: 'p-chembur-1030',
    projectName: 'Commercial Building - Chembur',
    date: '31/12/2025',
    labor: { skilled: 19, unskilled: 14, operators: 1, security: 2 },
    machinery: [
      { name: 'Tower Crane', count: 1, status: 'Operational' },
      { name: 'JCB', count: 1, status: 'Operational' }
    ],
    activityProgress: [
      { activityId: 'a7', todayProgress: 6, remarks: 'Column shuttering and reinforcement work in progress' }
    ],
    status: 'PENDING',
    submittedBy: 'u3',
    submittedByName: 'Subhash Jawale',
    submittedAt: '31/12/2025'
  }
];
