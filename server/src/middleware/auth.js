import jwt from 'jsonwebtoken'
import { supabase } from '../lib/supabase.js'

export async function authenticate(req, res, next) {
  const token = req.cookies?.token || req.headers.authorization?.split(' ')[1] || req.query.token
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  // 1. Try custom JWT
  try {
    if (process.env.JWT_SECRET) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      req.userId = decoded.userId
      return next()
    }
  } catch (err) {
    // Custom JWT failed, try Supabase session token
  }

  // 2. Try Supabase session token verification
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    req.userId = user.id
    next()
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
}
