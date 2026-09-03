import type {
  ActivityLogEntry,
  AppSettings,
  Category,
  CategoryRule,
  CategoryType,
  ImportPreview,
  ImportResult,
  LegacyImportResult,
  MissingRecurring,
  MonthlyByCategory,
  MonthlyComparison,
  NetWorth,
  RecurringPayment,
  ReportByCategory,
  ReportSummary,
  SavingsBucket,
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
    list: (type?: CategoryType) =>
      request<Category[]>(`/api/categories${type ? `?type=${type}` : ""}`),
    create: (data: { name: string; type: CategoryType; color?: string; icon?: string }) =>
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
      bucketId?: number | null;
      date: string;
    }) => request<Transaction>("/api/transactions", { method: "POST", body: JSON.stringify(data) }),
    update: (
      id: number,
      data: Partial<{
        type: TransactionType;
        amount: number;
        description: string;
        categoryId: number | null;
        bucketId: number | null;
        date: string;
      }>,
    ) =>
      request<Transaction>(`/api/transactions/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    remove: (id: number) => request<void>(`/api/transactions/${id}`, { method: "DELETE" }),
    bulkRemove: (ids: number[]) =>
      request<void>("/api/transactions", { method: "DELETE", body: JSON.stringify({ ids }) }),
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
    monthlyComparison: (month?: string) =>
      request<MonthlyComparison>(`/api/reports/monthly-comparison${month ? `?month=${month}` : ""}`),
    monthlyByCategory: (params: { type?: TransactionType; months?: number }) => {
      const entries: [string, string][] = [];
      if (params.type) entries.push(["type", params.type]);
      if (params.months !== undefined) entries.push(["months", String(params.months)]);
      const query = new URLSearchParams(entries).toString();
      return request<MonthlyByCategory>(`/api/reports/monthly-by-category${query ? `?${query}` : ""}`);
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
  settings: {
    get: () => request<AppSettings>("/api/settings"),
    update: (data: Partial<AppSettings>) =>
      request<AppSettings>("/api/settings", { method: "PATCH", body: JSON.stringify(data) }),
  },
  history: {
    list: () => request<ActivityLogEntry[]>("/api/history"),
  },
  networth: {
    get: () => request<NetWorth>("/api/networth"),
    setLiquid: (value: number | null) =>
      request<NetWorth>("/api/networth/liquid", { method: "PATCH", body: JSON.stringify({ value }) }),
  },
  buckets: {
    list: () => request<SavingsBucket[]>("/api/buckets"),
    create: (data: { name: string; color?: string; icon?: string }) =>
      request<SavingsBucket>("/api/buckets", { method: "POST", body: JSON.stringify(data) }),
    update: (
      id: number,
      data: Partial<{ name: string; color: string; icon: string; note: string | null; manualValue: number | null }>,
    ) => request<SavingsBucket>(`/api/buckets/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    remove: (id: number) => request<void>(`/api/buckets/${id}`, { method: "DELETE" }),
  },
  recurring: {
    list: () => request<RecurringPayment[]>("/api/recurring"),
    missing: (month?: string) =>
      request<MissingRecurring>(`/api/recurring/missing${month ? `?month=${month}` : ""}`),
    create: (data: {
      type: TransactionType;
      amount: number;
      description?: string;
      categoryId?: number | null;
      bucketId?: number | null;
      dayOfMonth: number;
    }) => request<RecurringPayment>("/api/recurring", { method: "POST", body: JSON.stringify(data) }),
    update: (
      id: number,
      data: Partial<{
        type: TransactionType;
        amount: number;
        description: string;
        categoryId: number | null;
        bucketId: number | null;
        dayOfMonth: number;
        enabled: boolean;
      }>,
    ) =>
      request<RecurringPayment>(`/api/recurring/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    remove: (id: number) => request<void>(`/api/recurring/${id}`, { method: "DELETE" }),
  },
};
