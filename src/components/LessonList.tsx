import React from 'react';
import { Lock, Play, CheckCircle } from 'lucide-react';
import { type Module, type Lesson } from '../lib/api';

interface LessonListProps {
  modules?: Module[];
  currentLessonId: string;
  onLessonSelect: (lessonId: string) => void;
}

export const LessonList = ({
  modules,
  currentLessonId,
  onLessonSelect
}: LessonListProps) => {
  return (
    <div className="w-full">
      {modules.map((module) => (
        <div key={module.id} className="border-b border-gray-200 dark:border-gray-700 last:border-0">
          {/* Module Header */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              {module.title}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {module.description}
            </p>
            <div className="flex items-center mt-2 text-xs text-gray-500 dark:text-gray-400">
              <span>{module.lessons.length} lessons</span>
              <span className="mx-2">•</span>
              <span>
                {module.lessons.reduce((acc, lesson) => {
                  const duration = lesson.videoDuration || 0;
                  const mins = Math.ceil(duration / 60); // Convert seconds to minutes
                  return acc + mins;
                }, 0)} mins
              </span>
            </div>
          </div>

          {/* Lessons */}
          <div className="bg-white dark:bg-gray-900">
            {module.lessons.map((lesson, index) => (
              <button
                key={lesson.id}
                onClick={() => !lesson.isLocked && onLessonSelect(lesson.id)}
                className={`w-full flex items-center p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                  lesson.isCurrent ? 'bg-blue-50 dark:bg-blue-900/20 border-r-2 border-blue-500' : ''
                } ${lesson.isLocked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
              >
                <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
                  {lesson.isLocked ? (
                    <Lock className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  ) : lesson.isCompleted ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : lesson.isCurrent ? (
                    <Play className="w-4 h-4 text-blue-500" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-gray-300 dark:border-gray-600" />
                  )}
                </div>
                <div className="ml-4 flex-1 flex flex-col items-start">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Lesson {index + 1}
                  </span>
                  <span className={`text-sm mt-1 text-left ${
                    lesson.isCurrent
                      ? 'text-blue-600 dark:text-blue-400 font-medium'
                      : 'text-gray-900 dark:text-white'
                  }`}>
                    {lesson.title}
                  </span>
                </div>
                <div className="ml-4 flex-shrink-0">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {lesson.videoDuration ? `${Math.ceil(lesson.videoDuration / 60)}min` : 'N/A'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};