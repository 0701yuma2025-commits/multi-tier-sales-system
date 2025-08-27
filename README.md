# 多段階営業代理店管理システム

4階層までの代理店構造を管理し、売上・報酬の自動計算と支払い管理を実現するWebシステムです。

## 🌐 デモサイト

Netlifyでホスティングされています。

## 🚀 主な機能

- **代理店階層管理**: 最大4階層までの代理店構造をサポート
- **売上管理**: 商品別・数量別の売上登録と管理
- **報酬自動計算**: 階層に応じた報酬率と階層ボーナスの自動計算
- **認証システム**: 管理者と代理店の役割別アクセス制御
- **Supabase統合**: リアルタイムデータベースとの連携

## 📁 プロジェクト構造

```
multi-tier-sales-system/
├── *.html                  # 静的HTMLページ
├── js/                     # JavaScriptファイル
│   ├── supabase-client.js # Supabaseクライアント
│   └── auth-check.js      # 認証チェック機能
├── supabase/              # データベース関連
│   ├── schema.sql         # テーブル定義
│   └── functions.sql      # ストアドファンクション
└── README.md              # このファイル
```

## 🔧 セットアップ手順

### 1. Supabaseプロジェクトの作成

1. [Supabase](https://supabase.com)でアカウントを作成
2. 新しいプロジェクトを作成
3. プロジェクトURLとAPIキーを取得

### 2. データベースのセットアップ

SQL Editorで以下のファイルを順番に実行：
- `/create-tables.sql` - テーブルの作成
- `/add-test-data.sql` - テストデータの追加（任意）

### 3. Supabase接続設定

1. ブラウザで `/sales-functions.html` にアクセス
2. 「Supabase設定」ボタンをクリック
3. プロジェクトURLとAnon Keyを入力

## 🔐 ログイン情報（デモ用）

- **管理者**: admin@example.com / admin123
- **代理店**: agency@example.com / agency123

## 📝 主要ページ

- `/login.html` - ログイン画面
- `/dashboard-admin.html` - 管理者ダッシュボード
- `/dashboard-agency.html` - 代理店ダッシュボード
- `/agencies-admin.html` - 代理店管理
- `/sales-functions.html` - 売上管理

## 🚀 デプロイ

GitHubにプッシュすると、Netlifyが自動的にデプロイします。

## 📌 注意事項

- 開発環境ではRLS（Row Level Security）を無効化しています
- 本番環境では適切なセキュリティ設定を行ってください