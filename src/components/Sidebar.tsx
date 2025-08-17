import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  BookOpen, 
  Video, 
  Settings, 
  User, 
  Sun, 
  Moon,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  FileText,
  Award,
  BarChart3,
  LogOut,
  Shield,
  Users,
  Layout
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: (collapsed: boolean) => void;
  variant?: 'student' | 'admin';
}

export const Sidebar = ({ isCollapsed = false, onToggleCollapse, variant = 'student' }: SidebarProps) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [collapsed, setCollapsed] = useState(isCollapsed);
  const { user, logout } = useAuth();
  const location = useLocation();

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme) {
      setIsDarkMode(savedTheme === 'dark');
    } else {
      setIsDarkMode(systemDark);
    }
  }, []);

  // Apply theme to document
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const toggleCollapse = () => {
    const newCollapsed = !collapsed;
    setCollapsed(newCollapsed);
    onToggleCollapse?.(newCollapsed);
  };

  const getNavigationItems = () => {
    if (variant === 'admin') {
      return [
        { icon: Layout, label: 'Dashboard', href: '/admin/dashboard' },
        { icon: Users, label: 'Users', href: '/admin/users' },
        { icon: BookOpen, label: 'Courses', href: '/admin/courses' },
        { icon: BarChart3, label: 'Analytics', href: '/admin/analytics' },
        { icon: Settings, label: 'Settings', href: '/admin/settings' },
      ];
    }

    // Student navigation
    return [
      { icon: BookOpen, label: 'Courses', href: '/courses' },
      { icon: BarChart3, label: 'Progress', href: '/progress' },
      { icon: Award, label: 'Certificates', href: '/certificates' },
      { icon: FileText, label: 'Resources', href: '/resources' },
      { icon: User, label: 'Profile', href: '/profile' },
      { icon: Settings, label: 'Settings', href: '/settings' },
    ];
  };

  const navigationItems = getNavigationItems();

  const getThemeColors = () => {
    if (variant === 'admin') {
      return {
        bgGradient: 'from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800',
        border: 'border-blue-200 dark:border-gray-700',
        iconColor: 'text-blue-600 dark:text-blue-400',
        iconHover: 'group-hover:text-blue-700 dark:group-hover:text-blue-300',
        textGradient: 'from-blue-600 to-indigo-600',
        highlightColor: 'bg-blue-500/20',
        userBg: 'from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20',
        userBorder: 'border-blue-200 dark:border-blue-800',
        userAvatar: 'from-blue-500 to-indigo-500',
        userRole: 'text-blue-600 dark:text-blue-400',
        toggleButton: 'from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 border-blue-300 dark:border-blue-700'
      };
    }
    
    return {
      bgGradient: 'from-yellow-50 to-amber-50 dark:from-gray-900 dark:to-gray-800',
      border: 'border-yellow-200 dark:border-gray-700',
      iconColor: 'text-yellow-600 dark:text-yellow-400',
      iconHover: 'group-hover:text-yellow-700 dark:group-hover:text-yellow-300',
      textGradient: 'from-yellow-600 to-amber-600',
      highlightColor: 'bg-yellow-500/20',
      userBg: 'from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20',
      userBorder: 'border-yellow-200 dark:border-yellow-800',
      userAvatar: 'from-yellow-500 to-amber-500',
      userRole: 'text-yellow-600 dark:text-yellow-400',
      toggleButton: 'from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 border-yellow-300 dark:border-yellow-700'
    };
  };

  const colors = getThemeColors();

  return (
    <div className={`relative h-screen bg-gradient-to-b ${colors.bgGradient} border-r ${colors.border} transition-all duration-300 ${
      collapsed ? 'w-16' : 'w-64'
    }`}>
      {/* Logo/Brand */}
      <div className={`flex items-center justify-between p-4 border-b ${colors.border}`}>
        {!collapsed && (
          <Link to={variant === 'admin' ? '/admin/dashboard' : '/courses'} className="flex items-center space-x-2 group">
            <div className="relative">
              {variant === 'admin' ? (
                <Shield className={`h-8 w-8 ${colors.iconColor} ${colors.iconHover} transition-colors`} />
              ) : (
                <GraduationCap className={`h-8 w-8 ${colors.iconColor} ${colors.iconHover} transition-colors`} />
              )}
              <div className={`absolute -inset-1 ${colors.highlightColor} rounded-full opacity-0 group-hover:opacity-100 transition-opacity`}></div>
            </div>
            <span className={`text-xl font-bold bg-gradient-to-r ${colors.textGradient} bg-clip-text text-transparent`}>
              {variant === 'admin' ? 'CourseForge Admin' : 'CourseForge'}
            </span>
          </Link>
        )}
        {collapsed && (
          <Link to={variant === 'admin' ? '/admin/dashboard' : '/courses'} className="group">
            <div className="relative mx-auto">
              {variant === 'admin' ? (
                <Shield className={`h-8 w-8 ${colors.iconColor} ${colors.iconHover} transition-colors`} />
              ) : (
                <GraduationCap className={`h-8 w-8 ${colors.iconColor} ${colors.iconHover} transition-colors`} />
              )}
              <div className={`absolute -inset-1 ${colors.highlightColor} rounded-full opacity-0 group-hover:opacity-100 transition-opacity`}></div>
            </div>
          </Link>
        )}
      </div>

      {/* Navigation Items */}
      <nav className="mt-6 px-3">
        <ul className="space-y-1">
          {navigationItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href || 
                           (item.href !== '/' && location.pathname.startsWith(item.href));
            return (
              <li key={index}>
                <Link
                  to={item.href}
                  className={`sidebar-nav-item ${
                    isActive
                      ? 'sidebar-nav-item-active'
                      : 'sidebar-nav-item-inactive'
                  }`}
                  title={collapsed ? item.label : undefined}
                >
                  <div className="relative">
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    {isActive && (
                      <div className={`absolute -inset-1 ${colors.highlightColor} rounded-lg opacity-50`}></div>
                    )}
                  </div>
                  {!collapsed && (
                    <span className="ml-3 font-medium">{item.label}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Theme Toggle & User Section */}
      <div className={`absolute bottom-0 left-0 right-0 p-3 border-t ${colors.border} bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm`}>
        {/* Theme Toggle */}
        <div className="mb-3">
          <Button
            onClick={toggleTheme}
            variant="ghost"
            size="sm"
            className={`w-full flex items-center ${
              collapsed ? 'justify-center px-0' : 'justify-start px-3'
            } py-2 text-gray-600 hover:bg-yellow-100 hover:text-yellow-700 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-yellow-400 transition-all duration-200`}
            title={collapsed ? (isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode') : undefined}
          >
            {isDarkMode ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
            {!collapsed && (
              <span className="ml-3 font-medium">
                {isDarkMode ? 'Light Mode' : 'Dark Mode'}
              </span>
            )}
          </Button>
        </div>

        {/* Logout Button */}
        <div className="mb-3">
          <Button
            onClick={logout}
            variant="ghost"
            size="sm"
            className={`w-full flex items-center ${
              collapsed ? 'justify-center px-0' : 'justify-start px-3'
            } py-2 text-gray-600 hover:bg-red-100 hover:text-red-700 dark:text-gray-300 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-all duration-200`}
            title={collapsed ? 'Logout' : undefined}
          >
            <LogOut className="h-5 w-5" />
            {!collapsed && (
              <span className="ml-3 font-medium">Logout</span>
            )}
          </Button>
        </div>

        {/* User Profile */}
        {!collapsed && user && (
          <div className={`flex items-center px-3 py-2 rounded-xl bg-gradient-to-r ${colors.userBg} border ${colors.userBorder}`}>
            <div className="flex-shrink-0">
              <div className={`h-8 w-8 rounded-full bg-gradient-to-r ${colors.userAvatar} flex items-center justify-center shadow-sm`}>
                <span className="text-sm font-medium text-black">
                  {user.firstName?.charAt(0) || user.email?.charAt(0) || 'U'}
                </span>
              </div>
            </div>
            <div className="ml-3 min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.email}
              </p>
              <p className={`text-xs ${colors.userRole} truncate font-medium`}>
                {user.role === 'ADMIN' ? 'Administrator' : 'Student'}
              </p>
            </div>
          </div>
        )}

        {collapsed && user && (
          <div className="flex justify-center">
            <div className={`h-8 w-8 rounded-full bg-gradient-to-r ${colors.userAvatar} flex items-center justify-center shadow-sm`}>
              <span className="text-sm font-medium text-black">
                {user.firstName?.charAt(0) || user.email?.charAt(0) || 'U'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Collapse Toggle Button */}
      <Button
        onClick={toggleCollapse}
        variant="ghost"
        size="sm"
        className={`absolute -right-3 top-20 bg-gradient-to-r ${colors.toggleButton} text-black rounded-full p-1.5 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105`}
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
};