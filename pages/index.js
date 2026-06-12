import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'

const TYPE_CONFIG = {
  projection: { label: '投射', color: '#633806', bg: '#FAEEDA', desc: '把内心感受归因到他人' },
  real:       { label: '真实感受', color: '#085041', bg: '#E1F5EE', desc: '正在表达的真实体验' },
  emotion:    { label: '情绪', color: '#26215C', bg: '#EEEDFE', desc: '当下的情绪状态' },
  need:       { label: '内在需要', color: '#4A1B0C', bg: '#FAECE7', desc: '未被满足的深层需要' },
}

function KeySetup({ onSave }) {
  const [key, setKey] = useState('')
  const [error, setError] = useState('')
  const [testing, setTesting] = useState(false)

  async function handleSave() {
    const trimmed = key.trim()
    if (!trimmed.startsWith('sk-ant-')) {
      setError('Key 格式不对，应以 sk-ant- 开头')
      return
    }
    setTesting(true)
    setError('')
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: '测试', apiKey: trimmed }),
      })
      if (res.status === 401) { setError('API Key 无效，请检查后重试'); return }
      if (res.status === 429) { setError('API 配额不足，请检查余额'); return }
      localStorage.setItem('gx_key', trimmed)
      onSave(trimmed)
    } catch {
      setError('网络错误，请稍后重试')
    } finally {
      setTesting(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ width: '100%', maxWidth: 460 }}>
        <div style={{ marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: 32, fontWeight: 600, letterSpacing: 8, color: 'var(--purple-600)', marginBottom: 8 }}>观 心</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>看见自己真正在说什么</p>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '2rem' }}>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.8, marginBottom: '1.5rem' }}>
            观心调用 Anthropic Claude API 进行分析。请填入你自己的 API Key，它只存在你的浏览器里，不会上传到任何服务器。
          </p>

          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ fontSize: 13, color: 'var(--text-faint)', display: 'block', marginBottom: 6 }}>
              Anthropic API Key
            </label>
            <input
              type="password"
              value={key}
              onChange={e => setKey(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder="sk-ant-api03-..."
              style={{
                width: '100%', padding: '10px 14px', fontSize: 14,
                border: '1px solid var(--border-md)', borderRadius: 'var(--radius-sm)',
                background: 'var(--bg)', color: 'var(--text)',
                outline: 'none',
              }}
            />
          </div>

          {error && (
            <p style={{ fontSize: 13, color: '#c0392b', marginBottom: '0.75rem' }}>{error}</p>
          )}

          <button
            onClick={handleSave}
            disabled={!key.trim() || testing}
            style={{
              width: '100%', padding: '11px', fontSize: 15, fontWeight: 500,
              background: key.trim() && !testing ? 'var(--purple-600)' : 'var(--gray-200)',
              color: key.trim() && !testing ? '#fff' : 'var(--text-faint)',
              borderRadius: 'var(--radius-sm)', transition: 'background 0.2s',
              cursor: key.trim() && !testing ? 'pointer' : 'not-allowed',
            }}
          >
            {testing ? '验证中…' : '开始使用'}
          </button>

          <p style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: '1rem', lineHeight: 1.7 }}>
            还没有 API Key？前往{' '}
            <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer"
              style={{ color: 'var(--purple-600)', textDecoration: 'underline' }}>
              console.anthropic.com
            </a>{' '}
            申请，新账号有免费额度。
          </p>
        </div>
      </div>
    </div>
  )
}

