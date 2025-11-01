# Debugging Guide for Simple Job Apply Extension

This guide explains how to use the debugging configurations in this project.

## Prerequisites

Make sure you have the following VS Code extensions installed:
- **Debugger for Chrome** (or built-in Chrome debugger)
- **Debugger for Firefox** by Firefox DevTools

## Overview

The project has been configured with several debugging options:

### 📄 Webpage Mode (Best for UI Development)
Use these when you want to work on the UI with hot module replacement (HMR):
- `🚀 Dev: Chrome (Webpage)` - Opens the app as a webpage in Chrome with Vite dev server
- `🚀 Dev: Firefox (Webpage)` - Opens the app as a webpage in Firefox with Vite dev server

**When to use:** 
- Developing UI components
- Testing styles and layouts
- Fast iteration with HMR
- Debugging React components

**Limitations:**
- Browser extension APIs won't work (storage, tabs, etc.)
- No content script functionality

### 🔧 Extension Mode (For Full Extension Testing)
Use these when you need to test actual extension functionality:

#### Chrome Extension Debugging:
- `Extension: Chrome (built)` - One-time build, then debug
- `Extension: Chrome (watch mode)` - Auto-rebuilds on file changes
- `🔧 Dev: Chrome Extension (Watch)` - Compound config (recommended)

#### Firefox Extension Debugging:
- `Extension: Firefox (built)` - One-time build, then debug
- `Extension: Firefox (watch mode)` - Auto-rebuilds on file changes
- `🔧 Dev: Firefox Extension (Watch)` - Compound config (recommended)

**When to use:**
- Testing storage APIs
- Testing content scripts
- Testing sidebar/browser action
- Testing extension permissions

## How to Debug

### Quick Start (Recommended)

1. **For UI Development:**
   - Press `F5` or go to Run & Debug
   - Select `🚀 Dev: Chrome (Webpage)` or `🚀 Dev: Firefox (Webpage)`
   - Set breakpoints in your `.tsx` or `.ts` files
   - Changes auto-reload with HMR

2. **For Extension Development:**
   - Press `F5` or go to Run & Debug
   - Select `🔧 Dev: Chrome Extension (Watch)` or `🔧 Dev: Firefox Extension (Watch)`
   - Set breakpoints in your source files
   - Vite will rebuild on changes, then reload the extension

### Setting Breakpoints

1. Open any `.ts` or `.tsx` file in `src/`
2. Click in the gutter (left of line numbers) to set a red breakpoint dot
3. Start debugging (F5)
4. When code executes, VS Code will pause at your breakpoint

### Debugging Tips

#### Chrome Extension:
- **Reload Extension:** Go to `chrome://extensions` and click the reload icon
- **View Console:** Right-click extension popup → Inspect
- **Background Scripts:** Go to `chrome://extensions` → Details → Inspect views: background page
- **Content Scripts:** Open DevTools on any webpage (F12)

#### Firefox Extension:
- **Reload Extension:** Go to `about:debugging#/runtime/this-firefox` and click Reload
- **View Console:** Click "Inspect" next to your extension
- **Sidebar:** Right-click sidebar → Inspect Sidebar
- **Content Scripts:** Open Browser Console (Ctrl+Shift+J / Cmd+Shift+J)

### Common Issues

#### "Breakpoints not hitting"
- ✅ Make sure source maps are enabled (already configured)
- ✅ Verify the task completed successfully (check terminal output)
- ✅ Try reloading the extension/page
- ✅ Check that you're debugging the right configuration (webpage vs extension)

#### "Task not finishing"
- ✅ The vite:watch task runs continuously - this is expected
- ✅ Wait for "✓ built in Xms" message in terminal before interacting with the app

#### "Extension not loading in Firefox"
- ✅ Check that `dist/manifest.json` exists and is valid
- ✅ The build copies the Firefox manifest automatically
- ✅ Try `Extension: Firefox (built)` first to ensure a clean build

#### "Changes not reflecting"
- ✅ For webpage mode, HMR should work automatically
- ✅ For extension mode with watch, wait for rebuild, then reload extension
- ✅ Some changes (manifest, background scripts) require full extension reload

## Project Structure

```
.vscode/
  ├── launch.json       # Debugging configurations
  ├── tasks.json        # Build tasks
  └── DEBUG_GUIDE.md    # This file

dist/                   # Built extension files
src/                    # Source code
  ├── components/       # React components
  ├── state/           # State management
  └── utils/           # Utilities

public/                 # Static files & manifests
  ├── manifest.json           # Chrome manifest (MV3)
  ├── manifest-firefox.json   # Firefox manifest (MV2)
  ├── background-ff.js        # Background script
  └── contentScript.js        # Content script
```

## Advanced Configuration

### Manual Tasks

You can run these tasks manually from the Command Palette (Ctrl+Shift+P / Cmd+Shift+P):

- `Tasks: Run Task` → `npm: dev` - Start Vite dev server
- `Tasks: Run Task` → `npm: build` - Build once for production
- `Tasks: Run Task` → `vite:watch` - Build in watch mode

### Source Map Debugging

All configurations include source maps for accurate debugging:
- **Webpage mode:** Maps to `src/` directly via Vite
- **Extension mode:** Maps through `dist/` build output
- Breakpoints work in your original `.ts`/`.tsx` files

## Need Help?

- Check the VS Code Debug Console for detailed error messages
- Review terminal output for build errors
- Ensure all dependencies are installed: `npm install`
- Try cleaning the build: Delete `dist/` folder and rebuild

Happy debugging! 🐛
