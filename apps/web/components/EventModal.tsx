'use client'

import { useState, useEffect } from 'react'

const TIMEZONES = [
  'Europe/Lisbon', 'Europe/London', 'Europe/Paris',
  'America/New_York', 'America/Los_Angeles', 'Asia/Tokyo', 'UTC'
]

const COLORS: string[] = [
  '#1a73e8', '#0f9d58', '#d93025', '#8430ce',
  '#00897b', '#e37400', '#c2185b', '#5c6bc0'
]

export interface CalEvent {
  id: string
  title: string
  description?: string
  allDay: boolean
  startTime: number
  endTime: number
  startZone: string
  endZone: string
  color: string
}

export interface EventPayload {
  title: string
  description: string
  allDay: boolean
  startTime: number
  endTime: number
  startZone: string
  endZone: string
  color: string
}

interface Props {
  date: Date
  event?: CalEvent
  onClose: () => void
  onSave: (event: EventPayload) => void
  onDelete?: () => void
}

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#70757a',
  fontWeight: 500,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  border: '0.5px solid #dadce0',
  borderRadius: 6,
  fontSize: 14,
  fontFamily: 'inherit',
  outline: 'none',
  background: 'white',
  color: '#3c4043',
}

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 6px',
  border: '0.5px solid #dadce0',
  borderRadius: 6,
  fontSize: 12,
  background: 'white',
  color: '#3c4043',
  outline: 'none',
}

