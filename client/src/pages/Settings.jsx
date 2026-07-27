import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, Save, X, Eye, EyeOff, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'

const card = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 28, marginBottom: 20 }
const inp = { width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '11px 16px', fontSize: 14, color: 'var(--text)', outline: 'none', fontFamily: 'Inter,sans-serif', transition: 'border-color .2s,box-shadow .2s', boxSizing: 'border-box' }
const label = { fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 7 }

function Toggle({ on, onChange }) {
  return (
    <motion.button onClick={() => onChange(!on)}
      style={{ width: 44, height: 24, borderRadius: 999, border: 'none', cursor: 'pointer', position: 'relative', background: on ? 'var(--primary)' : 'var(--surface-2)', transition: 'background .2s', flexShrink: 0, padding: 0 }}>
      <motion.span animate={{ x: on ? 22 : 2 }} transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        style={{ position: 'absolute', top: 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', display: 'block' }} />
    </motion.button>
  )
}

function Avatar({ user, size = 80 }) {
  const initials = (user?.name || user?.email || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  if (user?.avatar_url)
    return <img src={user.avatar_url} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }} />
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: 'linear-gradient(135deg,var(--primary),var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * .35, fontWeight: 700, color: '#fff' }}>
      {initials}
    </div>
  )
}

