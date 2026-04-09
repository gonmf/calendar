'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const ADJECTIVES = ['swift','brave','calm','dark','bold','wise','bright','sharp','quiet','wild','grand','vast','deep','warm','cool','soft','rough','keen','pure','true','jade','iron','gold','stone','cloud','frost','ember','dawn','dusk','storm']
const NOUNS = ['fox','owl','pine','lake','wolf','hawk','reed','moss','fern','tide','crag','vale','peak','gale','tern','wren','lark','dove','kite','swan','elm','oak','ash','yew','bay','cape','isle','moor','fen','glen']

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

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#70757a',
  fontWeight: 500,
  marginBottom: 6,
  display: 'block',
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
}

const modalStyle: React.CSSProperties = {
  background: '#f6f8fc',
  borderRadius: 24,
  width: 500,
  maxWidth: '95vw',
  boxShadow: '0 8px 32px rgba(60,64,67,0.24)',
  overflow: 'hidden',
}

export default function HomePage() {
  const router = useRouter()
  const [mode, setMode] = useState<'home' | 'create' | 'open'>('home')
  const [phrase, setPhrase] = useState('')
  const [privatePassword, setPrivatePassword] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [openId, setOpenId] = useState('')
  const [hoveredBtn, setHoveredBtn] = useState<string | null>(null)
  const [createError, setCreateError] = useState('')
  const [creating, setCreating] = useState(false)

  const passwordMismatch = privatePassword && password.length > 0 && passwordConfirm.length > 0 && password !== passwordConfirm
  const canCreate = phrase.trim().length > 0 && (!privatePassword || (password.length > 0 && password === passwordConfirm))

  useEffect(() => { setCreateError('') }, [phrase, password, passwordConfirm])

  const hover = (key: string) => ({
    onMouseEnter: () => setHoveredBtn(key),
    onMouseLeave: () => setHoveredBtn(null),
  })

  const closeModal = () => {
    setMode('home')
    setPassword('')
    setPasswordConfirm('')
    setPrivatePassword(false)
    setCreateError('')
  }

  const handleCreate = async () => {
    if (!canCreate) return
    setCreateError('')
    setCreating(true)
    try {
      const res = await fetch('http://localhost:3001/calendars/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: phrase.trim(),
          ...(privatePassword && password ? { password } : {}),
        }),
      })
      const json = await res.json()
      if (json.success) {
        // store the access token so the calendar page doesn't ask for password
        if (json.data.token) {
          try {
            const store = JSON.parse(localStorage.getItem('cal_tokens') ?? '{}')
            store[json.data.id] = json.data.token
            localStorage.setItem('cal_tokens', JSON.stringify(store))
          } catch {}
        }
        router.push(`/cal/${json.data.id}?new=1`)
      } else {
        setCreateError('Something went wrong. Please try again.')
      }
    } catch(e) {
      setCreateError('Could not reach the server. Please try again.')
    }
    setCreating(false)
  }

  const [openError, setOpenError] = useState('')
  const [opening, setOpening] = useState(false)

  const handleOpen = async () => {
    const id = openId.trim()
    if (!id) return
    setOpenError('')
    setOpening(true)
    try {
      const res = await fetch(`http://localhost:3001/calendars/${id}/access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const json = await res.json()
      if (json.success || json.reason === 'password_required') {
        // calendar exists — redirect, access gate on the calendar page will handle password
        router.push(`/cal/${id}`)
      } else {
        setOpenError('Calendar not found.')
      }
    } catch {
      setOpenError('Could not reach the server. Please try again.')
    }
    setOpening(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f6f8fc', fontFamily: 'Google Sans, Roboto, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>

      <div style={{ textAlign: 'center', maxWidth: 480 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>📅</div>
        <h1 style={{ fontSize: 36, fontWeight: 400, color: '#3c4043', margin: '0 0 8px' }}>Your calendars</h1>
        <p style={{ fontSize: 16, color: '#70757a', margin: '0 0 40px', lineHeight: 1.6 }}>Create a new calendar or open an existing one using its ID.</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => setMode('create')}
            {...hover('create-home')}
            style={{ background: hoveredBtn === 'create-home' ? '#1557b0' : '#1a73e8', border: 'none', borderRadius: 24, padding: '12px 28px', fontSize: 15, fontWeight: 500, cursor: 'pointer', color: 'white', fontFamily: 'inherit', transition: 'background 0.15s' }}
          >
            Create new
          </button>
          <button
            onClick={() => setMode('open')}
            {...hover('open-home')}
            style={{ background: hoveredBtn === 'open-home' ? '#f1f3f4' : 'transparent', border: '1px solid #dadce0', borderRadius: 24, padding: '12px 28px', fontSize: 15, fontWeight: 500, cursor: 'pointer', color: '#3c4043', fontFamily: 'inherit', transition: 'background 0.15s' }}
          >
            Open calendar
          </button>
        </div>
      </div>

      {/* Create modal */}
      {mode === 'create' && (
        <div onClick={closeModal} style={overlayStyle}>
          <div onClick={e => e.stopPropagation()} style={modalStyle}>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 20px 0' }}>
              <span style={{ fontSize: 18, fontWeight: 500, color: '#3c4043' }}>New calendar</span>
              <button
                onClick={closeModal}
                {...hover('close-create')}
                style={{ background: hoveredBtn === 'close-create' ? '#e8eaed' : 'transparent', border: 'none', cursor: 'pointer', fontSize: 18, color: '#5f6368', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.1s' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '16px 24px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

              <div>
                <label style={labelStyle}>Give it a name</label>
                <input
                  value={phrase}
                  onChange={e => setPhrase(e.target.value)}
                  placeholder="e.g. wise penguin"
                  style={fieldInputStyle}
                  maxLength={60}
                />
              </div>

              <div>
                <label style={labelStyle}>Privacy</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, color: '#3c4043' }}>
                      <input
                        type="checkbox"
                        checked={privatePassword}
                        onChange={e => { setPrivatePassword(e.target.checked); setPassword(''); setPasswordConfirm('') }}
                        style={{ width: 16, height: 16, accentColor: '#1a73e8', cursor: 'pointer' }}
                      />
                      Make private with a password
                    </label>
                    {privatePassword && (
                      <>
                        <div style={{ display: 'flex', gap: 10, paddingLeft: 26 }}>
                          <div style={{ flex: 1 }}>
                            <input
                              type="password"
                              value={password}
                              onChange={e => setPassword(e.target.value)}
                              placeholder="Enter password"
                              style={fieldInputStyle}
                            />
                          </div>
                          <div style={{ flex: 1 }}>
                            <input
                              type="password"
                              value={passwordConfirm}
                              onChange={e => setPasswordConfirm(e.target.value)}
                              placeholder="Repeat password"
                              style={{ ...fieldInputStyle, borderColor: passwordMismatch ? '#d93025' : '#dadce0' }}
                            />
                          </div>
                        </div>
                        {passwordMismatch && (
                          <div style={{ fontSize: 12, color: '#d93025', paddingLeft: 26 }}>Passwords do not match</div>
                        )}
                      </>
                    )}
                  </div>

                </div>
              </div>

            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 24px 20px' }}>
              <div style={{ fontSize: 12, color: '#d93025' }}>{createError}</div>
              <button
                onClick={handleCreate}
                disabled={!canCreate || creating}
                {...hover('confirm-create')}
                style={{ background: !canCreate || creating ? '#a8c7fa' : hoveredBtn === 'confirm-create' ? '#1557b0' : '#1a73e8', border: 'none', borderRadius: 24, padding: '10px 28px', fontSize: 14, cursor: canCreate && !creating ? 'pointer' : 'not-allowed', color: 'white', fontWeight: 500, fontFamily: 'inherit', transition: 'background 0.1s' }}
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Open modal */}
      {mode === 'open' && (
        <div onClick={closeModal} style={overlayStyle}>
          <div onClick={e => e.stopPropagation()} style={modalStyle}>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 20px 0' }}>
              <span style={{ fontSize: 18, fontWeight: 500, color: '#3c4043' }}>Open calendar</span>
              <button
                onClick={closeModal}
                {...hover('close-open')}
                style={{ background: hoveredBtn === 'close-open' ? '#e8eaed' : 'transparent', border: 'none', cursor: 'pointer', fontSize: 18, color: '#5f6368', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.1s' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '16px 24px 20px' }}>
              <input
                autoFocus
                value={openId}
                onChange={e => setOpenId(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleOpen() }}
                placeholder="Calendar ID"
                style={{ ...fieldInputStyle, fontFamily: 'monospace', fontSize: 15 }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 24px 20px' }}>
              <div style={{ fontSize: 12, color: '#d93025' }}>{openError}</div>
              <button
                onClick={handleOpen}
                disabled={!openId.trim() || opening}
                {...hover('confirm-open')}
                style={{ background: !openId.trim() || opening ? '#a8c7fa' : hoveredBtn === 'confirm-open' ? '#1557b0' : '#1a73e8', border: 'none', borderRadius: 24, padding: '10px 28px', fontSize: 14, cursor: openId.trim() && !opening ? 'pointer' : 'not-allowed', color: 'white', fontWeight: 500, fontFamily: 'inherit', transition: 'background 0.1s' }}
              >
                {opening ? 'Checking...' : 'Open'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}
