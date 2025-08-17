import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { apiClient, type AdminStatsResponse } from '../lib/api'
import { AppLayout } from '../components/AppLayout'
import { 
  Shield, 
  Users, 
  BookOpen, 
  TrendingUp, 
  Settings, 
  LogOut, 
  Search,
  Plus,
  Activity,
  DollarSign,
  Eye,
  Edit,
  Trash2,
  Bell,
  Download
} from 'lucide-react'

interface DashboardStats extends AdminStatsResponse {
  recentActivity: ActivityItem[]
}

interface ActivityItem {
  id: string
  type: 'user_registered' | 'course_created' | 'enrollment' | 'payment'
  description: string
  timestamp: string
  user?: string
}

export default function AdminDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalCourses: 0,
    totalEnrollments: 0,
    totalRevenue: 0,
    recentUsers: 0,
    recentCourses: 0,
    recentEnrollments: 0,
    usersByRole: { ADMIN: 0, STUDENT: 0 },
    coursesByStatus: { PUBLISHED: 0, DRAFT: 0, ARCHIVED: 0 },
    enrollmentsByMonth: [],
    revenueByMonth: [],
    recentActivity: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const response = await apiClient.getAdminStats()
      if (response.success && response.data) {
        setStats({
          ...response.data,
          recentActivity: [
            {
              id: '1',
              type: 'user_registered',
              description: 'New user registered: jane.doe@example.com',
              timestamp: '2024-01-15T10:30:00Z',
              user: 'Jane Doe'
            },
            {
              id: '2',
              type: 'course_created',
              description: 'Course "Advanced React Patterns" was published',
              timestamp: '2024-01-15T09:15:00Z',
              user: 'John Smith'
            },
            {
              id: '3',
              type: 'enrollment',
              description: 'User enrolled in "JavaScript Fundamentals"',
              timestamp: '2024-01-15T08:45:00Z',
              user: 'Mike Johnson'
            }
          ]
        })
      } else {
        console.error('Failed to load dashboard data:', response.error)
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/admin/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600"></div>
      </div>
    )
  }

  return (
    <AppLayout sidebarType="admin">
      {/* Main Content */}
      <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Welcome back, {user?.firstName}!</h2>
          <p className="text-gray-600">Here's what's happening with your platform today.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{(stats.totalUsers || 0).toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-green-600">+12% from last month</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Courses</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalCourses || 0}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-green-600">+8% from last month</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Revenue</p>
                <p className="text-2xl font-bold text-gray-900">${(stats.totalRevenue || 0).toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-green-600">+23% from last month</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Users</p>
                <p className="text-2xl font-bold text-gray-900">{(stats.recentUsers || 0).toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-green-600">+5% from last month</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Link
                to="/admin/users/new"
                className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors"
              >
                <Plus className="w-5 h-5 text-yellow-600" />
                <span className="text-yellow-900">Add New User</span>
              </Link>
              <Link
                to="/admin/courses/new"
                className="flex items-center gap-3 p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
              >
                <Plus className="w-5 h-5 text-green-600" />
                <span className="text-green-900">Create Course</span>
              </Link>
              <button className="w-full flex items-center gap-3 p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
                <Download className="w-5 h-5 text-purple-600" />
                <span className="text-purple-900">Export Data</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
            <div className="space-y-3">
              {stats.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                    <Activity className="w-4 h-4 text-yellow-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{activity.description}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(activity.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
                          <button className="mt-4 text-sm text-yellow-600 hover:text-yellow-700">
              View all activity →
            </button>
          </div>
        </div>

        {/* Management Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            to="/admin/users"
            className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">User Management</h3>
                <p className="text-gray-600">Manage users, roles, and permissions</p>
                <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
                  <span>Total: {(stats.totalUsers || 0).toLocaleString()}</span>
                  <span>Active: {(stats.recentUsers || 0).toLocaleString()}</span>
                </div>
              </div>
              <Users className="w-12 h-12 text-yellow-600" />
            </div>
          </Link>

          <Link
            to="/admin/courses"
            className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Course Management</h3>
                <p className="text-gray-600">Manage courses, content, and students</p>
                <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
                  <span>Published: {stats.coursesByStatus?.PUBLISHED || 0}</span>
                  <span>Revenue: ${(stats.totalRevenue || 0).toLocaleString()}</span>
                </div>
              </div>
              <BookOpen className="w-12 h-12 text-green-600" />
            </div>
          </Link>
        </div>
      </div>
      </div>
    </AppLayout>
  )
}