export default function EventModal({ date, event, onClose, onSave, onDelete }: Props) {
  const now = new Date()
  const [title, setTitle] = useState(event?.title ?? '')
  const [description, setDescription] = useState(event?.description ?? '')
  const [allDay, setAllDay] = useState(event?.allDay ?? false)
  const [startDt, setStartDt] = useState(
    event ? new Date(event.startTime) : new Date(date.getFullYear(), date.getMonth(), date.getDate(), now.getHours(), 0)
  )
  const [endDt, setEndDt] = useState(
    event ? new Date(event.endTime) : new Date(date.getFullYear(), date.getMonth(), date.getDate(), now.getHours() + 1, 0)
  )
  const [startZone, setStartZone] = useState(event?.startZone ?? 'Europe/Lisbon')
  const [endZone, setEndZone] = useState(event?.endZone ?? 'Europe/Lisbon')
  const [color, setColor] = useState(event?.color ?? COLORS[0])
  const [errors, setErrors] = useState<string[]>([])

  const isEditing = !!event

  const dateLabel = date.toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  useEffect(() => {
    setErrors([])
  }, [title, description, startDt, endDt, allDay])

  const handleSave = () => {
    const trimmedTitle = title.trim()
    const trimmedDescription = description.trim()
    const errs: string[] = []

    if (!trimmedTitle) errs.push('Title is required')
    if (trimmedTitle.length > 200) errs.push('Title must be 200 characters or fewer')
    if (trimmedDescription.length > 4000) errs.push('Description must be 4000 characters or fewer')

    if (!allDay) {
      if (isNaN(startDt.getTime())) errs.push('Start date is invalid')
      if (isNaN(endDt.getTime())) errs.push('End date is invalid')
      if (errs.length === 0 && endDt.getTime() <= startDt.getTime()) errs.push('End must be after start')
    }

    if (errs.length > 0) {
      setErrors(errs)
      return
    }

    onSave({
      title: trimmedTitle,
      description: trimmedDescription,
      allDay,
      startTime: allDay ? new Date(startDt.getFullYear(), startDt.getMonth(), startDt.getDate()).getTime() : startDt.getTime(),
      endTime: allDay ? new Date(endDt.getFullYear(), endDt.getMonth(), endDt.getDate()).getTime() : endDt.getTime(),
      startZone: allDay ? 'UTC' : startZone,
      endZone: allDay ? 'UTC' : endZone,
      color,
    })
    onClose()
  }

  const timeInput = (disabled: boolean): React.CSSProperties => ({
    width: 52,
    padding: '8px 6px',
    border: '0.5px solid #dadce0',
    borderRadius: 6,
    fontSize: 14,
    textAlign: 'center',
    background: 'white',
    color: '#3c4043',
    outline: 'none',
    opacity: disabled ? 0.35 : 1,
  })

  const toDateValue = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  const updateDate = (prev: Date, dateStr: string): Date => {
    const [y, m, d] = dateStr.split('-').map(Number)
    return new Date(y, m - 1, d, prev.getHours(), prev.getMinutes())
  }

  const updateHour = (prev: Date, h: number): Date =>
    new Date(prev.getFullYear(), prev.getMonth(), prev.getDate(), h, prev.getMinutes())

  const updateMinute = (prev: Date, m: number): Date =>
    new Date(prev.getFullYear(), prev.getMonth(), prev.getDate(), prev.getHours(), m)

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.32)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 8, width: 500, maxWidth: '95vw', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 12px', borderBottom: '0.5px solid #e0e0e0' }}>
          <span style={{ fontSize: 13, color: '#70757a' }}>{isEditing ? 'Edit event' : dateLabel}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#70757a', padding: '2px 6px', borderRadius: 4 }}>✕</button>
        </div>

        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={labelStyle}>Title</span>
            <input style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} placeholder="Add title" maxLength={200} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={labelStyle}>Description</span>
            <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 64 }} value={description} onChange={e => setDescription(e.target.value)} placeholder="Add description" maxLength={4000} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" id="allday" checked={allDay} onChange={e => setAllDay(e.target.checked)} style={{ width: 15, height: 15, accentColor: '#1a73e8', cursor: 'pointer' }} />
            <label htmlFor="allday" style={{ fontSize: 13, cursor: 'pointer', color: '#3c4043' }}>All day</label>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            {([
              { lbl: 'Start', dt: startDt, setDt: setStartDt, tz: startZone, setTz: setStartZone },
              { lbl: 'End', dt: endDt, setDt: setEndDt, tz: endZone, setTz: setEndZone },
            ] as const).map(({ lbl, dt, setDt, tz, setTz }) => (
              <div key={lbl} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={labelStyle}>{lbl}</span>
                <input
                  type="date"
                  disabled={allDay}
                  value={toDateValue(dt)}
                  onChange={e => setDt(prev => updateDate(prev, e.target.value))}
                  style={{ ...inputStyle, opacity: allDay ? 0.35 : 1 }}
                />
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <input
                    type="number" min={0} max={23}
                    disabled={allDay}
                    value={dt.getHours()}
                    onChange={e => setDt(prev => updateHour(prev, Number(e.target.value)))}
                    style={timeInput(allDay)}
                  />
                  <span style={{ color: '#70757a', fontSize: 16 }}>:</span>
                  <input
                    type="number" min={0} max={59}
                    disabled={allDay}
                    value={dt.getMinutes()}
                    onChange={e => setDt(prev => updateMinute(prev, Number(e.target.value)))}
                    style={timeInput(allDay)}
                  />
                </div>
                <select
                  disabled={allDay}
                  value={tz}
                  onChange={e => setTz(e.target.value)}
                  style={{ ...selectStyle, opacity: allDay ? 0.35 : 1 }}
                >
                  {TIMEZONES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={labelStyle}>Color</span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {COLORS.map(c => (
                <div
                  key={c}
                  onClick={() => setColor(c)}
                  style={{ width: 26, height: 26, borderRadius: '50%', background: c, cursor: 'pointer', border: color === c ? '2px solid #3c4043' : '2px solid transparent', transition: 'transform 0.1s' }}
                />
              ))}
            </div>
          </div>

        </div>

        {errors.length > 0 && (
          <div style={{ padding: '0 20px 12px' }}>
            {errors.map(e => (
              <div key={e} style={{ fontSize: 12, color: '#d93025', marginBottom: 4 }}>• {e}</div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderTop: '0.5px solid #e0e0e0' }}>
          <div>
            {isEditing && onDelete && (
              <button
                onClick={onDelete}
                style={{ background: 'transparent', border: '0.5px solid #dadce0', borderRadius: 6, padding: '8px 18px', fontSize: 13, cursor: 'pointer', color: '#d93025' }}
              >
                Delete
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={{ background: 'transparent', border: '0.5px solid #dadce0', borderRadius: 6, padding: '8px 18px', fontSize: 13, cursor: 'pointer', color: '#3c4043' }}>Cancel</button>
            <button onClick={handleSave} style={{ background: '#1a73e8', border: 'none', borderRadius: 6, padding: '8px 18px', fontSize: 13, cursor: 'pointer', color: 'white', fontWeight: 500 }}>Save</button>
          </div>
        </div>

      </div>
    </div>
  )
}
