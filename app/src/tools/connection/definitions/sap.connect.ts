// Libs imports
import { Tool } from "@modelcontextprotocol/sdk/types.js";

export const sap_connect: Tool = {
  name: "sap_connect",
  description:
    "Connect to SAP OData service. " +
    "Supports two auth modes controlled by the SAP_AUTH_DRIVER environment variable: " +
    '"basic" (default) uses username + password; ' +
    '"token" uses a pre-existing bearer / session token (e.g. supplied by an n8n webhook).',
  inputSchema: {
    type: "object",
    properties: {
      baseUrl: {
        type: "string",
        description:
          "SAP OData service base URL (e.g., https://sap-host:8000/sap/opu/odata/sap/)",
      },
      username: {
        type: "string",
        description:
          "SAP username. Required when SAP_AUTH_DRIVER=basic (default).",
      },
      password: {
        type: "string",
        description:
          "SAP password. Required when SAP_AUTH_DRIVER=basic (default).",
      },
      token: {
        type: "string",
        description:
          "Pre-existing SAP session / bearer token. " +
          "Required when SAP_AUTH_DRIVER=token. " +
          "Typically sourced from an n8n webhook request payload.",
      },
      tokenType: {
        type: "string",
        description:
          'Token scheme prefix used in the Authorization header. Defaults to "Bearer". ' +
          'Change to "SAP" or another value if your system requires a different prefix.',
        default: "Bearer",
      },
      client: {
        type: "string",
        description:
          "SAP client number (optional). Sent as the sap-client header.",
      },
      timeout: {
        type: "number",
        description: "Request timeout in milliseconds.",
        default: 30000,
      },
      validateSSL: {
        type: "boolean",
        description: "Validate SSL certificates.",
        default: true,
      },
      enableCSRF: {
        type: "boolean",
        description: "Enable CSRF token handling for mutating requests.",
        default: true,
      },
    },
    required: ["baseUrl"],
  },
};
