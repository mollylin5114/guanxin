import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'

const TYPE_CONFIG = {
  projection: { label: '投射',     color: '#92400E', bg: '#FEF3C7', dot: '#F59E0B' },
  real:       { label: '真实感受', color: '#065F46', bg: '#ECFDF5', dot: '#10B981' },
  emotion:    { label: '情绪',     color: '#3730A3', bg: '#EEF2FF', dot: '#6366F1' },
  need:       { label: '内在需要', color: '#7C2D12', bg: '#FFF7ED', dot: '#F97316' },
}

const PROMPT_EXAMPLES = [
  '我总觉得别人不够在乎我，但又不好意思直接说。',
  '最近很容易烦，一点小事就想逃开。',
  '我明明很努力，却还是觉得自己不够好。',
]

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
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(true)
  const [activeId, setActiveId] = useState(null)
  const [reportTime, setReportTime] = useState(null)
  const resultRef = useRef(null)

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('gx_history') || '[]')
      setHistory(saved)
    } catch {}
    // Detect mobile and set sidebar default
    const mq = window.matchMedia('(max-width: 640px)')
    const handleMq = (e) => {
      setIsMobile(e.matches)
      if (!e.matches) setSidebarOpen(true)
      else setSidebarOpen(false)
    }
    setIsMobile(mq.matches)
    setSidebarOpen(!mq.matches)
    mq.addEventListener('change', handleMq)
    // Fetch remaining count on load
    fetch('/api/remaining')
      .then(r => r.json())
      .then(d => { if (d.remaining !== undefined) setRemaining(d.remaining) })
      .catch(() => {})
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
    if (activeId === id) { setResult(null); setText(''); setActiveId(null); setReportTime(null) }
  }

  function loadHistory(entry) {
    setActiveId(entry.id)
    setText(entry.text)
    setResult(entry.result)
    setReportTime(entry.ts)
    setError('')
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
  }

  async function analyze() {
    if (!text.trim() || loading) return
    setLoading(true)
    setResult(null)
    setError('')
    setActiveId(null)
    setReportTime(null)
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
      const ts = Date.now()
      const entry = { id: ts, text: text.trim(), result: data, ts }
      saveHistory(entry)
      setActiveId(entry.id)
      setReportTime(ts)
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
    setReportTime(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function useExample(example) {
    setText(example)
    setResult(null)
    setError('')
    setActiveId(null)
    setReportTime(null)
  }

  return (
    <>
      <Head>
        <title>观心 · 看见自己真正在说什么</title>
        <meta name="description" content="用 AI 帮你分辨话语中的投射、真实感受与内在需要" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🪞</text></svg>" />
      </Head>

      <div className="app">
        {/* ── Sidebar ── */}
        {isMobile && sidebarOpen && (
          <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
        )}
        <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'} ${isMobile ? 'mobile' : ''}`}>
          <div className="sidebar-header">
            {sidebarOpen && <span className="sidebar-title">历史记录</span>}
            <button className="icon-btn" onClick={() => setSidebarOpen(o => !o)} title={sidebarOpen ? '收起' : '展开'}>
              {sidebarOpen ? '←' : '→'}
            </button>
          </div>

          {sidebarOpen && (
            <>
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
              <div className="sidebar-footer">
                <button className="btn-new" onClick={newAnalysis}>＋ 新建</button>
              </div>
            </>
          )}
        </aside>

        {/* ── Main ── */}
        <main className="main">
          {/* Header */}
          <header className="header">
            <div className="header-inner">
              <div className="brand">
                {isMobile && (
                  <button className="hamburger" onClick={() => setSidebarOpen(o => !o)} title="历史记录">
                    ☰
                  </button>
                )}
                <span className="brand-name">观心</span>
                <span className="brand-dot" />
                <span className="brand-sub">看见自己真正在说什么</span>
              </div>
              <span className="quota">今日剩余 {remaining !== null ? remaining : '…'} 次</span>
            </div>
          </header>

          <div className="content">
            <section className="intro">
              <div className="eyebrow">AI 心理投射分析</div>
              <h1>把一句卡在心里的话，慢慢看清楚。</h1>
              <p>
                观心会从投射、真实感受、情绪和内在需要四个角度，帮你整理一段话背后的内心线索。
              </p>
            </section>

            <div className="card input-card">
              <div className="input-head">
                <div>
                  <div className="card-kicker">开始观心</div>
                  <h2>写下你此刻最真实的一段话</h2>
                </div>
                <span className="privacy-note">仅用于本次分析</span>
              </div>
              <textarea
                className="textarea"
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="比如：他总是不在乎我的感受，所有人都觉得我太敏感了，可我只是希望有人能认真听我说完。"
                rows={7}
                disabled={loading}
              />
              <div className="example-row">
                {PROMPT_EXAMPLES.map(example => (
                  <button key={example} className="example-chip" onClick={() => useExample(example)} disabled={loading}>
                    {example}
                  </button>
                ))}
              </div>
              <div className="input-footer">
                <span className="char-count">{text.length} 字 · 建议 30 字以上</span>
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
                <div className="result-hero">
                  <div>
                    <div className="eyebrow">观心报告</div>
                    <h2>这段话里，真正想被看见的部分</h2>
                  </div>
                  {reportTime && <span className="report-meta">{formatTime(reportTime)}</span>}
                </div>

                <div className="card result-section summary-section">
                  <div className="section-label">整体感知</div>
                  <p className="summary-text">{result.summary}</p>
                </div>

                <div className="card result-section">
                  <div className="section-label">逐层分析</div>
                  <div className="items">
                    {result.items.map((item, i) => {
                      const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.emotion
                      return (
                        <div key={i} className="item">
                          <div className="item-top">
                            <span className="item-index">{String(i + 1).padStart(2, '0')}</span>
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
          background:
            radial-gradient(circle at 50% -10%, rgba(220, 211, 190, 0.36), transparent 38%),
            linear-gradient(180deg, #F7F4EE 0%, #F4F5F7 46%, #F8F8F6 100%);
          color: #1E1E1C;
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

        .sidebar-footer {
          padding: 10px 8px 14px;
          border-top: 1px solid rgba(0,0,0,0.06);
          flex-shrink: 0;
        }
        .btn-new {
          width: 100%; padding: 9px; border-radius: 10px;
          font-size: 13px; font-weight: 500; color: #4F46E5;
          background: rgba(99,102,241,0.08);
          border: none; cursor: pointer;
          transition: background 0.15s;
        }
        .btn-new:hover { background: rgba(99,102,241,0.15); }

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
          background: rgba(247,244,238,0.82);
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          border-bottom: 1px solid rgba(71,63,49,0.1);
        }
        .header-inner {
          max-width: 820px; margin: 0 auto;
          height: 56px; padding: 0 2rem;
          display: flex; align-items: center; justify-content: space-between;
        }
        .brand { display: flex; align-items: center; gap: 10px; }
        .brand-name { font-size: 17px; font-weight: 600; letter-spacing: 4px; color: #1D1D1F; }
        .brand-dot { width: 4px; height: 4px; border-radius: 50%; background: #AEAEB2; }
        .brand-sub { font-size: 13px; color: #6E6E73; }
        .hamburger {
          width: 32px; height: 32px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          font-size: 16px; color: #6E6E73;
          background: none; border: none; cursor: pointer;
          margin-right: 4px;
          transition: background 0.15s;
        }
        .hamburger:hover { background: rgba(0,0,0,0.06); }

        .quota {
          font-size: 12px; color: #5D574F;
          background: rgba(255,255,255,0.72); padding: 5px 11px; border-radius: 999px;
          border: 1px solid rgba(71,63,49,0.08);
        }

        /* Content */
        .content {
          max-width: 820px; margin: 0 auto;
          padding: 3.5rem 2rem 6rem;
          width: 100%;
        }

        .intro {
          padding: 18px 2px 24px;
        }
        .eyebrow, .card-kicker {
          font-size: 12px;
          font-weight: 650;
          color: #8B6F3D;
          letter-spacing: 0.08em;
        }
        .intro h1 {
          max-width: 680px;
          margin-top: 10px;
          font-size: 38px;
          line-height: 1.18;
          font-weight: 720;
          color: #1E1E1C;
        }
        .intro p {
          max-width: 640px;
          margin-top: 14px;
          font-size: 16px;
          line-height: 1.9;
          color: #5F5A52;
        }

        /* Card */
        .card {
          background: #FFFFFF;
          border-radius: 16px;
          border: 1px solid rgba(71,63,49,0.1);
          box-shadow: 0 18px 48px rgba(42,37,28,0.08), 0 2px 6px rgba(42,37,28,0.04);
          margin-bottom: 16px;
          overflow: hidden;
        }

        /* Input card */
        .input-card { padding: 24px; }
        .input-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 16px;
        }
        .input-head h2 {
          margin-top: 4px;
          font-size: 20px;
          line-height: 1.35;
          color: #23221F;
        }
        .privacy-note {
          flex-shrink: 0;
          font-size: 12px;
          color: #6D675F;
          background: #F7F2EA;
          border: 1px solid rgba(139,111,61,0.16);
          border-radius: 999px;
          padding: 5px 10px;
        }
        .textarea {
          width: 100%; min-height: 190px; font-size: 16px; line-height: 1.85;
          border: 1px solid rgba(71,63,49,0.13); border-radius: 14px;
          padding: 16px 17px; resize: vertical;
          font-family: inherit; color: #1E1E1C; background: #FBFAF7;
          transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
          outline: none;
        }
        .textarea:focus {
          border-color: #A47B35;
          background: #fff;
          box-shadow: 0 0 0 4px rgba(164,123,53,0.1);
        }
        .textarea::placeholder { color: #B7B1A7; }
        .textarea:disabled { opacity: 0.6; }

        .example-row {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
          margin-top: 12px;
        }
        .example-chip {
          min-height: 46px;
          padding: 9px 10px;
          border-radius: 12px;
          background: #F7F6F2;
          color: #625D55;
          border: 1px solid rgba(71,63,49,0.08);
          font-size: 12px;
          line-height: 1.5;
          text-align: left;
          transition: background 0.15s, border-color 0.15s, color 0.15s;
        }
        .example-chip:hover:not(:disabled) {
          background: #F2ECE0;
          border-color: rgba(139,111,61,0.2);
          color: #3D3933;
        }
        .example-chip:disabled { cursor: not-allowed; opacity: 0.6; }

        .input-footer {
          display: flex; align-items: center; justify-content: space-between;
          margin-top: 16px;
        }
        .char-count { font-size: 12px; color: #918B82; }
        .btn-row { display: flex; gap: 8px; align-items: center; }

        /* Buttons */
        button { font-family: inherit; cursor: pointer; border: none; background: none; }

        .btn-ghost {
          font-size: 14px; color: #625D55;
          padding: 8px 16px; border-radius: 10px;
          border: 1px solid rgba(71,63,49,0.12);
          transition: background 0.15s;
        }
        .btn-ghost:hover { background: rgba(71,63,49,0.05); }

        .btn-primary {
          font-size: 14px; font-weight: 500; color: #fff;
          padding: 10px 24px; border-radius: 10px;
          background: #1F1F1D;
          box-shadow: 0 10px 22px rgba(31,31,29,0.16);
          transition: background 0.15s, transform 0.1s, box-shadow 0.15s;
        }
        .btn-primary:hover:not(.disabled) { background: #3C3428; box-shadow: 0 12px 24px rgba(60,52,40,0.18); }
        .btn-primary:active:not(.disabled) { transform: scale(0.98); }
        .btn-primary.disabled { background: #C8C2B8; cursor: not-allowed; box-shadow: none; }

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
        .result { padding-top: 14px; }
        .result-hero {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 18px;
          padding: 10px 2px 18px;
        }
        .result-hero h2 {
          margin-top: 7px;
          font-size: 26px;
          line-height: 1.28;
          color: #1E1E1C;
        }
        .report-meta {
          flex-shrink: 0;
          color: #8B857B;
          font-size: 12px;
          padding-bottom: 4px;
        }
        .result-section { padding: 22px 24px; }
        .summary-section {
          background: linear-gradient(180deg, #FFFFFF 0%, #FBF8F1 100%);
        }
        .section-label {
          font-size: 11px; font-weight: 650; letter-spacing: 0.12em;
          color: #9A7C43; text-transform: uppercase; margin-bottom: 12px;
        }
        .summary-text {
          font-size: 16px; color: #2E2C28; line-height: 1.95;
        }

        .items { display: flex; flex-direction: column; gap: 12px; }
        .item {
          padding: 16px; border-radius: 14px;
          background: #FAFAF8; border: 1px solid rgba(71,63,49,0.08);
        }
        .item-top { margin-bottom: 9px; display: flex; align-items: center; gap: 8px; }
        .item-index {
          font-size: 11px;
          font-weight: 650;
          color: #AAA399;
          min-width: 22px;
        }
        .item-badge {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 11px; font-weight: 600; padding: 3px 10px 3px 7px;
          border-radius: 20px; letter-spacing: 0.3px;
        }
        .item-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
        .item-quote {
          font-size: 15px; color: #30302D; font-style: italic;
          line-height: 1.75; margin-bottom: 7px;
        }
        .item-explain {
          font-size: 14px; color: #666158; line-height: 1.85;
        }

        .suggestion-card {
          padding: 24px;
          background: #24231F;
          border-color: #24231F;
        }
        .suggestion-card .section-label { color: #D0B987; }
        .suggestion-text {
          font-size: 18px; color: #FFF8E8; line-height: 1.9; font-style: italic;
        }

        .result-actions {
          display: flex; justify-content: center; padding-top: 8px; margin-bottom: 8px;
        }

        /* Mobile */
        .sidebar-overlay {
          display: none;
        }
        @media (max-width: 640px) {
          .sidebar.mobile {
            position: fixed;
            z-index: 30;
            box-shadow: 4px 0 24px rgba(0,0,0,0.12);
          }
          .sidebar.mobile.open { width: 260px; }
          .sidebar.mobile.closed { width: 0; border-right: none; }
          .sidebar-overlay {
            display: block;
            position: fixed; inset: 0; z-index: 25;
            background: rgba(0,0,0,0.3);
            backdrop-filter: blur(2px);
          }
          .main { margin-left: 0 !important; }
          .brand-sub { display: none; }
          .content { padding: 1.5rem 1rem 5rem; }
          .header-inner { padding: 0 1rem; }
          .intro { padding-top: 12px; }
          .intro h1 { font-size: 29px; }
          .intro p { font-size: 14px; }
          .input-card { padding: 18px; }
          .input-head { flex-direction: column; gap: 10px; }
          .privacy-note { align-self: flex-start; }
          .example-row { grid-template-columns: 1fr; }
          .input-footer { align-items: stretch; flex-direction: column; gap: 12px; }
          .btn-row { justify-content: flex-end; }
          .result-hero { align-items: flex-start; flex-direction: column; gap: 8px; }
          .result-hero h2 { font-size: 22px; }
        }
      `}</style>
    </>
  )
}
