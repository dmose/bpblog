import chokidar from "chokidar";
import { exec, spawn } from "child_process";
import { promisify } from "util";
import { build } from "./build.js";
import type { ChildProcess } from "child_process";

const execAsync = promisify(exec);

let rebuildTimeout: NodeJS.Timeout | null = null;
let isRebuilding = false;
let serverProcess: ChildProcess | null = null;
const DEBOUNCE_MS = 300;
const SERVE_PORT = 3000;
const SERVE_URL = `http://localhost:${SERVE_PORT}`;

// Common watcher configuration for reliable file watching on macOS
// Note: ignoreInitial must be false with polling to discover existing files
// Event handlers must be set up AFTER 'ready' event to avoid rebuilding on startup
const WATCHER_CONFIG = {
  persistent: true,
  ignoreInitial: false,
  usePolling: true,
  interval: 100,
  ignored: /(^|[/\\])\../, // ignore dotfiles
} as const;

async function recompileTypeScript(): Promise<void> {
  console.log("🔨 Recompiling TypeScript...");
  try {
    await execAsync("pnpm exec tsc");
    console.log("✅ TypeScript compilation complete");
  } catch (error) {
    console.error("❌ TypeScript compilation failed:", error);
    throw error;
  }
}

async function regenerateSite(): Promise<void> {
  if (isRebuilding) {
    console.log("⏳ Build already in progress, skipping...");
    return;
  }

  isRebuilding = true;
  try {
    console.log("🔄 Regenerating site...");
    await build();
    console.log("✅ Site regenerated successfully\n");
  } catch (error) {
    console.error("❌ Site regeneration failed:", error);
  } finally {
    isRebuilding = false;
  }
}

function scheduleRebuild(filePath: string, needsTypeScriptRecompile: boolean) {
  if (rebuildTimeout) {
    clearTimeout(rebuildTimeout);
  }

  rebuildTimeout = setTimeout(async () => {
    console.log(`📝 Change detected: ${filePath}`);

    try {
      if (needsTypeScriptRecompile) {
        await recompileTypeScript();
      }
      await regenerateSite();
    } catch (error) {
      console.error("❌ Rebuild failed:", error);
    }
  }, DEBOUNCE_MS);
}

function startServer(): void {
  console.log("🌐 Starting server...");
  serverProcess = spawn("npx", ["serve", "docs", "-p", String(SERVE_PORT)], {
    stdio: "inherit",
  });

  serverProcess.on("error", (error) => {
    console.error("❌ Server failed to start:", error);
  });

  console.log(`✅ Server running at ${SERVE_URL}\n`);
}

function cleanup(): void {
  console.log("\n🛑 Shutting down...");
  if (serverProcess) {
    serverProcess.kill("SIGTERM");
  }
  process.exit(0);
}

async function startDevMode(): Promise<void> {
  console.log("🚀 Starting dev mode...\n");
  console.log("👀 Watching:");
  console.log("  - src/**/*.ts (TypeScript files)");
  console.log("  - posts/**/*.md (Markdown posts)");
  console.log("  - templates/**/*.{html,css} (Templates and styles)\n");

  // Initial build
  try {
    await build();
    console.log("✅ Initial build complete\n");
  } catch (error) {
    console.error("❌ Initial build failed:", error);
    process.exit(1);
  }

  // Start the server
  startServer();

  // Watch TypeScript source files - watch directory, not glob pattern
  const srcWatcher = chokidar.watch("src", {
    ...WATCHER_CONFIG,
    ignored: [/(^|[/\\])\.\./, "**/node_modules/**", "**/dist/**"],
  });

  srcWatcher.on("ready", () => {
    srcWatcher.on("change", (filePath) => {
      // Only rebuild for .ts files
      if (filePath.endsWith(".ts")) {
        scheduleRebuild(filePath, true);
      }
    });
  });

  // Watch Markdown posts - watch directory, not glob pattern
  const postsWatcher = chokidar.watch("posts", WATCHER_CONFIG);

  const handlePostChange = (filePath: string) => {
    // Only rebuild for .md files
    if (filePath.endsWith(".md")) {
      scheduleRebuild(filePath, false);
    }
  };

  // Wait for ready event before listening to changes to avoid rebuilding on startup
  postsWatcher.on("ready", () => {
    // Now that initial scan is done, listen for changes
    postsWatcher.on("change", handlePostChange);
    postsWatcher.on("add", handlePostChange);
    postsWatcher.on("unlink", handlePostChange);
  });

  // Watch templates and styles - watch directory, not glob pattern
  const templatesWatcher = chokidar.watch("templates", WATCHER_CONFIG);

  templatesWatcher.on("ready", () => {
    templatesWatcher.on("change", (filePath) => {
      // Only rebuild for .html and .css files
      if (filePath.endsWith(".html") || filePath.endsWith(".css")) {
        scheduleRebuild(filePath, false);
      }
    });
  });

  console.log("✨ Dev mode active. Press Ctrl+C to stop.\n");
}

// Handle cleanup on exit
process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);

startDevMode().catch((error) => {
  console.error("Failed to start dev mode:", error);
  process.exit(1);
});
