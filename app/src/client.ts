// App imports
import { ABaseClient } from "@/base.client";
import { SAPODataConfig } from "@/odata.types";
import { CEntity } from "@/tools/entity/client";
import { CQuery } from "@/tools/query/client";
import { CService } from "@/tools/service/client";

type MixinConstructor = new (config: SAPODataConfig) => ABaseClient;

function mixins<
  A extends MixinConstructor,
  B extends MixinConstructor,
  C extends MixinConstructor,
  D extends MixinConstructor,
>(Base: A, ...sources: [B, C, D]) {
  for (const Source of sources) {
    for (const key of Object.getOwnPropertyNames(Source.prototype)) {
      if (key === "constructor") continue;
      Object.defineProperty(
        Base.prototype,
        key,
        Object.getOwnPropertyDescriptor(Source.prototype, key)!,
      );
    }
  }
  return Base as unknown as new (
    config: SAPODataConfig,
  ) => InstanceType<A> & InstanceType<B> & InstanceType<C> & InstanceType<D>;
}

/**
 * Unified SAP OData client.
 * Composed from ABaseClient + one client per tool group via mixins,
 * so all operations share a single axios instance, auth driver, and CSRF token.
 */
export const CClient = mixins(
  ABaseClient as unknown as MixinConstructor,
  CService as unknown as MixinConstructor,
  CEntity as unknown as MixinConstructor,
  CQuery as unknown as MixinConstructor,
) as unknown as new (
  config: SAPODataConfig,
) => ABaseClient & CService & CEntity & CQuery;

export type CClient = InstanceType<typeof CClient>;
