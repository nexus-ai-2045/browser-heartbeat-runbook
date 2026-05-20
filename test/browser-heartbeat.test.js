import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

globalThis.BROWSER_HEARTBEAT_AUTO_RUN = false;

const modulePath = new URL("../scripts/browser-heartbeat.repl.js", import.meta.url);
const { runBrowserHeartbeat } = await import(`${modulePath.href}?test=${Date.now()}`);

function createBrowser({ tabs, logsById = {}, snapshotsById = {}, snapshotErrorsById = {} }) {
  return {
    sessionName: null,
    async nameSession(name) {
      this.sessionName = name;
    },
    tabs: {
      async list() {
        return tabs;
      },
      async get(id) {
        return {
          dev: {
            async logs() {
              return logsById[id] || [];
            },
          },
          playwright: {
            async domSnapshot() {
              if (snapshotErrorsById[id]) {
                throw snapshotErrorsById[id];
              }
              return snapshotsById[id] || "";
            },
          },
        };
      },
    },
  };
}

function createBrowserWithTabOpenFailure({ tabs }) {
  return {
    async nameSession() {},
    tabs: {
      async list() {
        return tabs;
      },
      async get() {
        throw new Error("tab unavailable");
      },
    },
  };
}

async function withTempDir(fn) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "browser-heartbeat-"));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("writes a clear report when no tabs need attention", async () => {
  await withTempDir(async (outputDir) => {
    const browser = createBrowser({
      tabs: [{ id: "1", title: "Local preview", url: "http://localhost:3000" }],
      snapshotsById: { 1: "Ready" },
    });

    const result = await runBrowserHeartbeat({
      browser,
      outputDir,
      timeZone: "UTC",
      now: new Date("2026-05-20T00:00:00Z"),
    });

    assert.equal(result.status, "clear");
    assert.deepEqual(result.flags, []);
    assert.equal(browser.sessionName, "Browser heartbeat");

    const report = await readFile(path.join(outputDir, "browser-heartbeat-last-report.txt"), "utf8");
    assert.match(report, /Status: clear/);
    assert.match(report, /Local preview/);
  });
});

test("marks high-severity signals as blocked", async () => {
  await withTempDir(async (outputDir) => {
    const browser = createBrowser({
      tabs: [{ id: "2", title: "Checkout", url: "https://example.test/pay" }],
      logsById: { 2: [{ text: "error" }] },
      snapshotsById: { 2: "Payment confirmation required" },
    });

    const result = await runBrowserHeartbeat({
      browser,
      outputDir,
      timeZone: "UTC",
      now: new Date("2026-05-20T00:00:00Z"),
    });

    assert.equal(result.status, "blocked");
    assert.equal(result.flags.some((flag) => flag.category === "sensitive-action"), true);

    const alert = await readFile(path.join(outputDir, "browser-heartbeat-alert.txt"), "utf8");
    assert.match(alert, /Status: blocked/);
    assert.match(alert, /Stop and ask the user/);
  });
});

test("records inspection failures without failing the run", async () => {
  await withTempDir(async (outputDir) => {
    const browser = createBrowser({
      tabs: [{ id: "3", title: "Opaque page", url: "https://example.test/private" }],
      snapshotErrorsById: { 3: new Error("snapshot unavailable") },
    });

    const result = await runBrowserHeartbeat({
      browser,
      outputDir,
      timeZone: "UTC",
      now: new Date("2026-05-20T00:00:00Z"),
    });

    assert.equal(result.status, "attention-needed");
    assert.equal(result.flags[0].category, "inspection");
  });
});

test("records tab open failures without failing the run", async () => {
  await withTempDir(async (outputDir) => {
    const browser = createBrowserWithTabOpenFailure({
      tabs: [{ id: "4", title: "Transient tab", url: "https://example.test/transient" }],
    });

    const result = await runBrowserHeartbeat({
      browser,
      outputDir,
      timeZone: "UTC",
      now: new Date("2026-05-20T00:00:00Z"),
    });

    assert.equal(result.status, "attention-needed");
    assert.equal(result.flags[0].reason, "Could not open tab for inspection: tab unavailable");
  });
});
