/**
 * Data Analysis Page
 * Statistics and graphs
 */

import { useState, useEffect } from "react";
import { api } from "../services/api";

export function AnalysisPage() {
  const [dataTypes, setDataTypes] = useState<any[]>([]);
  const [dataTypeId, setDataTypeId] = useState("");
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [statistics, setStatistics] = useState<any>(null);
  const [graphData, setGraphData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
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

  const loadAnalysis = async () => {
    if (!dataTypeId) return;

    setLoading(true);
    try {
      const [statsResult, graphResult] = await Promise.all([
        api.getStatistics({ dataTypeId, startDate, endDate }),
        api.getGraphData({ dataTypeId, startDate, endDate }),
      ]);

      setStatistics(statsResult.data);
      setGraphData(graphResult.data?.data || []);
      setError("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
      <h1>データ分析</h1>

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

      {/* Filter Form */}
      <div style={{
        backgroundColor: "white",
        padding: "1.5rem",
        borderRadius: "8px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        marginBottom: "2rem",
      }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: "1rem", alignItems: "end" }}>
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem" }}>
              データ種類
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

          <button
            onClick={loadAnalysis}
            disabled={loading}
            style={{
              padding: "0.5rem 1.5rem",
              backgroundColor: "#1976d2",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            分析
          </button>
        </div>
      </div>

      {/* Statistics */}
      {statistics && (
        <div style={{
          backgroundColor: "white",
          padding: "1.5rem",
          borderRadius: "8px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          marginBottom: "2rem",
        }}>
          <h2>統計情報</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }}>
            <div style={{
              padding: "1rem",
              backgroundColor: "#f5f5f5",
              borderRadius: "4px",
              textAlign: "center",
            }}>
              <div style={{ fontSize: "0.875rem", color: "#666" }}>最大値</div>
              <div style={{ fontSize: "1.5rem", fontWeight: "bold", marginTop: "0.5rem" }}>
                {statistics.max} {statistics.unit}
              </div>
            </div>

            <div style={{
              padding: "1rem",
              backgroundColor: "#f5f5f5",
              borderRadius: "4px",
              textAlign: "center",
            }}>
              <div style={{ fontSize: "0.875rem", color: "#666" }}>最小値</div>
              <div style={{ fontSize: "1.5rem", fontWeight: "bold", marginTop: "0.5rem" }}>
                {statistics.min} {statistics.unit}
              </div>
            </div>

            <div style={{
              padding: "1rem",
              backgroundColor: "#f5f5f5",
              borderRadius: "4px",
              textAlign: "center",
            }}>
              <div style={{ fontSize: "0.875rem", color: "#666" }}>平均値</div>
              <div style={{ fontSize: "1.5rem", fontWeight: "bold", marginTop: "0.5rem" }}>
                {statistics.avg} {statistics.unit}
              </div>
            </div>

            <div style={{
              padding: "1rem",
              backgroundColor: "#f5f5f5",
              borderRadius: "4px",
              textAlign: "center",
            }}>
              <div style={{ fontSize: "0.875rem", color: "#666" }}>データ件数</div>
              <div style={{ fontSize: "1.5rem", fontWeight: "bold", marginTop: "0.5rem" }}>
                {statistics.count} 件
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Graph Data Table */}
      {graphData.length > 0 && (
        <div style={{
          backgroundColor: "white",
          padding: "1.5rem",
          borderRadius: "8px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        }}>
          <h2>グラフデータ</h2>
          <div style={{ maxHeight: "400px", overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #ddd" }}>
                  <th style={{ padding: "0.75rem", textAlign: "left" }}>測定日</th>
                  <th style={{ padding: "0.75rem", textAlign: "right" }}>測定値</th>
                </tr>
              </thead>
              <tbody>
                {graphData.map((item, index) => (
                  <tr key={index} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: "0.75rem" }}>{item.date}</td>
                    <td style={{ padding: "0.75rem", textAlign: "right" }}>
                      {item.value} {statistics?.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
