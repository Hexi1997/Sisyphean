use anyhow::{anyhow, Context};
use chrono::{DateTime, Local};
use serde::{Deserialize, Serialize};
use std::{
    collections::BTreeSet,
    fs,
    path::{Path, PathBuf},
    process::Command,
    sync::Mutex,
    time::SystemTime,
};
#[cfg(target_os = "macos")]
use std::sync::mpsc;
use tauri::{
    menu::{CheckMenuItem, Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, State, Window, Wry,
};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

const CONFIG_FILE_NAME: &str = "client.config.json";
const SHOW_MENU_ID: &str = "show";
const TOGGLE_PAUSE_MENU_ID: &str = "toggle_pause";
const QUIT_MENU_ID: &str = "quit";
const RECENT_FILES_PREVIEW_LIMIT: usize = 9;
const AUTOSTART_FLAG: &str = "--autostart";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[serde(default)]
struct AppConfig {
    watched_paths: Vec<String>,
    shortcut_modifiers: Vec<String>,
    trigger_key: String,
    notifications_enabled: bool,
    #[serde(default = "default_preview_count")]
    preview_count: u8,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            watched_paths: default_watched_paths(),
            shortcut_modifiers: vec!["Alt".into()],
            trigger_key: "C".into(),
            notifications_enabled: true,
            preview_count: 8,
        }
    }
}

