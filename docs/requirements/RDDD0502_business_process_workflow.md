# 業務フロー [ID:RDDD0502]

## 概要

個人ヘルスケアレコード管理システム「sphr」の主要業務プロセスについて、To-Be業務フローをMermaidシーケンス図で表現し、新たなビジネスの流れを明確化する。

## 主要業務フロー

### WF001: 健康データ管理フロー

日々の健康データ入力から分析まての基本的な業務フローを示す。

```mermaid
sequenceDiagram
    participant User as 個人利用者
    participant Mobile as スマートフォンアプリ
    participant Web as Webシステム
    participant DB as データベース
    participant Analytics as 分析エンジン

    Note over User, Analytics: 日次健康データ管理フロー
    
    User->>+Mobile: 健康データ測定
    Mobile->>Mobile: データ入力（血圧、体重等）
    Mobile->>+Web: データ送信
    Web->>Web: データ検証
    Web->>+DB: データ保存
    DB-->>-Web: 保存完了
    Web-->>-Mobile: 登録完了通知
    Mobile-->>-User: 入力完了表示

    Note over User, Analytics: データ参照・分析
    
    User->>+Web: データ参照要求
    Web->>+DB: データ取得
    DB-->>-Web: 健康データ返却
    Web->>+Analytics: 統計分析要求
    Analytics->>Analytics: 統計計算（最大・最小・平均）
    Analytics-->>-Web: 分析結果
    Web->>Web: グラフ生成
    Web-->>-User: 分析結果・グラフ表示

    Note over User, Analytics: データ修正フロー
    
    User->>+Web: データ修正要求
    Web->>+DB: 既存データ取得
    DB-->>-Web: 現在値返却
    Web-->>User: 修正画面表示
    User->>Web: 修正データ送信
    Web->>Web: データ検証
    Web->>+DB: データ更新
    DB-->>-Web: 更新完了
    Web-->>-User: 修正完了通知
```

### WF002: データ移行・インポートフロー

既存の健康データを本システムに移行するための業務フローを示す。

```mermaid
sequenceDiagram
    participant User as 個人利用者
    participant Web as Webシステム
    participant Import as インポート処理
    participant Validate as データ検証
    participant Transform as データ変換
    participant DB as データベース

    Note over User, DB: 既存データ移行フロー
    
    User->>+Web: データ移行要求
    Web-->>User: アップロード画面表示
    User->>Web: ファイルアップロード（CSV/Excel）
    Web->>+Import: ファイル受信
    Import->>Import: ファイル形式チェック
    
    alt ファイル形式OK
        Import->>+Validate: データ検証開始
        Validate->>Validate: データ形式・範囲チェック
        Validate->>+Transform: データ変換要求
        Transform->>Transform: 標準形式変換
        Transform-->>-Validate: 変換結果
        Validate-->>-Import: 検証完了
        
        Import->>+DB: バッチインサート
        DB-->>-Import: 登録完了
        Import-->>-Web: インポート成功
        Web-->>User: 成功通知（処理件数表示）
    else ファイル形式NG
        Import-->>Web: エラー情報
        Web-->>User: エラー通知（修正指示）
    end

    Note over User, DB: インポート履歴確認
    
    User->>+Web: インポート履歴要求
    Web->>+DB: 履歴データ取得
    DB-->>-Web: インポート履歴
    Web-->>-User: 履歴一覧表示
```

### WF003: 統計分析・可視化フロー

健康データの分析とグラフ表示のための業務フローを示す。

```mermaid
sequenceDiagram
    participant User as 個人利用者
    participant Web as Webシステム
    participant Analytics as 分析エンジン
    participant DB as データベース
    participant Graph as グラフ生成
    participant Cache as キャッシュ

    Note over User, Cache: 統計分析・グラフ表示フロー
    
    User->>+Web: 分析要求（期間・項目指定）
    Web->>+Cache: キャッシュ確認
    
    alt キャッシュ存在
        Cache-->>-Web: キャッシュデータ
        Web-->>User: 高速表示
    else キャッシュなし
        Cache-->>Web: キャッシュなし
        Web->>+DB: 対象データ取得
        DB-->>-Web: 健康データ
        
        Web->>+Analytics: 統計分析要求
        Analytics->>Analytics: 基本統計計算
        Analytics->>Analytics: 移動平均計算
        Analytics->>Analytics: トレンド分析
        Analytics-->>-Web: 分析結果
        
        Web->>+Graph: グラフ生成要求
        Graph->>Graph: 折れ線グラフ作成
        Graph->>Graph: 移動平均線作成
        Graph-->>-Web: グラフデータ
        
        Web->>-Cache: 結果キャッシュ保存
        Web-->>User: 分析結果・グラフ表示
    end

    Note over User, Cache: カスタム分析
    
    User->>+Web: カスタム分析要求
    Web-->>User: 分析条件設定画面
    User->>Web: 詳細条件設定
    Web->>+Analytics: カスタム分析実行
    Analytics->>+DB: 複雑クエリ実行
    DB-->>-Analytics: 結果データ
    Analytics->>Analytics: 高度な統計処理
    Analytics-->>-Web: カスタム分析結果
    Web-->>-User: カスタムレポート表示
```

