// Libs imports
import { z as zod } from "zod";

// App imports
import { ABaseHandler, ClientRef } from "@/base.handler";
import { CClient } from "@/client";
import { SConnection } from "@/tools/connection/schema";

export class HConnection extends ABaseHandler {
  constructor(clientRef: ClientRef) {
    super(clientRef);
  }

  async connect(args: zod.input<typeof SConnection>) {
    if (this.clientRef.client) {
      await this.clientRef.client.disconnect();
      this.clientRef.client = null;
    }

    try {
      const config = SConnection.parse(args);
      const newClient = new CClient(config);
      await newClient.connect();

      this.clientRef.client = newClient;

      const info = newClient.getConnectionInfo();

      return {
        content: [
          {
            type: "text",
            text:
              `Successfully connected to SAP OData service:\n` +
              `- Base URL: ${info.baseUrl}\n` +
              `- Auth: ${info.authDriver}\n` +
              `- Client: ${info.client ?? "Not specified"}\n` +
              `- CSRF Enabled: ${info.enableCSRF}\n\n` +
              `Note: The base URL may return 404 when accessed directly. ` +
              `This is normal for SAP OData services — you need to specify a service name. ` +
              `Use 'sap_services_get' to discover available services.`,
          },
        ],
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);

      if (msg.includes("404")) {
        throw new Error(
          `Connection test returned 404. This might be expected for SAP OData base URLs. Possible causes:\n` +
            `1. The base URL is incomplete (needs a service name)\n` +
            `2. OData services are not activated at this path\n` +
            `3. A different URL structure is needed\n\n` +
            `Try running the discovery tool to find the correct URL: npm run discover:services`,
        );
      }

      throw new Error(`Failed to connect to SAP OData service: ${msg}`);
    }
  }

  async disconnect() {
    if (!this.clientRef.client) {
      return {
        content: [
          {
            type: "text",
            text: "No active SAP OData connection to disconnect",
          },
        ],
      };
    }

    try {
      await this.clientRef.client.disconnect();
      this.clientRef.client = null;
      return {
        content: [
          {
            type: "text",
            text: "Successfully disconnected from SAP OData service",
          },
        ],
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.clientRef.client = null;
      return {
        content: [
          {
            type: "text",
            text: `Warning during disconnect: ${msg}\nConnection has been cleared.`,
          },
        ],
      };
    }
  }

  async getStatus() {
    if (!this.clientRef.client) {
      return {
        content: [
          {
            type: "text",
            text: "No SAP OData connection established. Use sap_connect to connect to an SAP OData service.",
          },
        ],
      };
    }

    try {
      const isConnected = await this.clientRef.client.isConnected();
      const info = this.clientRef.client.getConnectionInfo();

      let statusText = `SAP OData Connection Status:\n\n`;
      statusText += `Status: ${isConnected ? "✅ Connected" : "❌ Disconnected"}\n`;
      statusText += `Base URL: ${info.baseUrl}\n`;
      statusText += `Auth: ${info.authDriver}\n`;
      statusText += `Client: ${info.client ?? "Not specified"}\n`;
      statusText += `Timeout: ${info.timeout}ms\n`;
      statusText += `CSRF Enabled: ${info.enableCSRF}\n`;
      statusText += `CSRF Token: ${info.hasCSRFToken ? "Available" : "Not available"}\n`;

      if (!isConnected) {
        statusText += `\nNote: Connection appears to be lost. Use sap_connect to reconnect.`;
      }

      return { content: [{ type: "text", text: statusText }] };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error checking connection status: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }
}
