import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Trash2, Globe, Clock, Download, Zap,
  FolderOpen, ExternalLink, Search, Grid, List, MoreVertical
} from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return `${days} days ago`
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState('grid') // 'grid' | 'list'

  useEffect(() => { loadProjects() }, [])

  const loadProjects = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data, error } = await supabase
        .from('projects').select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      setProjects(data || [])
    } catch (err) {
      toast.error('Failed to load projects')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      const { error } = await supabase.from('projects').delete().eq('id', id)
      if (error) throw error
      setProjects(prev => prev.filter(p => p.id !== id))
      toast.success('Project deleted')
    } catch {
      toast.error('Failed to delete project')
    }
    setDeleting(null)
  }

  const filteredProjects = projects.filter(p =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.prompt && p.prompt.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div style={{ padding: '28px 40px', minHeight: 'calc(100vh - 64px)', background: 'var(--bg)', color: 'var(--text)' }}>
      {/* Top Banner / Search bar area (Replit Style) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text)', marginBottom: 4 }}>
              Projects
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Manage, edit, and deploy your AI-generated web applications.
            </p>
          </div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Link to="/project/new" style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 18px', borderRadius: 8, textDecoration: 'none',
              background: 'linear-gradient(135deg, var(--primary), var(--accent))',
              color: '#fff', fontSize: 13, fontWeight: 600, boxShadow: '0 4px 12px var(--primary-glow)'
            }}>
              <Plus size={16} />
              Create Project
            </Link>
          </motion.div>
        </div>

        {/* Filter controls */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 8, padding: '8px 16px', flexWrap: 'wrap'
        }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={16} style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search your projects..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%', background: 'transparent', border: 'none',
                color: 'var(--text)', fontSize: 13, outline: 'none', paddingLeft: 24
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 4, borderLeft: '1px solid var(--border)', paddingLeft: 12 }}>
            <button
              onClick={() => setViewMode('grid')}
              style={{
                background: viewMode === 'grid' ? 'var(--surface-2)' : 'transparent',
                border: 'none', cursor: 'pointer', color: viewMode === 'grid' ? 'var(--primary)' : 'var(--text-muted)',
                padding: 6, borderRadius: 6, display: 'flex', alignItems: 'center'
              }}
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              style={{
                background: viewMode === 'list' ? 'var(--surface-2)' : 'transparent',
                border: 'none', cursor: 'pointer', color: viewMode === 'list' ? 'var(--primary)' : 'var(--text-muted)',
                padding: 6, borderRadius: 6, display: 'flex', alignItems: 'center'
              }}
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Projects List/Grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ height: 130, borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)', position: 'relative', overflow: 'hidden' }}>
              <div className="shimmer" style={{ position: 'absolute', inset: 0 }} />
            </div>
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '80px 20px', border: '1px dashed var(--border)', borderRadius: 12, background: 'var(--surface)'
        }}>
          <FolderOpen size={40} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>No Projects Found</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, textAlign: 'center', maxWidth: 300 }}>
            {searchQuery ? 'Try adjusting your search terms.' : 'Build a web project using AI to get started.'}
          </p>
          {!searchQuery && (
            <Link to="/project/new" style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 16px', borderRadius: 8, textDecoration: 'none',
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              color: 'var(--text)', fontSize: 13, fontWeight: 600
            }}>
              <Plus size={14} /> Create your first Project
            </Link>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }} className="projects-grid">
          {filteredProjects.map(project => (
            <motion.div
              key={project.id}
              whileHover={{ y: -2, borderColor: 'rgba(99,102,241,0.3)' }}
              transition={{ duration: 0.15 }}
              style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 8, padding: 18, display: 'flex', flexDirection: 'column',
                justifyContent: 'space-between', minHeight: 140, cursor: 'pointer',
                position: 'relative'
              }}
              onClick={() => navigate(`/project/${project.id}`)}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 6,
                    background: 'var(--surface-2)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', border: '1px solid var(--border)'
                  }}>
                    <Globe size={15} color="var(--primary)" />
                  </div>
                  <span style={{
                    background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
                    color: 'var(--primary)', borderRadius: 4, padding: '2px 8px', fontSize: 10, fontWeight: 600
                  }}>
                    {project.website_type || 'Static'}
                  </span>
                </div>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {project.title}
                </h3>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.4, marginBottom: 12 }}>
                  {project.prompt || 'AI generated website'}
                </p>
              </div>

              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                paddingTop: 10, borderTop: '1px solid var(--border)'
              }}>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={10} /> {timeAgo(project.created_at)}
                </span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/project/${project.id}`) }}
                    className="icon-action-btn"
                    title="Open Project"
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                      padding: 4, display: 'flex', borderRadius: 4
                    }}
                  >
                    <ExternalLink size={13} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleting(project.id) }}
                    className="icon-action-btn delete"
                    title="Delete Project"
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                      padding: 4, display: 'flex', borderRadius: 4
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        /* List View (Highly Clean/Minimal Replit Style) */
        <div style={{ display: 'flex', flexDirection: 'column', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', overflow: 'hidden' }}>
          {filteredProjects.map((project, idx) => (
            <div
              key={project.id}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 20px', borderBottom: idx < filteredProjects.length - 1 ? '1px solid var(--border)' : 'none',
                cursor: 'pointer', background: 'transparent', transition: 'background 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              onClick={() => navigate(`/project/${project.id}`)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1, minWidth: 0 }}>
                <Globe size={16} color="var(--primary)" style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {project.title}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {project.prompt || 'AI generated website'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexShrink: 0 }}>
                <span style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 500, background: 'rgba(99,102,241,0.08)', padding: '2px 8px', borderRadius: 4 }}>
                  {project.website_type || 'Static'}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 100, textAlign: 'right' }}>
                  {timeAgo(project.created_at)}
                </span>
                <div style={{ display: 'flex', gap: 8 }} onClick={e => e.stopPropagation()}>
                  <button onClick={() => navigate(`/project/${project.id}`)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}><ExternalLink size={13} /></button>
                  <button onClick={() => setDeleting(project.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}><Trash2 size={13} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Modal */}
      <AnimatePresence>
        {deleting && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setDeleting(null)}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
              backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', zIndex: 50
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 12, padding: 24, maxWidth: 360, width: '90%'
              }}
            >
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: 'var(--text)' }}>Delete Project</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20, lineHeight: 1.5 }}>
                Are you sure you want to delete this project? All generated files will be permanently removed.
              </p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setDeleting(null)}
                  style={{
                    padding: '8px 14px', borderRadius: 6, cursor: 'pointer',
                    background: 'transparent', border: '1px solid var(--border)',
                    color: 'var(--text)', fontSize: 12, fontWeight: 500
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleting)}
                  style={{
                    padding: '8px 14px', borderRadius: 6, cursor: 'pointer',
                    background: 'var(--error)', border: 'none',
                    color: '#fff', fontSize: 12, fontWeight: 600
                  }}
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .shimmer {
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%);
          animation: shimmer 1.5s infinite;
        }
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        .icon-action-btn:hover {
          color: var(--text) !important;
          background: var(--surface-2) !important;
        }
        .icon-action-btn.delete:hover {
          color: var(--error) !important;
          background: rgba(239,68,68,0.1) !important;
        }
      `}</style>
    </div>
  )
}
