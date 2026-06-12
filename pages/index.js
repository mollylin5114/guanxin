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

const PERSPECTIVE_PROFILES = [
  {
    name: '庄子',
    avatar: 'zhuangzi',
    fallback: '你关注的是对方的矛盾，还是自己对矛盾的不舒服？',
  },
  {
    name: '苏轼',
    avatar: 'sushi',
    fallback: '也许可以先把这件事放回风里。人有不安，也可以仍然看见一点明亮。',
  },
  {
    name: '王阳明',
    avatar: 'wangyangming',
    fallback: '先回到此刻这颗心。你已经知道哪里不安，也知道哪里需要照见。',
  },
  {
    name: '蒋勋',
    avatar: 'jiangxun',
    fallback: '也许这份不舒服里，有一部分是在提醒你珍惜自己的感受。',
  },
  {
    name: '克里希那穆提',
    avatar: 'krishnamurti',
    fallback: '观察那个想寻找答案的自己。不要急着解决它。',
  },
  {
    name: '王菲',
    avatar: 'wangfei',
    fallback: '她可能不会急着判断，而是先允许自己保留疑惑，感受这件事真实的样子。',
  },
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
  if (raw.length <= 5) return raw
  return fallback
}

function getPerspectives(result) {
  const fromAi = Array.isArray(result?.perspectives) ? result.perspectives : []
  return PERSPECTIVE_PROFILES.map(profile => {
    const matched = fromAi.find(item => item?.avatar === profile.avatar || item?.name === profile.name)
    const content = matched?.content?.trim()
    return {
      ...profile,
      content: content || profile.fallback,
    }
  })
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
  const [showSoon, setShowSoon] = useState(false)
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
  const perspectives = result ? getPerspectives(result) : []

  return (
    <>
      <Head>
        <title>观心 · 照见自己</title>
        <meta name="description" content="用 AI 帮你分辨话语中的投射、真实感受与内在需要" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="app">
        {isMobile && sidebarOpen && <button className="overlay" onClick={() => setSidebarOpen(false)} aria-label="关闭导航" />}

        <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
          <div className="brand-panel">
            <button className="brand-mark" onClick={newAnalysis}>观心</button>
            <p>照见自己</p>
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
            <div className="quota-pill">今日剩余 {remaining !== null ? remaining : '…'} 次</div>
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
                  <h2>{compactTitle(needItem, '连接感')}</h2>
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

              <section className="perspective-section">
                <div className="perspective-head">
                  <div>
                    <h2>换个视角看看</h2>
                    <p>同一件事，<br />不同的人会看到不同的部分。</p>
                  </div>
                </div>
                <div className="perspective-list">
                  {perspectives.map(item => (
                    <article className="perspective-card" key={item.avatar}>
                      <div className="perspective-person">
                        <img className="avatar" src={`/images/perspectives/${item.avatar}.png`} alt={`${item.name}头像`} />
                        <h3>{item.name}</h3>
                      </div>
                      <p>{item.content}</p>
                    </article>
                  ))}
                  <button className="perspective-card more-perspective" onClick={() => setShowSoon(true)}>
                    <div className="more-dots" aria-hidden="true">
                      <span />
                      <span />
                      <span />
                      <span />
                    </div>
                    <h3>更多视角</h3>
                    <p>解锁更多人物视角<br />看见不同的可能</p>
                  </button>
                </div>
              </section>

              <button className="again-btn" onClick={newAnalysis}>↻ 再写一段</button>
              <p className="privacy-line">▣ 内容仅对你可见，安全守护你的表达</p>
            </section>
          )}
        </main>
      </div>

      {showSoon && (
        <div className="soon-layer" role="dialog" aria-modal="true" onClick={() => setShowSoon(false)}>
          <div className="soon-dialog" onClick={e => e.stopPropagation()}>
            <h2>即将上线</h2>
            <p>更多人物视角还在整理中。</p>
            <button onClick={() => setShowSoon(false)}>知道了</button>
          </div>
        </div>
      )}

      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        body {
          margin: 0;
          font-family: 'Microsoft YaHei', '微软雅黑', -apple-system, BlinkMacSystemFont, sans-serif;
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
          max-height: 100vh;
          padding: 34px 22px 20px;
          border-right: 1px solid rgba(121, 88, 54, 0.13);
          background: rgba(250, 244, 235, 0.72);
          backdrop-filter: blur(18px);
          display: flex;
          flex-direction: column;
          gap: 24px;
          position: sticky;
          top: 0;
          overflow: hidden;
        }
        .brand-mark {
          padding: 0;
          background: transparent;
          color: #2c241f;
          font-family: 'Microsoft YaHei', '微软雅黑', sans-serif;
          font-size: 32px;
          font-weight: 700;
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
        .history-block {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
        }
        .history-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          color: #614b37;
          font-size: 14px;
        }
        .history-list {
          display: grid;
          align-content: start;
          gap: 9px;
          flex: 1;
          min-height: 0;
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
          overflow-wrap: anywhere;
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
          flex: 0 0 auto;
          min-height: 132px;
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
        .mobile-menu, .quota-pill {
          background: rgba(255,255,255,0.68);
          color: #6a4d33;
          border: 1px solid rgba(137,101,62,0.18);
          border-radius: 13px;
        }
        .mobile-menu { display: none; width: 40px; height: 40px; }
        .quota-pill {
          display: inline-flex;
          align-items: center;
          height: 38px;
          padding: 0 16px;
          font-size: 14px;
          white-space: nowrap;
        }
        .home-page, .report-page {
          max-width: 1060px;
          margin: 0 auto;
          position: relative;
        }
        .report-page {
          max-width: 1120px;
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
          padding: 58px 0 34px 30px;
        }
        .hero-copy h1, .report-title {
          margin: 0;
          color: #2f2821;
          font-family: 'Microsoft YaHei', '微软雅黑', sans-serif;
          font-size: clamp(38px, 3.7vw, 54px);
          line-height: 1.45;
          letter-spacing: 0.02em;
          font-weight: 700;
        }
        .hero-copy p {
          margin: 20px 0 0;
          color: #74685c;
          font-size: 18px;
          line-height: 1.8;
        }
        .write-card {
          position: relative;
          z-index: 1;
          min-height: 230px;
          padding: 24px 28px 44px;
          border: 1px solid rgba(131, 98, 61, 0.18);
          border-radius: 18px;
          background: rgba(255,255,255,0.72);
          box-shadow: 0 22px 60px rgba(90,65,38,0.08);
        }
        .write-card textarea {
          width: 100%;
          min-height: 150px;
          resize: vertical;
          border: 0;
          outline: 0;
          background: transparent;
          color: #352e27;
          font-size: 17px;
          line-height: 1.7;
        }
        .write-card textarea::placeholder { color: #a99d91; }
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
          margin: 16px 8px 28px;
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
          height: 64px;
          border-radius: 18px;
          background: linear-gradient(135deg, #6c4d2e, #3a2818);
          color: #fffaf2;
          box-shadow: 0 16px 34px rgba(64,43,24,0.28);
          font-family: 'Microsoft YaHei', '微软雅黑', sans-serif;
          font-size: 24px;
          letter-spacing: 0.08em;
        }
        .primary-cta:disabled {
          cursor: not-allowed;
          opacity: 0.52;
          box-shadow: none;
        }
        .starter-section {
          margin-top: 44px;
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
          min-height: 110px;
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
          margin: 28px 0 0;
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
          font-size: 17px;
          font-weight: 600;
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
          min-height: 92px;
          padding: 18px 24px;
          border: 1px solid rgba(132,96,59,0.16);
          border-radius: 16px;
          background: rgba(255,255,255,0.72);
          box-shadow: 0 18px 48px rgba(68,47,28,0.06);
        }
        .quote-mark {
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          border: 1px solid #eadfce;
          border-radius: 50%;
          color: #a57948;
          font-family: 'Microsoft YaHei', '微软雅黑', sans-serif;
          font-size: 30px;
          line-height: 1;
          flex: 0 0 auto;
        }
        .quote-card p {
          margin: 0;
          max-width: 720px;
          color: #2e2924;
          font-size: 15px;
          line-height: 1.65;
          font-weight: 500;
        }
        .quote-card time {
          margin-left: auto;
          color: #9a8c7d;
          font-size: 13px;
          white-space: nowrap;
        }
        .report-title {
          margin: 24px 0 18px 4px;
          font-size: clamp(26px, 1.9vw, 32px);
          line-height: 1.32;
          font-weight: 600;
        }
        .report-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
        }
        .report-card {
          position: relative;
          min-width: 0;
          height: 214px;
          min-height: 0;
          padding: 18px 20px 20px;
          border: 1px solid rgba(132,96,59,0.15);
          border-radius: 16px;
          background: rgba(255,255,255,0.68);
          overflow: hidden;
          box-shadow: 0 18px 42px rgba(68,47,28,0.05);
        }
        .report-card h2 {
          position: relative;
          z-index: 1;
          margin: 14px 0 10px;
          color: #2c251f;
          font-family: 'Microsoft YaHei', '微软雅黑', sans-serif;
          font-size: clamp(19px, 1.28vw, 23px);
          line-height: 1.32;
          letter-spacing: 0;
          font-weight: 600;
          overflow-wrap: anywhere;
        }
        .report-card p,
        .report-card blockquote {
          position: relative;
          z-index: 1;
          margin: 0;
          color: #4d443b;
          font-size: 13px;
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
          font-family: 'Microsoft YaHei', '微软雅黑', sans-serif;
          font-size: clamp(14px, 0.94vw, 16px);
          font-weight: 600;
          line-height: 1.6;
          margin: 14px 0 10px;
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
          font-size: 12px;
          font-weight: 600;
        }
        .card-label i {
          width: 28px;
          height: 28px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: #fff2de;
          color: #f09a2a;
          font-style: normal;
          font-size: 15px;
        }
        .tone-violet .card-label { color: #4d3eb0; }
        .tone-violet .card-label i { background: #efedff; color: #7565dd; }
        .tone-green .card-label { color: #2f7a4d; }
        .tone-green .card-label i { background: #e6f3e9; color: #3f9a65; }
        .tone-amber .card-label { color: #bf6b25; }
        .insight-card {
          grid-column: span 2;
          height: 148px;
          min-height: 0;
          background: linear-gradient(135deg, rgba(255,248,238,0.88), rgba(255,255,255,0.72));
        }
        .insight-card h2 {
          max-width: 760px;
          margin-top: 14px;
          font-size: clamp(16px, 1vw, 18px);
          line-height: 1.65;
          font-weight: 500;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .suggestion-card {
          grid-column: 1 / -1;
          height: 128px;
          min-height: 0;
          padding-right: 300px;
        }
        .suggestion-card p {
          max-width: 640px;
          padding-left: 24px;
          font-size: 13px;
          line-height: 1.72;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .perspective-section {
          margin-top: 30px;
        }
        .perspective-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 20px;
          margin-bottom: 16px;
        }
        .perspective-head h2 {
          margin: 0;
          color: #302820;
          font-size: 19px;
          line-height: 1.3;
          font-weight: 600;
        }
        .perspective-head p {
          margin: 6px 0 0;
          color: #8a7c6d;
          font-size: 13px;
          line-height: 1.65;
        }
        .perspective-list {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
        }
        .perspective-card {
          min-width: 0;
          min-height: 150px;
          padding: 16px 16px 15px;
          border: 1px solid rgba(132,96,59,0.14);
          border-radius: 15px;
          background:
            linear-gradient(145deg, rgba(255,255,255,0.82), rgba(251,246,238,0.76));
          box-shadow: 0 14px 34px rgba(68,47,28,0.045);
          color: #3d332b;
          text-align: left;
          overflow: hidden;
        }
        .perspective-person {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 14px;
        }
        .perspective-card h3 {
          margin: 0;
          color: #3f342b;
          font-size: 14px;
          line-height: 1.35;
          font-weight: 600;
        }
        .perspective-card p {
          margin: 0;
          color: #5b5047;
          font-size: 13px;
          line-height: 1.76;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .avatar {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          object-fit: cover;
          display: block;
          box-shadow:
            0 6px 16px rgba(76,54,34,0.14),
            inset 0 0 0 1px rgba(255,255,255,0.42);
        }
        .more-perspective {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          background: rgba(255,255,255,0.58);
        }
        .more-perspective h3 {
          margin: 14px 0 10px;
          color: #604c38;
          font-weight: 600;
        }
        .more-perspective p {
          color: #8d8073;
          font-size: 13px;
          line-height: 1.7;
        }
        .more-dots {
          width: 38px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px;
        }
        .more-dots span {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #7d5836;
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
          margin: 28px auto 0;
          height: 48px;
          padding: 0 54px;
          border: 1px solid rgba(139,95,52,0.22);
          border-radius: 999px;
          background: #fbf4ea;
          color: #7b5432;
          font-size: 16px;
        }
        .overlay { display: none; }
        .soon-layer {
          position: fixed;
          z-index: 60;
          inset: 0;
          display: grid;
          place-items: center;
          padding: 20px;
          background: rgba(49,36,25,0.2);
          backdrop-filter: blur(6px);
        }
        .soon-dialog {
          width: min(100%, 320px);
          padding: 28px 26px 24px;
          border: 1px solid rgba(132,96,59,0.16);
          border-radius: 18px;
          background: #fffaf3;
          box-shadow: 0 24px 70px rgba(64,43,24,0.18);
          text-align: center;
        }
        .soon-dialog h2 {
          margin: 0 0 10px;
          color: #352a21;
          font-size: 22px;
        }
        .soon-dialog p {
          margin: 0 0 22px;
          color: #817367;
          font-size: 14px;
        }
        .soon-dialog button {
          height: 40px;
          padding: 0 28px;
          border-radius: 999px;
          background: #5d4026;
          color: #fff8ed;
        }

        @media (max-width: 1080px) {
          .sidebar {
            width: 244px;
            flex-basis: 244px;
          }
          .main { padding: 24px; }
          .report-grid { grid-template-columns: 1fr 1fr; }
          .need-card, .suggestion-card { grid-column: 1 / -1; }
          .report-page { max-width: 900px; }
          .quote-card { padding: 18px 22px; }
          .report-card { height: 206px; }
          .report-card h2 { font-size: 25px; }
          .insight-card h2 { font-size: 21px; }
          .suggestion-card { padding-right: 240px; }
          .perspective-list { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }

        @media (max-height: 820px) and (min-width: 781px) {
          .sidebar {
            gap: 18px;
            padding-top: 26px;
          }
          .sidebar-note {
            display: none;
          }
          .history-list {
            padding-bottom: 6px;
          }
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
          .quota-pill {
            height: 34px;
            padding: 0 12px;
            font-size: 13px;
          }
          .ambient {
            width: 100%;
            height: 230px;
            right: 0;
            opacity: 0.48;
            mask-image: linear-gradient(180deg, #000 0%, transparent 100%);
          }
          .hero-copy {
            padding: 40px 2px 24px;
          }
          .hero-copy h1, .report-title {
            font-size: 32px;
            line-height: 1.35;
          }
          .hero-copy p {
            margin-top: 18px;
            font-size: 16px;
          }
          .write-card {
            min-height: 220px;
            padding: 20px 18px 42px;
            border-radius: 16px;
          }
          .write-card textarea {
            min-height: 150px;
            font-size: 16px;
          }
          .write-meta {
            display: grid;
            margin: 16px 2px 24px;
            font-size: 13px;
          }
          .primary-cta {
            height: 56px;
            border-radius: 15px;
            font-size: 22px;
          }
          .starter-section { margin-top: 38px; }
          .starter-grid {
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }
          .starter-grid button {
            min-height: 96px;
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
            height: auto;
            min-height: 190px;
            padding: 20px;
          }
          .report-card h2 {
            font-size: 24px;
          }
          .focus-card blockquote {
            font-size: 17px;
          }
          .insight-card h2 {
            font-size: 20px;
          }
          .suggestion-card {
            padding-right: 22px;
            padding-bottom: 110px;
          }
          .suggestion-card p {
            padding-left: 0;
          }
          .perspective-section {
            margin: 26px -16px 0 0;
          }
          .perspective-head {
            padding-right: 16px;
            margin-bottom: 14px;
          }
          .perspective-head h2 {
            font-size: 20px;
          }
          .perspective-list {
            display: flex;
            gap: 12px;
            overflow-x: auto;
            padding: 0 16px 8px 0;
            scroll-snap-type: x proximity;
          }
          .perspective-card {
            flex: 0 0 240px;
            min-height: 156px;
            scroll-snap-align: start;
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
