# 使い切りプランナー（仮称）

人生後半のお金を「楽しく使い切り、きれいに渡す」ための計画サービスのプロトタイプ。

公開URL：https://tsukaikiri-planner.netlify.app/

| ページ | 内容 |
|---|---|
| `/` | LP |
| `/quick` | かんたん診断（毎年あと使える額・不動産の売却期限） |
| `/properties` | 不動産の時価推定（国土交通省 不動産情報ライブラリの取引事例から） |
| `/consult` | 不動産の売却相談フォーム（Netlify Forms） |
| `/inheritance` | 相続税の目安 |
| `/office` | 事務所向けツール：顧客一覧・顧客の計画・面談モード・提案書 |
| `/office/referrals` | 紹介ネットワーク：紹介先の選択 → お客さまの同意 → 受信箱（受諾・対応状況） |

事務所向けツールには2つのモードがある（`lib/office/store.ts`）。

- **本番**：Supabase に保存する。メールのリンクでログインし、事務所を登録して、運営が承認すると使える
- **デモ**：架空の事務所で試す。データはブラウザの localStorage にだけ保存する

## Supabase

- テーブルとアクセス制御（RLS）：`supabase/migrations/` のファイルを番号順に、Supabase の SQL Editor に貼って実行する（何度実行してもよい）
- RLS のテスト：`npm run test:db`（PGlite で実行するので DB サーバーは不要）
- 接続先：`lib/supabase.ts`。publishable キーはブラウザに出す前提のキーなのでコードに置いている。別のプロジェクトにつなぐときは `NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` で上書きする。secret（service_role）キーはリポジトリにもブラウザにも置かない
- ログインのリンクの戻り先：Supabase の Authentication → URL Configuration で、Site URL と Redirect URLs に公開URLと `http://localhost:3000/office` を登録する
- 事務所の承認（運営画面ができるまで）：SQL Editor で次を実行する

```sql
update offices set status = 'active' where name = '（事務所名）';
```

## 開発

```sh
npm install
npm run dev      # http://localhost:3000
npm test         # 計算ロジックのユニットテスト
npm run lint
```

不動産の時価推定を手元で動かすには、`.env.local` に APIキーを置く（リポジトリには入れない）。

```
REINFOLIB_API_KEY=発行されたAPIキー
```

APIキーがない場合、時価推定の画面は「準備中」と表示される。売却相談フォームの送信は Netlify 上でのみ動く。

## 公開（Netlify）

`main` に push すると Netlify が自動でビルド・公開する（設定は `netlify.toml`）。GitHub Actions の CI は Lint・型チェック・テスト・ビルドだけを行う。

Netlify の無料枠では、本番デプロイのたびにクレジットを使う。枠を使い切ると、その請求サイクルの間は本番デプロイが止まる（公開中のサイトはそのまま残る）。

- README・テスト・CI 設定だけの変更では、`netlify.toml` の `ignore` によりビルドを省く
- 細かい修正はまとめてから `main` に入れる

Netlify 側で必要な設定：

1. **環境変数** `REINFOLIB_API_KEY`：不動産情報ライブラリの APIキー（[API利用申請](https://www.reinfolib.mlit.go.jp/api/request/)で発行）
2. **Forms**：フォームの検出を有効にし、`sale-consultation` の通知先メールを設定する

## 計算ロジック

- `lib/simulation.ts`：使い切りシミュレーション（不動産の売却期限・住み替え費用を含む）
- `lib/clientPlan.ts`：事務所が顧客とつくる計画のデータと、計算・「次にやること」への変換
- `lib/referrals.ts`：紹介のルール（紹介先の候補、ステータスの変更、同意した範囲のデータ）
- `lib/inheritanceTax.ts`：相続税の概算
- `lib/realEstateEstimate.ts`：取引事例からの時価推定
- `lib/reinfolib.ts`：不動産情報ライブラリ API の呼び出し（サーバー側専用）
