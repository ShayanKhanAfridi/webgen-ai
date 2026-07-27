import { Router } from 'express'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { authenticate } from '../middleware/auth.js'
import { supabase } from '../lib/supabase.js'
import { writeFilesToDisk } from '../lib/projectStorage.js'

const router = Router()
router.use(authenticate)

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

// ─── Helpers ──────────────────────────────────────────────────────────────────

const colorMap = {
  Blue: '#3b82f6', Green: '#22c55e', Purple: '#a855f7',
  Red: '#ef4444', Orange: '#f97316', Monochrome: '#6b7280',
  Indigo: '#6366f1', Cyan: '#06b6d4', Rose: '#f43f5e',
}

function getColorValues(colorScheme) {
  const hex = colorMap[colorScheme] || '#6366f1'
  let r = 99, g = 102, b = 241
  if (hex.startsWith('#')) {
    const parsed = parseInt(hex.slice(1), 16)
    r = (parsed >> 16) & 255
    g = (parsed >> 8) & 255
    b = parsed & 255
  }
  let rN = r / 255, gN = g / 255, bN = b / 255
  let max = Math.max(rN, gN, bN), min = Math.min(rN, gN, bN)
  let h, s, l = (max + min) / 2
  if (max === min) {
    h = s = 0
  } else {
    let d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case rN: h = (gN - bN) / d + (gN < bN ? 6 : 0); break
      case gN: h = (bN - rN) / d + 2; break
      case bN: h = (rN - gN) / d + 4; break
    }
    h /= 6
  }
  h = Math.round(h * 360)
  s = Math.round(s * 100)
  l = Math.round(l * 100)
  return { hex, hsl: `${h} ${s}% ${l}%`, h, s, l }
}

function getThemeStylesPrompt(theme, colorScheme) {
  const isDark = !theme.toLowerCase().includes('light') && 
                 (theme.toLowerCase().includes('dark') || 
                  theme.toLowerCase().includes('futuristic') || 
                  theme.toLowerCase().includes('bold') ||
                  theme.toLowerCase().includes('modern'));
  const colors = getColorValues(colorScheme)
  
  let baseVars = ''
  if (isDark) {
    baseVars = `
    --background: 240 10% 4%;
    --surface: 240 10% 9%;
    --surface-hover: 240 10% 14%;
    --text: 0 0% 98%;
    --text-muted: 240 5% 65%;
    --border: 240 6% 15%;
    --primary: ${colors.hsl};
    --primary-foreground: 0 0% 98%;
    --accent: ${colors.h} ${colors.s}% ${Math.max(15, colors.l - 20)}%;
    --shadow: 0 8px 30px rgba(0, 0, 0, 0.5);
    `
  } else {
    baseVars = `
    --background: 210 20% 98%;
    --surface: 0 0% 100%;
    --surface-hover: 240 4.8% 95.9%;
    --text: 240 10% 4%;
    --text-muted: 240 3.8% 46.1%;
    --border: 240 5.9% 90%;
    --primary: ${colors.hsl};
    --primary-foreground: 0 0% 100%;
    --accent: ${colors.h} ${colors.s}% ${Math.min(90, colors.l + 20)}%;
    --shadow: 0 8px 30px rgba(0, 0, 0, 0.06);
    `
  }

  return `
Design Guidelines for "${theme}" Theme and "${colorScheme}" Color Scheme:
1. You MUST use the following CSS variables inside your stylesheet to set up the design system. Do not hardcode colors; use these HSL variable definitions:
   :root {
     ${baseVars.trim()}
   }
2. Apply these variables correctly:
   - Body background: hsl(var(--background))
   - Card/Surface backgrounds: hsl(var(--surface)) (with hover state using hsl(var(--surface-hover)))
   - Main texts: hsl(var(--text))
   - Muted/secondary texts: hsl(var(--text-muted))
   - Borders and dividers: 1px solid hsl(var(--border))
   - Primary accents/buttons: hsl(var(--primary)) and text color on it: hsl(var(--primary-foreground))
   - Box Shadows: var(--shadow)
3. Design Aesthetics requirements:
   - Font Family: Use modern Google Fonts like 'Outfit', 'Inter', or 'DM Sans'. Set font-family: 'Outfit', 'Inter', sans-serif;
   - Card radius: border-radius: 16px; or 12px;
   - Inputs and Buttons: padding: 10px 16px; border-radius: 8px; border: 1px solid hsl(var(--border)); font-weight: 600;
   - Smooth transition animations on hover states: transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
   - Use high-contrast hierarchy: clear visual division, crisp font sizes, elegant grid alignments.
   - Do NOT use plain standard HTML colors.
`
}

