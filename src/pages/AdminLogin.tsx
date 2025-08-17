import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Shield, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react'

export default function AdminLogin() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  
  const { login, user, loading, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Show error message if redirected from protected route
  useEffect(() => {
    const stateError = location.state?.error
    if (stateError) {
      setError(stateError)
    }
  }, [location.state])

  // Redirect if already logged in as admin or check role after login
  useEffect(() => {
    if (!loading && user) {
      if (user.role === 'ADMIN') {
        navigate('/admin/dashboard')
      } else if (user.role !== 'ADMIN') {
        // User logged in but not admin - show error and logout
        setError('Access denied. Admin privileges required.')
        logout()
        setIsLoading(false)
      }
    }
  }, [user, loading, navigate, logout])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const result = await login(formData)
      
      if (result.success) {
        // The login function already sets the user in context
        // We'll check the role in a useEffect after the user state updates
        // For now, just wait a moment for the state to update
        setTimeout(() => {
          // The useEffect above will handle the redirect
        }, 100)
      } else {
        setError(result.error || 'Login failed')
      }
    } catch (error) {
      setError('Network error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Admin Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Admin Portal</h1>
          <p className="text-blue-200">CourseForge Administration</p>
        </div>

        {/* Login Form */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
                Admin Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="admin@courseforge.com"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12"
                  placeholder="Enter admin password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-300 bg-red-500/20 p-3 rounded-lg border border-red-500/30">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white py-3 px-4 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Verifying...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  Admin Login
                </>
              )}
            </button>
          </form>

          {/* Security Notice */}
          <div className="mt-6 p-4 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-300 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-yellow-200">
                <p className="font-medium mb-1">Security Notice</p>
                <p>This is a restricted area. All access attempts are logged and monitored.</p>
              </div>
            </div>
          </div>

          {/* Back to User Login */}
          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="text-blue-300 hover:text-blue-200 text-sm transition-colors"
            >
              ← Back to User Login
            </Link>
          </div>
        </div>

        {/* Default Admin Credentials (Development) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-4 bg-green-500/20 border border-green-500/30 rounded-lg">
            <p className="text-green-200 text-sm text-center">
              <strong>Development:</strong> admin@courseforge.com / Admin123!
            </p>
          </div>
        )}
      </div>
    </div>
  )
}