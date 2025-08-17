import React, { useState, useEffect } from 'react';
import { X, BookOpen, Clock, DollarSign, BarChart3, Calendar, ExternalLink } from 'lucide-react';
import { apiClient, User, UserEnrollment } from '../lib/api';
import { useToast } from '../hooks/use-toast';

interface UserEnrollmentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
}

export function UserEnrollmentsModal({ isOpen, onClose, user }: UserEnrollmentsModalProps) {
  const [enrollments, setEnrollments] = useState<UserEnrollment[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && user) {
      loadEnrollments();
    }
  }, [isOpen, user]);

  const loadEnrollments = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const response = await apiClient.getUserEnrollments(user.id);
      if (response.success && response.data) {
        setEnrollments(response.data.enrollments || []);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load user enrollments',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load user enrollments',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      ACTIVE: { color: 'bg-green-100 text-green-800', label: 'Active' },
      COMPLETED: { color: 'bg-blue-100 text-blue-800', label: 'Completed' },
      SUSPENDED: { color: 'bg-red-100 text-red-800', label: 'Suspended' },
      EXPIRED: { color: 'bg-gray-100 text-gray-800', label: 'Expired' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.ACTIVE;
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Course Enrollments</h2>
            <p className="text-sm text-gray-600">
              {user.firstName} {user.lastName} ({user.email})
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading enrollments...</span>
            </div>
          ) : enrollments.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No Enrollments</h3>
              <p className="text-gray-600">This user is not enrolled in any courses yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {enrollments.map((enrollment) => (
                <div
                  key={enrollment.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                >
                  <div className="flex items-start space-x-4">
                    {/* Course Thumbnail */}
                    <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                      {enrollment.course.thumbnailUrl ? (
                        <img
                          src={enrollment.course.thumbnailUrl}
                          alt={enrollment.course.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Course Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            {enrollment.course.title}
                          </h3>
                          
                          <div className="flex items-center space-x-4 mb-2">
                            {enrollment.course.category && (
                              <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded">
                                {enrollment.course.category.name}
                              </span>
                            )}
                            
                            {enrollment.course.level && (
                              <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                                {enrollment.course.level}
                              </span>
                            )}
                            
                            <div className="flex items-center text-sm text-gray-600">
                              <DollarSign className="w-4 h-4 mr-1" />
                              {enrollment.course.price > 0 ? `$${enrollment.course.price}` : 'Free'}
                            </div>
                          </div>

                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1" />
                              Enrolled: {formatDate(enrollment.enrolledAt)}
                            </div>
                            
                            {enrollment.completionPercentage !== undefined && (
                              <div className="flex items-center">
                                <BarChart3 className="w-4 h-4 mr-1" />
                                Progress: {enrollment.completionPercentage}%
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col items-end space-y-2">
                          {getStatusBadge(enrollment.status)}
                          
                          <a
                            href={`/courses/${enrollment.course.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm"
                          >
                            <ExternalLink className="w-4 h-4 mr-1" />
                            View Course
                          </a>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      {enrollment.completionPercentage !== undefined && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                            <span>Progress</span>
                            <span>{enrollment.completionPercentage}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${enrollment.completionPercentage}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-6">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {enrollments.length} {enrollments.length === 1 ? 'enrollment' : 'enrollments'} total
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}