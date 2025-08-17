import React from 'react';
import { PlayCircle, Clock, FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface Lesson {
  id: string;
  title: string;
  videoDuration?: number;
  isFree?: boolean;
  description?: string;
}

interface Module {
  id: string;
  title: string;
  description?: string;
  lessons: Lesson[];
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
    lessons: [
      {
        id: '1',
        title: 'Introduction to React',
        duration: '15:30',
        isCurrent: false,
        hasAttachments: true
      },
      {
        id: '2',
        title: 'Setting up Development Environment',
        duration: '22:45',
        isCurrent: false,
        hasAttachments: true
      },
      {
        id: '3',
        title: 'Your First React Component',
        duration: '18:20',
        isCurrent: true,
        hasAttachments: false
      },
      {
        id: '4',
        title: 'Understanding JSX',
        duration: '25:15',
        isCurrent: false
      }
    ]
  },
  {
    id: '2',
    title: 'React Fundamentals',
    totalDuration: '3h 45m',
    lessons: [
      {
        id: '5',
        title: 'Props and State',
        duration: '28:30',
        isCurrent: false
      },
      {
        id: '6',
        title: 'Event Handling',
        duration: '20:15',
        isCurrent: false
      }
    ]
  }
];

export const CourseContent = ({ 
  modules, 
  onLessonSelect,
  currentLessonId 
}: CourseContentProps) => {
  const getTotalProgress = () => {
    const totalLessons = modules.reduce((acc, module) => acc + module.lessons.length, 0);
    const currentLessonIndex = modules.flatMap(m => m.lessons).findIndex(l => l.id === currentLessonId);
    return currentLessonIndex >= 0 ? Math.round(((currentLessonIndex + 1) / totalLessons) * 100) : 0;
  };

  const renderLessonIcon = (lesson: Lesson) => {
    const isCurrent = lesson.id === currentLessonId;
    if (isCurrent) {
      return <PlayCircle className="h-4 w-4 text-purple-500" />;
    }
    return <PlayCircle className="h-4 w-4 text-muted-foreground" />;
  };

  const formatDuration = (duration?: number) => {
    if (!duration) return 'N/A';
    const minutes = Math.ceil(duration / 60);
    return `${minutes}min`;
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
      <div className="flex-1 overflow-y-auto p-4">
        <Accordion type="multiple" className="w-full">
          {modules.map((module, moduleIndex) => (
            <AccordionItem key={module.id} value={module.id} className="border-gray-700">
              <AccordionTrigger className="text-left py-4">
                <div className="flex items-center justify-between w-full mr-4">
                  <div>
                    <h3 className="font-medium text-sm">
                      Module {moduleIndex + 1}: {module.title}
                    </h3>
                  </div>
                  <div className="flex items-center text-xs text-muted-foreground space-x-4">
                    <Badge variant="secondary" className="text-xs">
                      {module.lessons.length} lessons
                    </Badge>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-1">
                  {module.lessons.map((lesson, lessonIndex) => (
                    <Button
                      key={lesson.id}
                      onClick={() => onLessonSelect(lesson.id)}
                      variant="ghost"
                      className={`w-full justify-start p-3 h-auto text-left transition-all duration-200 ${
                        lesson.id === currentLessonId 
                          ? 'bg-purple-500/10 border border-purple-500/20' 
                          : 'hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-start space-x-3 w-full">
                        <div className="flex-shrink-0 mt-0.5">
                          {renderLessonIcon(lesson)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className={`text-sm font-medium truncate ${
                              lesson.id === currentLessonId ? 'text-primary' : 'text-foreground'
                            }`}>
                              {lessonIndex + 1}. {lesson.title}
                            </p>
                            {lesson.isFree && (
                              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                Free
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>{formatDuration(lesson.videoDuration)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
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