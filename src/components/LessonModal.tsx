import React, { useState, useEffect } from 'react';
import { X, Save, Video, FileText, Paperclip, Plus, Upload } from 'lucide-react';
import { apiClient } from '../lib/api';

interface LessonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  moduleId: string;
  lesson?: any; // For editing existing lesson
  mode: 'create' | 'edit';
}

export function LessonModal({ isOpen, onClose, onSuccess, moduleId, lesson, mode }: LessonModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    videoUrl: '',
    videoDuration: 0,
    videoProvider: 'upload',
    content: '',
    isFree: false,
  });

  const [attachments, setAttachments] = useState<any[]>([]);
  const [newAttachment, setNewAttachment] = useState({
    fileName: '',
    fileUrl: '',
    fileType: '',
    fileSize: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'video' | 'content' | 'attachments'>('video');

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && lesson) {
        // Populate form with lesson data
        setFormData({
          title: lesson.title || '',
          description: lesson.description || '',
          videoUrl: lesson.videoUrl || '',
          videoDuration: lesson.videoDuration || 0,
          videoProvider: lesson.videoProvider || 'upload',
          content: lesson.content || '',
          isFree: lesson.isFree || false,
        });
        setAttachments(lesson.attachments || []);
      } else {
        // Reset form for create mode
        setFormData({
          title: '',
          description: '',
          videoUrl: '',
          videoDuration: 0,
          videoProvider: 'upload',
          content: '',
          isFree: false,
        });
        setAttachments([]);
      }
      setError(null);
    }
  }, [isOpen, mode, lesson]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let response;
      
      if (mode === 'create') {
        response = await apiClient.createLesson({
          moduleId,
          ...formData,
        });
      } else {
        response = await apiClient.updateLesson(lesson.id, formData);
      }

      if (response.success) {
        onSuccess();
        onClose();
      } else {
        setError(response.error || `Failed to ${mode} lesson`);
      }
    } catch (error) {
      setError(`Failed to ${mode} lesson`);
      console.error(`Error ${mode}ing lesson:`, error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAttachment = async () => {
    if (!newAttachment.fileName || !newAttachment.fileUrl) return;

    try {
      const response = await apiClient.addLessonAttachment(lesson?.id || 'temp', newAttachment);
      if (response.success) {
        setAttachments([...attachments, response.data?.attachment]);
        setNewAttachment({
          fileName: '',
          fileUrl: '',
          fileType: '',
          fileSize: 0,
        });
      }
    } catch (error) {
      console.error('Failed to add attachment:', error);
    }
  };

  const handleRemoveAttachment = async (attachmentId: string) => {
    try {
      const response = await apiClient.deleteLessonAttachment(attachmentId);
      if (response.success) {
        setAttachments(attachments.filter(a => a.id !== attachmentId));
      }
    } catch (error) {
      console.error('Failed to remove attachment:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose} />

        <div className="inline-block w-full max-w-4xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">
              {mode === 'create' ? 'Create New Lesson' : 'Edit Lesson'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 focus:outline-none"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lesson Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter lesson title"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Brief description of the lesson"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Video Duration (minutes)
                </label>
                <input
                  type="number"
                  min="0"
                  value={Math.floor(formData.videoDuration / 60)}
                  onChange={(e) => setFormData(prev => ({ ...prev, videoDuration: parseInt(e.target.value) * 60 || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>

              <div className="flex items-center">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isFree}
                    onChange={(e) => setFormData(prev => ({ ...prev, isFree: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Free Preview</span>
                </label>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  type="button"
                  onClick={() => setActiveTab('video')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'video'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Video className="w-4 h-4 inline mr-2" />
                  Video
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('content')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'content'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <FileText className="w-4 h-4 inline mr-2" />
                  Content
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('attachments')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'attachments'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Paperclip className="w-4 h-4 inline mr-2" />
                  Attachments ({attachments.length})
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            <div className="mt-6">
              {activeTab === 'video' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Video Provider
                    </label>
                    <select
                      value={formData.videoProvider}
                      onChange={(e) => setFormData(prev => ({ ...prev, videoProvider: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="upload">Upload</option>
                      <option value="youtube">YouTube</option>
                      <option value="vimeo">Vimeo</option>
                      <option value="cloudinary">Cloudinary</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Video URL
                    </label>
                    <input
                      type="url"
                      value={formData.videoUrl}
                      onChange={(e) => setFormData(prev => ({ ...prev, videoUrl: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="https://example.com/video.mp4"
                    />
                  </div>

                  {formData.videoProvider === 'upload' && (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600">Drag and drop your video file here, or click to browse</p>
                      <button
                        type="button"
                        className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      >
                        Choose File
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'content' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lesson Content
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                    rows={10}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter lesson content, notes, or additional information..."
                  />
                </div>
              )}

              {activeTab === 'attachments' && (
                <div className="space-y-4">
                  {/* Add Attachment Form */}
                  {mode === 'edit' && (
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-3">Add Attachment</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input
                          type="text"
                          placeholder="File name"
                          value={newAttachment.fileName}
                          onChange={(e) => setNewAttachment(prev => ({ ...prev, fileName: e.target.value }))}
                          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                          type="url"
                          placeholder="File URL"
                          value={newAttachment.fileUrl}
                          onChange={(e) => setNewAttachment(prev => ({ ...prev, fileUrl: e.target.value }))}
                          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                          type="text"
                          placeholder="File type (e.g., pdf, docx)"
                          value={newAttachment.fileType}
                          onChange={(e) => setNewAttachment(prev => ({ ...prev, fileType: e.target.value }))}
                          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            placeholder="File size (bytes)"
                            value={newAttachment.fileSize}
                            onChange={(e) => setNewAttachment(prev => ({ ...prev, fileSize: parseInt(e.target.value) || 0 }))}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            type="button"
                            onClick={handleAddAttachment}
                            className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Attachments List */}
                  <div className="space-y-2">
                    {attachments.map((attachment) => (
                      <div key={attachment.id} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
                        <div className="flex items-center gap-3">
                          <Paperclip className="w-4 h-4 text-gray-500" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{attachment.fileName}</p>
                            <p className="text-xs text-gray-500">
                              {attachment.fileType.toUpperCase()} • {formatFileSize(attachment.fileSize)}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(attachment.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {attachments.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-4">No attachments yet</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !formData.title.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {loading ? `${mode === 'create' ? 'Creating' : 'Updating'}...` : `${mode === 'create' ? 'Create' : 'Update'} Lesson`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default LessonModal;