function cleanJson(text) {
  let cleaned = text.trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start !== -1 && end !== -1 && end > start) {
    cleaned = cleaned.slice(start, end + 1)
  }
  return cleaned
}

function getModel(name = 'gemini-2.5-flash') {
  return genAI.getGenerativeModel({ model: name })
}

async function generateContentWithFallback(prompt, generationConfig = {}) {
  const modelsToTry = [
    'gemini-2.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite'
  ]
  let lastError = null

  for (const modelName of modelsToTry) {
    try {
      console.log(`[Gemini] Trying model: ${modelName}`)
      const model = genAI.getGenerativeModel({ model: modelName })
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig
      })
      console.log(`[Gemini] Success with model: ${modelName}`)
      return result
    } catch (err) {
      console.error(`[Gemini] Error with model ${modelName}:`, err.message)
      lastError = err
      continue
    }
  }
  throw lastError || new Error('All models failed to generate content.')
}


// ─── /plan ────────────────────────────────────────────────────────────────────

router.post('/plan', async (req, res) => {
  try {
    const { prompt } = req.body
    if (!prompt) return res.status(400).json({ error: 'Prompt required' })

    const result = await generateContentWithFallback(`You are a web/app planner. Given a user's description, return ONLY valid JSON (no markdown):
{
  "theme": "Modern | Minimal | Bold | Elegant | Playful",
  "colorScheme": "Blue | Green | Purple | Red | Orange | Monochrome | Indigo | Cyan | Rose",
  "pages": ["string"],
  "sections": { "PageName": ["section1", "section2"] }
}

User request: ${prompt}`, { responseMimeType: 'application/json' })

    const plan = JSON.parse(cleanJson(result.response.text()))
    res.json({ plan })
  } catch (err) {
    console.error('[plan]', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ─── /generate ────────────────────────────────────────────────────────────────

const buildHtmlPrompt = (userPrompt, theme, colorScheme) => `You are an expert web developer and UI/UX designer.
Create a COMPLETE, STUNNINGLY BEAUTIFUL, FULLY FUNCTIONAL single-page application.

User request: "${userPrompt}"
Theme: ${theme}
Primary Color: ${colorScheme}

${getThemeStylesPrompt(theme, colorScheme)}

STRICT REQUIREMENTS:
- Return ONLY raw HTML. Zero explanations.
- Complete <!DOCTYPE html> document
- ALL CSS inside <style> tag in <head>
- ALL JavaScript inside <script> tag before </body>
- Minimum 400 lines of code
- NO placeholder text like "Lorem ipsum" or comments like "add code here". Make every single link, list, card, input form, and button interactive and functional (e.g. state changes, alerts, local mock calculations, filter tabs, modal dialogs).
- Ensure visual wow factor: use HSL tailored colors, dark/light modes based on theme, professional card shadows, and smooth visual transitions.

Start your response with <!DOCTYPE html> immediately.`

const buildPackageJsonPrompt = (userPrompt, stack) => `Return ONLY valid JSON for package.json.
No explanation. For a React TypeScript Vite project.
Project: ${userPrompt}

{
  "name": "project-name",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "${stack === 'fullstack' ? 'concurrently \\\"vite\\\" \\\"node server/index.js\\\"' : 'vite'}",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"${stack === 'fullstack' ? ',\n    "concurrently": "^8.2.0"' : ''}
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.0.0",
    "typescript": "^5.0.0",
    "vite": "^4.4.0"
  }
}

Add any extra dependencies needed for: ${userPrompt}
Return ONLY the JSON object.`

const buildIndexHtmlPrompt = (userPrompt) => `Return ONLY the index.html for a React TypeScript Vite project.
Include a <div id="root"></div> and a script tag pointing to "/src/main.tsx".
Project: ${userPrompt}
Use Google Fonts if appropriate. No explanation, just index.html content.`

const buildViteConfigPrompt = () => `Return ONLY the vite.config.ts file content for a React TypeScript project.
It should import defineConfig from 'vite' and react from '@vitejs/plugin-react'.
Return ONLY code, no explanation.`

const buildTsConfigPrompt = () => `Return ONLY the tsconfig.json file content for a standard React TypeScript Vite project.
Return ONLY valid JSON, no explanation.`

const buildMainTsxPrompt = () => `Return ONLY the src/main.tsx file content.
It should import React, ReactDOM, App from './App.tsx', './App.css', and render App in React.StrictMode at 'root'.
Return ONLY TypeScript code, no explanation.`

const buildAppTsxPrompt = (userPrompt, theme, colorScheme) => `You are a senior React developer and UI/UX expert.
Write a COMPLETE, PRODUCTION-QUALITY, STUNNINGLY BEAUTIFUL React TypeScript app.

User wants: "${userPrompt}"
Theme: ${theme}
Primary Color Scheme: ${colorScheme}

${getThemeStylesPrompt(theme, colorScheme)}

Requirements:
- Complete App.tsx with full implementation. No stubbed components or truncated methods.
- Use React hooks (useState, useEffect, useCallback, useMemo) for responsive application state.
- TypeScript interfaces and types for all props, states, and data models.
- Beautiful inline styles or import standard styles using import './App.css'. Do NOT use CSS modules (use normal classNames like className="app-card", className="btn-primary").
- Ensure a premium visual wow factor: cards with smooth shadows, clean hover states, border-radius (12px to 16px), styled borders, and modern layout structures (flex/grid).
- Handle loading, error, empty lists, search, filtering, and detail modal states.
- Ensure all interactive elements actually work (e.g. adding items to list, filtering, state toggling, showing modals).
- Minimum 300 lines of robust code.

Return ONLY the TypeScript code. Start with imports.`

const buildCssPrompt = (userPrompt, theme, colorScheme) => `Generate complete, modern CSS for a React TypeScript project.
User wants: "${userPrompt}"
Theme: ${theme}
Primary color scheme: ${colorScheme}

${getThemeStylesPrompt(theme, colorScheme)}

Requirements:
- Make sure to style all custom classNames used in App.tsx.
- Include transitions, active states, focus rings, hover effects.
- Return ONLY CSS, no explanation.`

const generateProject = async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders()
  } else if (typeof res.writeHead === 'function') {
    res.writeHead(200)
  }

  const send = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`)
  }

  try {
    const { prompt, theme, colorScheme, stack, projectId, userId } = req.body

    const files = {}

    if (stack === 'html') {
      send({ type: 'progress', step: 'Generating complete app...' })
      
      const model = genAI.getGenerativeModel({ 
        model: 'gemini-2.5-flash',
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8192,
        }
      })
      
      const result = await generateContentWithFallback(
        buildHtmlPrompt(prompt, theme, colorScheme),
        { temperature: 0.7, maxOutputTokens: 8192 }
      )
      let html = result.response.text().trim()
      
      // Clean up if wrapped in markdown
      if (html.startsWith('```')) {
        html = html
          .replace(/^```html?\n?/, '')
          .replace(/\n?```$/, '')
          .trim()
      }
      
      files['index.html'] = html
      send({ 
        type: 'file', 
        filename: 'index.html', 
        content: html 
      })

    } else if (stack === 'react' || stack === 'fullstack') {
      
      const filesToGenerate = [
        { 
          name: 'package.json', 
          step: 'Setting up package.json...',
          prompt: buildPackageJsonPrompt(prompt, stack)
        },
        { 
          name: 'index.html', 
          step: 'Creating HTML entry...',
          prompt: buildIndexHtmlPrompt(prompt)
        },
        { 
          name: 'vite.config.ts', 
          step: 'Configuring Vite...',
          content: `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  }
})`
        },
        { 
          name: 'tsconfig.json', 
          step: 'TypeScript config...',
          content: `{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["DOM", "DOM.Iterable", "ES2020"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}`
        },
        { 
          name: 'src/vite-env.d.ts', 
          step: 'Vite environment...',
          content: `/// <reference types="vite/client" />`
        },
        { 
          name: 'src/main.tsx', 
          step: 'Creating entry point...',
          content: `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './App.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`
        },
        { 
          name: 'src/App.tsx', 
          step: 'Generating main app...',
          prompt: buildAppTsxPrompt(prompt, theme, colorScheme)
        },
        { 
          name: 'src/App.css', 
          step: 'Creating styles...',
          prompt: buildCssPrompt(prompt, theme, colorScheme)
        },
      ]

      if (stack === 'fullstack') {
        filesToGenerate.push(
          {
            name: 'server/index.js',
            step: 'Generating backend server...',
            prompt: `Return ONLY code for a simple Express server index.js file.
For a full-stack project description: "${prompt}"
Theme: ${theme}. Color scheme: ${colorScheme}.
It should use CORS and JSON parsing. You MUST use ES modules import/export syntax (e.g., "import express from 'express'") instead of CommonJS require(). Return ONLY javascript code, no markdown.`
          },
          {
            name: 'server/package.json',
            step: 'Setting up backend package.json...',
            prompt: `Return ONLY package.json for an Express server. Use type: module. Include express, cors dependencies. Return ONLY JSON, no markdown.`
          },
          {
            name: 'README.md',
            step: 'Creating README...',
            prompt: `Return ONLY markdown content for README.md explaining how to run the project. Return ONLY markdown, no explanations.`
          }
        )
      }

      const model = genAI.getGenerativeModel({ 
        model: 'gemini-2.5-flash',
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8192,
        }
      })

      for (const file of filesToGenerate) {
        send({ type: 'progress', step: file.step })
        
        try {
          let content
          if (file.content) {
            content = file.content
          } else {
            const result = await generateContentWithFallback(file.prompt, {
              temperature: 0.7,
              maxOutputTokens: 8192
            })
            content = result.response.text().trim()
            
            // Remove markdown fences
            if (content.startsWith('```')) {
              content = content
                .replace(/^```[\w]*\n?/, '')
                .replace(/\n?```$/, '')
                .trim()
            }
          }
          
          files[file.name] = content
          send({ 
            type: 'file', 
            filename: file.name, 
            content 
          })
          
          // Small delay to avoid rate limiting
          if (!file.content) {
            await new Promise(r => setTimeout(r, 500))
          }
          
        } catch (fileErr) {
          console.error(`Error generating ${file.name}:`, fileErr)
          send({ 
            type: 'warning', 
            message: `Skipped ${file.name}: ${fileErr.message}` 
          })
        }
      }
    }

    // Save all files to Supabase
    if (projectId && userId) {
      await supabase
        .from('projects')
        .update({ 
          generated_files: files,
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId)

      // Write files to disk for terminal access
      try {
        writeFilesToDisk(projectId, files)
      } catch (diskErr) {
        console.error('Disk write error:', diskErr)
      }
    }

    send({ type: 'done', files })
    res.end()

  } catch (err) {
    console.error('Generation error:', err)
    send({ type: 'error', message: err.message })
    res.end()
  }
}