export default function Settings() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [editingProfile, setEditingProfile] = useState(false)
  const [name, setName] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [emailNotifs, setEmailNotifs] = useState(true)
  const [marketingEmails, setMarketingEmails] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [isGoogleUser, setIsGoogleUser] = useState(false)

  useEffect(() => { loadUser() }, [])

  const loadUser = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return
    setUser(authUser)
    setIsGoogleUser(authUser.app_metadata?.provider === 'google')
    const { data } = await supabase.from('profiles').select('*').eq('id', authUser.id).maybeSingle()
    const p = data || { name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User', email: authUser.email, avatar_url: authUser.user_metadata?.avatar_url || null }
    setProfile(p); setName(p.name || '')
  }

  const handleSaveProfile = async () => {
    setSavingProfile(true)
    try {
      const { error } = await supabase.from('profiles').upsert({ id: user.id, name, email: user.email, updated_at: new Date().toISOString() })
      if (error) throw error
      setProfile(p => ({ ...p, name })); setEditingProfile(false); toast.success('Profile updated!')
    } catch { toast.error('Failed to update profile') }
    setSavingProfile(false)
  }

  const handleChangePassword = async () => {
    if (newPwd !== confirmPwd) { toast.error('Passwords do not match'); return }
    if (newPwd.length < 6) { toast.error('Password must be at least 6 characters'); return }
    try {
      const { error } = await supabase.auth.updateUser({ password: newPwd })
      if (error) throw error
      toast.success('Password changed!'); setChangingPassword(false); setCurrentPwd(''); setNewPwd(''); setConfirmPwd('')
    } catch (err) { toast.error(err.message || 'Failed to change password') }
  }

  const handleDeleteAccount = async () => {
    try {
      await supabase.from('profiles').delete().eq('id', user.id)
      await supabase.auth.signOut()
      window.location.href = '/'
    } catch { toast.error('Failed to delete account') }
  }

  const displayName = profile?.name || user?.email?.split('@')[0] || 'User'

  return (
    <div style={{ padding: 32, maxWidth: 720, margin: '0 auto' }}>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 6 }}>Settings</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 32 }}>Manage your account and preferences</p>

        {/* Profile card */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: editingProfile ? 24 : 0, flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ position: 'relative' }}>
                <Avatar user={profile} size={72} />
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, cursor: 'pointer', transition: 'opacity .2s' }}
                  onMouseEnter={e => e.currentTarget.style.opacity = 1}
                  onMouseLeave={e => e.currentTarget.style.opacity = 0}>
                  <Camera size={18} color="#fff" />
                </div>
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{displayName}</div>
                <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>{user?.email}</div>
              </div>
            </div>
            {!editingProfile && (
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: .97 }}
                onClick={() => setEditingProfile(true)}
                style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Edit Profile
              </motion.button>
            )}
          </div>
          <AnimatePresence>
            {editingProfile && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                <div style={{ paddingTop: 4 }}>
                  <div style={{ marginBottom: 14 }}>
                    <label style={label}>Full Name</label>
                    <input value={name} onChange={e => setName(e.target.value)} style={inp}
                      onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px var(--primary-glow)' }}
                      onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }} />
                  </div>
                  <div style={{ marginBottom: 20 }}>
                    <label style={label}>Email {isGoogleUser && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(managed by Google)</span>}</label>
                    <input value={user?.email || ''} readOnly style={{ ...inp, opacity: .6, cursor: 'not-allowed' }} />
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: .97 }} onClick={handleSaveProfile} disabled={savingProfile}
                      style={{ padding: '9px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,var(--primary),var(--accent))', color: '#fff', fontSize: 13, fontWeight: 600 }}>
                      {savingProfile ? 'Saving...' : 'Save Changes'}
                    </motion.button>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: .97 }} onClick={() => { setEditingProfile(false); setName(profile?.name || '') }}
                      style={{ padding: '9px 16px', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', fontSize: 13, cursor: 'pointer' }}>
                      Cancel
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Account card */}
        <div style={card}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Account</h2>

          {!isGoogleUser && (
            <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>Change Password</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Update your account password</div>
                </div>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: .97 }} onClick={() => setChangingPassword(c => !c)}
                  style={{ padding: '7px 14px', borderRadius: 9, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  {changingPassword ? 'Cancel' : 'Change'}
                </motion.button>
              </div>
              <AnimatePresence>
                {changingPassword && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                    <div style={{ paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {[['New Password', newPwd, setNewPwd], ['Confirm Password', confirmPwd, setConfirmPwd]].map(([lbl, val, setter]) => (
                        <div key={lbl}>
                          <label style={label}>{lbl}</label>
                          <div style={{ position: 'relative' }}>
                            <input type={showPwd ? 'text' : 'password'} value={val} onChange={e => setter(e.target.value)} style={{ ...inp, paddingRight: 42 }}
                              onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px var(--primary-glow)' }}
                              onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }} />
                            <button onClick={() => setShowPwd(s => !s)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                              {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                          </div>
                        </div>
                      ))}
                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: .97 }} onClick={handleChangePassword}
                        style={{ padding: '9px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,var(--primary),var(--accent))', color: '#fff', fontSize: 13, fontWeight: 600, alignSelf: 'flex-start' }}>
                        Update Password
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Connected Accounts</div>
            {isGoogleUser ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg viewBox="0 0 24 24" width="18" height="18"><path fill="#4285F4" d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12.255 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96h-3.98v3.09C3.515 21.3 7.615 24 12.255 24z"/><path fill="#FBBC05" d="M5.525 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62h-3.98a11.86 11.86 0 000 10.76l3.98-3.09z"/><path fill="#EA4335" d="M12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C18.205 1.19 15.495 0 12.255 0c-4.64 0-8.74 2.7-10.71 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
                </div>
                <span style={{ fontSize: 13 }}>{user?.email}</span>
                <span style={{ padding: '3px 10px', borderRadius: 999, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', color: 'var(--success)', fontSize: 11, fontWeight: 600 }}>Connected</span>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No social accounts connected.</div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--error)' }}>Delete Account</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Permanently delete your account and all data</div>
            </div>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: .97 }} onClick={() => setDeleteConfirm(true)}
              style={{ padding: '7px 14px', borderRadius: 9, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: 'var(--error)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              Delete
            </motion.button>
          </div>
        </div>

        {/* Preferences card */}
        <div style={card}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Preferences</h2>
          {[['Email Notifications', 'Get notified about your projects', emailNotifs, setEmailNotifs],
            ['Marketing Emails', 'Receive tips and product updates', marketingEmails, setMarketingEmails]
          ].map(([title, desc, val, setter]) => (
            <div key={title} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{desc}</div>
              </div>
              <Toggle on={val} onChange={setter} />
            </div>
          ))}
        </div>
      </motion.div>

      {/* Delete confirm modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setDeleteConfirm(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
            <motion.div initial={{ scale: .88, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: .88, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 32, maxWidth: 380, width: '90%' }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
                <AlertTriangle size={24} color="var(--error)" />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Delete Account?</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 28, lineHeight: 1.6 }}>This will permanently delete your account and all your projects. This cannot be undone.</p>
              <div style={{ display: 'flex', gap: 12 }}>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: .97 }} onClick={() => setDeleteConfirm(false)}
                  style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Cancel</motion.button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: .97 }} onClick={handleDeleteAccount}
                  style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Delete Forever</motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
