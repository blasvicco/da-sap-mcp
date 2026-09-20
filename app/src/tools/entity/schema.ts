// Libs imports
import { z as zod } from "zod";

// App imports
import { SConnection } from "@/tools/connection/schema";

const connectionField = SConnection.optional().describe(
  "SAP connection credentials. Required when no prior sap_connect call was made " +
    "(n8n creates a new MCP session per tool call, so always include this).",
);

const serviceNameField = zod
  .string()
  .describe(
    "OData service name. For SAP B1S (flat URL structure): use the entity name here (e.g. 'PurchaseRequests') and leave entitySet as empty string ''. " +
      "For standard OData: the service path segment (e.g. 'ZHR_SERVICE_SRV').",
  );

const entitySetField = zod
  .string()
  .describe(
    "Entity set name within the service. For SAP B1S: leave as empty string '' (the entity name goes in serviceName). " +
      "For standard OData: the entity set (e.g. 'EmployeeSet').",
  );

export const SEntityCreate = zod.object({
  data: zod.record(zod.unknown()).describe("Entity data to create"),
  entitySet: entitySetField,
  serviceName: serviceNameField,
  connection: connectionField,
});

export const SEntityDelete = zod.object({
  entitySet: entitySetField,
  keyValues: zod
    .record(zod.unknown())
    .describe("Key-value pairs for entity keys"),
  serviceName: serviceNameField,
  connection: connectionField,
});

export const SEntityGet = zod.object({
  entitySet: entitySetField,
  keyValues: zod
    .record(zod.unknown())
    .describe("Key-value pairs for entity keys"),
  serviceName: serviceNameField,
  expand: zod
    .array(zod.string())
    .optional()
    .describe("Navigation properties to expand (e.g. [\"BusinessPartner\"])"),
  connection: connectionField,
});

export const SEntityUpdate = zod.object({
  data: zod.record(zod.unknown()).describe("Entity data to update"),
  entitySet: entitySetField,
  keyValues: zod
    .record(zod.unknown())
    .describe("Key-value pairs for entity keys"),
  serviceName: serviceNameField,
  connection: connectionField,
});
