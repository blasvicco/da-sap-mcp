// Libs imports
import { AxiosInstance, AxiosError } from "axios";

// App imports
import { ABaseDriver } from "@/auth/base.driver";

export interface TokenAuthConfig {
  client?: string;
  enableCSRF: boolean;
  token: string;
  tokenType?: string;
}

export class CDriverToken extends ABaseDriver {
  private readonly config: TokenAuthConfig;
  private cookies: string[] = [];
  private csrfToken: string | null = null;

  constructor(config: TokenAuthConfig) {
    super();
    this.config = config;
  }

  applyToAxios(client: AxiosInstance): void {
    const scheme = this.config.tokenType ?? "Bearer";
    if (scheme.toLowerCase() !== "cookie") {
      client.defaults.headers.common["Authorization"] =
        `${scheme} ${this.config.token}`;
    }

    if (this.config.client) {
      client.defaults.headers.common["sap-client"] = this.config.client;
    }

    client.interceptors.request.use((reqConfig) => {
      if (this.csrfToken && reqConfig.method !== "get") {
        reqConfig.headers["X-CSRF-Token"] = this.csrfToken;
      }
      const allCookies = [...this.cookies];
      if (scheme.toLowerCase() === "cookie") {
        allCookies.unshift(this.config.token);
      }
      if (allCookies.length > 0) {
        reqConfig.headers["Cookie"] = allCookies.join("; ");
      }
      return reqConfig;
    });

    client.interceptors.response.use(
      (response) => {
        const token = response.headers["x-csrf-token"];
        if (token && token !== "Required") {
          this.csrfToken = token;
        }
        const setCookies = response.headers["set-cookie"];
        if (setCookies) {
          this.cookies = setCookies.map(
            (cookie: string) => cookie.split(";")[0],
          );
        }
        return response;
      },
      (error) => {
        const response = error.response;
        if (response) {
          const token = response.headers["x-csrf-token"];
          if (token && token !== "Required") {
            this.csrfToken = token;
          }
          const setCookies = response.headers["set-cookie"];
          if (setCookies) {
            this.cookies = setCookies.map(
              (cookie: string) => cookie.split(";")[0],
            );
          }
        }

        if (error.response?.status === 401) {
          this.onUnauthorized();
        }
        return Promise.reject(error);
      },
    );
  }

  async connect(client: AxiosInstance): Promise<void> {
    try {
      await client.get("", {
        headers: {
          Accept: "application/xml",
          ...(this.config.enableCSRF ? { "X-CSRF-Token": "Fetch" } : {}),
        },
        timeout: 10000,
      });
    } catch (error) {
      const status: number | undefined =
        error instanceof AxiosError ? error.response?.status : undefined;
      if (status === 404) {
        console.log(
          "[CDriverToken] Token validated (server returned 404 on base URL, which is expected).",
        );
        return;
      }
      if (status === 401) {
        throw new Error(
          "Token rejected by SAP server (401 Unauthorized). Please supply a valid session token.",
        );
      }
      if (status === 403) {
        throw new Error(
          "Token accepted but access is forbidden (403). Check user authorizations.",
        );
      }
      throw error;
    }
  }

  describe(): string {
    const scheme = this.config.tokenType ?? "Bearer";
    const tokenPreview =
      this.config.token.length > 8
        ? this.config.token.slice(0, 4) + "…" + this.config.token.slice(-4)
        : "****";
    return `${scheme} token (${tokenPreview}${this.config.client ? ", client: " + this.config.client : ""})`;
  }

  disconnect(): void {
    this.csrfToken = null;
    this.cookies = [];
  }

  hasCSRFToken(): boolean {
    return !!this.csrfToken;
  }

  onUnauthorized(): void {
    this.csrfToken = null;
    this.cookies = [];
    console.warn(
      "[CDriverToken] Received 401 — token may have expired. Call sap_connect with a fresh token.",
    );
  }
}
