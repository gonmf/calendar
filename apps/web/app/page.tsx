'use client'

import { useEffect, useState } from 'react'
import EventModal, { CalEvent, EventPayload } from '../components/EventModal'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

export default function CalendarPage() {
  const [current, setCurrent] = useState(new Date())
  const [events, setEvents] = useState<CalEvent[]>([])
  const [modalDate, setModalDate] = useState<Date | null>(null)
  const [editEvent, setEditEvent] = useState<CalEvent | null>(null)

  useEffect(() => {
    fetch('http://localhost:3001/events/all', { method: 'POST' })
      .then(r => r.json())
      .then(json => { if (json.success) setEvents(json.data) })
      .catch(() => {})
  }, [])

  const y = current.getFullYear()
  const m = current.getMonth()
  const today = new Date()

  let startDow = new Date(y, m, 1).getDay()
  startDow = startDow === 0 ? 6 : startDow - 1
  const daysInMonth = new Date(y, m + 1, 0).getDate()
  const daysInPrev = new Date(y, m, 0).getDate()
  const totalCells = Math.ceil((startDow + daysInMonth) / 7) * 7

  const evByDay: Record<number, CalEvent[]> = {}

  events.forEach(ev => {
    const start = new Date(ev.startTime)
    const end = new Date(ev.endTime)
    const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate())
    const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate())
    const cursor = new Date(startDay)
    while (cursor <= endDay) {
      if (cursor.getFullYear() === y && cursor.getMonth() === m) {
        const day = cursor.getDate()
        if (!evByDay[day]) evByDay[day] = []
        evByDay[day].push(ev)
      }
      cursor.setDate(cursor.getDate() + 1)
    }
  })

  Object.values(evByDay).forEach(dayEvents => {
    dayEvents.sort((a, b) => {
      if (a.allDay !== b.allDay) return a.allDay ? -1 : 1
      return a.startTime - b.startTime
    })
  })

  const changeMonth = (dir: number) => setCurrent(new Date(y, m + dir, 1))

  const handleCreate = async (payload: EventPayload) => {
    try {
      const res = await fetch('http://localhost:3001/events/create', {
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
      const res = await fetch(`http://localhost:3001/events/update/${editEvent.id}`, {
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
      await fetch(`http://localhost:3001/events/delete/${editEvent.id}`, { method: 'POST' })
      setEvents(prev => prev.filter(e => e.id !== editEvent.id))
    } catch(e) { console.error(e) }
    setEditEvent(null)
  }

  const [hoveredBtn, setHoveredBtn] = useState<string | null>(null)

  const hoverProps = (key: string) => ({
    onMouseEnter: () => setHoveredBtn(key),
    onMouseLeave: () => setHoveredBtn(null),
  })

  return (
    <div style={{ fontFamily: 'Google Sans, Roboto, sans-serif', height: '100vh', display: 'flex', flexDirection: 'column', background: '#f6f8fc' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 16px', borderBottom: '1px solid #dadce0', background: '#f6f8fc' }}>
        {/* Today */}
        <button
          onClick={() => setCurrent(new Date())}
          {...hoverProps('today')}
          style={{
            background: hoveredBtn === 'today' ? '#e8eaed' : 'transparent',
            border: '1.5px solid #3c4043',
            borderRadius: 24,
            padding: '10px 22px',
            fontSize: 15,
            fontWeight: 500,
            cursor: 'pointer',
            color: '#3c4043',
            fontFamily: 'inherit',
            marginRight: 8,
            transition: 'background 0.1s',
          }}
        >
          Today
        </button>

        {/* Prev */}
        <button
          onClick={() => changeMonth(-1)}
          {...hoverProps('prev')}
          style={{
            background: hoveredBtn === 'prev' ? '#e8eaed' : 'transparent',
            border: 'none',
            cursor: 'pointer',
            borderRadius: '50%',
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#3c4043',
            transition: 'background 0.1s',
            padding: 0,
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {/* Next */}
        <button
          onClick={() => changeMonth(1)}
          {...hoverProps('next')}
          style={{
            background: hoveredBtn === 'next' ? '#e8eaed' : 'transparent',
            border: 'none',
            cursor: 'pointer',
            borderRadius: '50%',
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#3c4043',
            transition: 'background 0.1s',
            padding: 0,
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        <span style={{ fontSize: 22, fontWeight: 400, color: '#3c4043', marginLeft: 8, flex: 1 }}>{MONTHS[m]} {y}</span>

        {/* Search */}
        <button
          {...hoverProps('search')}
          style={{
            background: hoveredBtn === 'search' ? '#e8eaed' : 'transparent',
            border: 'none',
            cursor: 'pointer',
            borderRadius: '50%',
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#3c4043',
            transition: 'background 0.1s',
          }}
          title="Search"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>
      </div>

      {/* Calendar */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', margin: '12px', borderRadius: 12, border: '1px solid #dadce0', background: '#fff', boxShadow: '0 1px 3px rgba(60,64,67,0.1)' }}>

        {/* Day of week headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #dadce0' }}>
          {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: 12, fontWeight: 500, color: '#70757a', padding: '10px 0', letterSpacing: '0.5px' }}>
              {d.toUpperCase()}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', flex: 1 }}>
          {Array.from({ length: totalCells }, (_, i) => {
            const offset = i - startDow
            const isOther = offset < 0 || offset >= daysInMonth
            const dayNum = offset < 0 ? daysInPrev + offset + 1 : offset >= daysInMonth ? offset - daysInMonth + 1 : offset + 1
            const isToday = !isOther && dayNum === today.getDate() && m === today.getMonth() && y === today.getFullYear()

            return (
              <div
                key={i}
                onClick={() => { if (!isOther) setModalDate(new Date(y, m, dayNum)) }}
                style={{
                  borderRight: '1px solid #dadce0',
                  borderBottom: '1px solid #dadce0',
                  padding: '6px 4px',
                  cursor: isOther ? 'default' : 'pointer',
                  minHeight: 110,
                  background: isOther ? '#fafafa' : '#fff',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
                  <div style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: isOther ? '#c5c5c5' : isToday ? '#fff' : '#3c4043',
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
                {!isOther && (evByDay[dayNum] ?? []).map(ev => {
                  const start = new Date(ev.startTime)
                  const hh = String(start.getHours()).padStart(2, '0')
                  const mm = String(start.getMinutes()).padStart(2, '0')
                  return (
                    <div
                      key={ev.id}
                      onClick={e => { e.stopPropagation(); setEditEvent(ev) }}
                      style={{
                        fontSize: 12,
                        padding: '2px 8px',
                        borderRadius: 12,
                        marginBottom: 2,
                        background: ev.color || '#1a73e8',
                        color: 'white',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        cursor: 'pointer',
                        fontWeight: 500,
                      }}
                    >
                      {ev.allDay ? 'All day' : `${hh}:${mm}`} {ev.title}
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
