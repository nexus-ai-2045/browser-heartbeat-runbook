# Changelog

## 0.1.0

- Codex Browser の状態を読み取り専用で点検する heartbeat runbook を用意。
- 汎用的な heartbeat scanner snippet を追加。
- 再実行可能な `runBrowserHeartbeat()` export と unit tests を追加。
- 生成レポートとローカル絶対パスを除外。
- 公開向け文書を日本語化。
- 初見でも用途、前提条件、出力例、制限事項が分かるよう README を拡充。
- 実 Browser smoke test で見つかった `permission` の過剰検出を抑制。
