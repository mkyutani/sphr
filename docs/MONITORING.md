# 監視とアラート設定ガイド

個人ヘルスケアレコード管理システム（SPHR）の監視設定とアラート基準について説明します。

## 1. 監視対象

### 1.1 アプリケーション監視

#### ヘルスチェックエンドポイント

**エンドポイント:** `GET /health`

**正常なレスポンス:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

**監視間隔:** 30秒

**アラート条件:**
- HTTPステータスコード != 200
- 3回連続で失敗
- レスポンスタイム > 5秒

#### アプリケーションメトリクス

| メトリクス | 正常範囲 | 警告 | 危険 |
|-----------|---------|------|------|
| レスポンスタイム（平均） | < 1秒 | 1〜5秒 | > 5秒 |
| レスポンスタイム（最大） | < 10秒 | 10〜15秒 | > 15秒 |
| エラー率（4xx） | < 1% | 1〜5% | > 5% |
| エラー率（5xx） | 0% | < 1% | > 1% |
| リクエスト数 | 正常動作 | 通常の2倍 | 通常の5倍 |

### 1.2 システムリソース監視

#### CPU使用率

| 状態 | 範囲 | アクション |
|------|------|-----------|
| 正常 | < 70% | なし |
| 警告 | 70〜85% | 確認 |
| 危険 | > 85% | スケールアップ検討 |

**監視コマンド:**
```bash
# Docker コンテナのCPU使用率
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}"
```

#### メモリ使用率

| 状態 | 範囲 | アクション |
|------|------|-----------|
| 正常 | < 75% | なし |
| 警告 | 75〜90% | 確認 |
| 危険 | > 90% | メモリリーク調査 |

**監視コマンド:**
```bash
# Docker コンテナのメモリ使用率
docker stats --no-stream --format "table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}"
```

#### ディスク使用率

| 状態 | 範囲 | アクション |
|------|------|-----------|
| 正常 | < 80% | なし |
| 警告 | 80〜90% | クリーンアップ計画 |
| 危険 | > 90% | 緊急クリーンアップ |

**監視コマンド:**
```bash
# ディスク使用率
df -h /var/lib/docker
df -h /workspace/backups
```

### 1.3 データベース監視

#### 接続数

| 状態 | 範囲 | アクション |
|------|------|-----------|
| 正常 | < 80 | なし |
| 警告 | 80〜95 | 接続プール確認 |
| 危険 | > 95 | 接続リーク調査 |

**監視クエリ:**
```sql
-- アクティブ接続数
SELECT count(*) FROM pg_stat_activity WHERE state = 'active';

-- 最大接続数
SHOW max_connections;
```

#### クエリパフォーマンス

| メトリクス | 正常 | 警告 | 危険 |
|-----------|------|------|------|
| クエリ実行時間（平均） | < 100ms | 100ms〜1s | > 1s |
| スロークエリ数 | 0 | 1〜5/時間 | > 5/時間 |

**監視クエリ:**
```sql
-- 実行中のクエリ
SELECT pid, now() - query_start as duration, state, query
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY duration DESC;

-- スロークエリログの有効化
ALTER SYSTEM SET log_min_duration_statement = 1000; -- 1秒以上
SELECT pg_reload_conf();
```

#### データベースサイズ

```sql
-- データベースサイズ
SELECT pg_size_pretty(pg_database_size('sphr_db'));

-- テーブルサイズ
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### 1.4 バックアップ監視

#### バックアップ成功率

| 状態 | 条件 | アクション |
|------|------|-----------|
| 正常 | 100% | なし |
| 警告 | 1回失敗 | ログ確認 |
| 危険 | 2回以上失敗 | 緊急対応 |

**監視方法:**
```bash
# バックアップログの確認
tail -n 50 /workspace/backups/backup.log

