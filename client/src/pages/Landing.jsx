import { Link } from 'react-router-dom'
import { motion, useInView } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import {
  ArrowRight, Code, Eye, Download, MessageSquare,
  Layout, Layers, ChevronDown, Github, Twitter, Play,
  Zap, Globe
} from 'lucide-react'
import './Landing.css'

/* ── Data ── */
const HERO_TEXTS = [
  'Web Apps',
  'SaaS Products',
  'Portfolio Sites',
  'Landing Pages',
  'E-Commerce Stores',
  'Browser Games',
  'Admin Dashboards',
  'Mobile App UIs',
]

const steps = [
  { num: '01', icon: MessageSquare, title: 'Describe Your App',  desc: 'Tell AI what app or website you want to build in plain English. Be as detailed as you like.' },
  { num: '02', icon: Zap,           title: 'AI Generates Code',  desc: 'AI instantly writes production-quality code for your chosen stack — HTML, React, or full-stack.' },
  { num: '03', icon: Eye,           title: 'Edit, Run & Deploy', desc: 'Open the full IDE, edit in Monaco, run in the terminal, preview live, and download your project.' },
]

const features = [
  { icon: Eye,           title: 'Live Preview',        desc: 'See your app rendered live as you edit code in real time.' },
  { icon: Code,          title: 'Monaco Editor',       desc: 'Full VS Code-style editor with syntax highlighting and IntelliSense.' },
  { icon: MessageSquare, title: 'AI Chat',             desc: 'Modify your project by chatting naturally with Gemini AI.' },
  { icon: Download,      title: 'Download ZIP',        desc: 'Export your complete project as a ZIP file instantly.' },
  { icon: Layout,        title: 'Project History',     desc: 'Access and restore your previous projects anytime.' },
  { icon: Layers,        title: 'Full Stack Support',  desc: 'Build React, Node.js, and TypeScript projects out of the box.' },
]

const STATS = [
  { target: 10000, suffix: '+', prefix: '',    label: 'Websites Generated' },
  { target: 50,    suffix: '+', prefix: '',    label: 'Templates Available' },
  { target: 99,    suffix: '%', prefix: '',    label: 'User Satisfaction' },
  { target: 60,    suffix: 's', prefix: '< ',  label: 'Generation Time' },
]

const CODE_LINES = [
  { num: 1,  parts: [{ t: '<!DOCTYPE ', c: 'c-blue' }, { t: 'html', c: 'c-green' }, { t: '>', c: 'c-blue' }] },
  { num: 2,  parts: [{ t: '<html ', c: 'c-blue' }, { t: 'lang', c: 'c-yellow' }, { t: '=', c: 'c-teal' }, { t: '"en"', c: 'c-green' }, { t: '>', c: 'c-blue' }] },
  { num: 3,  parts: [{ t: '  <head>', c: 'c-blue' }] },
  { num: 4,  parts: [{ t: '    <title>', c: 'c-purple' }, { t: 'My Website', c: '' }, { t: '</title>', c: 'c-purple' }] },
  { num: 5,  parts: [{ t: '  </head>', c: 'c-blue' }] },
  { num: 6,  parts: [{ t: '  <body>', c: 'c-blue' }] },
  { num: 7,  parts: [{ t: '    <nav ', c: 'c-blue' }, { t: 'class', c: 'c-yellow' }, { t: '=', c: 'c-teal' }, { t: '"nav"', c: 'c-green' }, { t: '>', c: 'c-blue' }] },
  { num: 8,  parts: [{ t: '      <h1>', c: 'c-orange' }, { t: 'Hello World', c: '' }, { t: '</h1>', c: 'c-orange' }] },
  { num: 9,  parts: [{ t: '    </nav>', c: 'c-blue' }] },
  { num: 10, parts: [{ t: '  </body>', c: 'c-blue' }] },
  { num: 11, parts: [{ t: '</html>', c: 'c-blue' }] },
]

/* ── Smooth scroll helper (Fix 3) ── */
function scrollTo(id) {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

/* ── CountUp component (Improvement 1) ── */
function CountUp({ target, suffix = '', prefix = '', label = '' }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!inView) return
    const totalSteps = 60
    const increment = target / totalSteps
    let current = 0
    const timer = setInterval(() => {
      current += increment
      if (current >= target) { setCount(target); clearInterval(timer) }
      else setCount(Math.floor(current))
    }, 2000 / totalSteps)
    return () => clearInterval(timer)
  }, [inView, target])

  return (
    <motion.div
      ref={ref}
      className="lp-stat-item"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      <span className="lp-stat-num">{prefix}{count.toLocaleString()}{suffix}</span>
      <span className="lp-stat-label">{label}</span>
    </motion.div>
  )
}

