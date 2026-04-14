'use client'

import { useEffect, useState, use, useRef } from 'react'
import EventModal, { CalEvent, EventPayload } from '../../../components/EventModal'
import { RRule } from 'rrule'
import AccessGate from '../../../components/AccessGate'
import { useSearchParams, useRouter } from 'next/navigation'
import { EVENT_COLORS } from '../../../components/colors'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const CALENDARS_KEY = 'known_calendars'
const ACTIVE_CALS_KEY = 'active_calendars'

const dateKey = (d: Date) =>
  `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`

interface ContextMenu {
  ev: CalEvent
  x: number
  y: number
}

interface CalendarInfo {
  id: string
  name: string
  color: string
}

interface Toast {
  eventId: string
  calId: string
  timer: ReturnType<typeof setTimeout>
}

interface CalendarOptionsMenu {
  calId: string
  x: number
  y: number
}

function getKnownCalendars(): CalendarInfo[] {
  try {
    return JSON.parse(localStorage.getItem(CALENDARS_KEY) ?? '[]')
  } catch { return [] }
}

function saveKnownCalendar(id: string, name: string, color: string) {
  try {
    const existing = getKnownCalendars().filter(c => c.id !== id)
    existing.push({ id, name, color })
    existing.sort((a, b) => a.name.localeCompare(b.name))
    localStorage.setItem(CALENDARS_KEY, JSON.stringify(existing))
  } catch {}
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(value)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }}
      style={{ background: copied ? '#e6f4ea' : 'transparent', border: '1px solid #dadce0', borderRadius: 8, padding: '10px 14px', fontSize: 13, cursor: 'pointer', color: copied ? '#0f9d58' : '#5f6368', fontFamily: 'inherit', whiteSpace: 'nowrap', transition: 'all 0.15s' }}
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}

