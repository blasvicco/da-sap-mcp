// Libs imports
import { Tool } from "@modelcontextprotocol/sdk/types.js";

export const sap_query_entity_set: Tool = {
  name: "sap_query_entity_set",
  description:
    "Query an OData entity set with filtering, sorting, and pagination. " +
    "CRITICAL — if you are unsure whether an entity name exists, call sap_services_get FIRST to list all valid entity set names before querying. " +
    "Guessing an entity name that does not exist returns HTTP 400 'Unrecognized resource path'. " +
    "CRITICAL — always include 'select' to limit the response size. " +
    "SAP B1 item records embed large nested collections that will exceed token limits if you omit select. " +
    "For Items ALWAYS use: select=[\"ItemCode\",\"ItemName\",\"ItemsGroupCode\"] (add other fields as needed) and top≤20. " +
    "CRITICAL — use valid OData filter syntax. Do NOT write 'Field contains value' (invalid). " +
    "Comparison operators: eq, ne, gt, ge, lt, le. Logical operators: and, or, not. " +
    "NOTE: 'not' requires SAP B1 9.1 patch level 01+ — it may fail with HTTP 400 on older instances. " +
    "String functions: substringof('term',Field) (contains), startswith(Field,'term'), endswith(Field,'term'). " +
    "OR across terms: substringof('a',Field) or substringof('b',Field). " +
    "Combined: (substringof('a',Field) or substringof('b',Field)) and OtherField eq value. " +
    "Negation wraps an expression, it is not its own function — do NOT invent syntax like notcontains(...). " +
    "Example: not startswith(CardName,'NO USAR').",
  inputSchema: {
    type: "object",
    properties: {
      serviceName: {
        type: "string",
        description:
          "OData service name. " +
          "For SAP B1S (Business One Service Layer — flat URL structure): put the entity name here (e.g. 'Items', 'PurchaseRequests') and set entitySet to empty string ''. " +
          "For standard OData services: use the service path segment (e.g. 'ZHR_SERVICE_SRV').",
      },
      entitySet: {
        type: "string",
        description:
          "Entity set within the service. " +
          "For SAP B1S: MUST be empty string '' — never repeat the serviceName here. " +
          "Setting entitySet=serviceName builds a broken URL like 'BusinessPartners/BusinessPartners' (HTTP 400). " +
          "For standard OData: the entity set name (e.g. 'EmployeeSet').",
      },
      select: {
        type: "array",
        items: { type: "string" },
        description:
          "Fields to select — ALWAYS include this to prevent token bloat. For Items use [\"ItemCode\",\"ItemName\",\"ForeignName\"].",
      },
      filter: {
        type: "string",
        description:
          "OData $filter expression — must use valid OData syntax. " +
          "NEVER write 'Field contains value' (not valid OData). " +
          "Comparison: eq, ne, gt, ge, lt, le. Logical: and, or, not " +
          "(NOTE: 'not' requires SAP B1 9.1 patch level 01+ — may fail with HTTP 400 on older instances). " +
          "String functions: substringof('term',Field) for substring matching (contains), " +
          "startswith(Field,'term'), endswith(Field,'term'). " +
          "For multiple terms on one field use OR: substringof('termA',Field) or substringof('termB',Field). " +
          "For combined conditions use AND: (substringof('termA',Field) or substringof('termB',Field)) and OtherField eq value. " +
          "'not' wraps an existing expression rather than being its own function — do NOT invent syntax like notcontains(...). " +
          "Examples: " +
          "single term → substringof('transporte',ItemName); " +
          "two terms → substringof('transporte',ItemName) or substringof('flete',ItemName); " +
          "with group filter → (substringof('transporte',ItemName) or substringof('flete',ItemName)) and ItemsGroupCode eq 150; " +
          "name doesn't start with X → not startswith(CardName,'NO USAR'); " +
          "group filter with exclusion → GroupCode eq 100 and not startswith(CardName,'NO USAR').",
      },
      orderby: { type: "string", description: "OData orderby expression" },
      top: {
        type: "number",
        description:
          "Number of records to return. Use the quantity requested by the user. " +
          "Default to 5 if unspecified. Max 20 to prevent token bloat.",
      },
      skip: { type: "number", description: "Number of records to skip" },
      expand: {
        type: "array",
        items: { type: "string" },
        description: "Navigation properties to expand",
      },
    },
    required: ["serviceName", "entitySet"],
  },
};
