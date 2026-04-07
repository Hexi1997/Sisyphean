import { useState } from 'react'

const GITHUB_URL = 'https://github.com/Hexi1997/Sisyphean'
const RELEASES_URL = 'https://github.com/Hexi1997/Sisyphean/releases/latest'

type Lang = 'en' | 'zh'

const t = {
  en: {
    tagline: 'Copy the Newest. Paste Instantly.',
    desc: 'One shortcut between download and done. Sisyphean watches your folders and puts the latest file on your clipboard — without opening a file explorer.',
    shortcutLabel: 'Default shortcut',
    shortcutSuffix: 'copies your newest file',
    quote: '"Sisyphean" describes work that is repetitive, tedious, and seemingly endless — the exact frustration of opening a folder just to copy the newest file.',
    download: '↓ Download',
    github: 'GitHub',
    platform: 'Windows · macOS · Linux · Free & Open Source',
  },
  zh: {
    tagline: '复制最新，即刻粘贴。',
    desc: '一个快捷键，从下载到粘贴。Sisyphean 监控你的文件夹，将最新文件放入剪贴板——无需打开文件管理器。',
    shortcutLabel: '默认快捷键',
    shortcutSuffix: '复制最新文件',
    quote: '"Sisyphean" 取自希腊神话中永无止境的西西弗斯，形容重复繁琐、无尽的任务——正是每次打开文件夹才能复制最新文件的那种挫败感。',
    download: '↓ 立即下载',
    github: 'GitHub',
    platform: 'Windows · macOS · Linux · 免费开源',
  },
} as const

function KbdKey({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      className="inline-flex items-center justify-center px-2 py-0.5 bg-brand-bg border border-brand-border rounded-[5px] font-[system-ui] text-[0.8em] text-brand-sub leading-relaxed font-medium"
      style={{ borderBottom: '2px solid #C8C0B4' }}
    >
      {children}
    </kbd>
  )
}

function GitHubIcon() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  )
}

export default function App() {
  const [lang, setLang] = useState<Lang>('en')
  const copy = t[lang]

  return (
    <div className="min-h-svh bg-brand-bg flex flex-col">

      {/* top bar */}
      <div className="flex justify-between items-center px-fluid py-5 shrink-0">
        <span className="font-display text-[0.95rem] font-bold tracking-[-0.01em] text-brand-text opacity-50">
          Sisyphean
        </span>
        <div className="flex border border-brand-border rounded-lg overflow-hidden text-[0.78rem]">
          {(['en', 'zh'] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-3 py-1 font-medium transition-colors cursor-pointer ${
                lang === l
                  ? 'bg-brand-accent-muted text-brand-accent'
                  : 'text-brand-sub hover:bg-brand-darker'
              }`}
            >
              {l === 'en' ? 'EN' : '中文'}
            </button>
          ))}
        </div>
      </div>

      {/* main content — stacks vertically on mobile, side-by-side on desktop */}
      <div className="flex-1 flex flex-col lg:flex-row lg:items-center px-fluid max-w-[1160px] mx-auto w-full gap-10 lg:gap-[clamp(3rem,6vw,7rem)] pt-8 pb-12 lg:py-10">

        {/* text block */}
        <div className="flex-1 min-w-0 hero-text">
          <h1 className="font-display text-hero font-bold tracking-[-0.04em] text-brand-text leading-[1.05] m-0 mb-5">
            Sisyphean
          </h1>

          <p className="text-body-lg leading-[1.75] text-brand-sub m-0 mb-7 max-w-[460px]">
            {copy.tagline} {copy.desc}
          </p>

          {/* shortcut hint */}
          <div className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#FEFCF8] border border-brand-border rounded-lg text-[0.8rem] text-brand-sub mb-7 flex-wrap">
            <span>{copy.shortcutLabel}:</span>
            <KbdKey>⌥ / Alt</KbdKey>
            <span className="text-brand-muted">+</span>
            <KbdKey>1–9</KbdKey>
            <span className="text-brand-muted">{copy.shortcutSuffix}</span>
          </div>

          {/* naming story */}
          <div className="border-l-2 border-brand-border-dark pl-5 mb-7 max-w-[460px]">
            <p className="text-[0.875rem] leading-[1.75] text-brand-muted m-0 italic">
              {copy.quote}
            </p>
          </div>

          {/* cta */}
          <div className="flex items-center gap-3 flex-wrap">
            <a
              href={RELEASES_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-[10px] bg-brand-accent text-[#FEFCF8] rounded-[9px] text-[0.9rem] font-semibold no-underline transition-[opacity,transform] duration-200 hover:opacity-85 hover:-translate-y-px"
            >
              {copy.download}
            </a>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-[10px] border border-brand-border-dark text-brand-sub rounded-[9px] text-[0.9rem] font-medium no-underline transition-[background,transform] duration-200 hover:bg-brand-darker hover:-translate-y-px"
            >
              <GitHubIcon />
              {copy.github}
            </a>
          </div>
        </div>

        {/* screenshot — below text on mobile, right column on desktop */}
        <div className="flex lg:flex-[0_0_auto] lg:w-[clamp(300px,38vw,460px)] items-center justify-center hero-img">
          <img
            src="/sisyphean-screenshot.png"
            alt="Sisyphean app screenshot"
            className="w-full max-w-[360px] lg:max-w-none h-auto rounded-[14px] block"
            style={{
              filter:
                'drop-shadow(0 24px 64px rgba(60,40,10,0.18)) drop-shadow(0 6px 20px rgba(60,40,10,0.10))',
            }}
          />
        </div>

      </div>

      {/* bottom */}
      <div className="px-fluid py-5 text-[0.75rem] text-brand-muted shrink-0">
        {copy.platform}
      </div>

    </div>
  )
}
