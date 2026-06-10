/**
 * E-Nutrition Rwanda - API Client Service
 * 
 * This module provides type-safe API calls to the NestJS backend.
 * All API calls go through this centralized service.
 */

import { toast } from 'sonner';

// ============================================================================
// CONFIGURATION
// ============================================================================

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

// ============================================================================
// TYPES (matching Prisma schema)
// ============================================================================

export type Sex = 'M' | 'F';

export type NutritionStatus = 'Normal' | 'MAM' | 'SAM' | 'Stunting' | 'Underweight' | 'Wasting';

export type UserRole = 'ADMIN' | 'DATA_MANAGER' | 'NURSE' | 'CHW';

export type UserStatus = 'Active' | 'Suspended' | 'Pending';

export type FacilityType = 'HEALTH_CENTER' | 'HEALTH_POST' | 'DISTRICT_HOSPITAL' | 'REFERRAL_HOSPITAL';

export type FacilityStatus = 'Active' | 'Pending' | 'Suspended';

export type ReferralStatus = 'Pending' | 'Accepted' | 'Completed' | 'Missed';

export type FollowUpStatus = 'Scheduled' | 'Completed' | 'Missed' | 'Rescheduled' | 'Cancelled';

export type NotificationType = 'ASSESSMENT_CREATED' | 'FOLLOWUP_DUE' | 'REFERRAL_RECEIVED' | 'USER_CREATED' | 'SYSTEM';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  relatedId?: string;
  relatedType?: string;
  createdAt: string;
  updatedAt: string;
}



// ============================================================================
// INTERFACES
// ============================================================================

