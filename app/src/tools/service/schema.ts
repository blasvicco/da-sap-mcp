// Libs imports
import { z as zod } from "zod";

// App imports
import { SConnection } from "@/tools/connection/schema";

const connectionField = SConnection.optional().describe(
  "SAP connection credentials. Required when no prior sap_connect call was made " +
    "(n8n creates a new MCP session per tool call, so always include this).",
);

export const SServicesGet = zod.object({
  connection: connectionField,
});

export const SServiceMetadataGet = zod.object({
  serviceName: zod.string().describe("Name of the OData service"),
  connection: connectionField,
});
