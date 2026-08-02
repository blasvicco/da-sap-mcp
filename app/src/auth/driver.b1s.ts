// Libs imports
import { AxiosInstance, AxiosError } from "axios";

// App imports
import { ABaseDriver } from "@/auth/base.driver";

export interface B1SAuthConfig {
  companyDB: string;
  password: string;
  username: string;
}

export class CDriverB1S extends ABaseDriver {
  private readonly config: B1SAuthConfig;
  private cookies: string[] = [];
  private sessionId: string | null = null;
  private httpClient: AxiosInstance | null = null;

  constructor(config: B1SAuthConfig) {
    super();
    this.config = config;
  }

  applyToAxios(client: AxiosInstance): void {
    this.httpClient = client;

    client.interceptors.request.use((reqConfig) => {
      if (this.cookies.length > 0) {
        reqConfig.headers["Cookie"] = this.cookies.join("; ");
      }
      return reqConfig;
    });

    client.interceptors.response.use(
      (response) => {
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
      console.log(
        `[CDriverB1S] Logging in to B1S database: ${this.config.companyDB}`,
      );
      const response = await client.post("Login", {
        CompanyDB: this.config.companyDB,
        UserName: this.config.username,
        Password: this.config.password,
      });

      const sessionId = response.data?.SessionId;
      if (!sessionId) {
        throw new Error(
          "B1S Login succeeded, but no SessionId was returned in response body.",
        );
      }

      this.sessionId = sessionId;
      console.log("[CDriverB1S] Login successful, session established.");

      const setCookies = response.headers["set-cookie"];
      if (setCookies) {
        this.cookies = setCookies.map((cookie: string) => cookie.split(";")[0]);
      } else {
        // Fallback: manually construct Cookie
        this.cookies = [`B1SESSION=${sessionId}`];
      }
    } catch (error) {
      const status =
        error instanceof AxiosError ? error.response?.status : undefined;
      const responseData =
        error instanceof AxiosError ? error.response?.data : undefined;

      let errMsg = "Unknown error";
      if (responseData && typeof responseData === "object") {
        errMsg = JSON.stringify(responseData);
      } else if (error instanceof Error) {
        errMsg = error.message;
      }

      throw new Error(
        `Failed to authenticate with SAP B1S (HTTP ${status ?? "unknown"}): ${errMsg}`,
      );
    }
  }

  describe(): string {
    return `B1S session (DB: ${this.config.companyDB}, user: ${this.config.username})`;
  }

  disconnect(): void {
    if (this.sessionId && this.httpClient) {
      const client = this.httpClient;
      console.log("[CDriverB1S] Logging out session...");
      client.post("Logout").catch((e) => {
        console.warn("[CDriverB1S] Async logout call failed:", e.message);
      });
    }
    this.sessionId = null;
    this.cookies = [];
  }

  hasCSRFToken(): boolean {
    // B1S uses cookie session authentication, not CSRF tokens
    return false;
  }

  onUnauthorized(): void {
    console.warn("[CDriverB1S] B1S session has been invalidated or expired.");
    this.sessionId = null;
    this.cookies = [];
  }
}
