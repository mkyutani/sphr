/**
 * Main Application Component
 * Routing and layout
 */

import { useState } from "react";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { LoginPage } from "./pages/Login";
import { HealthDataPage } from "./pages/HealthData";
import { AnalysisPage } from "./pages/Analysis";
import { ExportImportPage } from "./pages/ExportImport";

type Page = "health-data" | "analysis" | "export-import";

function Navigation({ currentPage, onNavigate, onLogout }: {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  onLogout: () => void;
}) {
  const navStyle = (page: Page) => ({
    padding: "0.75rem 1.5rem",
    backgroundColor: currentPage === page ? "#1976d2" : "transparent",
    color: currentPage === page ? "white" : "#333",
    border: "none",
    cursor: "pointer",
    fontSize: "1rem",
  });

  return (
    <nav style={{
      backgroundColor: "white",
      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      marginBottom: "0",
    }}>
      <div style={{
        maxWidth: "1200px",
        margin: "0 auto",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0 1rem",
      }}>
        <div style={{ display: "flex" }}>
          <button style={navStyle("health-data")} onClick={() => onNavigate("health-data")}>
            健康データ管理
          </button>
          <button style={navStyle("analysis")} onClick={() => onNavigate("analysis")}>
            データ分析
          </button>
          <button style={navStyle("export-import")} onClick={() => onNavigate("export-import")}>
            出力・インポート
          </button>
        </div>

        <button
          onClick={onLogout}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "#d32f2f",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          ログアウト
        </button>
      </div>
    </nav>
  );
}

function AuthenticatedApp() {
  const { logout } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>("health-data");

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
      <Navigation
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        onLogout={handleLogout}
      />

      {currentPage === "health-data" && <HealthDataPage />}
      {currentPage === "analysis" && <AnalysisPage />}
      {currentPage === "export-import" && <ExportImportPage />}
    </div>
  );
}

function AppContent() {
  const { isAuthenticated } = useAuth();

  return isAuthenticated ? <AuthenticatedApp /> : <LoginPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
