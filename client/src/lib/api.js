import axios from 'axios'
import { supabase } from './supabase'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
})

api.interceptors.request.use(async (config) => {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`
    }
    const geminiKey = localStorage.getItem('gemini_api_key')
    if (geminiKey && geminiKey.trim()) {
      config.headers['x-gemini-api-key'] = geminiKey.trim()
    }
  } catch (err) {
    console.error('Error attaching token/key:', err)
  }
  return config
}, (error) => {
  return Promise.reject(error)
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      if (window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

export default api