router.post('/generate', generateProject)

// ─── /modify ──────────────────────────────────────────────────────────────────

router.post('/modify', async (req, res) => {
  try {
    const { message, projectId, files, stack, chatHistory } = req.body
    if (!message) return res.status(400).json({ reply: 'No message provided.', updatedFiles: {}, terminalCommands: [] })

    // Load theme and color scheme from Supabase
    let theme = 'Modern Dark'
    let colorScheme = 'Indigo'
    if (projectId) {
      try {
        const { data: proj } = await supabase
          .from('projects')
          .select('theme, color_scheme')
          .eq('id', projectId)
          .single()
        if (proj) {
          theme = proj.theme || theme
          colorScheme = proj.color_scheme || colorScheme
        }
      } catch (err) {
        console.error('[modify API] Error loading project theme:', err.message)
      }
    }

    const stackLabel = stack === 'react' ? 'React + TypeScript'
      : stack === 'fullstack' ? 'React + Node.js'
      : 'HTML + CSS + JavaScript'

    const fileContext = Object.entries(files || {})
      .map(([name, content]) => `=== ${name} ===\n${(content || '').slice(0, 100000)}`)
      .join('\n\n')

    const historyContext = (chatHistory || [])
      .slice(-8)
      .map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.content}`)
      .join('\n')

    const prompt = `You are an expert ${stackLabel} developer helping modify a project.

Current Theme: ${theme}
Current Color Scheme: ${colorScheme}
${getThemeStylesPrompt(theme, colorScheme)}

Current project files:
${fileContext}

${historyContext ? `Recent conversation:\n${historyContext}\n` : ''}
User request: ${message}

Instructions:
- Understand what the user wants to change
- Modify ONLY the necessary files
- Return COMPLETE file contents (not diffs or snippets)
- Preserve the theme (${theme}) and color scheme (${colorScheme}) design guidelines. If the user asks to change the visual styling, adapt it while staying consistent with the CSS variables.
- Preserve all existing functionality unless asked to change it
- Write clean, modern, well-commented code
- Keep the same file naming conventions

Respond in this EXACT JSON format (no markdown, no backticks):
{
  "reply": "Brief friendly explanation of what you changed",
  "updatedFiles": {
    "filename.ext": "complete new file content here"
  },
  "terminalCommands": []
}`

    const result = await generateContentWithFallback(prompt, { responseMimeType: 'application/json' })
    const text = result.response.text()

    let parsed
    try {
      parsed = JSON.parse(cleanJson(text))
    } catch (parseErr) {
      console.error('[modify API] JSON parse failed:', parseErr.message, '\nRaw text was:', text)
      parsed = { reply: text, updatedFiles: {}, terminalCommands: [] }
    }

    // Ensure required fields
    parsed.reply = parsed.reply || 'Done! Check the changes in your editor.'
    parsed.updatedFiles = parsed.updatedFiles || {}
    parsed.terminalCommands = parsed.terminalCommands || []

    // Persist to Supabase
    const userId = req.userId
    if (userId && projectId) {
      try {
        await supabase.from('chat_messages').insert([
          { project_id: projectId, user_id: userId, role: 'user', content: message },
          { project_id: projectId, user_id: userId, role: 'assistant', content: parsed.reply }
        ])

        if (Object.keys(parsed.updatedFiles).length > 0) {
          const { data: proj } = await supabase
            .from('projects').select('generated_files').eq('id', projectId).single()

          const mergedFiles = { ...(proj?.generated_files || {}), ...parsed.updatedFiles }
          await supabase.from('projects').update({
            generated_files: mergedFiles
          }).eq('id', projectId)

          try {
            writeFilesToDisk(projectId, parsed.updatedFiles)
          } catch (diskErr) {
            console.error('[modify API] Disk write error:', diskErr)
          }
        }
      } catch (dbErr) {
        console.error('[modify] DB error:', dbErr.message)
      }
    }

    res.json(parsed)
  } catch (err) {
    console.error('[modify]', err.message)
    res.status(500).json({
      reply: 'Sorry, I encountered an error. Please try again.',
      updatedFiles: {},
      terminalCommands: []
    })
  }
})

export default router
