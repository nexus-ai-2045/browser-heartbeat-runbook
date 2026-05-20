# Browser Heartbeat Runbook

Codex の in-app Browser を読み取り専用で点検するための、小さな heartbeat runbook とサンプル実装です。

これは普通のブラウザ監視ツールではありません。Chrome や Edge を常駐監視するツールでも、Web サイトの死活監視サービスでもありません。Codex にブラウザ作業を任せたあと、「今の Browser は止まっていないか」「人間の判断待ちになっていないか」「危ない操作の手前で止まっていないか」を確認するためのものです。

## こんなときに使う

- Codex に長めのブラウザ操作を任せたあと、現在の状態をざっと確認したい。
- ログイン、権限確認、CAPTCHA、支払い、削除確認など、人間が見るべき画面で止まっていないか知りたい。
- Browser tab の状態を、短いテキストレポートや JSON として残したい。
- 定期実行や heartbeat automation に組み込む前の、読み取り専用サンプルが欲しい。

## 前提条件

- Codex の in-app Browser を使っていること。
- Browser plugin が使える Codex turn であること。
- JavaScript 実行環境から `await import(...)` を実行できること。
- Node 20 以上。テスト実行時に必要です。

このリポジトリ単体を `npm install -g` して使う CLI ではありません。Codex の Browser セッション内で使う runbook と snippet です。

## 何をするものか

- 開いている Browser タブのタイトルと URL を一覧化します。
- 可能な場合、各タブの recent console errors を確認します。
- 可能な場合、DOM snapshot から画面上の注意シグナルを探します。
- 結果を `clear` / `attention-needed` / `blocked` の3段階で判定します。
- レポート、アラート、JSON 結果をファイルに書き出します。

## 判定の意味

- `clear`: いま見える範囲では、注意が必要なものはありません。
- `attention-needed`: エラー、確認待ち、検査失敗など、確認したほうがよいものがあります。
- `blocked`: 支払い、削除、アクセス拒否など、人間の判断なしに進めないほうがよい状態です。

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

## 出力例

問題がなかった場合:

```txt
Browser heartbeat: 2026-05-20, 00:00:00 UTC
Status: clear

Tabs scanned:
- Local preview | http://localhost:3000 | scanned

Flags:
- none
```

人間の確認が必要そうな場合:

```txt
Browser heartbeat: 2026-05-20, 00:00:00 UTC
Status: blocked

Tabs scanned:
- Checkout | https://example.test/pay | scanned

Flags:
- high | sensitive-action | Checkout | Title contains attention signal: checkout. | Stop and ask the user before continuing.
```

## 自動化プロンプト

Codex の定期実行や heartbeat に組み込む場合のプロンプト例は [browser-heartbeat-automation.md](browser-heartbeat-automation.md) にあります。

## 制限事項

- 検出は主にキーワードと inspect できる範囲のページ情報に基づきます。
- すべてのページを検査できるとは限りません。
- 誤検出や見逃しはありえます。
- 人間の確認を置き換えるものではありません。
- Codex Browser の API や plugin 側の仕様変更に影響を受ける可能性があります。

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
