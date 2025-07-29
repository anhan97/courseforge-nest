import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { VideoPlayer } from '@/components/VideoPlayer';
import { CourseContent } from '@/components/CourseContent';
import { ChevronLeft, ChevronRight, BookOpen, Download, Star, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';

interface LessonData {
  id: string;
  title: string;
  description: string;
  videoId: string;
  duration: string;
  attachments?: Array<{
    name: string;
    url: string;
    type: string;
  }>;
}

// Sample lesson data
const currentLesson: LessonData = {
  id: '3',
  title: 'Your First React Component',
  description: 'Learn how to create your first React component from scratch. In this lesson, we\'ll cover the basics of component creation, props, and how to render components in your application.',
  videoId: '3qcpHQNAZds',
  duration: '18:20',
  attachments: [
    {
      name: 'Component-Starter-Code.zip',
      url: '#',
      type: 'zip'
    },
    {
      name: 'React-Components-Guide.pdf',
      url: '#',
      type: 'pdf'
    }
  ]
};

export const Lesson = () => {
  const { courseId, moduleId, lessonId } = useParams();
  const [currentLessonId, setCurrentLessonId] = useState(lessonId || '3');
  const [showNotes, setShowNotes] = useState(false);

  const handleLessonSelect = (newLessonId: string) => {
    setCurrentLessonId(newLessonId);
    // In a real app, you'd navigate to the new lesson route
  };

  const handleProgress = (progress: number) => {
    console.log(`Lesson progress: ${progress}%`);
  };

  const handleLessonComplete = () => {
    console.log('Lesson completed!');
  };

  const goToPreviousLesson = () => {
    console.log('Previous lesson');
  };

  const goToNextLesson = () => {
    console.log('Next lesson');
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Course Content Sidebar */}
      <CourseContent 
        modules={[]} // Will use default sample data
        onLessonSelect={handleLessonSelect}
        currentLessonId={currentLessonId}
      />

      {/* Main Learning Area */}
      <div className="flex-1 flex flex-col">
        {/* Breadcrumb */}
        <div className="bg-gray-900 border-b border-gray-800 px-6 py-3">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/courses">Courses</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to={`/courses/${courseId}`}>React Fundamentals</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Getting Started with React</BreadcrumbPage>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{currentLesson.title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Video Section */}
        <div className="bg-gray-900 border-b border-gray-800">
          <div className="max-w-4xl mx-auto p-6">
            <VideoPlayer
              videoId={currentLesson.videoId}
              title={currentLesson.title}
              duration={currentLesson.duration}
              onProgress={handleProgress}
              onComplete={handleLessonComplete}
            />
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
                    <span>Lesson 3 of 12</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span>Duration: {currentLesson.duration}</span>
                  </div>
                  <Badge variant="secondary">In Progress</Badge>
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
                    {currentLesson.description}
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
                  {currentLesson.attachments && currentLesson.attachments.length > 0 ? (
                    <div className="space-y-3">
                      {currentLesson.attachments.map((attachment, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Download className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium text-sm">{attachment.name}</p>
                              <p className="text-xs text-muted-foreground uppercase">{attachment.type} file</p>
                            </div>
                          </div>
                          <Button size="sm" variant="outline">
                            Download
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