# Sisyphean

[English](./README.md) | [中文](./README-CN.md)

**Copy the Newest, Paste Instantly.**

Sisyphean 是一个面向高频文件搬运场景的桌面效率工具。它解决的不是复杂问题，而是一个每天都会反复发生的小摩擦：文件刚下载完，你还得打开文件夹、找到最新文件、复制，再回到原来的应用。

## 项目名由来

`Sisyphean` 源自希腊神话中的西西弗斯（Sisyphus）。这个词通常用来形容重复、繁琐、仿佛没有尽头的工作，这也正对应了产品想解决的痛点：用户总要反复打开文件夹，只为了复制刚刚下载的最新文件。

## 一次快捷键，直接到位

大多数时候，用户真正想要的不是“打开下载目录”，而是“刚下载的那个文件已经在剪贴板里”。

Sisyphean 就是围绕这个瞬间设计的。它安静地驻留在后台，监听你关心的目录，让“找最新文件”这件事缩短成一次快捷键。

## 为什么它会让人上瘾

- 不用打开下载目录，直接复制最新文件
- 支持多个目录统一监听，不再来回切换
- 减少 Finder / Explorer 和目标应用之间的窗口跳转
- 既能复制 1 个文件，也能快速复制最近一批文件

## 使用方式

1. 选择一个或多个要监听的目录。
2. 像平常一样下载或导出文件。
3. 按下全局快捷键。
4. 直接在当前应用里粘贴。

## 核心能力

Sisyphean 提供：

- 全局快捷键复制最近文件，支持 `修饰键 + 1..9`
- 可配置多个监控目录，并自动汇总最近文件
- 设置界面支持添加目录、移除目录、手动复制、定位文件
- 支持托盘常驻，关闭窗口后隐藏而不是退出
- 支持中英文界面切换
- 支持开机启动
- 支持最近文件预览列表

## 适合谁用

Sisyphean 很适合这类工作流：

- 下载附件后需要立刻粘贴到 IM、邮件或工单系统
- 在多个浏览器或多个导出目录之间来回找最新文件
- 高频整理素材、提案、导出文件或交付物
- 希望减少窗口切换，保持连续操作流

## 仓库组成

仓库采用 monorepo 结构，主要包含：

- `apps/client`：基于 Tauri + React 的桌面客户端
- `apps/web`：基于 React + Vite 的官网/展示页

桌面端是 Sisyphean 的核心产品体验，Web 端主要承担品牌展示和产品介绍。默认情况下，Sisyphean 会优先监听系统下载目录；默认快捷键修饰键为 macOS `Option` / Windows `Alt`。

## 技术栈

- Desktop: `Tauri 2` + `React` + `TypeScript`
- Desktop backend: `Rust`
- Web: `React` + `Vite`
- Package manager: `pnpm`

## 项目结构

```text
.
├── apps/
│   ├── client/   # Tauri 桌面客户端
│   └── web/      # 官网 / 展示页
└── package.json  # 根脚本入口
```

## 本地开发

### 环境要求

- `Node.js`
- `pnpm`
- `Rust`
- Tauri 对应平台依赖

### 安装依赖

```bash
pnpm install
```

### 启动桌面客户端

```bash
pnpm client:dev
```

### 构建桌面客户端

```bash
pnpm client:build
```

### 启动 Web 展示页

```bash
pnpm web:dev
```

### 构建 Web 展示页

```bash
pnpm web:build
```
