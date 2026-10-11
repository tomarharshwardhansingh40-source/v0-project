'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { ArrowRight, BarChart3, BookOpen, Check, ChevronRight, Clock3, FileText, Home, LogOut, Menu, Plus, Settings, Sparkles, Target, Trash2, TrendingUp, X, Zap } from 'lucide-react'

type View = 'overview' | 'analyze' | 'results' | 'roadmap' | 'history' | 'settings'
type User = { id: string; name: string; email: string }
type AnalysisSummary = { id: string; targetRole: string; dailyMinutes: number; createdAt: string; skillGapCount: number }
type Analysis = {
  id: string
  targetRole: string
  currentSkills: string[]
  dailyMinutes: number
  skillGaps: { skill: string; priority: string; reason: string }[]
  sevenDayRoadmap: { day: number; topic: string; task: string; estimatedMinutes: number }[]
  projectRecommendations: { title: string; description: string; skillsPracticed: string[] }[]
  overallAssessment: string
  createdAt: string
}

const roles = ['Frontend Developer', 'Backend Developer', 'Full-Stack Developer', 'Data Analyst', 'Machine Learning Intern']
const studyOptions: Record<string, number> = { '30 minutes': 30, '1-2 hours': 90, '2-4 hours': 180, '4+ hours': 240 }

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || 'U'
}

function formatDate(value?: string) {
  if (!value) return ''
  return new Date(value).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
}

function priorityTone(priority: string): 'amber' | 'violet' | 'green' {
  if (priority === 'high') return 'amber'
  if (priority === 'low') return 'green'
  return 'violet'
}

