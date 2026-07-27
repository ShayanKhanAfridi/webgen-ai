import { Router } from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { supabase } from '../lib/supabase.js'

const router = Router()

function generateToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' })
}

router.post('/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body
    if (!email || !password || !name) return res.status(400).json({ error: 'All fields required' })

    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password })
    if (authError) return res.status(400).json({ error: authError.message })

    if (authData.user) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: authData.user.id,
        name,
        email,
      })
      if (profileError) console.error('Profile insert error:', profileError)
    }

    const token = generateToken(authData.user.id)
    res.cookie('token', token, { httpOnly: true, secure: false, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 })
    res.json({ user: { id: authData.user.id, email, name }, token })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' })

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return res.status(401).json({ error: 'Invalid credentials' })

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .maybeSingle()

    let userProfile = profile
    if (!userProfile) {
      const { data: newProfile } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          name: data.user.user_metadata?.full_name || 
                data.user.email?.split('@')[0] || 'User',
          email: data.user.email
        })
        .select()
        .maybeSingle()
      userProfile = newProfile
    }

    const token = generateToken(data.user.id)
    res.cookie('token', token, { httpOnly: true, secure: false, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 })
    res.json({ user: { id: data.user.id, email, name: userProfile?.name || '' }, token })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/logout', (req, res) => {
  res.clearCookie('token')
  res.json({ success: true })
})

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ error: 'Email required' })

    const { error } = await supabase.auth.resetPasswordForEmail(email)
    if (error) return res.status(400).json({ error: error.message })

    res.json({ success: true, message: 'Password reset email sent' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/me', async (req, res) => {
  const token = req.cookies?.token || req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', decoded.userId)
      .maybeSingle()

    let userProfile = profile
    if (!userProfile) {
      const { data: { user: authUser } } = await supabase.auth.admin.getUserById(decoded.userId).catch(() => ({ data: {} }))
      if (authUser) {
        const { data: newProfile } = await supabase
          .from('profiles')
          .insert({
            id: authUser.id,
            name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
            email: authUser.email
          })
          .select()
          .maybeSingle()
        userProfile = newProfile
      }
    }

    if (!userProfile) return res.status(401).json({ error: 'User not found' })
    res.json({ user: userProfile })
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' })
  }
})

export default router
