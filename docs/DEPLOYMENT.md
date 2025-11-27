# デプロイメント手順書

個人ヘルスケアレコード管理システム（SPHR）の本番環境へのデプロイメント手順を説明します。

## 前提条件

- Docker 20.10以上
- Docker Compose 1.29以上
- 十分なディスク容量（データベース + バックアップ用）
- SSL/TLS証明書（HTTPS通信用）

## 1. 環境準備

### 1.1 リポジトリのクローン

```bash
git clone <repository-url>
cd <repository-name>
```

### 1.2 環境変数の設定

```bash
# .env.exampleをコピー
cp .env.example .env

# .envファイルを編集し、本番用の値を設定
nano .env
```

**重要な環境変数:**

- `POSTGRES_PASSWORD`: 強力なパスワードに変更（必須）
- `NODE_ENV`: `production`に設定
- `BACKUP_RETENTION_DAYS`: バックアップ保存期間（デフォルト30日）

### 1.3 ディレクトリの作成

```bash
# バックアップ用ディレクトリ
mkdir -p backups

# ログ用ディレクトリ
mkdir -p logs
```

## 2. SSL/TLS証明書の設定

### 2.1 Let's Encryptを使用する場合

```bash
# Certbotのインストール
sudo apt-get update
sudo apt-get install certbot

# 証明書の取得
sudo certbot certonly --standalone -d your-domain.com
```

### 2.2 リバースプロキシの設定（推奨）

Nginx等のリバースプロキシを使用してHTTPS終端を行うことを推奨します。

**Nginx設定例:**

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # セキュリティヘッダー
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# HTTPからHTTPSへのリダイレクト
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

## 3. アプリケーションのデプロイ

### 3.1 本番環境でのビルドと起動

```bash
# Docker Composeで起動
docker-compose -f docker-compose.prod.yml up -d

# ログの確認
docker-compose -f docker-compose.prod.yml logs -f
```

### 3.2 起動確認

```bash
# ヘルスチェック
curl http://localhost:8000/health

# レスポンス例:
# {"status":"ok","timestamp":"2024-01-15T12:00:00.000Z"}
```

### 3.3 初期データの投入

```bash
# データベースコンテナに接続
docker-compose -f docker-compose.prod.yml exec db psql -U sphr_user -d sphr_db

# 初期データ種類の確認
SELECT * FROM data_type_master;
```

データ種類マスタには以下のデータが自動的に投入されます:
- 血圧上（mmHg）
- 血圧下（mmHg）
- 脈拍（bpm）
- 体重（kg）
- 体温（℃）

## 4. バックアップの設定

### 4.1 自動バックアップの確認

バックアップは毎日午前3:00に自動実行されます。

```bash
# バックアップコンテナのログを確認
docker-compose -f docker-compose.prod.yml logs backup

# バックアップファイルの確認
ls -lh backups/
```

### 4.2 手動バックアップの実行

```bash
# バックアップコンテナ内でスクリプトを実行
docker-compose -f docker-compose.prod.yml exec backup /backup.sh
```

### 4.3 バックアップからのリストア

```bash
# バックアップファイルを指定してリストア
docker-compose -f docker-compose.prod.yml exec db sh -c \
  "gunzip < /backups/sphr_db_20240115_030000.sql.gz | psql -U sphr_user -d sphr_db"
```

## 5. 監視とアラート

### 5.1 ヘルスチェック

定期的にヘルスチェックエンドポイントを監視します。

```bash
# cronで5分ごとにチェック
*/5 * * * * curl -f http://localhost:8000/health || echo "Health check failed" | mail -s "SPHR Health Check Alert" admin@example.com
```

### 5.2 リソース監視

以下の指標を監視し、アラートを設定することを推奨します:

**システムリソース:**
- CPU使用率 > 80%
- メモリ使用率 > 80%
- ディスク使用率 > 85%

**アプリケーション:**
- 5xxエラー率 > 5%
- レスポンスタイム > 10秒
- ヘルスチェック失敗

