/* ─────────────────────────────────────────────────────────────────────────────
   TypeScript models matching the .NET domain entities exactly.
   ───────────────────────────────────────────────────────────────────────────── */

export type UserRole = 'TeamMember' | 'TeamLead';
export type CategoryType = 'Client' | 'TechDebt' | 'RnD';
export type PlanStatus = 'Planning' | 'Frozen' | 'Completed';
export type WorkItemStatus = 'NotStarted' | 'InProgress' | 'Completed' | 'Blocked';


export interface User {
  id: number;
  name: string;
  role: UserRole;
  isActive: boolean;
}

export interface BacklogItem {
  id: number;
  title: string;
  description: string;
  category: CategoryType;
  isActive: boolean;
  estimatedHours: number | null;
}

export interface WeeklyPlan {
  id: number;
  weekStartDate: string;
  weekEndDate: string;
  clientPercent: number;
  techDebtPercent: number;
  rdPercent: number;
  status: PlanStatus;
  createdAt: string;
  frozenAt: string | null;
  completedAt: string | null;
}

export interface WeeklyPlanTask {
  id: number;
  weeklyPlanId: number;
  backlogItemId: number;
  backlogItemTitle: string;
  category: CategoryType;
  assignedUserId: number;
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
  userId: number;
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
  isActive?: boolean;
}

export interface CreateWeeklyPlanRequest {
  weekStartDate: string;
  clientPercent: number;
  techDebtPercent: number;
  rdPercent: number;
}

export interface AssignTaskRequest {
  backlogItemId: number;
  assignedUserId: number;
  plannedHours: number;
}

export interface UpdateProgressRequest {
  taskId: number;
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