export interface User {
  id: string;
  code: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  facility?: Facility;
  facilityId?: string;
  province?: string;
  district?: string;
  sector?: string;
  cell?: string;
  village?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Facility {
  id: string;
  code: string;
  name: string;
  type: FacilityType;
  province: string;
  district: string;
  sector?: string;
  directorName?: string;
  facilityPhone?: string;
  facilityEmail?: string;
  staffCount: number;
  childrenCount: number;
  status: FacilityStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Child {
  id: string;
  code: string;
  applicationNumber?: string;
  name: string;
  sex: Sex;
  dateOfBirth: string;
  ageMonths: number;
  fatherName?: string;
  motherName?: string;
  caregiverName?: string;
  caregiverPhone?: string;
  caregiverNationalId?: string;
  otherInfo?: string;
  caregiverRelation?: string;
  province: string;
  district: string;
  sector: string;
  cell: string;
  village: string;
  facility: Facility;
  facilityId: string;
  currentStatus: NutritionStatus;
  lastAssessmentDate?: string;
  isActive: boolean;
  registeredAt: string;
  createdAt: string;
  updatedAt: string;
  assignedCHW?: User;
  assignedCHWId?: string;
  assessments?: Assessment[];
}

export interface Assessment {
  id: string;
  code: string;
  type: string;
  status: "Pending" | "Reviewed";
  child: Child;
  childId: string;
  facility: Facility;
  facilityId: string;
  assessedBy: User;
  assessedById: string;
  reviewedBy?: User;
  reviewedById?: string;
  reviewedAt?: string;
  weightKg: number;
  heightCm: number;
  muacCm: number;
  zScoreWFH?: number;
  zScoreHFA?: number;
  zScoreWFA?: number;
  nutritionStatus: NutritionStatus;
  isSAM: boolean;
  isMAM: boolean;
  isStunted: boolean;
  isUnderweight: boolean;
  isWasted: boolean;
  hasOedema?: boolean;
  diagnosis?: string;
  recommendations?: string;
  requiresFollowUp: boolean;
  followUpDate?: string;
  assessmentDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface FollowUp {
  id: string;
  code: string;
  child: Child;
  childId: string;
  assessment?: Assessment;
  assessmentId?: string;
  scheduledDate: string;
  completedDate?: string;
  status: FollowUpStatus;
  conductedBy?: User;
  conductedById?: string;
  reason?: string;
  outcome?: string;
  nextFollowUp?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Referral {
  id: string;
  code: string;
  child: Child;
  childId: string;
  assessment: Assessment;
  assessmentId: string;
  fromFacility: Facility;
  fromFacilityId: string;
  toFacility: Facility;
  toFacilityId: string;
  reason: string;
  urgency: string;
  status: ReferralStatus;
  madeBy: User;
  madeById: string;
  referralDate: string;
  acceptedDate?: string;
  completedDate?: string;
  clinicalNotes?: string;
  transportArranged: boolean;
  outcome?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  id: string;
  type: string;
  user?: User;
  userId?: string;
  facility?: Facility;
  facilityId?: string;
  entityType?: string;
  entityId?: string;
  description: string;
  createdAt: string;
}

export interface GrowthRecord {
  id: string;
  childId: string;
  ageMonths: number;
  weightKg: number;
  heightCm: number;
  muacCm: number;
  zScoreWFH?: number;
  zScoreHFA?: number;
  zScoreWFA?: number;
  status: NutritionStatus;
  measuredDate: string;
  createdAt: string;
}

export interface GlobalStats {
  totalChildren: number;
  totalFacilities: number;
  totalCHWs: number;
}

export interface DashboardStats {
  totalChildren: number;
  pendingAssessments: number;
  totalCHWs: number;
  facilitiesCovered: number;
  samCount: number;
  mamCount: number;
  wastingCount: number;
  stuntingCount: number;
  underweightCount: number;
  normalCount: number;
  followUpsToday: number;
  recentAssessments: number;
  screenedToday: number;
  chwFacilityName?: string | null;
  chwTotalAssessments?: number;
}

export interface NotificationsResponse {
  notifications: Notification[];
  total: number;
  unreadCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

// ============================================================================
// API CLIENT CLASS
// ============================================================================

class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.loadToken();
  }

  /**
   * Load token from localStorage
   */
  private loadToken() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
  }

  /**
   * Save token to localStorage
   */
  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  /**
   * Clear token from localStorage
   */
  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  /**
   * Make HTTP request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    let data: any;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      // Throw with the backend message — callers decide how to surface it
      const message = data && Array.isArray(data.message)
        ? data.message.join(', ')
        : data?.message || data?.error || 'An unexpected error occurred';
      const err = new Error(message) as any;
      err.statusCode = response.status;
      err.data = data;
      throw err;
    }

    return data as T;
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const queryString = params
      ? '?' + new URLSearchParams(params).toString()
      : '';
    return this.request<T>(`${endpoint}${queryString}`, {
      method: 'GET',
    });
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * PATCH request
   */
  async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }

  // ============================================================================
  // AUTH API
  // ============================================================================

  /**
   * Login with email and password
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await this.post<AuthResponse>('/auth/login', { email, password });
    this.setToken(response.access_token);
    return response;
  }

  /**
   * Register new user
   */
  async register(userData: Partial<User> & { password: string }): Promise<User> {
    return this.post<User>('/auth/register', userData);
  }

  /**
   * Get current user profile
   */
  async getProfile(): Promise<User> {
    return this.get<User>('/auth/profile');
  }

  /**
   * Update current user profile (name, email, phone)
   */
  async updateProfile(data: { name?: string; email?: string; phone?: string }): Promise<User> {
    return this.patch<User>('/auth/profile', data);
  }

  /**
   * Change current user password (requires current password for verification)
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    return this.post<{ message: string }>('/auth/change-password', { currentPassword, newPassword });
  }

  /**
   * Send OTP for forgot password
   */
  async sendForgotPasswordOtp(email: string): Promise<{ message: string }> {
    return this.post<{ message: string }>('/auth/forgot-password/send-otp', { email });
  }

  /**
   * Verify OTP for forgot password
   */
  async verifyForgotPasswordOtp(email: string, otp: string): Promise<{ message: string }> {
    return this.post<{ message: string }>('/auth/forgot-password/verify-otp', { email, otp });
  }

  /**
   * Reset password using OTP
   */
  async resetPassword(email: string, otp: string, newPassword: string): Promise<{ message: string }> {
    return this.post<{ message: string }>('/auth/forgot-password/reset', { email, otp, newPassword });
  }

  /**
   * Logout
   */
  logout() {
    this.clearToken();
  }



  // ============================================================================
  // FACILITIES API
  // ============================================================================

  /**
   * Get all facilities (paginated)
   */
  async getFacilities(params?: {
    page?: number;
    limit?: number;
    search?: string;
    type?: FacilityType;
    status?: FacilityStatus;
  }): Promise<PaginatedResponse<Facility>> {
    return this.get<PaginatedResponse<Facility>>('/facilities', params);
  }

  /**
   * Get facility by ID
   */
  async getFacility(id: string): Promise<Facility> {
    return this.get<Facility>(`/facilities/${id}`);
  }

  /**
   * Create new facility
   */
  async createFacility(data: Partial<Facility>): Promise<Facility> {
    return this.post<Facility>('/facilities', data);
  }

  /**
   * Update facility
   */
  async updateFacility(id: string, data: Partial<Facility>): Promise<Facility> {
    return this.patch<Facility>(`/facilities/${id}`, data);
  }

  /**
   * Delete facility
   */
  async deleteFacility(id: string): Promise<void> {
    return this.delete<void>(`/facilities/${id}`);
  }

  /**
   * Get facility statistics
   */
  async getFacilityStats(id: string): Promise<any> {
    return this.get<any>(`/facilities/${id}/stats`);
  }

  // ============================================================================
  // CHILDREN API
  // ============================================================================

  /**
   * Get all children (paginated)
   */
  async getChildren(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: NutritionStatus;
    facilityId?: string;
    village?: string;
  }): Promise<PaginatedResponse<Child>> {
    const cleanParams: any = {};
    if (params?.page !== undefined) cleanParams.page = params.page;
    if (params?.limit !== undefined) cleanParams.limit = params.limit;
    if (params?.search) cleanParams.search = params.search;
    if (params?.status && params.status !== 'all' && params.status !== 'undefined') cleanParams.status = params.status;
    if (params?.facilityId) cleanParams.facilityId = params.facilityId;
    if (params?.village) cleanParams.village = params.village;
    return this.get<PaginatedResponse<Child>>('/children', cleanParams);
  }

