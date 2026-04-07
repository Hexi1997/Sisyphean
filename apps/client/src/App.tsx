import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { open } from '@tauri-apps/plugin-dialog'
import {
  disable as disableAutostart,
  enable as enableAutostart,
  isEnabled as isAutostartEnabled,
} from '@tauri-apps/plugin-autostart'
import { useEffect, useEffectEvent, useState } from 'react'
import './App.css'

type ShortcutModifier = 'Alt' | 'Shift' | 'CommandOrControl'

interface AppConfig {
  watchedPaths: string[]
  shortcutModifiers: ShortcutModifier[]
  triggerKey: string
  notificationsEnabled: boolean
}

interface AppState {
  config: AppConfig
  recentFiles: FileItem[]
  isPaused: boolean
  autostartAvailable: boolean
}

interface FileItem {
  path: string
  name: string
  parentDir: string
  extension: string | null
  modifiedAt: number
  modifiedLabel: string
  sizeBytes: number
  sizeLabel: string
}

type Language = 'en' | 'zh'

const modifierOptions: Array<{
  value: ShortcutModifier
  label: string
  macLabel: string
}> = [
  { value: 'Alt', label: 'Alt', macLabel: 'Option' },
  { value: 'CommandOrControl', label: 'Ctrl', macLabel: 'Command' },
  { value: 'Shift', label: 'Shift', macLabel: 'Shift' },
]

const isMac = navigator.userAgent.includes('Mac')
const LANGUAGE_STORAGE_KEY = 'sisyphean-client-language'

const copy = {
  en: {
    loading: 'Loading...',
    close: 'Close',
    language: 'Language',
    languageHint: 'Choose the interface language',
    system: 'System',
    autostart: 'Launch at startup',
    autostartHintAvailable: 'Start with the system so shortcuts stay available',
    autostartHintUnavailable:
      'Disabled in development mode to avoid polluting startup items',
    shortcuts: 'Shortcuts',
    shortcutModifiers: 'Modifiers',
    shortcutModifiersHint: 'Modifier + digits (1-9) trigger copy',
    active: 'Active',
    paused: 'Paused',
    pausedStatus: 'Paused, global shortcuts are not registered',
    noShortcutsActive: 'No active shortcuts',
    watchedPaths: 'Watched paths',
    addDirectory: '+ Add folder',
    selectDirectory: 'Select folders to watch',
    noWatchedPaths: 'No watched paths yet',
    reveal: 'Reveal',
    remove: 'Remove',
    latestFiles: 'Latest files',
    noRecentFiles: 'No files to show yet',
    copyFile: 'Copy',
    runtimePausedBanner: 'Monitoring paused. Shortcuts will not trigger for now.',
    runtimeResumedBanner: 'Monitoring resumed. Shortcuts are active again.',
  },
  zh: {
    loading: '正在加载…',
    close: '关闭',
    language: '语言',
    languageHint: '选择界面显示语言',
    system: '系统',
    autostart: '开机启动',
    autostartHintAvailable: '随系统启动，快捷键始终可用',
    autostartHintUnavailable: '开发模式下已禁用，避免污染系统启动项',
    shortcuts: '快捷键',
    shortcutModifiers: '修饰键',
    shortcutModifiersHint: '修饰键 + 数字（1-9）触发复制',
    active: '已生效',
    paused: '已暂停',
    pausedStatus: '已暂停，不注册全局快捷键',
    noShortcutsActive: '无快捷键生效',
    watchedPaths: '监控路径',
    addDirectory: '+ 添加目录',
    selectDirectory: '选择要监控的目录',
    noWatchedPaths: '尚未添加监控路径',
    reveal: '定位',
    remove: '移除',
    latestFiles: '最新文件',
    noRecentFiles: '还没有可展示的文件',
    copyFile: '复制',
    runtimePausedBanner: '监听已暂停，快捷键暂时不会触发。',
    runtimeResumedBanner: '监听已恢复，快捷键重新生效。',
  },
} as const

function formatShortcut(config: AppConfig, count: number) {
  return [...config.shortcutModifiers, `Digit${count}`].join('+')
}

function displayShortcut(shortcut: string) {
  const formatted = shortcut
    .replace(/Digit(\d)/g, '$1')
    .replace(/Key([A-Z])/g, '$1')
    .split('CommandOrControl')
    .join('Command')
    .split('Alt')
    .join('Option')

  if (isMac) {
    return formatted
  }

  return formatted.split('Option').join('Alt')
}

function buildShortcutSet(config: AppConfig) {
  return Array.from({ length: 9 }, (_, index) => formatShortcut(config, index + 1))
}

