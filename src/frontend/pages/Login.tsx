/**
 * Login Page
 * User authentication page
 */

import { useState } from "react";
import { useAuth } from "../hooks/useAuth";

export function LoginPage() {
  const { login, register } = useAuth();
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isRegisterMode) {
        await register(username, password);
      } else {
        await login(username, password);
      }
    } catch (err: any) {
      setError(err.message || "認証に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "100vh",
      backgroundColor: "#f5f5f5",
    }}>
      <div style={{
        backgroundColor: "white",
        padding: "2rem",
        borderRadius: "8px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
        width: "100%",
        maxWidth: "400px",
      }}>
        <h1 style={{ marginBottom: "1.5rem", textAlign: "center" }}>
          {isRegisterMode ? "ユーザー登録" : "ログイン"}
        </h1>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem" }}>
              ユーザー名
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "0.5rem",
                border: "1px solid #ddd",
                borderRadius: "4px",
              }}
            />
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem" }}>
              パスワード
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              style={{
                width: "100%",
                padding: "0.5rem",
                border: "1px solid #ddd",
                borderRadius: "4px",
              }}
            />
          </div>

          {error && (
            <div style={{
              color: "red",
              marginBottom: "1rem",
              padding: "0.5rem",
              backgroundColor: "#fee",
              borderRadius: "4px",
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "0.75rem",
              backgroundColor: "#1976d2",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "処理中..." : (isRegisterMode ? "登録" : "ログイン")}
          </button>
        </form>

        <div style={{ marginTop: "1rem", textAlign: "center" }}>
          <button
            onClick={() => {
              setIsRegisterMode(!isRegisterMode);
              setError("");
            }}
            style={{
              background: "none",
              border: "none",
              color: "#1976d2",
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            {isRegisterMode ? "ログインに戻る" : "新規登録"}
          </button>
        </div>
      </div>
    </div>
  );
}