function CalendarSettingsModal({ cal, onClose, onSaved, onDeleted }: {
  cal: CalendarInfo
  onClose: () => void
  onSaved: (updated: CalendarInfo) => void
  onDeleted: (calId: string) => void
}) {
  const [name, setName] = useState(cal.name)
  const [color, setColor] = useState(cal.color || EVENT_COLORS[0]!)
  const [nameError, setNameError] = useState('')
  const [saving, setSaving] = useState(false)

  const [hasPassword, setHasPassword] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(true)
  const [newPassword, setNewPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordSaved, setPasswordSaved] = useState(false)

  const [deleteProgress, setDeleteProgress] = useState(0)
  const [deleting, setDeleting] = useState(false)
  const deleteIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const deleteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch(`http://localhost:3001/calendars/${cal.id}/hasPassword`, { method: 'GET' })
      .then(r => r.json())
      .then(json => { if (json.success) setHasPassword(json.hasPassword) })
      .catch(() => {})
      .finally(() => setPasswordLoading(false))
  }, [cal.id])

  const handleSaveName = async () => {
    const trimmed = name.trim()
    if (!trimmed) { setNameError('Name is required.'); return }
    if (trimmed.length > 60) { setNameError('Max 60 characters.'); return }
    setSaving(true)
    try {
      const res = await fetch(`http://localhost:3001/calendars/${cal.id}/updateName`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      })
      const json = await res.json()
      if (json.success) {
        saveKnownCalendar(cal.id, trimmed, color)
        onSaved({ ...cal, name: trimmed, color })
      } else { setNameError('Something went wrong.') }
    } catch { setNameError('Could not reach the server.') }
    setSaving(false)
  }

  const handleSaveColor = async (c: string) => {
    setColor(c)
    try {
      await fetch(`http://localhost:3001/calendars/${cal.id}/updateColor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ color: c }),
      })
      saveKnownCalendar(cal.id, name.trim() || cal.name, c)
      onSaved({ ...cal, name: name.trim() || cal.name, color: c })
    } catch {}
  }

  const handleTogglePassword = async () => {
    if (hasPassword) {
      setPasswordSaving(true)
      try {
        const res = await fetch(`http://localhost:3001/calendars/${cal.id}/removePassword`, { method: 'POST' })
        const json = await res.json()
        if (json.success) { setHasPassword(false); setNewPassword('') }
        else setPasswordError('Something went wrong.')
      } catch { setPasswordError('Could not reach the server.') }
      setPasswordSaving(false)
    } else {
      setHasPassword(true)
    }
  }

  const handleSavePassword = async () => {
    if (!newPassword) { setPasswordError('Enter a password.'); return }
    setPasswordSaving(true)
    setPasswordError('')
    try {
      const res = await fetch(`http://localhost:3001/calendars/${cal.id}/setPassword`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      })
      const json = await res.json()
      if (json.success) { setPasswordSaved(true); setTimeout(() => setPasswordSaved(false), 2000) }
      else setPasswordError('Something went wrong.')
    } catch { setPasswordError('Could not reach the server.') }
    setPasswordSaving(false)
  }

  const handleDeleteStart = () => {
    setDeleteProgress(0)
    const start = Date.now()
    deleteIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - start
      setDeleteProgress(Math.min(elapsed / 5000, 1))
    }, 50)
    deleteTimeoutRef.current = setTimeout(async () => {
      clearInterval(deleteIntervalRef.current!)
      setDeleting(true)
      try {
        const res = await fetch(`http://localhost:3001/calendars/${cal.id}/delete`, { method: 'POST' })
        const json = await res.json()
        if (json.success) onDeleted(cal.id)
      } catch {}
      setDeleting(false)
    }, 5000)
  }

  const handleDeleteCancel = () => {
    clearInterval(deleteIntervalRef.current!)
    clearTimeout(deleteTimeoutRef.current!)
    setDeleteProgress(0)
  }

  useEffect(() => () => {
    clearInterval(deleteIntervalRef.current!)
    clearTimeout(deleteTimeoutRef.current!)
  }, [])

  const sectionStyle: React.CSSProperties = {
    padding: '20px 24px',
    borderBottom: '1px solid #e8eaed',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    color: '#70757a',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#f6f8fc', borderRadius: 24, width: 480, maxWidth: '95vw', boxShadow: '0 8px 32px rgba(60,64,67,0.24)', overflow: 'hidden', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px', borderBottom: '1px solid #e8eaed', flexShrink: 0 }}>
          <span style={{ fontSize: 18, fontWeight: 500, color: '#3c4043' }}>Calendar settings</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5f6368', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>

          {/* Name */}
          <div style={sectionStyle}>
            <div style={labelStyle}>Name</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={name}
                onChange={e => { setName(e.target.value); setNameError('') }}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveName() }}
                maxLength={60}
                style={{ flex: 1, padding: '10px 12px', border: `1px solid ${nameError ? '#d93025' : '#dadce0'}`, borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none', background: '#fff', color: '#3c4043' }}
              />
              <button
                onClick={handleSaveName}
                disabled={saving || !name.trim() || name.trim() === cal.name}
                style={{ background: saving || !name.trim() || name.trim() === cal.name ? '#e8eaed' : '#1a73e8', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 14, cursor: saving || !name.trim() || name.trim() === cal.name ? 'default' : 'pointer', color: saving || !name.trim() || name.trim() === cal.name ? '#9aa0a6' : 'white', fontWeight: 500, fontFamily: 'inherit', whiteSpace: 'nowrap', transition: 'background 0.15s' }}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
            {nameError && <div style={{ fontSize: 12, color: '#d93025' }}>{nameError}</div>}
          </div>

          {/* Color */}
          <div style={sectionStyle}>
            <div style={labelStyle}>Color</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                {EVENT_COLORS.map(c => (
                  <div
                    key={c}
                    onClick={() => handleSaveColor(c)}
                    style={{ width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer', border: color === c ? '3px solid #3c4043' : '3px solid transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.1s', flexShrink: 0 }}
                    onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.15)')}
                    onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                  >
                    {color === c && (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Password */}
          <div style={sectionStyle}>
            <div style={labelStyle}>Password protection</div>
            {passwordLoading ? (
              <div style={{ fontSize: 13, color: '#70757a' }}>Loading…</div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 14, color: '#3c4043' }}>
                    {hasPassword ? 'Password enabled' : 'No password set'}
                  </span>
                  {/* Toggle */}
                  <div
                    onClick={handleTogglePassword}
                    style={{ width: 44, height: 24, borderRadius: 12, background: hasPassword ? '#1a73e8' : '#dadce0', cursor: passwordSaving ? 'default' : 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}
                  >
                    <div style={{ position: 'absolute', top: 3, left: hasPassword ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                  </div>
                </div>
                {hasPassword && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={e => { setNewPassword(e.target.value); setPasswordError('') }}
                      onKeyDown={e => { if (e.key === 'Enter') handleSavePassword() }}
                      placeholder="New password"
                      style={{ padding: '10px 12px', border: `1px solid ${passwordError ? '#d93025' : '#dadce0'}`, borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none', background: '#fff', color: '#3c4043' }}
                    />
                    {passwordError && <div style={{ fontSize: 12, color: '#d93025' }}>{passwordError}</div>}
                    <button
                      onClick={handleSavePassword}
                      disabled={passwordSaving || !newPassword}
                      style={{ alignSelf: 'flex-end', background: passwordSaved ? '#0f9d58' : passwordSaving || !newPassword ? '#e8eaed' : '#1a73e8', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 14, cursor: passwordSaving || !newPassword ? 'default' : 'pointer', color: passwordSaving || !newPassword ? '#9aa0a6' : 'white', fontWeight: 500, fontFamily: 'inherit', transition: 'background 0.15s' }}
                    >
                      {passwordSaved ? 'Saved!' : passwordSaving ? 'Saving…' : 'Set password'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Delete */}
          <div style={{ ...sectionStyle, borderBottom: 'none' }}>
            <div style={labelStyle}>Danger zone</div>
            <div style={{ fontSize: 13, color: '#70757a' }}>
              This permanently deletes the calendar and all its events.
            </div>
            <div style={{ position: 'relative', alignSelf: 'flex-start', marginTop: 4 }}>
              <button
                onMouseDown={handleDeleteStart}
                onMouseUp={handleDeleteCancel}
                onMouseLeave={handleDeleteCancel}
                onTouchStart={handleDeleteStart}
                onTouchEnd={handleDeleteCancel}
                disabled={deleting}
                style={{ position: 'relative', overflow: 'hidden', background: '#fce8e6', border: '1px solid #d93025', borderRadius: 8, padding: '10px 20px', fontSize: 14, cursor: deleting ? 'default' : 'pointer', color: '#d93025', fontWeight: 500, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 8 }}
              >
                {/* fill bar */}
                <div style={{ position: 'absolute', inset: 0, background: '#d93025', transformOrigin: 'left', transform: `scaleX(${deleteProgress})`, transition: deleteProgress === 0 ? 'transform 0.1s' : 'none', opacity: 0.15 }} />
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'relative' }}>
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                </svg>
                <span style={{ position: 'relative', width: "100px" }}>
                  {deleting ? 'Deleting…' : deleteProgress > 0 ? `Hold… ${Math.ceil((1 - deleteProgress) * 5)}s` : 'Delete calendar'}
                </span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

function SidebarCreateCalendar({ onClose, onOpen }: { onClose: () => void, onOpen: () => void }) {
  const router = useRouter()
  const [name, setName] = useState(() => '')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleCreate = async () => {
    if (!name.trim()) return
    setLoading(true)
    try {
      const res = await fetch('http://localhost:3001/calendars/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      const json = await res.json()
      if (json.success) {
        router.push(`/cal/${json.data.id}`)
      } else {
        setError('Something went wrong.')
      }
    } catch { setError('Could not reach the server.') }
    setLoading(false)
  }

  return (
    <div style={{ padding: '16px 24px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <label style={{ fontSize: 12, color: '#70757a', fontWeight: 500, marginBottom: 6, display: 'block' }}>Give it a name</label>
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          style={{ width: '100%', padding: '10px 12px', border: '1px solid #dadce0', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none', background: '#fff', color: '#3c4043', boxSizing: 'border-box' }}
          maxLength={60}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={onOpen} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#1a73e8', fontFamily: 'inherit', padding: 0 }}>
          Open existing instead
        </button>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {error && <span style={{ fontSize: 12, color: '#d93025' }}>{error}</span>}
          <button
            onClick={handleCreate}
            disabled={!name.trim() || loading}
            style={{ background: !name.trim() || loading ? '#a8c7fa' : '#1a73e8', border: 'none', borderRadius: 24, padding: '10px 22px', fontSize: 14, cursor: name.trim() && !loading ? 'pointer' : 'not-allowed', color: 'white', fontWeight: 500, fontFamily: 'inherit' }}
          >
            {loading ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}

function SidebarOpenCalendar({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const [openId, setOpenId] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleOpen = async () => {
    const id = openId.trim()
    if (!id) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`http://localhost:3001/calendars/${id}/access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const json = await res.json()
      if (json.success || json.reason === 'password_required') {
        router.push(`/cal/${id}`)
        onClose()
      } else {
        setError('Calendar not found.')
      }
    } catch { setError('Could not reach the server.') }
    setLoading(false)
  }

  return (
    <div style={{ padding: '16px 24px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <label style={{ fontSize: 12, color: '#70757a', fontWeight: 500, marginBottom: 6, display: 'block' }}>Calendar ID</label>
        <input
          autoFocus
          value={openId}
          onChange={e => { setOpenId(e.target.value); setError('') }}
          onKeyDown={e => { if (e.key === 'Enter') handleOpen() }}
          placeholder=""
          style={{ width: '100%', padding: '10px 12px', border: `1px solid ${error ? '#d93025' : '#dadce0'}`, borderRadius: 8, fontSize: 14, fontFamily: 'monospace', outline: 'none', background: '#fff', color: '#3c4043', boxSizing: 'border-box' }}
        />
        {error && <div style={{ fontSize: 12, color: '#d93025', marginTop: 4 }}>{error}</div>}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={handleOpen}
          disabled={!openId.trim() || loading}
          style={{ background: !openId.trim() || loading ? '#a8c7fa' : '#1a73e8', border: 'none', borderRadius: 24, padding: '10px 22px', fontSize: 14, cursor: openId.trim() && !loading ? 'pointer' : 'not-allowed', color: 'white', fontWeight: 500, fontFamily: 'inherit' }}
        >
          {loading ? 'Checking...' : 'Open'}
        </button>
      </div>
    </div>
  )
}

export default function CalendarPage({ params }: { params: Promise<{ calendarIds: string }> }) {
  const { calendarIds } = use(params)

  const [calIdList, setCalIdList] = useState<string[]>(() => {
    const fromUrl = calendarIds.split('_').map(id => id.trim()).sort()
    try {
      const stored: string[] = JSON.parse(localStorage.getItem(ACTIVE_CALS_KEY) ?? 'null')
      if (Array.isArray(stored) && stored.length > 0 && fromUrl.every(id => stored.includes(id))) {
        return stored
      }
    } catch {}
    return fromUrl
  })
  const primaryCalId = calIdList[0]!

  const [current, setCurrent] = useState(new Date())
  const [eventsByCalId, setEventsByCalId] = useState<Record<string, CalEvent[]>>({})
  const [modalDate, setModalDate] = useState<Date | null>(null)
  const [editEvent, setEditEvent] = useState<CalEvent | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<CalEvent[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [hoveredBtn, setHoveredBtn] = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const [grantedCalendars, setGrantedCalendars] = useState<CalendarInfo[]>([])
  const [accessGranted, setAccessGranted] = useState(false)
  const [knownCalendars, setKnownCalendars] = useState<CalendarInfo[]>([])
  const searchParams = useSearchParams()
  const router = useRouter()
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null)
  const [showWelcome, setShowWelcome] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') return true
    return window.innerWidth >= 1024
  })
  const [toast, setToast] = useState<Toast | null>(null)
  const [sidebarHeaderHovered, setSidebarHeaderHovered] = useState(false)
  const [showCalendarModal, setShowCalendarModal] = useState<'create' | 'open' | null>(null)
  const [calendarOptionsMenu, setCalendarOptionsMenu] = useState<CalendarOptionsMenu | null>(null)
  const [forgetConfirm, setForgetConfirm] = useState<string | null>(null)
  const [renameCalendar, setRenameCalendar] = useState<{ id: string, name: string } | null>(null)
  const [renameName, setRenameName] = useState('')
  const [renameError, setRenameError] = useState('')
  const [renameLoading, setRenameLoading] = useState(false)
  const [calendarSettings, setCalendarSettings] = useState<CalendarInfo | null>(null)

  useEffect(() => {
    const handler = () => { setContextMenu(null); setCalendarOptionsMenu(null) }
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setContextMenu(null); setCalendarOptionsMenu(null) }
    }
    window.addEventListener('click', handler)
    window.addEventListener('keydown', keyHandler)
    return () => { window.removeEventListener('click', handler); window.removeEventListener('keydown', keyHandler) }
  }, [])

  // derive visible events from active calendars
  const events = calIdList.flatMap(id => eventsByCalId[id] ?? [])

  const calendarOptions = knownCalendars.filter(c => calIdList.includes(c.id))

  // persist active calendars to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(ACTIVE_CALS_KEY, JSON.stringify(calIdList))
    } catch {}
    const next = `/cal/${calIdList.join('_')}`
    const current = window.location.pathname
    if (next !== current) {
      window.history.replaceState(null, '', next)
    }
  }, [calIdList.join('_')])

  useEffect(() => {
    if (!accessGranted) return
    grantedCalendars.forEach(cal => saveKnownCalendar(cal.id, cal.name, cal.color))
    setKnownCalendars(getKnownCalendars())
    if (searchParams.get('new') === '1') {
      setShowWelcome(true)
      router.replace(`/cal/${calendarIds}`)
    }
  }, [accessGranted])

  useEffect(() => {
    const handler = () => setContextMenu(null)
    const keyHandler = (e: KeyboardEvent) => { if (e.key === 'Escape') setContextMenu(null) }
    window.addEventListener('click', handler)
    window.addEventListener('keydown', keyHandler)
    return () => { window.removeEventListener('click', handler); window.removeEventListener('keydown', keyHandler) }
  }, [])

  // fetch only calendars not yet loaded
  useEffect(() => {
    if (!accessGranted) return
    const toFetch = calIdList.filter(id => !eventsByCalId[id])
    if (toFetch.length === 0) return
    toFetch.forEach(id => {
      fetch(`http://localhost:3001/events/${id}/all`, { method: 'POST' })
        .then(r => r.json())
        .then(json => {
          if (json.success) {
            setEventsByCalId(prev => ({ ...prev, [id]: json.data }))
          }
        })
        .catch(() => {})
    })
  }, [calIdList.join('_'), accessGranted])

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return }
    const timer = setTimeout(async () => {
      setSearchLoading(true)
      try {
        const res = await fetch(`http://localhost:3001/events/${calIdList.join('_')}/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: searchQuery }),
        })
        const json = await res.json()
        if (json.success) setSearchResults(json.data)
      } catch(e) { console.error(e) }
      setSearchLoading(false)
    }, 350)
    return () => clearTimeout(timer)
  }, [searchQuery, calIdList.join('_')])

  useEffect(() => {
    if (searching) searchRef.current?.focus()
  }, [searching])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && searching && !editEvent && !modalDate) {
        setSearching(false)
        setSearchQuery('')
        setSearchResults([])
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [searching, editEvent, modalDate])

  const y = current.getFullYear()
  const m = current.getMonth()
  const today = new Date()

  let startDow = new Date(y, m, 1).getDay()
  startDow = startDow === 0 ? 6 : startDow - 1
  const daysInMonth = new Date(y, m + 1, 0).getDate()
  const daysInPrev = new Date(y, m, 0).getDate()
  const totalCells = Math.ceil((startDow + daysInMonth) / 7) * 7

  const firstCellDate = new Date(y, m, 1 - startDow)
  const lastCellDate = new Date(y, m, 1 - startDow + totalCells - 1)

  const evByDate: Record<string, CalEvent[]> = {}

  const addToDate = (date: Date, ev: CalEvent) => {
    const key = dateKey(date)
    if (!evByDate[key]) evByDate[key] = []
    if (!evByDate[key].some(e => e.id === ev.id)) evByDate[key].push(ev)
  }

  events.forEach(ev => {
    if (ev.recurring && ev.recurrenceRule) {
      try {
        let rule: RRule
        if (ev.recurrenceRule.includes('DTSTART:')) {
          const [dtstartPart, rrulePart] = ev.recurrenceRule.split(';RRULE:')
          const ds = dtstartPart!.replace('DTSTART:', '').trim()
          const dtstart = new Date(Date.UTC(
            parseInt(ds.slice(0, 4)),
            parseInt(ds.slice(4, 6)) - 1,
            parseInt(ds.slice(6, 8)),
            parseInt(ds.slice(9, 11)),
            parseInt(ds.slice(11, 13)),
            0
          ))
          rule = new RRule({ ...RRule.parseString(`RRULE:${rrulePart}`), dtstart })
        } else {
          rule = RRule.fromString(ev.recurrenceRule.startsWith('RRULE:') ? ev.recurrenceRule : `RRULE:${ev.recurrenceRule}`)
        }

        const rangeStart = new Date(Date.UTC(firstCellDate.getFullYear(), firstCellDate.getMonth(), firstCellDate.getDate()))
        const rangeEnd = new Date(Date.UTC(lastCellDate.getFullYear(), lastCellDate.getMonth(), lastCellDate.getDate() + 1))
        const occurrences = rule.between(rangeStart, rangeEnd, true)

        const durationDays = ev.allDay ? Math.round((ev.endTime - ev.startTime) / 86400000) || 1 : null
        const durationMs = ev.allDay ? null : ev.endTime - ev.startTime

        occurrences.forEach(occ => {
          const oY = occ.getUTCFullYear()
          const oM = occ.getUTCMonth()
          const oD = occ.getUTCDate()
          const oH = occ.getUTCHours()
          const oMin = occ.getUTCMinutes()

          let occStartTime: number
          let occEndTime: number
          let startDay: Date
          let endDay: Date

          if (ev.allDay) {
            occStartTime = Date.UTC(oY, oM, oD)
            occEndTime = Date.UTC(oY, oM, oD + durationDays!)
            startDay = new Date(oY, oM, oD)
            endDay = new Date(oY, oM, oD + durationDays! - 1)
          } else {
            occStartTime = new Date(oY, oM, oD, oH, oMin).getTime()
            occEndTime = occStartTime + durationMs!
            startDay = new Date(oY, oM, oD)
            const occEnd = new Date(occEndTime)
            endDay = new Date(occEnd.getFullYear(), occEnd.getMonth(), occEnd.getDate())
          }

          const occEvent: CalEvent = {
            ...ev,
            id: `${ev.id}+${occStartTime}`,
            startTime: occStartTime,
            endTime: occEndTime,
          }

          const cursor = new Date(startDay)
          while (cursor <= endDay) {
            addToDate(cursor, occEvent)
            cursor.setDate(cursor.getDate() + 1)
          }
        })
      } catch(e) {
        console.error('Failed to expand recurrence rule', ev.recurrenceRule, e)
      }
    } else {
      const start = new Date(ev.startTime)
      const end = new Date(ev.endTime)
      const startDay = new Date(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())
      const endDay = new Date(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate())
      if (endDay < startDay) return
      const cursor = new Date(startDay)
      while (cursor <= endDay) {
        addToDate(cursor, ev)
        cursor.setDate(cursor.getDate() + 1)
      }
    }
  })

  Object.values(evByDate).forEach(dayEvents => {
    dayEvents.sort((a, b) => {
      if (a.allDay !== b.allDay) return a.allDay ? -1 : 1
      return a.startTime - b.startTime
    })
  })

  const changeMonth = (dir: number) => setCurrent(new Date(y, m + dir, 1))

  const getEventCalId = (ev: CalEvent): string =>
    calIdList.find(id => ev.calId === id) ?? primaryCalId

  const showToast = (eventId: string, evCalId: string) => {
    if (toast) clearTimeout(toast.timer)
    const timer = setTimeout(() => setToast(null), 5000)
    setToast({ eventId, calId: evCalId, timer })
  }

  const handleUndo = async () => {
    if (!toast) return
    clearTimeout(toast.timer)
    const { eventId, calId: evCalId } = toast
    setToast(null)
    try {
      const res = await fetch(`http://localhost:3001/events/${evCalId}/undoDelete/${eventId}`, { method: 'POST' })
      const json = await res.json()
      if (json.success) {
        setEventsByCalId(prev => ({
          ...prev,
          [evCalId]: [...(prev[evCalId] ?? []), json.data]
        }))
      }
    } catch(e) { console.error(e) }
  }

  const handleCreate = async (payload: EventPayload, targetCalId: string) => {
    try {
      const calId = targetCalId || primaryCalId
      const res = await fetch(`http://localhost:3001/events/${calId}/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (json.success) {
        setEventsByCalId(prev => ({
          ...prev,
          [primaryCalId]: [...(prev[primaryCalId] ?? []), json.data]
        }))
      }
    } catch(e) { console.error(e) }
  }

  const handleUpdate = async (payload: EventPayload) => {
    if (!editEvent) return
    const evCalId = getEventCalId(editEvent)
    try {
      const res = await fetch(`http://localhost:3001/events/${evCalId}/update/${editEvent.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (json.success) {
        setEventsByCalId(prev => ({
          ...prev,
          [evCalId]: (prev[evCalId] ?? []).map(e => e.id === editEvent.id ? { ...e, ...payload } : e)
        }))
      }
    } catch(e) { console.error(e) }
    setEditEvent(null)
  }

  const handleDelete = async () => {
    if (!editEvent) return
    const evCalId = getEventCalId(editEvent)
    const eventId = editEvent.id
    try {
      await fetch(`http://localhost:3001/events/${evCalId}/delete/${eventId}`, { method: 'POST' })
      setEventsByCalId(prev => ({
        ...prev,
        [evCalId]: (prev[evCalId] ?? []).filter(e => e.id !== eventId)
      }))
      showToast(eventId, evCalId)
    } catch(e) { console.error(e) }
    setEditEvent(null)
  }

  const handleContextDelete = async () => {
    if (!contextMenu) return
    const ev = contextMenu.ev
    const evCalId = getEventCalId(ev)
    setContextMenu(null)
    try {
      await fetch(`http://localhost:3001/events/${evCalId}/delete/${ev.id}`, { method: 'POST' })
      setEventsByCalId(prev => ({
        ...prev,
        [evCalId]: (prev[evCalId] ?? []).filter(e => e.id !== ev.id)
      }))
      showToast(ev.id, evCalId)
    } catch(e) { console.error(e) }
  }

  const handleContextColor = async (color: string) => {
    if (!contextMenu) return
    const ev = contextMenu.ev
    const evCalId = getEventCalId(ev)
    setContextMenu(null)
    try {
      const res = await fetch(`http://localhost:3001/events/${evCalId}/updateColor/${ev.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ color }),
      })
      const json = await res.json()
      if (json.success) {
        setEventsByCalId(prev => ({
          ...prev,
          [evCalId]: (prev[evCalId] ?? []).map(e => e.id === ev.id ? { ...e, color } : e)
        }))
      }
    } catch(e) { console.error(e) }
  }

  const toggleCalendar = (id: string) => {
    setCalIdList(prev => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev
        return prev.filter(i => i !== id).sort()
      } else {
        return [...prev, id].sort()
      }
    })
  }

  const hoverProps = (key: string) => ({
    onMouseEnter: () => setHoveredBtn(key),
    onMouseLeave: () => setHoveredBtn(null),
  })

  const wheelCooldown = useRef(false)

  const handleRename = async () => {
    if (!renameCalendar) return
    const name = renameName.trim()
    if (!name) { setRenameError('Name is required.'); return }
    if (name.length > 60) { setRenameError('Name must be 60 characters or fewer.'); return }
    setRenameLoading(true)
    try {
      const res = await fetch(`http://localhost:3001/calendars/${renameCalendar.id}/updateName`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name }),
      })
      const json = await res.json()
      if (json.success) {
        const known = getKnownCalendars().find(cal => cal.id === renameCalendar.id)
        saveKnownCalendar(renameCalendar.id, name, known!.color)
        setKnownCalendars(getKnownCalendars())
        setRenameCalendar(null)
      } else {
        setRenameError('Something went wrong.')
      }
    } catch { setRenameError('Could not reach the server.') }
    setRenameLoading(false)
  }

  const handleForget = (calId: string) => {
    // remove from known calendars in localStorage
    try {
      const existing = getKnownCalendars().filter(c => c.id !== calId)
      localStorage.setItem(CALENDARS_KEY, JSON.stringify(existing))
      setKnownCalendars(existing)
    } catch {}

    // remove from active list
    setCalIdList(prev => {
      const next = prev.filter(id => id !== calId)
      return next.length > 0 ? next : prev // don't remove if it's the last one
    })

    // remove token and color
    try {
      const store = JSON.parse(localStorage.getItem('cal_tokens') ?? '{}')
      delete store[calId]
      localStorage.setItem('cal_tokens', JSON.stringify(store))
    } catch {}
    try {
      const store = JSON.parse(localStorage.getItem('cal_colors') ?? '{}')
      delete store[calId]
      localStorage.setItem('cal_colors', JSON.stringify(store))
    } catch {}

    setForgetConfirm(null)
  }

  if (!accessGranted) {
    return (
      <AccessGate
        calIds={calIdList}
        onGranted={(results) => {
          setGrantedCalendars(results)
          setAccessGranted(true)
        }}
      />
    )
  }

  let ctxX = 0
  let ctxY = 0
  if (contextMenu) {
    const menuWidth = 180
    const menuHeight = 200
    ctxX = contextMenu.x + menuWidth > window.innerWidth ? contextMenu.x - menuWidth : contextMenu.x
    ctxY = contextMenu.y + menuHeight > window.innerHeight ? contextMenu.y - menuHeight : contextMenu.y
  }

  return (
    <div style={{ fontFamily: 'Google Sans, Roboto, sans-serif', height: '100vh', display: 'flex', flexDirection: 'column', background: '#f6f8fc' }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 16px', borderBottom: '1px solid #dadce0', background: '#f6f8fc', position: 'relative' }}>
        {searching ? (
          <>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #dadce0', borderRadius: 24, padding: '6px 16px', boxShadow: '0 1px 3px rgba(60,64,67,0.1)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#70757a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={searchRef}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search events..."
                onFocus={async () => {
                  if (searchQuery.trim() && searchResults.length === 0) {
                    setSearchLoading(true)
                    try {
                      const res = await fetch(`http://localhost:3001/events/${calIdList.join('_')}/search`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ query: searchQuery }),
                      })
                      const json = await res.json()
                      if (json.success) setSearchResults(json.data)
                    } catch(e) { console.error(e) }
                    setSearchLoading(false)
                  }
                }}
                style={{ flex: 1, border: 'none', outline: 'none', fontSize: 15, color: '#3c4043', background: 'transparent', fontFamily: 'inherit' }}
              />
              {searchLoading && <span style={{ fontSize: 12, color: '#70757a' }}>...</span>}
            </div>
            <button
              onClick={() => { setContextMenu(null); setSearching(false); setSearchQuery(''); setSearchResults([]) }}
              {...hoverProps('close')}
              style={{ background: hoveredBtn === 'close' ? '#e8eaed' : 'transparent', border: 'none', cursor: 'pointer', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3c4043', transition: 'background 0.1s', padding: 0, marginLeft: 4 }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {searchResults.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 16, right: 16, background: '#fff', borderRadius: 8, boxShadow: '0 4px 12px rgba(60,64,67,0.2)', zIndex: 100, overflow: 'hidden', border: '1px solid #dadce0' }}>
                {searchResults.map(ev => {
                  const d = new Date(ev.startTime)
                  const dEnd = new Date(ev.endTime)
                  const formatDate = (date: Date) => date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
                  const formatTime = (date: Date) => date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                  const isSameDay = d.getFullYear() === dEnd.getFullYear() && d.getMonth() === dEnd.getMonth() && d.getDate() === dEnd.getDate()
                  const timeStr = ev.allDay
                    ? isSameDay ? 'All day' : `${formatDate(d)} – ${formatDate(dEnd)}`
                    : isSameDay ? `${formatDate(d)} · ${formatTime(d)} – ${formatTime(dEnd)}` : `${formatDate(d)} ${formatTime(d)} – ${formatDate(dEnd)} ${formatTime(dEnd)}`
                  return (
                    <div
                      key={ev.id}
                      onClick={() => { setCurrent(new Date(ev.startTime)); setEditEvent(ev); setSearching(false); setSearchQuery(''); setSearchResults([]) }}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', cursor: 'pointer', borderBottom: '0.5px solid #f1f3f4' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f6f8fc')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: ev.color || '#1a73e8', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, color: '#3c4043', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.title}</div>
                        <div style={{ fontSize: 12, color: '#70757a' }}>{ev.allDay && isSameDay ? `${formatDate(d)}` : timeStr}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        ) : (
          <>
            <button
              onClick={() => setSidebarOpen(prev => !prev)}
              {...hoverProps('menu')}
              style={{ background: hoveredBtn === 'menu' ? '#e8eaed' : 'transparent', border: 'none', cursor: 'pointer', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3c4043', transition: 'background 0.1s', padding: 0, flexShrink: 0 }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            <button
              onClick={() => setCurrent(new Date())}
              {...hoverProps('today')}
              style={{ background: hoveredBtn === 'today' ? '#e8eaed' : 'transparent', border: '1px solid #3c4043', borderRadius: 24, padding: '10px 22px', fontSize: 15, fontWeight: 500, cursor: 'pointer', color: '#3c4043', fontFamily: 'inherit', marginRight: 8, transition: 'background 0.1s' }}
            >
              Today
            </button>
            <button
              onClick={() => changeMonth(-1)}
              {...hoverProps('prev')}
              style={{ background: hoveredBtn === 'prev' ? '#e8eaed' : 'transparent', border: 'none', cursor: 'pointer', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3c4043', transition: 'background 0.1s', padding: 0 }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button
              onClick={() => changeMonth(1)}
              {...hoverProps('next')}
              style={{ background: hoveredBtn === 'next' ? '#e8eaed' : 'transparent', border: 'none', cursor: 'pointer', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3c4043', transition: 'background 0.1s', padding: 0 }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
            <span style={{ fontSize: 22, fontWeight: 400, color: '#3c4043', marginLeft: 8, flex: 1 }}>{MONTHS[m]} {y}</span>
            <button
              onClick={() => { setContextMenu(null); setSearching(true) }}
              {...hoverProps('search')}
              style={{ background: hoveredBtn === 'search' ? '#e8eaed' : 'transparent', border: 'none', cursor: 'pointer', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3c4043', transition: 'background 0.1s', padding: 0 }}
              title="Search"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>
          </>
        )}
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Sidebar */}
        <div style={{
          width: sidebarOpen ? 240 : 0,
          minWidth: sidebarOpen ? 240 : 0,
          overflow: 'hidden',
          transition: 'width 0.2s ease, min-width 0.2s ease',
          background: '#f6f8fc',
          borderRight: sidebarOpen ? '1px solid #dadce0' : 'none',
          display: 'flex',
          flexDirection: 'column',
          padding: sidebarOpen ? '20px 16px' : 0,
        }}>
          {sidebarOpen && (
            <>
              <div
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px 8px', marginBottom: 4 }}
                onMouseEnter={() => setSidebarHeaderHovered(true)}
                onMouseLeave={() => setSidebarHeaderHovered(false)}
              >
                <div style={{ fontSize: 11, fontWeight: 600, color: '#444746', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                  My calendars
                </div>
                <div
                  onClick={() => setShowCalendarModal('create')}
                  style={{
                    width: 24, height: 24, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                    visibility: sidebarHeaderHovered ? 'visible' : 'hidden',
                    color: '#5f6368',
                    fontSize: 20,
                    lineHeight: 1,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#dadce0')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  title="Add calendar"
                >
                  +
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {knownCalendars.map(cal => {
                  const isActive = calIdList.includes(cal.id)
                  const isOnly = calIdList.length === 1 && isActive
                  const isHovered = hoveredBtn === `cal-${cal.id}`
                  return (
                    <div
                      key={cal.id}
                      onMouseEnter={() => setHoveredBtn(`cal-${cal.id}`)}
                      onMouseLeave={() => setHoveredBtn(null)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '4px 8px',
                        borderRadius: 20,
                        cursor: 'pointer',
                        background: isHovered ? '#e8eaed' : 'transparent',
                        transition: 'background 0.1s',
                        gap: 12,
                      }}
                    >
                      <div
                        onClick={e => { e.stopPropagation(); if (!isOnly) toggleCalendar(cal.id) }}
                        style={{
                          width: 18, height: 18, borderRadius: 3,
                          border: `2px solid ${isActive ? cal.color || EVENT_COLORS[0] : '#5f6368'}`,
                          background: isActive ? cal.color || EVENT_COLORS[0] : '#fff',
                          flexShrink: 0,
                          cursor: isOnly ? 'not-allowed' : 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'background 0.1s, border-color 0.1s',
                        }}
                      >
                        {isActive && (
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                      <span
                        onClick={() => router.push(`/cal/${cal.id}`)}
                        style={{ flex: 1, fontSize: 14, color: '#3c4043', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', userSelect: 'none' }}
                      >
                        {cal.name}
                      </span>

                      <div
                        onClick={e => {
                          e.stopPropagation()
                          setCalendarOptionsMenu({ calId: cal.id, x: e.clientX, y: e.clientY })
                        }}
                        style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer', visibility: isHovered ? 'visible' : 'hidden' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#dadce0')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#5f6368' }}>
                          <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
                        </svg>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>

        {/* Calendar */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', margin: '12px', borderRadius: 12, border: '1px solid #dadce0', background: '#fff', boxShadow: '0 1px 3px rgba(60,64,67,0.1)' }} onClick={() => setSearchResults([])}
          onWheel={e => {
            if (Math.abs(e.deltaY) < 10 || wheelCooldown.current) return
            wheelCooldown.current = true
            setTimeout(() => { wheelCooldown.current = false }, 800)
            changeMonth(e.deltaY > 0 ? 1 : -1)
          }}>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #dadce0' }}>
            {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 12, fontWeight: 500, color: '#3c4043', padding: '10px 0', letterSpacing: '0.5px' }}>
                {d.toUpperCase()}
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', flex: 1 }}>
            {Array.from({ length: totalCells }, (_, i) => {
              const offset = i - startDow
              const dayNum = offset < 0 ? daysInPrev + offset + 1 : offset >= daysInMonth ? offset - daysInMonth + 1 : offset + 1

              const cellDate = offset < 0
                ? new Date(m === 0 ? y - 1 : y, m === 0 ? 11 : m - 1, dayNum)
                : offset >= daysInMonth
                  ? new Date(m === 11 ? y + 1 : y, m === 11 ? 0 : m + 1, dayNum)
                  : new Date(y, m, dayNum)

              const isToday = cellDate.getFullYear() === today.getFullYear() && cellDate.getMonth() === today.getMonth() && cellDate.getDate() === today.getDate()
              const key = dateKey(cellDate)
              const dayEvents = evByDate[key] ?? []

              return (
                <div
                  key={i}
                  onClick={() => setModalDate(cellDate)}
                  style={{
                    borderRight: '1px solid #dadce0',
                    borderBottom: '1px solid #dadce0',
                    padding: '6px 4px',
                    cursor: 'pointer',
                    minHeight: 110,
                    background: '#fff',
                    minWidth: 0,
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
                    <div style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: isToday ? '#fff' : '#3c4043',
                      width: 28,
                      height: 28,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '50%',
                      background: isToday ? '#1a73e8' : 'transparent',
                    }}>
                      {dayNum}
                    </div>
                  </div>
                  {dayEvents.map(ev => {
                    const start = new Date(ev.startTime)
                    const hh = String(start.getHours()).padStart(2, '0')
                    const mm = String(start.getMinutes()).padStart(2, '0')
                    const isPast = ev.endTime < today.getTime()
                    return (
                      <div
                        key={ev.id}
                        onClick={e => {
                          e.stopPropagation()
                          setContextMenu(null)
                          setSearchResults([])
                          const originalId = ev.id.includes('+') ? ev.id.split('+')[0]! : ev.id
                          const original = events.find(e => e.id === originalId) ?? ev
                          setEditEvent(original)
                        }}
                        onContextMenu={e => {
                          e.preventDefault()
                          e.stopPropagation()
                          const originalId = ev.id.includes('+') ? ev.id.split('+')[0]! : ev.id
                          const original = events.find(e => e.id === originalId) ?? ev
                          setContextMenu({ ev: original, x: e.clientX, y: e.clientY })
                        }}
                        onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(0.88)')}
                        onMouseLeave={e => (e.currentTarget.style.filter = 'brightness(1)')}
                        style={{
                          fontSize: 13,
                          padding: '3px 8px',
                          borderRadius: 6,
                          marginBottom: 2,
                          background: ev.color || '#1a73e8',
                          color: 'white',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                          display: 'block',
                          cursor: 'pointer',
                          fontWeight: 500,
                          opacity: isPast ? 0.45 : 1,
                          transition: 'filter 0.1s',
                        }}
                      >
                        {ev.allDay ? '' : `${hh}:${mm}`} {ev.title}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {modalDate && (
        <EventModal
          date={modalDate}
          calendarId={calendarOptions[0]!.id}
          calendarOptions={calIdList.length > 1 ? calendarOptions : undefined}
          defaultColor={calendarOptions[0]!.color}
          onClose={() => setModalDate(null)}
          onSave={async (payload, calId) => { await handleCreate(payload, calId); setModalDate(null) }}
        />
      )}

      {editEvent && (
        <EventModal
          date={new Date(editEvent.startTime)}
          event={editEvent}
          calendarId={editEvent.calId}
          calendarOptions={calIdList.length > 1 ? calendarOptions : undefined}
          defaultColor={editEvent.color}
          onClose={() => setEditEvent(null)}
          onSave={handleUpdate}
          onDelete={handleDelete}
        />
      )}

      {showWelcome && (
        <div onClick={() => setShowWelcome(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#f6f8fc', borderRadius: 24, width: 480, maxWidth: '95vw', boxShadow: '0 8px 32px rgba(60,64,67,0.24)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 20px 0' }}>
              <span style={{ fontSize: 18, fontWeight: 500, color: '#3c4043' }}>Calendar created</span>
              <button onClick={() => setShowWelcome(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#5f6368', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            <div style={{ padding: '16px 24px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ fontSize: 14, color: '#70757a', margin: 0 }}>Save this ID — you'll need it to access your calendar from any device.</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, background: '#fff', border: '1px solid #dadce0', borderRadius: 8, padding: '10px 14px', fontFamily: 'monospace', fontSize: 14, color: '#3c4043' }}>
                  {primaryCalId}
                </div>
                <CopyButton value={primaryCalId} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '4px 24px 20px' }}>
              <button onClick={() => setShowWelcome(false)} style={{ background: '#1a73e8', border: 'none', borderRadius: 24, padding: '10px 28px', fontSize: 14, cursor: 'pointer', color: 'white', fontWeight: 500, fontFamily: 'inherit' }}>
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {contextMenu && (
        <div
          onClick={e => e.stopPropagation()}
          style={{ position: 'fixed', top: ctxY, left: ctxX, background: '#f6f8fc', borderRadius: 16, boxShadow: '0 8px 32px rgba(60,64,67,0.24)', border: '1px solid #dadce0', zIndex: 2000, minWidth: 160, overflow: 'hidden', fontFamily: 'Google Sans, Roboto, sans-serif' }}
        >
          <div style={{ padding: '8px 0' }}>
            <div
              onClick={handleContextDelete}
              onMouseEnter={e => (e.currentTarget.style.background = '#e8eaed')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              style={{ padding: '12px 16px', fontSize: 15, fontWeight: 500, color: '#3c4043', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
              Delete
            </div>
            <div style={{ padding: '8px 16px 12px' }}>
              <div style={{ fontSize: 11, color: '#70757a', fontWeight: 500, marginBottom: 8 }}>Color</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[0, 1].map(row => (
                  <div key={row} style={{ display: 'flex', gap: 6 }}>
                    {EVENT_COLORS.slice(row * 6, row * 6 + 6).map(c => (
                      <div
                        key={c}
                        onClick={() => handleContextColor(c)}
                        style={{ width: 24, height: 24, borderRadius: '50%', background: c, cursor: 'pointer', border: contextMenu.ev.color === c ? '2px solid #3c4043' : '2px solid transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.1s', flexShrink: 0 }}
                        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.15)')}
                        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                      >
                        {contextMenu.ev.color === c && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#323232',
          color: '#fff',
          borderRadius: 8,
          padding: '12px 20px',
          fontSize: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          boxShadow: '0 4px 12px rgba(0,0,0,0.24)',
          zIndex: 3000,
          whiteSpace: 'nowrap',
        }}>
          Event deleted
          <span
            onClick={handleUndo}
            style={{ color: '#8ab4f8', fontWeight: 500, cursor: 'pointer' }}
            onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
            onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
          >
            Undo
          </span>
        </div>
      )}

      {showCalendarModal && (
        <div onClick={() => setShowCalendarModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#f6f8fc', borderRadius: 24, width: 500, maxWidth: '95vw', boxShadow: '0 8px 32px rgba(60,64,67,0.24)', overflow: 'hidden' }}>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 20px 0' }}>
              <span style={{ fontSize: 18, fontWeight: 500, color: '#3c4043' }}>
                {showCalendarModal === 'create' ? 'New calendar' : 'Open calendar'}
              </span>
              <button
                onClick={() => setShowCalendarModal(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#5f6368', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >✕</button>
            </div>

            {showCalendarModal === 'create' ? (
              <SidebarCreateCalendar
                onClose={() => setShowCalendarModal(null)}
                onOpen={() => setShowCalendarModal('open')}
              />
            ) : (
              <SidebarOpenCalendar
                onClose={() => setShowCalendarModal(null)}
              />
            )}

          </div>
        </div>
      )}

      {calendarOptionsMenu && (() => {
        const menuWidth = 160
        const menuHeight = 180
        const x = calendarOptionsMenu.x + menuWidth > window.innerWidth ? calendarOptionsMenu.x - menuWidth : calendarOptionsMenu.x
        const y = calendarOptionsMenu.y + menuHeight > window.innerHeight ? calendarOptionsMenu.y - menuHeight : calendarOptionsMenu.y
        return (
          <div
            onClick={e => e.stopPropagation()}
            style={{ position: 'fixed', top: y, left: x, background: '#f6f8fc', borderRadius: 12, boxShadow: '0 8px 32px rgba(60,64,67,0.24)', border: '1px solid #dadce0', zIndex: 2000, minWidth: 160, overflow: 'hidden', fontFamily: 'Google Sans, Roboto, sans-serif' }}
          >
            <div
              key="Rename"
              onClick={() => {
                const cal = knownCalendars.find(c => c.id === calendarOptionsMenu.calId)
                if (cal) {
                  setRenameCalendar(cal)
                  setRenameName(cal.name)
                  setRenameError('')
                }
                setCalendarOptionsMenu(null)
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#e8eaed')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              style={{ padding: '10px 16px', fontSize: 14, color: '#3c4043', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, transition: 'background 0.1s' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#5f6368', flexShrink: 0 }}>
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Rename
            </div>
            {/* <div
              key="Share"
              onClick={() => {
                setCalendarOptionsMenu(null)
                // placeholder — actions to be wired up
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#e8eaed')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              style={{ padding: '10px 16px', fontSize: 14, color: '#3c4043', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, transition: 'background 0.1s' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#5f6368', flexShrink: 0 }}>
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
              Share
            </div> */}
            <div
              key="Settings"
              onClick={() => {
                const cal = knownCalendars.find(c => c.id === calendarOptionsMenu!.calId)
                if (cal) setCalendarSettings(cal)
                setCalendarOptionsMenu(null)
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#e8eaed')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              style={{ padding: '10px 16px', fontSize: 14, color: '#3c4043', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, transition: 'background 0.1s' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#5f6368', flexShrink: 0 }}>
                <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
              Settings
            </div>
            <div
              key="Forget"
              onClick={() => {
                setCalendarOptionsMenu(null)
                setForgetConfirm(calendarOptionsMenu.calId)
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#e8eaed')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              style={{ padding: '10px 16px', fontSize: 14, color: '#d93025', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, transition: 'background 0.1s' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#d93025', flexShrink: 0 }}>
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
              Forget
            </div>
          </div>
        )
      })()}

      {renameCalendar && (
        <div onClick={() => setRenameCalendar(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#f6f8fc', borderRadius: 24, width: 400, maxWidth: '95vw', boxShadow: '0 8px 32px rgba(60,64,67,0.24)', overflow: 'hidden' }}>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 20px 0' }}>
              <span style={{ fontSize: 18, fontWeight: 500, color: '#3c4043' }}>Rename calendar</span>
              <button onClick={() => setRenameCalendar(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#5f6368', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>

            <div style={{ padding: '16px 24px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input
                autoFocus
                value={renameName}
                onChange={e => { setRenameName(e.target.value); setRenameError('') }}
                onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setRenameCalendar(null) }}
                maxLength={60}
                style={{ width: '100%', padding: '10px 12px', border: `1px solid ${renameError ? '#d93025' : '#dadce0'}`, borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none', background: '#fff', color: '#3c4043', boxSizing: 'border-box' }}
              />
              {renameError && <div style={{ fontSize: 12, color: '#d93025' }}>{renameError}</div>}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '4px 24px 20px' }}>
              <button
                onClick={() => setRenameCalendar(null)}
                style={{ background: 'transparent', border: '1px solid #dadce0', borderRadius: 24, padding: '10px 22px', fontSize: 14, cursor: 'pointer', color: '#3c4043', fontFamily: 'inherit' }}
              >
                Cancel
              </button>
              <button
                onClick={handleRename}
                disabled={!renameName.trim() || renameLoading}
                style={{ background: !renameName.trim() || renameLoading ? '#a8c7fa' : '#1a73e8', border: 'none', borderRadius: 24, padding: '10px 22px', fontSize: 14, cursor: renameName.trim() && !renameLoading ? 'pointer' : 'not-allowed', color: 'white', fontWeight: 500, fontFamily: 'inherit' }}
              >
                {renameLoading ? 'Saving...' : 'Save'}
              </button>
            </div>

          </div>
        </div>
      )}

      {forgetConfirm && (
        <div onClick={() => setForgetConfirm(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#f6f8fc', borderRadius: 24, width: 400, maxWidth: '95vw', boxShadow: '0 8px 32px rgba(60,64,67,0.24)', padding: '28px 28px 20px' }}>

            <div style={{ fontSize: 18, fontWeight: 500, color: '#3c4043', marginBottom: 10 }}>Forget this calendar?</div>
            <div style={{ fontSize: 14, color: '#70757a', marginBottom: 24, lineHeight: 1.6 }}>
              It is not deleted, just removed from your calendars list.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                onClick={() => setForgetConfirm(null)}
                style={{ background: 'transparent', border: '1px solid #dadce0', borderRadius: 24, padding: '10px 22px', fontSize: 14, cursor: 'pointer', color: '#3c4043', fontFamily: 'inherit' }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleForget(forgetConfirm)}
                style={{ background: '#d93025', border: 'none', borderRadius: 24, padding: '10px 22px', fontSize: 14, cursor: 'pointer', color: 'white', fontWeight: 500, fontFamily: 'inherit' }}
              >
                Forget
              </button>
            </div>

          </div>
        </div>
      )}

      {calendarSettings && (
        <CalendarSettingsModal
          cal={calendarSettings}
          onClose={() => setCalendarSettings(null)}
          onSaved={updated => {
            saveKnownCalendar(updated.id, updated.name, updated.color)
            setKnownCalendars(getKnownCalendars())
            setCalendarSettings(updated)
          }}
          onDeleted={calId => {
            setCalendarSettings(null)
            handleForget(calId)
          }}
        />
      )}
    </div>
  )
}
