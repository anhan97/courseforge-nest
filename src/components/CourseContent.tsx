import React from 'react';
import { CheckCircle, Circle, Lock, PlayCircle, Clock, FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface Lesson {
  id: string;
  title: string;
  duration: string;
  isCompleted: boolean;
  isCurrent: boolean;
  isLocked: boolean;
  isFree: boolean;
  hasAttachments?: boolean;
}

interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
  totalDuration: string;
  completedLessons: number;
}

interface CourseContentProps {
  modules: Module[];
  onLessonSelect: (lessonId: string) => void;
  currentLessonId?: string;
}

const sampleModules: Module[] = [
  {
    id: '1',
    title: 'Getting Started with React',
    totalDuration: '2h 30m',
    completedLessons: 2,
    lessons: [
      {
        id: '1',
        title: 'Introduction to React',
        duration: '15:30',
        isCompleted: true,
        isCurrent: false,
        isLocked: false,
        isFree: true,
        hasAttachments: true
      },
      {
        id: '2',
        title: 'Setting up Development Environment',
        duration: '22:45',
        isCompleted: true,
        isCurrent: false,
        isLocked: false,
        isFree: false,
        hasAttachments: true
      },
      {
        id: '3',
        title: 'Your First React Component',
        duration: '18:20',
        isCompleted: false,
        isCurrent: true,
        isLocked: false,
        isFree: false,
        hasAttachments: false
      },
      {
        id: '4',
        title: 'Understanding JSX',
        duration: '25:15',
        isCompleted: false,
        isCurrent: false,
        isLocked: false,
        isFree: false
      }
    ]
  },
  {
    id: '2',
    title: 'React Fundamentals',
    totalDuration: '3h 45m',
    completedLessons: 0,
    lessons: [
      {
        id: '5',
        title: 'Props and State',
        duration: '28:30',
        isCompleted: false,
        isCurrent: false,
        isLocked: false,
        isFree: false
      },
      {
        id: '6',
        title: 'Event Handling',
        duration: '20:15',
        isCompleted: false,
        isCurrent: false,
        isLocked: true,
        isFree: false
      }
    ]
  }
];

export const CourseContent = ({ 
  modules = sampleModules, 
  onLessonSelect,
  currentLessonId 
}: CourseContentProps) => {
  const getTotalProgress = () => {
    const totalLessons = modules.reduce((acc, module) => acc + module.lessons.length, 0);
    const completedLessons = modules.reduce((acc, module) => acc + module.completedLessons, 0);
    return Math.round((completedLessons / totalLessons) * 100);
  };

  const renderLessonIcon = (lesson: Lesson) => {
    if (lesson.isCompleted) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    if (lesson.isCurrent) {
      return <PlayCircle className="h-4 w-4 text-purple-500" />;
    }
    if (lesson.isLocked) {
      return <Lock className="h-4 w-4 text-gray-500" />;
    }
    return <Circle className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="w-80 bg-gray-900 border-r border-gray-800 flex flex-col h-screen">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <h2 className="font-semibold text-lg mb-2">Course Content</h2>
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Progress</span>
            <span>{getTotalProgress()}% Complete</span>
          </div>
          <Progress value={getTotalProgress()} className="h-2" />
        </div>
      </div>

      {/* Course Modules */}
      <div className="flex-1 overflow-y-auto">
        {modules.map((module, moduleIndex) => (
          <div key={module.id} className="border-b border-gray-700">
            {/* Module Header */}
            <div className="p-4 bg-gray-800">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-sm">
                  Module {moduleIndex + 1}: {module.title}
                </h3>
                <Badge variant="secondary" className="text-xs">
                  {module.completedLessons}/{module.lessons.length}
                </Badge>
              </div>
              <div className="flex items-center text-xs text-muted-foreground space-x-4">
                <div className="flex items-center space-x-1">
                  <Clock className="h-3 w-3" />
                  <span>{module.totalDuration}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <CheckCircle className="h-3 w-3" />
                  <span>{module.completedLessons} completed</span>
                </div>
              </div>
            </div>

            {/* Module Lessons */}
            <div className="space-y-1 p-2">
              {module.lessons.map((lesson, lessonIndex) => (
                <div key={lesson.id}>
                  <Button
                    onClick={() => !lesson.isLocked && onLessonSelect(lesson.id)}
                    variant="ghost"
                    className={`w-full justify-start p-3 h-auto text-left transition-all duration-200 ${
                      lesson.isCurrent 
                        ? 'bg-purple-500/10 border border-purple-500/20' 
                        : lesson.isCompleted 
                        ? 'bg-green-500/5' 
                        : 'hover:bg-muted'
                    } ${lesson.isLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    disabled={lesson.isLocked}
                  >
                    <div className="flex items-start space-x-3 w-full">
                      <div className="flex-shrink-0 mt-0.5">
                        {renderLessonIcon(lesson)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className={`text-sm font-medium truncate ${
                            lesson.isCurrent ? 'text-primary' : 'text-foreground'
                          }`}>
                            {lessonIndex + 1}. {lesson.title}
                          </p>
                          {lesson.isFree && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              Free
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{lesson.duration}</span>
                          </div>
                          
                          {lesson.hasAttachments && (
                            <div className="flex items-center space-x-1">
                              <FileText className="h-3 w-3 text-muted-foreground" />
                              <Download className="h-3 w-3 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-700 bg-gray-800">
        <div className="text-xs text-muted-foreground text-center">
          💡 Tip: Complete lessons to unlock the next module
        </div>
      </div>
    </div>
  );
};