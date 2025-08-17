import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { apiClient, type AdminCourse } from '../lib/api'
import { AppLayout } from '../components/AppLayout'
import { CreateCourseModal } from '../components/CreateCourseModal'
import { EditCourseModal } from '../components/EditCourseModal'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { useToast } from '../hooks/use-toast'
import { 
  Shield, 
  BookOpen, 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Play,
  Users,
  DollarSign,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Upload,
  TrendingUp,
  Star,
  Clock,
  BarChart3,
  Lock,
  Unlock,
  UserCheck,
  Settings,
  Globe
} from 'lucide-react'

// Use AdminCourse from API instead of local interface

interface CourseFilters {
  search: string
  status: string
  visibility: string
  category: string
  level: string

}

export default function AdminCourses() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [courses, setCourses] = useState<AdminCourse[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<CourseFilters>({
    search: '',
    status: 'all',
    visibility: 'all',
    category: 'all',
    level: 'all',

  })
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedCourses, setSelectedCourses] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState<AdminCourse | null>(null)
  const [confirmAction, setConfirmAction] = useState<{
    type: 'delete' | 'publish' | 'unpublish';
    courseId: string;
    courseName: string;
  } | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const coursesPerPage = 10

  // Show loading spinner while auth is initializing
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Wait for auth to initialize before loading courses
  useEffect(() => {
    if (!authLoading && user) {
      loadCourses()
    }
  }, [currentPage, filters, authLoading, user])

  const loadCourses = async () => {
    try {
      setLoading(true)
      const response = await apiClient.getAdminCourses({
        page: currentPage,
        limit: coursesPerPage,
        search: filters.search || undefined,
        status: filters.status !== 'all' ? filters.status : undefined,
        visibility: filters.visibility !== 'all' ? filters.visibility : undefined,
        category: filters.category !== 'all' ? filters.category : undefined,
        level: filters.level !== 'all' ? filters.level : undefined,
      })

      if (response.success && response.data) {
        setCourses(response.data.courses)
        setTotalPages(response.data.pagination.pages)
      } else {
        console.error('Failed to load courses:', response.error)
        setCourses([])
        setTotalPages(1)
      }
    } catch (error) {
      console.error('Failed to load courses:', error)
      setCourses([])
      setTotalPages(1)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key: keyof CourseFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setCurrentPage(1)
  }

  const handleCreateCourse = () => {
    setShowCreateModal(true)
  }

  const handleCreateSuccess = () => {
    toast({
      title: "Success",
      description: "Course created successfully",
    })
    loadCourses() // Refresh the courses list
  }

  const handleCourseAction = async (courseId: string, action: 'edit' | 'delete' | 'publish' | 'unpublish' | 'view') => {
    const course = courses.find(c => c.id === courseId)
    if (!course) return

    switch (action) {
      case 'edit':
        setSelectedCourse(course)
        setShowEditModal(true)
        break
      
      case 'delete':
        setConfirmAction({
          type: 'delete',
          courseId,
          courseName: course.title
        })
        setShowConfirmDialog(true)
        break
      
      case 'publish':
        setConfirmAction({
          type: 'publish',
          courseId,
          courseName: course.title
        })
        setShowConfirmDialog(true)
        break
      
      case 'unpublish':
        setConfirmAction({
          type: 'unpublish',
          courseId,
          courseName: course.title
        })
        setShowConfirmDialog(true)
        break
      
      case 'view':
        // TODO: Implement course details view
        console.log('View course details:', courseId)
        break
    }
  }

  const handleConfirmAction = async () => {
    if (!confirmAction) return

    try {
      setActionLoading(true)
      let response

      switch (confirmAction.type) {
        case 'delete':
          response = await apiClient.bulkCourseAction('delete', [confirmAction.courseId])
          break
        
        case 'publish':
          response = await apiClient.publishCourse(confirmAction.courseId, true)
          break
        
        case 'unpublish':
          response = await apiClient.publishCourse(confirmAction.courseId, false)
          break
      }

      if (response?.success) {
        toast({
          title: "Success",
          description: response.data?.message || `Course ${confirmAction.type}d successfully`,
        })
        await loadCourses()
      } else {
        toast({
          title: "Error",
          description: response?.error || `Failed to ${confirmAction.type} course`,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${confirmAction.type} course. Please try again.`,
        variant: "destructive",
      })
    } finally {
      setActionLoading(false)
      setShowConfirmDialog(false)
      setConfirmAction(null)
    }
  }

  const handleEditSuccess = () => {
    toast({
      title: "Success",
      description: "Course updated successfully",
    })
    setShowEditModal(false)
    setSelectedCourse(null)
    loadCourses()
  }

  const handleBulkAction = async (action: 'publish' | 'archive' | 'delete' | 'makePrivate' | 'makeFree') => {
    if (selectedCourses.length === 0) return
    
    try {
      setLoading(true)
      
      // Map frontend actions to backend actions
      let apiAction: 'publish' | 'unpublish' | 'archive' | 'makeFree' | 'delete'
      
      switch (action) {
        case 'publish':
          apiAction = 'publish'
          break
        case 'archive':
          apiAction = 'archive'
          break
        case 'delete':
          apiAction = 'delete'
          break
        case 'makePrivate':
          apiAction = 'archive' // Map makePrivate to archive for now
          break
        case 'makeFree':
          apiAction = 'makeFree'
          break
        default:
          throw new Error(`Unknown action: ${action}`)
      }
      
      const response = await apiClient.bulkCourseAction(apiAction, selectedCourses)
      
      if (response.success) {
        toast({
          title: "Success",
          description: response.data?.message || `Bulk ${action} completed successfully`,
        })
        setSelectedCourses([])
        await loadCourses()
      } else {
        toast({
          title: "Error",
          description: response.error || `Failed to perform bulk ${action}`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error(`Failed to perform bulk ${action}:`, error)
      toast({
        title: "Error",
        description: `Failed to perform bulk ${action}. Please try again.`,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const toggleCourseSelection = (courseId: string) => {
    setSelectedCourses(prev => 
      prev.includes(courseId) 
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    )
  }

  const selectAllCourses = () => {
    if (selectedCourses.length === courses.length) {
      setSelectedCourses([])
    } else {
      setSelectedCourses(courses.map(course => course.id))
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'PUBLISHED': return 'bg-green-100 text-green-800'
      case 'DRAFT': return 'bg-yellow-100 text-yellow-800'
      case 'ARCHIVED': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getVisibilityBadgeColor = (visibility: string) => {
    switch (visibility) {
      case 'FREE': return 'bg-blue-100 text-blue-800'
      case 'PRIVATE': return 'bg-purple-100 text-purple-800'
      case 'PREMIUM': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'FREE': return <Globe className="w-4 h-4" />
      case 'PRIVATE': return <Lock className="w-4 h-4" />
      case 'PREMIUM': return <Star className="w-4 h-4" />
      default: return <Globe className="w-4 h-4" />
    }
  }

  const getLevelBadgeColor = (level: string) => {
    switch (level) {
      case 'BEGINNER': return 'bg-blue-100 text-blue-800'
      case 'INTERMEDIATE': return 'bg-orange-100 text-orange-800'
      case 'ADVANCED': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatCategoryName = (category?: { name?: string } | null) => {
    return category?.name || 'Uncategorized';
  }

  const formatEnrollmentCount = (count?: number) => {
    return count ? count.toLocaleString() : '0';
  }

  const formatRevenue = (revenue?: number) => {
    return revenue ? revenue.toLocaleString() : '0';
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <AppLayout sidebarType="admin">
      <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900">
          {/* Header */}
          <div className="bg-white shadow-sm border-b mb-6">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-semibold text-gray-900">Course Management</h1>
                </div>
                <div className="flex items-center gap-3">
                  <button className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50">
                    <Upload className="w-4 h-4" />
                    Import
                  </button>
                  <button className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50">
                    <Download className="w-4 h-4" />
                    Export
                  </button>
                  <button
                    onClick={handleCreateCourse}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-md hover:from-blue-600 hover:to-indigo-600 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Course
                  </button>
                </div>
              </div>
            </div>
          </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Courses</p>
                <p className="text-2xl font-bold text-gray-900">{courses.length}</p>
              </div>
              <BookOpen className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Free Courses</p>
                <p className="text-2xl font-bold text-gray-900">
                  {courses.filter(c => c.visibility === 'FREE').length}
                </p>
              </div>
              <Globe className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Private Courses</p>
                <p className="text-2xl font-bold text-gray-900">
                  {courses.filter(c => c.visibility === 'PRIVATE').length}
                </p>
              </div>
              <Lock className="w-8 h-8 text-purple-600" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Enrollments</p>
                <p className="text-2xl font-bold text-gray-900">
                  {courses.reduce((sum, c) => sum + c.enrollmentCount, 0).toLocaleString()}
                </p>
              </div>
              <Users className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${courses.reduce((sum, c) => sum + c.revenue, 0).toLocaleString()}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-orange-600" />
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm border mb-6">
          <div className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search courses by title, description..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div className="flex gap-3">
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="DRAFT">Draft</option>
                  <option value="ARCHIVED">Archived</option>
                </select>

                <select
                  value={filters.visibility}
                  onChange={(e) => handleFilterChange('visibility', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Visibility</option>
                  <option value="FREE">Free</option>
                  <option value="PRIVATE">Private</option>
                  <option value="PREMIUM">Premium</option>
                </select>
                
                <select
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Categories</option>
                  <option value="Programming">Programming</option>
                  <option value="Design">Design</option>
                  <option value="Business">Business</option>
                  <option value="Marketing">Marketing</option>
                </select>
                
                <select
                  value={filters.level}
                  onChange={(e) => handleFilterChange('level', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Levels</option>
                  <option value="BEGINNER">Beginner</option>
                  <option value="INTERMEDIATE">Intermediate</option>
                  <option value="ADVANCED">Advanced</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedCourses.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-700">
                {selectedCourses.length} course(s) selected
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleBulkAction('publish')}
                  className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Publish
                </button>
                <button
                  onClick={() => handleBulkAction('makeFree')}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Make Free
                </button>
                <button
                  onClick={() => handleBulkAction('makePrivate')}
                  className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700"
                >
                  Make Private
                </button>
                <button
                  onClick={() => handleBulkAction('archive')}
                  className="px-3 py-1 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700"
                >
                  Archive
                </button>
                <button
                  onClick={() => handleBulkAction('delete')}
                  className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Courses Table */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedCourses.length === courses.length && courses.length > 0}
                      onChange={selectAllCourses}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Course
                  </th>
                                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Admin
                    </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status & Visibility
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Access Control
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Updated
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {courses.map((course) => (
                  <tr key={course.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedCourses.includes(course.id)}
                        onChange={() => toggleCourseSelection(course.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center relative">
                          <BookOpen className="w-6 h-6 text-blue-600" />
                          {course.visibility === 'PRIVATE' && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                              <Lock className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{course.title}</div>
                          <div className="text-sm text-gray-500 max-w-xs truncate">{course.description}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getLevelBadgeColor(course.level)}`}>
                              {course.level}
                            </span>
                            <span className="text-xs text-gray-500">{formatCategoryName(course.category)}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {course.instructor ? 
                          (course.instructor.firstName && course.instructor.lastName 
                            ? `${course.instructor.firstName} ${course.instructor.lastName}`
                            : course.instructor.email) 
                          : 'Course Admin'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {course.instructor?.email || 'Administrator'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(course.status)}`}>
                          {course.status}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${getVisibilityBadgeColor(course.visibility)}`}>
                          {getVisibilityIcon(course.visibility)}
                          {course.visibility}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4 text-gray-400" />
                          <span>{formatEnrollmentCount(course.enrollmentCount)} enrolled</span>
                        </div>
                        {course.visibility === 'PRIVATE' && (
                          <div className="flex items-center gap-1 mt-1">
                            <UserCheck className="w-4 h-4 text-purple-400" />
                            <span className="text-purple-600">{course.authorizedUsers} authorized</span>
                          </div>
                        )}
                        {course.maxEnrollments && (
                          <div className="text-xs text-gray-500 mt-1">
                            Limit: {course.maxEnrollments}
                          </div>
                        )}
                        {course.rating > 0 && (
                          <div className="flex items-center gap-1 mt-1">
                            <Star className="w-4 h-4 text-yellow-400 fill-current" />
                            <span>{course.rating}</span>
                            <span className="text-gray-500">({course.reviewCount})</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        ${formatRevenue(course.revenue)}
                      </div>
                      <div className="text-sm text-gray-500">
                        ${course.price}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(course.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Quick Publish/Unpublish Toggle */}
                        <button
                          onClick={() => handleCourseAction(course.id, course.isPublished ? 'unpublish' : 'publish')}
                          className={`p-1 hover:bg-gray-100 rounded transition-colors ${
                            course.isPublished 
                              ? 'text-green-600 hover:text-green-700' 
                              : 'text-gray-400 hover:text-green-600'
                          }`}
                          title={course.isPublished ? 'Unpublish Course' : 'Publish Course'}
                        >
                          {course.isPublished ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                        </button>
                        
                        <button
                          onClick={() => handleCourseAction(course.id, 'view')}
                          className="p-1 text-gray-400 hover:text-blue-600 hover:bg-gray-100 rounded transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        
                        <Link
                          to={`/admin/courses/${course.id}/outline`}
                          className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-gray-100 rounded transition-colors"
                          title="Course Outline"
                        >
                          <BookOpen className="w-4 h-4" />
                        </Link>
                        
                        <button
                          onClick={() => handleCourseAction(course.id, 'edit')}
                          className="p-1 text-gray-400 hover:text-green-600 hover:bg-gray-100 rounded transition-colors"
                          title="Edit Course"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        
                        <Link
                          to={`/admin/courses/${course.id}/permissions`}
                          className="p-1 text-gray-400 hover:text-purple-600 hover:bg-gray-100 rounded transition-colors"
                          title="Manage Permissions"
                        >
                          <Settings className="w-4 h-4" />
                        </Link>
                        
                        <Link
                          to={`/admin/courses/${course.id}/analytics`}
                          className="p-1 text-gray-400 hover:text-purple-600 hover:bg-gray-100 rounded transition-colors"
                          title="View Analytics"
                        >
                          <BarChart3 className="w-4 h-4" />
                        </Link>
                        
                        <button
                          onClick={() => handleCourseAction(course.id, 'delete')}
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded transition-colors"
                          title="Delete Course"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="bg-white px-6 py-3 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {(currentPage - 1) * coursesPerPage + 1} to {Math.min(currentPage * coursesPerPage, courses.length)} of {courses.length} courses
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Create Course Modal */}
      <CreateCourseModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
      />

      {/* Edit Course Modal */}
      {selectedCourse && (
        <EditCourseModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false)
            setSelectedCourse(null)
          }}
          onSuccess={handleEditSuccess}
          course={selectedCourse}
        />
      )}

      {/* Confirmation Dialog */}
      {confirmAction && (
        <ConfirmDialog
          isOpen={showConfirmDialog}
          onClose={() => {
            setShowConfirmDialog(false)
            setConfirmAction(null)
          }}
          onConfirm={handleConfirmAction}
          title={`${confirmAction.type === 'delete' ? 'Delete' : confirmAction.type === 'publish' ? 'Publish' : 'Unpublish'} Course`}
          message={
            confirmAction.type === 'delete'
              ? `Are you sure you want to delete "${confirmAction.courseName}"? This action cannot be undone and will remove all course content, enrollments, and progress data.`
              : confirmAction.type === 'publish'
              ? `Are you sure you want to publish "${confirmAction.courseName}"? This will make the course visible and accessible to students.`
              : `Are you sure you want to unpublish "${confirmAction.courseName}"? This will hide the course from students and prevent new enrollments.`
          }
          confirmText={confirmAction.type === 'delete' ? 'Delete Course' : confirmAction.type === 'publish' ? 'Publish Course' : 'Unpublish Course'}
          type={confirmAction.type === 'delete' ? 'danger' : 'warning'}
          loading={actionLoading}
        />
      )}
      </div>
    </AppLayout>
  )
}