function ResultItem({ item }) {
  const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.emotion
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)', padding: '1rem 1.25rem',
      borderLeft: `3px solid ${cfg.bg}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{
          fontSize: 11, fontWeight: 600, padding: '3px 10px',
          borderRadius: 20, background: cfg.bg, color: cfg.color,
          letterSpacing: 0.5,
        }}>
          {cfg.label}
        </span>
      </div>
      <p style={{ fontSize: 14, fontStyle: 'italic', color: 'var(--text)', marginBottom: 6, lineHeight: 1.7 }}>
        「{item.quote}」
      </p>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.8 }}>
        {item.explain}
      </p>
    </div>
  )
}

function MainApp({ apiKey, onClearKey }) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const resultRef = useRef(null)

  async function analyze() {
    if (!text.trim() || loading) return
    setLoading(true)
    setResult(null)
    setError('')
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim(), apiKey }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '分析失败')
      setResult(data)
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const typesSeen = result ? [...new Set(result.items.map(i => i.type))] : []

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'var(--bg)', borderBottom: '1px solid var(--border)',
        padding: '0 1.5rem',
      }}>
        <div style={{ maxWidth: 680, margin: '0 auto', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 18, fontWeight: 600, letterSpacing: 6, color: 'var(--purple-600)' }}>观 心</span>
          <button
            onClick={onClearKey}
            style={{ fontSize: 12, color: 'var(--text-faint)', padding: '4px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}
          >
            更换 Key
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 680, margin: '0 auto', padding: '2rem 1.5rem 6rem' }}>
        {/* Hero line */}
        <div style={{ marginBottom: '2rem' }}>
          <p style={{ fontSize: 15, color: 'var(--text-muted)', lineHeight: 1.9 }}>
            把你想说的、正在烦的、刚刚经历的，用自己的话写下来。<br />
            观心会帮你看见：哪些是<strong style={{ color: '#534AB7', fontWeight: 500 }}>投射</strong>，哪些是<strong style={{ color: '#1D9E75', fontWeight: 500 }}>真实感受</strong>，哪些是<strong style={{ color: '#993C1D', fontWeight: 500 }}>未被满足的需要</strong>。
          </p>
        </div>

        {/* Input */}
        <div style={{ position: 'relative' }}>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="比如：他总是不在乎我的感受，所有人都觉得我太敏感了，我根本不值得被好好对待……"
            rows={6}
            style={{
              width: '100%', padding: '16px', fontSize: 15, lineHeight: 1.8,
              border: '1px solid var(--border-md)', borderRadius: 'var(--radius-md)',
              background: 'var(--surface)', color: 'var(--text)',
              resize: 'vertical', outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--purple-400)'}
            onBlur={e => e.target.style.borderColor = 'var(--border-md)'}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
            <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>{text.length} 字</span>
            <div style={{ display: 'flex', gap: 8 }}>
              {text && (
                <button
                  onClick={() => { setText(''); setResult(null); setError('') }}
                  style={{
                    fontSize: 13, color: 'var(--text-faint)', padding: '8px 16px',
                    border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                  }}
                >
                  清空
                </button>
              )}
              <button
                onClick={analyze}
                disabled={!text.trim() || loading}
                style={{
                  fontSize: 14, fontWeight: 500, padding: '8px 22px',
                  background: text.trim() && !loading ? 'var(--purple-600)' : 'var(--gray-200)',
                  color: text.trim() && !loading ? '#fff' : 'var(--text-faint)',
                  borderRadius: 'var(--radius-sm)', transition: 'background 0.2s',
                  cursor: text.trim() && !loading ? 'pointer' : 'not-allowed',
                }}
              >
                {loading ? '观照中…' : '开始观心'}
              </button>
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '2rem 0', color: 'var(--text-muted)', fontSize: 14 }}>
            <span style={{ display: 'inline-flex', gap: 5 }}>
              {[0, 1, 2].map(i => (
                <span key={i} style={{
                  width: 6, height: 6, borderRadius: '50%', background: 'var(--purple-400)',
                  animation: `pulse 1.2s ${i * 0.2}s infinite ease-in-out`,
                }} />
              ))}
            </span>
            正在照见……
          </div>
        )}

        {/* Error */}
        {error && (
          <p style={{ fontSize: 13, color: '#c0392b', marginTop: '1rem', padding: '12px 16px', background: '#fdf2f2', borderRadius: 'var(--radius-sm)' }}>
            {error}
          </p>
        )}

        {/* Result */}
        {result && (
          <div ref={resultRef} style={{ marginTop: '2rem' }}>
            <div style={{ width: 32, height: 1, background: 'var(--border-md)', margin: '0 0 2rem' }} />

            {/* Summary */}
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: 2, color: 'var(--text-faint)', marginBottom: 10, textTransform: 'uppercase' }}>整体感知</div>
              <p style={{
                fontSize: 15, lineHeight: 1.9, color: 'var(--text)',
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderLeft: '3px solid var(--purple-400)',
                borderRadius: '0 var(--radius-md) var(--radius-md) 0',
                padding: '14px 18px',
              }}>
                {result.summary}
              </p>
            </div>

            {/* Type tags */}
            {typesSeen.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: '2rem' }}>
                {typesSeen.map(t => {
                  const cfg = TYPE_CONFIG[t] || TYPE_CONFIG.emotion
                  return (
                    <span key={t} style={{
                      fontSize: 12, padding: '4px 14px', borderRadius: 20,
                      background: cfg.bg, color: cfg.color, fontWeight: 500,
                    }}>
                      {cfg.label} · {cfg.desc}
                    </span>
                  )
                })}
              </div>
            )}

            {/* Items */}
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: 2, color: 'var(--text-faint)', marginBottom: 10, textTransform: 'uppercase' }}>逐层分析</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {result.items.map((item, i) => <ResultItem key={i} item={item} />)}
              </div>
            </div>

            {/* Suggestion */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: 2, color: 'var(--text-faint)', marginBottom: 10, textTransform: 'uppercase' }}>给自己的一句话</div>
              <p style={{
                fontSize: 16, lineHeight: 1.9, color: 'var(--purple-800)',
                background: 'var(--purple-50)', borderRadius: 'var(--radius-md)',
                padding: '16px 20px', fontStyle: 'italic',
              }}>
                {result.suggestion}
              </p>
            </div>

            {/* Again */}
            <div style={{ marginTop: '3rem', textAlign: 'center' }}>
              <button
                onClick={() => { setText(''); setResult(null); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                style={{
                  fontSize: 13, color: 'var(--text-faint)', padding: '8px 20px',
                  border: '1px solid var(--border)', borderRadius: 20,
                }}
              >
                再写一段
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'var(--bg)', borderTop: '1px solid var(--border)',
        padding: '10px 1.5rem', textAlign: 'center',
        fontSize: 12, color: 'var(--text-faint)',
      }}>
        你的 Key 只存在本地，从不上传 · 每次分析直接调用 Anthropic API
      </footer>

      <style>{`
        @keyframes pulse {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-5px); opacity: 1; }
        }
        textarea:focus { outline: none; }
        button:hover { opacity: 0.88; }
      `}</style>
    </div>
  )
}

export default function Home() {
  const [apiKey, setApiKey] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('gx_key')
    if (saved) setApiKey(saved)
    setReady(true)
  }, [])

  function handleSave(key) { setApiKey(key) }
  function handleClear() { localStorage.removeItem('gx_key'); setApiKey(null) }

  if (!ready) return null

  return (
    <>
      <Head>
        <title>观心 · 看见自己真正在说什么</title>
        <meta name="description" content="用 AI 帮你分辨话语中的投射、真实感受与内在需要" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🪞</text></svg>" />
      </Head>
      {apiKey ? (
        <MainApp apiKey={apiKey} onClearKey={handleClear} />
      ) : (
        <KeySetup onSave={handleSave} />
      )}
    </>
  )
}
