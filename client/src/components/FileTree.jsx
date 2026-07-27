import { useState, useRef, useCallback } from 'react'
import {
  ChevronRight, ChevronDown, Folder, FolderOpen,
  FilePlus, FolderPlus, Trash2, Copy, Pencil,
  FileCode2, FileJson, Globe, FileText, File
} from 'lucide-react'

// ─── Utilities ────────────────────────────────────────────────────────────────

export function buildTree(flatFiles) {
  const tree = {}
  Object.keys(flatFiles).sort().forEach(filePath => {
    const parts = filePath.split('/')
    let node = tree
    parts.forEach((part, i) => {
      if (i === parts.length - 1) {
        node[part] = filePath // leaf: full path
      } else {
        node[part] = node[part] && typeof node[part] === 'object' ? node[part] : {}
        node = node[part]
      }
    })
  })
  return tree
}

function getFileIcon(name) {
  const ext = name.split('.').pop()?.toLowerCase()
  const iconStyle = { flexShrink: 0 }
  switch (ext) {
    case 'tsx': case 'ts':   return <FileCode2 size={13} style={{ ...iconStyle, color: '#06b6d4' }} />
    case 'jsx': case 'js':   return <FileCode2 size={13} style={{ ...iconStyle, color: '#f0db4f' }} />
    case 'css':              return <FileCode2 size={13} style={{ ...iconStyle, color: '#7c3aed' }} />
    case 'html':             return <Globe size={13} style={{ ...iconStyle, color: '#e34c26' }} />
    case 'json':             return <FileJson size={13} style={{ ...iconStyle, color: '#89e051' }} />
    case 'md':               return <FileText size={13} style={{ ...iconStyle, color: '#aaa' }} />
    default:                 return <File size={13} style={{ ...iconStyle, color: '#64748b' }} />
  }
}

// ─── Context Menu ─────────────────────────────────────────────────────────────

function ContextMenu({ x, y, onRename, onDelete, onDuplicate, onClose }) {
  return (
    <div
      style={{
        position: 'fixed', top: y, left: x, zIndex: 1000,
        background: '#1c1c2e', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 8, padding: 4, minWidth: 140,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
      }}
      onClick={onClose}
    >
      {[
        { label: 'Rename', icon: <Pencil size={12} />, action: onRename },
        { label: 'Duplicate', icon: <Copy size={12} />, action: onDuplicate },
        { label: 'Delete', icon: <Trash2 size={12} />, action: onDelete, danger: true },
      ].map(({ label, icon, action, danger }) => (
        <button
          key={label}
          onClick={action}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, width: '100%',
            padding: '7px 10px', background: 'none', border: 'none',
            borderRadius: 5, cursor: 'pointer', fontSize: 12, fontWeight: 500,
            color: danger ? '#ef4444' : '#c4c4d4', textAlign: 'left'
          }}
          onMouseEnter={e => e.currentTarget.style.background = danger ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.06)'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >
          {icon}{label}
        </button>
      ))}
    </div>
  )
}

// ─── Tree Node ────────────────────────────────────────────────────────────────

function TreeNode({ name, value, depth, activeFile, onFileSelect, onDelete, onRename, onDuplicate }) {
  const [open, setOpen] = useState(depth < 1)
  const isFolder = typeof value === 'object'
  const fullPath = typeof value === 'string' ? value : null
  const isActive = fullPath === activeFile

  const [ctx, setCtx] = useState(null)

  const handleRightClick = (e) => {
    if (!fullPath) return
    e.preventDefault()
    setCtx({ x: e.clientX, y: e.clientY })
  }

  return (
    <div>
      <div
        onClick={() => isFolder ? setOpen(o => !o) : onFileSelect(fullPath)}
        onContextMenu={handleRightClick}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: `3px 8px 3px ${8 + depth * 12}px`,
          cursor: 'pointer', borderRadius: 5, fontSize: 12,
          background: isActive ? 'rgba(99,102,241,0.15)' : 'transparent',
          borderLeft: isActive ? '2px solid var(--primary)' : '2px solid transparent',
          color: isActive ? 'var(--primary)' : 'var(--text-muted)',
          transition: 'all 0.1s', userSelect: 'none'
        }}
        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
        onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
      >
        {isFolder
          ? open
            ? <><ChevronDown size={12} /><FolderOpen size={13} style={{ color: '#e2a355' }} /></>
            : <><ChevronRight size={12} /><Folder size={13} style={{ color: '#e2a355' }} /></>
          : getFileIcon(name)
        }
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {name}
        </span>
      </div>

      {isFolder && open && (
        <div>
          {Object.entries(value).sort((a, b) => {
            // folders first, then files
            const aIsFolder = typeof a[1] === 'object'
            const bIsFolder = typeof b[1] === 'object'
            if (aIsFolder && !bIsFolder) return -1
            if (!aIsFolder && bIsFolder) return 1
            return a[0].localeCompare(b[0])
          }).map(([childName, childValue]) => (
            <TreeNode
              key={childName}
              name={childName}
              value={childValue}
              depth={depth + 1}
              activeFile={activeFile}
              onFileSelect={onFileSelect}
              onDelete={onDelete}
              onRename={onRename}
              onDuplicate={onDuplicate}
            />
          ))}
        </div>
      )}

      {ctx && (
        <ContextMenu
          x={ctx.x} y={ctx.y}
          onClose={() => setCtx(null)}
          onRename={() => { setCtx(null); onRename(fullPath) }}
          onDelete={() => { setCtx(null); onDelete(fullPath) }}
          onDuplicate={() => { setCtx(null); onDuplicate(fullPath) }}
        />
      )}
    </div>
  )
}

// ─── FileTree ────────────────────────────────────────────────────────────────

export default function FileTree({ files, activeFile, onFileSelect, onCreateFile, onDeleteFile, onRenameFile, onDuplicateFile }) {
  const tree = buildTree(files)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 10px', borderBottom: '1px solid var(--border)', flexShrink: 0
      }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Files
        </span>
        <div style={{ display: 'flex', gap: 2 }}>
          <button
            onClick={onCreateFile}
            title="New File"
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', padding: 4, borderRadius: 4, cursor: 'pointer', display: 'flex' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <FilePlus size={14} />
          </button>
        </div>
      </div>

      {/* Tree */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 4px' }}>
        {Object.entries(tree).length === 0 ? (
          <div style={{ padding: '20px 12px', fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
            No files yet
          </div>
        ) : (
          Object.entries(tree).sort((a, b) => {
            const aIsFolder = typeof a[1] === 'object'
            const bIsFolder = typeof b[1] === 'object'
            if (aIsFolder && !bIsFolder) return -1
            if (!aIsFolder && bIsFolder) return 1
            return a[0].localeCompare(b[0])
          }).map(([name, value]) => (
            <TreeNode
              key={name}
              name={name}
              value={value}
              depth={0}
              activeFile={activeFile}
              onFileSelect={onFileSelect}
              onDelete={onDeleteFile}
              onRename={onRenameFile}
              onDuplicate={onDuplicateFile}
            />
          ))
        )}
      </div>
    </div>
  )
}
