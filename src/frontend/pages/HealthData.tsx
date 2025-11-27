/**
 * Health Data Management Page
 * CRUD operations for health data
 */

import { useState, useEffect } from "react";
import { api } from "../services/api";

interface HealthDataItem {
  healthDataId: string;
  dataTypeId: string;
  dataTypeName: string;
  unit: string;
  measurementValue: number;
  measurementDate: string;
  memo?: string;
}

export function HealthDataPage() {
  const [data, setData] = useState<HealthDataItem[]>([]);
  const [dataTypes, setDataTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [dataTypeId, setDataTypeId] = useState("");
  const [measurementValue, setMeasurementValue] = useState("");
  const [measurementDate, setMeasurementDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [memo, setMemo] = useState("");

  useEffect(() => {
    loadData();
    loadDataTypes();
  }, []);

  const loadDataTypes = async () => {
    try {
      const result = await api.getDataTypes();
      setDataTypes(result.data || []);
      if (result.data?.length > 0) {
        setDataTypeId(result.data[0].dataTypeId);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await api.getHealthData({ limit: 100 });
      setData(result.data?.items || []);
      setError("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.createHealthData({
        dataTypeId,
        measurementValue: Number(measurementValue),
        measurementDate,
        memo: memo || undefined,
      });

      setMeasurementValue("");
      setMemo("");
      setMeasurementDate(new Date().toISOString().split("T")[0]);
      await loadData();
      setError("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("このデータを削除しますか？（復元できません）")) {
      return;
    }

    try {
      await api.deleteHealthData(id);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
      <h1>健康データ管理</h1>

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

      {/* Registration Form */}
      <div style={{
        backgroundColor: "white",
        padding: "1.5rem",
        borderRadius: "8px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        marginBottom: "2rem",
      }}>
        <h2>データ登録</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem" }}>
                データ種類
              </label>
              <select
                value={dataTypeId}
                onChange={(e) => setDataTypeId(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                }}
              >
                {dataTypes.map((dt) => (
                  <option key={dt.dataTypeId} value={dt.dataTypeId}>
                    {dt.dataTypeName} ({dt.unit})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "0.5rem" }}>
                測定値
              </label>
              <input
                type="number"
                step="0.1"
                value={measurementValue}
                onChange={(e) => setMeasurementValue(e.target.value)}
                required
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
                測定日
              </label>
              <input
                type="date"
                value={measurementDate}
                onChange={(e) => setMeasurementDate(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
                required
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
                メモ（任意）
              </label>
              <input
                type="text"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
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
            type="submit"
            disabled={loading}
            style={{
              marginTop: "1rem",
              padding: "0.75rem 1.5rem",
              backgroundColor: "#1976d2",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            登録
          </button>
        </form>
      </div>

      {/* Data List */}
      <div style={{
        backgroundColor: "white",
        padding: "1.5rem",
        borderRadius: "8px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      }}>
        <h2>データ一覧</h2>
        {loading ? (
          <p>読み込み中...</p>
        ) : data.length === 0 ? (
          <p>データがありません</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #ddd" }}>
                <th style={{ padding: "0.75rem", textAlign: "left" }}>測定日</th>
                <th style={{ padding: "0.75rem", textAlign: "left" }}>データ種類</th>
                <th style={{ padding: "0.75rem", textAlign: "right" }}>測定値</th>
                <th style={{ padding: "0.75rem", textAlign: "left" }}>メモ</th>
                <th style={{ padding: "0.75rem", textAlign: "center" }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.healthDataId} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "0.75rem" }}>{item.measurementDate}</td>
                  <td style={{ padding: "0.75rem" }}>{item.dataTypeName}</td>
                  <td style={{ padding: "0.75rem", textAlign: "right" }}>
                    {item.measurementValue} {item.unit}
                  </td>
                  <td style={{ padding: "0.75rem" }}>{item.memo || "-"}</td>
                  <td style={{ padding: "0.75rem", textAlign: "center" }}>
                    <button
                      onClick={() => handleDelete(item.healthDataId)}
                      style={{
                        padding: "0.25rem 0.75rem",
                        backgroundColor: "#d32f2f",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                      }}
                    >
                      削除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
