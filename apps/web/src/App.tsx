const proofPoints = [
  {
    value: '1 shortcut',
    label: 'Copy the newest file without opening Downloads.',
  },
  {
    value: 'N files',
    label: 'Scale from one file to the latest batch when you need more.',
  },
  {
    value: '0 friction',
    label: 'Stay in flow while Sisyphean handles the folder dance for you.',
  },
]

const features = [
  {
    title: 'Shortcut-first',
    body: 'Trigger a system-wide shortcut and send the latest file straight to the clipboard. No detour, no finder window, no drag-and-drop.',
  },
  {
    title: 'Multi-folder aware',
    body: 'Watch multiple download locations, merge them by recency, and grab the right file even when your browser and apps save to different places.',
  },
  {
    title: 'Quietly resident',
    body: 'Live in the background, surface clear notifications, and keep the action available every time you download something important.',
  },
]

const steps = [
  'Choose one or more folders you care about.',
  'Hit your global shortcut when the download finishes.',
  'Paste immediately into chat, email, CMS, Finder, or any target app.',
]

function App() {
  return (
    <div className="relative isolate overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-64 w-[min(72rem,92vw)] bg-[radial-gradient(circle_at_top,_color-mix(in_oklch,var(--brand)_14%,transparent),transparent_72%)]" />

      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 sm:px-8 lg:px-12">
        <a className="inline-flex items-center gap-3 text-sm font-medium tracking-[0.22em] text-[var(--muted-strong)] uppercase" href="#">
          <span className="flex h-3 w-3 rounded-full bg-[var(--brand)] shadow-[0_0_0_6px_color-mix(in_oklch,var(--brand)_12%,transparent)]" />
          Sisyphean
        </a>
        <nav className="hidden items-center gap-8 text-sm text-[var(--muted)] md:flex">
          <a className="transition-colors hover:text-[var(--fg)]" href="#product">
            Product
          </a>
          <a className="transition-colors hover:text-[var(--fg)]" href="#flow">
            Flow
          </a>
          <a className="transition-colors hover:text-[var(--fg)]" href="#principles">
            Principles
          </a>
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-16 px-6 pb-16 sm:px-8 lg:px-12 lg:gap-24 lg:pb-24">
        <section className="grid gap-12 border-y border-[var(--line)] py-10 lg:grid-cols-[minmax(0,1.08fr)_minmax(20rem,0.92fr)] lg:items-end lg:gap-16 lg:py-16">
          <div className="max-w-3xl">
            <p className="reveal-up mb-5 text-xs font-semibold tracking-[0.28em] text-[var(--muted-strong)] uppercase">
              Copy the newest, paste instantly
            </p>
            <h1 className="reveal-up balance max-w-4xl text-[clamp(3.2rem,9vw,7.25rem)] leading-[0.93] font-semibold tracking-[-0.05em] text-[var(--fg)] [text-wrap:balance]">
              One shortcut between download and done.
            </h1>
            <p className="reveal-up mt-6 max-w-2xl text-base leading-8 text-[var(--muted)] sm:text-lg">
              Sisyphean is a lightweight desktop utility for people who constantly
              move the latest file from Downloads into chats, emails, CMS panels,
              ticket systems, and project folders. Instead of opening a directory
              every time, you just press the shortcut and paste.
            </p>

            <div className="reveal-up mt-8 flex flex-wrap gap-3">
              <a
                className="inline-flex items-center justify-center rounded-full bg-[var(--fg)] px-6 py-3 text-sm font-medium text-[var(--bg)] transition-transform duration-200 hover:-translate-y-0.5"
                href="#flow"
              >
                See the flow
              </a>
              <a
                className="inline-flex items-center justify-center rounded-full border border-[var(--line-strong)] px-6 py-3 text-sm font-medium text-[var(--fg)] transition-colors duration-200 hover:border-[var(--fg)]"
                href="#principles"
              >
                Why it feels faster
              </a>
            </div>
          </div>

          <div className="reveal-up relative">
            <div className="hero-shell overflow-hidden rounded-[2rem] border border-[var(--line-strong)] bg-[var(--panel)] p-4 shadow-[var(--shadow-soft)] sm:p-5">
              <div className="grid gap-4 sm:grid-cols-[1.18fr_0.82fr]">
                <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--panel-2)] p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-medium tracking-[0.22em] text-[var(--muted)] uppercase">
                        Latest action
                      </p>
                      <h2 className="mt-3 max-w-xs text-2xl leading-tight font-semibold tracking-[-0.04em] text-[var(--fg)]">
                        Pull the newest file from anywhere you download.
                      </h2>
                    </div>
                    <div className="rounded-full border border-[var(--line)] px-3 py-1 text-xs text-[var(--muted)]">
                      macOS + Windows
                    </div>
                  </div>

                  <div className="mt-8 grid gap-3">
                    {[
                      'Downloads / Safari',
                      'Downloads / Chrome',
                      'Client Assets / Figma exports',
                    ].map((folder) => (
                      <div
                        key={folder}
                        className="flex items-center justify-between rounded-2xl border border-[var(--line)] bg-[var(--bg)] px-4 py-3"
                      >
                        <span className="text-sm text-[var(--muted-strong)]">
                          {folder}
                        </span>
                        <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                          watched
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col justify-between gap-4">
                  <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--bg)] p-5">
                    <p className="text-xs font-medium tracking-[0.22em] text-[var(--muted)] uppercase">
                      Trigger
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {['Option', 'C', '1'].map((keycap) => (
                        <span
                          key={keycap}
                          className="rounded-2xl border border-[var(--line-strong)] bg-[var(--panel)] px-3 py-2 text-sm font-medium text-[var(--fg)] shadow-[inset_0_-2px_0_color-mix(in_oklch,var(--fg)_10%,transparent)]"
                        >
                          {keycap}
                        </span>
                      ))}
                    </div>
                    <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
                      Copy the newest file instantly, or scale the number for the
                      latest batch.
                    </p>
                  </div>

                  <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--ink)] p-5 text-[var(--ink-contrast)]">
                    <p className="text-xs font-medium tracking-[0.22em] uppercase text-[color-mix(in_oklch,var(--ink-contrast)_70%,transparent)]">
                      What users actually want
                    </p>
                    <p className="mt-4 text-xl leading-tight font-medium tracking-[-0.03em]">
                      The file they just downloaded, already on the clipboard.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="principles"
          className="grid gap-6 lg:grid-cols-[0.85fr_minmax(0,1.15fr)]"
        >
          <div className="max-w-xl">
            <p className="text-xs font-semibold tracking-[0.24em] text-[var(--muted-strong)] uppercase">
              Proof, not fluff
            </p>
            <h2 className="mt-4 text-4xl leading-tight font-semibold tracking-[-0.04em] text-[var(--fg)] sm:text-5xl">
              Built for repetitive file work that should never feel repetitive.
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {proofPoints.map((item) => (
              <article
                key={item.value}
                className="rounded-[1.75rem] border border-[var(--line)] bg-[var(--panel)] p-5"
              >
                <p className="text-3xl leading-none font-semibold tracking-[-0.05em] text-[var(--fg)]">
                  {item.value}
                </p>
                <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
                  {item.label}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section
          id="product"
          className="grid gap-12 border-y border-[var(--line)] py-10 lg:grid-cols-[0.8fr_minmax(0,1.2fr)] lg:py-14"
        >
          <div>
            <p className="text-xs font-semibold tracking-[0.24em] text-[var(--muted-strong)] uppercase">
              Core product
            </p>
            <h2 className="mt-4 max-w-lg text-4xl leading-tight font-semibold tracking-[-0.04em] text-[var(--fg)]">
              Designed like a background utility, explained like a sharp tool.
            </h2>
          </div>

          <div className="grid gap-8">
            {features.map((feature, index) => (
              <article
                key={feature.title}
                className="grid gap-4 border-b border-[var(--line)] pb-8 last:border-b-0 last:pb-0 md:grid-cols-[7rem_minmax(0,1fr)]"
              >
                <p className="text-sm tracking-[0.18em] text-[var(--muted)] uppercase">
                  0{index + 1}
                </p>
                <div>
                  <h3 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--fg)]">
                    {feature.title}
                  </h3>
                  <p className="mt-3 max-w-2xl text-base leading-8 text-[var(--muted)]">
                    {feature.body}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section
          id="flow"
          className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]"
        >
          <div className="rounded-[2rem] border border-[var(--line-strong)] bg-[var(--panel)] p-6 shadow-[var(--shadow-soft)] sm:p-8">
            <p className="text-xs font-semibold tracking-[0.24em] text-[var(--muted-strong)] uppercase">
              Flow
            </p>
            <h2 className="mt-4 text-4xl leading-tight font-semibold tracking-[-0.04em] text-[var(--fg)]">
              Three beats. No folder hopping.
            </h2>

            <div className="mt-8 grid gap-4">
              {steps.map((step, index) => (
                <div
                  key={step}
                  className="grid gap-3 rounded-[1.5rem] border border-[var(--line)] bg-[var(--bg)] p-4 sm:grid-cols-[3.5rem_minmax(0,1fr)] sm:items-start"
                >
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--line-strong)] text-sm font-medium text-[var(--fg)]">
                    0{index + 1}
                  </div>
                  <p className="text-sm leading-7 text-[var(--muted-strong)]">
                    {step}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 self-end sm:grid-cols-2">
            <article className="rounded-[1.75rem] border border-[var(--line)] bg-[var(--bg)] p-6">
              <p className="text-xs font-semibold tracking-[0.22em] text-[var(--muted)] uppercase">
                Privacy
              </p>
              <p className="mt-4 text-2xl leading-tight font-semibold tracking-[-0.03em] text-[var(--fg)]">
                No cloud ritual just to move a file.
              </p>
              <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
                Sisyphean is about removing a local, repeated annoyance without
                adding online complexity.
              </p>
            </article>

            <article className="rounded-[1.75rem] border border-[var(--line)] bg-[var(--panel)] p-6">
              <p className="text-xs font-semibold tracking-[0.22em] text-[var(--muted)] uppercase">
                Feedback
              </p>
              <p className="mt-4 text-2xl leading-tight font-semibold tracking-[-0.03em] text-[var(--fg)]">
                Clear system notifications, not noisy dashboards.
              </p>
            </article>

            <article className="rounded-[1.75rem] border border-[var(--line)] bg-[var(--panel)] p-6 sm:col-span-2">
              <p className="text-xs font-semibold tracking-[0.22em] text-[var(--muted)] uppercase">
                Positioning
              </p>
              <p className="mt-4 max-w-2xl text-2xl leading-tight font-semibold tracking-[-0.03em] text-[var(--fg)]">
                A small utility with a sharp promise: less window-switching, less
                friction, more flow.
              </p>
            </article>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