**データベース:**
- 接続数 > 最大接続数の80%
- クエリ実行時間 > 5秒
- レプリケーション遅延（該当する場合）

### 5.3 ログの確認

```bash
# アプリケーションログ
docker-compose -f docker-compose.prod.yml logs -f app

# データベースログ
docker-compose -f docker-compose.prod.yml logs -f db

# バックアップログ
cat backups/backup.log
```

## 6. 運用

### 6.1 アプリケーションの更新

```bash
# 最新コードを取得
git pull origin main

# イメージの再ビルド
docker-compose -f docker-compose.prod.yml build

# ダウンタイムなしで再起動（ローリングアップデート）
docker-compose -f docker-compose.prod.yml up -d --no-deps --build app
```

### 6.2 データベースのメンテナンス

```bash
# VACUUM（週次推奨）
docker-compose -f docker-compose.prod.yml exec db psql -U sphr_user -d sphr_db -c "VACUUM ANALYZE;"

# インデックスの再構築（必要に応じて）
docker-compose -f docker-compose.prod.yml exec db psql -U sphr_user -d sphr_db -c "REINDEX DATABASE sphr_db;"
```

### 6.3 ログローテーション

Dockerログは自動的にローテーションされます（最大10MB × 3ファイル）。

追加のログローテーションが必要な場合:

```bash
# /etc/logrotate.d/sphr を作成
/var/log/sphr/*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        docker-compose -f /path/to/docker-compose.prod.yml restart app
    endscript
}
```

## 7. トラブルシューティング

### 7.1 コンテナが起動しない

```bash
# コンテナの状態を確認
docker-compose -f docker-compose.prod.yml ps

# ログを確認
docker-compose -f docker-compose.prod.yml logs

# 環境変数を確認
docker-compose -f docker-compose.prod.yml config
```

### 7.2 データベース接続エラー

```bash
# データベースコンテナの状態を確認
docker-compose -f docker-compose.prod.yml exec db pg_isready -U sphr_user

# 接続テスト
docker-compose -f docker-compose.prod.yml exec db psql -U sphr_user -d sphr_db -c "SELECT 1;"
```

### 7.3 パフォーマンス問題

```bash
# 実行中のクエリを確認
docker-compose -f docker-compose.prod.yml exec db psql -U sphr_user -d sphr_db -c \
  "SELECT pid, query_start, state, query FROM pg_stat_activity WHERE state != 'idle';"

# スロークエリログの確認
docker-compose -f docker-compose.prod.yml exec db sh -c \
  "tail -f /var/lib/postgresql/data/log/postgresql-*.log"
```

## 8. セキュリティ

### 8.1 定期的なセキュリティアップデート

```bash
# ベースイメージの更新
docker-compose -f docker-compose.prod.yml pull

# 再ビルドと再起動
docker-compose -f docker-compose.prod.yml up -d --build
```

### 8.2 アクセスログの監視

```bash
# 不審なアクセスパターンの検出
docker-compose -f docker-compose.prod.yml logs app | grep "401\|429"
```

### 8.3 ファイアウォール設定

```bash
# 必要なポートのみ開放
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 22/tcp  # SSH（必要な場合のみ）
ufw enable
```

## 9. 災害復旧手順（DR）

### 9.1 RTO（目標復旧時間）: 4時間

### 9.2 RPO（目標復旧時点）: 24時間

### 9.3 復旧手順

1. 新しいサーバーを準備
2. Docker と Docker Compose をインストール
3. リポジトリをクローン
4. 環境変数を設定
5. 最新のバックアップからリストア
6. アプリケーションを起動
7. ヘルスチェックで動作確認
8. DNSを新しいサーバーに向ける

## 10. パフォーマンス目標

- レスポンス時間: 1〜10秒以内
- 稼働率: 99.5%
- 同時接続ユーザー数: 100ユーザー
- データ保存期間: 永続

## 参考資料

- [PostgreSQL公式ドキュメント](https://www.postgresql.org/docs/)
- [Deno公式ドキュメント](https://deno.land/manual)
- [Docker公式ドキュメント](https://docs.docker.com/)
