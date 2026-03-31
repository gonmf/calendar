'use client'

import { useState, useRef, useEffect } from 'react'
import RecurrenceModal from './RecurrenceModal'

interface Props {
  startDate: Date
  value: string
  onChange: (rule: string) => void
}

const DAYS_LONG = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const MONTHS_LONG = ['January','February','March','April','May','June','July','August','September','October','November','December']
const NTH = ['first','second','third','fourth','fifth']

const formatDtstart = (d: Date) =>
  `DTSTART:${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}00`

function extractRrule(rule: string): string {
  if (!rule) return ''
  if (rule.includes(';RRULE:')) return rule.split(';RRULE:')[1]!
  if (rule.includes('RRULE:')) return rule.split('RRULE:')[1]!
  return rule
}

function ruleLabel(rule: string, startDate: Date): string {
  if (!rule) return 'Does not repeat'
  const rrule = extractRrule(rule)
  const dow = DAYS_LONG[startDate.getDay()]!
  const nth = NTH[Math.floor((startDate.getDate() - 1) / 7)]!
  const month = MONTHS_LONG[startDate.getMonth()]!
  const day = startDate.getDate()
  const expectedDay = ['SU','MO','TU','WE','TH','FR','SA'][startDate.getDay()]!

  if (rrule === 'FREQ=DAILY') return 'Daily'
  if (rrule === 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR') return 'Every weekday (Monday to Friday)'
  if (rrule === `FREQ=WEEKLY;BYDAY=${expectedDay}`) return `Weekly on ${dow}`
  if (rrule.startsWith('FREQ=WEEKLY')) return 'Custom'
  if (rrule === 'FREQ=MONTHLY' || rrule.startsWith(`FREQ=MONTHLY;BYDAY=${nth.slice(0,2).toUpperCase()}${expectedDay}`)) return `Monthly on the ${nth} ${dow}`
  if (rrule.startsWith('FREQ=MONTHLY')) return 'Custom'
  if (rrule === 'FREQ=YEARLY') return `Annually on ${month} ${day}`
  if (rrule.startsWith('FREQ=YEARLY')) return 'Custom'
  return 'Custom'
}

export default function RecurrencePicker({ startDate, value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const dow = ['SU','MO','TU','WE','TH','FR','SA'][startDate.getDay()]!
  const nth = NTH[Math.floor((startDate.getDate() - 1) / 7)]!
  const dowLong = DAYS_LONG[startDate.getDay()]!
  const monthLong = MONTHS_LONG[startDate.getMonth()]!
  const day = startDate.getDate()

  const options = [
    { label: 'Does not repeat', rule: '' },
    { label: 'Daily', rule: `${formatDtstart(startDate)};RRULE:FREQ=DAILY` },
    { label: `Weekly on ${dowLong}`, rule: `${formatDtstart(startDate)};RRULE:FREQ=WEEKLY;BYDAY=${dow}` },
    { label: `Monthly on the ${nth} ${dowLong}`, rule: `${formatDtstart(startDate)};RRULE:FREQ=MONTHLY;BYDAY=${nth.slice(0, 2).toUpperCase()}${dow}` },
    { label: `Annually on ${monthLong} ${day}`, rule: `${formatDtstart(startDate)};RRULE:FREQ=YEARLY` },
    { label: 'Every weekday (Monday to Friday)', rule: `${formatDtstart(startDate)};RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR` },
    { label: 'Custom...', rule: '__custom__' },
  ]

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <>
      <div ref={ref} style={{ position: 'relative' }}>
        <button
          onClick={() => setOpen(prev => !prev)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#1a73e8', fontFamily: 'inherit', padding: 0, fontWeight: 500 }}
        >
          {ruleLabel(value, startDate)}
        </button>

        {open && (
          <div style={{ position: 'absolute', top: '100%', left: 0, background: '#fff', borderRadius: 8, boxShadow: '0 4px 16px rgba(60,64,67,0.2)', zIndex: 500, minWidth: 280, overflow: 'hidden', border: '1px solid #dadce0', marginTop: 4 }}>
            {options.map(opt => (
              <div
                key={opt.label}
                onClick={() => {
                  if (opt.rule === '__custom__') {
                    setOpen(false)
                    setShowModal(true)
                  } else {
                    onChange(opt.rule)
                    setOpen(false)
                  }
                }}
                style={{
                  padding: '12px 16px',
                  fontSize: 14,
                  color: '#3c4043',
                  cursor: 'pointer',
                  background: extractRrule(value) === extractRrule(opt.rule) ? '#f6f8fc' : '#fff',
                  fontWeight: extractRrule(value) === extractRrule(opt.rule) ? 500 : 400,
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f6f8fc')}
                onMouseLeave={e => (e.currentTarget.style.background = extractRrule(value) === extractRrule(opt.rule) ? '#f6f8fc' : '#fff')}
              >
                {opt.label}
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <RecurrenceModal
          startDate={startDate}
          initialRule={value}
          onClose={() => setShowModal(false)}
          onSave={rule => { onChange(rule); setShowModal(false) }}
        />
      )}
    </>
  )
}
