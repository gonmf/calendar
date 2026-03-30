'use client'

import { useState } from 'react'

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const DAY_KEYS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']
const FREQ_OPTIONS = ['day', 'week', 'month', 'year']

interface Props {
  startDate: Date
  onClose: () => void
  onSave: (rule: string) => void
}

const formatDtstart = (d: Date) =>
  `DTSTART:${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}00`

export default function RecurrenceModal({ startDate, onClose, onSave }: Props) {
  const [interval, setInterval] = useState(1)
  const [freq, setFreq] = useState<'day' | 'week' | 'month' | 'year'>('week')
  const [selectedDays, setSelectedDays] = useState<string[]>([DAY_KEYS[startDate.getDay() === 0 ? 6 : startDate.getDay() - 1]!])
  const [endsMode, setEndsMode] = useState<'never' | 'on' | 'after'>('never')
  const [endDate, setEndDate] = useState(new Date(startDate.getFullYear(), startDate.getMonth() + 3, startDate.getDate()))
  const [count, setCount] = useState(13)

  const toggleDay = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day) ? (prev.length > 1 ? prev.filter(d => d !== day) : prev) : [...prev, day]
    )
  }

  const toDateValue = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  const buildRule = () => {
    const freqMap = { day: 'DAILY', week: 'WEEKLY', month: 'MONTHLY', year: 'YEARLY' }

    let rrule = `FREQ=${freqMap[freq]}`
    if (interval > 1) rrule += `;INTERVAL=${interval}`
    if (freq === 'week' && selectedDays.length > 0) rrule += `;BYDAY=${selectedDays.join(',')}`
    if (endsMode === 'on') {
      const y = endDate.getFullYear()
      const mo = String(endDate.getMonth() + 1).padStart(2, '0')
      const day = String(endDate.getDate()).padStart(2, '0')
      rrule += `;UNTIL=${y}${mo}${day}T000000`
    }
    if (endsMode === 'after') rrule += `;COUNT=${count}`

    return `${formatDtstart(startDate)};RRULE:${rrule}`
  }

  const fieldInput: React.CSSProperties = {
    padding: '8px 10px',
    border: '1px solid #dadce0',
    borderRadius: 8,
    fontSize: 14,
    fontFamily: 'inherit',
    outline: 'none',
    background: '#fff',
    color: '#3c4043',
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#f6f8fc', borderRadius: 24, width: 460, maxWidth: '95vw', boxShadow: '0 8px 32px rgba(60,64,67,0.24)', padding: '28px 28px 20px' }}>

        <div style={{ fontSize: 20, fontWeight: 500, color: '#3c4043', marginBottom: 24 }}>Custom recurrence</div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <span style={{ fontSize: 14, color: '#3c4043' }}>Repeat every</span>
          <input
            type="number" min={1} max={99}
            value={interval}
            onChange={e => setInterval(Math.max(1, Number(e.target.value)))}
            style={{ ...fieldInput, width: 64, textAlign: 'center' }}
          />
          <select
            value={freq}
            onChange={e => setFreq(e.target.value as typeof freq)}
            style={{ ...fieldInput, cursor: 'pointer' }}
          >
            {FREQ_OPTIONS.map(f => <option key={f} value={f}>{f}{interval > 1 ? 's' : ''}</option>)}
          </select>
        </div>

        {freq === 'week' && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, color: '#70757a', marginBottom: 10 }}>Repeat on</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {DAYS.map((d, i) => {
                const key = DAY_KEYS[i]!
                const active = selectedDays.includes(key)
                return (
                  <div
                    key={i}
                    onClick={() => toggleDay(key)}
                    style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: active ? '#1a73e8' : '#e8eaed',
                      color: active ? '#fff' : '#3c4043',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 500, cursor: 'pointer',
                      transition: 'background 0.1s',
                    }}
                  >
                    {d}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, color: '#70757a', marginBottom: 10 }}>Ends</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(['never', 'on', 'after'] as const).map(mode => (
              <div key={mode} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  onClick={() => setEndsMode(mode)}
                  style={{
                    width: 20, height: 20, borderRadius: '50%',
                    border: `2px solid ${endsMode === mode ? '#1a73e8' : '#dadce0'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', flexShrink: 0,
                  }}
                >
                  {endsMode === mode && <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#1a73e8' }} />}
                </div>
                <span style={{ fontSize: 14, color: '#3c4043', width: 48 }}>
                  {mode === 'never' ? 'Never' : mode === 'on' ? 'On' : 'After'}
                </span>
                {mode === 'on' && (
                  <input
                    type="date"
                    value={toDateValue(endDate)}
                    onChange={e => {
                      const [y, m, d] = e.target.value.split('-').map(Number)
                      setEndDate(new Date(y, m - 1, d))
                    }}
                    disabled={endsMode !== 'on'}
                    style={{ ...fieldInput, opacity: endsMode === 'on' ? 1 : 0.4 }}
                  />
                )}
                {mode === 'after' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="number" min={1} max={999}
                      value={count}
                      onChange={e => setCount(Math.max(1, Number(e.target.value)))}
                      disabled={endsMode !== 'after'}
                      style={{ ...fieldInput, width: 72, textAlign: 'center', opacity: endsMode === 'after' ? 1 : 0.4 }}
                    />
                    <span style={{ fontSize: 14, color: '#70757a', opacity: endsMode === 'after' ? 1 : 0.4 }}>occurrences</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', borderRadius: 24, padding: '10px 22px', fontSize: 14, cursor: 'pointer', color: '#1a73e8', fontFamily: 'inherit', fontWeight: 500 }}
          >
            Cancel
          </button>
          <button
            onClick={() => { onSave(buildRule()); onClose() }}
            style={{ background: '#1a73e8', border: 'none', borderRadius: 24, padding: '10px 22px', fontSize: 14, cursor: 'pointer', color: 'white', fontWeight: 500, fontFamily: 'inherit' }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
