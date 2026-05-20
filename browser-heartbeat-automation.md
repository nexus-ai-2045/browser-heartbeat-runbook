# Browser Heartbeat Automation Prompt

Use the Browser plugin to inspect the current Codex in-app Browser session. List open tabs, inspect the selected tab when present, and flag anything that likely needs attention.

Treat these as attention signals:

- The page shows an error, failed build, runtime exception, not found page, access denied state, or missing content.
- The page asks the user to approve, confirm, sign in, grant access, choose an account, solve a challenge, or make an irreversible change.
- The page appears to be waiting on file upload, file download, checkout, payment, or any sensitive action.
- Browser automation cannot inspect the page.

Do not click destructive or state-changing controls. Do not submit forms. Do not transmit sensitive data. If a specific risky action is needed, stop and ask the user.

Return:

- `status`: `clear`, `attention-needed`, or `blocked`
- `summary`: short human-readable summary
- `flags`: list of relevant tabs or pages
- `next_action`: what the user or agent should do next

Severity:

- `high`: sensitive action, destructive action, payment, access denial, or blocked auth.
- `medium`: user action needed, confirmation prompt, console errors, failed content, missing page, or file transfer prompt.
- `low`: uncertain inspection issue.
