# zenkaku.jp

英数字・記号・半角スペースを全角へ変換するWebツールです。

## 公開API

Cloudflare Pages Functionsで公開されるAPIです。APIキーなしでブラウザや外部サービスから利用できます。

### エンドポイント

```
GET  https://zenkaku.jp/api/convert?text=<変換する文字列>
POST https://zenkaku.jp/api/convert
```

変換対象はASCIIの `!`〜`~` と半角スペースです。日本語など、それ以外の文字はそのまま返します。入力上限はUTF-8で20,000バイトです。

### GET

```bash
curl --get 'https://zenkaku.jp/api/convert' \
  --data-urlencode 'text=Hello 123!'
```

### POST（JSON）

```bash
curl 'https://zenkaku.jp/api/convert' \
  -H 'Content-Type: application/json' \
  --data '{"text":"Hello 123!"}'
```

### POST（プレーンテキスト）

```bash
curl 'https://zenkaku.jp/api/convert' \
  -H 'Content-Type: text/plain; charset=utf-8' \
  --data 'Hello 123!'
```

### 成功レスポンス

```json
{
  "success": true,
  "result": "Ｈｅｌｌｏ　１２３！",
  "input": {
    "characters": 10,
    "bytes": 10
  }
}
```

### エラーレスポンス

```json
{
  "success": false,
  "error": {
    "code": "MISSING_TEXT",
    "message": "クエリパラメータ \"text\" を指定してください。"
  }
}
```

CORSは全オリジンに対して有効です。公開APIのため、機密情報は送信しないでください。

## デプロイ

Cloudflare PagesでこのGitHubリポジトリを接続し、ビルドコマンドは空欄、出力ディレクトリは `/`（リポジトリのルート）に設定します。`functions/api/convert.js` が自動的に `/api/convert` としてデプロイされます。

GitHub Pagesなど静的ファイル専用のホスティングではPages Functionsは動作しません。