/* ── Main Component ── */
export default function Landing() {
  /* Scroll state (Fix 2 / navbar darkening) */
  const [scrolled, setScrolled] = useState(false)

  /* Active section (Improvement 4) */
  const [activeSection, setActiveSection] = useState('')

  /* Mouse parallax (Improvement 2) */
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  /* Typewriter state (Fix 1) */
  const [textIndex, setTextIndex] = useState(0)
  const [displayText, setDisplayText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  /* ── Effects ── */

  // Scroll listener
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Active section observer (Improvement 4)
  useEffect(() => {
    const ids = ['how-it-works', 'features', 'demo']
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) setActiveSection(e.target.id) }),
      { threshold: 0.4 }
    )
    ids.forEach(id => { const el = document.getElementById(id); if (el) observer.observe(el) })
    return () => observer.disconnect()
  }, [])

  // Mouse parallax (Improvement 2)
  useEffect(() => {
    const handleMouse = (e) => setMousePos({
      x: (e.clientX / window.innerWidth  - 0.5) * 30,
      y: (e.clientY / window.innerHeight - 0.5) * 30,
    })
    window.addEventListener('mousemove', handleMouse)
    return () => window.removeEventListener('mousemove', handleMouse)
  }, [])

  // Typewriter (Fix 1)
  useEffect(() => {
    const current = HERO_TEXTS[textIndex]
    let timeout

    if (!isDeleting && displayText === current) {
      timeout = setTimeout(() => setIsDeleting(true), 2000)
    } else if (isDeleting && displayText === '') {
      setIsDeleting(false)
      setTextIndex(i => (i + 1) % HERO_TEXTS.length)
    } else {
      timeout = setTimeout(() => {
        setDisplayText(prev =>
          isDeleting ? prev.slice(0, -1) : current.slice(0, prev.length + 1)
        )
      }, isDeleting ? 30 : 50)
    }
    return () => clearTimeout(timeout)
  }, [displayText, isDeleting, textIndex])

  return (
    <div style={{ background: 'var(--bg)', color: 'var(--text)', minHeight: '100vh' }}>

      {/* ── NAVBAR ── */}
      <motion.nav
        className={`lp-nav${scrolled ? ' scrolled' : ''}`}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <div className="lp-nav-inner">
          {/* Fix 2: logo as home link */}
          <Link
            to="/"
            className="lp-logo"
            style={{ textDecoration: 'none' }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            &lt;/&gt; WebGen
          </Link>

          {/* Fix 3: buttons not hash links */}
          <div className="lp-nav-links">
            {[
              { label: 'How it works', id: 'how-it-works' },
              { label: 'Features',     id: 'features' },
              { label: 'Demo',         id: 'demo' },
            ].map(({ label, id }) => (
              <button
                key={id}
                className={`lp-nav-btn${activeSection === id ? ' active' : ''}`}
                onClick={() => scrollTo(id)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="lp-nav-actions">
            <Link to="/login" className="lp-btn-ghost">Login</Link>
            <Link to="/signup" className="lp-btn-primary">Get Started</Link>
          </div>
        </div>
      </motion.nav>

      {/* ── HERO ── */}
      <section className="lp-hero">
        <div className="lp-hero-grid" />

        {/* Improvement 2: mouse parallax orbs */}
        <motion.div
          className="lp-orb lp-orb-1"
          animate={{ x: mousePos.x, y: mousePos.y }}
          transition={{ type: 'spring', stiffness: 50, damping: 20 }}
        />
        <motion.div
          className="lp-orb lp-orb-2"
          animate={{ x: -mousePos.x * 0.6, y: -mousePos.y * 0.6 }}
          transition={{ type: 'spring', stiffness: 40, damping: 20 }}
        />

        <div className="lp-hero-inner">
          {/* Left: copy */}
          <div className="lp-hero-content">
            {/* Badge */}
            <motion.div
              className="lp-badge"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
            >
              ✦ AI-Powered App Builder
            </motion.div>

            {/* Fix 1: Typewriter headline */}
            <motion.h1
              className="lp-headline"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              <span className="lp-typewriter-wrap">
                <span className="lp-typewriter-gradient">{displayText}</span>
                <span className="lp-cursor">|</span>
              </span>
              <span style={{ display: 'block', marginTop: '0.1em' }}>
                in Minutes
              </span>
            </motion.h1>

            {/* Subtext */}
            <motion.p
              className="lp-subtext"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
            >
              Describe any app or website and AI builds it instantly.
              Full code editor, live preview, terminal, and AI chat
              — everything you need in one place.
            </motion.p>

            {/* CTA row */}
            <motion.div
              className="lp-cta-row"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.6 }}
            >
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                <Link to="/signup" className="lp-cta-primary">
                  Start Building Free <ArrowRight size={18} />
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                <button
                  className="lp-cta-secondary"
                  onClick={() => scrollTo('demo')}
                  style={{ cursor: 'pointer' }}
                >
                  <Play size={16} /> Watch Demo
                </button>
              </motion.div>
            </motion.div>
          </div>

          {/* Right: floating code card + tech badges */}
          <motion.div
            className="lp-card-wrapper"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.7 }}
          >
            {/* Code card */}
            <motion.div
              className="lp-code-card"
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div className="lp-code-card-bar">
                <div className="lp-dot lp-dot-red" />
                <div className="lp-dot lp-dot-yellow" />
                <div className="lp-dot lp-dot-green" />
                <span className="lp-code-filename">index.html</span>
              </div>
              <div className="lp-code-body">
                {CODE_LINES.map((line) => (
                  <div key={line.num} className="lp-code-line">
                    <span className="lp-code-num">{line.num}</span>
                    <span>
                      {line.parts.map((p, j) => (
                        <span key={j} className={p.c}>{p.t}</span>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="lp-scroll-indicator"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          onClick={() => scrollTo('how-it-works')}
          style={{ cursor: 'pointer' }}
        >
          <ChevronDown size={22} />
        </motion.div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="lp-section lp-section-bg2">
        <div className="lp-section-inner">
          <motion.span className="lp-section-label" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.5 }}>
            Simple Process
          </motion.span>
          <motion.h2 className="lp-section-title" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.5, delay: 0.1 }}>
            How It Works
          </motion.h2>
          <motion.p className="lp-section-sub" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.5, delay: 0.2 }}>
            Three simple steps to go from idea to a fully working website.
          </motion.p>
          <div className="lp-steps-grid">
            <div className="lp-connector" />
            <div className="lp-connector lp-connector-2" />
            {steps.map((step, i) => (
              <motion.div
                key={i}
                className="lp-step-card"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.6, delay: i * 0.15, ease: 'easeOut' }}
              >
                <div className="lp-step-num">{step.num}</div>
                <div className="lp-step-icon-wrap"><step.icon size={22} /></div>
                <h3 className="lp-step-title">{step.title}</h3>
                <p className="lp-step-desc">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="lp-section lp-section-bg">
        <div className="lp-section-inner">
          <motion.span className="lp-section-label" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.5 }}>
            Features
          </motion.span>
          <motion.h2 className="lp-section-title" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.5, delay: 0.1 }}>
            Everything You Need
          </motion.h2>
          <motion.p className="lp-section-sub" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.5, delay: 0.2 }}>
            A professional suite of tools to build, edit, and export your AI-generated websites.
          </motion.p>
          <div className="lp-features-grid">
            {features.map((f, i) => (
              <motion.div
                key={i}
                className="lp-feature-card"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.6, delay: i * 0.1, ease: 'easeOut' }}
              >
                <div className="lp-feature-icon-wrap"><f.icon size={22} /></div>
                <h3 className="lp-feature-title">{f.title}</h3>
                <p className="lp-feature-desc">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="lp-stats-section">
        <div className="lp-stats-grid">
          {STATS.map((s, i) => (
            <CountUp key={i} target={s.target} suffix={s.suffix} prefix={s.prefix} label={s.label} />
          ))}
        </div>
      </section>

      {/* ── DEMO ── */}
      <section id="demo" className="lp-section lp-section-bg2">
        <div className="lp-section-inner">
          <motion.span className="lp-section-label" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.5 }}>
            Live Demo
          </motion.span>
          <motion.h2 className="lp-section-title" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.5, delay: 0.1 }}>
            See It in Action
          </motion.h2>
          <motion.p className="lp-section-sub" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.5, delay: 0.2 }}>
            Edit with Monaco Editor, preview live, and download your project when you're done.
          </motion.p>

          <motion.div
            className="lp-demo-mockup"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          >
            <div className="lp-browser-bar">
              <div className="lp-browser-dots">
                <div className="lp-dot lp-dot-red" />
                <div className="lp-dot lp-dot-yellow" />
                <div className="lp-dot lp-dot-green" />
              </div>
              <div className="lp-url-bar">https://webgen.app/preview/my-website</div>
            </div>
            <div className="lp-demo-split">
              <div className="lp-demo-editor">
                <div className="lp-demo-tab">style.css</div>
                {[
                  [{ t: '.nav {',                   c: 'c-blue' }],
                  [{ t: '  background: ',           c: '' },       { t: 'var', c: 'c-purple' }, { t: '(--primary);', c: '' }],
                  [{ t: '  padding: ',              c: '' },       { t: '1rem', c: 'c-orange' }, { t: ';', c: '' }],
                  [{ t: '}',                        c: 'c-blue' }],
                  [{ t: '.hero {',                  c: 'c-blue' }],
                  [{ t: '  min-height: ',           c: '' },       { t: '80vh', c: 'c-orange' }, { t: ';', c: '' }],
                  [{ t: '  display: ',              c: '' },       { t: 'flex', c: 'c-yellow' }, { t: ';', c: '' }],
                  [{ t: '  align-items: ',          c: '' },       { t: 'center', c: 'c-yellow' }, { t: ';', c: '' }],
                  [{ t: '}',                        c: 'c-blue' }],
                ].map((parts, i) => (
                  <div key={i} className="lp-code-line" style={{ fontSize: '0.73rem', lineHeight: 1.7 }}>
                    <span className="lp-code-num">{i + 1}</span>
                    <span>{parts.map((p, j) => <span key={j} className={p.c}>{p.t}</span>)}</span>
                  </div>
                ))}
              </div>
              <div className="lp-demo-preview">
                <div className="lp-preview-nav">
                  <div className="lp-preview-logo" />
                  <span className="lp-preview-link">Home</span>
                  <span className="lp-preview-link">About</span>
                  <span className="lp-preview-link">Contact</span>
                </div>
                <div className="lp-preview-hero">
                  <span className="lp-preview-hero-text">Welcome to My Website</span>
                </div>
                <div className="lp-preview-cards">
                  <div className="lp-preview-card" style={{ background: '#e0e7ff' }} />
                  <div className="lp-preview-card" style={{ background: '#f0e6ff' }} />
                  <div className="lp-preview-card" style={{ background: '#e0f2fe' }} />
                </div>
                <div style={{ height: '40px', background: '#f1f5f9', borderRadius: '6px' }} />
              </div>
            </div>
          </motion.div>

          <motion.div style={{ textAlign: 'center', marginTop: '2.5rem' }} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.3 }}>
            <motion.div style={{ display: 'inline-block' }} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
              <Link to="/signup" className="lp-cta-primary">
                Try It Now <ArrowRight size={18} />
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="lp-footer">
        <div className="lp-footer-grid">
          <div className="lp-footer-brand">
            <Link to="/" className="lp-logo" style={{ textDecoration: 'none', fontSize: '1.2rem' }} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              &lt;/&gt; WebGen
            </Link>
            <p className="lp-footer-tagline">Build stunning websites with AI in minutes. No coding experience required.</p>
            <div className="lp-footer-socials">
              <a href="#" className="lp-social-btn" aria-label="GitHub"><Github size={16} /></a>
              <a href="#" className="lp-social-btn" aria-label="Twitter"><Twitter size={16} /></a>
              <a href="#" className="lp-social-btn" aria-label="Globe"><Globe size={16} /></a>
            </div>
          </div>
          <div>
            <h4 className="lp-footer-col-title">Quick Links</h4>
            <div className="lp-footer-links">
              <button className="lp-footer-link" style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }} onClick={() => scrollTo('how-it-works')}>How it works</button>
              <button className="lp-footer-link" style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }} onClick={() => scrollTo('features')}>Features</button>
              <button className="lp-footer-link" style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }} onClick={() => scrollTo('demo')}>Demo</button>
            </div>
          </div>
          <div>
            <h4 className="lp-footer-col-title">Product</h4>
            <div className="lp-footer-links">
              <Link to="/signup" className="lp-footer-link">Get Started</Link>
              <Link to="/login" className="lp-footer-link">Login</Link>
              <Link to="/dashboard" className="lp-footer-link">Dashboard</Link>
            </div>
          </div>
        </div>
        <div className="lp-footer-bottom">
          &copy; {new Date().getFullYear()} WebGen. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