fn default_preview_count() -> u8 {
    RECENT_FILES_PREVIEW_LIMIT as u8
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct FileItem {
    path: String,
    name: String,
    parent_dir: String,
    extension: Option<String>,
    modified_at: i64,
    modified_label: String,
    size_bytes: u64,
    size_label: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct AppStatePayload {
    config: AppConfig,
    recent_files: Vec<FileItem>,
    is_paused: bool,
    autostart_available: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct CopyResult {
    count: usize,
    files: Vec<FileItem>,
    message: String,
}

#[derive(Default)]
struct RuntimeState {
    paused: Mutex<bool>,
    pause_menu_item: Mutex<Option<CheckMenuItem<Wry>>>,
    registered_shortcuts: Mutex<Vec<String>>,
}

#[tauri::command]
fn load_app_state(
    app: AppHandle<Wry>,
    runtime_state: State<'_, RuntimeState>,
) -> Result<AppStatePayload, String> {
    load_payload(&app, &runtime_state).map_err(|error| error.to_string())
}

#[tauri::command]
fn save_config(
    app: AppHandle<Wry>,
    runtime_state: State<'_, RuntimeState>,
    config: AppConfig,
) -> Result<AppStatePayload, String> {
    let normalized = normalize_config(config);
    save_config_to_disk(&app, &normalized).map_err(|error| error.to_string())?;
    sync_global_shortcuts(&app, &runtime_state).map_err(|error| error.to_string())?;
    load_payload(&app, &runtime_state).map_err(|error| error.to_string())
}

#[tauri::command]
fn copy_latest_files(app: AppHandle<Wry>, count: u8) -> Result<CopyResult, String> {
    perform_copy_latest_files(&app, count).map_err(|error| error.to_string())
}

#[tauri::command]
fn copy_file_to_clipboard(app: AppHandle<Wry>, path: String) -> Result<String, String> {
    perform_copy_file_to_clipboard(&app, &path).map_err(|error| error.to_string())
}

fn perform_copy_latest_files(app: &AppHandle<Wry>, count: u8) -> anyhow::Result<CopyResult> {
    let config = load_or_default_config(app)?;
    let files = collect_recent_files(&config, count.max(1) as usize)?;

    if files.is_empty() {
        return Err(anyhow!("当前监控目录中还没有可复制的文件。"));
    }

    let paths = files
        .iter()
        .map(|file| PathBuf::from(&file.path))
        .collect::<Vec<_>>();
    copy_paths_to_clipboard(app, &paths)?;

    Ok(CopyResult {
        count: files.len(),
        message: format!(
            "已复制最近 {} 个文件：{}",
            files.len(),
            files
                .iter()
                .map(|file| file.name.as_str())
                .collect::<Vec<_>>()
                .join("、")
        ),
        files,
    })
}

fn perform_copy_file_to_clipboard(app: &AppHandle<Wry>, path: &str) -> anyhow::Result<String> {
    copy_paths_to_clipboard(app, &[PathBuf::from(path)])?;

    let file_name = Path::new(path)
        .file_name()
        .map(|value| value.to_string_lossy().to_string())
        .unwrap_or_else(|| path.to_string());

    Ok(format!("已复制文件：{file_name}"))
}

#[tauri::command]
fn set_paused(
    app: AppHandle<Wry>,
    runtime_state: State<'_, RuntimeState>,
    paused: bool,
) -> Result<bool, String> {
    apply_paused_state(&app, &runtime_state, paused).map_err(|error| error.to_string())?;
    sync_global_shortcuts(&app, &runtime_state).map_err(|error| error.to_string())?;
    Ok(paused)
}

#[tauri::command]
fn reveal_in_folder(path: String) -> Result<(), String> {
    reveal_path(Path::new(&path)).map_err(|error| error.to_string())
}

fn load_payload(
    app: &AppHandle<Wry>,
    runtime_state: &State<'_, RuntimeState>,
) -> anyhow::Result<AppStatePayload> {
    let config = load_or_default_config(app)?;
    let recent_files = collect_recent_files(&config, RECENT_FILES_PREVIEW_LIMIT)?;
    let is_paused = *runtime_state
        .paused
        .lock()
        .map_err(|_| anyhow!("failed to read runtime pause state"))?;

    Ok(AppStatePayload {
        config,
        recent_files,
        is_paused,
        autostart_available: autostart_available(),
    })
}

fn autostart_available() -> bool {
    !cfg!(debug_assertions)
}

fn is_autostart_launch() -> bool {
    std::env::args_os().any(|argument| argument == AUTOSTART_FLAG)
}

fn load_or_default_config(app: &AppHandle<Wry>) -> anyhow::Result<AppConfig> {
    let config_path = config_file_path(app)?;

    if !config_path.exists() {
        return Ok(AppConfig::default());
    }

    let contents = fs::read_to_string(&config_path)
        .with_context(|| format!("failed to read config file at {}", config_path.display()))?;
    let config = serde_json::from_str::<AppConfig>(&contents)
        .with_context(|| format!("failed to parse config file at {}", config_path.display()))?;

    Ok(normalize_config(config))
}

fn save_config_to_disk(app: &AppHandle<Wry>, config: &AppConfig) -> anyhow::Result<()> {
    let config_path = config_file_path(app)?;
    if let Some(parent) = config_path.parent() {
        fs::create_dir_all(parent)
            .with_context(|| format!("failed to create config directory {}", parent.display()))?;
    }

    let contents = serde_json::to_string_pretty(config)?;
    fs::write(&config_path, contents)
        .with_context(|| format!("failed to write config file {}", config_path.display()))?;
    Ok(())
}

fn config_file_path(app: &AppHandle<Wry>) -> anyhow::Result<PathBuf> {
    Ok(app
        .path()
        .app_config_dir()
        .context("failed to resolve app config directory")?
        .join(CONFIG_FILE_NAME))
}

fn normalize_config(mut config: AppConfig) -> AppConfig {
    config.watched_paths = dedupe_strings(config.watched_paths);
    config.shortcut_modifiers = dedupe_strings(config.shortcut_modifiers)
        .into_iter()
        .filter(|modifier| matches!(modifier.as_str(), "Alt" | "Shift" | "CommandOrControl"))
        .collect();

    if config.shortcut_modifiers.is_empty() {
        config.shortcut_modifiers.push("Alt".into());
    }

    config.trigger_key = config
        .trigger_key
        .chars()
        .find(|character| character.is_ascii_alphanumeric())
        .map(|character| character.to_ascii_uppercase().to_string())
        .unwrap_or_else(|| "C".into());
    config.preview_count = config.preview_count.clamp(3, 20);
    config
}

fn build_shortcuts(config: &AppConfig) -> Vec<(String, u8)> {
    (1..=9)
        .map(|count| {
            (
                format!("{}+Digit{count}", config.shortcut_modifiers.join("+")),
                count,
            )
        })
        .collect()
}

fn dedupe_strings(items: Vec<String>) -> Vec<String> {
    let mut seen = BTreeSet::new();

    items
        .into_iter()
        .filter_map(|item| {
            let trimmed = item.trim();
            if trimmed.is_empty() {
                return None;
            }

            if seen.insert(trimmed.to_string()) {
                Some(trimmed.to_string())
            } else {
                None
            }
        })
        .collect()
}

fn default_watched_paths() -> Vec<String> {
    dirs::download_dir()
        .map(|path| vec![path.to_string_lossy().to_string()])
        .unwrap_or_default()
}

fn collect_recent_files(config: &AppConfig, limit: usize) -> anyhow::Result<Vec<FileItem>> {
    let mut files = Vec::new();

    for path in &config.watched_paths {
        let directory = Path::new(path);
        if !directory.is_dir() {
            continue;
        }

        let entries = match fs::read_dir(directory) {
            Ok(entries) => entries,
            Err(_) => continue,
        };

        for entry in entries.flatten() {
            let entry_path = entry.path();
            if !entry_path.is_file() {
                continue;
            }

            if entry_path
                .file_name()
                .and_then(|value| value.to_str())
                .is_some_and(|name| name == ".DS_Store")
            {
                continue;
            }

            let metadata = match entry.metadata() {
                Ok(metadata) => metadata,
                Err(_) => continue,
            };
            let modified_at = match metadata.modified() {
                Ok(modified_at) => modified_at,
                Err(_) => continue,
            };

            files.push(to_file_item(&entry_path, &metadata, modified_at));
        }
    }

    files.sort_by(|left, right| right.modified_at.cmp(&left.modified_at));
    files.truncate(limit);
    Ok(files)
}

fn to_file_item(path: &Path, metadata: &fs::Metadata, modified_at: SystemTime) -> FileItem {
    let modified_at_local: DateTime<Local> = modified_at.into();
    let name = path
        .file_name()
        .map(|value| value.to_string_lossy().to_string())
        .unwrap_or_else(|| path.display().to_string());
    let parent_dir = path
        .parent()
        .map(|value| value.to_string_lossy().to_string())
        .unwrap_or_default();

    FileItem {
        path: path.to_string_lossy().to_string(),
        name,
        parent_dir,
        extension: path
            .extension()
            .map(|value| value.to_string_lossy().to_uppercase()),
        modified_at: modified_at_local.timestamp(),
        modified_label: modified_at_local.format("%Y-%m-%d %H:%M:%S").to_string(),
        size_bytes: metadata.len(),
        size_label: format_file_size(metadata.len()),
    }
}

fn format_file_size(size: u64) -> String {
    const UNITS: [&str; 5] = ["B", "KB", "MB", "GB", "TB"];

    let mut value = size as f64;
    let mut unit_index = 0usize;
    while value >= 1024.0 && unit_index < UNITS.len() - 1 {
        value /= 1024.0;
        unit_index += 1;
    }

    if unit_index == 0 {
        format!("{size} {}", UNITS[unit_index])
    } else {
        format!("{value:.1} {}", UNITS[unit_index])
    }
}

fn copy_paths_to_clipboard(_app: &AppHandle<Wry>, paths: &[PathBuf]) -> anyhow::Result<()> {
    if paths.is_empty() {
        return Err(anyhow!("no files available to copy"));
    }

    #[cfg(target_os = "macos")]
    {
        return copy_paths_to_clipboard_macos(_app, paths);
    }

    #[cfg(target_os = "windows")]
    {
        let items = paths
            .iter()
            .map(|path| format!("'{}'", path.display().to_string().replace('\'', "''")))
            .collect::<Vec<_>>()
            .join(", ");
        let script = format!("Set-Clipboard -Path @({items})");

        run_command(
            Command::new("powershell")
                .arg("-NoProfile")
                .arg("-Command")
                .arg(script),
        )
        .context("failed to copy file references to the Windows clipboard")?;
        return Ok(());
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        let payload = paths
            .iter()
            .map(|path| path.to_string_lossy().to_string())
            .collect::<Vec<_>>()
            .join("\n");

        if run_command(
            Command::new("sh")
                .arg("-lc")
                .arg(format!("printf %s {:?} | wl-copy", payload)),
        )
        .is_ok()
        {
            return Ok(());
        }

        if run_command(Command::new("sh").arg("-lc").arg(format!(
            "printf %s {:?} | xclip -selection clipboard",
            payload
        )))
        .is_ok()
        {
            return Ok(());
        }

        return Err(anyhow!(
            "clipboard file copy is not implemented for this platform"
        ));
    }
}

fn reveal_path(path: &Path) -> anyhow::Result<()> {
    #[cfg(target_os = "macos")]
    {
        run_command(Command::new("open").arg("-R").arg(path))
            .context("failed to reveal the file in Finder")?;
        return Ok(());
    }

    #[cfg(target_os = "windows")]
    {
        run_command(Command::new("explorer").arg(format!("/select,{}", path.display())))
            .context("failed to reveal the file in Explorer")?;
        return Ok(());
    }

    #[cfg(target_os = "linux")]
    {
        let target = path.parent().unwrap_or(path);
        run_command(Command::new("xdg-open").arg(target))
            .context("failed to reveal the file on Linux")?;
        return Ok(());
    }

    #[allow(unreachable_code)]
    Err(anyhow!("revealing files is not supported on this platform"))
}

fn run_command(command: &mut Command) -> anyhow::Result<()> {
    let output = command.output()?;
    if output.status.success() {
        return Ok(());
    }

    Err(anyhow!(
        "{}",
        String::from_utf8_lossy(&output.stderr).trim().to_string()
    ))
}

#[cfg(target_os = "macos")]
fn copy_paths_to_clipboard_macos(app: &AppHandle<Wry>, paths: &[PathBuf]) -> anyhow::Result<()> {
    use objc2::runtime::ProtocolObject;
    use objc2_app_kit::{NSPasteboard, NSPasteboardWriting};
    use objc2_foundation::{NSArray, NSURL};

    let (sender, receiver) = mpsc::channel();
    let paths = paths.to_vec();

    app.run_on_main_thread(move || {
        let result = (|| -> anyhow::Result<()> {
            let url_objects: Vec<_> = paths
                .iter()
                .filter_map(|path| NSURL::from_file_path(path))
                .map(ProtocolObject::<dyn NSPasteboardWriting>::from_retained)
                .collect();

            if url_objects.is_empty() {
                return Err(anyhow!("failed to create file URLs for the clipboard"));
            }

            let pasteboard = NSPasteboard::generalPasteboard();
            pasteboard.clearContents();

            let objects = NSArray::from_retained_slice(&url_objects);
            if !pasteboard.writeObjects(&objects) {
                return Err(anyhow!("macOS rejected the file list clipboard payload"));
            }

            Ok(())
        })();

        let _ = sender.send(result);
    })?;

    receiver
        .recv()
        .map_err(|_| anyhow!("failed to receive macOS clipboard result"))?
}

fn apply_paused_state(
    app: &AppHandle<Wry>,
    runtime_state: &RuntimeState,
    paused: bool,
) -> anyhow::Result<()> {
    {
        let mut pause_state = runtime_state
            .paused
            .lock()
            .map_err(|_| anyhow!("failed to update pause state"))?;
        *pause_state = paused;
    }

    if let Some(menu_item) = runtime_state
        .pause_menu_item
        .lock()
        .map_err(|_| anyhow!("failed to access pause menu item"))?
        .clone()
    {
        menu_item.set_checked(!paused)?;
        menu_item.set_text(if paused {
            "Resume monitoring"
        } else {
            "Pause monitoring"
        })?;
    }

    app.emit("runtime-pause-changed", paused)?;
    Ok(())
}

fn sync_global_shortcuts(app: &AppHandle<Wry>, runtime_state: &RuntimeState) -> anyhow::Result<()> {
    let existing_shortcuts = runtime_state
        .registered_shortcuts
        .lock()
        .map_err(|_| anyhow!("failed to access registered shortcuts"))?
        .clone();

    if !existing_shortcuts.is_empty() {
        app.global_shortcut()
            .unregister_multiple(existing_shortcuts.iter().map(|shortcut| shortcut.as_str()))?;
    }

    {
        let mut registered_shortcuts = runtime_state
            .registered_shortcuts
            .lock()
            .map_err(|_| anyhow!("failed to reset registered shortcuts"))?;
        registered_shortcuts.clear();
    }

    let paused = *runtime_state
        .paused
        .lock()
        .map_err(|_| anyhow!("failed to read pause state"))?;
    if paused {
        return Ok(());
    }

    let config = load_or_default_config(app)?;
    let mut registered = Vec::new();

    for (shortcut, count) in build_shortcuts(&config) {
        let shortcut_label = shortcut.clone();
        app.global_shortcut()
            .on_shortcut(shortcut.as_str(), move |app, _shortcut, event| {
                if event.state != ShortcutState::Pressed {
                    return;
                }

                match perform_copy_latest_files(app, count) {
                    Ok(result) => {
                        let _ = app.emit("copy-feedback", result.message);
                    }
                    Err(error) => {
                        let _ = app.emit("copy-feedback", error.to_string());
                    }
                }
            })?;
        registered.push(shortcut_label);
    }

    let mut registered_shortcuts = runtime_state
        .registered_shortcuts
        .lock()
        .map_err(|_| anyhow!("failed to persist registered shortcuts"))?;
    *registered_shortcuts = registered;

    Ok(())
}

fn show_main_window(app: &AppHandle<Wry>) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

fn build_tray(app: &AppHandle<Wry>, runtime_state: &RuntimeState) -> anyhow::Result<()> {
    let show_item = MenuItem::with_id(app, SHOW_MENU_ID, "Open dashboard", true, None::<&str>)?;
    let pause_item = CheckMenuItem::with_id(
        app,
        TOGGLE_PAUSE_MENU_ID,
        "Pause monitoring",
        true,
        true,
        None::<&str>,
    )?;
    let quit_item = MenuItem::with_id(app, QUIT_MENU_ID, "Quit Sisyphean", true, None::<&str>)?;
    let separator = PredefinedMenuItem::separator(app)?;
    let menu = Menu::with_items(app, &[&show_item, &pause_item, &separator, &quit_item])?;

    TrayIconBuilder::with_id("sisyphean-tray")
        .icon(
            app.default_window_icon()
                .cloned()
                .context("failed to resolve default tray icon")?,
        )
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                show_main_window(&tray.app_handle());
            }
        })
        .build(app)?;

    let mut stored_item = runtime_state
        .pause_menu_item
        .lock()
        .map_err(|_| anyhow!("failed to store tray menu item"))?;
    *stored_item = Some(pause_item);
    Ok(())
}