  /**
   * Get child by ID
   */
  async getChild(id: string): Promise<Child> {
    return this.get<Child>(`/children/${id}`);
  }

  /**
   * Register new child
   */
  async createChild(data: Partial<Child>): Promise<Child> {
    return this.post<Child>('/children', data);
  }

  /**
   * Find child by application number (for auto-populate on registration forms)
   */
  async findChildByApplicationNumber(appNumber: string): Promise<Child | null> {
    try {
      const child = await this.get<Child>(`/children/by-app-number/${encodeURIComponent(appNumber)}`);
      // Only return child if it has an id (valid child)
      if (child && child.id) {
        return child;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Update child
   */
  async updateChild(id: string, data: Partial<Child>): Promise<Child> {
    return this.patch<Child>(`/children/${id}`, data);
  }

  /**
   * Delete/deactivate child
   */
  async deleteChild(id: string): Promise<{ message: string }> {
    return this.delete<{ message: string }>(`/children/${id}`);
  }

  /**
   * Search children by name (for autocomplete)
   */
  async searchChildrenByName(query: string): Promise<Child[]> {
    if (!query) return [];
    return this.get<Child[]>(`/children/search/${encodeURIComponent(query)}`);
  }

  /**
   * Search children by name
   */
  async searchChildren(query: string): Promise<Child[]> {
    const response = await this.get<PaginatedResponse<Child>>('/children', { search: query, limit: 10 });
    return response.data;
  }

  /**
   * Get child's assessments
   */
  async getChildAssessments(childId: string): Promise<Assessment[]> {
    return this.get<Assessment[]>(`/children/${childId}/assessments`);
  }

  /**
   * Get child's growth chart data
   */
  async getChildGrowthChart(childId: string): Promise<GrowthRecord[]> {
    return this.get<GrowthRecord[]>(`/children/${childId}/growth-chart`);
  }

  // ============================================================================
  // ASSESSMENTS API
  // ============================================================================

  /**
   * Get all assessments (paginated)
   */
  async getAssessments(params?: {
    page?: number;
    limit?: number;
    status?: NutritionStatus;
    facilityId?: string;
    criticalOnly?: boolean;
  }): Promise<PaginatedResponse<Assessment>> {
    const cleanParams: any = {};
    if (params?.page !== undefined) cleanParams.page = params.page;
    if (params?.limit !== undefined) cleanParams.limit = params.limit;
    if (params?.status) cleanParams.status = params.status;
    if (params?.facilityId) cleanParams.facilityId = params.facilityId;
    if (params?.criticalOnly !== undefined) cleanParams.criticalOnly = params.criticalOnly;
    return this.get<PaginatedResponse<Assessment>>('/assessments', cleanParams);
  }

  /**
   * Get assessment by ID
   */
  async getAssessment(id: string): Promise<Assessment> {
    return this.get<Assessment>(`/assessments/${id}`);
  }

  /**
   * Create new assessment (includes WHO classification)
   */
  async createAssessment(data: {
    childId: string;
    facilityId: string;
    weightKg: number;
    heightCm: number;
    muacCm?: number;
    hasOedema?: boolean;
    clinicalNotes?: string;
  }): Promise<Assessment> {
    return this.post<Assessment>('/assessments', data);
  }

  /**
   * Update assessment
   */
  async updateAssessment(id: string, data: Partial<Assessment>): Promise<Assessment> {
    return this.patch<Assessment>(`/assessments/${id}`, data);
  }

  /**
   * Review assessment (mark as reviewed)
   */
  async reviewAssessment(id: string): Promise<Assessment> {
    return this.patch<Assessment>(`/assessments/${id}/review`);
  }

  /**
   * Get pending assessments
   */
  async getPendingAssessments(): Promise<Assessment[]> {
    const response = await this.get<PaginatedResponse<Assessment>>('/assessments/pending');
    return response.data;
  }

  /**
   * Get critical (SAM) cases
   */
  async getCriticalCases(): Promise<Assessment[]> {
    const response = await this.get<PaginatedResponse<Assessment>>('/assessments/critical');
    return response.data;
  }

  // ============================================================================
  // FOLLOW-UPS API
  // ============================================================================

  /**
   * Get all follow-ups
   */
  async getFollowUps(params?: {
    page?: number;
    limit?: number;
    status?: FollowUpStatus;
    facilityId?: string;
  }): Promise<PaginatedResponse<FollowUp>> {
    return this.get<PaginatedResponse<FollowUp>>('/follow-ups', params);
  }

  /**
   * Get follow-up by ID
   */
  async getFollowUp(id: string): Promise<FollowUp> {
    return this.get<FollowUp>(`/follow-ups/${id}`);
  }

  /**
   * Create new follow-up
   */
  async createFollowUp(data: Partial<FollowUp>): Promise<FollowUp> {
    return this.post<FollowUp>('/follow-ups', data);
  }

  /**
   * Update follow-up
   */
  async updateFollowUp(id: string, data: Partial<FollowUp>): Promise<FollowUp> {
    return this.patch<FollowUp>(`/follow-ups/${id}`, data);
  }

  /**
   * Get today's follow-ups
   */
  async getTodayFollowUps(): Promise<FollowUp[]> {
    return this.get<FollowUp[]>('/follow-ups/today');
  }

  /**
   * Get upcoming follow-ups
   */
  async getUpcomingFollowUps(): Promise<FollowUp[]> {
    return this.get<FollowUp[]>('/follow-ups/upcoming');
  }

  // ============================================================================
  // REFERRALS API
  // ============================================================================

  /**
   * Get all referrals
   */
  async getReferrals(params?: {
    page?: number;
    limit?: number;
    status?: ReferralStatus;
    facilityId?: string;
  }): Promise<PaginatedResponse<Referral>> {
    return this.get<PaginatedResponse<Referral>>('/referrals', params);
  }

  /**
   * Get referral by ID
   */
  async getReferral(id: string): Promise<Referral> {
    return this.get<Referral>(`/referrals/${id}`);
  }

  /**
   * Create new referral
   */
  async createReferral(data: Partial<Referral>): Promise<Referral> {
    return this.post<Referral>('/referrals', data);
  }

  /**
   * Update referral status
   */
  async updateReferralStatus(id: string, status: ReferralStatus): Promise<Referral> {
    return this.patch<Referral>(`/referrals/${id}/status`, { status });
  }

  /**
   * Get pending referrals
   */
  async getPendingReferrals(): Promise<Referral[]> {
    return this.get<Referral[]>('/referrals/pending');
  }

  // ============================================================================
  // USERS API
  // ============================================================================

  /**
   * Get all users
   */
  async getUsers(params?: {
    page?: number;
    limit?: number;
    role?: UserRole;
    facilityId?: string;
    status?: UserStatus;
  }): Promise<PaginatedResponse<User>> {
    return this.get<PaginatedResponse<User>>('/users', params);
  }

  /**
   * Get active CHWs for a specific facility (accessible to all authenticated roles)
   */
  async getCHWsByFacility(facilityId: string): Promise<Partial<User>[]> {
    return this.get<Partial<User>[]>(`/children/chws/${facilityId}`);
  }

  /**
   * Get CHWs by facility (convenience method for getting Active CHWs at a facility)
   */
  async getCHWsByFacilityFallback(facilityId: string): Promise<User[]> {
    try {
      const response = await this.get<PaginatedResponse<User>>('/users', {
        role: 'CHW',
        facilityId,
        status: 'Active',
        limit: 100,
      });
      return response.data;
    } catch (error) {
      console.warn('Unable to fetch CHWs (may require elevated permissions)');
      return [];
    }
  }

  /**
   * Get user by ID
   */
  async getUser(id: string): Promise<User> {
    return this.get<User>(`/users/${id}`);
  }

  /**
   * Create new user
   */
  async createUser(data: Partial<User> & { password: string }): Promise<User> {
    return this.post<User>('/users', data);
  }

  /**
   * Update user
   */
  async updateUser(id: string, data: Partial<User>): Promise<User> {
    return this.patch<User>(`/users/${id}`, data);
  }

  /**
   * Delete user
   */
  async deleteUser(id: string): Promise<void> {
    return this.delete<void>(`/users/${id}`);
  }

  /**
   * Toggle user status (Active/Suspended)
   */
  async toggleUserStatus(id: string): Promise<User> {
    return this.patch<User>(`/users/${id}/status`, {});
  }

  // ============================================================================
  // ACTIVITIES API
  // ============================================================================

  /**
   * Get activity logs
   */
  async getActivities(params?: {
    page?: number;
    limit?: number;
    userId?: string;
    facilityId?: string;
    type?: string;
  }): Promise<PaginatedResponse<Activity>> {
    return this.get<PaginatedResponse<Activity>>('/activities', params);
  }

  /**
   * Get user activities
   */
  async getUserActivities(userId: string): Promise<Activity[]> {
    return this.get<Activity[]>(`/activities/user/${userId}`);
  }

  /**
   * Get facility activities
   */
  async getFacilityActivities(facilityId: string): Promise<Activity[]> {
    return this.get<Activity[]>(`/activities/facility/${facilityId}`);
  }

  // ============================================================================
  // NOTIFICATIONS API
  // ============================================================================

  /**
   * Get user's notifications
   */
  async getNotifications(params?: {
    page?: number;
    limit?: number;
  }): Promise<NotificationsResponse> {
    return this.get<NotificationsResponse>('/notifications', params);
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<Notification> {
    return this.patch<Notification>(`/notifications/${notificationId}/read`);
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<{ count: number }> {
    return this.patch<{ count: number }>('/notifications/read-all');
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    return this.delete<void>(`/notifications/${notificationId}`);
  }

  /**
   * Clear all notifications
   */
  async clearAllNotifications(): Promise<void> {
    return this.delete<void>('/notifications');
  }

  // ============================================================================
  // STATISTICS API
  // ============================================================================

  /**
   * Get global statistics (unfiltered, no auth required)
   */
  async getGlobalStats(): Promise<GlobalStats> {
    return this.get<GlobalStats>('/statistics/global');
  }

  /**
   * Get dashboard statistics (role-based)
   */
  async getDashboardStats(): Promise<DashboardStats> {
    return this.get<DashboardStats>('/statistics/dashboard');
  }

  /**
   * Get facility statistics
   */
  async getStatisticsFacility(facilityId: string, params?: {
    year?: number;
    month?: number;
  }): Promise<any> {
    return this.get<any>(`/statistics/facility/${facilityId}`, params);
  }

  /**
   * Get CHW statistics
   */
  async getCHWStats(chwId: string, params?: {
    year?: number;
    month?: number;
  }): Promise<any> {
    return this.get<any>(`/statistics/chw/${chwId}`, params);
  }

  /**
   * Get analytics data
   */
  async getAnalytics(params?: {
    from?: string;
    to?: string;
    facilityId?: string;
  }): Promise<any> {
    return this.get<any>('/statistics/analytics', params);
  }

  // ============================================================================
  // REPORTS API
  // ============================================================================

  /**
   * Generate report
   */
  async generateReport(params: {
    type: string;
    from?: string;
    to?: string;
    facilityId?: string;
  }): Promise<any> {
    return this.post<any>('/reports/generate', params);
  }

  /**
   * Get activity report
   */
  async getActivityReport(params?: {
    from?: string;
    to?: string;
    facilityId?: string;
  }): Promise<any> {
    return this.get<any>('/reports/activity', params);
  }

  /**
   * Export report
   */
  async exportReport(format: 'excel' | 'pdf', params: any): Promise<Blob> {
    const response = await fetch(`${this.baseURL}/reports/export?format=${format}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error('Export failed');
    }

    return response.blob();
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

export const api = new ApiClient(API_BASE_URL);

// Export default for convenience
export default api;