function describeShortcutStatus(shortcuts: string[], language: Language) {
  if (shortcuts.length === 0) {
    return copy[language].noShortcutsActive
  }

  return shortcuts
    .slice(0, 3)
    .map((shortcut) => displayShortcut(shortcut))
    .join('、') + (shortcuts.length > 3 ? ' ...' : '')
}

function getModifierLabel(option: (typeof modifierOptions)[number]) {
  return isMac ? option.macLabel : option.label
}

function getPathLabel(path: string) {
  const parts = path.split(/[\\/]/).filter(Boolean)
  return parts[parts.length - 1] ?? path
}

function App() {
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [recentFiles, setRecentFiles] = useState<FileItem[]>([])
  const [isPaused, setIsPaused] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [autostartEnabled, setAutostartEnabled] = useState(false)
  const [autostartAvailable, setAutostartAvailable] = useState(true)
  const [banner, setBanner] = useState<string | null>(null)
  const [language, setLanguage] = useState<Language>(() => {
    try {
      return localStorage.getItem(LANGUAGE_STORAGE_KEY) === 'zh' ? 'zh' : 'en'
    } catch {
      return 'en'
    }
  })

  const text = copy[language]

  const refreshState = useEffectEvent(async () => {
    const nextState = await invoke<AppState>('load_app_state')
    setConfig(nextState.config)
    setRecentFiles(nextState.recentFiles)
    setIsPaused(nextState.isPaused)
    setAutostartAvailable(nextState.autostartAvailable)

    if (!nextState.autostartAvailable) {
      setAutostartEnabled(false)
      return
    }

    try {
      setAutostartEnabled(await isAutostartEnabled())
    } catch {
      setAutostartEnabled(false)
    }
  })

  const saveConfig = useEffectEvent(async (nextConfig: AppConfig) => {
    setConfig(nextConfig)
    const nextState = await invoke<AppState>('save_config', { config: nextConfig })
    setConfig(nextState.config)
    setRecentFiles(nextState.recentFiles)
    setIsPaused(nextState.isPaused)
  })

  const revealPath = useEffectEvent(async (path: string) => {
    try {
      await invoke('reveal_in_folder', { path })
    } catch (error) {
      setBanner(error instanceof Error ? error.message : String(error))
    }
  })

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      try {
        await refreshState()
      } catch (error) {
        if (!cancelled) {
          setBanner(error instanceof Error ? error.message : String(error))
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [refreshState])

  useEffect(() => {
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
    } catch {
      // Ignore storage failures and keep the in-memory language selection.
    }
  }, [language])

  useEffect(() => {
    let unsubscribe = () => {}

    ;(async () => {
      const unlisten = await listen<boolean>('runtime-pause-changed', (event) => {
        setIsPaused(event.payload)
        setBanner(event.payload ? copy[language].runtimePausedBanner : copy[language].runtimeResumedBanner)
      })
      unsubscribe = unlisten
    })()

    return () => {
      unsubscribe()
    }
  }, [language])

  useEffect(() => {
    let unsubscribe = () => {}

    ;(async () => {
      const unlisten = await listen<string>('copy-feedback', (event) => {
        setBanner(event.payload)
      })
      unsubscribe = unlisten
    })()

    return () => {
      unsubscribe()
    }
  }, [])

  if (isLoading || !config) {
    return (
      <main className="page page--loading">
        <p className="loading-text">{text.loading}</p>
      </main>
    )
  }

  const expectedShortcuts = buildShortcutSet(config)
  const shortcutStatus = isPaused
    ? text.pausedStatus
    : describeShortcutStatus(expectedShortcuts, language)

  return (
    <main className="page">
      {banner ? (
        <div className="banner">
          <span>{banner}</span>
          <button type="button" className="link-button" onClick={() => setBanner(null)}>
            {text.close}
          </button>
        </div>
      ) : null}

      <div className="settings">
        <section className="settings-group">
          <div className="settings-row">
            <div className="row-label">
              <span>{text.language}</span>
              <span className="row-hint">{text.languageHint}</span>
            </div>
            <div className="modifier-chips">
              {(['en', 'zh'] as const).map((option) => {
                const checked = language === option

                return (
                  <button
                    key={option}
                    type="button"
                    className={`modifier-chip ${checked ? 'modifier-chip--on' : ''}`}
                    onClick={() => setLanguage(option)}
                  >
                    {option === 'en' ? 'English' : '中文'}
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        <section className="settings-group">
          <div className="settings-row">
            <div className="row-label">
              <span>{text.autostart}</span>
              <span className="row-hint">
                {autostartAvailable
                  ? text.autostartHintAvailable
                  : text.autostartHintUnavailable}
              </span>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={autostartEnabled}
                disabled={!autostartAvailable}
                onChange={async (event) => {
                  try {
                    if (event.currentTarget.checked) {
                      await enableAutostart()
                    } else {
                      await disableAutostart()
                    }
                    setAutostartEnabled(await isAutostartEnabled())
                  } catch (error) {
                    setBanner(String(error))
                  }
                }}
              />
              <span className="switch-track" />
            </label>
          </div>
        </section>

        <section className="settings-group">
          <div className="settings-row">
            <div className="row-label">
              <span>{text.shortcutModifiers}</span>
              <span className="row-hint">{text.shortcutModifiersHint}</span>
            </div>
            <div className="modifier-chips">
              {modifierOptions.map((option) => {
                const checked = config.shortcutModifiers.includes(option.value)

                return (
                  <label
                    key={option.value}
                    className={`modifier-chip ${checked ? 'modifier-chip--on' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => {
                        const nextModifiers = event.currentTarget.checked
                          ? Array.from(new Set([...config.shortcutModifiers, option.value]))
                          : config.shortcutModifiers.filter((item) => item !== option.value)

                        void saveConfig({
                          ...config,
                          shortcutModifiers: nextModifiers,
                        }).catch((error) => setBanner(String(error)))
                      }}
                    />
                    {getModifierLabel(option)}
                  </label>
                )
              })}
            </div>
          </div>

          <div className="settings-row settings-row--static">
            <span className={`run-badge ${isPaused ? 'run-badge--paused' : ''}`}>
              {isPaused ? text.paused : text.active}
            </span>
            <span className="row-hint">{shortcutStatus}</span>
          </div>
        </section>

        <section className="settings-group">
          <div className="settings-row settings-row--head">
            <span className="group-title">{text.watchedPaths}</span>
            <button
              type="button"
              className="add-button"
              onClick={async () => {
                try {
                  const selected = await open({
                    directory: true,
                    multiple: true,
                    title: text.selectDirectory,
                  })

                  if (!selected) return

                  const nextPaths = Array.isArray(selected) ? selected : [selected]
                  const merged = Array.from(
                    new Set([...config.watchedPaths, ...nextPaths].filter(Boolean)),
                  )

                  await saveConfig({ ...config, watchedPaths: merged })
                } catch (error) {
                  setBanner(String(error))
                }
              }}
            >
              {text.addDirectory}
            </button>
          </div>

          {config.watchedPaths.length === 0 ? (
            <div className="settings-row settings-row--empty">
              <span className="row-hint">{text.noWatchedPaths}</span>
            </div>
          ) : (
            config.watchedPaths.map((path) => (
              <div key={path} className="settings-row">
                <div className="row-label">
                  <span>{getPathLabel(path)}</span>
                  <span className="row-hint row-hint--mono">{path}</span>
                </div>
                <div className="row-actions">
                  <button
                    type="button"
                    className="link-button"
                    onClick={() => void revealPath(path)}
                  >
                    {text.reveal}
                  </button>
                  <button
                    type="button"
                    className="link-button"
                    onClick={() => {
                      const nextPaths = config.watchedPaths.filter((item) => item !== path)
                      void saveConfig({ ...config, watchedPaths: nextPaths }).catch((error) =>
                        setBanner(String(error)),
                      )
                    }}
                  >
                    {text.remove}
                  </button>
                </div>
              </div>
            ))
          )}

        </section>

        <section className="settings-group">
          <div className="settings-row settings-row--head">
            <span className="group-title">{text.latestFiles}</span>
          </div>

          {recentFiles.length === 0 ? (
            <div className="settings-row settings-row--empty">
              <span className="row-hint">{text.noRecentFiles}</span>
            </div>
          ) : (
            recentFiles.map((file) => (
              <div key={file.path} className="settings-row">
                <div className="row-label">
                  <span>{file.name}</span>
                  <span className="row-hint row-hint--mono">{file.path}</span>
                </div>
                <div className="row-actions">
                  <button
                    type="button"
                    className="link-button"
                    onClick={() => void revealPath(file.path)}
                  >
                    {text.reveal}
                  </button>
                  <button
                    type="button"
                    className="link-button"
                    onClick={async () => {
                      try {
                        const message = await invoke<string>('copy_file_to_clipboard', {
                          path: file.path,
                        })
                        setBanner(message)
                      } catch (error) {
                        setBanner(error instanceof Error ? error.message : String(error))
                      }
                    }}
                  >
                    {text.copyFile}
                  </button>
                </div>
              </div>
            ))
          )}
        </section>

      </div>
    </main>
  )
}

export default App
