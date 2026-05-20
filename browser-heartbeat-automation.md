# Browser Heartbeat Automation Prompt

Codex の Browser plugin を使って、現在の in-app Browser セッションを読み取り専用で点検してください。開いているタブを一覧化し、選択中のタブがある場合はその状態も確認し、注意が必要そうなものを flag として報告してください。

注意シグナルとして扱うもの:

- ページに error、failed build、runtime exception、not found、access denied、missing content などが表示されている。
- approve、confirm、sign in、grant access、choose an account、challenge、irreversible change など、ユーザー判断や入力が必要な状態になっている。
- file upload、file download、checkout、payment、その他 sensitive action の待機状態に見える。
- Browser automation からページを検査できない。

破壊的または状態変更を伴う操作はクリックしないでください。フォームを送信しないでください。機密情報を送信しないでください。リスクのある操作が必要な場合は、そこで止まり、ユーザーに確認してください。

返す内容:

- `status`: `clear`、`attention-needed`、`blocked` のいずれか
- `summary`: 人間が読める短い要約
- `flags`: 注意が必要なタブまたはページの一覧
- `next_action`: 次にユーザーまたは agent が取るべき行動

Severity:

- `high`: sensitive action、destructive action、payment、access denial、blocked auth
- `medium`: user action needed、confirmation prompt、console errors、failed content、missing page、file transfer prompt
- `low`: 検査できなかった、または状態が不確実
