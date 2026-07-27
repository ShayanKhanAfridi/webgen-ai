import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(c => c - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [cooldown])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email) { toast.error('Enter your email'); return }
    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email)
      if (error) throw error
      setSent(true)
      setCooldown(60)
      toast.success('Reset link sent!')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (cooldown > 0) return
    setLoading(true)
    try {
      await supabase.auth.resetPasswordForEmail(email)
      setCooldown(60)
      toast.success('Reset link resent!')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-screen flex items-center justify-center bg-bg p-8">
      <motion.button
        onClick={() => navigate('/')}
        className="absolute top-6 left-6 z-10 p-2 rounded-full hover:bg-surface transition-colors text-text-muted hover:text-text"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <ArrowLeft size={20} />
      </motion.button>
      <AnimatePresence mode="wait">
        {!sent ? (
          <motion.div
            key="email"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md"
          >
            <h1 className="text-3xl font-bold mb-2">Forgot Password</h1>
            <p className="text-text-muted mb-8">Enter your email and we'll send you a reset link</p>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-surface border border-border rounded-input focus:outline-none focus:border-primary transition-colors text-text"
                  placeholder="you@example.com"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-primary hover:bg-primary-dark rounded-btn font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : null}
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
            <p className="text-center mt-6 text-sm">
              <Link to="/login" className="text-primary hover:underline">Back to Login</Link>
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="sent"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/20 mb-6"
            >
              <CheckCircle2 size={32} className="text-success" />
            </motion.div>
            <h1 className="text-3xl font-bold mb-2">Check your email</h1>
            <p className="text-text-muted mb-2">We sent a password reset link to</p>
            <p className="font-semibold mb-8">{email}</p>
            <button
              onClick={handleResend}
              disabled={cooldown > 0 || loading}
              className="text-primary hover:underline disabled:opacity-50"
            >
              {loading ? 'Sending...' : cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend email'}
            </button>
            <p className="mt-6 text-sm">
              <Link to="/login" className="text-primary hover:underline">Back to Login</Link>
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
