import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiClient, type Course, type Lesson as ApiLesson } from '../lib/api';
import { useToast } from '../hooks/use-toast';
import { VideoPlayer } from '../components/VideoPlayer';
import { LessonList } from '../components/LessonList';
import { AppLayout } from '../components/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Breadcrumb, 
  BreadcrumbItem, 
  BreadcrumbLink, 
  BreadcrumbList, 
  BreadcrumbPage, 
  BreadcrumbSeparator 
} from '@/components/ui/breadcrumb';
import { Clock, Users, BookOpen, ArrowLeft, Lock, Play } from 'lucide-react';

// Using Course and Lesson interfaces from API

export function Lesson() {
  const { courseId, moduleId, lessonId } = useParams<{
    courseId: string;
    moduleId: string;
    lessonId: string;
  }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [course, setCourse] = useState<Course | null>(null);
  const [currentLesson, setCurrentLesson] = useState<ApiLesson | null>(null);
  const [lessonData, setLessonData] = useState<any>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCourseData();
  }, [courseId, moduleId, lessonId]);

  const loadCourseData = async () => {
    if (!courseId || !moduleId || !lessonId) return;
    
    try {
      setLoading(true);
      
      // Load course content with modules and lessons
      const courseResponse = await apiClient.getCourseContent(courseId);
      
      if (courseResponse.success && courseResponse.data) {
        setCourse(courseResponse.data);
        
        // Find the current lesson
        const currentModule = courseResponse.data.modules?.find(m => m.id === moduleId);
        const lesson = currentModule?.lessons.find(l => l.id === lessonId);
        
        if (lesson) {
          setCurrentLesson(lesson);
          setLessonData(lesson); // Use lesson data from course content
        } else {
          toast({
            title: "Lesson Not Found",
            description: "The lesson you're looking for doesn't exist.",
            variant: "destructive",
          });
          navigate(`/courses/${courseId}`);
        }
      } else {
        toast({
          title: "Error",
          description: courseResponse.error || "Failed to load course",
          variant: "destructive",
        });
        navigate('/courses');
      }
    } catch (error) {
      console.error('Failed to load course data:', error);
      toast({
        title: "Error",
        description: "Failed to load course. Please try again.",
        variant: "destructive",
      });
      navigate('/courses');
    } finally {
      setLoading(false);
    }
  };

  const handleProgress = async (progress: number) => {
    if (!lessonId) return;
    
    // TODO: Implement lesson progress tracking API
    console.log('Progress update:', { lessonId, progress });
  };

  const handleLessonComplete = async () => {
    if (!lessonId) return;
    
    // TODO: Implement lesson completion API
    console.log('Lesson completed:', { lessonId });
    
    toast({
      title: "Lesson Completed!",
      description: "Great job! You've completed this lesson.",
    });
  };

  const handleLessonSelect = (selectedLessonId: string) => {
    if (!course || !courseId) return;
    
    // Find the module containing this lesson
    for (const module of course.modules || []) {
      const lesson = module.lessons.find(l => l.id === selectedLessonId);
      if (lesson) {
        // Check if lesson is free or user has access
        if (!lesson.isFree && !course.isEnrolled) {
          toast({
            title: "Premium Content",
            description: "This lesson requires enrollment to access.",
            variant: "destructive",
          });
          return;
        }
        navigate(`/courses/${courseId}/modules/${module.id}/lessons/${selectedLessonId}`);
        return;
      }
    }
  };



  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Check access based on enrollment status and lesson type
  const hasAccess = course?.price === 0 || course?.isEnrolled || currentLesson?.isFree || user?.role === 'ADMIN';

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Required</h1>
            <p className="text-gray-600 mb-6">
              You need to enroll in this course to access this lesson content.
            </p>
            <button 
              onClick={() => navigate(`/courses/${courseId}`)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Course
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentLesson) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Lesson not found</h1>
          <p className="text-gray-600 mb-4">The lesson you're looking for doesn't exist.</p>
          <button 
            onClick={() => navigate(`/courses/${courseId}`)}
            className="text-blue-600 hover:text-blue-700"
          >
            ← Back to course
          </button>
        </div>
      </div>
    );
  }

  return (
    <AppLayout>
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header/Breadcrumb */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink 
                  href="/courses" 
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  Courses
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink 
                  href={`/courses/${courseId}`}
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  {course.title}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="text-gray-900 dark:text-white font-medium">
                  {currentLesson.title}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Content Container */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full flex flex-col lg:flex-row">
            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6">
                {/* Video Player */}
                <div className="mb-6">
                  {lessonData?.videoUrl ? (
                    <VideoPlayer
                      videoId={lessonData.videoUrl}
                      title={currentLesson.title}
                      duration={currentLesson.videoDuration ? `${Math.ceil(currentLesson.videoDuration / 60)}min` : 'N/A'}
                      coverImage="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=450&fit=crop"
                      onProgress={handleProgress}
                      onComplete={handleLessonComplete}
                    />
                  ) : (
                    <div className="bg-gray-200 rounded-lg flex items-center justify-center h-64">
                      <div className="text-center">
                        <Play className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">No video available for this lesson</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Lesson Content */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
                  <Tabs defaultValue="overview" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 bg-gray-100 dark:bg-gray-700">
                      <TabsTrigger value="overview" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800">
                        Overview
                      </TabsTrigger>
                      <TabsTrigger value="resources" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800">
                        Resources
                      </TabsTrigger>
                      <TabsTrigger value="discussion" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800">
                        Discussion
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="overview" className="p-6">
                      <div className="space-y-6">
                        <div>
                          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            {currentLesson.title}
                          </h2>
                          <p className="text-gray-600 dark:text-gray-300">
                            {currentLesson.description || lessonData?.description || 'Lesson description goes here...'}
                          </p>
                        </div>

                        <div className="flex items-center space-x-6 text-sm text-gray-500 dark:text-gray-400">
                          <div className="flex items-center space-x-1">
                            <Clock className="h-4 w-4" />
                            <span>Duration: {currentLesson.videoDuration ? `${Math.ceil(currentLesson.videoDuration / 60)}min` : 'N/A'}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <BookOpen className="h-4 w-4" />
                            <span>Course: {course?.title}</span>
                          </div>
                          {currentLesson.isFree && (
                            <div className="flex items-center space-x-1">
                              <Users className="h-4 w-4" />
                              <span className="text-green-600">Free Preview</span>
                            </div>
                          )}
                        </div>

                        <div className="prose dark:prose-invert max-w-none">
                          {lessonData?.content ? (
                            <div dangerouslySetInnerHTML={{ __html: lessonData.content }} />
                          ) : (
                            <>
                              <h3>What you'll learn</h3>
                              <ul>
                                <li>Understanding the core concepts covered in this lesson</li>
                                <li>Practical implementation techniques</li>
                                <li>Best practices and common pitfalls to avoid</li>
                                <li>Real-world applications and examples</li>
                              </ul>
                              
                              <h3>Prerequisites</h3>
                              <p>
                                Make sure you have completed the previous lessons in this module before proceeding.
                                This lesson builds upon concepts introduced earlier in the course.
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="resources" className="p-6">
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Additional Resources
                        </h3>
                        {lessonData?.attachments && lessonData.attachments.length > 0 ? (
                          <div className="space-y-3">
                            {lessonData.attachments.map((attachment: any, index: number) => (
                              <div key={index} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <h4 className="font-medium text-gray-900 dark:text-white">{attachment.title || attachment.filename}</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                  {attachment.description || 'Download this resource'}
                                </p>
                                {attachment.url && (
                                  <a 
                                    href={attachment.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                                  >
                                    Download
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                              <h4 className="font-medium text-gray-900 dark:text-white">No Resources Available</h4>
                              <p className="text-sm text-gray-600 dark:text-gray-300">
                                No additional resources are available for this lesson yet.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="discussion" className="p-6">
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Discussion & Q&A
                        </h3>
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                          <p>Discussion forum coming soon...</p>
                          <p className="text-sm mt-2">
                            You'll be able to ask questions and discuss this lesson with other students.
                          </p>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            </div>

            {/* Lesson List Sidebar */}
            <div className="w-full lg:w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 overflow-y-auto">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Course Content
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {course.modules?.length || 0} modules • {course.modules?.reduce((acc, m) => acc + m.lessons.length, 0) || 0} lessons
                </p>
              </div>
              <LessonList 
                modules={course.modules || []}
                currentLessonId={lessonId || ''}
                onLessonSelect={handleLessonSelect}
              />
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}