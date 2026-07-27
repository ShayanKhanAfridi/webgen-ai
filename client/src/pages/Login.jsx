import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Eye, EyeOff, Mail, Lock, Zap, Code, Download, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import './auth.css'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  
  // Modal State
  const [activeModal, setActiveModal] = useState(null)

  const validate = () => {
    const errs = {}
    if (!email) errs.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = 'Invalid email format'
    if (!password) errs.password = 'Password is required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    setError('')

    try {
      console.log('Attempting auth with:', email.trim().toLowerCase())
      console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL)

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password,
      })

      console.log('Auth response - data:', data)
      console.log('Auth response - error:', authError)

      if (authError) throw authError

      if (data.session) {
        localStorage.setItem('user', JSON.stringify(data.user))
        toast.success('Welcome back!')
        navigate('/dashboard')
      }

    } catch (err) {
      if (err.message.includes('Email not confirmed')) {
        setError('Please confirm your email first. Check your inbox.')
      } else if (err.message.includes('Invalid login credentials')) {
        setError('Wrong email or password.')
      } else {
        setError(err.message || 'Login failed')
      }
      toast.error(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
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
          <h2 className="auth-left-heading">Welcome back</h2>
          <p className="auth-left-sub">Sign in to continue building amazing websites</p>
          
          <div className="auth-pills">
            <div className="auth-pill">
              <Zap size={16} />
              <span>Generate websites in seconds</span>
            </div>
            <div className="auth-pill">
              <Code size={16} />
              <span>Monaco Editor with live preview</span>
            </div>
            <div className="auth-pill">
              <Download size={16} />
              <span>Export and deploy instantly</span>
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

          <h1 className="auth-form-title">Sign in</h1>
          <p className="auth-form-subtitle">
            New here? <Link to="/signup">Create an account</Link>
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
              </AnimatePresence>

              {/* Email Field */}
              <motion.div variants={itemVariants} className="auth-field">
                <label className="auth-label">Email address</label>
                <motion.div className="auth-input-wrap" whileFocus={{ scale: 1.01 }}>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setErrors(prev => ({ ...prev, email: '' })) }}
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

              {/* Password Field */}
              <motion.div variants={itemVariants} className="auth-field">
                <label className="auth-label">Password</label>
                <motion.div className="auth-input-wrap" whileFocus={{ scale: 1.01 }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setErrors(prev => ({ ...prev, password: '' })) }}
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
                <div className="auth-forgot-row">
                  <Link to="/forgot-password" className="auth-forgot-link">Forgot password?</Link>
                </div>
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

              {/* Submit Button */}
              <motion.div variants={itemVariants}>
                <motion.button
                  type="submit"
                  disabled={loading}
                  className="auth-submit-btn"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {loading ? <div className="auth-spinner" /> : null}
                  <span>{loading ? 'Signing in...' : 'Sign In'}</span>
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

          {/* Bottom links */}
          <p className="auth-terms">
            By signing in you agree to our{' '}
            <button type="button" onClick={() => setActiveModal('terms')}>Terms of Service</button>
            {' '}and{' '}
            <button type="button" onClick={() => setActiveModal('privacy')}>Privacy Policy</button>
          </p>
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
