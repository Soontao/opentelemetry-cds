/* eslint-disable max-len */

import { SemanticAttributes } from "@opentelemetry/semantic-conventions";
import { memorized, Request } from "cds-internal-tool";
import Module from "module";
import { CDSSemanticAttributes } from "../attributes";

/**
 * get a read able entity for query
 * 
 * @param query 
 * @returns 
 */
export function getEntityNameFromQuery(query: any | Array<any>): string | undefined {
  if (query instanceof Array) {
    return `[MULTI ENTITIES]`;
  }
  if (typeof query === "string") {
    return query;
  }

  return selectQuery(query) ??
    query?.INSERT?.into ??
    query?.UPDATE?.entity ??
    query?.DELETE?.from;
}

/**
 * try to find the object module name
 */
export const findObjectInRequireCache = memorized(function findObjectInRequireCache(obj: any): Module | undefined {
  for (const module of Object.values(require.cache)) {
    if (module !== undefined) {
      if (module.exports === obj || (module.exports?.__esModule === true && module.exports?.default === obj)) {
        return module;
      }
      // find module.exports = class { target() {} }
      if (typeof module.exports?.prototype === "object") {
        for (const [key, describer] of Object.entries(Object.getOwnPropertyDescriptors(module.exports.prototype))) {
          // not getter and object equal
          if (describer.get === undefined && module.exports.prototype[key] === obj) {
            return module;
          }
        }
      }
    }
  }
}, 1, 1024);

/**
 * get entity name from select query
 * 
 * @param query 
 * @returns 
 */
function selectQuery(query: any): string | undefined {
  return query?.SELECT?.from?.ref?.map?.((ref: string | any) => typeof ref === "string" ? ref : ref?.id ?? JSON.stringify(ref))?.join(", ") ??
    query?.SELECT?.from?.args?.map?.((arg: any) => arg?.ref?.[0])?.join?.(" join ");
}

export function extractAttributesFromReq(req: Request) {
  if (typeof req !== "object") {
    return {};
  }
  return {
    [SemanticAttributes.ENDUSER_ID]: req?.user?.id,
    [CDSSemanticAttributes.CDS_TENANT_ID]: req?.tenant,
    [CDSSemanticAttributes.CDS_REQUEST_TARGET]: req?.target?.name,
    [CDSSemanticAttributes.CDS_REQUEST_EVENT]: req?.event,
    [CDSSemanticAttributes.CDS_REQUEST_ID]: req?.id,
    [CDSSemanticAttributes.CDS_QUERY_ENTITIES]: getEntityNameFromQuery(req?.query),
  };
}
