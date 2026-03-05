/* ─────────────────────────────────────────────────────────────────────────────
   TypeScript models matching the .NET domain entities exactly.
   All IDs are string (UUID/GUID format) to match the backend Guid type.
   ───────────────────────────────────────────────────────────────────────────── */

export type UserRole = 'TeamMember' | 'TeamLead';
export type CategoryType = 'Client' | 'TechDebt' | 'RnD';
export type PlanStatus = 'Planning' | 'Frozen' | 'Completed';
export type WorkItemStatus = 'NotStarted' | 'InProgress' | 'Completed' | 'Blocked';

/** Lifecycle status of a backlog item. Matches the backend BacklogItemStatus enum. */
export type BacklogItemStatus = 'Available' | 'InProgress' | 'Done' | 'Archived';

export interface User {
  id: string;           // Guid
  name: string;
  role: UserRole;
  isActive: boolean;
}

export interface BacklogItem {
  id: string;           // Guid
  title: string;
  description: string;
  category: CategoryType;
  status: BacklogItemStatus;
  isActive: boolean;    // Computed: true when status != Archived
  estimatedHours: number | null;
}

export interface WeeklyPlan {
  id: string;           // Guid
  weekStartDate: string;
  weekEndDate: string;
  clientPercent: number;
  techDebtPercent: number;
  rdPercent: number;
  status: PlanStatus;
  createdAt: string;
  frozenAt: string | null;
  completedAt: string | null;
  totalTeamHours: number;
  selectedMemberIds: string[];  // Which users were chosen for this planning cycle
}

export interface WeeklyPlanTask {
  id: string;           // Guid
  weeklyPlanId: string; // Guid
  backlogItemId: string; // Guid
  backlogItemTitle: string;
  category: CategoryType;
  assignedUserId: string; // Guid
  assignedUserName: string;
  plannedHours: number;
  completedHours: number;
  progressPercent: number;
  status: WorkItemStatus;
}

export interface CategoryProgress {
  category: string;
  plannedHours: number;
  completedHours: number;
  progressPercent: number;
}

export interface UserProgress {
  userId: string;       // Guid
  userName: string;
  plannedHours: number;
  completedHours: number;
  progressPercent: number;
  tasks: WeeklyPlanTask[];
}

export interface Dashboard {
  totalPlannedHours: number;
  totalCompletedHours: number;
  overallProgress: number;
  categoryBreakdown: CategoryProgress[];
  userBreakdown: UserProgress[];
  tasks: WeeklyPlanTask[];
}

/* ── Request Models ─────────────────────────────────────────────────────── */

export interface CreateUserRequest { name: string; role: UserRole; }
export interface UpdateUserRequest { name?: string; role?: UserRole; isActive?: boolean; }

export interface CreateBacklogItemRequest {
  title: string;
  description: string;
  category: CategoryType;
  estimatedHours?: number | null;
}
export interface UpdateBacklogItemRequest {
  title?: string;
  description?: string;
  category?: CategoryType;
  estimatedHours?: number | null;
  status?: BacklogItemStatus;
}

export interface CreateWeeklyPlanRequest {
  weekStartDate: string;
  clientPercent: number;
  techDebtPercent: number;
  rdPercent: number;
  totalTeamHours: number;
  selectedMemberIds: string[];
}

export interface AssignTaskRequest {
  backlogItemId: string;  // Guid
  assignedUserId: string; // Guid
  plannedHours: number;
}

export interface UpdateProgressRequest {
  taskId: string;         // Guid
  completedHours: number;
  status?: WorkItemStatus;
}

/* ── UI Helpers ─────────────────────────────────────────────────────────── */

export const CATEGORY_LABELS: Record<CategoryType, string> = {
  Client: 'Client Focused',
  TechDebt: 'Tech Debt',
  RnD: 'R&D',
};

export const CATEGORY_BADGE_CLASS: Record<CategoryType, string> = {
  Client: 'badge--client',
  TechDebt: 'badge--techdebt',
  RnD: 'badge--rnd',
};

/** Human-readable labels for backlog item statuses. */
export const BACKLOG_STATUS_LABELS: Record<BacklogItemStatus, string> = {
  Available: 'AVAILABLE',
  InProgress: 'IN PROGRESS',
  Done: 'DONE',
  Archived: 'ARCHIVED',
};
