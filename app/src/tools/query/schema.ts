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
    "Entity set name within the service. For SAP B1S: MUST be empty string '' — never repeat the serviceName here " +
      "(doing so builds a broken URL like 'BusinessPartners/BusinessPartners' → HTTP 400). " +
      "For standard OData: the entity set (e.g. 'EmployeeSet').",
  );

export const SQueryCallFunction = zod.object({
  functionName: zod.string().describe("Name of the function to call"),
  parameters: zod
    .record(zod.unknown())
    .optional()
    .describe("Function parameters"),
  serviceName: serviceNameField,
  connection: connectionField,
});

export const SQueryEntitySet = zod.object({
  entitySet: entitySetField,
  expand: zod
    .array(zod.string())
    .nullish()
    .describe("Navigation properties to expand"),
  filter: zod
    .string()
    .nullish()
    .describe(
      "OData $filter expression. Comparison: eq, ne, gt, ge, lt, le. Logical: and, or, not " +
        "('not' requires SAP B1 9.1 patch level 01+). " +
        "String functions: substringof('term',Field) (contains), startswith(Field,'term'), endswith(Field,'term'). " +
        "'not' wraps an expression rather than being its own function, e.g. not startswith(CardName,'NO USAR'). " +
        "Do NOT use tolower()/toupper() — this SAP instance returns HTTP 400 for those, and string comparisons " +
        "in $filter are already case-insensitive by default, so they're unnecessary anyway.",
    ),
  orderby: zod.string().nullish().describe("OData orderby expression"),
  select: zod.array(zod.string()).nullish().describe("Fields to select"),
  serviceName: serviceNameField,
  skip: zod.number().nullish().describe("Number of records to skip"),
  top: zod.number().nullish().describe("Number of records to return"),
  connection: connectionField,
});
