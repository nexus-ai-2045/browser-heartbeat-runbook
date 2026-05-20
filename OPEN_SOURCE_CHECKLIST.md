# 公開前チェックリスト

このリポジトリを public にする前に確認してください。

- 生成された heartbeat 出力ファイルが commit されていない。
- ローカルの絶対パスが commit されていない。
- ブラウザ履歴、cookie、session data、private tab content が commit されていない。
- README に「レポートにはタブタイトルや URL が含まれうる」と明記されている。
- README に前提条件、出力例、制限事項が明記されている。
- scanner が読み取り専用のままになっている。
- `npm test` が通る。
- ライセンスが意図したものになっている。このリポジトリは MIT。

GitHub 設定案:

- Visibility: private first
- Description: `Codex Browser の状態を読み取り専用で点検する heartbeat runbook`
- Topics: `codex`, `browser`, `automation`, `runbook`, `monitoring`
