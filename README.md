# 多段階営業代理店管理システム

4階層までの代理店構造を管理し、売上・報酬の自動計算と支払い管理を実現するWebシステムです。

## 🚀 セットアップ手順

### 1. 環境変数の設定

`.env.local.example` を `.env.local` にコピーして、必要な情報を設定してください：

```bash
cp .env.local.example .env.local
```

以下の環境変数を設定：
- `NEXT_PUBLIC_SUPABASE_URL`: SupabaseプロジェクトのURL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabaseの匿名キー
- `SUPABASE_SERVICE_ROLE_KEY`: Supabaseのサービスロールキー
- `JWT_SECRET`: JWT署名用の秘密鍵（ランダムな文字列）

### 2. 依存関係のインストール

```bash
npm install
```

### 3. Supabaseのセットアップ

1. [Supabase](https://supabase.com)でプロジェクトを作成
2. SQL Editorで以下のファイルを順番に実行：
   - `/supabase/schema.sql` - テーブルとビューの作成
   - `/supabase/functions.sql` - ストアドファンクションの作成
   - `/supabase/seed.sql` - 初期データの投入

### 4. 開発サーバーの起動

```bash
npm run dev
```

http://localhost:3000 でアプリケーションが起動します。

## 📁 プロジェクト構造

```
multi-tier-sales-system/
├── app/                    # Next.js App Router
│   ├── (auth)/            # 認証関連ページ
│   ├── (dashboard)/       # ダッシュボード関連ページ
│   └── api/               # APIルート
├── components/            # Reactコンポーネント
├── lib/                   # ユーティリティとフック
│   ├── auth/             # 認証関連ユーティリティ
│   └── hooks/            # カスタムフック
├── types/                 # TypeScript型定義
└── supabase/             # データベーススキーマ
```

## 🔑 初期ログイン情報

開発環境用の管理者アカウント：
- メールアドレス: `admin@system.com`
- パスワード: 設定が必要です（`/supabase/seed.sql`を編集）

## 🛠️ 主な機能

### 実装済み
- ✅ ログイン/認証システム
- ✅ JWT認証とセキュリティ対策
- ✅ ダッシュボード（KPI表示・グラフ）
- ✅ レスポンシブデザイン

### 開発中
- 🚧 代理店管理機能
- 🚧 売上管理機能
- 🚧 報酬計算・管理機能
- 🚧 管理者画面

## 📝 開発コマンド

```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# 本番サーバー起動
npm run start

# リント実行
npm run lint

# 型チェック
npm run typecheck
```

## 🔒 セキュリティ機能

- JWT認証
- パスワードハッシュ化（bcrypt）
- ログイン試行回数制限
- IPベースのスパム対策
- SQLインジェクション対策
- XSS対策

## 📄 ライセンス

このプロジェクトは商用利用を目的としています。