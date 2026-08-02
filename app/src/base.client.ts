// Lib imports
import axios, { AxiosInstance, AxiosError } from "axios";
import https from "https";

// App imports
import { createAuthDriver, CDriverB1S } from "@/auth";
import { ABaseDriver } from "@/auth/base.driver";
import { ConnectionInfo, SAPODataConfig } from "@/odata.types";

/**
 * Base OData client.
 * Owns the axios instance, auth driver, and connection lifecycle.
 * Extended by each tool's client to add domain-specific operations.
 */
export abstract class ABaseClient {
  protected readonly authDriver: ABaseDriver;
  protected readonly config: SAPODataConfig;
  private connected: boolean = false;
  protected readonly httpClient: AxiosInstance;

  constructor(config: SAPODataConfig) {
    this.config = config;

    const httpsAgent = config.validateSSL
      ? undefined
      : new https.Agent({ rejectUnauthorized: false });

    this.httpClient = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      httpsAgent,
    });

    this.authDriver = createAuthDriver(config) as ABaseDriver;
    this.authDriver.applyToAxios(this.httpClient);
  }

  async connect(): Promise<void> {
    try {
      console.log(`Connecting to SAP OData service at ${this.config.baseUrl}`);
      console.log(`Auth driver: ${this.authDriver.describe()}`);

      await this.authDriver.connect(this.httpClient);

      let connectionVerified = false;

      if (this.authDriver instanceof CDriverB1S) {
        connectionVerified = true;
        console.log("Connection verified via B1S login.");
      } else {
        try {
          await this.httpClient.get(
            "../iwfnd/catalogservice;v=2/ServiceCollection",
            {
              headers: { Accept: "application/json" },
              timeout: 10000,
            },
          );
          connectionVerified = true;
          console.log("Connection verified via catalog service.");
        } catch {
          console.log("Catalog service not accessible, trying base URL probe.");
        }
      }

      if (!connectionVerified) {
        try {
          await this.httpClient.get("", {
            headers: { Accept: "application/xml" },
            timeout: 10000,
          });
          connectionVerified = true;
        } catch (error) {
          const status: number | undefined =
            error instanceof AxiosError ? error.response?.status : undefined;
          if (status === 404) {
            connectionVerified = true;
            console.log(
              "Connection verified — base URL returned 404 as expected.",
            );
          } else if (status === 401) {
            throw new Error(
              "Authentication failed — check your credentials / token.",
            );
          } else if (status === 403) {
            throw new Error("Access forbidden — check user authorizations.");
          } else {
            throw error;
          }
        }
      }

      if (!connectionVerified) {
        throw new Error("Could not verify SAP OData connection.");
      }

      this.connected = true;
      console.log("Successfully connected to SAP OData service.");
    } catch (error) {
      this.connected = false;
      this.authDriver.disconnect();
      throw new Error(
        `Failed to connect to SAP OData service: ${this._errorMessage(error)}`,
      );
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.authDriver.disconnect();
    console.log("Disconnected from SAP OData service.");
  }

  getConnectionInfo(): ConnectionInfo {
    return {
      connected: this.connected,
      baseUrl: this.config.baseUrl,
      authDriver: this.authDriver.describe(),
      client: this.config.client,
      timeout: this.config.timeout,
      enableCSRF: this.config.enableCSRF,
      hasCSRFToken: this.authDriver.hasCSRFToken(),
    };
  }

  async isConnected(): Promise<boolean> {
    if (!this.connected) return false;
    try {
      await this.httpClient.get("", {
        headers: { Accept: "application/xml" },
        timeout: 5000,
      });
      return true;
    } catch (error) {
      const status: number | undefined = axios.isAxiosError(error)
        ? error.response?.status
        : undefined;
      if (status === 404) return true;
      this.connected = false;
      return false;
    }
  }

  protected _ensureConnected(): void {
    if (!this.connected) {
      throw new Error(
        "Not connected to SAP OData service. Use sap_connect first.",
      );
    }
  }

  protected _errorMessage(error: unknown): string {
    if (
      error &&
      (
        error as {
          response?: { status: number; statusText: string; data?: unknown };
        }
      ).response
    ) {
      const errResponse = (
        error as {
          response: { status: number; statusText: string; data?: unknown };
        }
      ).response;
      let msg = `HTTP ${errResponse.status}: ${errResponse.statusText}`;
      if (errResponse.data) {
        const data = errResponse.data;
        if (typeof data === "object" && data !== null) {
          const sapError = (
            data as {
              error?: { code?: string; message?: { value?: string } };
            }
          ).error;
          if (sapError?.message?.value) {
            msg += ` — ${sapError.message.value}`;
          } else {
            msg += ` — ${JSON.stringify(data)}`;
          }
        } else if (typeof data === "string" && data.trim()) {
          msg += ` — ${data}`;
        }
      }
      return msg;
    }
    if (error && (error as { request?: unknown }).request) {
      return "No response received from server";
    }
    return (error as Error | undefined)?.message ?? "Unknown error";
  }
}
