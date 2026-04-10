'use client'

import { useEffect, useState, use, useRef } from 'react'
import EventModal, { CalEvent, EventPayload } from '../../../components/EventModal'
import { RRule } from 'rrule'
import AccessGate from '../../../components/AccessGate'
import { useSearchParams, useRouter } from 'next/navigation'
import EVENT_COLORS from '../../../components/colors'

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
}

interface Toast {
  eventId: string
  calId: string
  timer: ReturnType<typeof setTimeout>
}

function getKnownCalendars(): CalendarInfo[] {
  try {
    return JSON.parse(localStorage.getItem(CALENDARS_KEY) ?? '[]')
  } catch { return [] }
}

function saveKnownCalendar(id: string, name: string) {
  try {
    const existing = getKnownCalendars().filter(c => c.id !== id)
    existing.push({ id, name })
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

export default function CalendarPage({ params }: { params: Promise<{ calendarIds: string }> }) {
  const { calendarIds } = use(params)
  const primaryCalId = calendarIds.split('_').map(id => id.trim()).sort()[0]!

  const [calIdList, setCalIdList] = useState<string[]>(() => {
    const fromUrl = calendarIds.split('_').map(id => id.trim()).sort()
    try {
      const stored = JSON.parse(localStorage.getItem(ACTIVE_CALS_KEY) ?? 'null')
      if (Array.isArray(stored) && stored.length > 0) return stored
    } catch {}
    return fromUrl
  })

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

  // derive visible events from active calendars
  const events = calIdList.flatMap(id => eventsByCalId[id] ?? [])

  // persist active calendars to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(ACTIVE_CALS_KEY, JSON.stringify(calIdList))
    } catch {}
  }, [calIdList.join('_')])

  useEffect(() => {
    if (!accessGranted) return
    grantedCalendars.forEach(cal => saveKnownCalendar(cal.id, cal.name))
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

  const handleCreate = async (payload: EventPayload) => {
    try {
      const res = await fetch(`http://localhost:3001/events/${primaryCalId}/create`, {
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
      const res = await fetch(`http://localhost:3001/events/${evCalId}/update/${ev.id}`, {
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px 8px', marginBottom: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#444746', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                  My calendars
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
                          border: `2px solid ${isActive ? '#1a73e8' : '#5f6368'}`,
                          background: isActive ? '#1a73e8' : '#fff',
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
                        onClick={e => e.stopPropagation()}
                        style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'default', visibility: isHovered ? 'visible' : 'hidden' }}
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
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', margin: '12px', borderRadius: 12, border: '1px solid #dadce0', background: '#fff', boxShadow: '0 1px 3px rgba(60,64,67,0.1)' }} onClick={() => setSearchResults([])}>

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
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
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
          onClose={() => setModalDate(null)}
          onSave={async (payload) => { await handleCreate(payload); setModalDate(null) }}
        />
      )}

      {editEvent && (
        <EventModal
          date={new Date(editEvent.startTime)}
          event={editEvent}
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

    </div>
  )
}
