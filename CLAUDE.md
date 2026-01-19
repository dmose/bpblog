# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a minimal static blog generator built with TypeScript. It converts Markdown posts with YAML frontmatter into static HTML pages using a simple template system.

## Documentation Maintenance

When working on code changes, update documentation if ANY of these apply:

- **New exported functions**: Document all exports in the "Exported Functions" section with signatures and descriptions
- **New scripts/commands**: Update the "Build Commands" table in both CLAUDE.md and README.md
- **New features**: Add architectural documentation to CLAUDE.md and user-facing docs to README.md
- **Changed behavior**: Update existing sections rather than leaving them outdated
- **New dependencies**: Document why they were added and how they're used (e.g., chokidar for file watching)

Remove or update sections that become inaccurate after changes.

## Package Manager

This project uses **pnpm** (not npm). All dependency operations should use pnpm:

- `pnpm install` - Install dependencies
- `pnpm add <package>` - Add a new dependency
- `pnpm run <script>` - Run package scripts

## Build Commands

- `pnpm run build` - Compile TypeScript and generate static site (compiles to `dist/`, outputs to `docs/`)
- `pnpm run dev` - Development mode with file watching, auto-rebuild, and local server (http://localhost:3000)
- `pnpm run serve` - Serve the `docs/` directory locally for preview
- `pnpm test` - Run tests in watch mode
- `pnpm run test:run` - Run tests once (CI mode)
- `pnpm run lint` - Run oxlint on source files
- `pnpm run lint:fix` - Run oxlint with auto-fix

## Architecture

### Build Pipeline (src/build.ts)

The build process is a single-file script that:

1. **Reads Markdown posts** from `posts/` directory
   - Parses YAML frontmatter using `gray-matter`
   - Processes all posts including drafts (drafts are built as HTML but hidden from index)
   - Extracts metadata: `title`, `date`, `tags`, `draft`

2. **Converts to HTML** using `marked` library
   - Markdown content is converted to HTML
   - Posts are sorted by date (newest first)

3. **Applies templates** with simple string replacement
   - Templates in `templates/` use `{{variable}}` syntax
   - Post template: `{{title}}`, `{{date}}`, `{{content}}`
   - Index template: `{{posts}}`
   - No template engine - just string `.replaceAll()` to handle multiple variable occurrences

4. **Outputs to `docs/`** directory
   - Individual post pages: `docs/<slug>.html` (includes drafts for direct URL access)
   - Index page: `docs/index.html` (filters out drafts from listing)
   - Copies `templates/styles.css` to `docs/styles.css`

### Exported Functions for Testing

The build script exports several functions for unit testing:

- `build(): Promise<void>` - Main build function exported for programmatic use (used by dev mode)
- `parsePost(filename: string, fileContent: string): Promise<Post | null>` - Parses a markdown file into a Post object
- `filterPostsForIndex(posts: Post[]): Post[]` - Filters out drafts and sorts posts by date (newest first)
- `buildPost(post: Post, template: string, outputDir?: string): Promise<void>` - Builds a single post HTML file with optional output directory

### Development Mode (src/dev.ts)

The dev mode provides a comprehensive development environment:

1. **File Watching** using `chokidar` library
   - Watches `src/` for TypeScript changes
   - Watches `posts/` for Markdown changes
   - Watches `templates/` for HTML/CSS changes
   - Uses polling mode for reliable macOS compatibility

2. **Auto-rebuild Pipeline**
   - TypeScript recompilation when `.ts` files change
   - Site regeneration when any watched files change
   - Debounced rebuilds (300ms) to prevent excessive rebuilding
   - Prevents concurrent builds with rebuild locking

3. **Local Development Server**
   - Automatically starts server at http://localhost:3000
   - Serves the `docs/` directory
   - Graceful shutdown on SIGINT/SIGTERM

4. **Developer Experience**
   - Single command starts entire dev environment
   - Console output shows what's being watched
   - Emoji indicators for build stages
   - Error handling preserves dev mode on build failures

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

**Draft Behavior**: Posts with `draft: true` are built as HTML files (accessible via direct URL) but filtered out from the homepage index listing. This allows previewing draft posts without exposing them in the main navigation.

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

## Code Formatting

Uses Prettier for consistent code formatting across all file types:

### Configuration

- Configuration file: `.prettierrc`
- Style: 2-space indentation, double quotes, semicolons, trailing commas
- Formats: TypeScript (`.ts`), Markdown (`.md`), HTML (`.html`), JSON (`.json`)

### Format Scripts

- `pnpm run format` - Format all files in the project
- `pnpm run format:check` - Check if files are formatted (used in CI)

### Pre-Commit Hook

The project uses husky + lint-staged to automatically format files before committing:

- Staged files are automatically formatted with Prettier
- TypeScript files also run through `oxlint --fix`
- Hook is defined in `.husky/pre-commit`

### CI Integration

GitHub Actions workflow (`.github/workflows/format-check.yml`) runs on push and pull requests to ensure all code is properly formatted. The workflow will fail if any files don't match Prettier's formatting rules.

## Testing

The project uses Vitest for testing:

### Configuration

- Test framework: Vitest (fast, modern testing framework)
- Configuration file: `vitest.config.ts`
- Test directory: `test/`
- Environment: Node.js

### Test Coverage

The test suite covers:

- **Post parsing**: Verifying correct parsing of markdown files with YAML frontmatter
- **Draft filtering**: Ensuring drafts are excluded from index but still built
- **Template variable replacement**: Testing that `.replaceAll()` handles multiple occurrences of variables (e.g., `{{title}}` in both `<title>` and `<h1>` tags)
- **Build integration**: End-to-end tests verifying complete build output

### Running Tests

- `pnpm test` - Run tests in watch mode (automatically reruns on file changes)
- `pnpm run test:run` - Run tests once (useful for CI pipelines)

### Test Structure

Tests are organized following the TDD methodology:

- Arrange-Act-Assert pattern
- Isolated test output directories
- Cleanup in beforeEach/afterEach hooks
- Integration tests use actual build artifacts
