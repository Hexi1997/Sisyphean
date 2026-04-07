# Sisyphean

[English](./README.md) | [中文](./README-CN.md)

**Copy the Newest, Paste Instantly.**

Sisyphean is a lightweight desktop utility for people who constantly move the latest file from Downloads into chats, emails, CMS panels, ticket systems, and project folders. Instead of opening a directory every time, you press one shortcut and paste.

## Why The Name

`Sisyphean` comes from Sisyphus in Greek mythology. The word is often used to describe work that is repetitive, tedious, and seemingly endless, which matches the exact frustration this product is trying to remove: repeatedly opening a folder just to copy the newest file.

## One Shortcut Between Download And Done

Most of the time, people do not want a folder. They want the file they just downloaded, already ready to paste.

Sisyphean is built around that exact moment. It stays quietly in the background, watches the folders you care about, and lets you grab the newest file without breaking flow.

## Why It Feels Fast

- Copy the newest file without opening Downloads
- Watch multiple folders and treat them as one recent stream
- Stay in flow instead of bouncing between Finder, Explorer, and your target app
- Scale from one file to the latest batch when you need more

## How It Works

1. Choose one or more folders to watch.
2. Download or export a file as usual.
3. Press your global shortcut.
4. Paste immediately into the app you were already using.

## Core Capabilities

Sisyphean comes with:

- global shortcuts for copying recent files with `modifier + 1..9`
- multiple watched folders merged into one recent-file list
- a settings UI to add folders, remove folders, reveal files, and copy files manually
- tray residency, with window close hiding the app instead of quitting
- bilingual UI with English and Chinese
- launch at startup
- recent file preview inside the desktop app

## Best Fit

Sisyphean is especially useful when you:

- frequently paste newly downloaded files into chat, email, CMS, or ticketing tools
- work across multiple browsers or export folders
- handle repeated file handoff workflows for assets, proposals, or deliverables
- want less window switching and a smoother flow

## Workspace

This repository is a monorepo with two main apps:

- `apps/client`: Tauri + React desktop client
- `apps/web`: React + Vite marketing site

The desktop app is the core product experience. The web app serves as the product and brand site. By default, Sisyphean watches the system Downloads folder when available, and the default modifier is `Option` on macOS and `Alt` on Windows.

## Tech Stack

- Desktop: `Tauri 2` + `React` + `TypeScript`
- Desktop backend: `Rust`
- Web: `React` + `Vite`
- Package manager: `pnpm`

## Project Structure

```text
.
├── apps/
│   ├── client/   # Tauri desktop client
│   └── web/      # marketing / landing site
└── package.json  # root-level scripts
```

## Local Development

### Requirements

- `Node.js`
- `pnpm`
- `Rust`
- platform dependencies required by Tauri

### Install dependencies

```bash
pnpm install
```

### Run the desktop client

```bash
pnpm client:dev
```

### Build the desktop client

```bash
pnpm client:build
```

### Run the web app

```bash
pnpm web:dev
```

### Build the web app

```bash
pnpm web:build
```
