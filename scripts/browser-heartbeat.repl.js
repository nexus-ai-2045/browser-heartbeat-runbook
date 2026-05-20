// Run this in a Codex turn where the Browser plugin is available.
// It scans the in-app Browser, prints a compact heartbeat report,
// and writes report files to BROWSER_HEARTBEAT_OUTPUT_DIR or the current JS working directory.

const fs = await import("node:fs/promises");
const path = await import("node:path");

const attentionSignals = [
  { needle: "runtime error", severity: "high", category: "app-error" },
  { needle: "build failed", severity: "high", category: "app-error" },
  { needle: "exception", severity: "high", category: "app-error" },
  { needle: "error", severity: "medium", category: "app-error" },
  { needle: "failed", severity: "medium", category: "app-error" },
  { needle: "cannot", severity: "medium", category: "app-error" },
  { needle: "unauthorized", severity: "high", category: "access" },
  { needle: "forbidden", severity: "high", category: "access" },
  { needle: "access denied", severity: "high", category: "access" },
  { needle: "not found", severity: "medium", category: "navigation" },
  { needle: "sign in", severity: "medium", category: "user-action" },
  { needle: "confirm", severity: "medium", category: "user-action" },
  { needle: "permission", severity: "medium", category: "user-action" },
  { needle: "choose an account", severity: "medium", category: "user-action" },
  { needle: "challenge", severity: "medium", category: "user-action" },
  { needle: "captcha", severity: "medium", category: "user-action" },
  { needle: "verify you are human", severity: "medium", category: "user-action" },
  { needle: "are you sure", severity: "medium", category: "confirmation" },
  { needle: "delete", severity: "high", category: "destructive-action" },
  { needle: "remove", severity: "high", category: "destructive-action" },
  { needle: "payment", severity: "high", category: "sensitive-action" },
  { needle: "checkout", severity: "high", category: "sensitive-action" },
  { needle: "upload", severity: "medium", category: "file-transfer" },
  { needle: "download", severity: "medium", category: "file-transfer" },
];

function formatHeartbeatTime(date, timeZone) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZoneName: "short",
  }).format(date);
}

function findSignal(text) {
  const haystack = String(text || "").toLowerCase();
  return attentionSignals.find((signal) => haystack.includes(signal.needle));
}

function nextActionFor(category) {
  switch (category) {
    case "sensitive-action":
      return "Stop and ask the user before continuing.";
    case "destructive-action":
      return "Stop and ask the user before destructive changes.";
    case "confirmation":
      return "Review the prompt and ask the user before confirming.";
    case "access":
      return "Check whether sign-in or permission is required.";
    case "app-error":
      return "Inspect the page and console errors.";
    case "file-transfer":
      return "Ask the user before starting or approving file transfer.";
    case "user-action":
      return "Open the tab and decide whether user input is needed.";
    default:
      return "Review visible page state.";
  }
}

function addFlag(flags, flag) {
  const key = `${flag.severity}|${flag.title}|${flag.url}|${flag.category}|${flag.reason}`;
  if (flags.some((existing) => existing.key === key)) {
    return;
  }
  flags.push({ key, ...flag });
}

function resolveOutputDir(options) {
  return (
    options.outputDir ||
    globalThis.BROWSER_HEARTBEAT_OUTPUT_DIR ||
    (globalThis.nodeRepl && nodeRepl.cwd) ||
    "."
  );
}

function resolveTimeZone(options) {
  return (
    options.timeZone ||
    globalThis.BROWSER_HEARTBEAT_TIME_ZONE ||
    Intl.DateTimeFormat().resolvedOptions().timeZone ||
    "UTC"
  );
}

async function resolveBrowser(options) {
  if (options.browser) {
    return options.browser;
  }

  if (globalThis.browser) {
    return globalThis.browser;
  }

  if (globalThis.agent?.browsers?.get) {
    globalThis.browser = await agent.browsers.get("iab");
    return globalThis.browser;
  }

  throw new Error("Browser runtime is not initialized. Run the Browser plugin bootstrap before importing this file.");
}

