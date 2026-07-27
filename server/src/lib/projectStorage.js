import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { supabase } from './supabase.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectsRoot = path.join(__dirname, '../../../projects')

export function getProjectDir(projectId) {
  return path.join(projectsRoot, projectId || 'default')
}

export function writeFilesToDisk(projectId, files) {
  if (!projectId || projectId === 'default' || !files) return
  const projectDir = getProjectDir(projectId)
  
  if (!fs.existsSync(projectDir)) {
    fs.mkdirSync(projectDir, { recursive: true })
  }

  for (const [relativePath, content] of Object.entries(files)) {
    const safeRelativePath = relativePath.replace(/\\/g, '/')
    if (safeRelativePath.includes('..') || safeRelativePath.startsWith('/')) {
      continue
    }
    
    const fullPath = path.join(projectDir, safeRelativePath)
    const parentDir = path.dirname(fullPath)
    
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true })
    }
    
    fs.writeFileSync(fullPath, content || '', 'utf8')
  }
}

export async function syncProjectDbToDisk(projectId) {
  if (!projectId || projectId === 'default') return
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('generated_files')
      .eq('id', projectId)
      .single()

    if (error) {
      console.error(`[Storage] Failed to fetch project ${projectId} for sync:`, error.message)
      return
    }

    if (data?.generated_files) {
      writeFilesToDisk(projectId, data.generated_files)
      console.log(`[Storage] Synced ${Object.keys(data.generated_files).length} files to disk for project ${projectId}`)
    }
  } catch (err) {
    console.error(`[Storage] Error syncing project ${projectId} to disk:`, err)
  }
}
