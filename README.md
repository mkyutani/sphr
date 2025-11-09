# SPHR - Simple Personal Healthcare Record

個人ヘルスケアレコード管理システム - 日々の健康情報を記録・蓄積・分析するWebアプリケーション

## 技術スタック

- **バックエンド**: Deno 1.40+ with Hono 4.0+
- **フロントエンド**: React 18+ with TypeScript
- **データベース**: PostgreSQL 15+
- **インフラ**: Docker Compose

## 開発環境のセットアップ

### 前提条件

- Visual Studio Code
- Docker Desktop
- Dev Containers 拡張機能

### Dev Container で開発を開始

1. このリポジトリをクローン:
```bash
git clone https://github.com/mkyutani/sphr.git
cd sphr
```

2. VS Code でプロジェクトを開く:
```bash
code .
```

3. コマンドパレット (Cmd/Ctrl+Shift+P) を開き、以下を実行:
```
Dev Containers: Reopen in Container
```

4. コンテナが起動し、開発環境が自動的にセットアップされます。

### 開発環境の構成

Dev Container には以下が含まれています:

- **app コンテナ**: Deno ランタイム環境
- **db コンテナ**: PostgreSQL 15 データベース
- **VS Code 拡張機能**:
  - Deno
  - ESLint
  - Prettier
  - Docker
  - PostgreSQL

### データベース接続情報

- **ホスト**: db
- **ポート**: 5432
- **データベース名**: sphr_db
- **ユーザー名**: sphr_user
- **パスワード**: sphr_password

## プロジェクト構成

```
.
├── .devcontainer/          # Dev Container 設定
│   ├── devcontainer.json   # VS Code 設定
│   ├── docker-compose.yml  # Docker 構成
│   └── init-db.sql         # DB 初期化スクリプト
├── .kiro/                  # Kiro仕様駆動開発
│   └── specs/              # 機能仕様
├── docs/                   # ドキュメント
└── src/                    # ソースコード (今後追加)
```

## ライセンス

MIT License
