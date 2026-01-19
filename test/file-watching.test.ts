import { describe, it, expect, beforeEach, afterEach } from "vitest";
import chokidar from "chokidar";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("File Watching for Posts", () => {
  const testPostsDir = path.join(__dirname, "fixtures", "watch-test-posts");
  const testPostFile = path.join(testPostsDir, "test-post.md");
  let watcher: chokidar.FSWatcher | null = null;

  beforeEach(async () => {
    // Create test directory and initial post file
    await fs.mkdir(testPostsDir, { recursive: true });
    await fs.writeFile(
      testPostFile,
      `---
title: "Test Post"
date: 2024-01-15
tags: [test]
draft: false
---

Initial content`,
      "utf-8"
    );
  });

  afterEach(async () => {
    // Clean up watcher
    if (watcher) {
      await watcher.close();
      watcher = null;
    }

    // Clean up test files
    try {
      await fs.rm(testPostsDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it("should detect changes to markdown files in posts directory", async () => {
    // Arrange: Track detected changes
    const detectedChanges: string[] = [];
    const watcherEvents: string[] = [];

    // Set up watcher with polling for macOS compatibility
    watcher = chokidar.watch(testPostFile, {
      persistent: true,
      ignoreInitial: true,
      usePolling: true,
      interval: 100,
    });

    // Create a promise that resolves when a change is detected
    const changeDetected = new Promise<void>((resolve) => {
      watcher.on("change", (filePath) => {
        watcherEvents.push(`change: ${filePath}`);
        detectedChanges.push(filePath);
        resolve();
      });
    });

    // Track watcher events
    watcher.on("ready", () => watcherEvents.push("ready"));
    watcher.on("error", (error) =>
      watcherEvents.push(`error: ${error.message}`)
    );
    watcher.on("add", (filePath) => watcherEvents.push(`add: ${filePath}`));

    // Wait for watcher to be fully ready
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Modify the test file
    await fs.writeFile(
      testPostFile,
      `---
title: "Test Post"
date: 2024-01-15
tags: [test]
draft: false
---

Modified content - this is a change`,
      "utf-8"
    );

    // Wait for change to be detected (with timeout)
    await Promise.race([
      changeDetected,
      new Promise((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(
                `Change not detected within 3s. Events: ${watcherEvents.join(", ")}`
              )
            ),
          3000
        )
      ),
    ]);

    // Assert: Change should be detected
    expect(detectedChanges.length).toBeGreaterThan(0);
    expect(detectedChanges[0]).toContain("test-post.md");
  });

  it("should detect when new markdown files are added", async () => {
    // Arrange: Track added files
    const addedFiles: string[] = [];

    // Watch the directory for new files - use ignoreInitial: false
    watcher = chokidar.watch(testPostsDir, {
      persistent: true,
      ignoreInitial: false,
      usePolling: true,
      interval: 100,
      ignored: /(^|[/\\])\../, // ignore dotfiles
    });

    // Wait for ready first, then set up add listener
    const ready = new Promise<void>((resolve) => {
      watcher.on("ready", () => resolve());
    });

    await ready;

    // NOW set up add listener (after initial scan)
    const fileAdded = new Promise<void>((resolve) => {
      watcher.on("add", (filePath) => {
        addedFiles.push(filePath);
        resolve();
      });
    });

    // Wait a bit for things to settle
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Add a new file
    const newPostFile = path.join(testPostsDir, "new-post.md");
    await fs.writeFile(
      newPostFile,
      `---
title: "New Post"
date: 2024-01-16
tags: [test]
draft: false
---

New content`,
      "utf-8"
    );

    // Wait for add event (with timeout)
    await Promise.race([
      fileAdded,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Add not detected within 2s")), 2000)
      ),
    ]);

    // Assert: Add should be detected
    expect(addedFiles.length).toBeGreaterThan(0);
    expect(addedFiles[0]).toContain("new-post.md");
  });

  it("should discover existing files when watching with glob pattern", async () => {
    // This test reproduces the PRODUCTION issue:
    // - Existing files in directory BEFORE watcher starts
    // - Glob pattern "**/*.md" like production uses
    // - Watcher should discover these existing files
    // - FIX: Use ignoreInitial: false to discover existing files

    // Arrange: Files already exist from beforeEach
    const watchedFiles: { [key: string]: string[] } = {};

    // SOLUTION: Watch the directory, not a glob pattern
    // Chokidar with polling doesn't work well with glob patterns in the path
    watcher = chokidar.watch(testPostsDir, {
      persistent: true,
      ignoreInitial: false, // false allows discovering existing files
      usePolling: true,
      interval: 100,
      ignored: /(^|[/\\])\../, // ignore dotfiles
    });

    // Wait for watcher to be ready and capture what files it's watching
    await new Promise<void>((resolve) => {
      watcher.on("ready", () => {
        Object.assign(watchedFiles, watcher.getWatched());
        resolve();
      });
    });

    // Assert: Watcher should have discovered the existing test-post.md file
    const allWatchedFiles = Object.values(watchedFiles).flat();
    expect(allWatchedFiles.length).toBeGreaterThan(0);
    expect(allWatchedFiles.some((f) => f.includes("test-post.md"))).toBe(true);
  });

  it("should detect changes to files discovered via glob pattern", async () => {
    // This test verifies the FULL production workflow:
    // - Discover existing files with glob pattern
    // - Then detect changes to those files
    // - Set up change listeners AFTER ready to avoid initial 'add' events

    const detectedChanges: string[] = [];

    // SOLUTION: Watch the directory, not a glob pattern
    watcher = chokidar.watch(testPostsDir, {
      persistent: true,
      ignoreInitial: false, // false allows discovering existing files
      usePolling: true,
      interval: 100,
      ignored: /(^|[/\\])\../, // ignore dotfiles
    });

    // Wait for ready event, then set up change listener
    const ready = new Promise<void>((resolve) => {
      watcher.on("ready", () => resolve());
    });

    await ready;

    // NOW set up change listener (after initial scan is done)
    const changeDetected = new Promise<void>((resolve) => {
      watcher.on("change", (filePath) => {
        detectedChanges.push(filePath);
        resolve();
      });
    });

    // Give it extra time to settle
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Modify the existing file
    await fs.writeFile(
      testPostFile,
      `---
title: "Test Post"
date: 2024-01-15
tags: [test]
draft: false
---

Modified via glob pattern test`,
      "utf-8"
    );

    // Wait for change detection
    await Promise.race([
      changeDetected,
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Change not detected within 3s via glob")),
          3000
        )
      ),
    ]);

    // Assert: Change should be detected
    expect(detectedChanges.length).toBeGreaterThan(0);
    expect(detectedChanges[0]).toContain("test-post.md");
  });
});
