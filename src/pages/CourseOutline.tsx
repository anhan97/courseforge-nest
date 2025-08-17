import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../lib/api';
import { useToast } from '../hooks/use-toast';
import { LessonModal } from '../components/LessonModal';
import {
  Shield,
  ArrowLeft,
  Plus,
  Search,
  MoreVertical,
  ChevronDown,
  ChevronRight,
  Play,
  FileText,
  Paperclip,
  Eye,
  Edit,
  Trash2,
  Settings,
  Lock,
  Unlock,
  GripVertical,
  Video,
  Clock,
  Users
} from 'lucide-react';

interface Module {
  id: string;
  title: string;
  description?: string;
  orderIndex: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  lessons: Lesson[];
  _count: {
    lessons: number;
  };
}

interface Lesson {
  id: string;
  title: string;
  description?: string;
  videoDuration?: number;
  orderIndex: number;
  isFree: boolean;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  _count: {
    attachments: number;
  };
}

export default function CourseOutline() {
  const { courseId } = useParams<{ courseId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [course, setCourse] = useState<any>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModule, setShowAddModule] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<any>(null);
  const [lessonModalMode, setLessonModalMode] = useState<'create' | 'edit'>('create');

  useEffect(() => {
    if (courseId) {
      loadCourseData();
      loadModules();
    }
  }, [courseId]);

  const loadCourseData = async () => {
    try {
      const response = await apiClient.getCourseForEdit(courseId!);
      if (response.success && response.data) {
        setCourse(response.data);
      }
    } catch (error) {
      console.error('Failed to load course data:', error);
      toast({
        title: "Error",
        description: "Failed to load course information",
        variant: "destructive",
      });
    }
  };

  const loadModules = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getModules(courseId!);
      if (response.success && response.data) {
        setModules(response.data.modules);
        // Expand first module by default
        if (response.data.modules.length > 0) {
          setExpandedModules(new Set([response.data.modules[0].id]));
        }
      }
    } catch (error) {
      console.error('Failed to load modules:', error);
      toast({
        title: "Error",
        description: "Failed to load course modules",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateModule = async () => {
    if (!newModuleTitle.trim()) return;

    try {
      const response = await apiClient.createModule({
        courseId: courseId!,
        title: newModuleTitle.trim(),
      });

      if (response.success) {
        toast({
          title: "Success",
          description: "Module created successfully",
        });
        setNewModuleTitle('');
        setShowAddModule(false);
        loadModules();
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to create module",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create module",
        variant: "destructive",
      });
    }
  };

  const toggleModuleExpansion = (moduleId: string) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId);
    } else {
      newExpanded.add(moduleId);
    }
    setExpandedModules(newExpanded);
  };

  const handlePublishModule = async (moduleId: string, isPublished: boolean) => {
    try {
      const response = await apiClient.publishModule(moduleId, isPublished);
      if (response.success) {
        toast({
          title: "Success",
          description: `Module ${isPublished ? 'published' : 'unpublished'} successfully`,
        });
        loadModules();
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to update module status",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update module status",
        variant: "destructive",
      });
    }
  };

  const expandAllModules = () => {
    setExpandedModules(new Set(modules.map(m => m.id)));
  };

  const collapseAllModules = () => {
    setExpandedModules(new Set());
  };

  const filteredModules = modules.filter(module =>
    module.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    module.lessons.some(lesson => 
      lesson.title.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m`;
  };

  const handleAddLesson = (moduleId: string) => {
    setSelectedModule(moduleId);
    setSelectedLesson(null);
    setLessonModalMode('create');
    setShowLessonModal(true);
  };

  const handleEditLesson = (lesson: any) => {
    setSelectedModule(null);
    setSelectedLesson(lesson);
    setLessonModalMode('edit');
    setShowLessonModal(true);
  };

  const handleLessonSuccess = () => {
    toast({
      title: "Success",
      description: `Lesson ${lessonModalMode}d successfully`,
    });
    setShowLessonModal(false);
    setSelectedModule(null);
    setSelectedLesson(null);
    loadModules();
  };

  const handlePublishLesson = async (lessonId: string, isPublished: boolean) => {
    try {
      const response = await apiClient.publishLesson(lessonId, isPublished);
      if (response.success) {
        toast({
          title: "Success",
          description: `Lesson ${isPublished ? 'published' : 'unpublished'} successfully`,
        });
        loadModules();
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to update lesson status",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update lesson status",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link 
                to="/admin/courses" 
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back to Courses</span>
              </Link>
              <span className="text-gray-400">/</span>
              <div className="flex items-center gap-3">
                {course?.thumbnailUrl ? (
                  <img 
                    src={course.thumbnailUrl} 
                    alt={course.title}
                    className="w-10 h-10 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Play className="w-5 h-5 text-blue-600" />
                  </div>
                )}
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">{course?.title}</h1>
                  <p className="text-sm text-gray-500">Course Outline</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to={`/courses/${courseId}`}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                <Eye className="w-4 h-4" />
                Preview
              </Link>
              <Link
                to={`/admin/courses/${courseId}/settings`}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                <Settings className="w-4 h-4" />
                Settings
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Controls */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Find module or lesson..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-80 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <span className="text-sm text-gray-600">
              {modules.length} Module{modules.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={expandAllModules}
              className="px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Expand All
            </button>
            <button
              onClick={collapseAllModules}
              className="px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Collapse All
            </button>
          </div>
        </div>

        {/* Modules List */}
        <div className="space-y-4">
          {filteredModules.map((module, moduleIndex) => (
            <div key={module.id} className="bg-white rounded-lg border shadow-sm">
              {/* Module Header */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleModuleExpansion(module.id)}
                      className="p-1 hover:bg-gray-100 rounded transition-colors"
                    >
                      {expandedModules.has(module.id) ? (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-500" />
                      )}
                    </button>
                    <div className="flex items-center gap-2">
                      <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-4 h-4 text-blue-600" />
                      </div>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{module.title}</h3>
                      {module.description && (
                        <p className="text-sm text-gray-500">{module.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                        <span>{module.lessons.length} lesson{module.lessons.length !== 1 ? 's' : ''}</span>
                        <span>•</span>
                        <span>Order: {module.orderIndex + 1}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePublishModule(module.id, !module.isPublished)}
                      className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                        module.isPublished
                          ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {module.isPublished ? (
                        <>
                          <Unlock className="w-3 h-3 inline mr-1" />
                          Published
                        </>
                      ) : (
                        <>
                          <Lock className="w-3 h-3 inline mr-1" />
                          Draft
                        </>
                      )}
                    </button>
                    <button 
                      onClick={() => handleAddLesson(module.id)}
                      className="p-2 hover:bg-gray-100 rounded transition-colors"
                      title="Add Content"
                    >
                      <Plus className="w-4 h-4 text-gray-600" />
                    </button>
                    <button className="p-2 hover:bg-gray-100 rounded transition-colors">
                      <MoreVertical className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Lessons List */}
              {expandedModules.has(module.id) && (
                <div className="p-4">
                  {module.lessons.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Video className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <p>No lessons yet</p>
                      <button 
                        onClick={() => handleAddLesson(module.id)}
                        className="mt-2 text-blue-600 hover:text-blue-700 text-sm"
                      >
                        Add your first lesson
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {module.lessons.map((lesson) => (
                        <div key={lesson.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <div className="flex items-center gap-3">
                            <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />
                            <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center">
                              <Play className="w-3 h-3 text-blue-600" />
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900">{lesson.title}</h4>
                              <div className="flex items-center gap-4 text-sm text-gray-500">
                                {lesson.videoDuration && (
                                  <>
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {formatDuration(lesson.videoDuration)}
                                    </span>
                                    <span>•</span>
                                  </>
                                )}
                                {lesson._count.attachments > 0 && (
                                  <>
                                    <span className="flex items-center gap-1">
                                      <Paperclip className="w-3 h-3" />
                                      {lesson._count.attachments} file{lesson._count.attachments !== 1 ? 's' : ''}
                                    </span>
                                    <span>•</span>
                                  </>
                                )}
                                <span>Order: {lesson.orderIndex + 1}</span>
                                {lesson.isFree && (
                                  <>
                                    <span>•</span>
                                    <span className="text-green-600">Free Preview</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handlePublishLesson(lesson.id, !lesson.isPublished)}
                              className={`px-2 py-1 text-xs rounded-full transition-colors hover:opacity-80 ${
                                lesson.isPublished
                                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                              title={lesson.isPublished ? 'Click to unpublish' : 'Click to publish'}
                            >
                              {lesson.isPublished ? 'Published' : 'Draft'}
                            </button>
                            <button 
                              onClick={() => handleEditLesson(lesson)}
                              className="p-1 hover:bg-gray-200 rounded transition-colors"
                              title="Edit Lesson"
                            >
                              <Edit className="w-4 h-4 text-gray-600" />
                            </button>
                            <button className="p-1 hover:bg-gray-200 rounded transition-colors">
                              <MoreVertical className="w-4 h-4 text-gray-600" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Add Module Section */}
          <div className="bg-white rounded-lg border shadow-sm">
            {showAddModule ? (
              <div className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Plus className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Module title..."
                      value={newModuleTitle}
                      onChange={(e) => setNewModuleTitle(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleCreateModule()}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCreateModule}
                      disabled={!newModuleTitle.trim()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Create
                    </button>
                    <button
                      onClick={() => {
                        setShowAddModule(false);
                        setNewModuleTitle('');
                      }}
                      className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddModule(true)}
                className="w-full p-4 text-left flex items-center gap-3 hover:bg-gray-50 transition-colors"
              >
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Plus className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-gray-600">Add Module</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Lesson Modal */}
      {showLessonModal && (
        <LessonModal
          isOpen={showLessonModal}
          onClose={() => {
            setShowLessonModal(false);
            setSelectedModule(null);
            setSelectedLesson(null);
          }}
          onSuccess={handleLessonSuccess}
          moduleId={selectedModule || ''}
          lesson={selectedLesson}
          mode={lessonModalMode}
        />
      )}
    </div>
  );
}