import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { apiClient, CreateModuleData } from '../lib/api';
import { useToast } from '../hooks/use-toast';

interface Module {
  id: string;
  title: string;
  description?: string;
  orderIndex: number;
  courseId: string;
}

interface EditModuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onModuleUpdated: () => void;
  module: Module | null;
}

export function EditModuleModal({ 
  isOpen, 
  onClose, 
  onModuleUpdated, 
  module 
}: EditModuleModalProps) {
  const [formData, setFormData] = useState<Partial<CreateModuleData>>({
    title: '',
    description: '',
    orderIndex: 0
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Load existing module data when module changes
  useEffect(() => {
    if (module && isOpen) {
      setFormData({
        title: module.title,
        description: module.description || '',
        orderIndex: module.orderIndex
      });
    }
  }, [module, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!module) return;
    
    setLoading(true);

    try {
      const response = await apiClient.updateModule(module.id, formData);
      
      if (response.success) {
        toast({
          title: 'Success',
          description: 'Module updated successfully'
        });
        onModuleUpdated();
        onClose();
      } else {
        toast({
          title: 'Error',
          description: response.error || 'Failed to update module',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update module',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof CreateModuleData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (!isOpen || !module) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Edit Module</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Module Title
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter module title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (Optional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter module description"
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
              onChange={(e) => handleInputChange('orderIndex', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Lower numbers appear first
            </p>
          </div>

          <div className="bg-gray-50 p-3 rounded-md">
            <h4 className="text-sm font-medium text-gray-700 mb-1">Module Info</h4>
            <p className="text-xs text-gray-600">
              ID: {module.id}
            </p>
            <p className="text-xs text-gray-600">
              Current Order: {module.orderIndex}
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.title?.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update Module'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}