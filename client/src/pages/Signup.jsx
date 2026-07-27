import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Eye, EyeOff, User, Mail, Lock, CheckCircle2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import './auth.css'

export default function Signup() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Custom states
  const [isPasswordFocused, setIsPasswordFocused] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [activeModal, setActiveModal] = useState(null)

  const passwordChecks = {
    length: form.password.length >= 8,
    upper: /[A-Z]/.test(form.password),
    number: /[0-9]/.test(form.password),
    symbol: /[^A-Za-z0-9]/.test(form.password),
  }

  const strength = Object.values(passwordChecks).filter(Boolean).length
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong']
  const strengthColor = ['', '#ef4444', '#f97316', '#eab308', '#22c55e']

  const validate = () => {
    const errs = {}
    if (!form.name.trim()) errs.name = 'Name is required'
    if (!form.email) errs.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Invalid email format'
    if (!form.password) errs.password = 'Password is required'
    else if (form.password.length < 8) errs.password = 'Min 8 characters'
    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match'
    if (!agreeTerms) errs.terms = 'You must agree to the terms'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      console.log('Attempting auth with:', form.email.trim().toLowerCase())
      console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL)

      const { data, error: authError } = await supabase.auth.signUp({
        email: form.email.trim().toLowerCase(),
        password: form.password,
        options: {
          data: { full_name: form.name.trim() }
        }
      })

      console.log('Auth response - data:', data)
      console.log('Auth response - error:', authError)

      if (authError) throw authError

      if (data.user && !data.session) {
        // Email confirmation required
        setSuccess('Check your email to confirm your account!')
        toast.success('Check your email to confirm your account!', { duration: 6000 })
        return
      }

      if (data.user && data.session) {
        // Auto-confirmed, insert profile then redirect
        await supabase.from('profiles').upsert({
          id: data.user.id,
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          created_at: new Date().toISOString()
        })
        localStorage.setItem('user', JSON.stringify(data.user))
        
        // Success Overlay State
        setShowSuccess(true)
        setTimeout(() => {
          toast.success('Account created!')
          navigate('/dashboard')
        }, 1500)
      }
    } catch (err) {
      setError(err.message || 'Signup failed')
      toast.error(err.message || 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setErrors(prev => ({ ...prev, [field]: '' }))
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: 'easeOut' }
    }
  }

  return (
    <div className="auth-root">
      {/* Success Overlay Panel */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            className="fixed inset-0 z-50 bg-[#050508] flex flex-col items-center justify-center text-center p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="text-[#22c55e] mb-6"
            >
              <svg 
                width="84" 
                height="84" 
                viewBox="0 0 100 100" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="6" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <circle 
                  cx="50" 
                  cy="50" 
                  r="40" 
                  stroke="rgba(34, 197, 94, 0.15)"
                />
                <motion.path 
                  d="M30 50 L45 65 L70 35"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: 0.2, duration: 0.5, ease: 'easeInOut' }}
                />
              </svg>
            </motion.div>
            <h2 className="text-2xl font-bold mb-2 text-text">Account created!</h2>
            <p className="text-text-muted">Redirecting you to dashboard...</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LEFT PANEL */}
      <motion.div 
        className="auth-left"
        initial={{ x: -40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <div className="auth-left-orb" />
        <div className="auth-left-orb-2" />
        
        <div className="auth-left-content">
          <Link to="/" className="auth-logo">
            &lt;/&gt; WebGen
          </Link>
          <h2 className="auth-left-heading">Start building today</h2>
          <p className="auth-left-sub">Join thousands of creators building with AI</p>
          
          <div className="auth-stats">
            <div className="auth-stat">
              <span className="auth-stat-num">10,000+</span>
              <span className="auth-stat-label">Websites Built</span>
            </div>
            <div className="auth-stat">
              <span className="auth-stat-num">&lt; 60s</span>
              <span className="auth-stat-label">Avg Build Time</span>
            </div>
            <div className="auth-stat">
              <span className="auth-stat-num">Free</span>
              <span className="auth-stat-label">To Get Started</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* RIGHT PANEL */}
      <motion.div 
        className="auth-right"
        initial={{ x: 40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        {/* Creative Background Elements */}
        <div className="auth-right-grid" />
        <div className="auth-right-glow" />

        {/* Back Button */}
        <Link to="/" className="auth-back-btn">
          <ArrowLeft size={16} />
          <span>Back</span>
        </Link>

        <div className="auth-form-container">
          {/* Mobile Logo */}
          <Link to="/" className="auth-mobile-logo">
            &lt;/&gt; WebGen
          </Link>

          <h1 className="auth-form-title">Create account</h1>
          <p className="auth-form-subtitle">
            Already have one? <Link to="/login">Sign in</Link>
          </p>

          <form onSubmit={handleSubmit}>
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-3"
            >
              <AnimatePresence>
                {error && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    style={{ color: 'var(--error)', fontSize: '0.75rem', padding: '6px 10px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '6px', textAlign: 'center' }}
                  >
                    {error}
                  </motion.div>
                )}
                {success && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    style={{ color: 'var(--success)', fontSize: '0.75rem', padding: '6px 10px', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)', borderRadius: '6px', textAlign: 'center' }}
                  >
                    {success}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Full Name */}
              <motion.div variants={itemVariants} className="auth-field">
                <label className="auth-label">Full Name</label>
                <motion.div className="auth-input-wrap" whileFocus={{ scale: 1.01 }}>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    className={`auth-input no-right ${errors.name ? 'has-error' : ''}`}
                    placeholder="John Doe"
                  />
                  <div className="auth-icon-left">
                    <User size={16} />
                  </div>
                </motion.div>
                <AnimatePresence>
                  {errors.name && (
                    <motion.p 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="auth-error-msg"
                    >
                      {errors.name}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Email */}
              <motion.div variants={itemVariants} className="auth-field">
                <label className="auth-label">Email</label>
                <motion.div className="auth-input-wrap" whileFocus={{ scale: 1.01 }}>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    className={`auth-input no-right ${errors.email ? 'has-error' : ''}`}
                    placeholder="you@example.com"
                  />
                  <div className="auth-icon-left">
                    <Mail size={16} />
                  </div>
                </motion.div>
                <AnimatePresence>
                  {errors.email && (
                    <motion.p 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="auth-error-msg"
                    >
                      {errors.email}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Password */}
              <motion.div variants={itemVariants} className="auth-field">
                <label className="auth-label">Password</label>
                <motion.div className="auth-input-wrap" whileFocus={{ scale: 1.01 }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => updateField('password', e.target.value)}
                    onFocus={() => setIsPasswordFocused(true)}
                    onBlur={() => setIsPasswordFocused(false)}
                    className={`auth-input ${errors.password ? 'has-error' : ''}`}
                    placeholder="••••••••"
                  />
                  <div className="auth-icon-left">
                    <Lock size={16} />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="auth-icon-right"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </motion.div>
                
                {/* Strength Meter */}
                {form.password && (
                  <div>
                    <div className="auth-strength-bar">
                      <div className="auth-strength-seg" style={{ background: strength >= 1 ? strengthColor[strength] : '' }} />
                      <div className="auth-strength-seg" style={{ background: strength >= 2 ? strengthColor[strength] : '' }} />
                      <div className="auth-strength-seg" style={{ background: strength >= 3 ? strengthColor[strength] : '' }} />
                      <div className="auth-strength-seg" style={{ background: strength >= 4 ? strengthColor[strength] : '' }} />
                    </div>
                    <p className="auth-strength-label" style={{ color: strengthColor[strength] || 'var(--text-muted)' }}>
                      {strengthLabel[strength] || 'Weak'}
                    </p>
                  </div>
                )}

                {/* Requirements checklist */}
                <AnimatePresence>
                  {isPasswordFocused && (
                    <motion.div 
                      className="auth-checks"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                    >
                      <div className={`auth-check-item ${passwordChecks.length ? 'met' : ''}`}>
                        <span className="auth-check-icon">{passwordChecks.length ? '✓' : '○'}</span>
                        <span>At least 8 characters</span>
                      </div>
                      <div className={`auth-check-item ${passwordChecks.upper ? 'met' : ''}`}>
                        <span className="auth-check-icon">{passwordChecks.upper ? '✓' : '○'}</span>
                        <span>One uppercase letter</span>
                      </div>
                      <div className={`auth-check-item ${passwordChecks.number ? 'met' : ''}`}>
                        <span className="auth-check-icon">{passwordChecks.number ? '✓' : '○'}</span>
                        <span>One number</span>
                      </div>
                      <div className={`auth-check-item ${passwordChecks.symbol ? 'met' : ''}`}>
                        <span className="auth-check-icon">{passwordChecks.symbol ? '✓' : '○'}</span>
                        <span>One special character</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                <AnimatePresence>
                  {errors.password && (
                    <motion.p 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="auth-error-msg"
                    >
                      {errors.password}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Confirm Password */}
              <motion.div variants={itemVariants} className="auth-field">
                <label className="auth-label">Confirm Password</label>
                <motion.div className="auth-input-wrap" whileFocus={{ scale: 1.01 }}>
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={form.confirmPassword}
                    onChange={(e) => updateField('confirmPassword', e.target.value)}
                    className={`auth-input ${errors.confirmPassword ? 'has-error' : ''}`}
                    placeholder="••••••••"
                  />
                  <div className="auth-icon-left">
                    <Lock size={16} />
                  </div>
                  {form.password && form.confirmPassword && form.password === form.confirmPassword && (
                    <div className="auth-match-icon">
                      <CheckCircle2 size={14} />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="auth-icon-right"
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </motion.div>
                <AnimatePresence>
                  {errors.confirmPassword && (
                    <motion.p 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="auth-error-msg"
                    >
                      {errors.confirmPassword}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Terms Checkbox */}
              <motion.div variants={itemVariants} className="auth-field" style={{ marginTop: '0.4rem' }}>
                <div className="auth-checkbox-row" onClick={() => setAgreeTerms(!agreeTerms)}>
                  <div className={`auth-checkbox ${agreeTerms ? 'checked' : ''}`}>
                    {agreeTerms && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                  <span className="auth-checkbox-label">
                    I agree to the{' '}
                    <button type="button" onClick={(e) => { e.stopPropagation(); setActiveModal('terms') }}>Terms of Service</button>
                    {' '}and{' '}
                    <button type="button" onClick={(e) => { e.stopPropagation(); setActiveModal('privacy') }}>Privacy Policy</button>
                  </span>
                </div>
                <AnimatePresence>
                  {errors.terms && (
                    <motion.p 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="auth-error-msg"
                      style={{ marginLeft: '24px' }}
                    >
                      {errors.terms}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Submit Button */}
              <motion.div variants={itemVariants}>
                <motion.button
                  type="submit"
                  disabled={loading || !agreeTerms}
                  className="auth-submit-btn"
                  whileHover={agreeTerms ? { scale: 1.02 } : {}}
                  whileTap={agreeTerms ? { scale: 0.98 } : {}}
                >
                  {loading ? <div className="auth-spinner" /> : null}
                  <span>{loading ? 'Creating account...' : 'Create Account'}</span>
                </motion.button>
              </motion.div>
            </motion.div>
          </form>

          {/* Divider */}
          <div className="auth-divider">
            <span>or continue with</span>
          </div>

          {/* Google Button */}
          <button
            onClick={async () => {
              const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                  redirectTo: `${window.location.origin}/auth/callback`,
                  queryParams: {
                    prompt: 'select_account'
                  }
                }
              })
              if (error) {
                console.error('Google OAuth error:', error)
                toast.error('Google sign in failed')
              }
            }}
            className="auth-google-btn"
          >
            <svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            <span>Continue with Google</span>
          </button>
        </div>
      </motion.div>

      {/* POPUP MODAL */}
      <AnimatePresence>
        {activeModal && (
          <motion.div 
            className="auth-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveModal(null)}
          >
            <motion.div 
              className="auth-modal-content"
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="auth-modal-header">
                <span className="auth-modal-title">
                  {activeModal === 'terms' ? 'Terms of Service' : 'Privacy Policy'}
                </span>
                <button className="auth-modal-close" onClick={() => setActiveModal(null)}>
                  <X size={16} />
                </button>
              </div>
              <div className="auth-modal-body">
                {activeModal === 'terms' ? (
                  <>
                    <p>Welcome to WebGen. By accessing or using our platform, you agree to comply with and be bound by the following terms and conditions.</p>
                    <h4>1. Account Registration</h4>
                    <p>You must provide accurate and complete information when creating an account. You are solely responsible for maintaining account confidentiality.</p>
                    <h4>2. Acceptable Use</h4>
                    <p>You agree not to use the builder to generate malicious code, phishing pages, deceptive content, or anything that violates local laws.</p>
                    <h4>3. Intellectual Property</h4>
                    <p>The code you write, design, and export belongs to you. WebGen makes no claims of ownership over your user-generated websites.</p>
                    <h4>4. Limitation of Liability</h4>
                    <p>WebGen provides the generator tools "as is" without warranty. We are not liable for hosting costs, deployment issues, or code bugs in exported files.</p>
                  </>
                ) : (
                  <>
                    <p>At WebGen, we take your privacy seriously. This document outlines how we collect, use, and protect your information.</p>
                    <h4>1. Information Collection</h4>
                    <p>We collect your email, full name, and workspace preferences to provide personal dashboard capabilities and save generation logs.</p>
                    <h4>2. Third-Party Integrations</h4>
                    <p>We integrate securely with Supabase for data management and Google OAuth for registration. Your credentials are never stored directly on our servers.</p>
                    <h4>3. Data Protection</h4>
                    <p>We implement top-tier encryption protocols to ensure security of exported file assets and prompt details sent to Gemini AI API.</p>
                    <h4>4. User Controls</h4>
                    <p>You retain full rights to delete your generated projects or permanently remove your account profile via workspace settings at any time.</p>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
