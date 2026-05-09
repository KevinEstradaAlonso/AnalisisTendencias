import { Outlet, Link, useLocation } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { 
  HomeIcon, 
  BellAlertIcon, 
  Cog6ToothIcon, 
  UsersIcon,
  Bars3Icon,
  XMarkIcon,
  ArrowRightOnRectangleIcon 
} from '@heroicons/react/24/outline'

export default function Layout() {
  const { userData, logout } = useAuth()
  const location = useLocation()

  const [isDesktop, setIsDesktop] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const navigation = [
    { name: 'Dashboard', href: '/', icon: HomeIcon },
    { name: 'Alertas', href: '/alertas', icon: BellAlertIcon },
  ]

  const adminNavigation = [
    { name: 'Usuarios', href: '/admin/usuarios', icon: UsersIcon },
    { name: 'Configuración', href: '/admin/configuracion', icon: Cog6ToothIcon },
  ]

  const isAdmin = userData?.rol === 'admin' || userData?.rol === 'super_admin'

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const sync = () => {
      setIsDesktop(mq.matches)
      setSidebarOpen(mq.matches)
    }
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  // Close sidebar on route change (mobile)
  useEffect(() => {
    if (!isDesktop) setSidebarOpen(false)
  }, [location.pathname, isDesktop])

  const handleNavClick = useMemo(() => {
    return () => {
      if (!isDesktop) setSidebarOpen(false)
    }
  }, [isDesktop])

  return (
    <div className="min-h-screen">
      {/* Sidebar - Liquid Glass */}
      <div
        className={
          `fixed inset-y-0 left-0 w-64 glass-sidebar z-30 transform transition-transform duration-300 ease-out ` +
          `${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`
        }
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center h-16 px-6 border-b border-white/30">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center">
                <span className="text-white font-bold text-sm">PC</span>
              </div>
              <span className="text-lg font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Pulso Ciudadano
              </span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={handleNavClick}
                  className={`flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-white/60 text-indigo-700 shadow-sm'
                      : 'text-gray-600 hover:bg-white/40 hover:text-gray-900'
                  }`}
                >
                  <item.icon className={`w-5 h-5 mr-3 ${isActive ? 'text-indigo-500' : ''}`} />
                  {item.name}
                </Link>
              )
            })}

            {isAdmin && (
              <>
                <div className="pt-6 mt-4 border-t border-white/30">
                  <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Administración
                  </p>
                </div>
                {adminNavigation.map((item) => {
                  const isActive = location.pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={handleNavClick}
                      className={`flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                        isActive
                          ? 'bg-white/60 text-indigo-700 shadow-sm'
                          : 'text-gray-600 hover:bg-white/40 hover:text-gray-900'
                      }`}
                    >
                      <item.icon className={`w-5 h-5 mr-3 ${isActive ? 'text-indigo-500' : ''}`} />
                      {item.name}
                    </Link>
                  )
                })}
              </>
            )}
          </nav>

          {/* User info */}
          <div className="p-4 border-t border-white/30">
            <div className="flex items-center justify-between glass-button">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-700 truncate">
                  {userData?.email}
                </p>
                <p className="text-xs text-gray-500 capitalize">{userData?.rol}</p>
              </div>
              <button
                onClick={logout}
                className="ml-2 p-2 text-gray-400 hover:text-indigo-600 transition-colors"
                title="Cerrar sesión"
              >
                <ArrowRightOnRectangleIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div
        className={
          `transition-transform duration-300 ease-out lg:pl-64 ` +
          `${sidebarOpen ? 'translate-x-64' : 'translate-x-0'} lg:translate-x-0`
        }
      >
        <main className="px-4 py-6 sm:p-8 animate-fade-in">
          <div className="mx-auto w-full max-w-7xl">
            {/* Mobile header */}
            <div className="lg:hidden mb-4 flex items-center justify-between">
              <button
                className="glass-button p-2"
                onClick={() => setSidebarOpen(v => !v)}
                aria-label={sidebarOpen ? 'Cerrar menú' : 'Abrir menú'}
              >
                {sidebarOpen ? (
                  <XMarkIcon className="w-5 h-5 text-gray-700" />
                ) : (
                  <Bars3Icon className="w-5 h-5 text-gray-700" />
                )}
              </button>
              <div className="text-xs text-gray-400 font-light">Pulso Ciudadano</div>
            </div>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