### WF004: ユーザー認証・セッション管理フロー

セキュアなユーザー認証とセッション管理の業務フローを示す。

```mermaid
sequenceDiagram
    participant User as 個人利用者
    participant Web as Webシステム
    participant Auth as 認証サービス
    participant Session as セッション管理
    participant DB as データベース
    participant Audit as 監査ログ

    Note over User, Audit: 新規ユーザー登録フロー
    
    User->>+Web: 新規登録要求
    Web-->>User: 登録フォーム表示
    User->>Web: ユーザー情報入力
    Web->>+Auth: 登録情報検証
    Auth->>Auth: パスワード強度チェック
    Auth->>Auth: メール重複チェック
    Auth->>Auth: パスワードハッシュ化
    Auth->>+DB: ユーザー情報保存
    DB-->>-Auth: 保存完了
    Auth-->>-Web: 登録成功
    Web->>+Audit: 登録ログ記録
    Audit-->>-Web: ログ完了
    Web-->>-User: 登録完了通知

    Note over User, Audit: ログイン認証フロー
    
    User->>+Web: ログイン要求
    Web-->>User: ログインフォーム
    User->>Web: 認証情報入力
    Web->>+Auth: 認証処理
    Auth->>+DB: ユーザー情報取得
    DB-->>-Auth: ユーザーデータ
    Auth->>Auth: パスワード照合
    
    alt 認証成功
        Auth->>+Session: セッション作成
        Session->>Session: セッションID生成
        Session->>+DB: セッション情報保存
        DB-->>-Session: 保存完了
        Session-->>-Auth: セッションID
        Auth-->>-Web: 認証成功・セッションID
        Web->>+Audit: ログイン成功ログ
        Audit-->>-Web: ログ完了
        Web-->>User: ログイン成功・メイン画面
    else 認証失敗
        Auth-->>Web: 認証失敗
        Web->>+Audit: ログイン失敗ログ
        Audit-->>-Web: ログ完了
        Web-->>User: エラーメッセージ
    end

    Note over User, Audit: セッション管理
    
    User->>+Web: 操作要求（認証必要）
    Web->>+Session: セッション検証
    Session->>+DB: セッション情報取得
    DB-->>-Session: セッション状態
    
    alt セッション有効
        Session-->>-Web: 認証OK
        Web->>Web: 業務処理実行
        Web-->>User: 処理結果
    else セッション無効
        Session-->>Web: 認証NG
        Web-->>User: ログイン画面リダイレクト
    end
```

## 業務フローの特徴と改善点

### 現状（As-Is）との比較

#### 従来の問題点
- **データ入力**: 複数アプリでの分散入力、操作の複雑さ
- **データ分析**: 限定的な分析機能、視覚化の不足
- **データ共有**: 手作業でのデータ収集、非効率な情報伝達

#### 改善後（To-Be）の特徴
- **統合管理**: 単一プラットフォームでの一元管理
- **自動化**: データ検証、統計計算の自動化
- **視覚化**: 直感的なグラフ表示、トレンド分析
- **セキュリティ**: 多層防御による安全な認証・セッション管理

### フロー最適化のポイント

#### 効率化要素
1. **キャッシュ活用**: 分析結果の高速表示
2. **バッチ処理**: 大量データの効率的な移行
3. **非同期処理**: ユーザビリティを損なわない処理
4. **自動検証**: 人的エラーの削減

#### ユーザビリティ向上
1. **レスポンシブ対応**: マルチデバイスでの一貫した操作性
2. **プログレス表示**: 処理状況の可視化
3. **エラーハンドリング**: 明確なエラーメッセージとリカバリ手順
4. **直感的UI**: 最小限のクリック数での目的達成

## Phase別実装計画

### Phase 1 (MVP): 基本フロー
- **WF001**: 健康データ管理フロー（基本機能）
- **WF002**: データ移行・インポートフロー
- **WF003**: 統計分析・可視化フロー（基本統計）
- **WF004**: ユーザー認証・セッション管理フロー

### Phase 2: 機能拡張
- 医療機関連携フロー
- データエクスポートフロー
- 高度な分析フロー

### Phase 3: 高度化
- 代理人操作フロー
- 承認ワークフロー
- 機械学習分析フロー

## エラー処理とリカバリ

### 主要なエラーパターン
1. **データ入力エラー**: 範囲外値、形式不正
2. **システムエラー**: DB接続エラー、処理タイムアウト
3. **認証エラー**: セッション期限切れ、権限不足
4. **ファイルエラー**: 形式不正、サイズ超過

### リカバリ手順
1. **自動復旧**: セッション再作成、処理リトライ
2. **ユーザー対応**: 明確なエラーメッセージ、修正手順案内
3. **管理者対応**: システム監視、手動復旧処理
4. **データ保護**: トランザクション管理、バックアップ復旧

## まとめ

4つの主要業務フローにより、個人健康記録管理システムの新しいビジネスプロセスを明確化した。各フローは相互に連携し、従来の課題を解決しつつ、ユーザビリティとセキュリティを両立する設計となっている。特に、データ管理から分析・可視化までの一連のフローが統合されることで、個人の健康管理体験が大幅に向上する。