# 最新バックアップの確認
ls -lht /workspace/backups/*.sql.gz | head -n 1

# バックアップファイルの整合性チェック
gzip -t /workspace/backups/sphr_db_*.sql.gz
```

## 2. アラート設定

### 2.1 アラート優先度

#### P1（緊急）- 15分以内に対応

- アプリケーションダウン（ヘルスチェック失敗）
- データベース接続不可
- ディスク使用率 > 95%
- 5xxエラー率 > 5%
- バックアップ連続失敗

#### P2（高）- 1時間以内に対応

- CPU使用率 > 85%
- メモリ使用率 > 90%
- レスポンスタイム > 10秒
- データベース接続数 > 95
- バックアップ1回失敗

#### P3（中）- 4時間以内に対応

- CPU使用率 > 70%
- メモリ使用率 > 75%
- ディスク使用率 > 80%
- レスポンスタイム > 5秒
- 4xxエラー率 > 5%

### 2.2 アラート通知先

```bash
# 環境変数で設定
ALERT_EMAIL=admin@example.com
ALERT_SLACK_WEBHOOK=https://hooks.slack.com/services/...
ALERT_PHONE=+81-90-xxxx-xxxx  # SMS通知用
```

## 3. 監視スクリプト例

### 3.1 ヘルスチェックスクリプト

```bash
#!/bin/bash
# /usr/local/bin/health-check.sh

HEALTH_URL="http://localhost:8000/health"
ALERT_EMAIL="admin@example.com"

response=$(curl -s -w "%{http_code}" -o /dev/null "$HEALTH_URL")

if [ "$response" != "200" ]; then
    echo "Health check failed: HTTP $response" | \
        mail -s "[ALERT] SPHR Health Check Failed" "$ALERT_EMAIL"
    exit 1
fi

exit 0
```

**Cron設定:**
```bash
# /etc/cron.d/sphr-monitoring
*/5 * * * * /usr/local/bin/health-check.sh
```

### 3.2 リソース監視スクリプト

```bash
#!/bin/bash
# /usr/local/bin/resource-monitor.sh

ALERT_EMAIL="admin@example.com"
CPU_THRESHOLD=85
MEM_THRESHOLD=90
DISK_THRESHOLD=90

# CPU使用率チェック
cpu_usage=$(docker stats --no-stream --format "{{.CPUPerc}}" sphr-app | sed 's/%//')
if (( $(echo "$cpu_usage > $CPU_THRESHOLD" | bc -l) )); then
    echo "CPU usage: ${cpu_usage}%" | \
        mail -s "[ALERT] High CPU Usage" "$ALERT_EMAIL"
fi

# メモリ使用率チェック
mem_usage=$(docker stats --no-stream --format "{{.MemPerc}}" sphr-app | sed 's/%//')
if (( $(echo "$mem_usage > $MEM_THRESHOLD" | bc -l) )); then
    echo "Memory usage: ${mem_usage}%" | \
        mail -s "[ALERT] High Memory Usage" "$ALERT_EMAIL"
fi