function Logo() { return <div className="flex items-center gap-2.5"><div className="grid size-8 place-items-center rounded-xl bg-violet-500 text-white shadow-lg shadow-violet-500/25"><Sparkles className="size-4" /></div><span className="text-[15px] font-semibold tracking-tight text-white">SkillPath <span className="text-violet-400">AI</span></span></div> }
function Button({ children, onClick, secondary = false, className = '', type = 'button', disabled = false }: { children: React.ReactNode; onClick?: () => void; secondary?: boolean; className?: string; type?: 'button' | 'submit'; disabled?: boolean }) { return <button type={type} disabled={disabled} onClick={onClick} className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 ${secondary ? 'border border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]' : 'bg-violet-500 text-white shadow-lg shadow-violet-500/20 hover:bg-violet-400'} ${className}`}>{children}</button> }
function Badge({ children, tone = 'violet' }: { children: React.ReactNode; tone?: 'violet' | 'amber' | 'green' }) { return <span className={`rounded-md px-2 py-1 text-[11px] font-semibold ${tone === 'amber' ? 'bg-amber-400/10 text-amber-300' : tone === 'green' ? 'bg-emerald-400/10 text-emerald-300' : 'bg-violet-400/10 text-violet-300'}`}>{children}</span> }

function Landing({ onStart }: { onStart: () => void }) { return <main className="min-h-screen overflow-hidden bg-[#0b0b12] text-white"><div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_15%,rgba(124,58,237,.18),transparent_32%),radial-gradient(circle_at_10%_80%,rgba(76,29,149,.12),transparent_30%)]" /><nav className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-7"><Logo /><div className="hidden items-center gap-8 text-sm text-slate-400 md:flex"><a href="#how">How it works</a><a href="#features">Features</a></div><Button secondary onClick={onStart}>Sign in <ArrowRight className="size-4" /></Button></nav><section className="relative mx-auto max-w-6xl px-6 pb-24 pt-20 text-center md:pt-32"><Badge>AI-powered career clarity</Badge><h1 className="mx-auto mt-6 max-w-4xl text-5xl font-semibold leading-[1.05] tracking-[-.04em] text-white md:text-7xl">Build the skills for the career you want.</h1><p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-400">SkillPath AI analyzes your current skills against your target role and creates a focused plan to help you get there.</p><div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row"><Button onClick={onStart}>Analyze my skills <ArrowRight className="size-4" /></Button><Button secondary onClick={onStart}>See how it works</Button></div></section></main> }

function Auth({ register, onDone, onSwitch }: { register: boolean; onDone: (user: User) => void; onSwitch: () => void }) {
  const [error, setError] = useState('')
  return (
    <main className="grid min-h-screen place-items-center bg-[#0b0b12] px-6 text-white">
      <div className="w-full max-w-md">
        <Logo />
        <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.035] p-7">
          <h1 className="text-2xl font-semibold">{register ? 'Create your account' : 'Welcome back'}</h1>
          <p className="mt-2 text-sm text-slate-400">{register ? 'Start building your personalized career path.' : 'Continue your journey with SkillPath AI.'}</p>
          <form className="mt-7 flex flex-col gap-4" onSubmit={async (e) => {
            e.preventDefault()
            setError('')
            const form = e.currentTarget
            const email = (form.elements.namedItem('email') as HTMLInputElement).value
            const password = (form.elements.namedItem('password') as HTMLInputElement).value
            try {
              const res = register
                ? await api.register({ name: (form.elements.namedItem('name') as HTMLInputElement).value, email, password }) as { user: User }
                : await api.login({ email, password }) as { user: User }
              onDone(res.user)
            } catch (err) {
              setError((err as Error).message)
            }
          }}>
            <label className="text-sm text-slate-300">Email<input name="email" type="email" required placeholder="you@example.com" className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-violet-400" /></label>
            {register && <label className="text-sm text-slate-300">Name<input name="name" required placeholder="Alex Morgan" className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-violet-400" /></label>}
            <label className="text-sm text-slate-300">Password<input name="password" type="password" required minLength={8} placeholder="••••••••" className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-violet-400" /></label>
            {error && <p className="text-sm text-rose-300">{error}</p>}
            <Button type="submit" className="mt-2 w-full">{register ? 'Create account' : 'Sign in'} <ArrowRight className="size-4" /></Button>
          </form>
          <p className="mt-6 text-center text-sm text-slate-500">{register ? 'Already have an account? ' : "Don't have an account? "}<button onClick={onSwitch} className="text-violet-300 hover:text-violet-200">{register ? 'Sign in' : 'Create one'}</button></p>
        </div>
      </div>
    </main>
  )
}

function Sidebar({ view, setView, onLogout }: { view: View; setView: (v: View) => void; onLogout: () => void }) {
  const items: [View, string, React.ElementType][] = [['overview', 'Overview', Home], ['analyze', 'New analysis', Sparkles], ['roadmap', 'My roadmap', BookOpen], ['history', 'Analysis history', FileText], ['settings', 'Profile & settings', Settings]]
  return (
    <aside className="hidden w-64 shrink-0 border-r border-white/[.07] bg-[#0d0d15] p-5 lg:flex lg:flex-col">
      <Logo />
      <div className="mt-12 flex flex-col gap-1">
        {items.map(([id, label, Icon]) => (
          <button key={id} onClick={() => setView(id)} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${view === id || (view === 'results' && id === 'overview') ? 'bg-violet-500/15 text-violet-200' : 'text-slate-500 hover:bg-white/[.04] hover:text-slate-200'}`}>
            <Icon className="size-4" />{label}
          </button>
        ))}
      </div>
      <div className="mt-auto border-t border-white/[.07] pt-4">
        <button onClick={onLogout} className="flex w-full items-center gap-3 px-3 py-2 text-sm text-slate-500 hover:text-white"><LogOut className="size-4" /> Sign out</button>
      </div>
    </aside>
  )
}

function Header({ title, user, onMenu }: { title: string; user: User; onMenu: () => void }) {
  return (
    <header className="flex items-center justify-between border-b border-white/[.07] px-5 py-4 md:px-8">
      <button className="text-slate-400 lg:hidden" onClick={onMenu} aria-label="Open navigation"><Menu /></button>
      <h2 className="hidden text-sm font-medium text-slate-300 lg:block">{title}</h2>
      <div className="ml-auto flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium">{user.name}</p>
          <p className="text-xs text-slate-500">Student account</p>
        </div>
        <div className="grid size-9 place-items-center rounded-full bg-violet-500/20 text-sm font-semibold text-violet-200">{initials(user.name)}</div>
      </div>
    </header>
  )
}

