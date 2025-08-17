import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient, type Course, type Lesson as ApiLesson } from '../lib/api';
import { useToast } from '../hooks/use-toast';
import { VideoPlayer } from './VideoPlayer';
import { CourseContent } from './CourseContent';
import { ChevronLeft, ChevronRight, BookOpen, Download, Star, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const LearningInterface = () => {
  const { courseId, moduleId, lessonId } = useParams<{
    courseId: string;
    moduleId: string;
    lessonId: string;
  }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [currentLesson, setCurrentLesson] = useState<ApiLesson | null>(null);
  const [lessonData, setLessonData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showNotes, setShowNotes] = useState(false);

  useEffect(() => {
    if (courseId && moduleId && lessonId) {
      loadCourseData();
    }
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
          
          // Load detailed lesson data
          try {
            const lessonResponse = await apiClient.getLesson(lessonId);
            if (lessonResponse.success && lessonResponse.data) {
              setLessonData(lessonResponse.data);
            }
          } catch (lessonError) {
            console.log('Could not load detailed lesson data:', lessonError);
          }
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

  const handleLessonSelect = (selectedLessonId: string) => {
    if (!course || !courseId) return;
    
    // Find the module containing this lesson
    for (const module of course.modules || []) {
      const lesson = module.lessons.find(l => l.id === selectedLessonId);
      if (lesson) {
        navigate(`/courses/${courseId}/modules/${module.id}/lessons/${selectedLessonId}`);
        return;
      }
    }
  };

  const handleProgress = async (progress: number) => {
    if (!lessonId) return;
    
    try {
      await apiClient.updateLessonProgress(lessonId, {
        watchTime: progress,
        lastPosition: progress,
      });
    } catch (error) {
      console.error('Failed to save progress:', error);
    }
  };

  const handleLessonComplete = async () => {
    if (!lessonId) return;
    
    try {
      await apiClient.updateLessonProgress(lessonId, {
        isCompleted: true,
      });
      
      toast({
        title: "Lesson Completed!",
        description: "Great job! You've completed this lesson.",
      });
    } catch (error) {
      console.error('Failed to mark lesson as completed:', error);
      toast({
        title: "Error",
        description: "Failed to save progress. Please try again.",
        variant: "destructive",
      });
    }
  };

  const goToPreviousLesson = () => {
    // TODO: Implement navigation to previous lesson
    console.log('Previous lesson');
  };

  const goToNextLesson = () => {
    // TODO: Implement navigation to next lesson
    console.log('Next lesson');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!course || !currentLesson) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Lesson not found</h1>
          <p className="text-gray-600 mb-4">The lesson you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/courses')}>
            ← Back to courses
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Course Content Sidebar */}
      <CourseContent 
        modules={course.modules || []}
        onLessonSelect={handleLessonSelect}
        currentLessonId={lessonId || ''}
      />

      {/* Main Learning Area */}
      <div className="flex-1 flex flex-col">
        {/* Video Section */}
        <div className="bg-gray-900 border-b border-gray-800">
          <div className="max-w-4xl mx-auto p-6">
            {lessonData?.videoUrl ? (
              <VideoPlayer
                videoId={lessonData.videoUrl}
                title={currentLesson.title}
                duration={currentLesson.videoDuration ? `${Math.ceil(currentLesson.videoDuration / 60)}min` : 'N/A'}
                onProgress={handleProgress}
                onComplete={handleLessonComplete}
              />
            ) : (
              <div className="bg-gray-200 rounded-lg flex items-center justify-center h-64">
                <div className="text-center">
                  <p className="text-gray-600">No video available for this lesson</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Content Section */}
        <div className="flex-1 max-w-4xl mx-auto w-full p-6">
          {/* Lesson Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold mb-2">{currentLesson.title}</h1>
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <BookOpen className="h-4 w-4" />
                    <span>Lesson content</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span>Duration: {currentLesson.videoDuration ? `${Math.ceil(currentLesson.videoDuration / 60)}min` : 'N/A'}</span>
                  </div>
                  <Badge variant="secondary">Learning</Badge>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowNotes(!showNotes)}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Notes
                </Button>
                <Button variant="outline" size="sm">
                  <Star className="h-4 w-4 mr-2" />
                  Bookmark
                </Button>
              </div>
            </div>
          </div>

          {/* Lesson Content Tabs */}
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="resources">Resources</TabsTrigger>
              <TabsTrigger value="discussion">Discussion</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Lesson Description */}
              <Card>
                <CardHeader>
                  <CardTitle>About this lesson</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    {currentLesson.description || lessonData?.description || 'No description available for this lesson.'}
                  </p>
                </CardContent>
              </Card>

              {/* Learning Objectives */}
              <Card>
                <CardHeader>
                  <CardTitle>What you'll learn</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-start space-x-2">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                      <span>How to create your first React component</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                      <span>Understanding component props and how to use them</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                      <span>Best practices for component organization</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                      <span>How to render components in your React application</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="resources" className="space-y-6">
              {/* Downloadable Resources */}
              <Card>
                <CardHeader>
                  <CardTitle>Downloads & Resources</CardTitle>
                  <CardDescription>
                    Download the source code and additional materials for this lesson
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {lessonData?.attachments && lessonData.attachments.length > 0 ? (
                    <div className="space-y-3">
                      {lessonData.attachments.map((attachment: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Download className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium text-sm">{attachment.fileName || attachment.title}</p>
                              <p className="text-xs text-muted-foreground uppercase">{attachment.fileType || 'file'}</p>
                            </div>
                          </div>
                          <Button size="sm" variant="outline" asChild>
                            <a href={attachment.fileUrl || attachment.url} target="_blank" rel="noopener noreferrer">
                              Download
                            </a>
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No additional resources for this lesson.</p>
                  )}
                </CardContent>
              </Card>

              {/* Additional Links */}
              <Card>
                <CardHeader>
                  <CardTitle>Additional Reading</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <a href="#" className="block text-primary hover:underline text-sm">
                      → Official React Documentation: Components
                    </a>
                    <a href="#" className="block text-primary hover:underline text-sm">
                      → React Best Practices Guide
                    </a>
                    <a href="#" className="block text-primary hover:underline text-sm">
                      → Component Design Patterns
                    </a>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="discussion" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Discussion</CardTitle>
                  <CardDescription>
                    Ask questions and discuss this lesson with other students
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Discussion features will be available when you connect to Supabase!</p>
                    <p className="text-sm mt-2">Students can ask questions, share insights, and help each other learn.</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-8 border-t border-gray-700 mt-8">
            <Button
              onClick={goToPreviousLesson}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Previous Lesson</span>
            </Button>

            <div className="text-center">
              <p className="text-sm text-muted-foreground">Lesson 3 of 12</p>
            </div>

            <Button
              onClick={goToNextLesson}
              className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-600"
            >
              <span>Next Lesson</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};