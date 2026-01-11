# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a minimal static blog generator built with TypeScript. It converts Markdown posts with YAML frontmatter into static HTML pages using a simple template system.

## Package Manager

This project uses **pnpm** (not npm). All dependency operations should use pnpm:
- `pnpm install` - Install dependencies
- `pnpm add <package>` - Add a new dependency
- `pnpm run <script>` - Run package scripts

## Build Commands

- `pnpm run build` - Compile TypeScript and generate static site (compiles to `dist/`, outputs to `docs/`)
- `pnpm run dev` - Watch mode for TypeScript compilation (doesn't regenerate site)
- `pnpm run serve` - Serve the `docs/` directory locally for preview
- `pnpm run lint` - Run oxlint on source files
- `pnpm run lint:fix` - Run oxlint with auto-fix

## Architecture

### Build Pipeline (src/build.ts)

The build process is a single-file script that:

1. **Reads Markdown posts** from `posts/` directory
   - Parses YAML frontmatter using `gray-matter`
   - Skips posts with `draft: true` in frontmatter
   - Extracts metadata: `title`, `date`, `tags`, `draft`

2. **Converts to HTML** using `marked` library
   - Markdown content is converted to HTML
   - Posts are sorted by date (newest first)

3. **Applies templates** with simple string replacement
   - Templates in `templates/` use `{{variable}}` syntax
   - Post template: `{{title}}`, `{{date}}`, `{{content}}`
   - Index template: `{{posts}}`
   - No template engine - just string `.replace()`

4. **Outputs to `docs/`** directory
   - Individual post pages: `docs/<slug>.html`
   - Index page: `docs/index.html`
   - Copies `templates/styles.css` to `docs/styles.css`

### Directory Structure

- `src/build.ts` - Single-file build script
- `posts/` - Markdown files with YAML frontmatter
- `templates/` - HTML templates and CSS
  - `index.html` - Homepage template
  - `post.html` - Individual post template
  - `styles.css` - Shared stylesheet
- `docs/` - Generated output (GitHub Pages compatible)
- `dist/` - Compiled TypeScript (intermediate build artifact)

### Post Format

Posts must have YAML frontmatter:

```markdown
---
title: "Post Title"
date: 2024-01-15
tags: [tag1, tag2]
draft: false
---

Markdown content here...
```

The filename becomes the slug (URL): `posts/2024-01-15-hello-world.md` → `docs/2024-01-15-hello-world.html`

## TypeScript Configuration

- Target: ES2022
- Module system: NodeNext (ESM with `.js` imports)
- Strict mode enabled
- Output: `dist/` directory

## Linting

Uses oxlint (fast Rust-based linter):
- Correctness rules set to error
- Suspicious patterns set to warn
- TypeScript plugin enabled
- Configuration in `.oxlintrc.json`