fn handle_window_close(window: &Window<Wry>, event: &tauri::WindowEvent) {
    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
        api.prevent_close();
        let _ = window.hide();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            if args.iter().any(|argument| argument == AUTOSTART_FLAG) {
                return;
            }

            show_main_window(app);
        }))
        .manage(RuntimeState::default())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(
            tauri_plugin_autostart::Builder::new()
                .arg(AUTOSTART_FLAG)
                .build(),
        )
        .setup(|app| {
            let runtime_state = app.state::<RuntimeState>();
            build_tray(app.handle(), &runtime_state)?;
            sync_global_shortcuts(app.handle(), &runtime_state)?;
            if is_autostart_launch() {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.hide();
                }
            }
            Ok(())
        })
        .on_menu_event(|app, event| match event.id.as_ref() {
            SHOW_MENU_ID => show_main_window(app),
            TOGGLE_PAUSE_MENU_ID => {
                let runtime_state = app.state::<RuntimeState>();
                let next_paused = runtime_state
                    .paused
                    .lock()
                    .map(|paused| !*paused)
                    .unwrap_or(false);
                let _ = apply_paused_state(app, &runtime_state, next_paused);
            }
            QUIT_MENU_ID => app.exit(0),
            _ => {}
        })
        .on_window_event(handle_window_close)
        .invoke_handler(tauri::generate_handler![
            load_app_state,
            save_config,
            copy_latest_files,
            copy_file_to_clipboard,
            set_paused,
            reveal_in_folder
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app, event| {
            #[cfg(target_os = "macos")]
            if let tauri::RunEvent::Reopen {
                has_visible_windows: false,
                ..
            } = event
            {
                show_main_window(app);
            }
        });
}
