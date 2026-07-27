import { useState, useEffect } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Plus, LogOut, Menu, X, ChevronLeft, ChevronRight
} from 'lucide-react'
import { supabase } from '../lib/supabase'

function Avatar({ user, size = 40 }) {
  const initials = (user?.name || user?.email || 'U')
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  if (user?.avatar_url) {
    return (
      <img
        src={user.avatar_url}
        alt={user.name}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
      />
    )
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'linear-gradient(135deg, var(--primary), var(--accent))',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 700, color: '#fff', letterSpacing: '0.02em'
    }}>
      {initials}
    </div>
  )
}

export default function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  useEffect(() => {
    loadUser()
  }, [])

  const loadUser = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) return
      const { data: profile } = await supabase
        .from('profiles').select('*').eq('id', authUser.id).maybeSingle()
      setUser(profile || {
        name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
        email: authUser.email,
        avatar_url: authUser.user_metadata?.avatar_url || null,
      })
    } catch {}
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    localStorage.removeItem('user')
    navigate('/')
  }

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/')

  const PAGE_TITLES = {
    '/dashboard': 'Dashboard',
    '/project/new': 'New Project',
    '/settings': 'Settings',
  }

  const pageTitle = Object.entries(PAGE_TITLES).find(([k]) =>
    location.pathname === k || (k !== '/dashboard' && location.pathname.startsWith(k))
  )?.[1] || 'WebGen'

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', to: '/dashboard' },
  ]

  const SidebarContent = () => (
    <div className={`sidebar-container ${isSidebarCollapsed ? 'collapsed' : ''}`}>
      {/* Logo Section */}
      <div style={{
        display: 'flex',
        flexDirection: isSidebarCollapsed ? 'column' : 'row',
        alignItems: 'center',
        justifyContent: isSidebarCollapsed ? 'center' : 'space-between',
        gap: isSidebarCollapsed ? 12 : 10,
        padding: isSidebarCollapsed ? '20px 8px' : '24px 16px 20px',
        borderBottom: '1px solid var(--border)',
        marginBottom: 8
      }}>
        <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, var(--primary), var(--accent))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 800, color: '#fff', flexShrink: 0
          }}>W</div>
          {!isSidebarCollapsed && <span className="sidebar-logo-text">WebGen</span>}
        </Link>
        
        {/* Toggle Collapse Button (Desktop Only) */}
        {!sidebarOpen && (
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            style={{
              background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 6, borderRadius: 6,
              width: 28, height: 28, flexShrink: 0
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            {isSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {/* New Project — special gradient button */}
        <motion.div whileHover={{ opacity: 0.92 }} whileTap={{ scale: 0.97 }}>
          <Link to="/project/new" className="sidebar-nav-item sidebar-new-project-btn" style={{
            display: 'flex', alignItems: 'center', gap: 10,
            height: 44, padding: isSidebarCollapsed ? '0' : '0 16px', justifyContent: isSidebarCollapsed ? 'center' : 'flex-start',
            borderRadius: 10, textDecoration: 'none',
            background: 'linear-gradient(135deg, var(--primary), var(--accent))',
            color: '#fff', fontSize: 14, fontWeight: 600, marginBottom: 4
          }}>
            <Plus size={18} style={{ flexShrink: 0 }} />
            {!isSidebarCollapsed && <span className="sidebar-nav-item-text">New Project</span>}
          </Link>
        </motion.div>

        {navItems.map(({ icon: Icon, label, to }) => {
          const active = isActive(to)
          return (
            <motion.div key={to} whileTap={{ scale: 0.97 }}>
              <Link to={to} className={`sidebar-nav-item ${active ? 'active' : ''}`} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                height: 44, padding: isSidebarCollapsed ? '0' : '0 16px', justifyContent: isSidebarCollapsed ? 'center' : 'flex-start',
                borderRadius: 10, textDecoration: 'none',
                background: active ? 'rgba(99,102,241,0.15)' : 'transparent',
                color: active ? 'var(--primary)' : 'var(--text-muted)',
                fontSize: 14, fontWeight: 500, transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--text)' } }}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' } }}
              >
                <Icon size={18} style={{ flexShrink: 0 }} />
                {!isSidebarCollapsed && <span className="sidebar-nav-item-text">{label}</span>}
              </Link>
            </motion.div>
          )
        })}
      </nav>

      {/* User section — linked to settings page */}
      <div className="sidebar-user-section" style={{ padding: '12px', borderTop: '1px solid var(--border)' }}>
        <div className="sidebar-user-info" style={{ display: 'flex', flexDirection: isSidebarCollapsed ? 'column' : 'row', alignItems: 'center', gap: 10 }}>
          <Link to="/settings" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
            <Avatar user={user} size={36} />
            {!isSidebarCollapsed && (
              <div className="sidebar-user-details" style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.name || 'User'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.email || ''}
                </div>
              </div>
            )}
          </Link>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleLogout}
            title="Logout"
            className="sidebar-logout-btn"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', padding: 6, borderRadius: 8,
              display: 'flex', alignItems: 'center', transition: 'color 0.15s', flexShrink: 0
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--error)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <LogOut size={16} />
          </motion.button>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      {/* Sidebar — desktop */}
      <div className="app-sidebar-desktop">
        <SidebarContent />
      </div>

      {/* Mobile hamburger + drawer */}
      <div className="app-sidebar-mobile">
        <AnimatePresence>
          {sidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setSidebarOpen(false)}
                style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 30 }}
              />
              <motion.div
                initial={{ x: -240 }} animate={{ x: 0 }} exit={{ x: -240 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                style={{ position: 'fixed', top: 0, left: 0, zIndex: 40 }}
              >
                <SidebarContent />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        {/* Top bar (with profile & settings avatar removed from top-right) */}
        {!(location.pathname.startsWith('/project/') && location.pathname !== '/project/new') && (
          <div style={{
            height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 24px', borderBottom: '1px solid var(--border)',
            background: 'rgba(5,5,8,0.8)', backdropFilter: 'blur(20px)',
            position: 'sticky', top: 0, zIndex: 10, flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                className="app-hamburger"
                onClick={() => setSidebarOpen(true)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 6 }}
              >
                <Menu size={20} />
              </button>
              <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{pageTitle}</h1>
            </div>
          </div>
        )}

        {/* Page content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <Outlet context={{ user, reloadUser: loadUser, isSidebarCollapsed, setIsSidebarCollapsed }} />
        </div>
      </div>

      <style>{`
        .app-sidebar-desktop { display: flex; }
        .app-sidebar-mobile { display: none; }
        .app-hamburger { display: none !important; }
        
        .sidebar-container {
          width: 240px;
          height: 100vh;
          background: var(--surface);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
          transition: width 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .sidebar-container.collapsed {
          width: 64px;
        }
        .sidebar-logo-text {
          font-size: 17px;
          font-weight: 700;
          background: linear-gradient(135deg, var(--primary), var(--accent));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .sidebar-nav-item-text {
          transition: opacity 0.2s;
        }
        .sidebar-user-info {
          padding: 8px;
          border-radius: 10px;
          transition: all 0.2s;
        }
        .sidebar-user-details {
          flex: 1;
          min-width: 0;
          transition: opacity 0.2s;
        }

        @media (max-width: 767px) {
          .app-sidebar-desktop { display: none !important; }
          .app-sidebar-mobile { display: block; }
          .app-hamburger { display: flex !important; }
        }
      `}</style>
    </div>
  )
}
