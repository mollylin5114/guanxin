import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'

const TYPE_CONFIG = {
  projection: { label: '投射',     color: '#92400E', bg: '#FEF3C7', dot: '#F59E0B' },
  real:       { label: '真实感受', color: '#065F46', bg: '#ECFDF5', dot: '#10B981' },
  emotion:    { label: '情绪',     color: '#3730A3', bg: '#EEF2FF', dot: '#6366F1' },
  need:       { label: '内在需要', color: '#7C2D12', bg: '#FFF7ED', dot: '#F97316' },
}

function formatTime(ts) {
  const d = new Date(ts)
  const mo = d.getMonth() + 1
  const da = d.getDate()
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${mo}/${da} ${h}:${m}`
}

function excerpt(text, len = 28) {
  return text.length > len ? text.slice(0, len) + '…' : text
}

export default function Home() {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [remaining, setRemaining] = useState(null)
  const [history, setHistory] = useState([])
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeId, setActiveId] = useState(null)
  const resultRef = useRef(null)

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('gx_history') || '[]')
      setHistory(saved)
    } catch {}
  }, [])

  function saveHistory(entry) {
    const next = [entry, ...history].slice(0, 30)
    setHistory(next)
    localStorage.setItem('gx_history', JSON.stringify(next))
  }

  function deleteHistory(id, e) {
    e.stopPropagation()
    const next = history.filter(h => h.id !== id)
    setHistory(next)
    localStorage.setItem('gx_history', JSON.stringify(next))
    if (activeId === id) { setResult(null); setText(''); setActiveId(null) }
  }

  function loadHistory(entry) {
    setActiveId(entry.id)
    setText(entry.text)
    setResult(entry.result)
    setError('')
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
  }

  async function analyze() {
    if (!text.trim() || loading) return
    setLoading(true)
    setResult(null)
    setError('')
    setActiveId(null)
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '分析失败')
      setResult(data)
      if (data.remaining !== undefined) setRemaining(data.remaining)
      const entry = { id: Date.now(), text: text.trim(), result: data, ts: Date.now() }
      saveHistory(entry)
      setActiveId(entry.id)
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function newAnalysis() {
    setText('')
    setResult(null)
    setError('')
    setActiveId(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <>
      <Head>
        <title>观心 ·</title>
        <meta name="description" content="我只是一面镜子，帮你分辨话语中的投射、真实感受与内在需要" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🪞</text></svg>" />
      </Head>

      <div className="app">
        {/* ── Sidebar ── */}
        <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
          <div className="sidebar-header">
            {sidebarOpen && <span className="sidebar-title">历史记录</span>}
            <button className="icon-btn" onClick={() => setSidebarOpen(o => !o)} title={sidebarOpen ? '收起' : '展开'}>
              {sidebarOpen ? '←' : '→'}
            </button>
          </div>

          {sidebarOpen && (
            <div className="sidebar-list">
              {history.length === 0 ? (
                <p className="sidebar-empty">暂无记录</p>
              ) : history.map(entry => (
                <div
                  key={entry.id}
                  className={`sidebar-item ${activeId === entry.id ? 'active' : ''}`}
                  onClick={() => loadHistory(entry)}
                >
                  <div className="sidebar-item-text">{excerpt(entry.text)}</div>
                  <div className="sidebar-item-meta">
                    <span>{formatTime(entry.ts)}</span>
                    <button className="delete-btn" onClick={e => deleteHistory(entry.id, e)}>×</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>

        {/* ── Main ── */}
        <main className="main">
          {/* Header */}
          <header className="header">
            <div className="header-inner">
              <div className="brand">
                <span className="brand-name">观心</span>
                <span className="brand-dot" />
                <span className="brand-sub"> </span>
              </div>
              {remaining !== null && (
                <span className="quota">今日剩余 {remaining} 次</span>
              )}
            </div>
          </header>

          <div className="content">
            {/* Input card */}
            <div className="card input-card">
              <p className="input-hint">
                把你想说的、正在烦的、刚刚经历的，用自己的话写下来。
              </p>
              <textarea
                className="textarea"
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="比如：他总是不在乎我的感受，所有人都觉得我太敏感了……"
                rows={5}
                disabled={loading}
              />
              <div className="input-footer">
                <span className="char-count">{text.length} 字</span>
                <div className="btn-row">
                  {(text || result) && (
                    <button className="btn-ghost" onClick={newAnalysis}>清空</button>
                  )}
                  <button
                    className={`btn-primary ${(!text.trim() || loading) ? 'disabled' : ''}`}
                    onClick={analyze}
                    disabled={!text.trim() || loading}
                  >
                    {loading ? (
                      <span className="loading-inner">
                        <span className="spinner" /> 观照中
                      </span>
                    ) : '开始观心'}
                  </button>
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="error-card">{error}</div>
            )}

            {/* Result */}
            {result && (
              <div ref={resultRef} className="result">
                {/* Summary */}
                <div className="card result-section">
                  <div className="section-label">整体感知</div>
                  <p className="summary-text">{result.summary}</p>
                </div>

                {/* Items */}
                <div className="card result-section">
                  <div className="section-label">逐层分析</div>
                  <div className="items">
                    {result.items.map((item, i) => {
                      const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.emotion
                      return (
                        <div key={i} className="item">
                          <div className="item-top">
                            <span className="item-badge" style={{ background: cfg.bg, color: cfg.color }}>
                              <span className="item-dot" style={{ background: cfg.dot }} />
                              {cfg.label}
                            </span>
                          </div>
                          <p className="item-quote">「{item.quote}」</p>
                          <p className="item-explain">{item.explain}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Suggestion */}
                <div className="card suggestion-card">
                  <div className="section-label">给自己的一句话</div>
                  <p className="suggestion-text">{result.suggestion}</p>
                </div>

                <div className="result-actions">
                  <button className="btn-ghost" onClick={newAnalysis}>再写一段</button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          font-family: -apple-system, 'SF Pro Text', 'PingFang SC', 'Hiragino Sans GB', sans-serif;
          background: #F5F5F7;
          color: #1D1D1F;
          line-height: 1.6;
        }

        .app {
          display: flex;
          min-height: 100vh;
        }

        /* ── Sidebar ── */
        .sidebar {
          position: fixed; top: 0; left: 0; bottom: 0; z-index: 20;
          background: rgba(255,255,255,0.85);
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          border-right: 1px solid rgba(0,0,0,0.08);
          display: flex; flex-direction: column;
          transition: width 0.3s cubic-bezier(0.4,0,0.2,1);
          overflow: hidden;
        }
        .sidebar.open { width: 240px; }
        .sidebar.closed { width: 48px; }

        .sidebar-header {
          height: 56px;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 12px;
          border-bottom: 1px solid rgba(0,0,0,0.06);
          flex-shrink: 0;
        }
        .sidebar-title {
          font-size: 13px; font-weight: 600; color: #1D1D1F; letter-spacing: 0.2px;
        }
        .icon-btn {
          width: 28px; height: 28px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; color: #6E6E73; cursor: pointer;
          background: none; border: none;
          transition: background 0.15s;
        }
        .icon-btn:hover { background: rgba(0,0,0,0.06); }

        .sidebar-list {
          flex: 1; overflow-y: auto; padding: 8px 6px;
        }
        .sidebar-list::-webkit-scrollbar { width: 4px; }
        .sidebar-list::-webkit-scrollbar-track { background: transparent; }
        .sidebar-list::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.12); border-radius: 4px; }

        .sidebar-empty {
          font-size: 13px; color: #AEAEB2; text-align: center; padding: 24px 0;
        }

        .sidebar-item {
          padding: 10px 10px 8px;
          border-radius: 10px; cursor: pointer;
          transition: background 0.15s;
          margin-bottom: 2px;
        }
        .sidebar-item:hover { background: rgba(0,0,0,0.04); }
        .sidebar-item.active { background: rgba(99,102,241,0.08); }

        .sidebar-item-text {
          font-size: 13px; color: #1D1D1F; line-height: 1.5;
          margin-bottom: 4px;
          word-break: break-all;
        }
        .sidebar-item.active .sidebar-item-text { color: #4F46E5; }

        .sidebar-item-meta {
          display: flex; align-items: center; justify-content: space-between;
        }
        .sidebar-item-meta span {
          font-size: 11px; color: #AEAEB2;
        }
        .delete-btn {
          font-size: 15px; color: #AEAEB2; background: none; border: none;
          cursor: pointer; padding: 0 2px; line-height: 1;
          opacity: 0; transition: opacity 0.15s;
        }
        .sidebar-item:hover .delete-btn { opacity: 1; }
        .delete-btn:hover { color: #FF3B30; }

        /* ── Main ── */
        .main {
          flex: 1;
          margin-left: 240px;
          transition: margin-left 0.3s cubic-bezier(0.4,0,0.2,1);
          min-height: 100vh;
          display: flex; flex-direction: column;
        }
        .sidebar.closed ~ .main { margin-left: 48px; }

        /* Header */
        .header {
          position: sticky; top: 0; z-index: 10;
          background: rgba(245,245,247,0.85);
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          border-bottom: 1px solid rgba(0,0,0,0.08);
        }
        .header-inner {
          max-width: 720px; margin: 0 auto;
          height: 56px; padding: 0 2rem;
          display: flex; align-items: center; justify-content: space-between;
        }
        .brand { display: flex; align-items: center; gap: 10px; }
        .brand-name { font-size: 17px; font-weight: 600; letter-spacing: 4px; color: #1D1D1F; }
        .brand-dot { width: 4px; height: 4px; border-radius: 50%; background: #AEAEB2; }
        .brand-sub { font-size: 13px; color: #6E6E73; }
        .quota {
          font-size: 12px; color: #6E6E73;
          background: rgba(0,0,0,0.05); padding: 4px 10px; border-radius: 20px;
        }

        /* Content */
        .content {
          max-width: 720px; margin: 0 auto;
          padding: 2rem 2rem 6rem;
          width: 100%;
        }

        /* Card */
        .card {
          background: #FFFFFF;
          border-radius: 18px;
          border: 1px solid rgba(0,0,0,0.06);
          box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04);
          margin-bottom: 16px;
          overflow: hidden;
        }

        /* Input card */
        .input-card { padding: 20px 22px 16px; }
        .input-hint {
          font-size: 14px; color: #6E6E73; line-height: 1.8; margin-bottom: 14px;
        }
        .textarea {
          width: 100%; font-size: 15px; line-height: 1.8;
          border: 1px solid rgba(0,0,0,0.1); border-radius: 12px;
          padding: 13px 15px; resize: vertical;
          font-family: inherit; color: #1D1D1F; background: #FAFAFA;
          transition: border-color 0.2s, background 0.2s;
          outline: none;
        }
        .textarea:focus { border-color: #6366F1; background: #fff; }
        .textarea::placeholder { color: #C7C7CC; }
        .textarea:disabled { opacity: 0.6; }

        .input-footer {
          display: flex; align-items: center; justify-content: space-between;
          margin-top: 12px;
        }
        .char-count { font-size: 12px; color: #AEAEB2; }
        .btn-row { display: flex; gap: 8px; align-items: center; }

        /* Buttons */
        button { font-family: inherit; cursor: pointer; border: none; background: none; }

        .btn-ghost {
          font-size: 14px; color: #6E6E73;
          padding: 8px 16px; border-radius: 10px;
          border: 1px solid rgba(0,0,0,0.1);
          transition: background 0.15s;
        }
        .btn-ghost:hover { background: rgba(0,0,0,0.04); }

        .btn-primary {
          font-size: 14px; font-weight: 500; color: #fff;
          padding: 9px 22px; border-radius: 10px;
          background: #4F46E5;
          transition: background 0.15s, transform 0.1s;
        }
        .btn-primary:hover:not(.disabled) { background: #4338CA; }
        .btn-primary:active:not(.disabled) { transform: scale(0.98); }
        .btn-primary.disabled { background: #C7C7CC; cursor: not-allowed; }

        .loading-inner { display: flex; align-items: center; gap: 7px; }
        .spinner {
          width: 13px; height: 13px; border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          animation: spin 0.7s linear infinite;
          display: inline-block;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Error */
        .error-card {
          background: #FFF2F2; border: 1px solid #FFD0D0;
          border-radius: 14px; padding: 14px 18px;
          font-size: 14px; color: #C0392B; margin-bottom: 16px;
        }

        /* Result */
        .result-section { padding: 20px 22px; }
        .section-label {
          font-size: 11px; font-weight: 600; letter-spacing: 1.5px;
          color: #AEAEB2; text-transform: uppercase; margin-bottom: 12px;
        }
        .summary-text {
          font-size: 15px; color: #1D1D1F; line-height: 1.9;
        }

        .items { display: flex; flex-direction: column; gap: 14px; }
        .item {
          padding: 14px 16px; border-radius: 12px;
          background: #FAFAFA; border: 1px solid rgba(0,0,0,0.05);
        }
        .item-top { margin-bottom: 8px; }
        .item-badge {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 11px; font-weight: 600; padding: 3px 10px 3px 7px;
          border-radius: 20px; letter-spacing: 0.3px;
        }
        .item-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
        .item-quote {
          font-size: 14px; color: #3A3A3C; font-style: italic;
          line-height: 1.7; margin-bottom: 6px;
        }
        .item-explain {
          font-size: 13px; color: #6E6E73; line-height: 1.8;
        }

        .suggestion-card { padding: 20px 22px; }
        .suggestion-text {
          font-size: 16px; color: #4F46E5; line-height: 1.9; font-style: italic;
        }

        .result-actions {
          display: flex; justify-content: center; padding-top: 8px; margin-bottom: 8px;
        }

        /* Mobile */
        @media (max-width: 640px) {
          .sidebar.open { width: 200px; }
          .main { margin-left: 200px; }
          .sidebar.closed ~ .main { margin-left: 48px; }
          .brand-sub { display: none; }
          .content { padding: 1.25rem 1rem 5rem; }
        }
      `}</style>
    </>
  )
}
