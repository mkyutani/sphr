# 業務用語定義 [ID:RDDD0701]

## **概要**

sphr（Simple Personal Healthcare Records）プロジェクトに関わる全てのステークホルダーが共通理解を持つための業務用語定義集。

## **業務用語定義一覧**

| 用語 | 読み | 英語表記 | 定義 | 備考 |
|------|------|----------|------|------|
| sphr | エス・ピー・エイチ・アール | Simple Personal Healthcare Records | 個人用健康記録管理システムの略称 | プロジェクト名 |
| 健康記録データ | けんこうきろくデータ | Health Record Data | 個人の健康状態を数値化して記録したデータ | 血圧、脈拍、体重等 |
| バイタルデータ | バイタルデータ | Vital Data | 生命維持に関わる基本的な生体情報 | 血圧、脈拍等 |
| 収縮期血圧 | しゅうしゅくき けつあつ | Systolic Blood Pressure | 心臓が収縮した時の血圧の最高値 | mmHg単位 |
| 拡張期血圧 | かくちょうき けつあつ | Diastolic Blood Pressure | 心臓が拡張した時の血圧の最低値 | mmHg単位 |
| 脈拍数 | みゃくはくすう | Pulse Rate | 1分間の脈拍回数 | bpm（beats per minute）単位 |
| 体重 | たいじゅう | Body Weight | 身体の重量 | kg単位 |
| 時系列データ | じけいれつデータ | Time Series Data | 時間経過に伴って蓄積されるデータ | 継続的な健康管理に活用 |
| 統計分析 | とうけいぶんせき | Statistical Analysis | データの最大値、最小値、平均値等を算出する処理 | 期間指定可能 |
| グラフ表示 | グラフひょうじ | Graphical Visualization | データを視覚的に表現する機能 | 折れ線グラフ、移動平均等 |
| 移動平均 | いどうへいきん | Moving Average | 指定期間のデータの平均値を連続的に算出したもの | 30日移動平均等 |
| 基本認証 | きほんにんしょう | Basic Authentication | ユーザー名とパスワードによる認証方式 | セキュリティ要件 |
| データ移行 | データいこう | Data Migration | 既存システムからのデータ取り込み | 3年分の履歴データ対応 |
| マスタデータ | マスタデータ | Master Data | システムで管理する基準となるデータ | 健康データ項目の設定情報 |
| かかりつけ医 | かかりつけい | Primary Care Physician | 継続的に診療を受けている主治医 | データ共有の対象 |
| 論理削除 | ろんりさくじょ | Logical Delete | データを物理的に削除せずフラグで削除状態を管理する方式 | データ復旧可能性を考慮 |
| EPARK | イーパーク | EPARK | 既存の健康管理サービス | 機能過多で個人ニーズに不適合 |
| スマートウォッチ | スマートウォッチ | Smartwatch | ウェアラブルデバイスの一種 | データ種別の制約がある |
| 日次入力 | にちじにゅうりょく | Daily Input | 毎日のデータ入力作業 | スマートフォン・Web経由 |
| スマートフォン | スマートフォン | Smartphone | 多機能携帯端末 | データ入力の主要手段 |
| Web | ウェブ | Web | インターネット上のサービス | ブラウザ経由でのアクセス |
| 認証済みユーザー | にんしょうずみユーザー | Authenticated User | システムにログイン済みの利用者 | データアクセス権限を持つ |
| データ所有者 | データしょゆうしゃ | Data Owner | 健康記録データの所有権を持つユーザー | データの操作権限を持つ |
| アクセス権限 | アクセスけんげん | Access Permission | システムリソースへのアクセス制御 | 役割ベースの権限管理 |
| タイムスタンプ | タイムスタンプ | Timestamp | データの作成・更新日時の記録 | 時系列分析に必要 |
| 修正履歴 | しゅうせいりれき | Modification History | データ変更の記録 | 監査証跡として保持 |
| 削除フラグ | さくじょフラグ | Delete Flag | 論理削除の状態を示す識別子 | 物理削除の代替手段 |
| メール認証 | メールにんしょう | Email Verification | 電子メールによる本人確認 | ユーザー登録時の必須手順 |
| ロック状態 | ロックじょうたい | Locked State | アカウントアクセスが制限された状態 | セキュリティ保護措置 |
| 認証失敗上限 | にんしょうしっぱいじょうげん | Authentication Failure Limit | ログイン失敗の許容回数 | アカウントロックの発動条件 |
| 保持期間 | ほじきかん | Retention Period | データを保管する期間 | システムリソース管理 |
| 分析処理 | ぶんせきしょり | Analysis Processing | 統計計算やグラフ生成等の処理 | バッチ処理で実行 |
| 可視化 | かしか | Visualization | データを図表で表現すること | ユーザー理解促進 |
| 業務フロー | ぎょうむフロー | Business Flow | 業務処理の流れ | プロセス定義の基準 |
| エンティティ | エンティティ | Entity | システムで管理するデータの単位 | データモデルの基本要素 |
| ユースケース | ユースケース | Use Case | システムの利用場面や機能要件 | 要件定義の表現方法 |

## **略語・専門用語**

| 略語・専門用語 | 正式名称 | 意味 |
|---------------|----------|------|
| PHR | Personal Health Record | 個人健康記録 |
| EMR | Electronic Medical Record | 電子医療記録 |
| EHR | Electronic Health Record | 電子健康記録 |
| API | Application Programming Interface | アプリケーション間の連携仕様 |
| UI | User Interface | ユーザーインターフェース |
| UX | User Experience | ユーザーエクスペリエンス |
| CRUD | Create, Read, Update, Delete | データ操作の基本機能 |
| CSV | Comma-Separated Values | カンマ区切りデータ形式 |
| JSON | JavaScript Object Notation | データ交換フォーマット |
| SSL/TLS | Secure Sockets Layer/Transport Layer Security | 暗号化通信プロトコル |
| HTTPS | HyperText Transfer Protocol Secure | 暗号化されたHTTP通信 |
| DB | Database | データベース |
| SQL | Structured Query Language | データベース操作言語 |

## **単位・測定値**

| 項目 | 単位 | 説明 |
|------|------|------|
| 血圧 | mmHg | ミリメートル水銀柱 |
| 脈拍 | bpm | beats per minute（1分間の拍数） |
| 体重 | kg | キログラム |
| 期間 | 日/週/月/年 | 分析対象期間の指定単位 |
| 保存期間 | 年 | データ保持期間の単位 |

## **関連法規・標準**

| 項目 | 説明 |
|------|------|
| 個人情報保護法 | 個人の健康情報の取り扱いに関する法的要件 |
| 医療情報システムの安全管理に関するガイドライン | 厚生労働省が定める医療情報取り扱い基準 |
| JIS X 25010 | ソフトウェア品質モデルの国際標準 |
| ISO/IEC 27001 | 情報セキュリティマネジメントシステムの国際標準 |