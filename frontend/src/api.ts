import type {
  Category,
  CategoryRule,
  ImportPreview,
  ImportResult,
  LegacyImportResult,
  ReportByCategory,
  ReportSummary,
  Transaction,
  TransactionType,
} from "./types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: init?.body && !(init.body instanceof FormData)
      ? { "Content-Type": "application/json" }
      : undefined,
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  categories: {
    list: (type?: TransactionType) =>
      request<Category[]>(`/api/categories${type ? `?type=${type}` : ""}`),
    create: (data: { name: string; type: TransactionType; color?: string; icon?: string }) =>
      request<Category>("/api/categories", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: { name?: string; color?: string; icon?: string }) =>
      request<Category>(`/api/categories/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    remove: (id: number) => request<void>(`/api/categories/${id}`, { method: "DELETE" }),
    move: (id: number, direction: "up" | "down") =>
      request<Category[]>(`/api/categories/${id}/move`, {
        method: "POST",
        body: JSON.stringify({ direction }),
      }),
    reset: () => request<Category[]>("/api/categories/reset", { method: "POST" }),
    autoColor: () => request<Category[]>("/api/categories/auto-color", { method: "POST" }),
  },
  transactions: {
    list: (params: Record<string, string | undefined>) => {
      const query = new URLSearchParams(
        Object.entries(params).filter((entry): entry is [string, string] => Boolean(entry[1])),
      ).toString();
      return request<{ rows: Transaction[]; total: number }>(
        `/api/transactions${query ? `?${query}` : ""}`,
      );
    },
    create: (data: {
      type: TransactionType;
      amount: number;
      description?: string;
      categoryId?: number | null;
      date: string;
    }) => request<Transaction>("/api/transactions", { method: "POST", body: JSON.stringify(data) }),
    update: (
      id: number,
      data: Partial<{ amount: number; description: string; categoryId: number | null; date: string }>,
    ) =>
      request<Transaction>(`/api/transactions/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    remove: (id: number) => request<void>(`/api/transactions/${id}`, { method: "DELETE" }),
  },
  rules: {
    list: () => request<CategoryRule[]>("/api/rules"),
    create: (data: { pattern: string; categoryId: number; source?: "manual" | "learned" }) =>
      request<CategoryRule>("/api/rules", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: Partial<{ pattern: string; categoryId: number; enabled: boolean }>) =>
      request<CategoryRule>(`/api/rules/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    remove: (id: number) => request<void>(`/api/rules/${id}`, { method: "DELETE" }),
  },
  reports: {
    byCategory: (params: { type?: TransactionType; from?: string; to?: string }) => {
      const query = new URLSearchParams(
        Object.entries(params).filter((e): e is [string, string] => Boolean(e[1])),
      ).toString();
      return request<ReportByCategory[]>(`/api/reports/by-category${query ? `?${query}` : ""}`);
    },
    summary: (params: { from?: string; to?: string }) => {
      const query = new URLSearchParams(
        Object.entries(params).filter((e): e is [string, string] => Boolean(e[1])),
      ).toString();
      return request<ReportSummary>(`/api/reports/summary${query ? `?${query}` : ""}`);
    },
  },
  import: {
    preview: (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return request<ImportPreview>("/api/import/preview", { method: "POST", body: form });
    },
    commit: (
      file: File,
      mapping: { dateColumn: string; descriptionColumn: string; amountColumn: string },
      options: { saveProfile: boolean; profileName?: string },
    ) => {
      const form = new FormData();
      form.append("file", file);
      form.append("dateColumn", mapping.dateColumn);
      form.append("descriptionColumn", mapping.descriptionColumn);
      form.append("amountColumn", mapping.amountColumn);
      form.append("saveProfile", String(options.saveProfile));
      if (options.profileName) form.append("profileName", options.profileName);
      return request<ImportResult>("/api/import/commit", { method: "POST", body: form });
    },
    legacyCategorize: (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return request<LegacyImportResult>("/api/import/legacy-categorize", {
        method: "POST",
        body: form,
      });
    },
  },
  config: {
    get: () => request<{ legacyCategoryImport: boolean }>("/api/config"),
  },
};
