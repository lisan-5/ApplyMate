import type { Database } from "./types";

export interface User {
  id: string;
  email: string;
}

export interface Session {
  access_token: string;
  user: User;
}

type AuthChangeEvent = "SIGNED_IN" | "SIGNED_OUT" | "TOKEN_REFRESHED";
type AuthCallback = (event: AuthChangeEvent, session: Session | null) => void;
const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8002";
const TOKEN_KEY = "applymate.session_token";
const listeners = new Set<AuthCallback>();

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function apiFetch<T = any>(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers || {});
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Content-Type") && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...init, headers });
  } catch {
    return {
      data: null,
      error: {
        message: `Backend unavailable at ${API_URL}. Start it with: python backend/server.py`,
      },
    };
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const rawError = payload.error || payload;
    const error =
      typeof rawError === "string"
        ? { message: rawError }
        : rawError?.message
          ? rawError
          : { message: "Request failed" };
    return { data: null, error };
  }
  return { data: payload.data, error: payload.error ?? null } as {
    data: T;
    error: any;
  };
}

async function getSessionInternal(): Promise<Session | null> {
  const token = getToken();
  if (!token) return null;
  const { data } = await apiFetch<{ session: Session | null }>("/api/auth/session", {
    method: "GET",
  });
  if (!data?.session) {
    setToken(null);
    return null;
  }
  return data.session;
}

function notify(event: AuthChangeEvent, session: Session | null) {
  listeners.forEach((listener) => listener(event, session));
}

class QueryBuilder<T = any> implements PromiseLike<{ data: T; error: any }> {
  private payload: any;

  constructor(table: string) {
    this.payload = {
      table,
      operation: "select",
      select: "*",
      filters: [] as Array<{ column: string; op: string; value: any }>,
      order: [] as Array<{ column: string; ascending: boolean }>,
    };
  }

  select(columns = "*") {
    this.payload.operation = "select";
    this.payload.select = columns;
    return this;
  }

  insert(values: any) {
    this.payload.operation = "insert";
    this.payload.values = values;
    return this;
  }

  update(values: any) {
    this.payload.operation = "update";
    this.payload.values = values;
    return this;
  }

  delete() {
    this.payload.operation = "delete";
    return this;
  }

  upsert(values: any, options?: { onConflict?: string }) {
    this.payload.operation = "upsert";
    this.payload.values = values;
    this.payload.onConflict = options?.onConflict;
    return this;
  }

  eq(column: string, value: any) {
    this.payload.filters.push({ column, op: "eq", value });
    return this;
  }

  in(column: string, value: any[]) {
    this.payload.filters.push({ column, op: "in", value });
    return this;
  }

  is(column: string, value: any) {
    this.payload.filters.push({ column, op: "is", value });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.payload.order.push({ column, ascending: options?.ascending !== false });
    return this;
  }

  limit(limit: number) {
    this.payload.limit = limit;
    return this;
  }

  single() {
    this.payload.single = true;
    return this.exec();
  }

  maybeSingle() {
    this.payload.maybeSingle = true;
    return this.exec();
  }

  async exec() {
    return apiFetch("/api/query", {
      method: "POST",
      body: JSON.stringify(this.payload),
    });
  }

  then<TResult1 = { data: T; error: any }, TResult2 = never>(
    onfulfilled?: ((value: { data: T; error: any }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return this.exec().then(onfulfilled, onrejected);
  }
}

export const api = {
  auth: {
    async signUp({ email, password }: { email: string; password: string }) {
      const result = await apiFetch<{ session: Session; user: User }>("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      if (result.data?.session?.access_token) {
        setToken(result.data.session.access_token);
        notify("SIGNED_IN", result.data.session);
      }
      return result;
    },
    async signInWithPassword({ email, password }: { email: string; password: string }) {
      const result = await apiFetch<{ session: Session; user: User }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      if (result.data?.session?.access_token) {
        setToken(result.data.session.access_token);
        notify("SIGNED_IN", result.data.session);
      }
      return result;
    },
    async signOut() {
      setToken(null);
      notify("SIGNED_OUT", null);
      return { error: null };
    },
    async getSession() {
      const session = await getSessionInternal();
      return { data: { session } };
    },
    async updateUser({ password }: { password: string }) {
      return apiFetch("/api/auth/password", {
        method: "PATCH",
        body: JSON.stringify({ password }),
      });
    },
    onAuthStateChange(callback: AuthCallback) {
      listeners.add(callback);
      return {
        data: {
          subscription: {
            unsubscribe() {
              listeners.delete(callback);
            },
          },
        },
      };
    },
  },
  from<T extends keyof Database["public"]["Tables"] & string>(table: T) {
    return new QueryBuilder(table);
  },
  async rpc(name: string, body: Record<string, any> = {}) {
    return apiFetch(`/api/rpc/${name}`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  functions: {
    async invoke(name: string, options?: { body?: any }) {
      return apiFetch(`/api/functions/${name}`, {
        method: "POST",
        body: JSON.stringify(options?.body ?? {}),
      });
    },
  },
  storage: {
    from(bucket: string) {
      return {
        async upload(path: string, file: File) {
          const form = new FormData();
          form.append("file", file);
          return apiFetch(`/api/storage/upload?bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(path)}`, {
            method: "POST",
            body: form,
          });
        },
      };
    },
  },
  channel(name: string) {
    return {
      on() {
        return this;
      },
      subscribe() {
        return { name };
      },
    };
  },
  removeChannel() {},
};

