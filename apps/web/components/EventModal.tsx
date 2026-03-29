'use client'

import { useState, useEffect, useRef } from 'react'

const TIMEZONES = [
  'Europe/Lisbon', 'Europe/London', 'Europe/Paris',
  'America/New_York', 'America/Los_Angeles', 'Asia/Tokyo', 'UTC'
]

const COLORS: string[] = [
  '#d93025', '#e8a09a', '#f4511e', '#f6bf26', '#33b679', '#0b8043', '#039be5', '#3f51b5', '#7986cb', '#8e24aa', '#616161'
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
  marginBottom: 4,
  display: 'block',
}

const fieldInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #dadce0',
  borderRadius: 8,
  fontSize: 14,
  fontFamily: 'inherit',
  outline: 'none',
  background: '#fff',
  color: '#3c4043',
  boxSizing: 'border-box',
}

const selectStyle: React.CSSProperties = {
  padding: '8px 6px',
  border: '1px solid #dadce0',
  borderRadius: 8,
  fontSize: 12,
  background: '#fff',
  color: '#3c4043',
  outline: 'none',
}

export default function EventModal({ date, event, onClose, onSave, onDelete }: Props) {
  const now = new Date()
  const titleRef = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState(event?.title ?? '')
  const [description, setDescription] = useState(event?.description ?? '')
  const [allDay, setAllDay] = useState(event?.allDay ?? true)
  const [startDt, setStartDt] = useState(
    event ? new Date(event.startTime) : new Date(date.getFullYear(), date.getMonth(), date.getDate(), now.getHours(), 0)
  )
  const [endDt, setEndDt] = useState(
    event ? new Date(event.endTime - 1) : new Date(date.getFullYear(), date.getMonth(), date.getDate(), now.getHours() + 1, 0)
  )
  const [startZone, setStartZone] = useState(event?.startZone ?? 'Europe/Lisbon')
  const [endZone, setEndZone] = useState(event?.endZone ?? 'Europe/Lisbon')
  const [color, setColor] = useState(event?.color ?? COLORS[0])
  const [errors, setErrors] = useState<string[]>([])
  const [hoveredBtn, setHoveredBtn] = useState<string | null>(null)

  const isEditing = !!event

  useEffect(() => { titleRef.current?.focus() }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  useEffect(() => { setErrors([]) }, [title, description, startDt, endDt, allDay])

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
    } else {
      if (isNaN(startDt.getTime())) errs.push('Start date is invalid')
      if (isNaN(endDt.getTime())) errs.push('End date is invalid')
      if (errs.length === 0 && endDt < startDt) errs.push('End date must be on or after start date')
    }

    if (errs.length > 0) { setErrors(errs); return }

    onSave({
      title: trimmedTitle,
      description: trimmedDescription,
      allDay,
      startTime: allDay
        ? new Date(startDt.getFullYear(), startDt.getMonth(), startDt.getDate(), 0, 0, 0, 0).getTime()
        : startDt.getTime(),
      endTime: allDay
        ? new Date(endDt.getFullYear(), endDt.getMonth(), endDt.getDate() + 1, 0, 0, 0, 0).getTime()
        : endDt.getTime(),
      startZone: allDay ? 'UTC' : startZone,
      endZone: allDay ? 'UTC' : endZone,
      color,
    })
    onClose()
  }

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

  const hoverProps = (key: string) => ({
    onMouseEnter: () => setHoveredBtn(key),
    onMouseLeave: () => setHoveredBtn(null),
  })

  const timeInput: React.CSSProperties = {
    width: 56,
    padding: '8px 6px',
    border: '1px solid #dadce0',
    borderRadius: 8,
    fontSize: 14,
    textAlign: 'center',
    background: '#fff',
    color: '#3c4043',
    outline: 'none',
    flexShrink: 0,
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: '#f6f8fc', borderRadius: 24, width: allDay ? 520 : 640, maxWidth: '95vw', boxShadow: '0 8px 32px rgba(60,64,67,0.24)', overflow: 'hidden', transition: 'width 0.15s' }}
      >

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 20px 0' }}>
          <span style={{ fontSize: 18, fontWeight: 500, color: '#3c4043' }}>
            {isEditing ? 'Edit event' : 'New event'}
          </span>
          <button
            onClick={onClose}
            {...hoverProps('close')}
            style={{ background: hoveredBtn === 'close' ? '#e8eaed' : 'transparent', border: 'none', cursor: 'pointer', fontSize: 18, color: '#5f6368', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.1s' }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '12px 24px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Title */}
          <input
            ref={titleRef}
            style={{ width: '100%', padding: '8px 0', border: 'none', borderBottom: '2px solid #1a73e8', borderRadius: 0, fontSize: 26, fontFamily: 'inherit', outline: 'none', background: 'transparent', color: '#3c4043', fontWeight: 400, boxSizing: 'border-box' }}
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Add title"
            maxLength={200}
          />

          {/* Description */}
          <div>
            <label style={labelStyle}>Description</label>
            <textarea
              style={{ ...fieldInputStyle, resize: 'vertical', minHeight: 72 }}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Add description"
              maxLength={4000}
            />
          </div>

          {/* All day */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              id="allday"
              checked={allDay}
              onChange={e => setAllDay(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: '#1a73e8', cursor: 'pointer' }}
            />
            <label htmlFor="allday" style={{ fontSize: 14, cursor: 'pointer', color: '#3c4043' }}>All day</label>
          </div>

          {/* Date / time pickers */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'nowrap' }}>
            {([
              { lbl: 'Start', dt: startDt, setDt: setStartDt, tz: startZone, setTz: setStartZone },
              { lbl: 'End', dt: endDt, setDt: setEndDt, tz: endZone, setTz: setEndZone },
            ] as const).map(({ lbl, dt, setDt, tz, setTz }) => (
              <div key={lbl} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                <label style={labelStyle}>{lbl}</label>
                <input
                  type="date"
                  value={toDateValue(dt)}
                  onChange={e => setDt(prev => updateDate(prev, e.target.value))}
                  style={fieldInputStyle}
                />
                {!allDay && (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'nowrap' }}>
                    <input
                      type="number" min={0} max={23}
                      value={dt.getHours()}
                      onChange={e => setDt(prev => updateHour(prev, Number(e.target.value)))}
                      style={timeInput}
                    />
                    <span style={{ color: '#70757a', fontSize: 16, flexShrink: 0 }}>:</span>
                    <input
                      type="number" min={0} max={59}
                      value={dt.getMinutes()}
                      onChange={e => setDt(prev => updateMinute(prev, Number(e.target.value)))}
                      style={timeInput}
                    />
                    <select
                      value={tz}
                      onChange={e => setTz(e.target.value)}
                      style={{ ...selectStyle, flex: 1, minWidth: 0 }}
                    >
                      {TIMEZONES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Color */}
          <div>
            <label style={labelStyle}>Color</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {COLORS.map(c => (
              <div
                key={c}
                onClick={() => setColor(c)}
                {...hoverProps(`color-${c}`)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: c,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: hoveredBtn === `color-${c}` ? 'scale(1.15)' : 'scale(1)',
                  transition: 'transform 0.1s',
                }}
              >
                {color === c && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
            ))}
            </div>
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <div>
              {errors.map(e => (
                <div key={e} style={{ fontSize: 12, color: '#d93025', marginBottom: 4 }}>• {e}</div>
              ))}
            </div>
          )}

        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 24px 20px' }}>
          <div>
            {isEditing && onDelete && (
              <button
                onClick={onDelete}
                {...hoverProps('delete')}
                style={{ background: hoveredBtn === 'delete' ? '#fce8e6' : 'transparent', border: '1px solid #dadce0', borderRadius: 24, padding: '10px 22px', fontSize: 14, cursor: 'pointer', color: '#d93025', fontFamily: 'inherit', transition: 'background 0.1s' }}
              >
                Delete
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleSave}
              {...hoverProps('save')}
              style={{ background: hoveredBtn === 'save' ? '#1765cc' : '#1a73e8', border: 'none', borderRadius: 24, padding: '10px 28px', fontSize: 14, cursor: 'pointer', color: 'white', fontWeight: 500, fontFamily: 'inherit', transition: 'background 0.1s' }}
            >
              Save
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
