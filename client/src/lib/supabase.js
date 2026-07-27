/*
  IMPORTANT - Check these in Supabase Dashboard:
  
  1. Go to Authentication > Settings
     - "Enable email confirmations" → 
       DISABLE for development (or users can't login 
       until they confirm email)
  
  2. Go to Table Editor > profiles table
     - Make sure RLS is enabled
     - Add policy: "Users can insert own profile"
       FOR INSERT: auth.uid() = id
     - Add policy: "Users can read own profile"  
       FOR SELECT: auth.uid() = id
  
  3. Check .env file has:
     VITE_SUPABASE_URL=https://xxxx.supabase.co
     VITE_SUPABASE_ANON_KEY=eyJxxx...
*/

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase env variables!')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

console.log(`
  IMPORTANT - Check these in Supabase Dashboard:
  
  1. Go to Authentication > Settings
     - "Enable email confirmations" → 
       DISABLE for development (or users can't login 
       until they confirm email)
  
  2. Go to Table Editor > profiles table
     - Make sure RLS is enabled
     - Add policy: "Users can insert own profile"
       FOR INSERT: auth.uid() = id
     - Add policy: "Users can read own profile"  
       FOR SELECT: auth.uid() = id
  
  3. Check .env file has:
     VITE_SUPABASE_URL=https://xxxx.supabase.co
     VITE_SUPABASE_ANON_KEY=eyJxxx...
`)

