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
}

interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface RegisterData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

interface LoginData {
  email: string;
  password: string;
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
  instructor: {
    id: string;
    firstName?: string;
    lastName?: string;
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

interface Enrollment {
  id: string;
  status: string;
  enrolledAt: string;
  completedAt?: string;
  expiresAt?: string;
  completionPercentage: number;
  course: Course;
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

interface EnrollmentsResponse {
  enrollments: Enrollment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Admin interfaces
interface AdminStats {
  totalUsers: number;
  totalCourses: number;
  totalEnrollments: number;
  activeUsers: number;
  publishedCourses: number;
  recentEnrollments: number;
  revenue: number;
}

interface AdminUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  isActive: boolean;
  isVerified: boolean;
  lastLoginAt?: string;
  createdAt: string;
  _count: {
    enrollments: number;
    instructorCourses: number;
  };
}

interface AdminUsersResponse {
  users: AdminUser[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

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
  requirements: string[];
  whatYouLearn: string[];
  tags: string[];
  seoTitle?: string;
  seoDescription?: string;
  status: string;
  isPublished: boolean;
  publishedAt?: string;
  enrollmentCount: number;
  rating?: number;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
  visibility: 'FREE' | 'PRIVATE' | 'PREMIUM';
  revenue: number;
  authorizedUsers: number;
  maxEnrollments?: number | null;
  instructor: {
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
  instructorId?: string;
  price?: number;
  originalPrice?: number;
  currency?: string;
  language?: string;
  level?: 'beginner' | 'intermediate' | 'advanced';
  duration?: number;
  requirements?: string[];
  whatYouLearn?: string[];
  tags?: string[];
  seoTitle?: string;
  seoDescription?: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

interface CategoriesResponse {
  categories: Category[];
}

interface Instructor {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  _count: {
    instructorCourses: number;
  };
}

interface InstructorsResponse {
  instructors: Instructor[];
}

interface UserEnrollment {
  id: string;
  status: string;
  enrolledAt: string;
  completedAt?: string;
  expiresAt?: string;
  completionPercentage: number;
  course: {
    id: string;
    title: string;
    thumbnailUrl?: string;
    price: number;
    level: string;
    isPublished: boolean;
    instructor: {
      firstName?: string;
      lastName?: string;
    };
  };
}

interface UserEnrollmentsResponse {
  enrollments: UserEnrollment[];
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
        expires: 7, // 7 days
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
      headers.Authorization = `Bearer ${this.token}`;
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

  async changePassword(data: { currentPassword: string; newPassword: string }): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async forgotPassword(email: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(data: { token: string; newPassword: string }): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // User methods
  async updateProfile(data: Partial<User>): Promise<ApiResponse<User>> {
    return this.request<User>('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
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

  // Enrollment methods
  async getMyEnrollments(params?: {
    page?: number;
    limit?: number;
    status?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<ApiResponse<EnrollmentsResponse>> {
    const searchParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }

    const query = searchParams.toString();
    return this.request<EnrollmentsResponse>(`/enrollments/my${query ? `?${query}` : ''}`);
  }

  async enrollInCourse(courseId: string): Promise<ApiResponse<{ enrollment: Enrollment; message: string }>> {
    return this.request<{ enrollment: Enrollment; message: string }>('/enrollments', {
      method: 'POST',
      body: JSON.stringify({ courseId }),
    });
  }

  async getEnrollment(enrollmentId: string): Promise<ApiResponse<Enrollment>> {
    return this.request<Enrollment>(`/enrollments/${enrollmentId}`);
  }

  async updateEnrollmentProgress(enrollmentId: string, data: {
    completionPercentage?: number;
  }): Promise<ApiResponse<{ enrollment: Enrollment; message: string }>> {
    return this.request<{ enrollment: Enrollment; message: string }>(`/enrollments/${enrollmentId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Lesson methods
  async getLesson(lessonId: string): Promise<ApiResponse<Lesson & {
    videoUrl?: string;
    content?: string;
    attachments?: any[];
  }>> {
    return this.request(`/lessons/${lessonId}`);
  }

  async updateLessonProgress(lessonId: string, data: {
    watchTime?: number;
    lastPosition?: number;
    isCompleted?: boolean;
  }): Promise<ApiResponse<{ progress: any; message: string }>> {
    return this.request(`/lessons/${lessonId}/progress`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Admin API methods
  async getAdminStats(): Promise<ApiResponse<AdminStats>> {
    return this.request<AdminStats>('/admin/dashboard/stats');
  }

  async getAdminUsers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    status?: string;
  }): Promise<ApiResponse<AdminUsersResponse>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.role) queryParams.append('role', params.role);
    if (params?.status) queryParams.append('status', params.status);
    
    const query = queryParams.toString();
    return this.request<AdminUsersResponse>(`/admin/users${query ? `?${query}` : ''}`);
  }

  async updateUserStatus(userId: string, isActive: boolean): Promise<ApiResponse<{ message: string; user: User }>> {
    return this.request<{ message: string; user: User }>(`/admin/users/${userId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ isActive }),
    });
  }

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
    return this.request<AdminCoursesResponse>(`/admin/courses${query ? `?${query}` : ''`);
  }

  async publishCourse(courseId: string, isPublished: boolean): Promise<ApiResponse<{ message: string; course: any }>> {
    return this.request<{ message: string; course: any }>(`/admin/courses/${courseId}/publish`, {
      method: 'PUT',
      body: JSON.stringify({ isPublished }),
    });
  }

  async bulkCourseAction(action: 'publish' | 'unpublish' | 'archive' | 'makeFree' | 'delete', courseIds: string[]): Promise<ApiResponse<{ message: string; updatedCount?: number; deletedCount?: number; affectedCourses: string[] }>> {
    return this.request<{ message: string; updatedCount?: number; deletedCount?: number; affectedCourses: string[] }>('/admin/courses/bulk-action', {
      method: 'POST',
      body: JSON.stringify({ action, courseIds }),
    });
  }

  async updateCourse(courseId: string, courseData: Partial<CreateCourseData>): Promise<ApiResponse<{ message: string; course: any }>> {
    return this.request<{ message: string; course: any }>(`/courses/${courseId}`, {
      method: 'PUT',
      body: JSON.stringify(courseData),
    });
  }

  async deleteCourse(courseId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/courses/${courseId}`, {
      method: 'DELETE',
    });
  }

  async getCourseForEdit(courseId: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/courses/${courseId}`);
  }

  // Module management
  async getModules(courseId: string): Promise<ApiResponse<{ modules: any[] }>> {
    return this.request<{ modules: any[] }>(`/modules/course/${courseId}`);
  }

  async createModule(moduleData: { courseId: string; title: string; description?: string; orderIndex?: number }): Promise<ApiResponse<{ message: string; module: any }>> {
    return this.request<{ message: string; module: any }>('/modules', {
      method: 'POST',
      body: JSON.stringify(moduleData),
    });
  }

  async updateModule(moduleId: string, moduleData: { title?: string; description?: string; orderIndex?: number }): Promise<ApiResponse<{ message: string; module: any }>> {
    return this.request<{ message: string; module: any }>(`/modules/${moduleId}`, {
      method: 'PUT',
      body: JSON.stringify(moduleData),
    });
  }

  async deleteModule(moduleId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/modules/${moduleId}`, {
      method: 'DELETE',
    });
  }

  async publishModule(moduleId: string, isPublished: boolean): Promise<ApiResponse<{ message: string; module: any }>> {
    return this.request<{ message: string; module: any }>(`/modules/${moduleId}/publish`, {
      method: 'PUT',
      body: JSON.stringify({ isPublished }),
    });
  }

  async reorderModules(courseId: string, modules: { id: string; orderIndex: number }[]): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/modules/course/${courseId}/reorder`, {
      method: 'PUT',
      body: JSON.stringify({ modules }),
    });
  }

  // Lesson management
  async getLessons(moduleId: string): Promise<ApiResponse<{ lessons: any[] }>> {
    return this.request<{ lessons: any[] }>(`/lessons/module/${moduleId}`);
  }

  async getLesson(lessonId: string): Promise<ApiResponse<{ lesson: any }>> {
    return this.request<{ lesson: any }>(`/lessons/${lessonId}`);
  }

  async createLesson(lessonData: {
    moduleId: string;
    title: string;
    description?: string;
    videoUrl?: string;
    videoDuration?: number;
    videoProvider?: string;
    content?: string;
    orderIndex?: number;
    isFree?: boolean;
  }): Promise<ApiResponse<{ message: string; lesson: any }>> {
    return this.request<{ message: string; lesson: any }>('/lessons', {
      method: 'POST',
      body: JSON.stringify(lessonData),
    });
  }

  async updateLesson(lessonId: string, lessonData: {
    title?: string;
    description?: string;
    videoUrl?: string;
    videoDuration?: number;
    videoProvider?: string;
    content?: string;
    orderIndex?: number;
    isFree?: boolean;
  }): Promise<ApiResponse<{ message: string; lesson: any }>> {
    return this.request<{ message: string; lesson: any }>(`/lessons/${lessonId}`, {
      method: 'PUT',
      body: JSON.stringify(lessonData),
    });
  }

  async deleteLesson(lessonId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/lessons/${lessonId}`, {
      method: 'DELETE',
    });
  }

  async publishLesson(lessonId: string, isPublished: boolean): Promise<ApiResponse<{ message: string; lesson: any }>> {
    return this.request<{ message: string; lesson: any }>(`/lessons/${lessonId}/publish`, {
      method: 'PUT',
      body: JSON.stringify({ isPublished }),
    });
  }

  async reorderLessons(moduleId: string, lessons: { id: string; orderIndex: number }[]): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/lessons/module/${moduleId}/reorder`, {
      method: 'PUT',
      body: JSON.stringify({ lessons }),
    });
  }

  async addLessonAttachment(lessonId: string, attachmentData: {
    fileName: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
  }): Promise<ApiResponse<{ message: string; attachment: any }>> {
    return this.request<{ message: string; attachment: any }>(`/lessons/${lessonId}/attachments`, {
      method: 'POST',
      body: JSON.stringify(attachmentData),
    });
  }

  async deleteLessonAttachment(attachmentId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/lessons/attachments/${attachmentId}`, {
      method: 'DELETE',
    });
  }

  async createCourse(courseData: CreateCourseData): Promise<ApiResponse<{ message: string; course: any }>> {
    return this.request<{ message: string; course: any }>('/admin/courses', {
      method: 'POST',
      body: JSON.stringify(courseData),
    });
  }

  async getCategories(): Promise<ApiResponse<CategoriesResponse>> {
    return this.request<CategoriesResponse>('/admin/categories');
  }

  async getInstructors(): Promise<ApiResponse<InstructorsResponse>> {
    return this.request<InstructorsResponse>('/admin/instructors');
  }

  async getUserEnrollments(userId: string): Promise<ApiResponse<UserEnrollmentsResponse>> {
    return this.request<UserEnrollmentsResponse>(`/admin/users/${userId}/enrollments`);
  }

  async grantCourseAccess(userId: string, courseId: string, expiresAt?: string): Promise<ApiResponse<{ message: string; enrollment: any }>> {
    return this.request<{ message: string; enrollment: any }>(`/admin/users/${userId}/enrollments`, {
      method: 'POST',
      body: JSON.stringify({ courseId, expiresAt }),
    });
  }

  async revokeCourseAccess(userId: string, enrollmentId: string): Promise<ApiResponse<{ message: string; courseTitle: string }>> {
    return this.request<{ message: string; courseTitle: string }>(`/admin/users/${userId}/enrollments/${enrollmentId}`, {
      method: 'DELETE',
    });
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
  Enrollment, 
  CoursesResponse, 
  EnrollmentsResponse,
  // Admin types
  AdminStats,
  AdminUser,
  AdminUsersResponse,
  AdminCourse,
  AdminCoursesResponse,
  CreateCourseData,
  Category,
  CategoriesResponse,
  Instructor,
  InstructorsResponse,
  UserEnrollment,
  UserEnrollmentsResponse
};