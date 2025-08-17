import React, { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import { apiClient, User, Course } from '../lib/api';
import { useToast } from '../hooks/use-toast';

interface AssignCoursesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssignmentComplete: () => void;
  selectedUsers: User[];
}

export function AssignCoursesModal({ isOpen, onClose, onAssignmentComplete, selectedUsers }: AssignCoursesModalProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      loadCourses();
    }
  }, [isOpen]);

  const loadCourses = async () => {
    setCoursesLoading(true);
    try {
      const response = await apiClient.getCourses();
      if (response.success && response.data) {
        setCourses(response.data.courses || []);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load courses',
        variant: 'destructive'
      });
    } finally {
      setCoursesLoading(false);
    }
  };

  const filteredCourses = courses.filter(course =>
    course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.category?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCourseToggle = (courseId: string) => {
    setSelectedCourses(prev =>
      prev.includes(courseId)
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    );
  };

  const handleSelectAll = () => {
    if (selectedCourses.length === filteredCourses.length) {
      setSelectedCourses([]);
    } else {
      setSelectedCourses(filteredCourses.map(course => course.id));
    }
  };

  const handleAssign = async () => {
    if (selectedCourses.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one course',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const userIds = selectedUsers.map(user => user.id);
      const response = await apiClient.bulkAssignCourses(userIds, selectedCourses);
      
      if (response.success) {
        toast({
          title: 'Success',
          description: `Successfully assigned ${selectedCourses.length} course(s) to ${userIds.length} user(s)`
        });
        onAssignmentComplete();
        onClose();
        setSelectedCourses([]);
        setSearchTerm('');
      } else {
        toast({
          title: 'Error',
          description: response.error || 'Failed to assign courses',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to assign courses',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-bold">Assign Courses</h2>
            <p className="text-sm text-gray-600">
              Assigning to {selectedUsers.length} user(s): {selectedUsers.map(u => u.firstName).join(', ')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search courses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Select All */}
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={handleSelectAll}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            {selectedCourses.length === filteredCourses.length ? 'Deselect All' : 'Select All'}
          </button>
          <span className="text-sm text-gray-600">
            {selectedCourses.length} of {filteredCourses.length} courses selected
          </span>
        </div>

        {/* Courses List */}
        <div className="flex-1 overflow-y-auto border border-gray-200 rounded-md">
          {coursesLoading ? (
            <div className="p-4 text-center text-gray-500">Loading courses...</div>
          ) : filteredCourses.length === 0 ? (
            <div className="p-4 text-center text-gray-500">No courses found</div>
          ) : (
            filteredCourses.map((course) => (
              <div
                key={course.id}
                className="flex items-center p-3 border-b border-gray-100 hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={selectedCourses.includes(course.id)}
                  onChange={() => handleCourseToggle(course.id)}
                  className="mr-3"
                />
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{course.title}</h3>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    {course.category && (
                      <span className="bg-gray-100 px-2 py-1 rounded text-xs">
                        {course.category.name}
                      </span>
                    )}
                    {course.level && (
                      <span className="bg-blue-100 px-2 py-1 rounded text-xs">
                        {course.level}
                      </span>
                    )}
                    {course.price > 0 ? (
                      <span className="text-green-600 font-medium">${course.price}</span>
                    ) : (
                      <span className="text-gray-500">Free</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleAssign}
            disabled={loading || selectedCourses.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Assigning...' : `Assign ${selectedCourses.length} Course(s)`}
          </button>
        </div>
      </div>
    </div>
  );
}