function Overview({ user, analysis, historyCount, setView }: { user: User; analysis: Analysis | null; historyCount: number; setView: (v: View) => void }) {
  const firstName = user.name.split(/\s+/)[0] || user.name
  const gapCount = analysis?.skillGaps.length ?? 0
  const highPriority = analysis?.skillGaps.find((g) => g.priority === 'high')
  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm text-violet-300">{formatDate(new Date().toISOString())}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Good morning, {firstName}.</h1>
          <p className="mt-2 text-sm text-slate-500">Let&apos;s make your next career move intentional.</p>
        </div>
        <Button onClick={() => setView('analyze')}><Plus className="size-4" /> New analysis</Button>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Stat icon={Target} label="Latest role" value={analysis?.targetRole ?? 'None yet'} note={analysis ? formatDate(analysis.createdAt) : 'Run your first analysis'} />
        <Stat icon={TrendingUp} label="Skill gaps" value={String(gapCount)} note={`Across ${historyCount} analysis${historyCount === 1 ? '' : 'es'}`} />
        <Stat icon={Clock3} label="Daily study plan" value={analysis ? `${analysis.dailyMinutes} min` : '—'} note={analysis ? 'From your latest report' : 'Set when you analyze'} />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div className="rounded-2xl border border-white/10 bg-white/[.035] p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium tracking-wide text-slate-500">LATEST ANALYSIS</p>
              <h3 className="mt-2 text-lg font-semibold">{analysis?.targetRole ?? 'No analysis yet'}</h3>
            </div>
            {analysis && <Badge>{gapCount} gaps</Badge>}
          </div>
          {analysis ? (
            <>
              <p className="mt-5 text-sm leading-6 text-slate-400">{analysis.overallAssessment}</p>
              <button onClick={() => setView('results')} className="mt-8 flex items-center gap-1 text-sm font-medium text-violet-300 hover:text-violet-200">View full analysis <ChevronRight className="size-4" /></button>
            </>
          ) : (
            <p className="mt-5 text-sm text-slate-500">Generate an analysis to see your skill gaps and roadmap here.</p>
          )}
        </div>
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-violet-500/20 to-white/[.03] p-6">
          <div className="grid size-10 place-items-center rounded-xl bg-violet-400/20"><Zap className="size-5 text-violet-300" /></div>
          <h3 className="mt-5 text-lg font-semibold">Your next best step</h3>
          <p className="mt-2 text-sm leading-6 text-slate-400">{highPriority ? `Focus on ${highPriority.skill}. ${highPriority.reason}` : 'Run an analysis to get a prioritized next step.'}</p>
          <Button secondary className="mt-6" onClick={() => setView(analysis ? 'roadmap' : 'analyze')}>{analysis ? 'Open roadmap' : 'Start analysis'} <ArrowRight className="size-4" /></Button>
        </div>
      </div>
    </div>
  )
}

function Stat({ icon: Icon, label, value, note }: { icon: React.ElementType; label: string; value: string; note: string }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5"><Icon className="size-4 text-violet-300" /><p className="mt-5 text-xs text-slate-500">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p><p className="mt-1 text-xs text-slate-600">{note}</p></div>
}

function Analyze({ onCreated }: { onCreated: (analysis: Analysis) => void }) {
  const [role, setRole] = useState(roles[0])
  const [hours, setHours] = useState('1-2 hours')
  const [skills, setSkills] = useState('HTML, CSS, JavaScript, Git')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  return (
    <div className="max-w-3xl">
      <p className="text-sm text-violet-300">New analysis</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Map your next move.</h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">Tell us where you&apos;re headed and where you are today. We&apos;ll build the bridge.</p>
      <div className="mt-8 flex flex-col gap-6 rounded-2xl border border-white/10 bg-white/[.035] p-6 md:p-8">
        <label className="text-sm font-medium text-slate-200">Target role
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {roles.map((item) => (
              <button key={item} onClick={() => setRole(item)} className={`rounded-xl border px-4 py-3 text-left text-sm transition ${role === item ? 'border-violet-400 bg-violet-500/15 text-violet-100' : 'border-white/10 text-slate-400 hover:border-white/20'}`}>
                {item}{role === item && <Check className="float-right size-4 text-violet-300" />}
              </button>
            ))}
          </div>
        </label>
        <label className="text-sm font-medium text-slate-200">Current skills
          <textarea value={skills} onChange={(e) => setSkills(e.target.value)} rows={4} className="mt-3 w-full resize-none rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-violet-400" placeholder="e.g. JavaScript, React, Git" />
          <span className="mt-2 block text-xs text-slate-600">Separate skills with commas. Include tools, frameworks, and concepts.</span>
        </label>
        <label className="text-sm font-medium text-slate-200">Daily study time
          <select value={hours} onChange={(e) => setHours(e.target.value)} className="mt-3 w-full appearance-none rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-200 outline-none focus:border-violet-400">
            <option>30 minutes</option>
            <option>1-2 hours</option>
            <option>2-4 hours</option>
            <option>4+ hours</option>
          </select>
        </label>
        {error && <p className="text-sm text-rose-300">{error}</p>}
        <Button disabled={loading} onClick={async () => {
          setLoading(true)
          setError('')
          try {
            const res = await api.createAnalysis({
              targetRole: role,
              currentSkills: skills.split(',').map((s) => s.trim()).filter(Boolean),
              dailyMinutes: studyOptions[hours] ?? 60,
            }) as { analysis: Analysis }
            onCreated(res.analysis)
          } catch (err) {
            setError((err as Error).message)
          } finally {
            setLoading(false)
          }
        }} className="mt-2 w-full">{loading ? 'Analyzing your path…' : 'Analyze my skills'} {!loading && <Sparkles className="size-4" />}</Button>
      </div>
    </div>
  )
}

