import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Clock, Users, Star, PlayCircle, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Breadcrumb, BreadcrumbEllipsis, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';

interface Lesson {
  id: string;
  title: string;
  duration: string;
  videoId: string;
}

interface Module {
  id: string;
  title: string;
  description: string;
  lessons: Lesson[];
  totalDuration: string;
}

interface CourseData {
  id: string;
  title: string;
  description: string;
  instructor: string;
  duration: string;
  students: number;
  rating: number;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  price: number;
  modules: Module[];
}

const sampleCourse: CourseData = {
  id: 'react-fundamentals',
  title: 'React Fundamentals',
  description: 'Learn the basics of React including components, props, state, and event handling. This comprehensive course will take you from beginner to confident React developer.',
  instructor: 'John Doe',
  duration: '8h 30m',
  students: 1234,
  rating: 4.8,
  level: 'Beginner',
  price: 99,
  modules: [
    {
      id: '1',
      title: 'Getting Started with React',
      description: 'Introduction to React and setting up your development environment',
      totalDuration: '2h 30m',
      lessons: [
        {
          id: '1',
          title: 'Introduction to React',
          duration: '15:30',
          videoId: '3qcpHQNAZds'
        },
        {
          id: '2',
          title: 'Setting up Development Environment',
          duration: '22:45',
          videoId: '3qcpHQNAZds'
        },
        {
          id: '3',
          title: 'Your First React Component',
          duration: '18:20',
          videoId: '3qcpHQNAZds'
        },
        {
          id: '4',
          title: 'Understanding JSX',
          duration: '25:15',
          videoId: '3qcpHQNAZds'
        }
      ]
    },
    {
      id: '2',
      title: 'React Fundamentals',
      description: 'Core concepts of React development',
      totalDuration: '3h 45m',
      lessons: [
        {
          id: '5',
          title: 'Props and State',
          duration: '28:30',
          videoId: '3qcpHQNAZds'
        },
        {
          id: '6',
          title: 'Event Handling',
          duration: '20:15',
          videoId: '3qcpHQNAZds'
        },
        {
          id: '7',
          title: 'Conditional Rendering',
          duration: '22:45',
          videoId: '3qcpHQNAZds'
        }
      ]
    }
  ]
};

export const Course = () => {
  const { courseId } = useParams();
  const [selectedModule, setSelectedModule] = useState<string>('');

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8">
        {/* Breadcrumb */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/courses">Courses</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{sampleCourse.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Course Header */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <Badge variant={sampleCourse.level === 'Beginner' ? 'secondary' : sampleCourse.level === 'Intermediate' ? 'default' : 'destructive'}>
                {sampleCourse.level}
              </Badge>
              <div className="flex items-center space-x-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-medium">{sampleCourse.rating}</span>
                <span className="text-sm text-muted-foreground">({sampleCourse.students} students)</span>
              </div>
            </div>
            
            <h1 className="text-3xl font-bold mb-4">{sampleCourse.title}</h1>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              {sampleCourse.description}
            </p>

            <div className="flex items-center space-x-6 text-sm text-muted-foreground">
              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>{sampleCourse.duration}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Users className="h-4 w-4" />
                <span>{sampleCourse.students} students</span>
              </div>
              <span>by {sampleCourse.instructor}</span>
            </div>
          </div>

          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">${sampleCourse.price}</CardTitle>
                <CardDescription>One-time purchase</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full mb-4">
                  Start Learning
                </Button>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>• Lifetime access</p>
                  <p>• {sampleCourse.modules.length} modules</p>
                  <p>• Certificate of completion</p>
                  <p>• 30-day money-back guarantee</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Course Content */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Course Content</h2>
          <div className="space-y-4">
            <Accordion type="multiple" className="w-full">
              {sampleCourse.modules.map((module, moduleIndex) => (
                <AccordionItem key={module.id} value={module.id}>
                  <AccordionTrigger className="text-left">
                    <div className="flex items-center justify-between w-full mr-4">
                      <div>
                        <h3 className="font-semibold">
                          Module {moduleIndex + 1}: {module.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {module.description}
                        </p>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {module.lessons.length} lessons • {module.totalDuration}
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 pt-4">
                      {module.lessons.map((lesson, lessonIndex) => (
                        <Link
                          key={lesson.id}
                          to={`/courses/${courseId}/modules/${module.id}/lessons/${lesson.id}`}
                          className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            <PlayCircle className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {lessonIndex + 1}. {lesson.title}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{lesson.duration}</span>
                            <ChevronRight className="h-4 w-4" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </div>
    </div>
  );
};