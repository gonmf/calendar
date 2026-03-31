'use client'

import { useEffect, useState, use, useRef } from 'react'
import EventModal, { CalEvent, EventPayload } from '../../../components/EventModal'
import { RRule } from 'rrule'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

const dateKey = (d: Date) =>
  `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`

export default function CalendarPage({ params }: { params: Promise<{ calendarId: string }> }) {
  const { calendarId } = use(params)
  const calId = `cal_${calendarId.trim().slice(0, 16)}`
  const [current, setCurrent] = useState(new Date())
  const [events, setEvents] = useState<CalEvent[]>([])
  const [modalDate, setModalDate] = useState<Date | null>(null)
  const [editEvent, setEditEvent] = useState<CalEvent | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<CalEvent[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [hoveredBtn, setHoveredBtn] = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch(`http://localhost:3001/events/${calId}/all`, { method: 'POST' })
      .then(r => r.json())
      .then(json => { if (json.success) setEvents(json.data) })
      .catch(() => {})
  }, [calId])

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return }
    const timer = setTimeout(async () => {
      setSearchLoading(true)
      try {
        const res = await fetch(`http://localhost:3001/events/${calId}/search`, {
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
  }, [searchQuery, calId])

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

  // first and last visible cell dates
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
          rule = new RRule({
            ...RRule.parseString(`RRULE:${rrulePart}`),
            dtstart,
          })
        } else {
          rule = RRule.fromString(
            ev.recurrenceRule.startsWith('RRULE:')
              ? ev.recurrenceRule
              : `RRULE:${ev.recurrenceRule}`
          )
        }

        // query range: first cell to day after last cell
        const rangeStart = new Date(Date.UTC(firstCellDate.getFullYear(), firstCellDate.getMonth(), firstCellDate.getDate()))
        const rangeEnd = new Date(Date.UTC(lastCellDate.getFullYear(), lastCellDate.getMonth(), lastCellDate.getDate() + 1))

        const occurrences = rule.between(rangeStart, rangeEnd, true)
        console.log('occurrences:', occurrences.map(o => `UTC: ${o.getUTCFullYear()}-${o.getUTCMonth()+1}-${o.getUTCDate()}`))

        // duration in whole UTC days for all-day, ms for timed
        const durationDays = ev.allDay
          ? Math.round((ev.endTime - ev.startTime) / 86400000) || 1
          : null
        const durationMs = ev.allDay ? null : ev.endTime - ev.startTime

        occurrences.forEach(occ => {
          // rrule returns UTC dates — read as UTC
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

  const handleCreate = async (payload: EventPayload) => {
    try {
      const res = await fetch(`http://localhost:3001/events/${calId}/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (json.success) setEvents(prev => [...prev, json.data])
    } catch(e) { console.error(e) }
  }

  const handleUpdate = async (payload: EventPayload) => {
    if (!editEvent) return
    try {
      const res = await fetch(`http://localhost:3001/events/${calId}/update/${editEvent.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (json.success) setEvents(prev => prev.map(e => e.id === editEvent.id ? { ...e, ...payload } : e))
    } catch(e) { console.error(e) }
    setEditEvent(null)
  }

  const handleDelete = async () => {
    if (!editEvent) return
    try {
      await fetch(`http://localhost:3001/events/${calId}/delete/${editEvent.id}`, { method: 'POST' })
      setEvents(prev => prev.filter(e => e.id !== editEvent.id))
    } catch(e) { console.error(e) }
    setEditEvent(null)
  }

  const hoverProps = (key: string) => ({
    onMouseEnter: () => setHoveredBtn(key),
    onMouseLeave: () => setHoveredBtn(null),
  })

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
                      const res = await fetch(`http://localhost:3001/events/${calId}/search`, {
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
              onClick={() => { setSearching(false); setSearchQuery(''); setSearchResults([]) }}
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
              onClick={() => setSearching(true)}
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
                        setSearchResults([])
                        const originalId = ev.id.includes('+') ? ev.id.split('+')[0]! : ev.id
                        const original = events.find(e => e.id === originalId) ?? ev
                        setEditEvent(original)
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
    </div>
  )
}
