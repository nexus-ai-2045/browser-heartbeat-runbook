# Browser Heartbeat Runbook

Private-first runbook and snippet for checking whether a Codex in-app Browser session needs attention.

The heartbeat is intentionally read-only. It scans open Browser tabs, looks for visible attention signals, checks recent console errors when available, and writes a compact report.

## What It Flags

- Runtime errors or failed pages.
- Sign-in, permission, or account-choice prompts.
- Confirmations that need user review.
- Payment, checkout, upload, or download flows.
- Pages that cannot be inspected.

## What It Must Not Do

- Submit forms.
- Approve confirmations.
- Transmit sensitive data.
- Start payments.
- Upload or download files.
- Click destructive controls.

## Manual Run

Open a Codex turn where the Browser plugin and JavaScript execution tool are available, then run:

```js
const heartbeat = await import("file:///absolute/path/to/scripts/browser-heartbeat.repl.js");
```

The import runs one heartbeat immediately. It also exports `runBrowserHeartbeat()` so you can run it again in the same JavaScript session:

```js
await heartbeat.runBrowserHeartbeat();
```

By default, output files are written to the current JavaScript working directory. To choose an output directory or timezone:

```js
await heartbeat.runBrowserHeartbeat({
  outputDir: "C:/path/to/output",
  timeZone: "Asia/Tokyo",
});
```

Generated files:

- `browser-heartbeat-last-report.txt`
- `browser-heartbeat-alert.txt`
- `browser-heartbeat-last-result.json`

## Automation Prompt

See [browser-heartbeat-automation.md](browser-heartbeat-automation.md) for a reusable prompt if you later wire this into a recurring Codex automation.

## Verification

Run the unit tests with Node 20 or newer:

```sh
npm test
```

The tests use a mocked Browser client and confirm clear, blocked, and inspection-failure outcomes.

## Privacy

The report can contain tab titles and URLs. Review output before sharing it.

## License

MIT
