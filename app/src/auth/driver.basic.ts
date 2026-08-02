// Libs imports
import { AxiosInstance } from "axios";

// App imports
import { ABaseDriver } from "@/auth/base.driver";

export interface BasicAuthConfig {
  client?: string;
  enableCSRF: boolean;
  password: string;
  username: string;
}

export class CDriverBasic extends ABaseDriver {
  private readonly config: BasicAuthConfig;
  private cookies: string[] = [];
  private csrfToken: string | null = null;

  constructor(config: BasicAuthConfig) {
    super();
    this.config = config;
  }

  applyToAxios(client: AxiosInstance): void {
    client.defaults.auth = {
      username: this.config.username,
      password: this.config.password,
    };

    if (this.config.client) {
      client.defaults.headers.common["sap-client"] = this.config.client;
    }

    client.interceptors.request.use((reqConfig) => {
      if (this.csrfToken && reqConfig.method !== "get") {
        reqConfig.headers["X-CSRF-Token"] = this.csrfToken;
      }
      if (this.cookies.length > 0) {
        reqConfig.headers["Cookie"] = this.cookies.join("; ");
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
    if (this.config.enableCSRF) {
      await this.__fetchCSRFToken(client);
    }
  }

  describe(): string {
    return `Basic auth (user: ${this.config.username}${this.config.client ? ", client: " + this.config.client : ""})`;
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
  }

  private async __fetchCSRFToken(client: AxiosInstance): Promise<void> {
    try {
      await client.get("", {
        headers: { "X-CSRF-Token": "Fetch", Accept: "application/xml" },
      });
    } catch {
      console.warn(
        "[CDriverBasic] CSRF token fetch did not return 2xx; continuing.",
      );
    }
  }
}