# ディスク使用率チェック
disk_usage=$(df -h /var/lib/docker | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$disk_usage" -gt "$DISK_THRESHOLD" ]; then
    echo "Disk usage: ${disk_usage}%" | \
        mail -s "[ALERT] High Disk Usage" "$ALERT_EMAIL"
fi
```

### 3.3 バックアップ監視スクリプト

```bash
#!/bin/bash
# /usr/local/bin/backup-monitor.sh

BACKUP_DIR="/workspace/backups"
ALERT_EMAIL="admin@example.com"
MAX_AGE_HOURS=26  # 24時間 + 2時間のマージン

# 最新バックアップファイルを取得
latest_backup=$(ls -t "$BACKUP_DIR"/sphr_db_*.sql.gz 2>/dev/null | head -n 1)

if [ -z "$latest_backup" ]; then
    echo "No backup files found" | \
        mail -s "[ALERT] No Backups Found" "$ALERT_EMAIL"
    exit 1
fi

# バックアップの年齢をチェック
backup_age=$(find "$latest_backup" -mmin +$((MAX_AGE_HOURS * 60)) 2>/dev/null)

if [ -n "$backup_age" ]; then
    echo "Latest backup is older than ${MAX_AGE_HOURS} hours: $latest_backup" | \
        mail -s "[ALERT] Backup Too Old" "$ALERT_EMAIL"
    exit 1
fi

# バックアップファイルの整合性チェック
if ! gzip -t "$latest_backup" 2>/dev/null; then
    echo "Backup file is corrupted: $latest_backup" | \
        mail -s "[ALERT] Corrupted Backup" "$ALERT_EMAIL"
    exit 1
fi

exit 0
```

## 4. ログ監視

### 4.1 エラーログ監視

```bash
# エラーログをリアルタイム監視
docker-compose -f docker-compose.prod.yml logs -f app | grep -i "error"

# 5xxエラーをカウント
docker-compose -f docker-compose.prod.yml logs app | grep " 5[0-9][0-9] " | wc -l
```

### 4.2 アクセスログ分析

```bash
# レートリミット超過のカウント
docker-compose -f docker-compose.prod.yml logs app | grep "429" | wc -l

# 認証失敗のカウント
docker-compose -f docker-compose.prod.yml logs app | grep "401" | wc -l
```

## 5. パフォーマンス監視

### 5.1 レスポンスタイム測定

```bash
# curlでレスポンスタイムを測定
curl -w "\nTime: %{time_total}s\n" -o /dev/null -s http://localhost:8000/api/health-data

# Apache Benchでロードテスト
ab -n 1000 -c 10 -H "Authorization: Basic $(echo -n 'user:pass' | base64)" \
   http://localhost:8000/api/health-data
```

### 5.2 データベースパフォーマンス

```sql
-- インデックス使用状況
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- テーブルスキャン統計
SELECT
  schemaname,
  tablename,
  seq_scan,
  seq_tup_read,
  idx_scan,
  idx_tup_fetch
FROM pg_stat_user_tables
ORDER BY seq_scan DESC;
```

## 6. ダッシュボード（推奨ツール）

### 6.1 Grafana + Prometheus

**docker-compose.monitoring.yml:**
```yaml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana:latest
    volumes:
      - grafana-data:/var/lib/grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin

volumes:
  prometheus-data:
  grafana-data:
```

### 6.2 推奨ダッシュボード

- アプリケーションメトリクス
  - リクエスト数（RPM）
  - レスポンスタイム（P50, P95, P99）
  - エラー率
  - アクティブユーザー数

- システムメトリクス
  - CPU使用率
  - メモリ使用率
  - ディスクI/O
  - ネットワーク帯域

- データベースメトリクス
  - クエリ実行時間
  - 接続数
  - トランザクション数
  - キャッシュヒット率

## 7. SLA（サービスレベル契約）

### 7.1 可用性

**目標:** 99.5%

**計算:**
```
月間ダウンタイム許容時間 = 30日 × 24時間 × 60分 × 0.5% = 216分（3.6時間）
```

### 7.2 パフォーマンス

| 指標 | 目標 |
|------|------|
| レスポンスタイム（平均） | 1秒以内 |
| レスポンスタイム（最大） | 10秒以内 |
| データ登録 | 3秒以内 |
| データ検索 | 5秒以内 |
| データ出力 | 10秒以内 |

### 7.3 災害復旧

| 指標 | 目標 |
|------|------|
| RTO（目標復旧時間） | 4時間 |
| RPO（目標復旧時点） | 24時間 |

## 8. 定期メンテナンス

### 8.1 日次タスク

- [ ] バックアップ成功確認
- [ ] エラーログ確認
- [ ] ディスク使用率確認

### 8.2 週次タスク

- [ ] データベースVACUUM実行
- [ ] パフォーマンスメトリクス確認
- [ ] セキュリティログ確認

### 8.3 月次タスク

- [ ] バックアップリストアテスト
- [ ] 災害復旧手順の確認
- [ ] セキュリティアップデート適用
- [ ] 容量計画の見直し

## 参考資料

- [PostgreSQL Monitoring](https://www.postgresql.org/docs/current/monitoring.html)
- [Docker Monitoring](https://docs.docker.com/config/containers/runmetrics/)
- [Prometheus Best Practices](https://prometheus.io/docs/practices/)
