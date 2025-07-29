import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, Users, Star, PlayCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Course {
  id: string;
  title: string;
  description: string;
  instructor: string;
  duration: string;
  students: number;
  rating: number;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  thumbnail: string;
  price: number;
  modules: number;
  lessons: number;
}

const sampleCourses: Course[] = [
  {
    id: 'react-fundamentals',
    title: 'React Fundamentals',
    description: 'Learn the basics of React including components, props, state, and event handling.',
    instructor: 'John Doe',
    duration: '8h 30m',
    students: 1234,
    rating: 4.8,
    level: 'Beginner',
    thumbnail: '/placeholder.svg',
    price: 99,
    modules: 4,
    lessons: 24
  },
  {
    id: 'advanced-react',
    title: 'Advanced React Patterns',
    description: 'Master advanced React concepts like hooks, context, and performance optimization.',
    instructor: 'Jane Smith',
    duration: '12h 15m',
    students: 856,
    rating: 4.9,
    level: 'Advanced',
    thumbnail: '/placeholder.svg',
    price: 149,
    modules: 6,
    lessons: 36
  }
];

export const Courses = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">All Courses</h1>
          <p className="text-muted-foreground">
            Discover our comprehensive collection of programming courses
          </p>
        </div>

        {/* Courses Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sampleCourses.map((course) => (
            <Card key={course.id} className="group hover:shadow-lg transition-shadow">
              <div className="aspect-video bg-muted rounded-t-lg relative overflow-hidden">
                <img 
                  src={course.thumbnail} 
                  alt={course.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <PlayCircle className="h-12 w-12 text-white" />
                </div>
              </div>
              
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant={course.level === 'Beginner' ? 'secondary' : course.level === 'Intermediate' ? 'default' : 'destructive'}>
                    {course.level}
                  </Badge>
                  <div className="flex items-center space-x-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-medium">{course.rating}</span>
                  </div>
                </div>
                <CardTitle className="line-clamp-2">{course.title}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {course.description}
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    by {course.instructor}
                  </p>
                  
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>{course.duration}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Users className="h-4 w-4" />
                      <span>{course.students}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      {course.modules} modules • {course.lessons} lessons
                    </div>
                    <div className="text-lg font-bold">
                      ${course.price}
                    </div>
                  </div>

                  <Button asChild className="w-full">
                    <Link to={`/courses/${course.id}`}>
                      View Course
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};