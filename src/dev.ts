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

  // Watch TypeScript source files
  const srcWatcher = chokidar.watch("src/**/*.ts", {
    ignored: ["**/node_modules/**", "**/dist/**"],
    persistent: true,
    ignoreInitial: true,
  });

  srcWatcher.on("change", (filePath) => {
    scheduleRebuild(filePath, true);
  });

  // Watch Markdown posts
  const postsWatcher = chokidar.watch("posts/**/*.md", {
    persistent: true,
    ignoreInitial: true,
  });

  const handlePostChange = (filePath: string) =>
    scheduleRebuild(filePath, false);
  postsWatcher.on("change", handlePostChange);
  postsWatcher.on("add", handlePostChange);
  postsWatcher.on("unlink", handlePostChange);

  // Watch templates and styles
  const templatesWatcher = chokidar.watch("templates/**/*.{html,css}", {
    persistent: true,
    ignoreInitial: true,
  });

  templatesWatcher.on("change", (filePath) => {
    scheduleRebuild(filePath, false);
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
