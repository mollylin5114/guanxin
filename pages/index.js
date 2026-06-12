import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'

const TYPE_CONFIG = {
  projection: { label: '可能被忽略的角度', tone: 'amber', icon: '⌕' },
  real: { label: '你真正关注的', tone: 'violet', icon: '◉' },
  emotion: { label: '核心主题', tone: 'orange', icon: '✧' },
  need: { label: '你此刻的需要', tone: 'green', icon: '♧' },
}

const NAV_ITEMS = [
  { icon: '✎', label: '写一篇' },
  { icon: '▧', label: '日记本' },
  { icon: '⌁', label: '成长轨迹' },
  { icon: '♡', label: '今日洞见' },
  { icon: '☆', label: '收藏' },
  { icon: '♙', label: '我的' },
]

const STARTERS = [
  { icon: '◎', text: '我一直在纠结...' },
  { icon: '☁', text: '我总是放不下...' },
  { icon: '♡', text: '我好像在害怕...' },
  { icon: '?', text: '我越来越怀疑...' },
]

const PROMPT_EXAMPLES = [
  '我明明已经很努力了，却还是觉得自己不够好。',
  '我很想有个好朋友，但总觉得跟人靠近很难。',
  '最近发生了一件事，我一直放不下。',
]

function formatTime(ts) {
  const d = new Date(ts)
  const mo = d.getMonth() + 1
  const da = d.getDate()
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${mo}/${da} ${h}:${m}`
}

function excerpt(text, len = 32) {
  return text.length > len ? text.slice(0, len) + '…' : text
}

function findItem(result, type, fallbackIndex = 0) {
  return result?.items?.find(item => item.type === type) || result?.items?.[fallbackIndex] || null
}

function compactTitle(item, fallback) {
  const raw = item?.quote?.replace(/[“”"「」]/g, '').trim()
  if (!raw) return fallback
  if (raw.length <= 8) return raw
  return fallback
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

    const mq = window.matchMedia('(max-width: 780px)')
    const handleMq = (e) => {
      setIsMobile(e.matches)
      setSidebarOpen(!e.matches)
    }

    setIsMobile(mq.matches)
    setSidebarOpen(!mq.matches)
    mq.addEventListener('change', handleMq)

    fetch('/api/remaining')
      .then(r => r.json())
      .then(d => { if (d.remaining !== undefined) setRemaining(d.remaining) })
      .catch(() => {})

    return () => mq.removeEventListener('change', handleMq)
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
    if (activeId === id) {
      setResult(null)
      setText('')
      setActiveId(null)
      setReportTime(null)
    }
  }

  function loadHistory(entry) {
    setActiveId(entry.id)
    setText(entry.text)
    setResult(entry.result)
    setReportTime(entry.ts)
    setError('')
    if (isMobile) setSidebarOpen(false)
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

      const ts = Date.now()
      const entry = { id: ts, text: text.trim(), result: data, ts }

      setResult(data)
      setReportTime(ts)
      setActiveId(entry.id)
      if (data.remaining !== undefined) setRemaining(data.remaining)
      saveHistory(entry)
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

  const themeItem = result ? findItem(result, 'emotion', 0) : null
  const realItem = result ? findItem(result, 'real', 1) : null
  const needItem = result ? findItem(result, 'need', 2) : null
  const projectionItem = result ? findItem(result, 'projection', 3) : null

  return (
    <>
      <Head>
        <title>观心 · 看见自己真正在说什么</title>
        <meta name="description" content="用 AI 帮你分辨话语中的投射、真实感受与内在需要" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="app">
        {isMobile && sidebarOpen && <button className="overlay" onClick={() => setSidebarOpen(false)} aria-label="关闭导航" />}

        <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
          <div className="brand-panel">
            <button className="brand-mark" onClick={newAnalysis}>观心</button>
            <p>看见自己真正正在说什么</p>
          </div>

          <nav className="nav-list">
            {NAV_ITEMS.map((item, index) => (
              <button
                key={item.label}
                className={`nav-item ${index === 0 ? 'active' : ''}`}
                onClick={index === 0 ? newAnalysis : undefined}
              >
                <span>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>

          <div className="history-block">
            <div className="history-head">
              <span>历史记录</span>
              <button>全部 ›</button>
            </div>
            <div className="history-list">
              {history.length === 0 ? (
                <p className="empty-history">暂无记录</p>
              ) : history.slice(0, 6).map(entry => (
                <button
                  key={entry.id}
                  className={`history-item ${activeId === entry.id ? 'active' : ''}`}
                  onClick={() => loadHistory(entry)}
                >
                  <span>{excerpt(entry.text)}</span>
                  <small>{formatTime(entry.ts)}</small>
                  <i onClick={e => deleteHistory(entry.id, e)}>×</i>
                </button>
              ))}
            </div>
          </div>

          <div className="sidebar-note">
            <p>每一次书写<br />都是一次看见自己的机会</p>
            <div className="leaf-art" />
          </div>
        </aside>

        <main className="main">
          <header className="topbar">
            {isMobile && (
              <button className="mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="打开导航">☰</button>
            )}
            <div className="top-spacer" />
            <button className="save-btn">存入日记</button>
            <button className="more-btn" aria-label="更多">•••</button>
          </header>

          {!result ? (
            <section className="home-page">
              <div className="ambient" />
              <div className="hero-copy">
                <h1>把一句卡在心里的话，<br />慢慢看清楚。</h1>
                <p>写下此刻最真实的一段话。<br />观心会帮你整理那些还没来得及看清的部分。</p>
              </div>

              <section className="write-card">
                <textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder="在这里写下你此刻最想说的话..."
                  disabled={loading}
                  maxLength={1000}
                />
                {!text && (
                  <div className="example-box">
                    <div className="example-title">✐ 比如：</div>
                    <ul>
                      {PROMPT_EXAMPLES.map(example => <li key={example}>{example}</li>)}
                    </ul>
                  </div>
                )}
                <div className="write-count">{text.length}/1000</div>
              </section>

              <div className="write-meta">
                <span>▣ 想到什么就写什么，不需要组织语言。</span>
                <span>建议 20 字以上，效果更好。</span>
              </div>

              {error && <div className="error-card">{error}</div>}

              <button className="primary-cta" onClick={analyze} disabled={!text.trim() || loading}>
                {loading ? '正在看见自己...' : '看看自己  →'}
              </button>

              <section className="starter-section">
                <div className="divider-title"><span />不知道从哪里开始？试试这些<span /></div>
                <div className="starter-grid">
                  {STARTERS.map((starter, index) => (
                    <button key={starter.text} onClick={() => useExample(PROMPT_EXAMPLES[index % PROMPT_EXAMPLES.length])}>
                      <b>{starter.icon}</b>
                      <span>{starter.text}</span>
                    </button>
                  ))}
                </div>
              </section>

              <p className="privacy-line">▣ 内容仅对你可见，安全守护你的表达</p>
            </section>
          ) : (
            <section ref={resultRef} className="report-page">
              <div className="report-head">
                <button onClick={newAnalysis}>←</button>
                <span>观心报告</span>
              </div>

              <div className="quote-card">
                <div className="quote-mark">“</div>
                <p>{text}</p>
                {reportTime && <time>{formatTime(reportTime)}</time>}
              </div>

              <h1 className="report-title">这段话里，<br />真正想被看见的部分</h1>

              <div className="report-grid">
                <article className="report-card theme-card">
                  <CardLabel item={themeItem} fallback="核心主题" />
                  <h2>{compactTitle(themeItem, '认可')}</h2>
                  <p>{themeItem?.explain || result.summary}</p>
                  <div className="mountain warm" />
                </article>

                <article className="report-card focus-card">
                  <CardLabel item={realItem} fallback="你真正关注的" />
                  <blockquote>“{realItem?.quote || excerpt(text, 42)}”</blockquote>
                  <p>{realItem?.explain || result.summary}</p>
                  <div className="mountain violet" />
                </article>

                <article className="report-card need-card">
                  <CardLabel item={needItem} fallback="你此刻的需要" />
                  <h2>{compactTitle(needItem, '确定感')}</h2>
                  <p>{needItem?.explain || result.summary}</p>
                  <div className="mountain green" />
                </article>

                <article className="report-card blind-card">
                  <CardLabel item={projectionItem} fallback="可能被忽略的角度" />
                  <p>{projectionItem?.explain || result.summary}</p>
                  <div className="small-path" />
                </article>

                <article className="report-card insight-card">
                  <CardLabel fallback="一句洞见" icon="✧" />
                  <h2>{result.summary}</h2>
                  <div className="wide-mountain" />
                </article>

                <article className="report-card suggestion-card">
                  <CardLabel fallback="给自己的一句话" icon="♡" />
                  <p>{result.suggestion}</p>
                  <div className="window-mark" />
                </article>
              </div>

              <button className="again-btn" onClick={newAnalysis}>↻ 再写一段</button>
              <p className="privacy-line">▣ 内容仅对你可见，安全守护你的表达</p>
            </section>
          )}
        </main>
      </div>

      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        body {
          margin: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
          color: #332b23;
          background: #fbf8f2;
        }
        button, textarea { font: inherit; }
        button { cursor: pointer; border: 0; }
        .app {
          min-height: 100vh;
          display: flex;
          background:
            radial-gradient(circle at 72% 8%, rgba(230, 206, 168, 0.28), transparent 28%),
            linear-gradient(110deg, #f7efe4 0%, #fffdf9 36%, #f8efe4 100%);
        }
        .sidebar {
          width: 276px;
          flex: 0 0 276px;
          min-height: 100vh;
          padding: 34px 22px 24px;
          border-right: 1px solid rgba(121, 88, 54, 0.13);
          background: rgba(250, 244, 235, 0.72);
          backdrop-filter: blur(18px);
          display: flex;
          flex-direction: column;
          gap: 28px;
          position: sticky;
          top: 0;
        }
        .brand-mark {
          padding: 0;
          background: transparent;
          color: #2c241f;
          font-family: 'Songti SC', 'STSong', 'SimSun', serif;
          font-size: 32px;
          font-weight: 800;
          letter-spacing: 0.03em;
        }
        .brand-panel p {
          margin: 8px 0 0;
          color: #84776a;
          font-size: 14px;
        }
        .nav-list { display: grid; gap: 10px; }
        .nav-item {
          height: 54px;
          padding: 0 18px;
          border-radius: 15px;
          background: transparent;
          color: #3d352d;
          display: flex;
          align-items: center;
          gap: 16px;
          text-align: left;
          font-size: 16px;
        }
        .nav-item span { width: 20px; color: #65462d; font-size: 18px; }
        .nav-item.active,
        .nav-item:hover { background: #efe1cf; }
        .history-block { min-height: 0; }
        .history-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          color: #614b37;
          font-size: 14px;
        }
        .history-head button {
          background: transparent;
          color: #9c8d7e;
          font-size: 12px;
        }
        .history-list {
          display: grid;
          gap: 9px;
          max-height: 360px;
          overflow: auto;
          padding-right: 2px;
        }
        .history-item {
          position: relative;
          width: 100%;
          padding: 13px 28px 12px 13px;
          border-radius: 13px;
          background: transparent;
          color: #4e4237;
          text-align: left;
        }
        .history-item.active,
        .history-item:hover { background: rgba(236, 222, 202, 0.74); }
        .history-item span {
          display: block;
          font-size: 13px;
          line-height: 1.55;
        }
        .history-item small {
          display: block;
          margin-top: 4px;
          color: #9a8b7e;
          font-size: 12px;
        }
        .history-item i {
          position: absolute;
          top: 9px;
          right: 10px;
          opacity: 0;
          font-style: normal;
          color: #9a7c5e;
        }
        .history-item:hover i { opacity: 1; }
        .empty-history {
          margin: 0;
          padding: 18px 8px;
          color: #a99a8b;
          font-size: 13px;
        }
        .sidebar-note {
          margin-top: auto;
          min-height: 170px;
          padding: 24px 18px;
          border-radius: 16px;
          border: 1px solid rgba(158, 125, 83, 0.16);
          background: linear-gradient(145deg, rgba(255,255,255,0.78), rgba(244,235,222,0.68));
          overflow: hidden;
          position: relative;
        }
        .sidebar-note p {
          position: relative;
          z-index: 1;
          margin: 0;
          color: #6e5f51;
          line-height: 1.85;
          font-size: 14px;
        }
        .leaf-art {
          position: absolute;
          width: 96px;
          height: 120px;
          right: 14px;
          bottom: 0;
          opacity: 0.45;
          background:
            radial-gradient(ellipse at 55% 26%, transparent 42%, rgba(180,148,101,0.45) 43%, transparent 45%),
            linear-gradient(75deg, transparent 48%, rgba(150,115,75,0.44) 49%, transparent 51%);
        }
        .main {
          flex: 1;
          min-width: 0;
          padding: 30px 38px 46px;
          position: relative;
        }
        .topbar {
          height: 42px;
          display: flex;
          align-items: center;
          gap: 18px;
          margin-bottom: 28px;
        }
        .top-spacer { flex: 1; }
        .mobile-menu, .save-btn, .more-btn {
          background: rgba(255,255,255,0.68);
          color: #6a4d33;
          border: 1px solid rgba(137,101,62,0.18);
          border-radius: 13px;
        }
        .mobile-menu { display: none; width: 40px; height: 40px; }
        .save-btn {
          height: 38px;
          padding: 0 18px;
          font-size: 14px;
        }
        .more-btn {
          width: 42px;
          height: 38px;
          border-color: transparent;
          background: transparent;
          letter-spacing: 0.14em;
          font-weight: 700;
        }
        .home-page, .report-page {
          max-width: 1060px;
          margin: 0 auto;
          position: relative;
        }
        .ambient {
          position: absolute;
          top: 0;
          right: -26px;
          width: min(56vw, 720px);
          height: 390px;
          background:
            linear-gradient(90deg, rgba(255,253,249,0.94) 0%, rgba(255,253,249,0.38) 44%, rgba(255,253,249,0) 100%),
            url('/images/guanxin-window-bg.png') center right / cover no-repeat;
          border-radius: 26px;
          opacity: 0.86;
          pointer-events: none;
          mask-image: linear-gradient(90deg, transparent 0%, #000 20%, #000 84%, transparent 100%);
        }
        .hero-copy {
          position: relative;
          z-index: 1;
          padding: 70px 0 44px 30px;
        }
        .hero-copy h1, .report-title {
          margin: 0;
          color: #2f2821;
          font-family: 'Songti SC', 'STSong', 'SimSun', serif;
          font-size: clamp(42px, 4.2vw, 60px);
          line-height: 1.45;
          letter-spacing: 0.02em;
          font-weight: 800;
        }
        .hero-copy p {
          margin: 26px 0 0;
          color: #74685c;
          font-size: 20px;
          line-height: 1.9;
        }
        .write-card {
          position: relative;
          z-index: 1;
          min-height: 380px;
          padding: 30px 34px 48px;
          border: 1px solid rgba(131, 98, 61, 0.18);
          border-radius: 18px;
          background: rgba(255,255,255,0.72);
          box-shadow: 0 22px 60px rgba(90,65,38,0.08);
        }
        .write-card textarea {
          width: 100%;
          min-height: 108px;
          resize: vertical;
          border: 0;
          outline: 0;
          background: transparent;
          color: #352e27;
          font-size: 18px;
          line-height: 1.8;
        }
        .write-card textarea::placeholder { color: #a99d91; }
        .example-box {
          width: min(100%, 520px);
          margin-top: 34px;
          padding: 22px 26px;
          border-radius: 13px;
          border: 1px solid rgba(143,104,63,0.17);
          background: rgba(250,246,239,0.78);
          color: #7a6d61;
        }
        .example-title {
          margin-bottom: 10px;
          color: #795a3b;
          font-size: 15px;
        }
        .example-box ul {
          margin: 0;
          padding-left: 18px;
          display: grid;
          gap: 10px;
          font-size: 14px;
          line-height: 1.75;
        }
        .write-count {
          position: absolute;
          right: 28px;
          bottom: 24px;
          color: #8f8275;
          font-size: 14px;
        }
        .write-meta {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          margin: 22px 8px 34px;
          color: #918579;
          font-size: 14px;
        }
        .error-card {
          margin: -14px 0 22px;
          padding: 14px 18px;
          border: 1px solid #eec9bd;
          border-radius: 14px;
          background: #fff5f0;
          color: #b25a40;
        }
        .primary-cta {
          width: 100%;
          height: 78px;
          border-radius: 18px;
          background: linear-gradient(135deg, #6c4d2e, #3a2818);
          color: #fffaf2;
          box-shadow: 0 16px 34px rgba(64,43,24,0.28);
          font-family: 'Songti SC', 'STSong', 'SimSun', serif;
          font-size: 28px;
          letter-spacing: 0.08em;
        }
        .primary-cta:disabled {
          cursor: not-allowed;
          opacity: 0.52;
          box-shadow: none;
        }
        .starter-section {
          margin-top: 54px;
          text-align: center;
        }
        .divider-title {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          color: #a19486;
          font-size: 15px;
        }
        .divider-title span {
          width: 44px;
          height: 1px;
          background: #e5d8c8;
        }
        .starter-grid {
          margin-top: 22px;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 18px;
        }
        .starter-grid button {
          min-height: 128px;
          padding: 22px 16px;
          border: 1px solid rgba(151,111,68,0.18);
          border-radius: 13px;
          background: rgba(255,255,255,0.58);
          color: #594536;
        }
        .starter-grid b {
          display: block;
          margin-bottom: 18px;
          color: #aa8d67;
          font-size: 28px;
          font-weight: 400;
        }
        .starter-grid span {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 16px;
        }
        .privacy-line {
          margin: 36px 0 0;
          text-align: center;
          color: #aaa096;
          font-size: 14px;
        }
        .report-head {
          display: flex;
          align-items: center;
          gap: 16px;
          margin: 0 0 24px;
          color: #684728;
          font-size: 18px;
          font-weight: 650;
        }
        .report-head button {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: transparent;
          color: #684728;
          font-size: 22px;
        }
        .quote-card {
          position: relative;
          display: flex;
          gap: 20px;
          align-items: flex-start;
          min-height: 112px;
          padding: 22px 28px;
          border: 1px solid rgba(132,96,59,0.16);
          border-radius: 16px;
          background: rgba(255,255,255,0.72);
          box-shadow: 0 18px 48px rgba(68,47,28,0.06);
        }
        .quote-mark {
          width: 48px;
          height: 48px;
          display: grid;
          place-items: center;
          border: 1px solid #eadfce;
          border-radius: 50%;
          color: #a57948;
          font-family: Georgia, serif;
          font-size: 42px;
          line-height: 1;
          flex: 0 0 auto;
        }
        .quote-card p {
          margin: 0;
          max-width: 720px;
          color: #2e2924;
          font-size: 18px;
          line-height: 1.58;
          font-weight: 650;
        }
        .quote-card time {
          margin-left: auto;
          color: #9a8c7d;
          font-size: 14px;
          white-space: nowrap;
        }
        .report-title {
          margin: 30px 0 22px 10px;
          font-size: clamp(34px, 3vw, 44px);
          line-height: 1.22;
        }
        .report-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
        }
        .report-card {
          position: relative;
          min-width: 0;
          min-height: 206px;
          padding: 22px 24px;
          border: 1px solid rgba(132,96,59,0.15);
          border-radius: 16px;
          background: rgba(255,255,255,0.68);
          overflow: hidden;
          box-shadow: 0 18px 42px rgba(68,47,28,0.05);
        }
        .report-card h2 {
          position: relative;
          z-index: 1;
          margin: 18px 0 14px;
          color: #2c251f;
          font-family: 'Songti SC', 'STSong', 'SimSun', serif;
          font-size: clamp(28px, 2vw, 34px);
          line-height: 1.18;
          letter-spacing: 0;
          overflow-wrap: anywhere;
        }
        .report-card p,
        .report-card blockquote {
          position: relative;
          z-index: 1;
          margin: 0;
          color: #4d443b;
          font-size: 15px;
          line-height: 1.72;
          overflow-wrap: anywhere;
        }
        .theme-card p,
        .focus-card p,
        .need-card p,
        .blind-card p {
          display: -webkit-box;
          -webkit-line-clamp: 5;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .focus-card blockquote {
          color: #4d3eb0;
          font-family: 'Songti SC', 'STSong', 'SimSun', serif;
          font-size: clamp(19px, 1.3vw, 22px);
          font-weight: 800;
          line-height: 1.46;
          margin: 18px 0 14px;
          letter-spacing: 0;
          overflow-wrap: anywhere;
        }
        .card-label {
          position: relative;
          z-index: 1;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          color: #8d5a23;
          font-size: 14px;
          font-weight: 700;
        }
        .card-label i {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: #fff2de;
          color: #f09a2a;
          font-style: normal;
          font-size: 18px;
        }
        .tone-violet .card-label { color: #4d3eb0; }
        .tone-violet .card-label i { background: #efedff; color: #7565dd; }
        .tone-green .card-label { color: #2f7a4d; }
        .tone-green .card-label i { background: #e6f3e9; color: #3f9a65; }
        .tone-amber .card-label { color: #bf6b25; }
        .insight-card {
          grid-column: span 2;
          min-height: 176px;
          background: linear-gradient(135deg, rgba(255,248,238,0.88), rgba(255,255,255,0.72));
        }
        .insight-card h2 {
          max-width: 700px;
          font-size: clamp(24px, 1.7vw, 29px);
          line-height: 1.42;
        }
        .suggestion-card {
          grid-column: 1 / -1;
          min-height: 150px;
          padding-right: 300px;
        }
        .suggestion-card p {
          max-width: 640px;
          padding-left: 24px;
        }
        .mountain,
        .wide-mountain,
        .small-path,
        .window-mark {
          position: absolute;
          pointer-events: none;
          opacity: 0.42;
        }
        .mountain {
          width: 180px;
          height: 90px;
          right: 0;
          bottom: 0;
          background: radial-gradient(circle at 32% 0%, rgba(246,190,103,0.5), transparent 30%),
            linear-gradient(140deg, transparent 45%, rgba(222,193,150,0.5) 46%, transparent 70%);
          clip-path: polygon(0 100%, 35% 28%, 52% 68%, 70% 36%, 100% 100%);
        }
        .mountain.violet { background: linear-gradient(140deg, transparent 45%, rgba(170,158,230,0.45) 46%, transparent 70%); }
        .mountain.green { background: linear-gradient(140deg, transparent 45%, rgba(158,205,172,0.45) 46%, transparent 70%); }
        .wide-mountain {
          right: 20px;
          bottom: 0;
          width: 310px;
          height: 120px;
          background: url('/images/guanxin-window-bg.png') center / cover no-repeat;
          opacity: 0.22;
          border-radius: 30px;
        }
        .small-path {
          right: 20px;
          bottom: 22px;
          width: 100px;
          height: 80px;
          background: radial-gradient(circle at 50% 12%, #d7b082 0 7px, transparent 8px),
            linear-gradient(135deg, transparent 48%, rgba(180,139,91,0.4) 49%, transparent 51%);
        }
        .window-mark {
          right: 0;
          top: 0;
          width: 360px;
          height: 180px;
          background: url('/images/guanxin-window-bg.png') center / cover no-repeat;
          opacity: 0.24;
        }
        .again-btn {
          display: block;
          margin: 30px auto 0;
          height: 48px;
          padding: 0 54px;
          border: 1px solid rgba(139,95,52,0.22);
          border-radius: 999px;
          background: #fbf4ea;
          color: #7b5432;
          font-size: 16px;
        }
        .overlay { display: none; }

        @media (max-width: 1080px) {
          .sidebar {
            width: 244px;
            flex-basis: 244px;
          }
          .main { padding: 24px; }
          .report-grid { grid-template-columns: 1fr 1fr; }
          .need-card, .suggestion-card { grid-column: 1 / -1; }
          .quote-card { padding: 20px 24px; }
          .report-card h2 { font-size: 30px; }
          .insight-card h2 { font-size: 26px; }
          .suggestion-card { padding-right: 240px; }
        }

        @media (max-width: 780px) {
          .app { display: block; }
          .sidebar {
            position: fixed;
            z-index: 30;
            inset: 0 auto 0 0;
            width: min(82vw, 300px);
            transform: translateX(-105%);
            transition: transform 0.22s ease;
            box-shadow: 18px 0 46px rgba(65,45,25,0.16);
          }
          .sidebar.open { transform: translateX(0); }
          .overlay {
            display: block;
            position: fixed;
            z-index: 25;
            inset: 0;
            width: 100%;
            height: 100%;
            background: rgba(45,34,25,0.22);
          }
          .main {
            padding: 18px 16px 36px;
          }
          .topbar {
            position: sticky;
            top: 0;
            z-index: 12;
            margin: -18px -16px 10px;
            padding: 12px 16px;
            height: 64px;
            background: rgba(251,248,242,0.82);
            backdrop-filter: blur(16px);
          }
          .mobile-menu { display: block; }
          .save-btn { height: 36px; padding: 0 14px; }
          .more-btn { width: 34px; }
          .ambient {
            width: 100%;
            height: 230px;
            right: 0;
            opacity: 0.48;
            mask-image: linear-gradient(180deg, #000 0%, transparent 100%);
          }
          .hero-copy {
            padding: 46px 2px 28px;
          }
          .hero-copy h1, .report-title {
            font-size: 36px;
            line-height: 1.35;
          }
          .hero-copy p {
            margin-top: 18px;
            font-size: 16px;
          }
          .write-card {
            min-height: 330px;
            padding: 22px 18px 44px;
            border-radius: 16px;
          }
          .write-card textarea {
            min-height: 132px;
            font-size: 16px;
          }
          .example-box {
            margin-top: 20px;
            padding: 16px 18px;
          }
          .write-meta {
            display: grid;
            margin: 16px 2px 24px;
            font-size: 13px;
          }
          .primary-cta {
            height: 60px;
            border-radius: 15px;
            font-size: 22px;
          }
          .starter-section { margin-top: 38px; }
          .starter-grid {
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }
          .starter-grid button {
            min-height: 104px;
            padding: 18px 12px;
          }
          .quote-card {
            display: block;
            min-height: 0;
            padding: 20px 18px;
          }
          .quote-mark {
            width: 42px;
            height: 42px;
            margin-bottom: 12px;
            font-size: 38px;
          }
          .quote-card p { font-size: 16px; }
          .quote-card time {
            display: block;
            margin-top: 12px;
          }
          .report-title { margin-left: 0; }
          .report-grid { grid-template-columns: 1fr; }
          .insight-card, .suggestion-card { grid-column: auto; }
          .report-card {
            min-height: auto;
            padding: 20px;
          }
          .report-card h2 {
            font-size: 28px;
          }
          .focus-card blockquote {
            font-size: 19px;
          }
          .insight-card h2 {
            font-size: 22px;
          }
          .suggestion-card {
            padding-right: 22px;
            padding-bottom: 110px;
          }
          .suggestion-card p {
            padding-left: 0;
          }
          .window-mark {
            width: 230px;
            height: 110px;
            top: auto;
            bottom: 0;
          }
        }
      `}</style>
    </>
  )
}

function CardLabel({ item, fallback, icon }) {
  const type = item?.type
  const config = TYPE_CONFIG[type] || {}
  const tone = config.tone || 'amber'
  return (
    <div className={`tone-${tone}`}>
      <div className="card-label">
        <i>{icon || config.icon || '✧'}</i>
        <span>{config.label || fallback}</span>
      </div>
    </div>
  )
}
