// Libs imports
import { z as zod } from "zod";

// SAP OData Connection Configuration Schema
export const SConnection = zod.object({
  baseUrl: zod
    .string()
    .min(1, "Base URL is required")
    .default(() => process.env.SAP_BASE_URL ?? "")
    .refine((val) => val.length > 0, {
      message:
        "Base URL is required (either via parameter or SAP_BASE_URL env var)",
    })
    .describe(
      "SAP OData service base URL (e.g., https://sap-host/sap/opu/odata/sap/)",
    ),
  username: zod
    .string()
    .optional()
    .default(() => process.env.SAP_USERNAME ?? "")
    .transform((val) => val || undefined)
    .describe("SAP username (required for basic auth driver)"),
  password: zod
    .string()
    .optional()
    .default(() => process.env.SAP_PASSWORD ?? "")
    .transform((val) => val || undefined)
    .describe("SAP password (required for basic auth driver)"),
  token: zod
    .string()
    .optional()
    .default(() => process.env.SAP_TOKEN ?? "")
    .transform((val) => val || undefined)
    .describe(
      "Pre-existing SAP session / bearer token (required for token auth driver). " +
        "Typically supplied by an n8n webhook payload.",
    ),
  tokenType: zod
    .string()
    .optional()
    .default(() => process.env.SAP_TOKEN_TYPE ?? "Bearer")
    .describe(
      'Token scheme prefix. Defaults to "Bearer". ' +
        'Change to "SAP" or another value if your system requires a different Authorization header prefix.',
    ),
  client: zod
    .string()
    .optional()
    .default(() => process.env.SAP_CLIENT ?? "")
    .transform((val) => val || undefined)
    .describe("SAP client number (if required)"),
  timeout: zod
    .number()
    .default(() => {
      const envTimeout = process.env.SAP_TIMEOUT;
      return envTimeout ? parseInt(envTimeout, 10) : 30000;
    })
    .describe("Request timeout in milliseconds"),
  validateSSL: zod
    .boolean()
    .default(() => {
      const envSSL = process.env.SAP_VALIDATE_SSL;
      return envSSL !== undefined ? envSSL === "true" : true;
    })
    .describe("Validate SSL certificates"),
  enableCSRF: zod
    .boolean()
    .default(() => {
      const envCSRF = process.env.SAP_ENABLE_CSRF;
      return envCSRF !== undefined ? envCSRF === "true" : true;
    })
    .describe("Enable CSRF token handling"),
  authDriver: zod
    .enum(["basic", "token", "b1s"])
    .optional()
    .default(() => process.env.SAP_AUTH_DRIVER ?? "basic")
    .describe(
      "SAP authentication driver type. Defaults to 'basic' (or 'b1s' if companyDB is supplied)",
    ),
  companyDB: zod
    .string()
    .optional()
    .default(() => process.env.SAP_B1S_COMPANY_DB ?? "")
    .transform((val) => val || undefined)
    .describe(
      "SAP Business One company database (required for B1S auth driver)",
    ),
});
