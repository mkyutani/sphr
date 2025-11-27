/**
 * Export/Import Page
 * Data export and import functionality
 */

import { useState, useEffect } from "react";
import { api } from "../services/api";

export function ExportImportPage() {
  const [dataTypes, setDataTypes] = useState<any[]>([]);
  const [format, setFormat] = useState<"csv" | "pdf">("csv");
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [dataTypeId, setDataTypeId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<any>(null);

  useEffect(() => {
    loadDataTypes();
  }, []);

  const loadDataTypes = async () => {
    try {
      const result = await api.getDataTypes();
      setDataTypes(result.data || []);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleExport = async () => {
    setLoading(true);
    try {
      const blob = await api.exportData({
        format,
        startDate,
        endDate,
        dataTypeId: dataTypeId || undefined,
      });

      // Download file
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `health_data_${startDate}_${endDate}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setError("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      setError("ファイルを選択してください");
      return;
    }

    setLoading(true);
    setImportResult(null);

    try {
      const result = await api.importData(importFile);
      setImportResult(result.data);
      setImportFile(null);
      setError("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
      <h1>データ出力・インポート</h1>

      {error && (
        <div style={{
          color: "red",
          padding: "1rem",
          backgroundColor: "#fee",
          borderRadius: "4px",
          marginBottom: "1rem",
        }}>
          {error}
        </div>
      )}

      {/* Export Section */}
      <div style={{
        backgroundColor: "white",
        padding: "1.5rem",
        borderRadius: "8px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        marginBottom: "2rem",
      }}>
        <h2>データ出力</h2>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem" }}>
              出力形式
            </label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as "csv" | "pdf")}
              style={{
                width: "100%",
                padding: "0.5rem",
                border: "1px solid #ddd",
                borderRadius: "4px",
              }}
            >
              <option value="csv">CSV</option>
              <option value="pdf">PDF</option>
            </select>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "0.5rem" }}>
              データ種類（任意）
            </label>
            <select
              value={dataTypeId}
              onChange={(e) => setDataTypeId(e.target.value)}
              style={{
                width: "100%",
                padding: "0.5rem",
                border: "1px solid #ddd",
                borderRadius: "4px",
              }}
            >
              <option value="">すべて</option>
              {dataTypes.map((dt) => (
                <option key={dt.dataTypeId} value={dt.dataTypeId}>
                  {dt.dataTypeName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "0.5rem" }}>
              開始日
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{
                width: "100%",
                padding: "0.5rem",
                border: "1px solid #ddd",
                borderRadius: "4px",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "0.5rem" }}>
              終了日
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
              style={{
                width: "100%",
                padding: "0.5rem",
                border: "1px solid #ddd",
                borderRadius: "4px",
              }}
            />
          </div>
        </div>

        <button
          onClick={handleExport}
          disabled={loading}
          style={{
            padding: "0.75rem 1.5rem",
            backgroundColor: "#1976d2",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          ダウンロード
        </button>
      </div>

      {/* Import Section */}
      <div style={{
        backgroundColor: "white",
        padding: "1.5rem",
        borderRadius: "8px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      }}>
        <h2>データインポート</h2>

        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem" }}>
            CSVファイル
          </label>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setImportFile(e.target.files?.[0] || null)}
            style={{
              width: "100%",
              padding: "0.5rem",
              border: "1px solid #ddd",
              borderRadius: "4px",
            }}
          />
          <div style={{ fontSize: "0.875rem", color: "#666", marginTop: "0.5rem" }}>
            形式: 測定日,データ種類,測定値,単位,メモ
          </div>
        </div>

        <button
          onClick={handleImport}
          disabled={loading || !importFile}
          style={{
            padding: "0.75rem 1.5rem",
            backgroundColor: "#1976d2",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: loading || !importFile ? "not-allowed" : "pointer",
            opacity: loading || !importFile ? 0.6 : 1,
          }}
        >
          インポート
        </button>

        {importResult && (
          <div style={{
            marginTop: "1rem",
            padding: "1rem",
            backgroundColor: importResult.success ? "#e8f5e9" : "#fff3e0",
            borderRadius: "4px",
          }}>
            <div style={{ fontWeight: "bold", marginBottom: "0.5rem" }}>
              {importResult.message}
            </div>
            <div>成功: {importResult.successCount}件</div>
            <div>失敗: {importResult.failureCount}件</div>

            {importResult.errors && importResult.errors.length > 0 && (
              <div style={{ marginTop: "1rem" }}>
                <div style={{ fontWeight: "bold", marginBottom: "0.5rem" }}>エラー詳細:</div>
                <ul style={{ margin: 0, paddingLeft: "1.5rem" }}>
                  {importResult.errors.map((err: any, index: number) => (
                    <li key={index}>
                      行{err.row}: {err.field} - {err.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
