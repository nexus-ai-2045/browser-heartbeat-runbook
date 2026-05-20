# Browser Heartbeat Runbook

Codex の in-app Browser が「エラーで止まっていないか」「ログインや確認待ちになっていないか」「人間が判断すべき画面で止まっていないか」を、読み取り専用で点検するための小さなランブックとサンプル実装です。

長めのブラウザ作業を Codex に任せたあと、現在のタブ状態を安全に見回り、注意が必要なものを短いレポートとして残します。

## 何をするものか

- 開いている Browser タブのタイトルと URL を一覧化します。
- 可能な場合、各タブの recent console errors を確認します。
- 可能な場合、DOM snapshot から画面上の注意シグナルを探します。
- 結果を `clear` / `attention-needed` / `blocked` の3段階で判定します。
- レポート、アラート、JSON 結果をファイルに書き出します。

## 検出するもの

- runtime error、build failed、exception などのエラー状態
- sign in、permission、choose an account などのログイン・権限待ち
- confirm、are you sure などの確認待ち
- challenge、captcha、verify you are human などの本人確認
- payment、checkout などの支払い・購入フロー
- upload、download などのファイル転送フロー
- delete、remove などの破壊的操作
- タブやページ内容を検査できない状態

## やらないこと

このスクリプトは読み取り専用です。

- フォームを送信しません。
- 確認ダイアログを承認しません。
- 機密情報を送信しません。
- 支払いを開始しません。
- ファイルをアップロード・ダウンロードしません。
- 削除などの破壊的なボタンをクリックしません。

## 手動実行

Codex の Browser plugin と JavaScript 実行環境が使える turn で、次のように実行します。

```js
const heartbeat = await import("file:///absolute/path/to/scripts/browser-heartbeat.repl.js");
```

import すると、その場で1回 heartbeat が実行されます。さらに `runBrowserHeartbeat()` が export されるので、同じ JavaScript セッション内で再実行できます。

```js
await heartbeat.runBrowserHeartbeat();
```

出力先やタイムゾーンを指定する場合:

```js
await heartbeat.runBrowserHeartbeat({
  outputDir: "C:/path/to/output",
  timeZone: "Asia/Tokyo",
});
```

生成されるファイル:

- `browser-heartbeat-last-report.txt`
- `browser-heartbeat-alert.txt`
- `browser-heartbeat-last-result.json`

## 自動化プロンプト

Codex の定期実行や heartbeat に組み込む場合のプロンプト例は [browser-heartbeat-automation.md](browser-heartbeat-automation.md) にあります。

## 検証

Node 20 以上でテストを実行します。

```sh
npm test
```

テストでは mocked Browser client を使い、正常系、blocked 判定、DOM inspection 失敗、タブ取得失敗を確認しています。

## 公開時の注意

出力レポートにはタブタイトル、URL、画面上のテキスト由来の検出結果、console error count が含まれる場合があります。生成物を共有・コミットする前に、必ず内容を確認してください。

## License

MIT
