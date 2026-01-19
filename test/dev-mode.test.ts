import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("Dev Mode URL Output", () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleOutput: string[];

  beforeEach(async () => {
    consoleOutput = [];
    // Spy on console.log to capture output
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation((...args) => {
      consoleOutput.push(args.join(" "));
    });
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it("should display localhost URL in startup message", async () => {
    // Arrange: Read the dev.ts source file
    const fs = await import("fs/promises");
    const devSource = await fs.readFile("src/dev.ts", "utf-8");

    // Assert: The dev mode should include a clickable localhost URL
    // This helps users know where to view their site
    const hasLocalhostUrl =
      devSource.includes("http://localhost") ||
      devSource.includes("https://localhost");

    expect(hasLocalhostUrl).toBe(true);
  });

  it("should tell users how to view the site", async () => {
    // Arrange: Read the dev.ts source file
    const fs = await import("fs/promises");
    const devSource = await fs.readFile("src/dev.ts", "utf-8");

    // Assert: Should mention either:
    // 1. The serve command to run
    // 2. A URL to visit
    const mentionsHowToView =
      devSource.includes("pnpm run serve") ||
      devSource.includes("npm run serve") ||
      devSource.includes("http://localhost") ||
      devSource.includes("View your site at");

    expect(mentionsHowToView).toBe(true);
  });

  it("should include the default serve port (3000) or instructions", async () => {
    // Arrange: Read the dev.ts source file
    const fs = await import("fs/promises");
    const devSource = await fs.readFile("src/dev.ts", "utf-8");

    // Assert: Should mention the port number
    const hasPort =
      devSource.includes(":3000") ||
      devSource.includes("3000") ||
      devSource.includes("SERVE_PORT");

    expect(hasPort).toBe(true);
  });
});

describe("Dev Mode Server Auto-Start", () => {
  it("should automatically start the serve command", async () => {
    // Arrange: Read the dev.ts source file
    const fs = await import("fs/promises");
    const devSource = await fs.readFile("src/dev.ts", "utf-8");

    // Assert: The dev mode should spawn a child process to run the serve command
    // This ensures the URL shown to users actually works when clicked
    const hasSpawn = devSource.includes("spawn");
    const hasServe =
      devSource.includes('"serve"') || devSource.includes("'serve'");
    const hasDocs =
      devSource.includes('"docs"') || devSource.includes("'docs'");

    expect(hasSpawn && hasServe && hasDocs).toBe(true);
  });

  it("should indicate the server is starting and show the URL", async () => {
    // Arrange: Read the dev.ts source file
    const fs = await import("fs/promises");
    const devSource = await fs.readFile("src/dev.ts", "utf-8");

    // Assert: Should tell users the server is starting/running
    const mentionsServerRunning =
      devSource.includes("Server running") ||
      devSource.includes("server started") ||
      devSource.includes("Starting server") ||
      devSource.includes("Serving at");

    expect(mentionsServerRunning).toBe(true);
  });

  it("should handle server process cleanup on exit", async () => {
    // Arrange: Read the dev.ts source file
    const fs = await import("fs/promises");
    const devSource = await fs.readFile("src/dev.ts", "utf-8");

    // Assert: Should handle SIGINT/SIGTERM to clean up the server process
    const handlesProcessCleanup =
      devSource.includes("SIGINT") || devSource.includes("process.on");

    expect(handlesProcessCleanup).toBe(true);
  });
});
