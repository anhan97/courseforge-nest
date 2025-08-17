import Cookies from 'js-cookie';

const API_BASE_URL = 'http://localhost:5000/api/v1';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'ADMIN' | 'STUDENT';
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  lastLoginAt?: string;
  _count?: {
    enrollments: number;
  };
}

interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface LoginData {
  email: string;
  password: string;
}

interface RegisterData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

interface Course {
  id: string;
  title: string;
  description?: string;
  shortDescription?: string;
  thumbnailUrl?: string;
  price: number;
  originalPrice?: number;
  currency: string;
  level: string;
  duration?: number;
  enrollmentCount: number;
  rating?: number;
  reviewCount: number;
  isPublished: boolean;
  isEnrolled?: boolean;
  canAccess?: boolean;
  enrollmentStatus?: string;
  completionPercentage?: number;
  instructor?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  category: {
    id: string;
    name: string;
    slug: string;
  };
  modules?: Module[];
}

interface Module {
  id: string;
  title: string;
  description?: string;
  orderIndex: number;
  lessons: Lesson[];
}

interface Lesson {
  id: string;
  title: string;
  description?: string;
  videoDuration?: number;
  orderIndex: number;
  isFree: boolean;
}

interface CoursesResponse {
  courses: Course[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Admin types
interface AdminCourse {
  id: string;
  title: string;
  description?: string;
  shortDescription?: string;
  thumbnailUrl?: string;
  price: number;
  originalPrice?: number;
  level: string;
  duration?: number;
  status: string;
  isPublished: boolean;
  publishedAt?: string;
  enrollmentCount: number;
  rating?: number;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
  instructor?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
  };
  category: {
    id: string;
    name: string;
    slug: string;
  };
  _count: {
    enrollments: number;
    modules: number;
  };
  visibility?: string;
  revenue?: number;
  authorizedUsers?: number;
  maxEnrollments?: number | null;
}

interface AdminCoursesResponse {
  courses: AdminCourse[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

interface CreateCourseData {
  title: string;
  description?: string;
  shortDescription?: string;
  thumbnailUrl?: string;
  categoryId?: string;
  price?: number;
  originalPrice?: number;
  currency?: string;
  language?: string;
  level?: 'beginner' | 'intermediate' | 'advanced';
  duration?: number;
  requirements?: string[];
  whatYouLearn?: string[];
}

interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  status: string;
  enrolledAt: string;
  completedAt?: string;
  progress: number;
  course: {
    id: string;
    title: string;
    thumbnailUrl?: string;
  };
}

interface MyEnrollmentsResponse {
  enrollments: Enrollment[];
  total: number;
}

interface AdminStatsResponse {
  totalUsers: number;
  totalCourses: number;
  totalEnrollments: number;
  totalRevenue: number;
  recentUsers: number;
  recentCourses: number;
  recentEnrollments: number;
  usersByRole: {
    ADMIN: number;
    STUDENT: number;
  };
  coursesByStatus: {
    PUBLISHED: number;
    DRAFT: number;
    ARCHIVED: number;
  };
  enrollmentsByMonth: Array<{
    month: string;
    count: number;
  }>;
  revenueByMonth: Array<{
    month: string;
    revenue: number;
  }>;
}

interface CreateUserData {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  role?: 'ADMIN' | 'STUDENT';
  isVerified?: boolean;
}

interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

interface CreateModuleData {
  courseId: string;
  title: string;
  description?: string;
  orderIndex?: number;
}

interface UserEnrollment {
  id: string;
  status: string;
  enrolledAt: string;
  completionPercentage?: number;
  course: {
    id: string;
    title: string;
    thumbnailUrl?: string;
    price: number;
    level?: string;
    category?: {
      name: string;
    };
  };
}

interface LessonResource {
  id: string;
  title: string;
  description?: string;
  fileUrl: string;
  fileType: string;
  fileSize?: number;
  orderIndex: number;
  isDownloadable: boolean;
  createdAt: string;
}

interface CreateLessonResourceData {
  lessonId: string;
  title: string;
  description?: string;
  fileUrl: string;
  fileType: string;
  fileSize?: number;
  orderIndex?: number;
  isDownloadable?: boolean;
}

class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    // Try to get token from cookies first, then localStorage
    this.token = Cookies.get('accessToken') || localStorage.getItem('accessToken');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      // Store in both cookies and localStorage
      localStorage.setItem('accessToken', token);
      Cookies.set('accessToken', token, { 
        expires: 30, // 30 days
        secure: window.location.protocol === 'https:', 
        sameSite: 'strict' 
      });
    } else {
      localStorage.removeItem('accessToken');
      Cookies.remove('accessToken');
    }
  }

  // Ensure token is loaded from cookies or localStorage
  ensureToken() {
    if (!this.token) {
      this.token = Cookies.get('accessToken') || localStorage.getItem('accessToken');
      if (this.token) {
        console.log('Token loaded from storage:', this.token.substring(0, 20) + '...');
      } else {
        console.log('No token found in storage');
      }
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    // Ensure token is loaded from localStorage before making request
    this.ensureToken();
    
    const url = `${this.baseURL}${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      (headers as Record<string, string>).Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        // Try to refresh token on 401 errors
        if (response.status === 401 && endpoint !== '/auth/refresh' && endpoint !== '/auth/login') {
          const refreshResponse = await this.refreshToken();
          if (refreshResponse.success && refreshResponse.data) {
            // Retry the original request with new token
            return this.request<T>(endpoint, options);
          }
        }
        return {
          success: false,
          error: data.message || `HTTP ${response.status}`,
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // Authentication methods
  async register(userData: RegisterData): Promise<ApiResponse<AuthResponse>> {
    return this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async login(credentials: LoginData): Promise<ApiResponse<AuthResponse>> {
    return this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async logout(): Promise<ApiResponse<{ message: string }>> {
    const response = await this.request<{ message: string }>('/auth/logout', {
      method: 'POST',
    });
    
    if (response.success) {
      this.setToken(null);
    }
    
    return response;
  }

  async refreshToken(): Promise<ApiResponse<{ accessToken: string; expiresIn: number }>> {
    const refreshToken = Cookies.get('refreshToken') || localStorage.getItem('refreshToken');
    
    if (!refreshToken) {
      return {
        success: false,
        error: 'No refresh token available',
      };
    }

    return this.request<{ accessToken: string; expiresIn: number }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  }

  async getCurrentUser(): Promise<ApiResponse<User>> {
    return this.request<User>('/auth/me');
  }

  // Course methods
  async getCourses(params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    level?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<ApiResponse<CoursesResponse>> {
    const searchParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }

    const query = searchParams.toString();
    return this.request<CoursesResponse>(`/courses${query ? `?${query}` : ''}`);
  }

  async getCourse(courseId: string): Promise<ApiResponse<Course>> {
    return this.request<Course>(`/courses/${courseId}`);
  }

  async getCourseContent(courseId: string): Promise<ApiResponse<Course>> {
    return this.request<Course>(`/courses/${courseId}/content`);
  }

  async getModules(courseId: string): Promise<ApiResponse<{ modules: Module[] }>> {
    return this.request<{ modules: Module[] }>(`/modules/course/${courseId}`);
  }

  async createModule(moduleData: CreateModuleData): Promise<ApiResponse<{ message: string; module: Module }>> {
    return this.request<{ message: string; module: Module }>('/modules', {
      method: 'POST',
      body: JSON.stringify(moduleData),
    });
  }

  async updateModule(moduleId: string, moduleData: Partial<CreateModuleData>): Promise<ApiResponse<{ message: string; module: Module }>> {
    return this.request<{ message: string; module: Module }>(`/modules/${moduleId}`, {
      method: 'PUT',
      body: JSON.stringify(moduleData),
    });
  }

  async deleteModule(moduleId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/modules/${moduleId}`, {
      method: 'DELETE',
    });
  }

  // Lesson resource methods
  async getLessonResources(lessonId: string): Promise<ApiResponse<{ resources: LessonResource[] }>> {
    return this.request<{ resources: LessonResource[] }>(`/lessons/${lessonId}/resources`);
  }

  async createLessonResource(resourceData: CreateLessonResourceData): Promise<ApiResponse<{ message: string; resource: LessonResource }>> {
    return this.request<{ message: string; resource: LessonResource }>('/lessons/resources', {
      method: 'POST',
      body: JSON.stringify(resourceData),
    });
  }

  async updateLessonResource(resourceId: string, resourceData: Partial<CreateLessonResourceData>): Promise<ApiResponse<{ message: string; resource: LessonResource }>> {
    return this.request<{ message: string; resource: LessonResource }>(`/lessons/resources/${resourceId}`, {
      method: 'PUT',
      body: JSON.stringify(resourceData),
    });
  }

  async deleteLessonResource(resourceId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/lessons/resources/${resourceId}`, {
      method: 'DELETE',
    });
  }

  // Admin methods
  async getAdminCourses(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    visibility?: string;
    category?: string;
    level?: string;
  }): Promise<ApiResponse<AdminCoursesResponse>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.visibility) queryParams.append('visibility', params.visibility);
    if (params?.category) queryParams.append('category', params.category);
    if (params?.level) queryParams.append('level', params.level);
    
    const query = queryParams.toString();
    return this.request<AdminCoursesResponse>(`/admin/courses${query ? `?${query}` : ''}`);
  }

  async createCourse(courseData: CreateCourseData): Promise<ApiResponse<{ message: string; course: AdminCourse }>> {
    return this.request<{ message: string; course: AdminCourse }>('/admin/courses', {
      method: 'POST',
      body: JSON.stringify(courseData),
    });
  }

  async publishCourse(courseId: string, isPublished: boolean): Promise<ApiResponse<{ message: string; course: any }>> {
    return this.request<{ message: string; course: any }>(`/admin/courses/${courseId}/publish`, {
      method: 'PUT',
      body: JSON.stringify({ isPublished }),
    });
  }

  async bulkCourseAction(action: string, courseIds: string[]): Promise<ApiResponse<{ message: string; updatedCount?: number; deletedCount?: number; affectedCourses: string[] }>> {
    return this.request<{ message: string; updatedCount?: number; deletedCount?: number; affectedCourses: string[] }>('/admin/courses/bulk-action', {
      method: 'POST',
      body: JSON.stringify({ action, courseIds }),
    });
  }

  async getMyEnrollments(): Promise<ApiResponse<MyEnrollmentsResponse>> {
    return this.request<MyEnrollmentsResponse>('/enrollments/my');
  }

  async enrollInCourse(courseId: string): Promise<ApiResponse<{ message: string; enrollment: any }>> {
    return this.request<{ message: string; enrollment: any }>('/enrollments', {
      method: 'POST',
      body: JSON.stringify({ courseId }),
    });
  }

  async getAdminStats(): Promise<ApiResponse<AdminStatsResponse>> {
    return this.request<AdminStatsResponse>('/admin/stats');
  }

  async updateCourse(courseId: string, courseData: Partial<CreateCourseData>): Promise<ApiResponse<{ message: string; course: any }>> {
    return this.request<{ message: string; course: any }>(`/admin/courses/${courseId}`, {
      method: 'PUT',
      body: JSON.stringify(courseData),
    });
  }

  // User CRUD operations
  async createUser(userData: CreateUserData): Promise<ApiResponse<{ message: string; user: User }>> {
    return this.request<{ message: string; user: User }>('/admin/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async updateUser(userId: string, userData: Partial<CreateUserData>): Promise<ApiResponse<{ message: string; user: User }>> {
    return this.request<{ message: string; user: User }>(`/admin/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async deleteUser(userId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/admin/users/${userId}`, {
      method: 'DELETE',
    });
  }

  async updateUserStatus(userId: string, isActive: boolean): Promise<ApiResponse<{ message: string; user: User }>> {
    return this.request<{ message: string; user: User }>(`/admin/users/${userId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ isActive }),
    });
  }

  // Get admin users (paginated)
  async getAdminUsers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    status?: string;
  }): Promise<ApiResponse<{ users: User[]; pagination: PaginationInfo }>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.search) searchParams.append('search', params.search);
    if (params?.role) searchParams.append('role', params.role);
    if (params?.status) searchParams.append('status', params.status);
    
    return this.request<{ users: User[]; pagination: PaginationInfo }>(`/admin/users?${searchParams}`);
  }

  // Bulk course assignment
  async bulkAssignCourses(userIds: string[], courseIds: string[]): Promise<ApiResponse<{ message: string; assigned: number; users: User[]; courses: Course[] }>> {
    return this.request<{ message: string; assigned: number; users: User[]; courses: Course[] }>('/admin/users/bulk-assign-courses', {
      method: 'POST',
      body: JSON.stringify({ userIds, courseIds }),
    });
  }

  // Get user's course enrollments (admin view)
  async getUserEnrollments(userId: string): Promise<ApiResponse<{ enrollments: UserEnrollment[] }>> {
    return this.request<{ enrollments: UserEnrollment[] }>(`/admin/users/${userId}/enrollments`);
  }
}

// Create singleton instance
export const apiClient = new ApiClient(API_BASE_URL);

// Export types
export type { 
  User, 
  AuthResponse, 
  RegisterData, 
  LoginData, 
  ApiResponse, 
  Course, 
  Module, 
  Lesson, 
  CoursesResponse,
  AdminCourse,
  AdminCoursesResponse,
  CreateCourseData,
  CreateUserData,
  CreateModuleData,
  UserEnrollment,
  LessonResource,
  CreateLessonResourceData,
  PaginationInfo,
  Enrollment,
  MyEnrollmentsResponse,
  AdminStatsResponse
};