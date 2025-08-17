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
  CreateCourseData
};