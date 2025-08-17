import React from 'react';
import { X, Lock, Star, Users, Clock, CheckCircle } from 'lucide-react';
import { Course } from '../lib/api';

interface LockedCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: Course | null;
  onEnroll?: () => void;
}

export function LockedCourseModal({ isOpen, onClose, course, onEnroll }: LockedCourseModalProps) {
  if (!isOpen || !course) return null;

  const formatPrice = (price: number) => {
    return price > 0 ? `$${price.toFixed(2)}` : 'Free';
  };

  const formatDuration = (duration?: number) => {
    if (!duration) return 'Self-paced';
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    return `${hours}h ${minutes}m`;
  };

  const handleEnroll = () => {
    if (onEnroll) {
      onEnroll();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header with course image */}
        <div className="relative">
          <img
            src={course.thumbnailUrl || '/placeholder.svg'}
            alt={course.title}
            className="w-full h-48 object-cover"
          />
          <div className="absolute top-4 right-4">
            <button
              onClick={onClose}
              className="bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent"></div>
          <div className="absolute bottom-4 left-4 text-white">
            <div className="flex items-center mb-2">
              <Lock className="w-5 h-5 mr-2" />
              <span className="text-sm font-medium">Premium Course</span>
            </div>
            <h2 className="text-2xl font-bold">{course.title}</h2>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Course stats */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-6 text-sm text-gray-600">
              {course.rating && course.rating > 0 && (
                <div className="flex items-center">
                  <Star className="w-4 h-4 text-yellow-400 mr-1 fill-current" />
                  <span className="font-medium">{course.rating.toFixed(1)}</span>
                  <span className="ml-1">({course.reviewCount || 0} reviews)</span>
                </div>
              )}
              <div className="flex items-center">
                <Users className="w-4 h-4 mr-1" />
                <span>{course.enrollmentCount || 0} students</span>
              </div>
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                <span>{formatDuration(course.duration)}</span>
              </div>
            </div>
            <div className="text-right">
              {course.originalPrice && course.originalPrice > course.price && (
                <div className="text-sm text-gray-500 line-through">
                  ${course.originalPrice.toFixed(2)}
                </div>
              )}
              <div className="text-2xl font-bold text-green-600">
                {formatPrice(course.price)}
              </div>
            </div>
          </div>

          {/* Course description */}
          {course.shortDescription && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">About this course</h3>
              <p className="text-gray-600">{course.shortDescription}</p>
            </div>
          )}

          {/* What you'll learn */}
          {course.whatYouLearn && course.whatYouLearn.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">What you'll learn</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {course.whatYouLearn.slice(0, 6).map((item, index) => (
                  <div key={index} className="flex items-start">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{item}</span>
                  </div>
                ))}
              </div>
              {course.whatYouLearn.length > 6 && (
                <p className="text-sm text-gray-500 mt-2">
                  +{course.whatYouLearn.length - 6} more learning outcomes
                </p>
              )}
            </div>
          )}

          {/* Requirements */}
          {course.requirements && course.requirements.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">Requirements</h3>
              <ul className="space-y-1">
                {course.requirements.map((requirement, index) => (
                  <li key={index} className="text-sm text-gray-600 flex items-start">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2 mt-2 flex-shrink-0"></span>
                    {requirement}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Course details */}
          <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">Level</h4>
              <p className="text-sm font-medium">{course.level || 'All levels'}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">Language</h4>
              <p className="text-sm font-medium">{course.language || 'English'}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">Category</h4>
              <p className="text-sm font-medium">{course.category?.name || 'General'}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">Access</h4>
              <p className="text-sm font-medium">Lifetime access</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex space-x-3">
            <button
              onClick={handleEnroll}
              className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              {course.price > 0 ? `Enroll Now - ${formatPrice(course.price)}` : 'Enroll for Free'}
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              Maybe Later
            </button>
          </div>

          {course.price > 0 && (
            <div className="mt-4 text-center">
              <p className="text-xs text-gray-500">
                30-day money-back guarantee • Instant access • Learn at your own pace
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}