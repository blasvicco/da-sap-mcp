// App imports
import { CClient } from "@/client";
import { SConnection } from "@/tools/connection/schema";

/** Mutable container shared across all handler groups. */
export interface ClientRef {
  client: CClient | null;
  metadataCache: Map<string, string[]>;
}

/**
 * Base handler.
 * Holds the shared ClientRef and provides the connected client accessor.
 * Extended by each tool's handler.
 */
export abstract class ABaseHandler {
  protected readonly clientRef: ClientRef;

  constructor(clientRef: ClientRef) {
    this.clientRef = clientRef;
  }

  /**
   * Ensures a live SAP connection exists.
   * If a connection is already live it is reused.
   * If the session is fresh (n8n creates one MCP session per tool call) and
   * `connectionArgs` are provided, the client auto-connects without requiring
   * a prior `sap_connect` call.
   */
  protected async _ensureConnected(connectionArgs?: unknown): Promise<void> {
    if (this.clientRef.client) {
      const ok = await this.clientRef.client.isConnected().catch(() => false);
      if (ok) return;
    }
    if (!connectionArgs) {
      throw new Error(
        "Not connected to SAP OData service. Either call sap_connect first, " +
          "or pass connection credentials in the 'connection' field of this tool.",
      );
    }
    const config = SConnection.parse(connectionArgs);
    const newClient = new CClient(config);
    await newClient.connect();
    this.clientRef.client = newClient;
  }

  /** @deprecated Use _ensureConnected() instead. */
  protected async _assertConnected(): Promise<void> {
    await this._ensureConnected();
  }

  protected get _client(): CClient {
    if (!this.clientRef.client) {
      throw new Error(
        "Not connected to SAP OData service. Use sap_connect first.",
      );
    }
    return this.clientRef.client;
  }
}
