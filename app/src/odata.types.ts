// Lib imports
import { z as zod } from "zod";

// App imports
import { SConnection } from "@/tools/connection/schema";

export type SAPODataConfig = zod.infer<typeof SConnection>;

export interface ODataQueryOptions {
  expand?: string[];
  filter?: string;
  orderby?: string;
  select?: string[];
  skip?: number;
  top?: number;
}

export interface ODataService {
  name: string;
  title: string;
  url?: string;
  version?: string;
}

export interface ODataProperty {
  name: string;
  nullable: boolean;
  type: string;
}

export interface ODataEntity {
  name: string;
  properties: ODataProperty[];
}

export interface ODataFunction {
  name: string;
  returnType?: string;
}

export interface ODataMetadata {
  entities: ODataEntity[];
  functions: ODataFunction[];
  raw?: unknown;
  parseError?: string;
}

export interface ODataServiceList {
  catalogUrl?: string;
  message?: string;
  raw?: unknown;
  services: ODataService[];
  source?: "gateway_catalog" | "common_services_test" | "none_found" | string;
}

export interface ConnectionInfo {
  authDriver: string;
  baseUrl: string;
  client?: string;
  connected: boolean;
  enableCSRF: boolean;
  hasCSRFToken: boolean;
  timeout: number;
}
