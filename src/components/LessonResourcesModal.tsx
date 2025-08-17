import React, { useState, useEffect } from 'react';
import { X, Plus, Edit, Trash2, Download, File, FileText, Image, Video, Music, Archive } from 'lucide-react';
import { apiClient, LessonResource, CreateLessonResourceData } from '../lib/api';
import { useToast } from '../hooks/use-toast';

interface LessonResourcesModalProps {
  isOpen: boolean;
  onClose: () => void;
  lessonId: string;
  lessonTitle: string;
}

export function LessonResourcesModal({ isOpen, onClose, lessonId, lessonTitle }: LessonResourcesModalProps) {
  const [resources, setResources] = useState<LessonResource[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingResource, setEditingResource] = useState<LessonResource | null>(null);
  const [formData, setFormData] = useState<CreateLessonResourceData>({
    lessonId,
    title: '',
    description: '',
    fileUrl: '',
    fileType: '',
    fileSize: 0,
    orderIndex: 0,
    isDownloadable: true
  });
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && lessonId) {
      loadResources();
    }
  }, [isOpen, lessonId]);

  const loadResources = async () => {
    setLoading(true);
    try {
      const response = await apiClient.getLessonResources(lessonId);
      if (response.success && response.data) {
        setResources(response.data.resources || []);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load lesson resources',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let response;
      if (editingResource) {
        response = await apiClient.updateLessonResource(editingResource.id, formData);
      } else {
        response = await apiClient.createLessonResource(formData);
      }
      
      if (response.success) {
        toast({
          title: 'Success',
          description: `Resource ${editingResource ? 'updated' : 'created'} successfully`
        });
        loadResources();
        resetForm();
      } else {
        toast({
          title: 'Error',
          description: response.error || `Failed to ${editingResource ? 'update' : 'create'} resource`,
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to ${editingResource ? 'update' : 'create'} resource`,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (resourceId: string) => {
    if (!confirm('Are you sure you want to delete this resource?')) return;
    
    try {
      const response = await apiClient.deleteLessonResource(resourceId);
      if (response.success) {
        toast({
          title: 'Success',
          description: 'Resource deleted successfully'
        });
        loadResources();
      } else {
        toast({
          title: 'Error',
          description: 'Failed to delete resource',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete resource',
        variant: 'destructive'
      });
    }
  };

  const resetForm = () => {
    setFormData({
      lessonId,
      title: '',
      description: '',
      fileUrl: '',
      fileType: '',
      fileSize: 0,
      orderIndex: resources.length,
      isDownloadable: true
    });
    setEditingResource(null);
    setShowAddForm(false);
  };

  const handleEdit = (resource: LessonResource) => {
    setFormData({
      lessonId,
      title: resource.title,
      description: resource.description || '',
      fileUrl: resource.fileUrl,
      fileType: resource.fileType,
      fileSize: resource.fileSize || 0,
      orderIndex: resource.orderIndex,
      isDownloadable: resource.isDownloadable
    });
    setEditingResource(resource);
    setShowAddForm(true);
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image className="w-5 h-5" />;
    if (fileType.startsWith('video/')) return <Video className="w-5 h-5" />;
    if (fileType.startsWith('audio/')) return <Music className="w-5 h-5" />;
    if (fileType.includes('pdf') || fileType.includes('document')) return <FileText className="w-5 h-5" />;
    if (fileType.includes('zip') || fileType.includes('rar')) return <Archive className="w-5 h-5" />;
    return <File className="w-5 h-5" />;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Lesson Resources</h2>
            <p className="text-sm text-gray-600">{lessonTitle}</p>
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
          {/* Add Resource Button */}
          {!showAddForm && (
            <div className="mb-6">
              <button
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Resource
              </button>
            </div>
          )}

          {/* Add/Edit Form */}
          {showAddForm && (
            <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
              <h3 className="text-lg font-semibold mb-4">
                {editingResource ? 'Edit Resource' : 'Add New Resource'}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Resource Title
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter resource title"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      File URL
                    </label>
                    <input
                      type="url"
                      required
                      value={formData.fileUrl}
                      onChange={(e) => setFormData({ ...formData, fileUrl: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="https://example.com/file.pdf"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (Optional)
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter resource description"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      File Type
                    </label>
                    <select
                      value={formData.fileType}
                      onChange={(e) => setFormData({ ...formData, fileType: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select type</option>
                      <option value="application/pdf">PDF Document</option>
                      <option value="application/msword">Word Document</option>
                      <option value="application/vnd.ms-powerpoint">PowerPoint</option>
                      <option value="text/plain">Text File</option>
                      <option value="image/jpeg">JPEG Image</option>
                      <option value="image/png">PNG Image</option>
                      <option value="video/mp4">MP4 Video</option>
                      <option value="audio/mpeg">MP3 Audio</option>
                      <option value="application/zip">ZIP Archive</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      File Size (bytes)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.fileSize}
                      onChange={(e) => setFormData({ ...formData, fileSize: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Order Index
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.orderIndex}
                      onChange={(e) => setFormData({ ...formData, orderIndex: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isDownloadable"
                    checked={formData.isDownloadable}
                    onChange={(e) => setFormData({ ...formData, isDownloadable: e.target.checked })}
                    className="mr-2"
                  />
                  <label htmlFor="isDownloadable" className="text-sm text-gray-700">
                    Allow users to download this resource
                  </label>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : (editingResource ? 'Update Resource' : 'Add Resource')}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Resources List */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading resources...</span>
            </div>
          ) : resources.length === 0 ? (
            <div className="text-center py-8">
              <File className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No Resources</h3>
              <p className="text-gray-600">Add resources to help students learn better.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {resources
                .sort((a, b) => a.orderIndex - b.orderIndex)
                .map((resource) => (
                  <div
                    key={resource.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="text-gray-500">
                        {getFileIcon(resource.fileType)}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{resource.title}</h4>
                        {resource.description && (
                          <p className="text-sm text-gray-600">{resource.description}</p>
                        )}
                        <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                          <span>{resource.fileType}</span>
                          <span>{formatFileSize(resource.fileSize)}</span>
                          <span>Order: {resource.orderIndex}</span>
                          {resource.isDownloadable && (
                            <span className="text-green-600">Downloadable</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <a
                        href={resource.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-md"
                        title="View Resource"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => handleEdit(resource)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-md"
                        title="Edit Resource"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(resource.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                        title="Delete Resource"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
              {resources.length} {resources.length === 1 ? 'resource' : 'resources'} total
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