'use client'

import { useEffect, useState } from 'react'
import EventModal, { CalEvent, EventPayload } from '../components/EventModal'

const btnStyle = {
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  borderRadius: '50%',
  width: 32,
  height: 32,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 18,
  color: '#70757a',
}

const todayBtnStyle = {
  background: 'transparent',
  border: '1px solid #dadce0',
  borderRadius: 4,
  padding: '8px 16px',
  fontSize: 14,
  cursor: 'pointer',
  color: '#3c4043',
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

export default function CalendarPage() {
  const [current, setCurrent] = useState(new Date())
  const [events, setEvents] = useState<CalEvent[]>([])
  const [modalDate, setModalDate] = useState<Date | null>(null)
  const [editEvent, setEditEvent] = useState<CalEvent | null>(null)

  useEffect(() => {
    fetch('http://localhost:3001/events/findAll', { method: 'POST' })
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

  return (
    <div style={{ fontFamily: 'Google Sans, sans-serif', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px', borderBottom: '1px solid #e0e0e0' }}>
        <button onClick={() => setCurrent(new Date())} style={todayBtnStyle}>Today</button>
        <button onClick={() => changeMonth(-1)} style={btnStyle}>&#8249;</button>
        <button onClick={() => changeMonth(1)} style={btnStyle}>&#8250;</button>
        <span style={{ fontSize: 20, fontWeight: 400 }}>{MONTHS[m]} {y}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', flex: 1 }}>
        {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 11, color: '#70757a', padding: '8px 0', borderBottom: '1px solid #e0e0e0' }}>{d}</div>
        ))}
        {Array.from({ length: totalCells }, (_, i) => {
          const offset = i - startDow
          const isOther = offset < 0 || offset >= daysInMonth
          const dayNum = offset < 0 ? daysInPrev + offset + 1 : offset >= daysInMonth ? offset - daysInMonth + 1 : offset + 1
          const isToday = !isOther && dayNum === today.getDate() && m === today.getMonth() && y === today.getFullYear()

          return (
            <div
              key={i}
              onClick={() => { if (!isOther) setModalDate(new Date(y, m, dayNum)) }}
              style={{ minHeight: 100, borderRight: '1px solid #e0e0e0', borderBottom: '1px solid #e0e0e0', padding: '4px 2px', cursor: isOther ? 'default' : 'pointer' }}
            >
              <div style={{
                fontSize: 13, color: isOther ? '#ccc' : '#70757a', marginBottom: 4, padding: '0 2px',
                ...(isToday ? { background: '#1a73e8', color: 'white', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 500 } : {})
              }}>{dayNum}</div>
              {!isOther && (evByDay[dayNum] ?? []).map(ev => {
                const start = new Date(ev.startTime)
                const hh = String(start.getHours()).padStart(2, '0')
                const mm = String(start.getMinutes()).padStart(2, '0')
                return (
                  <div
                    key={ev.id}
                    onClick={e => { e.stopPropagation(); setEditEvent(ev) }}
                    style={{ fontSize: 11, padding: '2px 6px', borderRadius: 3, marginBottom: 2, background: ev.color || '#1a73e8', color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }}
                  >
                    {ev.allDay ? 'All day' : `${hh}:${mm}`} {ev.title}
                  </div>
                )
              })}
            </div>
          )
        })}
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
