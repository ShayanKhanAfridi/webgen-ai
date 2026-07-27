import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import { supabase } from '../lib/supabase.js'
import archiver from 'archiver'
import { writeFilesToDisk } from '../lib/projectStorage.js'

const router = Router()

// Public project preview route (must be placed before authenticate middleware)
router.get('/:id/preview', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('generated_files')
      .eq('id', req.params.id)
      .single()

    if (error || !data) return res.status(404).send('Project not found')

    const files = data.generated_files || {}
    let html = files['index.html'] || ''
    const css = files['style.css'] || files['styles.css'] || ''
    const js = files['script.js'] || files['scripts.js'] || ''

    // Inject CSS if separate file
    if (css && !html.includes(css)) {
      html = html.replace('</head>', `<style>\n${css}\n</style>\n</head>`)
    }

    // Inject JS if separate file
    if (js && !html.includes(js)) {
      html = html.replace('</body>', `<script>\n${js}\n</script>\n</body>`)
    }

    res.setHeader('Content-Type', 'text/html')
    res.send(html)
  } catch (err) {
    res.status(500).send(err.message)
  }
})

router.use(authenticate)

router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', req.userId)
    .order('created_at', { ascending: false })
  if (error) return res.status(500).json({ error: error.message })
  res.json({ projects: data })
})

router.post('/', async (req, res) => {
  const { title, prompt, website_type, theme, color_scheme, pages, plan, generated_files } = req.body
  const { data, error } = await supabase.from('projects').insert({
    user_id: req.userId,
    title: title || 'Untitled Project',
    prompt,
    website_type,
    theme,
    color_scheme,
    pages: pages || [],
    plan: plan || {},
    generated_files: generated_files || {},
  }).select().single()
  if (error) return res.status(500).json({ error: error.message })

  if (data && data.generated_files) {
    try {
      writeFilesToDisk(data.id, data.generated_files)
    } catch (diskErr) {
      console.error('[projects API] Disk write error on post:', diskErr)
    }
  }

  res.json({ project: data })
})

router.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', req.userId)
    .single()
  if (error) return res.status(404).json({ error: 'Project not found' })
  res.json({ project: data })
})

router.put('/:id', async (req, res) => {
  const { title, generated_files, plan } = req.body
  const updates = {}
  if (title !== undefined) updates.title = title
  if (generated_files !== undefined) updates.generated_files = generated_files
  if (plan !== undefined) updates.plan = plan
  updates.updated_at = new Date()

  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', req.params.id)
    .eq('user_id', req.userId)
    .select().single()
  if (error) return res.status(500).json({ error: error.message })

  if (generated_files !== undefined) {
    try {
      writeFilesToDisk(req.params.id, generated_files)
    } catch (diskErr) {
      console.error('[projects API] Disk write error on put:', diskErr)
    }
  }

  res.json({ project: data })
})

router.delete('/:id', async (req, res) => {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.userId)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
})

router.get('/:id/download', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .single()
    if (error || !data) return res.status(404).json({ error: 'Project not found' })

    const files = data.generated_files || {}
    const fileKeys = Object.keys(files)

    if (fileKeys.length === 0) {
      return res.status(400).json({ error: 'No files to download' })
    }

    // If there is only a single file, download it directly
    if (fileKeys.length === 1) {
      const filename = fileKeys[0]
      const content = files[filename]
      res.setHeader('Content-Disposition', `attachment; filename="${filename.split('/').pop()}"`)
      res.setHeader('Content-Type', 'text/plain; charset=utf-8')
      return res.send(content)
    }

    // Otherwise, create a ZIP of all files preserving directory structures
    res.setHeader('Content-Type', 'application/zip')
    res.setHeader('Content-Disposition', `attachment; filename="${data.title || 'website'}.zip"`)

    const archive = archiver('zip', { zlib: { level: 9 } })
    archive.pipe(res)

    for (const [filePath, content] of Object.entries(files)) {
      archive.append(content, { name: filePath })
    }

    await archive.finalize()
  } catch (err) {
    console.error('[Download API] Error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

export default router
