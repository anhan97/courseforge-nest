import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiClient, type Course } from '../lib/api';
import { useToast } from '../hooks/use-toast';
import { 
  Play, 
  Clock, 
  Users, 
  Star, 
  BookOpen, 
  CheckCircle, 
  Lock, 
  Globe,
  ArrowLeft,
  PlayCircle,
  User,
  Calendar,
  Target,
  Award
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AppLayout } from '../components/AppLayout';

// Using Course, Module, and Lesson interfaces from API

export default function CourseDetail() {
  const { courseId } = useParams<{ courseId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollment, setEnrollment] = useState<any>(null);

  useEffect(() => {
    loadCourse();
  }, [courseId]);

  const loadCourse = async () => {
    if (!courseId) return;
    
    try {
      setLoading(true);
      
      // Load course details with content
      const courseResponse = await apiClient.getCourseContent(courseId);
      
      if (courseResponse.success && courseResponse.data) {
        setCourse(courseResponse.data);
        
        // Check if user is enrolled and load enrollment details
        if (user?.role === 'STUDENT') {
          try {
            const enrollmentsResponse = await apiClient.getMyEnrollments();
            if (enrollmentsResponse.success && enrollmentsResponse.data) {
              const userEnrollment = enrollmentsResponse.data.enrollments.find(
                e => e.course.id === courseId && e.status === 'ACTIVE'
              );
              if (userEnrollment) {
                setEnrollment(userEnrollment);
              }
            }
          } catch (enrollmentError) {
            console.log('No enrollment found or error loading enrollment:', enrollmentError);
          }
        }
      } else {
        toast({
          title: "Error",
          description: courseResponse.error || "Failed to load course",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to load course:', error);
      toast({
        title: "Error",
        description: "Failed to load course. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!courseId) return;
    
    try {
      setEnrolling(true);
      
      const response = await apiClient.enrollInCourse(courseId);
      
      if (response.success && response.data) {
        toast({
          title: "Success",
          description: "Successfully enrolled in the course!",
        });
        
        // Update course state to reflect enrollment
        if (course) {
          setCourse({ ...course, isEnrolled: true });
        }
        
        // Set enrollment data
        setEnrollment(response.data.enrollment);
        
        // Reload course to get updated data
        await loadCourse();
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
    } finally {
      setEnrolling(false);
    }
  };

  const handleLessonClick = (moduleId: string, lessonId: string) => {
    if (!course?.canAccess && !course?.isEnrolled) {
      toast({
        title: "Access Required",
        description: "You need to enroll in this course to access the content.",
        variant: "destructive",
      });
      return;
    }
    
    const lesson = course?.modules
      ?.find(m => m.id === moduleId)
      ?.lessons.find(l => l.id === lessonId);
    
    if (!lesson) {
      toast({
        title: "Error",
        description: "Lesson not found.",
        variant: "destructive",
      });
      return;
    }
    
    // Check if it's a free lesson or user has access
    if (!lesson.isFree && !course?.isEnrolled) {
      toast({
        title: "Premium Content",
        description: "This lesson requires enrollment to access.",
        variant: "destructive",
      });
      return;
    }
    
    navigate(`/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}`);
  };

  const handleContinueLearning = () => {
    // Find the first lesson (for simplicity, start with the first available lesson)
    if (course?.modules && course.modules.length > 0) {
      const firstModule = course.modules[0];
      if (firstModule.lessons && firstModule.lessons.length > 0) {
        const firstLesson = firstModule.lessons[0];
        navigate(`/courses/${courseId}/modules/${firstModule.id}/lessons/${firstLesson.id}`);
      }
    } else {
      toast({
        title: "No Content",
        description: "This course doesn't have any lessons yet.",
        variant: "destructive",
      });
    }
  };

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Course not found</h1>
          <p className="text-gray-600 mb-4">The course you're looking for doesn't exist.</p>
          <Link to="/courses" className="text-blue-600 hover:text-blue-700">
            ← Back to courses
          </Link>
        </div>
      </div>
    );
  }

  // For paid courses, show access based on enrollment status or admin role
  const hasAccess = course.price === 0 || course.isEnrolled || user?.role === 'ADMIN';

  return (
    <AppLayout>
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link 
            to="/courses" 
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors duration-200 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Courses
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Course Header */}
            <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
              <div className="flex items-start gap-4">
                <img 
                  src={course.thumbnailUrl || '/placeholder.svg'} 
                  alt={course.title}
                  className="w-24 h-24 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${getVisibilityBadge(course.price)}`}>
                      {getVisibilityIcon(course.price)}
                      {getVisibilityText(course.price)}
                    </span>
                    <Badge variant="secondary" className={`text-xs ${getLevelBadge(course.level)}`}>
                      {formatLevelText(course.level)}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {formatCategoryName(course.category)}
                    </Badge>
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">{course.title}</h1>
                  <p className="text-gray-600 mb-4">{course.description}</p>
                  
                  <div className="flex items-center gap-6 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      {formatInstructorName(course.instructor)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {formatDuration(course.duration)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {formatEnrollmentCount(course.enrollmentCount)} students
                    </div>
                    {course.rating && course.rating > 0 && (
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-current text-yellow-400" />
                        {formatRating(course.rating)} ({course.reviewCount || 0})
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Course Progress (if enrolled) */}
            {enrollment && (
              <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Progress</h2>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Course Completion</span>
                      <span className="text-sm text-gray-500">{enrollment.completionPercentage}%</span>
                    </div>
                    <Progress value={enrollment.completionPercentage} className="h-2" />
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">
                        {new Date(enrollment.enrolledAt).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-gray-500">Enrolled Date</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-600">
                        {enrollment.status}
                      </div>
                      <div className="text-sm text-gray-500">Status</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Course Modules */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900">Course Content</h2>
              {course.modules && course.modules.length > 0 ? (
                course.modules.map((module, moduleIndex) => (
                  <Card key={module.id} className="overflow-hidden">
                    <CardHeader className="bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">
                            Module {moduleIndex + 1}: {module.title}
                          </CardTitle>
                          {module.description && (
                            <p className="text-sm text-gray-600 mt-1">{module.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">
                            {module.lessons.length} lesson{module.lessons.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="divide-y divide-gray-200">
                        {module.lessons.map((lesson, lessonIndex) => (
                          <div 
                            key={lesson.id}
                            className={`flex items-center p-4 hover:bg-gray-50 cursor-pointer ${
                              !lesson.isFree && !course.isEnrolled ? 'opacity-60' : ''
                            }`}
                            onClick={() => handleLessonClick(module.id, lesson.id)}
                          >
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center mr-3">
                              {!lesson.isFree && !course.isEnrolled ? (
                                <Lock className="w-4 h-4 text-gray-400" />
                              ) : (
                                <PlayCircle className="w-4 h-4 text-blue-500" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-gray-900">
                                  {lessonIndex + 1}. {lesson.title}
                                </h4>
                                {lesson.isFree && (
                                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                    Free
                                  </Badge>
                                )}
                              </div>
                              {lesson.description && (
                                <p className="text-sm text-gray-600">{lesson.description}</p>
                              )}
                            </div>
                            <span className="text-sm text-gray-500">
                              {lesson.videoDuration ? `${Math.ceil(lesson.videoDuration / 60)}min` : 'N/A'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8">
                  <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Content Yet</h3>
                  <p className="text-gray-600">This course doesn't have any modules or lessons yet.</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              {/* Enrollment Card */}
              <Card className="mb-6">
                <CardContent className="p-6">
                  {course.isEnrolled || enrollment ? (
                    <div className="space-y-4">
                      <Button 
                        onClick={handleContinueLearning}
                        className="w-full bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-black transition-all duration-200"
                        size="lg"
                        disabled={!course.modules || course.modules.length === 0}
                      >
                        <PlayCircle className="w-4 h-4 mr-2" />
                        {!course.modules || course.modules.length === 0 ? 'No Content Available' : 'Continue Learning'}
                      </Button>
                      <div className="text-center text-sm text-gray-500">
                        You're enrolled in this course
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="text-center">
                        {course.price > 0 ? (
                          <div>
                            <div className="text-3xl font-bold text-gray-900">${course.price}</div>
                            {course.originalPrice && course.originalPrice > course.price && (
                              <div className="text-lg text-gray-500 line-through">${course.originalPrice}</div>
                            )}
                          </div>
                        ) : (
                          <div className="text-3xl font-bold text-green-600">Free</div>
                        )}
                      </div>
                      <Button 
                        onClick={handleEnroll}
                        disabled={enrolling}
                        className="w-full bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-black transition-all duration-200"
                        size="lg"
                      >
                        {enrolling ? 'Enrolling...' : course.price > 0 ? `Enroll - $${course.price}` : 'Enroll Free'}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Course Admin Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Course Admin</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                      <User className="w-6 h-6 text-gray-500" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{formatInstructorName(course.instructor)}</h4>
                      <p className="text-sm text-gray-600">Course Administrator</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
        </div>
      </div>
    </AppLayout>
  );
}