function buildOutputs({ now, status, tabs, flags }) {
  const report = [
    `Browser heartbeat: ${now}`,
    `Status: ${status}`,
    "",
    "Tabs scanned:",
    ...(tabs.length
      ? tabs.map((tab) => `- ${tab.title || "(untitled)"} | ${tab.url || "(no url)"} | scanned`)
      : ["- none"]),
    "",
    "Flags:",
    ...(flags.length
      ? flags.map((flag) => `- ${flag.severity} | ${flag.category} | ${flag.title} | ${flag.reason} | ${flag.next}`)
      : ["- none"]),
  ].join("\n");

  const alertText =
    status === "clear"
      ? [`Browser heartbeat alert: ${now}`, "Status: clear", "", "No Browser tabs currently need attention."].join("\n")
      : [
          `Browser heartbeat alert: ${now}`,
          `Status: ${status}`,
          "",
          "Attention is needed for these Browser items:",
          ...flags.map((flag) => `- ${flag.severity} | ${flag.category} | ${flag.title} | ${flag.reason} | ${flag.next}`),
        ].join("\n");

  return { report, alertText };
}

export async function runBrowserHeartbeat(options = {}) {
  const outputDir = resolveOutputDir(options);
  const timeZone = resolveTimeZone(options);
  const browserClient = await resolveBrowser(options);

  if (browserClient.nameSession) {
    await browserClient.nameSession("Browser heartbeat");
  }

  const now = formatHeartbeatTime(options.now || new Date(), timeZone);
  const flags = [];
  let tabs = [];

  try {
    tabs = await browserClient.tabs.list();
  } catch (error) {
    addFlag(flags, {
      severity: "high",
      category: "browser",
      title: "Browser",
      url: "",
      reason: `Could not list Browser tabs: ${error?.message || error}`,
      next: "Reconnect Browser plugin and retry.",
    });
  }

  for (const info of tabs) {
    const title = info.title || "(untitled)";
    const url = info.url || "";

    if (!url || url === "about:blank") {
      continue;
    }

    let tabForScan;

    try {
      tabForScan = await browserClient.tabs.get(info.id);
    } catch (error) {
      addFlag(flags, {
        severity: "low",
        category: "inspection",
        title,
        url,
        reason: `Could not open tab for inspection: ${error?.message || error}`,
        next: "Open the tab manually if this page matters.",
      });
      continue;
    }

    try {
      const logs = await tabForScan.dev.logs({ levels: ["error"], limit: 10 });
      if (logs.length > 0) {
        addFlag(flags, {
          severity: "medium",
          category: "console",
          title,
          url,
          reason: `${logs.length} recent console error(s).`,
          next: "Inspect console errors and page state.",
        });
      }
    } catch {
      // Some tabs may not expose dev logs. Title and DOM checks still run.
    }

    const titleHit = findSignal(title);

    if (titleHit) {
      addFlag(flags, {
        severity: titleHit.severity,
        category: titleHit.category,
        title,
        url,
        reason: `Title contains attention signal: ${titleHit.needle}.`,
        next: nextActionFor(titleHit.category),
      });
    }

    try {
      const snapshot = await tabForScan.playwright.domSnapshot();
      const snapshotHit = findSignal(snapshot);

      if (snapshotHit) {
        addFlag(flags, {
          severity: snapshotHit.severity,
          category: snapshotHit.category,
          title,
          url,
          reason: `Page content contains attention signal: ${snapshotHit.needle}.`,
          next: nextActionFor(snapshotHit.category),
        });
      }
    } catch (error) {
      addFlag(flags, {
        severity: "low",
        category: "inspection",
        title,
        url,
        reason: `Could not inspect DOM snapshot: ${error?.message || error}`,
        next: "Open the tab manually if this page matters.",
      });
    }
  }

  const status =
    flags.length === 0 ? "clear" : flags.some((flag) => flag.severity === "high") ? "blocked" : "attention-needed";

  const result = {
    heartbeatAt: now,
    status,
    tabs: tabs.map((tab) => ({
      id: tab.id,
      title: tab.title || "",
      url: tab.url || "",
    })),
    flags: flags.map(({ key, ...flag }) => flag),
  };

  const { report, alertText } = buildOutputs({ now, status, tabs, flags });

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(path.join(outputDir, "browser-heartbeat-last-report.txt"), `${report}\n`, "utf8");
  await fs.writeFile(path.join(outputDir, "browser-heartbeat-alert.txt"), `${alertText}\n`, "utf8");
  await fs.writeFile(
    path.join(outputDir, "browser-heartbeat-last-result.json"),
    `${JSON.stringify(result, null, 2)}\n`,
    "utf8"
  );

  if (globalThis.nodeRepl?.write) {
    nodeRepl.write(report);
  } else {
    console.log(report);
  }

  return result;
}

if (globalThis.BROWSER_HEARTBEAT_AUTO_RUN !== false) {
  await runBrowserHeartbeat();
}