function Results({ analysis, setView, onDeleted }: { analysis: Analysis | null; setView: (v: View) => void; onDeleted: () => void }) {
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)
  if (!analysis) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[.035] p-8 text-center">
        <p className="text-slate-400">No analysis selected yet.</p>
        <Button className="mt-5" onClick={() => setView('analyze')}>Create an analysis</Button>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <p className="text-sm text-violet-300">Analysis results</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Your {analysis.targetRole} path.</h1>
          <p className="mt-2 text-sm text-slate-500">Based on your skills and goal · {formatDate(analysis.createdAt)}</p>
        </div>
        <Button secondary disabled={deleting} onClick={async () => {
          setDeleting(true)
          setError('')
          try {
            await api.deleteAnalysis(analysis.id)
            onDeleted()
          } catch (err) {
            setError((err as Error).message)
            setDeleting(false)
          }
        }}>Delete report</Button>
      </div>
      {error && <p className="text-sm text-rose-300">{error}</p>}
      <div className="grid gap-4 md:grid-cols-[.8fr_1.2fr]">
        <div className="rounded-2xl border border-white/10 bg-white/[.035] p-6">
          <p className="text-xs text-slate-500">OVERALL ASSESSMENT</p>
          <p className="mt-5 text-sm leading-6 text-slate-300">{analysis.overallAssessment}</p>
          <p className="mt-5 text-xs text-slate-500">{analysis.dailyMinutes} minutes / day · {analysis.currentSkills.length} skills submitted</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[.035] p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">SKILL GAPS</p>
              <h3 className="mt-2 text-lg font-semibold">Your highest-impact opportunities</h3>
            </div>
            <Badge tone="amber">{analysis.skillGaps.length} to focus on</Badge>
          </div>
          <div className="mt-5 flex flex-col gap-3">
            {analysis.skillGaps.map((gap) => (
              <div key={`${gap.skill}-${gap.priority}`} className="flex items-center gap-4 rounded-xl border border-white/[.07] p-3">
                <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-amber-400/10"><BarChart3 className="size-4 text-amber-300" /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-2">
                    <p className="text-sm font-medium">{gap.skill}</p>
                    <Badge tone={priorityTone(gap.priority)}>{gap.priority}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{gap.reason}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[.035] p-6">
        <p className="text-xs text-slate-500">PROJECT IDEAS</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {analysis.projectRecommendations.map((project) => (
            <div key={project.title} className="rounded-xl border border-white/[.07] p-4">
              <h3 className="font-semibold">{project.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">{project.description}</p>
              <p className="mt-3 text-xs text-slate-500">{project.skillsPracticed.join(', ')}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-violet-400/20 bg-violet-500/[.08] p-6 md:flex-row md:items-center">
        <div>
          <h3 className="font-semibold">Your personalized roadmap is ready.</h3>
          <p className="mt-1 text-sm text-slate-400">A focused 7-day plan built around your available study time.</p>
        </div>
        <Button onClick={() => setView('roadmap')}>View roadmap <ArrowRight className="size-4" /></Button>
      </div>
    </div>
  )
}

function Roadmap({ analysis, setView }: { analysis: Analysis | null; setView: (v: View) => void }) {
  if (!analysis) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[.035] p-8 text-center">
        <p className="text-slate-400">No roadmap yet. Generate an analysis first.</p>
        <Button className="mt-5" onClick={() => setView('analyze')}>New analysis</Button>
      </div>
    )
  }
  return (
    <div>
      <p className="text-sm text-violet-300">Learning roadmap</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Your 7-day sprint.</h1>
      <p className="mt-2 text-sm text-slate-500">{analysis.targetRole} · {analysis.dailyMinutes} minutes per day</p>
      <div className="mt-8 grid gap-3">
        {analysis.sevenDayRoadmap.map((item, index) => (
          <div key={item.day} className={`flex gap-4 rounded-2xl border p-5 ${index === 0 ? 'border-violet-400/30 bg-violet-500/[.08]' : 'border-white/10 bg-white/[.035]'}`}>
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/[.07] text-xs font-semibold text-violet-200">{String(item.day).padStart(2, '0')}</div>
            <div className="flex-1">
              <div className="flex flex-col justify-between gap-2 sm:flex-row">
                <h3 className="font-semibold">{item.topic}</h3>
                <span className="flex items-center gap-1 text-xs text-slate-500"><Clock3 className="size-3" /> {item.estimatedMinutes} min</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-500">{item.task}</p>
              <div className="mt-4 flex gap-2"><Badge>Learn</Badge>{index === 0 && <Badge tone="green">Today</Badge>}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function History({ onOpen, onChanged }: { onOpen: (analysis: Analysis) => void; onChanged: () => void }) {
  const [items, setItems] = useState<AnalysisSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const res = await api.history() as { analyses: AnalysisSummary[] }
        if (alive) setItems(res.analyses ?? [])
      } catch (err) {
        if (alive) setError((err as Error).message)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [])

  return (
    <div>
      <p className="text-sm text-violet-300">Your progress</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Analysis history.</h1>
      <p className="mt-2 text-sm text-slate-500">Review how your goals and skills evolve over time.</p>
      {error && <p className="mt-4 text-sm text-rose-300">{error}</p>}
      {loading && <p className="mt-8 text-sm text-slate-500">Loading your analyses…</p>}
      {!loading && items.length === 0 && <p className="mt-8 text-sm text-slate-500">No analyses yet. Create one from New analysis.</p>}
      <div className="mt-8 flex flex-col gap-3">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[.035] p-5">
            <div className="grid size-10 place-items-center rounded-xl bg-violet-500/10"><FileText className="size-4 text-violet-300" /></div>
            <button className="min-w-0 flex-1 text-left" onClick={async () => {
              try {
                const res = await api.getAnalysis(item.id) as { analysis: Analysis }
                onOpen(res.analysis)
              } catch (err) {
                setError((err as Error).message)
              }
            }}>
              <p className="text-sm font-medium">{item.targetRole}</p>
              <p className="mt-1 text-xs text-slate-500">{formatDate(item.createdAt)} · {item.skillGapCount} skill gaps · {item.dailyMinutes} min/day</p>
            </button>
            <button className="rounded-lg p-2 text-slate-600 hover:bg-rose-400/10 hover:text-rose-300" aria-label="Delete analysis" onClick={async () => {
              try {
                await api.deleteAnalysis(item.id)
                setItems((prev) => prev.filter((x) => x.id !== item.id))
                onChanged()
              } catch (err) {
                setError((err as Error).message)
              }
            }}><Trash2 className="size-4" /></button>
            <ChevronRight className="size-4 text-slate-600" />
          </div>
        ))}
      </div>
    </div>
  )
}

function SettingsPage({ user }: { user: User }) {
  return (
    <div className="max-w-2xl">
      <p className="text-sm text-violet-300">Account</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Profile & settings.</h1>
      <div className="mt-8 flex flex-col gap-5 rounded-2xl border border-white/10 bg-white/[.035] p-6">
        <label className="text-sm text-slate-300">Full name<input value={user.name} readOnly className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none" /></label>
        <label className="text-sm text-slate-300">Email address<input value={user.email} readOnly type="email" className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none" /></label>
        <p className="text-xs text-slate-500">Profile editing is not part of this MVP. Your account details come from authentication.</p>
      </div>
    </div>
  )
}

function App() {
  const [mode, setMode] = useState<'loading' | 'landing' | 'login' | 'register' | 'app'>('loading')
  const [view, setView] = useState<View>('overview')
  const [mobileNav, setMobileNav] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [historyCount, setHistoryCount] = useState(0)

  async function refreshHistoryMeta(preferred?: Analysis | null) {
    try {
      const res = await api.history() as { analyses: AnalysisSummary[] }
      const list = res.analyses ?? []
      setHistoryCount(list.length)
      if (preferred) {
        setAnalysis(preferred)
        return
      }
      if (list[0]) {
        const full = await api.getAnalysis(list[0].id) as { analysis: Analysis }
        setAnalysis(full.analysis)
      } else {
        setAnalysis(null)
      }
    } catch {
      // keep current local state if history refresh fails mid-session
    }
  }

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await api.me() as { user: User }
        if (!alive) return
        setUser(res.user)
        setMode('app')
        const history = await api.history() as { analyses: AnalysisSummary[] }
        if (!alive) return
        setHistoryCount(history.analyses?.length ?? 0)
        if (history.analyses?.[0]) {
          const full = await api.getAnalysis(history.analyses[0].id) as { analysis: Analysis }
          if (alive) setAnalysis(full.analysis)
        }
      } catch {
        if (alive) setMode('landing')
      }
    })()
    return () => { alive = false }
  }, [])

  if (mode === 'loading') {
    return <main className="grid min-h-screen place-items-center bg-[#0b0b12] text-slate-400">Checking your session…</main>
  }
  if (mode === 'landing') return <Landing onStart={() => setMode('login')} />
  if (mode === 'login' || mode === 'register') {
    return (
      <Auth
        register={mode === 'register'}
        onDone={async (nextUser) => {
          setUser(nextUser)
          setMode('app')
          setView('overview')
          await refreshHistoryMeta(null)
        }}
        onSwitch={() => setMode(mode === 'login' ? 'register' : 'login')}
      />
    )
  }
  if (!user) return <Landing onStart={() => setMode('login')} />

  const titles: Record<View, string> = { overview: 'Overview', analyze: 'New analysis', results: 'Analysis results', roadmap: 'My roadmap', history: 'Analysis history', settings: 'Profile & settings' }

  return (
    <div className="flex min-h-screen bg-[#0b0b12] text-white">
      <Sidebar
        view={view}
        setView={setView}
        onLogout={async () => {
          try { await api.logout() } catch {}
          setUser(null)
          setAnalysis(null)
          setHistoryCount(0)
          setMode('landing')
        }}
      />
      {mobileNav && (
        <div className="fixed inset-0 z-10 bg-black/60 lg:hidden" onClick={() => setMobileNav(false)}>
          <div className="h-full w-72 bg-[#0d0d15] p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between"><Logo /><button onClick={() => setMobileNav(false)}><X /></button></div>
            <div className="mt-10 flex flex-col gap-1">
              {(['overview', 'analyze', 'roadmap', 'history', 'settings'] as View[]).map((item) => (
                <button key={item} onClick={() => { setView(item); setMobileNav(false) }} className="rounded-xl px-3 py-3 text-left text-sm capitalize text-slate-300 hover:bg-white/[.05]">{item.replace('-', ' ')}</button>
              ))}
            </div>
          </div>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <Header title={titles[view]} user={user} onMenu={() => setMobileNav(true)} />
        <main className="mx-auto max-w-6xl p-5 md:p-8">
          {view === 'overview' && <Overview user={user} analysis={analysis} historyCount={historyCount} setView={setView} />}
          {view === 'analyze' && <Analyze onCreated={async (created) => { setAnalysis(created); setView('results'); await refreshHistoryMeta(created) }} />}
          {view === 'results' && <Results analysis={analysis} setView={setView} onDeleted={async () => { setAnalysis(null); setView('history'); await refreshHistoryMeta(null) }} />}
          {view === 'roadmap' && <Roadmap analysis={analysis} setView={setView} />}
          {view === 'history' && <History onOpen={(item) => { setAnalysis(item); setView('results') }} onChanged={() => { void refreshHistoryMeta(null) }} />}
          {view === 'settings' && <SettingsPage user={user} />}
        </main>
      </div>
    </div>
  )
}

export default function Page() { return <App /> }
