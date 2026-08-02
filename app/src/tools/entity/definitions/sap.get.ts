// Libs imports
import { Tool } from "@modelcontextprotocol/sdk/types.js";

export const sap_entity_get: Tool = {
  name: "sap_entity_get",
  description:
    "Get the full details of a single entity by its primary key. " +
    "USE THIS TOOL — not sap_query_entity_set — whenever the user asks for the details of a specific record and you already know its key (e.g. DocEntry, ItemCode, CardCode). " +
    "This is a direct GET request that returns the complete entity, including all navigation properties you expand. " +
    "For SAP B1S (Business One Service Layer): put the entity name in serviceName (e.g. 'PurchaseRequests', 'Items') and set entitySet to empty string ''. " +
    "Pass the primary key(s) in keyValues (e.g. { \"DocEntry\": 30526 } or { \"ItemCode\": \"A001\" }). " +
    "To include line items or sub-collections, add them to expand (e.g. [\"DocumentLines\"]).",
  inputSchema: {
    type: "object",
    properties: {
      serviceName: {
        type: "string",
        description:
          "OData service name. For SAP B1S: the entity name (e.g. 'PurchaseRequests', 'Items'). For standard OData: the service path segment.",
      },
      entitySet: {
        type: "string",
        description:
          "Entity set within the service. For SAP B1S: MUST be empty string '' — never repeat the serviceName here. For standard OData: the entity set name.",
      },
      keyValues: {
        type: "object",
        description:
          "Primary key(s) of the entity to retrieve (e.g. { \"DocEntry\": 30526 } or { \"ItemCode\": \"A001\" })",
        additionalProperties: true,
      },
      expand: {
        type: "array",
        items: { type: "string" },
        description:
          "Navigation properties to expand (e.g. [\"DocumentLines\"] to include line items)",
      },
      connection: {
        type: "object",
        description:
          "SAP connection credentials. Required when no prior sap_connect call was made (n8n creates a new MCP session per tool call, so always include this).",
        properties: {
          authDriver: { type: "string" },
          baseUrl: { type: "string" },
          username: { type: "string" },
          password: { type: "string" },
          companyDB: { type: "string" },
        },
      },
    },
    required: ["serviceName", "entitySet", "keyValues"],
  },
};
