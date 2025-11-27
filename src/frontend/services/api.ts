/**
 * API Client
 * Provides type-safe API calls with Basic Auth
 */

const API_BASE = import.meta.env?.VITE_API_BASE || "http://localhost:8000";

/**
 * API Error
 */
export class APIError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
  ) {
    super(message);
    this.name = "APIError";
  }
}

/**
 * API Client with Basic Auth
 */
export class APIClient {
  private username: string | null = null;
  private password: string | null = null;

  setCredentials(username: string, password: string) {
    this.username = username;
    this.password = password;
  }

  clearCredentials() {
    this.username = null;
    this.password = null;
  }

  private getAuthHeader(): HeadersInit {
    if (!this.username || !this.password) {
      return {};
    }

    const credentials = btoa(`${this.username}:${this.password}`);
    return {
      Authorization: `Basic ${credentials}`,
    };
  }

  async request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${API_BASE}${path}`;
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...this.getAuthHeader(),
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new APIError(
          data.error?.message || "リクエストに失敗しました",
          data.error?.code || "UNKNOWN_ERROR",
          response.status,
        );
      }

      return data;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }

      throw new APIError(
        "ネットワークエラーが発生しました",
        "NETWORK_ERROR",
        0,
      );
    }
  }

  // Auth APIs
  async register(username: string, password: string) {
    return this.request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  }

  async login(username: string, password: string) {
    const result = await this.request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    this.setCredentials(username, password);
    return result;
  }

  async logout() {
    const result = await this.request("/api/auth/logout", {
      method: "POST",
    });
    this.clearCredentials();
    return result;
  }

  // Data Types APIs
  async getDataTypes() {
    return this.request("/api/data-types");
  }

  // Health Data APIs
  async getHealthData(params?: {
    dataTypeId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }) {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return this.request(`/api/health-data${query ? `?${query}` : ""}`);
  }

  async createHealthData(data: {
    dataTypeId: string;
    measurementValue: number;
    measurementDate: string;
    memo?: string;
  }) {
    return this.request("/api/health-data", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateHealthData(
    id: string,
    data: {
      measurementValue?: number;
      measurementDate?: string;
      memo?: string;
    },
  ) {
    return this.request(`/api/health-data/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteHealthData(id: string) {
    return this.request(`/api/health-data/${id}`, {
      method: "DELETE",
    });
  }

  // Analysis APIs
  async getStatistics(params: {
    dataTypeId: string;
    startDate: string;
    endDate: string;
  }) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/api/analysis/statistics?${query}`);
  }

  async getGraphData(params: {
    dataTypeId: string;
    startDate: string;
    endDate: string;
  }) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/api/analysis/graph?${query}`);
  }

  async getMovingAverage(params: {
    dataTypeId: string;
    startDate: string;
    endDate: string;
    window?: number;
  }) {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return this.request(`/api/analysis/moving-average?${query}`);
  }

  // Export APIs
  async exportData(params: {
    format: "csv" | "pdf";
    startDate: string;
    endDate: string;
    dataTypeId?: string;
  }) {
    const response = await fetch(`${API_BASE}/api/export`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...this.getAuthHeader(),
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new APIError(
        data.error?.message || "エクスポートに失敗しました",
        data.error?.code || "EXPORT_ERROR",
        response.status,
      );
    }

    return response.blob();
  }

  async getExportHistory(params?: { limit?: number; offset?: number }) {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return this.request(`/api/export/history${query ? `?${query}` : ""}`);
  }

  // Import APIs
  async importData(file: File) {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${API_BASE}/api/import`, {
      method: "POST",
      headers: this.getAuthHeader(),
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new APIError(
        data.error?.message || "インポートに失敗しました",
        data.error?.code || "IMPORT_ERROR",
        response.status,
      );
    }

    return data;
  }
}

export const api = new APIClient();
