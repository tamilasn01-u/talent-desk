import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Activity, ArrowDown, ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight, Bell, BriefcaseBusiness,
  CalendarDays, Check, CheckCheck, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Clock3, Command,
  Download, FileCheck2, FileOutput, FileText, Filter, Globe2, LayoutDashboard, ListFilter, LoaderCircle, LogOut,
  Mail, Menu, MessageCircle, MoreHorizontal, Paperclip, Plus, Search, Send, Settings, Sparkles,
  SlidersHorizontal, Smile, Upload, Users, X, Zap,
} from 'lucide-react'
import {
  Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { initialCandidates, initialJobs } from './data'
import { resumeApi } from './services/apiClient'

const navGroups = [
  { title: 'WORKSPACE', links: [{ id: 'dashboard', label: 'Overview', icon: LayoutDashboard }, { id: 'candidates', label: 'Candidates', icon: Users, count: '24' }, { id: 'jobs', label: 'Job openings', icon: BriefcaseBusiness, count: '8' }] },
  { title: 'INSIGHTS', links: [{ id: 'analytics', label: 'Analytics', icon: Activity }, { id: 'assistant', label: 'AI assistant', icon: Sparkles, pill: 'AI' }] },
]
const pageTitles = { dashboard: 'Overview', candidates: 'Candidates', profile: 'Candidate profile', upload: 'Add candidates', analysis: 'AI resume analysis', jobs: 'Job openings', analytics: 'Recruitment analytics', assistant: 'AI assistant', settings: 'Settings' }
const cx = (...v) => v.filter(Boolean).join(' ')
const openGmailCompose = email => window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}`, '_blank', 'noopener,noreferrer')

function applicationDate(candidate) {
  const label = String(candidate.applied || '').trim()
  const date = new Date()
  if (/just now/i.test(label)) return date
  if (/yesterday/i.test(label)) { date.setDate(date.getDate() - 1); return date }
  const hoursAgo = label.match(/(\d+)\s*hours?\s*ago/i)
  const daysAgo = label.match(/(\d+)\s*days?\s*ago/i)
  if (hoursAgo) { date.setHours(date.getHours() - Number(hoursAgo[1])); return date }
  if (daysAgo) { date.setDate(date.getDate() - Number(daysAgo[1])); return date }
  const parsed = new Date(label)
  return Number.isNaN(parsed.getTime()) ? date : parsed
}

function buildSampleCandidates(timeRange, jobs) {
  let seed = Number(timeRange) * 7919 + jobs.length * 104729
  jobs.forEach(job => { seed = (seed + Number(job.id) * 15485863) >>> 0 })
  const random = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296 }
  const bands = { 7: [5, 16], 30: [24, 70], 90: [80, 220], 365: [320, 900] }
  const [minimum, maximum] = bands[timeRange] || bands[30]
  const count = minimum + Math.floor(random() * (maximum - minimum + 1))
  const stageChoices = ['New', 'Screening', 'Shortlisted', 'Interview', 'Offer', 'Hired']
  const stageWeights = [0.22, 0.25, 0.18, 0.20, 0.09, 0.06]
  const sourceChoices = ['LinkedIn', 'Referral', 'Website', 'Other']
  const sourceWeights = [0.42, 0.27, 0.21, 0.10]
  const choose = (choices, weights) => { const roll = random(); let total = 0; for (let index = 0; index < choices.length; index += 1) { total += weights[index]; if (roll <= total) return choices[index] } return choices[choices.length - 1] }
  return Array.from({ length: count }, (_, index) => {
    const job = jobs.length ? jobs[Math.floor(random() * jobs.length)] : null
    const date = new Date()
    date.setDate(date.getDate() - Math.floor(random() * Number(timeRange)))
    return { id: `sample-${timeRange}-${index + 1}`, jobId: job?.id, role: job?.title || 'General applicant', stage: choose(stageChoices, stageWeights), source: choose(sourceChoices, sourceWeights), applied: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), score: 60 + Math.floor(random() * 40), name: `Sample applicant ${String(index + 1).padStart(3, '0')}`, isSample: true }
  })
}

function Avatar({ person, size = 'md' }) {
  return <div className={`avatar avatar-${person.color || 'lilac'} avatar-${size}`}>{person.initials || person.name?.split(' ').map(x => x[0]).join('').slice(0, 2)}</div>
}
function Button({ children, variant = 'primary', className = '', ...props }) {
  return <button className={cx('button', `button-${variant}`, className)} {...props}>{children}</button>
}
function Badge({ children, tone = 'neutral' }) { return <span className={`badge badge-${tone}`}><i />{children}</span> }
function Panel({ title, subtitle, action, children, className = '' }) {
  return <section className={`panel ${className}`}><div className="panel-head"><div><h3>{title}</h3>{subtitle && <p>{subtitle}</p>}</div>{action}</div>{children}</section>
}

function StyledSelect({ value, onChange, options, label, className = '' }) {
  const [open, setOpen] = useState(false)
  const root = useRef(null)
  const menu = useRef(null)
  const selected = options.find(option => option.value === value) || options[0]

  useEffect(() => {
    if (!open) return undefined
    const closeOnOutsideClick = event => { if (!root.current?.contains(event.target)) setOpen(false) }
    const closeOnEscape = event => {
      if (event.key === 'Escape') {
        setOpen(false)
        root.current?.querySelector('.styled-select-trigger')?.focus()
      }
    }
    window.addEventListener('pointerdown', closeOnOutsideClick)
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      window.removeEventListener('pointerdown', closeOnOutsideClick)
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  const moveFocus = event => {
    if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return
    event.preventDefault()
    setOpen(true)
    requestAnimationFrame(() => {
      const items = [...(menu.current?.querySelectorAll('button') || [])]
      const currentIndex = items.indexOf(document.activeElement)
      const nextIndex = event.key === 'ArrowDown'
        ? (currentIndex + 1) % items.length
        : (currentIndex <= 0 ? items.length - 1 : currentIndex - 1)
      items[nextIndex]?.focus()
    })
  }

  return <div className={`styled-select ${className}${open ? ' styled-select-open' : ''}`} ref={root} onKeyDown={moveFocus}>
    <button className="styled-select-trigger" type="button" aria-label={label} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
      <span>{selected.label}</span><ChevronDown size={14} />
    </button>
    {open && <div className="styled-select-menu" role="menu" aria-label={label} ref={menu}>
      {options.map(option => <button type="button" key={option.value} role="menuitemradio" aria-checked={option.value === value} className={option.value === value ? 'styled-select-option styled-select-option-active' : 'styled-select-option'} onClick={() => { onChange(option.value); setOpen(false); root.current?.querySelector('.styled-select-trigger')?.focus() }}>
        <span>{option.label}</span>{option.value === value && <Check size={14} />}
      </button>)}
    </div>}
  </div>
}

function CandidateActionsMenu({ candidate, onView, onAnalyze, onMessage, onCopyEmail, onAdvance, onSchedule, onRemove }) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const root = useRef(null)
  const trigger = useRef(null)
  const menu = useRef(null)
  useEffect(() => {
    if (!open) return undefined
    const closeOnOutsideClick = event => { if (!root.current?.contains(event.target) && !menu.current?.contains(event.target)) setOpen(false) }
    const closeOnEscape = event => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus() } }
    const closeOnScroll = () => setOpen(false)
    window.addEventListener('pointerdown', closeOnOutsideClick)
    window.addEventListener('keydown', closeOnEscape)
    window.addEventListener('scroll', closeOnScroll, true)
    return () => {
      window.removeEventListener('pointerdown', closeOnOutsideClick)
      window.removeEventListener('keydown', closeOnEscape)
      window.removeEventListener('scroll', closeOnScroll, true)
    }
  }, [open])
  const toggle = () => {
    if (open) { setOpen(false); return }
    const rect = trigger.current?.getBoundingClientRect()
    if (!rect) return
    const itemCount = Number(Boolean(onView)) + Number(Boolean(onAnalyze)) + Number(Boolean(onMessage)) + Number(Boolean(onCopyEmail)) + Number(Boolean(onAdvance)) + Number(Boolean(onSchedule)) + 1
    const menuHeight = itemCount * 34 + 12
    setPosition({
      top: rect.bottom + menuHeight + 8 > window.innerHeight ? Math.max(8, rect.top - menuHeight - 6) : rect.bottom + 6,
      left: Math.max(8, Math.min(rect.right - 176, window.innerWidth - 184)),
    })
    setOpen(true)
  }
  const action = callback => event => {
    event.stopPropagation()
    setOpen(false)
    callback?.(candidate)
  }
  return <div className="candidate-actions-wrap" ref={root} onClick={event => event.stopPropagation()}>
    <button ref={trigger} type="button" className="more-button" aria-label={`Actions for ${candidate.name}`} aria-expanded={open} aria-haspopup="menu" onClick={toggle}><MoreHorizontal size={18} /></button>
    {open && createPortal(<div className="candidate-actions-menu" role="menu" aria-label={`${candidate.name} actions`} ref={menu} style={position}>
      {onView && <button type="button" role="menuitem" onClick={action(onView)}><Users size={14} /> View profile</button>}
      {onAnalyze && <button type="button" role="menuitem" onClick={action(onAnalyze)}><Sparkles size={14} /> AI analysis</button>}
      {onMessage && <button type="button" role="menuitem" onClick={action(onMessage)}><Mail size={14} /> Compose email</button>}
      {onCopyEmail && <button type="button" role="menuitem" onClick={action(onCopyEmail)}><FileText size={14} /> Copy email address</button>}
      {onAdvance && <button type="button" role="menuitem" onClick={action(onAdvance)}><ArrowUpRight size={14} /> Advance candidate</button>}
      {onSchedule && <button type="button" role="menuitem" onClick={action(onSchedule)}><CalendarDays size={14} /> Schedule interview</button>}
      <button type="button" role="menuitem" className="candidate-remove-action" onClick={action(onRemove)}><X size={14} /> Remove profile</button>
    </div>, document.body)}
  </div>
}

function Sidebar({ page, go, mobileOpen, onClose, onLogout }) {
  const [accountOpen, setAccountOpen] = useState(false)
  const item = (link) => <button key={link.id} className={cx('nav-item', page === link.id && 'nav-active')} onClick={() => { go(link.id); onClose() }}><link.icon size={18} strokeWidth={1.8} /><span>{link.label}</span>{link.count && <b>{link.count}</b>}{link.pill && <em>{link.pill}</em>}</button>
  return <><div className={cx('sidebar-scrim', mobileOpen && 'scrim-show')} onClick={onClose} /><aside className={cx('sidebar', mobileOpen && 'sidebar-open')}>
    <div className="brand"><div className="brand-mark"><Sparkles size={19} fill="currentColor" /></div><span>Talent<span className="brand-light">AI</span></span><button className="mobile-close" onClick={onClose}><X size={18} /></button></div>
    <button className="workspace-switch"><div className="workspace-avatar">A</div><div className="workspace-copy"><b>Acme, Inc.</b><small>Free workspace</small></div><ChevronDown size={15} /></button>
    <div className="nav-scroll">{navGroups.map(group => <div className="nav-group" key={group.title}><span className="nav-caption">{group.title}</span>{group.links.map(item)}</div>)}
      <div className="nav-group"><span className="nav-caption">TOOLS</span>{item({ id: 'upload', label: 'Resume intake', icon: Upload })}{item({ id: 'analysis', label: 'AI analysis', icon: Zap })}</div>
    </div>
    <div className="sidebar-bottom"><div className="sidebar-tip"><div className="tip-icon"><Sparkles size={15} /></div><b>Meet your AI copilot</b><p>Find your next great hire, faster.</p><button onClick={() => go('assistant')}>Explore assistant <ArrowRight size={13} /></button></div><div className="account-wrap"><button className="profile-mini" onClick={() => setAccountOpen(!accountOpen)} aria-expanded={accountOpen} aria-label="Account menu"><Avatar person={{ initials: 'SC', color: 'blue' }} /><div><b>Sarah Chen</b><small>Recruiting lead</small></div><MoreHorizontal size={18} /></button>{accountOpen && <div className="account-menu"><button onClick={() => { setAccountOpen(false); go('settings'); onClose() }}><Settings size={15} /> Settings</button><button onClick={() => { setAccountOpen(false); onLogout() }}><LogOut size={15} /> Log out</button></div>}</div></div>
  </aside></>
}

function Topbar({ title, page, onNavigate, onMenu, onSearch, onAssistant }) {
  const [search, setSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notificationsRead, setNotificationsRead] = useState(false)
  const notificationRoot = useRef(null)
  const searchInput = useRef(null)
  const breadcrumbSection = ['upload', 'analysis'].includes(page) ? 'Tools' : ['analytics', 'assistant'].includes(page) ? 'Insights' : 'Workspace'
  const sectionHome = breadcrumbSection === 'Tools' ? 'upload' : breadcrumbSection === 'Insights' ? 'analytics' : 'dashboard'
  useEffect(() => {
    if (!notificationsOpen) return undefined
    const closeOnOutsideClick = event => { if (!notificationRoot.current?.contains(event.target)) setNotificationsOpen(false) }
    const closeOnEscape = event => { if (event.key === 'Escape') setNotificationsOpen(false) }
    window.addEventListener('pointerdown', closeOnOutsideClick)
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      window.removeEventListener('pointerdown', closeOnOutsideClick)
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [notificationsOpen])
  const submitSearch = event => {
    event?.preventDefault()
    if (search.trim()) {
      onSearch(search.trim())
      setSearch('')
      setSearchOpen(false)
    } else if (window.matchMedia('(max-width: 680px)').matches) {
      setSearchOpen(true)
      requestAnimationFrame(() => searchInput.current?.focus())
    }
  }
  return <header className="topbar">
    <button className="icon-button menu-button" onClick={onMenu}><Menu size={20} /></button>
    <div className="breadcrumbs"><button onClick={() => onNavigate(sectionHome)}>{breadcrumbSection}</button><ChevronRight size={14} /><button className="breadcrumb-current" onClick={() => onNavigate(page)} aria-current="page">{title}</button></div>
    <div className="topbar-actions">
      <form className={`global-search${searchOpen ? ' search-open' : ''}`} role="search" onSubmit={submitSearch}>
        <input ref={searchInput} placeholder="Search candidates..." aria-label="Search candidates" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Escape' && setSearchOpen(false)} />
        <button className="global-search-submit" type="submit" aria-label="Search"><Search size={15} /></button>
      </form>
      <button className="icon-button help-button" aria-label="Help"><CircleHelp size={18} /></button>
      <button className="icon-button" onClick={onAssistant} title="Open AI assistant"><Sparkles size={17} /></button>
      <div className="notification-wrap" ref={notificationRoot}>
        <button className="icon-button notification-button" onClick={() => setNotificationsOpen(!notificationsOpen)} aria-label="Notifications" aria-expanded={notificationsOpen} aria-haspopup="dialog"><Bell size={18} />{!notificationsRead && <i />}</button>
        {notificationsOpen && <div className="notification-popover" role="dialog" aria-label="Notifications"><div className="notification-head"><div><b>Notifications</b><small>{notificationsRead ? 'You’re all caught up' : '2 new updates'}</small></div><button onClick={() => setNotificationsRead(true)}>Mark all read</button></div><button className="notification-item" onClick={() => { onNavigate('candidates'); setNotificationsOpen(false); setNotificationsRead(true) }}><span className="notification-dot notification-dot-purple" /><span><b>Candidate moved to interview</b><small>Olivia Rhye · 10 minutes ago</small></span></button><button className="notification-item" onClick={() => { onNavigate('jobs'); setNotificationsOpen(false); setNotificationsRead(true) }}><span className="notification-dot notification-dot-blue" /><span><b>New application received</b><small>Frontend Engineer · 1 hour ago</small></span></button></div>}
      </div>
      <Avatar person={{ initials: 'SC', color: 'blue' }} size="sm" />
    </div>
  </header>
}

function Dashboard({ candidates, jobs, go, openCandidate }) {
  const [activityRange, setActivityRange] = useState('week')
  const rangeConfig = { week: { days: 7, buckets: 7, unit: 'day', subtitle: 'Applications and interviews over the last 7 days' }, month: { days: 30, buckets: 4, unit: 'week', subtitle: 'Applications and interviews over the last 30 days' }, sixMonths: { days: 180, buckets: 6, unit: 'month', subtitle: 'Applications and interviews over the last 6 months' }, year: { days: 365, buckets: 12, unit: 'month', subtitle: 'Applications and interviews over the last 12 months' } }[activityRange]
  const rangeData = useMemo(() => {
    const end = new Date()
    end.setHours(23, 59, 59, 999)
    const start = new Date(end)
    start.setDate(start.getDate() - rangeConfig.days + 1)
    start.setHours(0, 0, 0, 0)
    const history = [...candidates, ...buildSampleCandidates(365, jobs)].filter(candidate => applicationDate(candidate) >= start && applicationDate(candidate) <= end)
    const data = Array.from({ length: rangeConfig.buckets }, (_, index) => {
      let day
      if (rangeConfig.unit === 'day') {
        const date = new Date(start); date.setDate(start.getDate() + index)
        day = date.toLocaleDateString('en-US', { weekday: 'short' })
      } else if (rangeConfig.unit === 'week') day = `Week ${index + 1}`
      else {
        const date = new Date(end); date.setDate(1); date.setMonth(end.getMonth() - rangeConfig.buckets + 1 + index)
        day = date.toLocaleDateString('en-US', { month: 'short' })
      }
      return { day, applicants: 0, interviews: 0 }
    })
    history.forEach(candidate => {
      const date = applicationDate(candidate)
      const offset = Math.max(0, Math.floor((date - start) / 86400000))
      const bucket = rangeConfig.unit === 'day' ? offset : rangeConfig.unit === 'week' ? Math.floor(offset / 7) : Math.min(rangeConfig.buckets - 1, Math.floor(offset / (rangeConfig.days / rangeConfig.buckets)))
      const point = data[Math.min(rangeConfig.buckets - 1, bucket)]
      if (point) {
        point.applicants += 1
        if (['Interview', 'Offer', 'Hired'].includes(candidate.stage)) point.interviews += 1
      }
    })
    return { subtitle: rangeConfig.subtitle, data }
  }, [candidates, jobs, rangeConfig])
  const activityTotals = rangeData.data.reduce((totals, point) => ({ applicants: totals.applicants + point.applicants, interviews: totals.interviews + point.interviews }), { applicants: 0, interviews: 0 })
  const activity = [
    { person: candidates[0], action: 'moved to interview', subject: 'Olivia Rhye', time: '10 min ago', color: 'purple' },
    { person: candidates[1], action: 'applied for', subject: 'Frontend Engineer', time: '1 hour ago', color: 'blue' },
    { person: candidates[2], action: 'resume analyzed', subject: 'Lana Steiner', time: '3 hours ago', color: 'green' },
    { person: candidates[4], action: 'added a note to', subject: 'Candice Wu', time: 'Yesterday', color: 'orange' },
  ]
  return <>
    <div className="welcome-row"><div><div className="eyebrow">FRIDAY, SEPTEMBER 26, 2026</div><h1>Good morning, Sarah <span className="wave">✳</span></h1><p>Here’s what’s happening with your hiring today.</p></div><div className="welcome-actions"><Button variant="secondary" onClick={() => go('upload')}><Upload size={16} /> Import resumes</Button><Button onClick={() => go('jobs')}><Plus size={17} /> Create a job</Button></div></div>
    <div className="stats-grid"><StatCard title="Active candidates" value="248" change="12.8%" note="vs. last month" icon={Users} tone="violet" spark={[12, 16, 13, 20, 18, 24, 22]} /><StatCard title="Open positions" value={String(jobs.filter(j => j.open).length + 4).padStart(2, '0')} change="2 new" note="this week" icon={BriefcaseBusiness} tone="blue" spark={[8, 8, 12, 12, 10, 15, 14]} /><StatCard title="Interviews this week" value="36" change="8.2%" note="vs. last week" icon={CalendarDays} tone="orange" spark={[10, 15, 12, 18, 17, 22, 24]} /><StatCard title="Avg. time to hire" value="18 days" change="−3 days" note="vs. last month" icon={Clock3} tone="green" spark={[22, 20, 24, 18, 20, 16, 14]} /></div>
    <div className="dashboard-grid"><Panel title="Hiring activity" subtitle={rangeData.subtitle} action={<StyledSelect label="Hiring activity time range" value={activityRange} onChange={setActivityRange} options={[{ value: 'week', label: 'This week' }, { value: 'month', label: '1 month' }, { value: 'sixMonths', label: '6 months' }, { value: 'year', label: '1 year' }]} className="timeframe-select" />} className="activity-panel"><div className="chart-legend"><span><i className="legend-purple" /> Applicants <b>{activityTotals.applicants.toLocaleString()}</b></span><span><i className="legend-blue" /> Interviews <b>{activityTotals.interviews.toLocaleString()}</b></span></div><div className="chart-area"><ResponsiveContainer width="100%" height="100%"><AreaChart data={rangeData.data} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}><defs><linearGradient id="appFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8867ef" stopOpacity={0.17} /><stop offset="95%" stopColor="#8867ef" stopOpacity={0} /></linearGradient><linearGradient id="intFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#61a7ee" stopOpacity={0.12} /><stop offset="95%" stopColor="#61a7ee" stopOpacity={0} /></linearGradient></defs><CartesianGrid vertical={false} stroke="#edf0f5" strokeDasharray="4 5" /><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#98a0b2', fontSize: 11 }} dy={9} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#a0a7b6', fontSize: 10 }} /><Tooltip contentStyle={{ border: '1px solid #eff0f5', borderRadius: 12, boxShadow: '0 8px 30px #2221', fontSize: 12 }} /><Area type="monotone" dataKey="applicants" stroke="#8867ef" strokeWidth={2.5} fill="url(#appFill)" /><Area type="monotone" dataKey="interviews" stroke="#65a9ef" strokeWidth={2.5} fill="url(#intFill)" /></AreaChart></ResponsiveContainer></div></Panel>
      <Panel title="Hiring pipeline" subtitle="Candidates by stage" action={<button className="more-button"><MoreHorizontal size={19} /></button>}><div className="pipeline-content"><div className="donut-wrap"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={[{ value: 28 }, { value: 22 }, { value: 31 }, { value: 19 }]} innerRadius={54} outerRadius={72} paddingAngle={4} dataKey="value" stroke="none" cornerRadius={4}>{['#8767ec', '#55b2a0', '#65a7ec', '#f5b36d'].map(c => <Cell key={c} fill={c} />)}</Pie></PieChart></ResponsiveContainer><div className="donut-center"><b>248</b><small>Total</small></div></div><div className="pipeline-legend"><PipelineLine color="violet" label="Screening" value="69" pct="28%" /><PipelineLine color="teal" label="Interview" value="55" pct="22%" /><PipelineLine color="sky" label="Assessment" value="77" pct="31%" /><PipelineLine color="amber" label="Offer" value="47" pct="19%" /></div></div></Panel>
    </div>
    <div className="dashboard-grid lower-grid"><Panel title="Top candidates" subtitle="Your highest AI matches this week" action={<button className="text-link" onClick={() => go('candidates')}>View all <ArrowRight size={14} /></button>}><div className="top-candidate-list">{candidates.slice().sort((a, b) => b.score - a.score).slice(0, 4).map(c => <button className="top-candidate" key={c.id} onClick={() => openCandidate(c)}><Avatar person={c} /><div className="top-candidate-main"><b>{c.name}</b><small>{c.role}</small></div><Score score={c.score} /><ArrowRight size={15} className="row-arrow" /></button>)}</div></Panel>
      <Panel title="Recent activity" subtitle="Updates from your hiring team" action={<button className="more-button"><MoreHorizontal size={19} /></button>}><div className="timeline">{activity.map((a, i) => a.person && <div className="timeline-item" key={i}><Avatar person={a.person} size="sm" /><div><p><b>{a.subject}</b> {a.action}</p><small>{a.time}</small></div><span className={`activity-dot dot-${a.color}`} /></div>)}</div></Panel></div>
    <div className="ai-banner"><div className="banner-star"><Sparkles size={20} /></div><div><b>Your hiring copilot is ready</b><p>Ask TalentAI to find candidates, summarize profiles, or draft a job description.</p></div><Button variant="light" onClick={() => go('assistant')}>Chat with AI <ArrowRight size={15} /></Button><div className="banner-decoration">✳</div></div>
  </>
}

function StatCard({ title, value, change, note, icon: Icon, tone, spark }) {
  return <div className="stat-card"><div className="stat-top"><div className={`stat-icon tone-${tone}`}><Icon size={18} /></div><button className="more-button"><MoreHorizontal size={18} /></button></div><div className="stat-value">{value}</div><div className="stat-title">{title}</div><div className="stat-bottom"><span className={tone === 'orange' && change.includes('days') ? 'change-good' : 'change-up'}>{change.includes('%') && <ArrowUpRight size={13} />}{change}</span><span>{note}</span><MiniSpark data={spark} tone={tone} /></div></div>
}
function MiniSpark({ data, tone }) { return <div className={`mini-spark spark-${tone}`}>{data.map((v, i) => <i style={{ height: `${v * 1.1}px` }} key={i} />)}</div> }
function PipelineLine({ color, label, value, pct }) { return <div className="pipeline-line"><i className={`legend-${color}`} /><span>{label}</span><b>{value}</b><small>{pct}</small></div> }
function Score({ score }) { return <span className={`score ${score >= 90 ? 'score-high' : score >= 80 ? 'score-mid' : 'score-low'}`}><Sparkles size={12} />{score}%</span> }

function Candidates({ candidates, openCandidate, analyzeCandidate, advanceCandidate, requestSchedule, requestRemove, go, globalQuery, roleJobId, roleJobTitle, clearRoleFilter }) {
  const [query, setQuery] = useState(globalQuery || '')
  const [stage, setStage] = useState('All stages')
  const [sort, setSort] = useState('Best match')
  const [source, setSource] = useState('All sources')
  const [minimumMatch, setMinimumMatch] = useState('any')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState([])
  const filterRoot = useRef(null)
  const selectAllRef = useRef(null)
  useEffect(() => { if (globalQuery !== undefined) setQuery(globalQuery) }, [globalQuery])
  const filterCount = Number(stage !== 'All stages') + Number(source !== 'All sources') + Number(minimumMatch !== 'any')
  useEffect(() => {
    if (!filtersOpen) return undefined
    const closeOnOutsideClick = event => { if (!filterRoot.current?.contains(event.target)) setFiltersOpen(false) }
    const closeOnEscape = event => { if (event.key === 'Escape') setFiltersOpen(false) }
    window.addEventListener('pointerdown', closeOnOutsideClick)
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      window.removeEventListener('pointerdown', closeOnOutsideClick)
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [filtersOpen])
  const filtered = useMemo(() => candidates.filter(c => (!roleJobId || c.jobId === roleJobId) && `${c.name} ${c.role} ${c.skills.join(' ')}`.toLowerCase().includes(query.toLowerCase()) && (stage === 'All stages' || c.stage === stage) && (source === 'All sources' || c.source === source) && (minimumMatch === 'any' || c.score >= Number(minimumMatch))).sort((a, b) => sort === 'Best match' ? b.score - a.score : sort === 'Recently added' ? b.id - a.id : a.name.localeCompare(b.name)), [candidates, query, stage, source, minimumMatch, sort, roleJobId])
  const allVisibleSelected = filtered.length > 0 && filtered.every(candidate => selectedIds.includes(candidate.id))
  const someVisibleSelected = filtered.some(candidate => selectedIds.includes(candidate.id))
  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someVisibleSelected && !allVisibleSelected
  }, [someVisibleSelected, allVisibleSelected])
  return <><div className="page-heading"><div><div className="eyebrow">TALENT POOL</div><h1>Candidates</h1><p>{roleJobTitle ? `Applicants for ${roleJobTitle}.` : 'Find, evaluate, and connect with your next great hire.'}</p></div><Button onClick={() => go('upload')}><Plus size={16} /> Add candidates</Button></div>{roleJobTitle && <div className="role-filter-banner"><BriefcaseBusiness size={15} /><span>Showing applicants for <b>{roleJobTitle}</b></span><button onClick={clearRoleFilter}>Show all candidates <X size={13} /></button></div>}
    <div className="filterbar"><label className="table-search"><Search size={16} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by name, role, or skill..." /></label><StyledSelect label="Candidate stage" value={stage} onChange={setStage} options={[{ value: 'All stages', label: 'All stages' }, ...['New', 'Screening', 'Shortlisted', 'Interview'].map(value => ({ value, label: value }))]} className="candidate-filter-select" /><StyledSelect label="Sort candidates" value={sort} onChange={setSort} options={[{ value: 'Best match', label: 'Best match' }, { value: 'Recently added', label: 'Recently added' }, { value: 'Name A–Z', label: 'Name A–Z' }]} className="candidate-sort-select" /><div className="filter-menu-wrap" ref={filterRoot}><button className={`filter-button${filtersOpen ? ' filter-button-open' : ''}`} aria-expanded={filtersOpen} aria-haspopup="dialog" onClick={() => setFiltersOpen(!filtersOpen)}><SlidersHorizontal size={15} /> Filters <span>{filterCount}</span></button>{filtersOpen && <div className="filters-popover" role="dialog" aria-label="Filter candidates"><div className="filters-popover-head"><div><b>Refine candidates</b><small>Choose a source and minimum AI match.</small></div><button type="button" onClick={() => { setStage('All stages'); setSource('All sources'); setMinimumMatch('any') }}>Clear</button></div><div className="filters-popover-fields"><label>Application source<StyledSelect label="Application source" value={source} onChange={setSource} options={[{ value: 'All sources', label: 'All sources' }, ...['LinkedIn', 'Referral', 'Website'].map(value => ({ value, label: value }))]} className="popover-select" /></label><label>Minimum AI match<StyledSelect label="Minimum AI match" value={minimumMatch} onChange={setMinimumMatch} options={[{ value: 'any', label: 'Any score' }, { value: '80', label: '80% and above' }, { value: '90', label: '90% and above' }]} className="popover-select" /></label></div></div>}</div><div className="results-count">{filtered.length} candidates</div></div>
    <div className="table-panel"><div className="table-scroll"><table><thead><tr><th><input ref={selectAllRef} type="checkbox" aria-label="Select all visible candidates" checked={allVisibleSelected} onChange={event => { const visibleIds = filtered.map(candidate => candidate.id); setSelectedIds(current => event.target.checked ? [...new Set([...current, ...visibleIds])] : current.filter(id => !visibleIds.includes(id))) }} /></th><th>Candidate</th><th>Applied for</th><th>AI match <Sparkles size={12} /></th><th>Stage</th><th>Applied</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{filtered.map(c => <tr key={c.id} onClick={() => openCandidate(c)}><td onClick={e => e.stopPropagation()}><input type="checkbox" aria-label={`Select ${c.name}`} checked={selectedIds.includes(c.id)} onChange={event => setSelectedIds(current => event.target.checked ? [...new Set([...current, c.id])] : current.filter(id => id !== c.id))} /></td><td><div className="candidate-cell"><Avatar person={c} /><div><b>{c.name}</b><small>{c.email}</small></div></div></td><td><div className="role-cell"><b>{c.role}</b><small>{c.location}</small></div></td><td><Score score={c.score} /></td><td><Badge tone={c.stage.toLowerCase()}>{c.stage}</Badge></td><td className="muted-cell">{c.applied}</td><td><CandidateActionsMenu candidate={c} onView={openCandidate} onAnalyze={analyzeCandidate} onAdvance={c.stage !== 'Interview' ? advanceCandidate : undefined} onSchedule={requestSchedule} onRemove={requestRemove} /></td></tr>)}</tbody></table>{filtered.length === 0 && <div className="empty-state"><Search size={22} /><b>No candidates found</b><span>Try adjusting your search or filters.</span></div>}</div><div className="table-footer"><span>Showing <b>{filtered.length ? 1 : 0}–{filtered.length}</b> of <b>{filtered.length}</b> candidates</span><div><button className="pager" disabled><ArrowLeft size={14} /> Previous</button><button className="pager" disabled>Next <ArrowRight size={14} /></button></div></div></div>
    <div className="tip-inline"><Sparkles size={16} /><span><b>Smart matching is on.</b> Candidate scores are generated by matching profile skills to each open role.</span><button onClick={() => go('analysis')}>How it works <ArrowRight size={13} /></button></div>
  </>
}

function CandidateJourney({ candidate }) {
  const stages = ['Applied', 'Screening', 'Shortlisted', 'Interview', 'Offer', 'Hired']
  const currentIndex = Math.max(0, stages.indexOf(candidate.stage === 'New' ? 'Screening' : candidate.stage))
  const asDate = value => {
    if (!value) return ''
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  }
  const applicationDate = (() => {
    if (/\d{4}/.test(candidate.applied)) return asDate(candidate.applied)
    const date = new Date()
    if (candidate.applied === 'Yesterday') date.setDate(date.getDate() - 1)
    else if (/hours? ago/i.test(candidate.applied)) date.setHours(date.getHours() - (Number.parseInt(candidate.applied, 10) || 1))
    return asDate(date)
  })()
  const history = candidate.stageHistory || []
  return <Panel title="Application journey" subtitle="Progress from application to current hiring stage" className="candidate-journey-panel">
    <div className="candidate-journey" role="list" aria-label={`${candidate.name} application journey`}>
      {stages.map((stage, index) => {
        const historyItem = history.find(item => item.stage === stage)
        const acceptedOffer = stage === 'Offer' && candidate.offerStatus === 'accepted'
        const awaitingJoin = stage === 'Hired' && candidate.offerStatus === 'accepted' && candidate.stage !== 'Hired'
        const joined = stage === 'Hired' && candidate.stage === 'Hired'
        const declinedOffer = stage === 'Offer' && candidate.offerStatus === 'declined'
        const done = index < currentIndex || acceptedOffer || joined
        const current = index === currentIndex && !acceptedOffer && !joined
        const scheduled = stage === 'Interview' && candidate.interview
        const date = stage === 'Applied' ? applicationDate : stage === 'Offer' && candidate.offerDecisionDate ? asDate(candidate.offerDecisionDate) : stage === 'Hired' && candidate.joinedDate ? asDate(candidate.joinedDate) : scheduled ? asDate(candidate.interview.date) : historyItem ? asDate(historyItem.date) : current ? asDate(new Date()) : ''
        return <div key={stage} className={`journey-step${done ? ' journey-step-done' : ''}${current ? ' journey-step-current' : ''}${scheduled ? ' journey-step-scheduled' : ''}${acceptedOffer ? ' journey-step-accepted' : ''}${joined ? ' journey-step-joined' : ''}${awaitingJoin ? ' journey-step-awaiting-join' : ''}${declinedOffer ? ' journey-step-declined' : ''}`} role="listitem">
          <div className="journey-node"><span>{done ? <Check size={12} /> : awaitingJoin ? <Clock3 size={11} /> : index + 1}</span></div>
          <b>{acceptedOffer ? 'Offer accepted' : declinedOffer ? 'Offer declined' : stage === 'Applied' ? 'Applied' : stage}</b>
          <small>{awaitingJoin ? 'Not joined yet' : scheduled ? 'Interview scheduled' : date || (done ? 'Completed' : 'Upcoming')}</small>
        </div>
      })}
    </div>
  </Panel>
}

function CandidateProfile({ candidate, jobs = [], go, onBack, onRemove, onCopyEmail, onAdvance, onSchedule, onOfferDecision, onMarkJoined }) {
  const [comparison, setComparison] = useState(candidate?.analysis || null)
  const [comparisonJobId, setComparisonJobId] = useState(String(candidate?.jobId ?? ''))
  const [comparisonBusy, setComparisonBusy] = useState(false)
  const [comparisonError, setComparisonError] = useState('')
  useEffect(() => {
    setComparison(candidate?.analysis || null)
    setComparisonJobId(String(candidate?.jobId ?? ''))
    setComparisonError('')
  }, [candidate?.id])
  const changeComparisonRole = async value => {
    setComparisonJobId(value)
    const job = jobs.find(item => String(item.id) === value)
    if (!candidate?.analysis || !job) return
    setComparisonBusy(true)
    setComparisonError('')
    try { setComparison(await resumeApi.match(candidate.analysis, job)) }
    catch (error) { setComparisonError(error.message || 'Could not compare this opening') }
    finally { setComparisonBusy(false) }
  }
  if (!candidate) return <div className="empty-state profile-empty"><Users size={25} /><b>Select a candidate to view their profile</b><Button onClick={onBack}>Back to candidates</Button></div>
  const activeAnalysis = comparison || candidate.analysis
  const comparedRole = activeAnalysis?.roleTitle || candidate.role
  const comparisonOptions = jobs.map(job => ({ value: String(job.id), label: job.title }))
  return <><button className="back-link" onClick={onBack}><ArrowLeft size={15} /> Back to candidates</button><div className="profile-header panel"><div className="profile-identity"><Avatar person={candidate} size="lg" /><div><div className="name-line"><h1>{candidate.name}</h1><Badge tone={candidate.stage.toLowerCase()}>{candidate.stage}</Badge></div><p>{candidate.role} <span>·</span> {candidate.location}</p><div className="profile-meta"><span><Mail size={14} />{candidate.email}</span><span><BriefcaseBusiness size={14} />{candidate.experience} experience</span><span><Globe2 size={14} />{candidate.source}</span></div></div></div><div className="profile-actions"><Button variant="secondary" onClick={() => openGmailCompose(candidate.email)}><Mail size={15} /> Message</Button><Button onClick={() => go('analysis')}><Sparkles size={15} /> AI analysis</Button><CandidateActionsMenu candidate={candidate} onMessage={person => openGmailCompose(person.email)} onCopyEmail={onCopyEmail} onAdvance={['Offer', 'Hired'].includes(candidate.stage) ? undefined : onAdvance} onSchedule={onSchedule} onRemove={onRemove} /></div></div>
    <CandidateJourney candidate={candidate} />
    {(candidate.stage === 'Offer' || candidate.offerStatus) && <Panel title="Offer decision" subtitle="Track whether the candidate has accepted the offer" className="offer-decision-panel"><div className="offer-decision-content"><div className={`offer-decision-status${candidate.offerStatus ? ` offer-status-${candidate.offerStatus}` : ''}`}><span className="offer-status-indicator" /><div><b>{candidate.offerStatus === 'accepted' ? 'Offer accepted' : candidate.offerStatus === 'declined' ? 'Offer declined' : 'Awaiting candidate response'}</b><small>{candidate.offerDecisionDate ? `Updated ${new Date(candidate.offerDecisionDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}` : 'No response recorded yet'}</small></div></div><div className="offer-decision-actions">{candidate.offerStatus !== 'accepted' && <Button variant="secondary" onClick={() => onOfferDecision('accepted')}><Check size={14} /> Accepted</Button>}<Button variant={candidate.offerStatus === 'declined' ? 'primary' : 'secondary'} onClick={() => onOfferDecision('declined')}><X size={14} /> Declined</Button>{candidate.offerStatus === 'accepted' && candidate.stage !== 'Hired' && <Button onClick={onMarkJoined}><BriefcaseBusiness size={14} /> Mark as joined</Button>}</div></div></Panel>}
    {candidate.interview && <div className="panel scheduled-interview"><div className="interview-icon"><CalendarDays size={17} /></div><div><b>Interview scheduled</b><span>{new Date(`${candidate.interview.date}T${candidate.interview.time}`).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })} · {candidate.interview.format} · {candidate.interview.interviewer}</span>{candidate.interview.notes && <small>{candidate.interview.notes}</small>}</div></div>}
    <div className="profile-grid"><div className="profile-main"><Panel title="About" subtitle="Candidate overview"><p className="about-copy">{candidate.summary}</p><div className="profile-subhead"><b>Skills & expertise</b><span>{candidate.skills.length} skills found</span></div>{candidate.skills.length ? <div className="skill-chips">{candidate.skills.map(s => <span key={s}>{s}<Check size={12} /></span>)}</div> : <p className="about-copy">No recognized skills were found in the resume text.</p>}</Panel><Panel title="Experience" subtitle={candidate.analysis ? 'Resume evidence' : 'Work history'}>{candidate.analysis ? <div className="experience-item"><div className="experience-logo">✳</div><div><b>{candidate.analysis.experienceYears == null ? 'Experience not detected' : `${candidate.analysis.experienceYears} years stated`}</b><p>{candidate.analysis.extractedCharacterCount.toLocaleString()} characters of resume text analyzed</p><small>{candidate.analysis.experienceMatchPercent == null ? 'No minimum experience requirement recorded for this role' : `${candidate.analysis.experienceMatchPercent}% of stated minimum experience`}</small></div></div> : <><div className="experience-item"><div className="experience-logo">✳</div><div><b>Senior {candidate.role.replace('Senior ', '')}</b><p>Acme Technologies · Full-time</p><small>2021 — Present · 3 yrs 8 mos</small><p className="experience-desc">Led cross-functional initiatives to build scalable product experiences, collaborating closely with design and engineering teams.</p></div></div><div className="experience-item"><div className="experience-logo logo-purple">◈</div><div><b>{candidate.role}</b><p>Growth Labs · Full-time</p><small>2018 — 2021 · 3 yrs</small></div></div></>}</Panel></div><div className="profile-side"><div className="match-card"><div className="match-card-head"><span><Sparkles size={15} /> {activeAnalysis?.intelligence ? 'CURRENT FIT' : activeAnalysis ? 'RESUME SKILL MATCH' : 'TALENTAI MATCH'}</span><button className="more-button"><MoreHorizontal size={17} /></button></div>{activeAnalysis && comparisonOptions.length > 0 && <div className="match-role-picker"><label>Compare with opening</label><StyledSelect value={comparisonJobId} onChange={changeComparisonRole} options={comparisonOptions} label="Compare with opening" className="match-role-select" /></div>}{comparisonBusy && <div className="match-recalculating"><LoaderCircle size={13} className="spin" /> Recalculating role match…</div>}{comparisonError && <p className="form-error" role="alert">{comparisonError}</p>}<div className="match-score-big">{activeAnalysis?.skillMatchPercent ?? candidate.score}<small>%</small></div><p>{activeAnalysis ? 'Required skills found for' : 'Excellent match for'} <b>{comparedRole}</b></p><div className="match-progress"><i style={{ width: `${activeAnalysis?.skillMatchPercent ?? candidate.score}%` }} /></div>{activeAnalysis ? <><div className="match-foot"><span>Required skills matched</span><b>{activeAnalysis.matchedSkillCount} / {activeAnalysis.requiredSkillCount}</b></div>{activeAnalysis.experienceMatchPercent != null && <div className="match-foot"><span>Experience requirement</span><b>{activeAnalysis.experienceMatchPercent}%</b></div>}{activeAnalysis.missingRequiredSkills.length > 0 && <div className="match-foot"><span>Required skills not found</span><b>{activeAnalysis.missingRequiredSkills.join(', ')}</b></div>}</> : <><div className="match-foot"><span>Skills match</span><b>{candidate.score - 2}%</b></div><div className="match-foot"><span>Experience</span><b>98%</b></div><div className="match-foot"><span>Location</span><b>100%</b></div></>}<Button variant="light" className="full-button" onClick={() => go('analysis')}>View full analysis <ArrowRight size={14} /></Button></div><Panel title="Resume" subtitle="Most recent upload"><div className="resume-file"><div className="pdf-icon"><FileText size={18} /></div><div><b>{candidate.resumeFilename || `${candidate.name.split(' ')[0]}_Resume.pdf`}</b><small>{candidate.analysis ? `${candidate.analysis.extractedCharacterCount.toLocaleString()} characters analyzed` : 'PDF · 2.4 MB · Sep 26, 2026'}</small></div><button className="icon-button"><Download size={16} /></button></div><button className="text-link add-resume" onClick={() => go('upload')}><Plus size={14} /> Upload another resume</button></Panel><Panel title="Recruiter note" subtitle="Only visible to your team"><textarea className="note-input" placeholder="Add a note about this candidate..." /><Button variant="secondary" className="save-note"><Check size={14} /> Save note</Button></Panel></div></div></>
}

function UploadPage({ candidates, setCandidates, jobs, go }) {
  const [files, setFiles] = useState([]); const [drag, setDrag] = useState(false); const [jobId, setJobId] = useState(String(jobs.find(job => job.open && !job.filled)?.id ?? jobs[0]?.id ?? '')); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const input = useRef(null)
  const receive = list => { setError(''); setFiles(old => [...old, ...Array.from(list).filter(file => /\.(pdf|docx)$/i.test(file.name)).map(file => ({ file, name: file.name, size: (file.size / 1024 / 1024).toFixed(1) + ' MB', progress: 100 }))]) }
  const finish = async () => {
    if (!files.length || busy) return
    const job = jobs.find(item => String(item.id) === jobId)
    if (!job) { setError('Create a job opening with required skills before analyzing resumes.'); return }
    setBusy(true); setError('')
    const results = await Promise.all(files.map(async (entry, index) => {
      try {
        const analysis = await resumeApi.analyze(entry.file, job)
        const name = entry.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ').replace(/\b\w/g, value => value.toUpperCase())
        return { candidate: { id: `${Date.now()}-${index}`, name, role: job.title, jobId: job.id, email: analysis.email || '', location: job.location || 'Location not specified', experience: analysis.experienceYears == null ? 'Not detected' : `${analysis.experienceYears} years`, applied: 'Just now', stage: 'New', score: analysis.skillMatchPercent, initials: name.split(' ').map(part => part[0]).join('').slice(0, 2), color: ['lilac', 'peach', 'mint'][index % 3], skills: analysis.foundSkills, summary: analysis.summary, source: 'Resume upload', resumeFilename: analysis.originalFilename, analysis }, entry }
      } catch (reason) { return { error: reason.message || 'Could not analyze this resume', entry } }
    }))
    const additions = results.filter(result => result.candidate).map(result => result.candidate)
    const failures = results.filter(result => result.error)
    if (additions.length) { setCandidates([...additions, ...candidates]); setFiles(failures.map(result => result.entry)); if (!failures.length) go('candidates') }
    if (failures.length) setError(failures.map(result => `${result.entry.name}: ${result.error}`).join(' · '))
    setBusy(false)
  }
  const jobOptions = jobs.map(job => ({ value: String(job.id), label: job.title }))
  return <><div className="page-heading"><div><div className="eyebrow">CANDIDATE INTAKE</div><h1>Add candidates</h1><p>Extract resume skills and score each candidate against an open role.</p></div><button className="text-link" onClick={() => go('candidates')}><ArrowLeft size={14} /> Back to candidates</button></div><div className="upload-layout"><div className="upload-main"><Panel title="Match resumes to a role" subtitle="Scores are based on required skills detected in resume text.">{jobOptions.length ? <StyledSelect value={jobId} onChange={setJobId} options={jobOptions} label="Select job opening" className="upload-job-select" /> : <p>Create a job opening with required skills to analyze resumes.</p>}</Panel><div className={cx('dropzone', drag && 'dropzone-active')} onDragOver={e => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)} onDrop={e => { e.preventDefault(); setDrag(false); receive(e.dataTransfer.files) }} onClick={() => input.current?.click()}><input ref={input} type="file" hidden multiple accept=".pdf,.docx" onChange={e => receive(e.target.files)} /><div className="upload-icon"><Upload size={22} /></div><h3>Drag and drop resumes here</h3><p>or <button type="button" onClick={e => { e.stopPropagation(); input.current?.click() }}>browse files</button> from your computer</p><small>Text-based PDF or DOCX · Up to 10 MB per file</small></div>{error && <p className="form-error" role="alert">{error}</p>}{files.length > 0 && <Panel title={`Ready to upload (${files.length})`}><div className="file-list">{files.map((f, i) => <div className="file-row" key={i}><div className="pdf-icon"><FileText size={17} /></div><div className="file-info"><b>{f.name}</b><small>{f.size} · Ready to analyze</small><div className="file-progress"><i style={{ width: `${f.progress}%` }} /></div></div><button className="icon-button" onClick={() => setFiles(files.filter((_, j) => j !== i))}><X size={16} /></button></div>)}</div><Button onClick={finish} disabled={busy || !jobOptions.length} className="upload-submit">{busy ? <LoaderCircle size={15} className="spin" /> : <Sparkles size={15} />} {busy ? 'Analyzing resumes…' : 'Add & analyze resumes'}</Button></Panel>}</div><div className="upload-sidebar"><Panel title="What happens next?"><div className="steps-list"><Step n="01" title="Upload resumes" body="Add text-based PDF or DOCX files." done /><Step n="02" title="Extract evidence" body="The analyzer finds skills, email, and stated experience." /><Step n="03" title="Calculate role match" body="The score reflects required skills found in the resume." /></div></Panel><div className="privacy-note"><div><CheckCheck size={17} /></div><span><b>Your data stays yours</b><p>Resume files are analyzed by your workspace backend.</p></span></div><Panel title="About the score"><p className="quick-tip">A skill matches only when its name or a supported equivalent appears in the resume text. Missing skills count as unmatched; no skills found produces a 0% skills score. Scanned-image OCR is not enabled.</p></Panel></div></div></>
}
function Step({ n, title, body, done }) { return <div className="step-row"><div className={cx('step-num', done && 'step-done')}>{done ? <Check size={14} /> : n}</div><div><b>{title}</b><p>{body}</p></div></div> }

function Analysis({ candidates, go, activeCandidate, openCandidate }) {
  const c = activeCandidate || candidates.slice().sort((a, b) => b.score - a.score)[0]
  if (!c) return <div className="empty-state"><FileCheck2 /><b>Upload a resume to start an AI analysis</b><Button onClick={() => go('upload')}>Upload resumes</Button></div>
  const matched = c.analysis ? c.analysis.matchedRequiredSkills : c.skills.slice(0, Math.max(2, c.skills.length - 1)); const missing = c.analysis ? c.analysis.missingRequiredSkills : ['Stakeholder management', 'A/B testing']
  return <><div className="page-heading"><div><div className="eyebrow">TALENTAI · PROFILE INTELLIGENCE</div><h1>Resume analysis</h1><p>{c.analysis ? 'Evidence extracted from the resume and compared with the selected job requirements.' : 'Understand candidate fit at a glance, backed by explainable insights.'}</p></div><Button variant="secondary" onClick={() => go('upload')}><Upload size={15} /> Analyze another</Button></div><div className="analysis-candidate panel"><Avatar person={c} /><div className="analysis-person"><b>{c.name}</b><span>{c.role} · {c.experience} experience</span></div><Badge tone="interview">Analysis complete</Badge><span className="analysis-time"><Clock3 size={13} /> Analyzed just now</span><button className="text-link" onClick={() => { openCandidate(c); go('profile') }}>View profile <ArrowRight size={13} /></button></div><div className="analysis-grid"><div className="analysis-main"><div className="match-overview panel"><div className="match-overview-left"><div className="eyebrow">{c.analysis?.intelligence ? 'CURRENT FIT' : c.analysis ? 'REQUIRED SKILL MATCH' : 'OVERALL MATCH SCORE'}</div><div className="analysis-score">{c.score}<small>%</small></div><p>Match for <b>{c.role}</b></p><div className="match-status"><span className="status-dot" />{c.analysis ? `${c.analysis.matchedSkillCount} of ${c.analysis.requiredSkillCount} required skills detected` : `Top ${Math.max(3, 100 - Math.round(c.score / 1.2))}% of candidates`}</div></div><div className="score-breakdown">{c.analysis ? <><ScoreBar label={`Required skills (${c.analysis.matchedSkillCount}/${c.analysis.requiredSkillCount})`} value={c.score} color="purple" />{c.analysis.experienceMatchPercent != null && <ScoreBar label="Stated experience" value={c.analysis.experienceMatchPercent} color="blue" />}</> : <><ScoreBar label="Skills alignment" value={c.score - 1} color="purple" /><ScoreBar label="Relevant experience" value={Math.min(c.score + 2, 99)} color="blue" /><ScoreBar label="Education" value={83} color="teal" /><ScoreBar label="Role seniority" value={94} color="orange" /></>}</div><div className="overview-spark"><Sparkles size={22} /></div></div>{c.analysis?.intelligence && <CandidateIntelligence intelligence={c.analysis.intelligence} />}<Panel title="Skills analysis" subtitle="Required skills compared with candidate profile"><div className="skill-section-title"><span className="skill-dot present" /><b>Skills found</b><span className="skill-count">{matched.length} matched</span></div><div className="skill-chips found-skills">{matched.map(s => <span key={s}>{s}<Check size={12} /></span>)}</div><div className="skill-section-title missing-title"><span className="skill-dot absent" /><b>Skills to explore</b><span className="skill-count">{missing.length} not detected</span></div><div className="skill-chips missing-skills">{missing.map(s => <span key={s}>{s}<X size={12} /></span>)}</div><div className="ai-insight"><Sparkles size={16} /><p><b>{c.analysis ? 'Analysis basis' : 'AI insight'}</b> {c.analysis ? c.analysis.summary : 'This profile shows strong overlap in core skills. Consider asking about stakeholder management and experimentation during the interview.'}</p></div></Panel><SkillGap candidate={c} /><Panel title="Experience highlights" subtitle={c.analysis ? 'Resume evidence' : 'AI-extracted career summary'}>{c.analysis ? <><div className="highlight-grid"><div><div className="highlight-icon"><BriefcaseBusiness size={16} /></div><b>{c.experience}</b><small>Stated experience</small></div><div><div className="highlight-icon hi-blue"><Activity size={16} /></div><b>{c.analysis.extractedCharacterCount.toLocaleString()}</b><small>Text characters analyzed</small></div>{c.analysis.experienceMatchPercent != null && <div><div className="highlight-icon hi-green"><Check size={16} /></div><b>{c.analysis.experienceMatchPercent}%</b><small>Of minimum required</small></div>}</div><p className="analysis-summary">{c.summary}</p></> : <><div className="highlight-grid"><div><div className="highlight-icon"><BriefcaseBusiness size={16} /></div><b>{c.experience}</b><small>Total experience</small></div><div><div className="highlight-icon hi-blue"><Activity size={16} /></div><b>3 roles</b><small>Relevant positions</small></div><div><div className="highlight-icon hi-green"><ArrowUpRight size={16} /></div><b>Growing</b><small>Career trajectory</small></div></div><p className="analysis-summary">{c.summary}</p></>}</Panel></div><div className="analysis-side"><Panel title="Role match" subtitle="Based on detected skills and role requirements"><div className="job-match-card"><div className="job-icon"><BriefcaseBusiness size={17} /></div><div><b>{c.role}</b><small>{c.analysis ? c.analysis.requiredSkillCount + ' required skills' : 'Open role'}</small></div><Score score={c.score} /></div><p className="job-match-copy">{c.analysis ? `${matched.length} required skills were found in this resume.` : `Strong alignment across ${matched.length} core skills and relevant experience.`}</p><Button variant="secondary" className="full-button" onClick={() => go('jobs')}>Compare open roles <ArrowRight size={14} /></Button></Panel><Panel title="Recommended questions" subtitle="Make the interview count"><div className="question-list"><Question n="01" text="Tell me about a project where you applied the skills most relevant to this role." /><Question n="02" text="How do you approach collaborating with cross-functional stakeholders?" /><Question n="03" text="What would you like to learn or clarify about this role?" /></div><button className="text-link generate-questions"><Sparkles size={13} /> Generate more questions</button></Panel><div className="explainable-card"><div><Sparkles size={16} /><b>Fair & explainable scoring</b></div><p>Uploaded resume scores reflect required skills detected in text. Unsupported evidence is not counted as a match.</p></div></div></div></>
}
function SkillGap({ candidate }) {
  if (candidate.analysis) {
    const missingRequiredSkills = candidate.analysis.missingRequiredSkills
    return <Panel title="Candidate skill gap" subtitle={`Required skills for ${candidate.role}`} className="skill-gap-panel"><div className="gap-compare"><div className="gap-meter"><div className="gap-meter-label"><span>Skills found</span><b>{candidate.analysis.matchedSkillCount} matched</b></div><div className="meter-caption">{candidate.analysis.matchedRequiredSkills.join(' · ') || 'No required skills were detected in the resume text.'}</div></div><div className="gap-link"><ArrowRight size={16} /></div><div className="gap-meter"><div className="gap-meter-label"><span>Role requirements</span><b>{candidate.analysis.requiredSkillCount} required</b></div><div className="meter-caption">Selected job opening: {candidate.role}</div></div></div><div className="gap-missing"><div className="gap-section-label"><span className="skill-dot absent" /><b>Required skills not detected</b><span>{missingRequiredSkills.length} missing</span></div>{missingRequiredSkills.length ? <div className="missing-skill-list">{missingRequiredSkills.map((skill, index) => <span key={skill}><b>{String(index + 1).padStart(2, '0')}</b>{skill}</span>)}</div> : <p>All listed required skills were detected in the resume text.</p>}</div></Panel>
  }
  const missing = ['Docker', 'AWS', 'Kubernetes']
  return <Panel title="Candidate skill gap" subtitle={`Current skills compared with requirements for ${candidate.role}`} className="skill-gap-panel">
    <div className="gap-compare">
      <div className="gap-meter"><div className="gap-meter-label"><span>Current skills</span><b>{candidate.skills.length} found</b></div><div className="skill-meter current-meter" aria-label={`${candidate.skills.length} current skills`}>{candidate.skills.map(skill => <i key={skill} title={skill} />)}</div><div className="meter-caption">{candidate.skills.join(' · ')}</div></div>
      <div className="gap-link"><ArrowRight size={16} /></div>
      <div className="gap-meter"><div className="gap-meter-label"><span>Required skills</span><b>{candidate.skills.length + missing.length} total</b></div><div className="skill-meter required-meter" aria-label="Required skills including three gaps">{[...candidate.skills, ...missing].map((skill, i) => <i className={i >= candidate.skills.length ? 'meter-missing' : ''} key={skill} title={skill} />)}</div><div className="meter-caption">{candidate.skills.slice(0, 3).join(' · ')} · + {missing.length} missing</div></div>
    </div>
    <div className="gap-missing"><div className="gap-section-label"><span className="skill-dot absent" /><b>Missing skills</b><span>{missing.length} to develop</span></div><div className="missing-skill-list">{missing.map((skill, i) => <span key={skill}><b>0{i + 1}</b>{skill}</span>)}</div></div>
    <div className="learning-path"><div className="learning-path-head"><div><Sparkles size={15} /><b>Suggested learning path</b></div><span>Build skills in sequence</span></div><div className="learning-steps">{[{ title: 'Docker', text: 'Container fundamentals' }, { title: 'AWS ECS / EC2', text: 'Deploy containers in the cloud' }, { title: 'Kubernetes', text: 'Orchestrate production workloads' }].map((step, i) => <div className="learning-node" key={step.title}><div className="learning-step"><div className="learning-number">{String(i + 1).padStart(2, '0')}</div><div><b>{step.title}</b><small>{step.text}</small></div></div>{i < 2 && <div className="learning-connector"><ArrowDown size={14} /></div>}</div>)}</div></div>
  </Panel>
}
function CandidateIntelligence({ intelligence }) {
  if (!intelligence) return null
  const groups = [
    ['Direct matches', intelligence.directMatches, 'direct'],
    ['Related skills', intelligence.relatedSkills, 'related'],
    ['Transferable skills', intelligence.transferableSkills, 'transfer'],
    ['Partially covered', intelligence.partiallyCoveredSkills, 'partial'],
    ['Missing skills', intelligence.missingSkills, 'missing'],
    ['Unknown', intelligence.unknownSkills, 'unknown'],
  ]
  return <Panel title="Candidate intelligence" subtitle="Evidence-backed current and potential role fit" className="candidate-intelligence-panel">
    <div className="intelligence-score-grid">
      <div className="intelligence-score current-fit"><span>Current fit</span><b>{intelligence.currentFitPercent}%</b><small>Direct requirement matches</small></div>
      <div className="intelligence-score potential-fit"><span>Potential fit</span><b>{intelligence.potentialFitPercent}%</b><small>Includes mapped transferable skills</small></div>
      <div className={`intelligence-difficulty difficulty-${String(intelligence.transitionDifficulty).toLowerCase()}`}><span>Role transition</span><b>{intelligence.transitionDifficulty}</b><small>Based on listed skill gaps</small></div>
    </div>
    <div className="intelligence-why"><b>Why this candidate?</b><p>{intelligence.explanation}</p></div>
    <div className="intelligence-groups">
      {groups.map(([title, items, tone]) => items?.length ? <details key={title} className={`intelligence-group intelligence-${tone}`} open={tone === 'transfer'}>
        <summary><span>{title}</span><b>{items.length}</b></summary>
        <ul>{items.map((item, index) => <li key={`${item.requiredSkill}-${index}`}>
          <div className="intelligence-skill-line"><b>{item.requiredSkill}</b>{item.candidateSkill && item.candidateSkill !== item.requiredSkill && <span>{item.candidateSkill} → {item.requiredSkill}</span>}</div>
          <p>{item.evidence || 'No direct evidence found.'}</p><small>{item.source} · Confidence: {item.confidence}</small>
        </li>)}</ul>
      </details> : null)}
    </div>
    {intelligence.recommendedLearning?.length > 0 && <div className="intelligence-learning"><b>Recommended learning</b><p>Build practical experience with: {intelligence.recommendedLearning.join(', ')}.</p></div>}
    {intelligence.careerTimeline?.length > 0 && <div className="intelligence-timeline"><b>Career timeline</b><ol>{intelligence.careerTimeline.map((item, index) => <li key={`${item.period}-${index}`}><strong>{item.period}</strong><span>{item.position}</span><small>{item.evidence}</small></li>)}</ol></div>}
  </Panel>
}
function ScoreBar({ label, value, color }) { return <div className="scorebar"><div><span>{label}</span><b>{value}%</b></div><div className={`score-track track-${color}`}><i style={{ width: `${value}%` }} /></div></div> }
function Question({ n, text }) { return <div className="question"><span>{n}</span><p>{text}</p><button className="icon-button"><ArrowUpRight size={14} /></button></div> }

function JobActionsMenu({ job, onEdit, onRemove }) {
  const [open, setOpen] = useState(false)
  return <div className="job-actions-wrap">
    <button type="button" className="more-button" aria-label={`Actions for ${job.title}`} aria-expanded={open} onClick={() => setOpen(value => !value)}><MoreHorizontal size={18} /></button>
    {open && <div className="job-actions-menu"><button onClick={() => { setOpen(false); onEdit(job) }}><Settings size={14} /> Edit opening</button><button className="job-remove-action" onClick={() => { setOpen(false); onRemove(job) }}><X size={14} /> Remove opening</button></div>}
  </div>
}

function Jobs({ jobs, setJobs, candidates, onViewApplicants, onToast, onRemoveJob }) {
  const emptyForm = { title: '', department: '', location: '', employmentType: 'Full-time', experience: '', overview: '', responsibilities: '', requiredSkills: '', preferredSkills: '', qualifications: '', behavioralSkills: '', companyInformation: '', benefits: '' }
  const [modal, setModal] = useState(false); const [query, setQuery] = useState('')
  const [department, setDepartment] = useState('All departments'); const [status, setStatus] = useState('All statuses')
  const [form, setForm] = useState(emptyForm); const [viewingJob, setViewingJob] = useState(null)
  const [editingJobId, setEditingJobId] = useState(null); const [jobToRemove, setJobToRemove] = useState(null)
  const visible = jobs.filter(job => (job.title.toLowerCase().includes(query.toLowerCase()) || job.department.toLowerCase().includes(query.toLowerCase())) && (department === 'All departments' || job.department === department) && (status === 'All statuses' || (status === 'Open' ? job.open && !job.filled : !job.open || job.filled)))
  const textOf = value => Array.isArray(value) ? value.join('\n') : value && typeof value === 'object' ? Object.values(value).flat().join('\n') : ''
  const parseList = value => value.split('\n').map(item => item.trim()).filter(Boolean)
  const resetForm = () => { setForm(emptyForm); setEditingJobId(null) }
  const editJob = job => {
    setEditingJobId(job.id)
    setForm({ title: job.title || '', department: job.department || '', location: job.location || '', employmentType: job.employmentType || job.type || 'Full-time', experience: job.experience || '', overview: job.overview || job.description || '', responsibilities: textOf(job.responsibilities), requiredSkills: textOf(job.requiredSkills || job.skills), preferredSkills: textOf(job.preferredSkills || job.niceToHaveSkills), qualifications: textOf(job.qualifications || (job.education ? [job.education] : [])), behavioralSkills: textOf(job.behavioralSkills), companyInformation: job.companyInformation || job.aboutCompany || '', benefits: textOf(job.benefits) })
    setModal(true)
  }
  const saveJob = event => {
    event.preventDefault()
    if (!form.title.trim()) return
    const requiredSkills = parseList(form.requiredSkills)
    const updates = { title: form.title.trim(), department: form.department || 'General', location: form.location || 'Remote', employmentType: form.employmentType || 'Full-time', type: form.employmentType || 'Full-time', experience: form.experience.trim(), overview: form.overview.trim(), description: form.overview.trim(), responsibilities: parseList(form.responsibilities), requiredSkills, skills: requiredSkills, preferredSkills: parseList(form.preferredSkills), qualifications: parseList(form.qualifications), behavioralSkills: parseList(form.behavioralSkills), companyInformation: form.companyInformation.trim(), benefits: parseList(form.benefits) }
    if (editingJobId) { setJobs(current => current.map(job => job.id === editingJobId ? { ...job, ...updates } : job)); onToast(`Updated ${updates.title}`) }
    else { setJobs(current => [{ id: Date.now(), ...updates, applicants: 0, open: true }, ...current]); onToast(`${updates.title} created`) }
    setModal(false); resetForm()
  }
  const removeJob = () => { if (!jobToRemove) return; onRemoveJob(jobToRemove); onToast(`${jobToRemove.title} removed`); setJobToRemove(null) }
  const applicantList = job => candidates.filter(candidate => candidate.jobId === job.id || (!candidate.jobId && candidate.role === job.title))
  const viewingApplicants = viewingJob ? applicantList(viewingJob) : []
  const closedPipeline = [
    { title: 'Applied', tone: 'purple', filter: () => true },
    { title: 'Screened', tone: 'blue', filter: candidate => candidate.stage !== 'New' },
    { title: 'Interviewed', tone: 'teal', filter: candidate => ['Interview', 'Offer', 'Hired'].includes(candidate.stage) },
    { title: 'Offered', tone: 'orange', filter: candidate => ['Offer', 'Hired'].includes(candidate.stage) },
    { title: 'Hired', tone: 'green', filter: candidate => candidate.stage === 'Hired' },
  ].map(stage => ({ ...stage, count: viewingApplicants.filter(stage.filter).length }))
  const detailList = items => items?.length ? <ul className="job-detail-list">{items.map(item => <li key={item}>{item}</li>)}</ul> : <p className="job-detail-empty">Not specified</p>
  const setField = (key, value) => setForm(current => ({ ...current, [key]: value }))
  const formSections = [
    ['Responsibilities', 'responsibilities', 'One responsibility per line'],
    ['Required Skills', 'requiredSkills', 'One required skill per line'],
    ['Preferred Skills', 'preferredSkills', 'One preferred skill per line'],
    ['Qualifications', 'qualifications', 'Education, certifications, or other qualifications'],
    ['Behavioral Skills', 'behavioralSkills', 'One behavioral skill per line'],
    ['Benefits', 'benefits', 'One benefit per line'],
  ]
  return <><div className="page-heading"><div><div className="eyebrow">YOUR TEAM IS GROWING</div><h1>Job openings</h1><p>Create and manage roles, then find the right people faster.</p></div><Button onClick={() => { resetForm(); setModal(true) }}><Plus size={16} /> Create a job</Button></div>
    <div className="job-summary-grid"><div className="job-summary"><span>Open roles</span><b>{jobs.filter(job => job.open).length}</b><small><i /> Live openings</small></div><div className="job-summary"><span>Total applicants</span><b>{candidates.length}</b><small className="positive-small"><ArrowUpRight size={12} /> Across all openings</small></div><div className="job-summary"><span>Avg. applicants per role</span><b>{jobs.length ? (candidates.length / jobs.length).toFixed(1) : '0'}</b><small>In this sample workspace</small></div><div className="job-summary"><span>Roles closing soon</span><b>02</b><small>Within the next 14 days</small></div></div>
    <div className="filterbar jobs-filter"><label className="table-search"><Search size={16} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search job titles..." /></label><StyledSelect label="Filter jobs by department" value={department} onChange={setDepartment} options={[{ value: 'All departments', label: 'All departments' }, ...[...new Set(jobs.map(job => job.department))].map(value => ({ value, label: value }))]} className="job-filter-select" /><StyledSelect label="Filter jobs by status" value={status} onChange={setStatus} options={[{ value: 'All statuses', label: 'All statuses' }, { value: 'Open', label: 'Open' }, { value: 'Closed', label: 'Closed' }]} className="job-filter-select" /><button className="filter-button"><ListFilter size={15} /> More filters</button></div>
    <div className="jobs-grid">{visible.map(job => { const applicants = applicantList(job); const skills = job.requiredSkills ? (Array.isArray(job.requiredSkills) ? job.requiredSkills : Object.values(job.requiredSkills).flat()) : job.skills || []; const closed = !job.open || job.filled; return <div className="job-card panel" key={job.id}><div className="job-card-top"><div className={`job-card-icon ${job.department === 'Engineering' ? 'job-blue' : job.department === 'Product' ? 'job-mint' : ''}`}><BriefcaseBusiness size={18} /></div><JobActionsMenu job={job} onEdit={editJob} onRemove={setJobToRemove} /></div><div className="job-title-row"><button type="button" className="job-title-button" onClick={() => setViewingJob(job)}>{job.title}</button><Badge tone={closed ? 'closed' : 'open'}>{job.filled ? 'Filled' : job.open ? 'Open' : 'Closed'}</Badge></div><div className="job-card-meta">{job.department}<span>·</span>{job.location}<span>·</span>{job.employmentType || job.type}</div><div className="skill-chips job-skills">{skills.slice(0, 4).map(skill => <span key={skill}>{skill}</span>)}</div><div className="job-card-footer"><div className="applicant-avatars">{applicants.slice(0, 3).map(candidate => <Avatar key={candidate.id} person={candidate} size="xs" />)}{applicants.length > 3 && <i>+{applicants.length - 3}</i>}<span>{applicants.length} applicants</span></div><button className="icon-button" aria-label={`View ${applicants.length} applicants for ${job.title}`} onClick={() => onViewApplicants(job)}><ArrowRight size={16} /></button></div></div>})}<button className="new-job-card" onClick={() => { resetForm(); setModal(true) }}><div><Plus size={20} /></div><b>Create a new role</b><span>Start with a job description, and let AI help.</span></button></div>
    {modal && <div className="modal-backdrop" onClick={() => { setModal(false); resetForm() }}><form className="job-modal job-structured-form" onSubmit={saveJob} onClick={event => event.stopPropagation()}><div className="modal-head"><div><div className="eyebrow">{editingJobId ? 'EDIT OPENING' : 'NEW OPENING'}</div><h2>{editingJobId ? 'Edit job opening' : 'Create a job'}</h2><p>Complete the role profile. You can add or revise these details later.</p></div><button type="button" className="icon-button" aria-label="Close" onClick={() => { setModal(false); resetForm() }}><X size={18} /></button></div><div className="job-form-scroll"><div className="job-form-section"><h3>Basic Information</h3><label>Job title<input required placeholder="e.g. Senior Product Designer" value={form.title} onChange={event => setField('title', event.target.value)} /></label><div className="form-two"><label>Department<input placeholder="e.g. Engineering" value={form.department} onChange={event => setField('department', event.target.value)} /></label><label>Location<input placeholder="e.g. Chennai or Remote" value={form.location} onChange={event => setField('location', event.target.value)} /></label><label>Employment Type<input placeholder="e.g. Full-time, Contract" value={form.employmentType} onChange={event => setField('employmentType', event.target.value)} /></label><label>Experience<input placeholder="e.g. 5+ years" value={form.experience} onChange={event => setField('experience', event.target.value)} /></label></div></div><div className="job-form-section"><h3>Job Overview</h3><label>Overview<textarea rows="4" placeholder="Summarize the role and its impact" value={form.overview} onChange={event => setField('overview', event.target.value)} /></label></div>{formSections.slice(0, 3).map(([label, key, hint]) => <div className="job-form-section" key={key}><h3>{label}</h3><label className="job-list-input"><span>{label}</span><textarea rows="3" placeholder={hint} value={form[key]} onChange={event => setField(key, event.target.value)} /><small>{hint}</small></label></div>)}<div className="job-form-section"><h3>Qualifications </h3><label className="job-list-input"><span>Qualifications</span><textarea rows="3" placeholder="Education, certifications, or equivalent experience" value={form.qualifications} onChange={event => setField('qualifications', event.target.value)} /></label></div><div className="job-form-section"><h3>Behavioral Skills </h3><label className="job-list-input"><span>Behavioral skills</span><textarea rows="3" placeholder="Collaboration, communication, adaptability" value={form.behavioralSkills} onChange={event => setField('behavioralSkills', event.target.value)} /></label></div><div className="job-form-section"><h3>Company Information</h3><label>About the company<textarea rows="3" placeholder="Company, team, and culture information" value={form.companyInformation} onChange={event => setField('companyInformation', event.target.value)} /></label></div><div className="job-form-section"><h3>Benefits </h3><label className="job-list-input"><span>Benefits</span><textarea rows="3" placeholder="One benefit per line" value={form.benefits} onChange={event => setField('benefits', event.target.value)} /></label></div></div><div className="modal-actions"><Button type="button" variant="secondary" onClick={() => { setModal(false); resetForm() }}>Cancel</Button><Button type="submit"><Check size={15} /> {editingJobId ? 'Save changes' : 'Create opening'}</Button></div></form></div>}
    {viewingJob && <div className="modal-backdrop" onClick={() => setViewingJob(null)}><section className="job-modal job-detail-modal" role="dialog" aria-modal="true" aria-labelledby="job-detail-title" onClick={event => event.stopPropagation()}><div className="modal-head"><div><div className="eyebrow">{viewingJob.department.toUpperCase()} · {viewingJob.filled ? 'FILLED ROLE' : viewingJob.open ? 'OPEN ROLE' : 'CLOSED ROLE'}</div><h2 id="job-detail-title">{viewingJob.title}</h2><p>{viewingJob.location} · {viewingJob.employmentType || viewingJob.type}</p></div><button type="button" className="icon-button" aria-label="Close role details" onClick={() => setViewingJob(null)}><X size={18} /></button></div><div className="job-detail-body"><div className="job-detail-section"><h3>Basic Information</h3><div className="job-detail-facts"><div><small>JOB TITLE</small><b>{viewingJob.title}</b></div><div><small>DEPARTMENT</small><b>{viewingJob.department}</b></div><div><small>LOCATION</small><b>{viewingJob.location}</b></div><div><small>EMPLOYMENT TYPE</small><b>{viewingJob.employmentType || viewingJob.type}</b></div><div><small>EXPERIENCE</small><b>{viewingJob.experience || 'Not specified'}</b></div></div></div>{(!viewingJob.open || viewingJob.filled) && <div className="job-detail-section closed-job-pipeline"><h3>Candidate Pipeline</h3><p>Application progress for this {viewingJob.filled ? 'filled' : 'closed'} opening</p><div className="funnel">{closedPipeline.map(stage => <FunnelRow key={stage.title} title={stage.title} n={stage.count.toLocaleString()} pct={`${viewingApplicants.length ? Math.round((stage.count / viewingApplicants.length) * 1000) / 10 : 0}%`} width={viewingApplicants.length ? (stage.count / viewingApplicants.length) * 100 : 0} tone={stage.tone} />)}</div>{viewingApplicants.length === 0 && <p className="job-detail-empty">No candidates are linked to this opening.</p>}</div>}<div className="job-detail-section"><h3>Job Overview</h3><p>{viewingJob.overview || viewingJob.description || 'No overview has been added for this role yet.'}</p></div><div className="job-detail-section"><h3>Responsibilities</h3>{detailList(viewingJob.responsibilities)}</div><div className="job-detail-section"><h3>Required Skills</h3>{viewingJob.requiredSkills && !Array.isArray(viewingJob.requiredSkills) ? Object.entries(viewingJob.requiredSkills).map(([group, skills]) => <div className="job-skill-group" key={group}><b>{group}</b><div className="job-detail-requirements">{skills.map(skill => <span key={skill}><Check size={13} />{skill}</span>)}</div></div>) : <div className="job-detail-requirements">{(viewingJob.requiredSkills || viewingJob.skills || []).map(skill => <span key={skill}><Check size={13} />{skill}</span>)}</div>}</div><div className="job-detail-section"><h3>Preferred Skills</h3>{detailList(viewingJob.preferredSkills || viewingJob.niceToHaveSkills)}</div><div className="job-detail-section"><h3>Qualifications</h3>{detailList(viewingJob.qualifications || (viewingJob.education ? [viewingJob.education] : []))}</div><div className="job-detail-section"><h3>Behavioral Skills</h3>{detailList(viewingJob.behavioralSkills)}</div><div className="job-detail-section"><h3>Company Information</h3><p>{viewingJob.companyInformation || viewingJob.aboutCompany || 'Company information has not been added.'}</p></div><div className="job-detail-section"><h3>Benefits</h3>{detailList(viewingJob.benefits)}</div><div className="job-detail-actions"><Button variant="secondary" onClick={() => { setViewingJob(null); onViewApplicants(viewingJob) }}><Users size={14} /> View applicants</Button><Button onClick={() => { const job = viewingJob; setViewingJob(null); editJob(job) }}><Settings size={14} /> Edit opening</Button></div></div></section></div>}
    {jobToRemove && <div className="modal-backdrop" onClick={() => setJobToRemove(null)}><div className="remove-candidate-modal" role="alertdialog" aria-modal="true" onClick={event => event.stopPropagation()}><div className="remove-candidate-icon"><X size={18} /></div><h2>Remove {jobToRemove.title}?</h2><p>This will remove the job opening. Candidate profiles will remain in your workspace.</p><div className="remove-candidate-actions"><Button variant="secondary" onClick={() => setJobToRemove(null)}>Cancel</Button><Button className="button-danger" onClick={removeJob}>Remove opening</Button></div></div></div>}
  </>
}
function Analytics({ candidates, jobs }) {
  const [selectedRole, setSelectedRole] = useState('all')
  const [timeRange, setTimeRange] = useState('30')
  const role = jobs.find(job => String(job.id) === selectedRole)
  const rangeLabel = timeRange === '365' ? '1 year' : `${timeRange} days`
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - Number(timeRange) + 1)
  cutoff.setHours(0, 0, 0, 0)
  const actualCandidates = candidates.filter(candidate => applicationDate(candidate) >= cutoff)
  const sampleCandidates = useMemo(() => {
    const sampleCutoff = new Date()
    sampleCutoff.setDate(sampleCutoff.getDate() - Number(timeRange) + 1)
    sampleCutoff.setHours(0, 0, 0, 0)
    return buildSampleCandidates(365, jobs).filter(candidate => applicationDate(candidate) >= sampleCutoff)
  }, [timeRange, jobs])
  const roleMatches = candidate => !role || candidate.jobId === role.id || (!candidate.jobId && candidate.role === role.title)
  const reportCandidates = [...actualCandidates.filter(roleMatches), ...sampleCandidates.filter(roleMatches)]
  const generatedCandidates = reportCandidates.filter(candidate => candidate.isSample)
  const funnelStages = [
    { title: 'Applied', tone: 'purple', matches: () => true },
    { title: 'Screened', tone: 'blue', matches: candidate => candidate.stage !== 'New' },
    { title: 'Interviewed', tone: 'teal', matches: candidate => ['Interview', 'Offer', 'Hired'].includes(candidate.stage) },
    { title: 'Offered', tone: 'orange', matches: candidate => ['Offer', 'Hired'].includes(candidate.stage) },
    { title: 'Hired', tone: 'green', matches: candidate => candidate.stage === 'Hired' },
  ].map(stage => ({ ...stage, count: reportCandidates.filter(stage.matches).length }))
  const total = reportCandidates.length
  const interviewed = reportCandidates.filter(candidate => ['Interview', 'Offer', 'Hired'].includes(candidate.stage)).length
  const offers = reportCandidates.filter(candidate => ['Offer', 'Hired'].includes(candidate.stage)).length
  const hired = reportCandidates.filter(candidate => candidate.stage === 'Hired').length
  const generatedInterviews = generatedCandidates.filter(candidate => ['Interview', 'Offer', 'Hired'].includes(candidate.stage)).length
  const acceptance = offers ? `${Math.round((hired / offers) * 100)}%` : '—'
  const sourceColors = ['#8a6cf0', '#56b39f', '#6ca9eb', '#f3b471', '#df8c9a']
  const sourceCounts = reportCandidates.reduce((result, candidate) => { const source = candidate.source || 'Other'; result[source] = (result[source] || 0) + 1; return result }, {})
  const sources = Object.entries(sourceCounts).map(([name, value], index) => ({ name, value, percentage: Math.round((value / Math.max(total, 1)) * 100), color: sourceColors[index % sourceColors.length] }))
  const departmentJobs = role ? [role] : jobs
  const jobCounts = departmentJobs.map(job => ({ job, count: reportCandidates.filter(candidate => candidate.jobId === job.id || (!candidate.jobId && candidate.role === job.title)).length }))
  const quote = value => `"${String(value ?? '').replaceAll('"', '""')}"`
  const exportReport = () => {
    const rows = [
      ['TalentAI Recruitment Analytics'], ['Generated', new Date().toLocaleString()], ['Opening', role?.title || 'All roles'], ['Time period', `Last ${rangeLabel}`],
      ['Generated sample applicants', generatedCandidates.length], ['Generated sample interviews', generatedInterviews], [],
      ['Metric', 'Value'], ['Total applicants', total], ['Candidates in interview stage', interviewed], ['Offers extended', offers], ['Offer acceptance', acceptance], [],
      ['Pipeline stage', 'Candidates'], ...funnelStages.map(stage => [stage.title, stage.count]), [],
      ['Record type', 'Candidate', 'Job opening', 'Stage', 'AI match', 'Application date', 'Source'],
      ...reportCandidates.map(candidate => [candidate.isSample ? 'Generated sample' : 'Candidate record', candidate.name, candidate.role, candidate.stage, `${candidate.score}%`, candidate.applied, candidate.source]),
    ]
    const csv = rows.map(row => row.map(quote).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a'); link.href = url; link.download = `talentai-recruitment-report-${new Date().toISOString().slice(0, 10)}.csv`; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url)
  }
  const spark = value => [8, 12, 15, 13, 18, Math.min(25, 15 + value), 22]
  return <><div className="page-heading"><div><div className="eyebrow">DATA-DRIVEN HIRING</div><h1>Recruitment analytics</h1><p>Understand your funnel and make every hire count.</p></div><Button variant="secondary" onClick={exportReport}><FileOutput size={15} /> Export report</Button></div>
    <div className="analytics-period"><span>Showing data for</span><StyledSelect label="Analytics time range" value={timeRange} onChange={setTimeRange} options={[{ value: '7', label: 'Last 7 days' }, { value: '30', label: 'Last 30 days' }, { value: '90', label: 'Last 90 days' }, { value: '365', label: 'Last 1 year' }]} className="analytics-range-select" /></div>
    <div className="analytics-grid"><Panel title="Application funnel" subtitle="Candidate conversion by hiring stage" action={<StyledSelect label="Filter analytics by job opening" value={selectedRole} onChange={setSelectedRole} options={[{ value: 'all', label: 'All roles' }, ...jobs.map(job => ({ value: String(job.id), label: job.title }))]} className="analytics-role-select" />}><div className="funnel">{funnelStages.map(stage => <FunnelRow key={stage.title} title={stage.title} n={stage.count.toLocaleString()} pct={`${total ? Math.round((stage.count / total) * 1000) / 10 : 0}%`} width={total ? (stage.count / total) * 100 : 0} tone={stage.tone} />)}</div>{!total && <div className="analytics-empty">No applicants are linked to this opening yet.</div>}</Panel></div>
    <div className="stats-grid analytics-stats"><StatCard title="Total applicants" value={total.toLocaleString()} change="" note="includes generated sample records" icon={Users} tone="violet" spark={spark(total)} /><StatCard title="In interview stage" value={interviewed.toLocaleString()} change="" note={`${generatedInterviews} generated sample interviews`} icon={CalendarDays} tone="blue" spark={spark(interviewed)} /><StatCard title="Offers extended" value={offers.toLocaleString()} change="" note="offers and accepted offers" icon={FileCheck2} tone="orange" spark={spark(offers)} /><StatCard title="Offer acceptance" value={acceptance} change="" note={offers ? `${hired} hired of ${offers} offers` : 'No offers in this sample'} icon={CheckCheck} tone="green" spark={spark(hired)} /></div>
    <Panel title="Candidate sources" subtitle={`Where ${role ? 'this opening’s applicants' : 'applicants'} came from`}><div className="source-chart"><div className="source-donut"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={sources} dataKey="value" innerRadius={51} outerRadius={68} paddingAngle={3} stroke="none">{sources.map(source => <Cell key={source.name} fill={source.color} />)}</Pie></PieChart></ResponsiveContainer><div className="donut-center"><b>{total.toLocaleString()}</b><small>Applicants</small></div></div>{sources.length ? <div className="source-list">{sources.map(source => <div key={source.name}><i style={{ background: source.color }} /><span>{source.name}</span><b>{source.percentage}%</b></div>)}</div> : <span className="analytics-empty">No source data available</span>}</div></Panel>
    <Panel title={role ? 'Applicants for this opening' : 'Applicants by opening'} subtitle="Candidate profiles assigned to each job" className="time-panel"><div className="time-bars">{jobCounts.map(({ job, count }, index) => <div key={job.id}><span title={job.title}>{job.title}</span><div className="time-track"><i className={`time-${['lavender', 'blue', 'mint', 'orange'][index % 4]}`} style={{ width: `${Math.max(2, (count / Math.max(...jobCounts.map(item => item.count), 1)) * 100)}%` }} /></div><b>{count} {count === 1 ? 'candidate' : 'candidates'}</b></div>)}</div></Panel>
  </>
}
function FunnelRow({ title, n, pct, width, tone }) { return <div className="funnel-row"><span>{title}</span><div className="funnel-bar"><i className={`funnel-${tone}`} style={{ width: `${width}%` }} /></div><b>{n}</b><small>{pct}</small></div> }

function Assistant({ candidates, jobs, go }) {
  const greeting = { role: 'assistant', text: 'Hi Sarah! I’m TalentAI, your recruiting copilot. I can help you find candidates, summarize profiles, draft job descriptions, or answer hiring questions. What are we working on today?', time: '10:42 AM' }
  const [messages, setMessages] = useState([greeting]); const [input, setInput] = useState(''); const [history, setHistory] = useState(() => { try { return JSON.parse(localStorage.getItem('talentai-assistant-history') || '[]') } catch { return [] } }); const [historyOpen, setHistoryOpen] = useState(false); const chatBodyRef = useRef(null); const latestAssistantRef = useRef(null)
  useEffect(() => {
    const chatBody = chatBodyRef.current
    const latestResponse = latestAssistantRef.current
    if (chatBody && latestResponse) {
      const bodyTop = chatBody.getBoundingClientRect().top
      const responseTop = latestResponse.getBoundingClientRect().top
      chatBody.scrollTo({ top: chatBody.scrollTop + responseTop - bodyTop - 8, behavior: 'smooth' })
    }
  }, [messages])
  const suggestions = ['Find high-potential candidates', 'Summarize this week’s pipeline', 'Draft a job description']
  const send = text => { const value = (text || input).trim(); if (!value) return; const answer = answerFor(value, candidates, jobs); const nextMessages = [...messages, { role: 'user', text: value, time: 'Just now' }, { role: 'assistant', text: answer, time: 'Just now' }]; const nextHistory = [{ id: Date.now(), prompt: value, answer, time: new Date().toLocaleString() }, ...history].slice(0, 12); setMessages(nextMessages); setHistory(nextHistory); localStorage.setItem('talentai-assistant-history', JSON.stringify(nextHistory)); setInput('') }
  return <><div className="page-heading"><div><div className="eyebrow">YOUR RECRUITING COPILOT</div><h1>AI assistant <span className="online-pill"><i /> Online</span></h1><p>Ask questions, find talent, and move faster with AI.</p></div><div className="assistant-history-wrap"><Button variant="secondary" onClick={() => setHistoryOpen(value => !value)} aria-expanded={historyOpen}><MoreHorizontal size={16} /> History</Button>{historyOpen && <div className="assistant-history-menu"><b>Recent questions</b>{history.length ? history.map(item => <button key={item.id} onClick={() => { setMessages([greeting, { role: 'user', text: item.prompt, time: item.time }, { role: 'assistant', text: item.answer, time: item.time }]); setHistoryOpen(false) }}>{item.prompt}<small>{item.time}</small></button>) : <p>No questions yet. Your recent prompts will appear here.</p>}{history.length > 0 && <button className="assistant-history-clear" onClick={() => { setHistory([]); localStorage.removeItem('talentai-assistant-history') }}>Clear history</button>}</div>}</div></div><div className="assistant-layout"><div className="chat-panel"><div className="chat-top"><div className="chat-avatar"><Sparkles size={19} /></div><div><b>TalentAI assistant</b><small><i /> Ready to help</small></div><button className="more-button" aria-label="Start a new conversation" title="Start a new conversation" onClick={() => setMessages([greeting])}><MoreHorizontal size={19} /></button></div><div className="chat-body" ref={chatBodyRef}>{messages.map((m, i) => <div className={`chat-message ${m.role}`} key={i} ref={m.role === 'assistant' && i === messages.length - 1 ? latestAssistantRef : null}>{m.role === 'assistant' ? <div className="message-avatar"><Sparkles size={14} /></div> : <Avatar person={{ initials: 'SC', color: 'blue' }} size="xs" />}<div className="message-content"><div className="message-bubble">{m.text}</div><small>{m.time}</small></div></div>)}{messages.length === 1 && <div className="suggestion-wrap"><span>TRY ASKING</span><div>{suggestions.map(s => <button key={s} onClick={() => send(s)}><Sparkles size={13} />{s}<ArrowUpRight size={13} /></button>)}</div></div>}</div><form className="chat-input" onSubmit={e => { e.preventDefault(); send() }}><button type="button" className="icon-button" aria-label="Upload a resume" title="Upload a resume" onClick={() => go('upload')}><Paperclip size={17} /></button><input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask TalentAI anything..." /><button type="button" className="icon-button" aria-label="Insert a suggested question" onClick={() => setInput(value => value ? `${value} ` : 'Find the best candidates for ')}><Smile size={17} /></button><Button type="submit" className="send-button" aria-label="Send message"><Send size={16} /></Button></form><div className="chat-disclaimer">Responses use the candidates and openings currently loaded in your workspace.</div></div><div className="assistant-side"><Panel title="Things I can help with"><div className="capability-list"><Capability icon={Search} title="Find candidates" text="Search your talent pool by skills, experience, or fit." onClick={() => send('Find candidates')} /><Capability icon={FileText} title="Summarize profiles" text="Get key details from your candidate profiles." onClick={() => send('Summarize profiles')} /><Capability icon={BriefcaseBusiness} title="Write job descriptions" text="Draft a role description from a listed opening." onClick={() => send('Write a job description')} /><Capability icon={Activity} title="Understand your funnel" text="See stage counts from the current candidate pipeline." onClick={() => send('Understand my hiring funnel')} /></div></Panel><div className="privacy-note"><div><Sparkles size={16} /></div><span><b>Workspace-aware assistance</b><p>Answers are generated from the current candidate and job opening data.</p></span></div></div></div></>
}
function answerFor(prompt, candidates, jobs) {
  const p = prompt.toLowerCase()
  const targetJob = jobs.find(job => p.includes(job.title.toLowerCase()))
  const withIntelligence = candidates.filter(candidate => candidate.analysis?.intelligence
    && (!targetJob || candidate.analysis.roleTitle === targetJob.title))
  const namedCandidate = candidates.find(candidate => p.includes(candidate.name.toLowerCase()))
  if (p.includes('why') && (p.includes('recommend') || p.includes('candidate'))) {
    const candidate = namedCandidate || withIntelligence.slice().sort((a, b) => b.analysis.intelligence.potentialFitPercent - a.analysis.intelligence.potentialFitPercent)[0]
    if (!candidate?.analysis?.intelligence) return 'I need a resume analysis for that candidate and target role before I can explain a recommendation. No direct evidence will be assumed.'
    return `${candidate.name} — ${candidate.analysis.roleTitle}. Current fit: ${candidate.analysis.intelligence.currentFitPercent}%; potential fit: ${candidate.analysis.intelligence.potentialFitPercent}%; transition difficulty: ${candidate.analysis.intelligence.transitionDifficulty}. ${candidate.analysis.intelligence.explanation}`
  }
  if (p.includes('transfer')) {
    const candidate = namedCandidate || withIntelligence[0]
    if (!candidate?.analysis?.intelligence) return 'No resume-backed transferable-skill analysis is available yet. Analyze a resume against a job opening first.'
    const skills = candidate.analysis.intelligence.transferableSkills
    return skills.length ? `${candidate.name} — transferable skills for ${candidate.analysis.roleTitle}: ${skills.map(item => `${item.candidateSkill} → ${item.requiredSkill} (evidence: ${item.evidence})`).join('; ')}` : `${candidate.name}: no explicitly mapped transferable skills were found for ${candidate.analysis.roleTitle}.`
  }
  if (p.includes('smallest') && (p.includes('gap') || p.includes('skill'))) {
    const ranked = withIntelligence.slice().sort((a, b) => a.analysis.intelligence.missingSkills.length - b.analysis.intelligence.missingSkills.length)
    return ranked.length ? `Candidates with the fewest missing required skills${targetJob ? ` for ${targetJob.title}` : ''}: ${ranked.slice(0, 5).map(candidate => `${candidate.name} (${candidate.analysis.intelligence.missingSkills.length} missing; ${candidate.analysis.intelligence.currentFitPercent}% current fit; ${candidate.analysis.intelligence.potentialFitPercent}% potential fit)`).join('; ')}.` : 'No analyzed resumes are available for skill-gap ranking yet.'
  }
  if (p.includes('potential') || p.includes('transition') || /current fit.*(?:below|under|less than|<)/.test(p)) {
    const currentLimit = Number(p.match(/current fit\s*(?:below|under|less than|<)\s*(\d+)/)?.[1])
    const potentialLimit = Number(p.match(/potential fit\s*(?:above|over|greater than|>)\s*(\d+)/)?.[1])
    const minimumPotential = Number.isFinite(potentialLimit) && potentialLimit > 0 ? potentialLimit : (p.includes('high potential') || p.includes('could transition') ? 70 : 0)
    const matches = withIntelligence.filter(candidate => {
      const intel = candidate.analysis.intelligence
      return (!Number.isFinite(currentLimit) || currentLimit <= 0 || intel.currentFitPercent < currentLimit)
        && (Number.isFinite(potentialLimit) && potentialLimit > 0 ? intel.potentialFitPercent > potentialLimit : intel.potentialFitPercent >= minimumPotential)
        && (p.includes('could transition') ? intel.transitionDifficulty !== 'HIGH' : true)
    }).sort((a, b) => b.analysis.intelligence.potentialFitPercent - a.analysis.intelligence.potentialFitPercent)
    return matches.length ? `Resume-backed potential matches${targetJob ? ` for ${targetJob.title}` : ''}: ${matches.slice(0, 5).map(candidate => `${candidate.name} — current fit ${candidate.analysis.intelligence.currentFitPercent}%, potential fit ${candidate.analysis.intelligence.potentialFitPercent}%, ${candidate.analysis.intelligence.transitionDifficulty} transition`).join('; ')}.` : `No analyzed candidates meet those fit criteria${targetJob ? ` for ${targetJob.title}` : ''}.`
  }
  if (p.includes('summar')) {
    const requested = candidates.find(candidate => p.includes(candidate.name.toLowerCase()))
    const list = requested ? [requested] : candidates.slice().sort((a, b) => b.score - a.score).slice(0, 3)
    return list.length ? list.map(candidate => `${candidate.name} — ${candidate.role}, ${candidate.stage} stage, ${candidate.score}% match. Skills: ${candidate.skills?.join(', ') || 'not listed'}. ${candidate.summary || ''}`).join('\n\n') : 'There are no candidate profiles to summarize yet.'
  }
  if (p.includes('funnel') || p.includes('pipeline') || p.includes('week')) {
    const stageNames = ['New', 'Screening', 'Shortlisted', 'Interview', 'Offer', 'Hired']
    const counts = stageNames.map(stage => `${stage}: ${candidates.filter(candidate => candidate.stage === stage).length}`)
    return `Hiring funnel from the current candidate list (${candidates.length} total): ${counts.join(' · ')}. Open roles: ${jobs.filter(job => job.open && !job.filled).length}; closed or filled roles: ${jobs.filter(job => !job.open || job.filled).length}.`
  }
  if (p.includes('job') || p.includes('description') || p.includes('draft')) {
    const job = jobs.find(item => p.includes(item.title.toLowerCase())) || jobs.find(item => item.open && !item.filled) || jobs[0]
    if (!job) return 'There are no job openings yet. Create a job opening first, then I can draft a description from its role information.'
    const list = values => (Array.isArray(values) ? values : Object.values(values || {}).flat()).filter(Boolean).join('; ') || 'To be defined with the hiring team.'
    return `JOB DESCRIPTION — ${job.title}\n${job.department || 'General'} · ${job.location || 'Location flexible'} · ${job.employmentType || job.type || 'Full-time'}\n\nABOUT THE ROLE\n${job.overview || job.description || 'Join the team to deliver meaningful outcomes in this role.'}\n\nRESPONSIBILITIES\n${list(job.responsibilities)}\n\nREQUIRED SKILLS\n${list(job.requiredSkills || job.skills)}\n\nPREFERRED SKILLS\n${list(job.preferredSkills || job.niceToHaveSkills)}\n\nQUALIFICATIONS\n${list(job.qualifications)}\n\nBENEFITS\n${list(job.benefits)}`
  }
  if (p.includes('candidate') || p.includes('top') || p.includes('find') || p.includes('search')) {
    const role = jobs.find(job => p.includes(job.title.toLowerCase()))
    const requestedSkill = prompt.match(/(?:\bwith\b|\bskilled in\b|\bskill(?:s)?\s*:\s*)(.+)$/i)?.[1]?.trim()
    const minimumYears = Number.parseFloat(prompt.match(/(\d+(?:\.\d+)?)\s*\+?\s*(?:years?|yrs?)/i)?.[1])
    const skillHits = candidates.map(candidate => ({ candidate, hits: (candidate.skills || []).filter(skill => requestedSkill ? requestedSkill.toLowerCase().includes(skill.toLowerCase()) || skill.toLowerCase().includes(requestedSkill.toLowerCase()) : p.includes(skill.toLowerCase())).length }))
    let matches = skillHits.filter(item => item.hits > 0).map(item => item.candidate)
    if (role) matches = candidates.filter(candidate => String(candidate.jobId) === String(role.id) || candidate.role === role.title)
    else {
      if (!requestedSkill && Number.isFinite(minimumYears)) matches = candidates.slice()
      if (Number.isFinite(minimumYears)) matches = matches.filter(candidate => Number.parseFloat(candidate.experience) >= minimumYears)
      if (!matches.length && !requestedSkill && !Number.isFinite(minimumYears)) matches = candidates.slice()
    }
    matches.sort((left, right) => right.score - left.score)
    return matches.length ? `Candidates matching your request:\n${matches.slice(0, 5).map((candidate, index) => `${index + 1}. ${candidate.name} — ${candidate.role} · ${candidate.stage} · ${candidate.score}% match${candidate.skills?.length ? ` · ${candidate.skills.slice(0, 4).join(', ')}` : ''}`).join('\n')}` : `No candidates currently match ${role?.title || requestedSkill || 'that search'}. Try another role or skill.`
  }
  return `I can help with candidates, profile summaries, job descriptions, or funnel counts. I currently see ${candidates.length} candidate profiles and ${jobs.length} job openings. Try a name, skill, or role title to narrow a request.`
}
function Capability({ icon: Icon, title, text, onClick }) { return <button type="button" className="capability" onClick={onClick}><span className="capability-icon"><Icon size={15} /></span><span><b>{title}</b><small>{text}</small></span><ChevronRight size={14} /></button> }

function SettingsPage() {
  const [tab, setTab] = useState('Profile'); const [saved, setSaved] = useState(false)
  const [timezone, setTimezone] = useState('Pacific Time (US & Canada)')
  return <><div className="page-heading"><div><div className="eyebrow">WORKSPACE PREFERENCES</div><h1>Settings</h1><p>Manage your profile, workspace, and hiring preferences.</p></div></div><div className="settings-layout"><div className="settings-nav">{['Profile', 'Workspace', 'Notifications', 'AI preferences', 'Integrations', 'Billing'].map((t, i) => <button key={t} className={cx(tab === t && 'settings-active')} onClick={() => setTab(t)}>{[Users, BriefcaseBusiness, Bell, Sparkles, Globe2, FileText].map((I, j) => j === i ? <I key={j} size={16} /> : null)}{t}</button>)}</div><div className="settings-content"><Panel title={tab} subtitle={tab === 'Profile' ? 'Update your personal details and profile photo.' : `Manage your ${tab.toLowerCase()} preferences.`}><div className="settings-avatar-row"><Avatar person={{ initials: 'SC', color: 'blue' }} size="lg" /><div><b>Profile photo</b><small>JPG, GIF or PNG. 1MB max.</small></div><Button variant="secondary">Upload photo</Button></div><div className="settings-form"><div className="form-two"><label>First name<input defaultValue="Sarah" /></label><label>Last name<input defaultValue="Chen" /></label></div><label>Email address<input defaultValue="sarah.chen@acme.co" type="email" /></label><label>Job title<input defaultValue="Recruiting lead" /></label><label>Time zone<StyledSelect label="Time zone" value={timezone} onChange={setTimezone} options={[{ value: 'Pacific Time (US & Canada)', label: 'Pacific Time (US & Canada)' }, { value: 'Eastern Time (US & Canada)', label: 'Eastern Time (US & Canada)' }, { value: 'India Standard Time', label: 'India Standard Time' }]} className="settings-timezone-select" /></label></div><div className="settings-save"><span>{saved && <><Check size={14} /> Changes saved</>}</span><Button onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2500) }}>Save changes</Button></div></Panel><Panel title="Email notifications" subtitle="Choose what updates you want to receive"><Toggle label="Candidate applications" text="Get notified when someone applies for an open role." checked /><Toggle label="Interview reminders" text="A reminder 24 hours before a scheduled interview." checked /><Toggle label="Weekly hiring digest" text="A summary of your hiring activity every Monday." /></Panel></div></div></>
}
function Toggle({ label, text, checked: initial }) { const [checked, setChecked] = useState(initial); return <div className="toggle-row"><span><b>{label}</b><small>{text}</small></span><button className={cx('toggle', checked && 'toggle-on')} onClick={() => setChecked(!checked)} aria-label={`Toggle ${label}`}><i /></button></div> }

