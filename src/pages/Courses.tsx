import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiClient, type Course } from '../lib/api';
import { useToast } from '../hooks/use-toast';
import { Clock, Users, Star, PlayCircle, Lock, Globe, Shield, Search, Filter, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AppLayout } from '../components/AppLayout';
import { LockedCourseModal } from '../components/LockedCourseModal';

// Using Course interface from API

interface CourseFilters {
  search: string;
  category: string;
  level: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export default function Courses() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<CourseFilters>({
    search: '',
    category: 'all',
    level: 'all',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  const [searchTerm, setSearchTerm] = useState(''); // Separate state for immediate UI updates
  const [isSearching, setIsSearching] = useState(false); // Show when search is debouncing
  const [lockedCourseModal, setLockedCourseModal] = useState<{
    isOpen: boolean;
    course: Course | null;
  }>({
    isOpen: false,
    course: null
  });

  useEffect(() => {
    loadCourses();
  }, [currentPage, filters]);

  // Debounced search effect
  useEffect(() => {
    if (searchTerm !== filters.search) {
      setIsSearching(true);
    }
    
    const debounceTimer = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchTerm }));
      setCurrentPage(1); // Reset to first page when searching
      setIsSearching(false);
    }, 300); // 300ms delay - faster response

    return () => {
      clearTimeout(debounceTimer);
      setIsSearching(false);
    };
  }, [searchTerm, filters.search]);

  const loadCourses = async () => {
    try {
      setLoading(true);
      
      const params = {
        page: currentPage,
        limit: 12,
        search: filters.search || undefined,
        category: filters.category !== 'all' ? filters.category : undefined,
        level: filters.level !== 'all' ? filters.level : undefined,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      };

      const response = await apiClient.getCourses(params);

      if (response.success && response.data) {
        setCourses(response.data.courses);
        setTotalPages(response.data.pagination.totalPages);
      } else {
        console.error('Failed to load courses:', response.error);
        toast({
          title: "Error",
          description: response.error || "Failed to load courses",
          variant: "destructive",
        });
        setCourses([]);
      }
    } catch (error) {
      console.error('Failed to load courses:', error);
      toast({
        title: "Error",
        description: "Failed to load courses. Please try again.",
        variant: "destructive",
      });
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCourseClick = (course: Course) => {
    if (!course.isPublished) {
      toast({
        title: "Course Not Available",
        description: "This course is not published yet. Please check back later.",
        variant: "destructive",
      });
      return;
    }

    // Check course access logic
    const canAccess = 
      course.price === 0 || // Free courses are accessible to everyone
      course.isEnrolled || // User is enrolled
      course.canAccess || // User has special access (assigned by admin)
      user?.role === 'ADMIN'; // Admins can access everything

    if (canAccess) {
      // User can access the course, navigate to course detail
      navigate(`/courses/${course.id}`);
    } else {
      // Show locked course modal for paid courses without access
      setLockedCourseModal({
        isOpen: true,
        course: course
      });
    }
  };

  const handleEnroll = async (courseId: string) => {
    try {
      const response = await apiClient.enrollInCourse(courseId);
      
      if (response.success) {
        toast({
          title: "Success",
          description: "Successfully enrolled in the course!",
        });
        
        // Close the modal and refresh courses
        setLockedCourseModal({ isOpen: false, course: null });
        await loadCourses(); // Refresh courses
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to enroll in course",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to enroll:', error);
      toast({
        title: "Error",
        description: "Failed to enroll in course. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Filtering is now handled by the API
  const displayedCourses = courses;

  const getVisibilityIcon = (price: number) => {
    return price === 0 ? <Globe className="w-4 h-4 text-green-500" /> : <Star className="w-4 h-4 text-orange-500" />;
  };

  const getVisibilityBadge = (price: number) => {
    return price === 0 ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800';
  };

  const getVisibilityText = (price: number) => {
    return price === 0 ? 'FREE' : 'PAID';
  };

  const getLevelBadge = (level?: string | null) => {
    if (!level) return 'bg-gray-100 text-gray-800';
    const normalizedLevel = level.toUpperCase();
    switch (normalizedLevel) {
      case 'BEGINNER': return 'bg-blue-100 text-blue-800';
      case 'INTERMEDIATE': return 'bg-yellow-100 text-yellow-800';
      case 'ADVANCED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatLevelText = (level?: string | null) => {
    if (!level) return 'Not specified';
    return level.charAt(0).toUpperCase() + level.slice(1).toLowerCase();
  };

  const formatCategoryName = (category?: { name?: string } | null) => {
    return category?.name || 'Uncategorized';
  };

  const formatEnrollmentCount = (count?: number) => {
    return count ? count.toLocaleString() : '0';
  };

  const formatRating = (rating?: number) => {
    return rating ? rating.toFixed(1) : '0.0';
  };

  const handleFilterChange = (key: keyof CourseFilters, value: string) => {
    if (key === 'search') {
      // Handle search with immediate UI update but debounced API call
      setSearchTerm(value);
    } else {
      // Handle other filters immediately
      setFilters(prev => ({ ...prev, [key]: value }));
      setCurrentPage(1); // Reset to first page when filtering
    }
  };

  const formatDuration = (duration?: number) => {
    if (!duration) return 'N/A';
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    return `${hours}h ${minutes}m`;
  };

  const formatInstructorName = (instructor?: { firstName?: string; lastName?: string; email?: string } | null) => {
    if (!instructor) return 'Course Admin';
    if (instructor.firstName && instructor.lastName) {
      return `${instructor.firstName} ${instructor.lastName}`;
    }
    return instructor.firstName || instructor.lastName || instructor.email || 'Course Admin';
  };

  // Don't show full loading screen to prevent jerking - instead show subtle loading state

  return (
    <AppLayout>
      {/* Header */}
      <div className="bg-gray-900 shadow-sm border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Course Catalog
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-300">
                Welcome, {user?.firstName || user?.email}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-6 py-8 bg-gray-800 min-h-screen">
        {/* Filters */}
        <div className="bg-gray-900 rounded-lg shadow-sm border border-gray-700 mb-8 p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search courses..."
                  value={searchTerm}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="w-full pl-10 pr-10 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {isSearching && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex gap-3">
              <select
                value={filters.level}
                onChange={(e) => handleFilterChange('level', e.target.value)}
                className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Levels</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>

              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="createdAt">Latest</option>
                <option value="title">Title</option>
                <option value="rating">Rating</option>
                <option value="enrollmentCount">Most Popular</option>
                <option value="price">Price</option>
              </select>
            </div>
          </div>
        </div>

        {/* Course Grid */}
        <div className="relative">
          {loading && (
            <div className="absolute inset-0 bg-gray-800 bg-opacity-50 flex items-center justify-center z-10 rounded-lg">
              <div className="bg-gray-900 px-4 py-2 rounded-lg shadow-lg border border-gray-700">
                <div className="flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                  <span className="text-white text-sm">Searching courses...</span>
                </div>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {displayedCourses.map((course) => (
            <div 
              key={course.id} 
              className="group relative cursor-pointer transition-all duration-300 hover:scale-[1.02]"
              onClick={() => handleCourseClick(course)}
            >
              {/* Course Card */}
              <div className="bg-gray-900 rounded-xl overflow-hidden shadow-lg">
                {/* Course Thumbnail */}
                <div className="relative aspect-[16/10] overflow-hidden">
                  <img 
                    src={course.thumbnailUrl || '/placeholder.svg'} 
                    alt={course.title}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Dark Overlay */}
                  <div className="absolute inset-0 bg-black bg-opacity-40"></div>
                  
                  {/* Lock Icon for Premium Courses */}
                  {course.price > 0 && !course.isEnrolled && (
                    <div className="absolute top-4 left-4">
                      <div className="w-12 h-12 bg-black bg-opacity-60 rounded-full flex items-center justify-center">
                        <Lock className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  )}
                  
                  {/* Course Level Badge */}
                  {course.level && (
                    <div className="absolute top-4 right-4">
                      <span className="px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full uppercase">
                        {formatLevelText(course.level)}
                      </span>
                    </div>
                  )}
                  
                  {/* Bottom Overlay Content */}
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    {/* Unlock Text for Premium Courses */}
                    {course.price > 0 && !course.isEnrolled ? (
                      <div className="text-center">
                        <p className="text-white text-lg font-semibold">Unlock this course</p>
                        <p className="text-gray-300 text-sm mt-1">${course.price}</p>
                      </div>
                    ) : (
                      /* Continue Learning for Enrolled/Free */
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-center">
                        <Button className="bg-white text-black hover:bg-gray-100 font-semibold">
                          <PlayCircle className="w-4 h-4 mr-2" />
                          {course.isEnrolled ? 'Continue Learning' : 'Start Learning'}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Course Info */}
                <div className="p-4">
                  {/* Course Title */}
                  <h3 className="text-white font-semibold text-lg mb-2 line-clamp-2 leading-tight">
                    {course.title}
                  </h3>
                  
                  {/* Category */}
                  {course.category && (
                    <div className="mb-3">
                      <span className="inline-block px-2 py-1 bg-gray-700 text-gray-300 text-xs font-medium rounded uppercase tracking-wide">
                        {formatCategoryName(course.category)}
                      </span>
                    </div>
                  )}
                  
                  {/* Course Stats */}
                  <div className="flex items-center justify-between text-sm text-gray-400">
                    <div className="flex items-center gap-3">
                      {course.rating && course.rating > 0 && (
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-current text-yellow-400" />
                          <span>{formatRating(course.rating)}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>{formatEnrollmentCount(course.enrollmentCount)}</span>
                      </div>
                    </div>
                    
                    {/* Enrolled Badge */}
                    {course.isEnrolled && (
                      <span className="px-2 py-1 bg-green-600 text-white text-xs font-medium rounded">
                        ✓ Enrolled
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          </div>
        </div>

        {/* Empty State */}
        {displayedCourses.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No courses found</h3>
            <p className="text-gray-400">Try adjusting your search criteria or filters.</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <Button
              variant="outline"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1 || loading}
            >
              Previous
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                if (pageNum > totalPages) return null;
                
                return (
                  <Button
                    key={pageNum}
                    variant={pageNum === currentPage ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                    disabled={loading}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="outline"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages || loading}
            >
              Next
            </Button>
          </div>
        )}
      </div>

      {/* Locked Course Modal */}
      <LockedCourseModal
        isOpen={lockedCourseModal.isOpen}
        onClose={() => setLockedCourseModal({ isOpen: false, course: null })}
        course={lockedCourseModal.course}
        onEnroll={() => handleEnroll(lockedCourseModal.course?.id || '')}
      />
    </AppLayout>
  );
}