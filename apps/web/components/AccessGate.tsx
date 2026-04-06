'use client'

import { useEffect, useState } from 'react'

interface CalendarInfo {
  id: string
  name: string
}

interface Props {
  calIds: string[]
  onGranted: (results: CalendarInfo[]) => void
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

const TOKEN_STORE_KEY = 'cal_tokens'

function getStoredToken(calId: string): string | null {
  try {
    const store = JSON.parse(localStorage.getItem(TOKEN_STORE_KEY) ?? '{}')
    return store[calId] ?? null
  } catch { return null }
}

function storeToken(calId: string, token: string) {
  try {
    const store = JSON.parse(localStorage.getItem(TOKEN_STORE_KEY) ?? '{}')
    store[calId] = token
    localStorage.setItem(TOKEN_STORE_KEY, JSON.stringify(store))
  } catch {}
}

function clearToken(calId: string) {
  try {
    const store = JSON.parse(localStorage.getItem(TOKEN_STORE_KEY) ?? '{}')
    delete store[calId]
    localStorage.setItem(TOKEN_STORE_KEY, JSON.stringify(store))
  } catch {}
}

export default function AccessGate({ calIds, onGranted }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [results, setResults] = useState<CalendarInfo[]>([])
  const [currentName, setCurrentName] = useState<string | null>(null)
  const [status, setStatus] = useState<'checking' | 'prompt' | 'not_found'>('checking')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [hoveredBtn, setHoveredBtn] = useState<string | null>(null)

  const currentCalId = calIds[currentIndex]!
  const total = calIds.length

  const hover = (key: string) => ({
    onMouseEnter: () => setHoveredBtn(key),
    onMouseLeave: () => setHoveredBtn(null),
  })

  const attemptAccess = async (calId: string, payload: { password?: string, token?: string }) => {
    const res = await fetch(`http://localhost:3001/calendars/${calId}/access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return res.json()
  }

  const advance = (name: string, token: string) => {
    storeToken(currentCalId, token)
    const newResults = [...results, { id: currentCalId, name }]
    if (currentIndex + 1 === total) {
      onGranted(newResults)
    } else {
      setResults(newResults)
      setCurrentIndex(prev => prev + 1)
      setPassword('')
      setError('')
      setStatus('checking')
    }
  }

  useEffect(() => {
    setStatus('checking')
    setCurrentName(null)
    const check = async () => {
      const token = getStoredToken(currentCalId)
      const json = await attemptAccess(currentCalId, token ? { token } : {})

      if (json.success) {
        advance(json.name, json.token)
      } else if (json.reason === 'password_required' || json.reason === 'invalid_token') {
        clearToken(currentCalId)
        setCurrentName(null)
        setStatus('prompt')
      } else if (json.reason === 'Calendar not found') {
        setStatus('not_found')
      } else {
        setStatus('prompt')
      }
    }
    check()
  }, [currentIndex, currentCalId])

  const handleSubmit = async () => {
    if (!password.trim()) return
    setLoading(true)
    setError('')
    try {
      const json = await attemptAccess(currentCalId, { password })
      if (json.success) {
        advance(json.name, json.token)
      } else if (json.reason === 'wrong_password') {
        setError('Incorrect password.')
      } else {
        setError('Something went wrong. Please try again.')
      }
    } catch {
      setError('Could not reach the server.')
    }
    setLoading(false)
  }

  if (status === 'checking') {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f6f8fc', fontFamily: 'Google Sans, Roboto, sans-serif' }}>
        <div style={{ fontSize: 14, color: '#70757a' }}>Checking access...</div>
      </div>
    )
  }

  if (status === 'not_found') {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f6f8fc', fontFamily: 'Google Sans, Roboto, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
          <div style={{ fontSize: 22, fontWeight: 500, color: '#3c4043', marginBottom: 8 }}>Calendar not found</div>
          <div style={{ fontSize: 14, color: '#70757a', marginBottom: 24 }}>
            The calendar <code style={{ background: '#f1f3f4', padding: '2px 6px', borderRadius: 4 }}>{currentCalId}</code> does not exist.
          </div>
          <a href="/" style={{ fontSize: 14, color: '#1a73e8', textDecoration: 'none' }}>Go home</a>
        </div>
      </div>
    )
  }

  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f6f8fc', fontFamily: 'Google Sans, Roboto, sans-serif' }}>
      <div style={{ background: '#fff', borderRadius: 24, width: 400, maxWidth: '95vw', boxShadow: '0 8px 32px rgba(60,64,67,0.12)', padding: '32px 32px 24px' }}>

        {total > 1 && (
          <div style={{ fontSize: 12, fontWeight: 500, color: '#70757a', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Calendar {currentIndex + 1} of {total}
          </div>
        )}

        <div style={{ fontSize: 22, fontWeight: 500, color: '#3c4043', marginBottom: 6 }}>
          {currentName ?? 'Enter password'}
        </div>
        <div style={{ fontSize: 14, color: '#70757a', marginBottom: 24 }}>
          {total > 1
            ? `This calendar is password protected.`
            : 'This calendar is password protected.'}
        </div>

        <div style={{ marginBottom: 16 }}>
          <input
            autoFocus
            type="password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError('') }}
            onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
            placeholder="Password"
            style={{ ...fieldInputStyle, borderColor: error ? '#d93025' : '#dadce0' }}
          />
          {error && <div style={{ fontSize: 12, color: '#d93025', marginTop: 6 }}>{error}</div>}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={handleSubmit}
            disabled={!password.trim() || loading}
            {...hover('submit')}
            style={{
              background: !password.trim() || loading ? '#a8c7fa' : hoveredBtn === 'submit' ? '#1557b0' : '#1a73e8',
              border: 'none',
              borderRadius: 24,
              padding: '10px 28px',
              fontSize: 14,
              cursor: password.trim() && !loading ? 'pointer' : 'not-allowed',
              color: 'white',
              fontWeight: 500,
              fontFamily: 'inherit',
              transition: 'background 0.1s',
            }}
          >
            {loading ? 'Checking...' : currentIndex + 1 < total ? 'Next' : 'Continue'}
          </button>
        </div>

      </div>
    </div>
  )
}