function Login({ onLogin }) { return <div className="login-screen"><div className="login-brand"><div className="brand-mark"><Sparkles size={18} fill="currentColor" /></div><span>Talent<span className="brand-light">AI</span></span></div><div className="login-card"><div className="login-icon"><Sparkles size={21} /></div><h1>Welcome back</h1><p>Sign in to your recruiting workspace.</p><label>Work email<input defaultValue="sarah.chen@acme.co" type="email" /></label><label>Password<input defaultValue="talentai2026" type="password" /></label><div className="login-options"><label><input type="checkbox" defaultChecked /> Remember me</label><button>Forgot password?</button></div><Button className="full-button" onClick={onLogin}>Sign in <ArrowRight size={15} /></Button><div className="login-divider"><span>OR</span></div><Button variant="secondary" className="full-button" onClick={onLogin}><Globe2 size={16} /> Continue with Google</Button><small className="login-foot">Don’t have an account? <button>Contact your admin</button></small></div><div className="login-caption">Thoughtful hiring, powered by intelligence.</div></div> }

export default function App() {
  const [page, setPage] = useState(() => { const route = window.location.hash.slice(1); return pageTitles[route] ? route : 'dashboard' }); const [candidates, setCandidates] = useState(initialCandidates); const [jobs, setJobs] = useState(initialJobs); const [selected, setSelected] = useState(initialCandidates[0]); const [candidateToRemove, setCandidateToRemove] = useState(null); const [candidateToSchedule, setCandidateToSchedule] = useState(null); const [candidateToJoin, setCandidateToJoin] = useState(null); const [candidateJobFilter, setCandidateJobFilter] = useState(null); const [interviewForm, setInterviewForm] = useState({ date: '', time: '10:00', interviewer: 'Sarah Chen', format: 'Video call', notes: '' }); const [mobileOpen, setMobileOpen] = useState(false); const [loggedIn, setLoggedIn] = useState(true); const [toast, setToast] = useState(''); const [globalQuery, setGlobalQuery] = useState(''); const navigationStack = useRef([]); const currentPage = useRef(page); const navigationIndex = useRef(0)
  useEffect(() => {
    window.history.replaceState({ talentAI: true, page: currentPage.current, navIndex: 0 }, '', window.location.href)
    const handlePopState = event => {
      const route = event.state?.talentAI && pageTitles[event.state.page] ? event.state.page : 'dashboard'
      const nextIndex = Number.isInteger(event.state?.navIndex) ? event.state.navIndex : 0
      if (nextIndex < navigationIndex.current) {
        while (navigationStack.current.length > nextIndex) navigationStack.current.pop()
      } else if (nextIndex > navigationIndex.current) {
        navigationStack.current.push(currentPage.current)
      }
      navigationIndex.current = nextIndex
      currentPage.current = route
      setPage(route)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])
  const go = target => { if (target !== currentPage.current) { navigationStack.current.push(currentPage.current); navigationIndex.current += 1; window.history.pushState({ talentAI: true, page: target, navIndex: navigationIndex.current }, '', `#${target}`); currentPage.current = target; setPage(target) } window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const openCandidate = candidate => { setSelected(candidate); if (currentPage.current !== 'profile') { navigationStack.current.push(currentPage.current); navigationIndex.current += 1; window.history.pushState({ talentAI: true, page: 'profile', navIndex: navigationIndex.current }, '', '#profile') } currentPage.current = 'profile'; setPage('profile'); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const analyzeCandidate = candidate => { setSelected(candidate); go('analysis') }
  const viewJobApplicants = job => { setCandidateJobFilter(job); setGlobalQuery(''); go('candidates') }
  const clearCandidateJobFilter = () => setCandidateJobFilter(null)
  const notify = message => { setToast(message); setTimeout(() => setToast(''), 2600) }
  const removeJob = job => { setJobs(current => current.filter(item => item.id !== job.id)); if (candidateJobFilter?.id === job.id) setCandidateJobFilter(null) }
  const updateCandidate = (id, update) => {
    let updated
    setCandidates(current => current.map(candidate => {
      if (candidate.id !== id) return candidate
      updated = { ...candidate, ...update }
      return updated
    }))
    if (selected?.id === id) setSelected(current => current ? { ...current, ...update } : current)
    return updated
  }
  const advanceCandidate = candidate => {
    const stages = ['New', 'Screening', 'Shortlisted', 'Interview', 'Offer', 'Hired']
    const next = stages[stages.indexOf(candidate.stage) + 1]
    if (!next) return
    if (next === 'Hired') { setCandidateToJoin(candidate); return }
    updateCandidate(candidate.id, { stage: next, stageHistory: [...(candidate.stageHistory || []), { stage: next, date: new Date().toISOString() }] })
    setToast(`${candidate.name} moved to ${next}`)
    setTimeout(() => setToast(''), 2600)
  }
  const updateOfferDecision = decision => {
    if (!selected) return
    const decidedAt = new Date().toISOString()
    const history = selected.stageHistory || []
    updateCandidate(selected.id, {
      offerStatus: decision,
      offerDecisionDate: decidedAt,
      stage: 'Offer',
      stageHistory: history.filter(item => item.stage !== 'Hired'),
    })
    setToast(`Offer marked ${decision}`)
    setTimeout(() => setToast(''), 2600)
  }
  const markCandidateJoined = () => {
    if (!selected) return
    setCandidateToJoin(selected)
  }
  const confirmCandidateJoined = closeOpening => {
    if (!candidateToJoin) return
    const joiningCandidate = candidateToJoin
    const joinedAt = new Date().toISOString()
    const job = jobs.find(item => String(item.id) === String(joiningCandidate.jobId)) || jobs.find(item => item.title === joiningCandidate.role)
    updateCandidate(joiningCandidate.id, { stage: 'Hired', joinedDate: joinedAt, stageHistory: [...(joiningCandidate.stageHistory || []).filter(item => item.stage !== 'Hired'), { stage: 'Hired', date: joinedAt }] })
    if (closeOpening && job) setJobs(current => current.map(item => item.id === job.id ? { ...item, open: false, filled: true } : item))
    setCandidateToJoin(null)
    setToast(`${joiningCandidate.name} marked as joined${closeOpening && job ? ` · ${job.title} filled` : ''}`)
    setTimeout(() => setToast(''), 2600)
  }
  const requestSchedule = candidate => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    setInterviewForm({ date: tomorrow.toLocaleDateString('en-CA'), time: '10:00', interviewer: 'Sarah Chen', format: 'Video call', notes: '' })
    setCandidateToSchedule(candidate)
  }
  const scheduleInterview = event => {
    event.preventDefault()
    if (!candidateToSchedule) return
    updateCandidate(candidateToSchedule.id, { stage: 'Interview', interview: { ...interviewForm }, stageHistory: [...(candidateToSchedule.stageHistory || []).filter(item => item.stage !== 'Interview'), { stage: 'Interview', date: new Date().toISOString() }] })
    setCandidateToSchedule(null)
    setToast(`Interview scheduled with ${candidateToSchedule.name}`)
    setTimeout(() => setToast(''), 2600)
  }
  const confirmCandidateRemoval = () => {
    if (!candidateToRemove) return
    const removedCandidate = candidateToRemove
    const remaining = candidates.filter(candidate => candidate.id !== removedCandidate.id)
    setCandidates(remaining)
    if (selected?.id === removedCandidate.id) setSelected(remaining[0] || null)
    setCandidateToRemove(null)
    if (currentPage.current === 'profile') go('candidates')
    setToast(`${removedCandidate.name} removed from candidates`)
    setTimeout(() => setToast(''), 2600)
  }
  const copyCandidateEmail = async candidate => {
    try {
      await navigator.clipboard.writeText(candidate.email)
      setToast('Email address copied')
    } catch {
      setToast('Unable to copy email address')
    }
    setTimeout(() => setToast(''), 2600)
  }
  const globalSearch = query => { const cleanQuery = query.trim(); if (!cleanQuery) return; setGlobalQuery(cleanQuery); go('candidates'); setToast(`Showing candidates matching “${cleanQuery}”`); setTimeout(() => setToast(''), 2600) }
  if (!loggedIn) return <Login onLogin={() => setLoggedIn(true)} />
  const joiningJob = candidateToJoin && (jobs.find(item => String(item.id) === String(candidateToJoin.jobId)) || jobs.find(item => item.title === candidateToJoin.role))
  const body = {
    dashboard: <Dashboard candidates={candidates} jobs={jobs} go={go} openCandidate={openCandidate} />,
    candidates: <Candidates candidates={candidates} openCandidate={openCandidate} analyzeCandidate={analyzeCandidate} advanceCandidate={advanceCandidate} requestSchedule={requestSchedule} requestRemove={setCandidateToRemove} go={go} globalQuery={globalQuery} roleJobId={candidateJobFilter?.id} roleJobTitle={candidateJobFilter?.title} clearRoleFilter={clearCandidateJobFilter} />,
    profile: <CandidateProfile candidate={selected} jobs={jobs} go={go} onBack={() => go('candidates')} onRemove={setCandidateToRemove} onCopyEmail={copyCandidateEmail} onAdvance={() => advanceCandidate(selected)} onSchedule={() => requestSchedule(selected)} onOfferDecision={updateOfferDecision} onMarkJoined={markCandidateJoined} />,
    upload: <UploadPage candidates={candidates} setCandidates={setCandidates} jobs={jobs} go={go} />,
    analysis: <Analysis candidates={candidates} go={go} activeCandidate={selected} openCandidate={openCandidate} />,
    jobs: <Jobs jobs={jobs} setJobs={setJobs} candidates={candidates} onViewApplicants={viewJobApplicants} onToast={notify} onRemoveJob={removeJob} />,
    analytics: <Analytics candidates={candidates} jobs={jobs} />,
    assistant: <Assistant candidates={candidates} jobs={jobs} go={go} />,
    settings: <SettingsPage />,
  }[page]
  return <div className="app-shell"><Sidebar page={page} go={go} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} onLogout={() => setLoggedIn(false)} /><div className="main-shell"><Topbar title={pageTitles[page]} page={page} onNavigate={go} onMenu={() => setMobileOpen(true)} onSearch={globalSearch} onAssistant={() => go('assistant')} /><main className={`main-content${page === 'dashboard' ? ' dashboard-main-content' : ''}`} key={page}>{body}</main></div><button className="floating-ai" onClick={() => go('assistant')} title="Ask TalentAI"><Sparkles size={19} /><span>Ask AI</span><i /></button>{candidateToSchedule && <div className="modal-backdrop" onClick={() => setCandidateToSchedule(null)}><form className="job-modal interview-modal" onSubmit={scheduleInterview} onClick={event => event.stopPropagation()}><div className="modal-head"><div><div className="eyebrow">CANDIDATE INTERVIEW</div><h2>Schedule interview</h2><p>Set up an interview with {candidateToSchedule.name}.</p></div><button type="button" className="icon-button" aria-label="Close" onClick={() => setCandidateToSchedule(null)}><X size={18} /></button></div><div className="form-two"><label>Date<input type="date" required value={interviewForm.date} onChange={event => setInterviewForm(current => ({ ...current, date: event.target.value }))} /></label><label>Time<input type="time" required value={interviewForm.time} onChange={event => setInterviewForm(current => ({ ...current, time: event.target.value }))} /></label></div><label>Interviewer<input required value={interviewForm.interviewer} onChange={event => setInterviewForm(current => ({ ...current, interviewer: event.target.value }))} /></label><label>Format<select value={interviewForm.format} onChange={event => setInterviewForm(current => ({ ...current, format: event.target.value }))}><option>Video call</option><option>Phone</option><option>In person</option></select></label><label>Notes<textarea rows="3" placeholder="Add interview notes or an agenda" value={interviewForm.notes} onChange={event => setInterviewForm(current => ({ ...current, notes: event.target.value }))} /></label><div className="modal-actions"><Button type="button" variant="secondary" onClick={() => setCandidateToSchedule(null)}>Cancel</Button><Button type="submit"><CalendarDays size={15} /> Confirm interview</Button></div></form></div>}{candidateToRemove && <div className="modal-backdrop" onClick={() => setCandidateToRemove(null)}><div className="remove-candidate-modal" role="alertdialog" aria-modal="true" aria-labelledby="remove-candidate-title" onClick={event => event.stopPropagation()}><div className="remove-candidate-icon"><X size={18} /></div><h2 id="remove-candidate-title">Remove {candidateToRemove.name}?</h2><p>This will remove the candidate from your workspace and candidate lists.</p><div className="remove-candidate-actions"><Button variant="secondary" onClick={() => setCandidateToRemove(null)}>Cancel</Button><Button className="button-danger" onClick={confirmCandidateRemoval}>Remove profile</Button></div></div></div>}{candidateToJoin && <div className="modal-backdrop" onClick={() => setCandidateToJoin(null)}><div className="hire-confirmation-modal" role="alertdialog" aria-modal="true" aria-labelledby="hire-confirmation-title" onClick={event => event.stopPropagation()}><div className="hire-confirmation-icon"><BriefcaseBusiness size={18} /></div><h2 id="hire-confirmation-title">Confirm hire</h2><p><b>{candidateToJoin.name}</b> has been hired for <b>{joiningJob?.title || candidateToJoin.role}</b>.</p><p>{joiningJob ? joiningJob.open && !joiningJob.filled ? "Should this opening remain open for more applicants, or close as filled?" : `This opening is currently ${joiningJob.filled ? "filled" : "closed"}.` : "No matching job opening is linked to this candidate."}</p><div className="hire-confirmation-actions"><Button variant="secondary" onClick={() => setCandidateToJoin(null)}>Cancel</Button>{joiningJob?.open && !joiningJob.filled ? <><Button variant="secondary" onClick={() => confirmCandidateJoined(false)}>Keep open</Button><Button onClick={() => confirmCandidateJoined(true)}>Close as filled</Button></> : <Button onClick={() => confirmCandidateJoined(false)}>Confirm hire</Button>}</div></div></div>}{toast && <div className="toast"><Check size={15} />{toast}</div>}</div>
}
