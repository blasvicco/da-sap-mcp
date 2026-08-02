// App imports
import { SAPODataConfig } from "@/odata.types";
import { ABaseDriver } from "@/auth/base.driver";
import { BasicAuthConfig, CDriverBasic } from "@/auth/driver.basic";
import { CDriverToken, TokenAuthConfig } from "@/auth/driver.token";
import { CDriverB1S, B1SAuthConfig } from "@/auth/driver.b1s";

export { ABaseDriver } from "@/auth/base.driver";
export { CDriverBasic } from "@/auth/driver.basic";
export { CDriverToken } from "@/auth/driver.token";
export { CDriverB1S } from "@/auth/driver.b1s";

export type AuthDriverType = "basic" | "token" | "b1s";

export function createAuthDriver(config: SAPODataConfig): ABaseDriver {
  let driverType = config.authDriver ?? "basic";

  // Auto-infer B1S driver if companyDB is present and SAP_AUTH_DRIVER is not set to basic/token in environment
  if (
    config.companyDB &&
    (!process.env.SAP_AUTH_DRIVER || process.env.SAP_AUTH_DRIVER === "b1s")
  ) {
    driverType = "b1s";
  }

  switch (driverType) {
    case "basic":
      return createBasicDriver(config);
    case "token":
      return createTokenDriver(config);
    case "b1s":
      return createB1SDriver(config);
    default:
      console.warn(
        `[auth] Unknown SAP_AUTH_DRIVER value "${driverType}". Falling back to "basic".`,
      );
      return createBasicDriver(config);
  }
}

function createBasicDriver(config: SAPODataConfig): CDriverBasic {
  if (!config.username || !config.password) {
    throw new Error(
      'Auth driver "basic" requires both "username" and "password" in the connection config.',
    );
  }
  const driverConfig: BasicAuthConfig = {
    username: config.username,
    password: config.password,
    client: config.client,
    enableCSRF: config.enableCSRF,
  };
  return new CDriverBasic(driverConfig);
}

function createTokenDriver(config: SAPODataConfig): CDriverToken {
  if (!config.token) {
    throw new Error(
      'Auth driver "token" requires a "token" field in the connection config. ' +
        "Pass it via the sap_connect tool (e.g. from an n8n webhook payload).",
    );
  }
  const driverConfig: TokenAuthConfig = {
    token: config.token,
    client: config.client,
    tokenType: config.tokenType,
    enableCSRF: config.enableCSRF,
  };
  return new CDriverToken(driverConfig);
}

function createB1SDriver(config: SAPODataConfig): CDriverB1S {
  if (!config.username || !config.password || !config.companyDB) {
    throw new Error(
      'Auth driver "b1s" requires "username", "password", and "companyDB" in the connection config.',
    );
  }
  const driverConfig: B1SAuthConfig = {
    companyDB: config.companyDB,
    username: config.username,
    password: config.password,
  };
  return new CDriverB1S(driverConfig);
}
