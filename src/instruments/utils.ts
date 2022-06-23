/* eslint-disable max-len */
/**
 * get a read able entity for query
 * 
 * @param query 
 * @returns 
 */
export function getEntityNameFromQuery(query: any | Array<any>): string | undefined {
  if (query instanceof Array) {
    return `[${query.map(getEntityNameFromQuery).filter(Boolean).join(", ")}]`;
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
 * get entity name from select query
 * 
 * @param query 
 * @returns 
 */
function selectQuery(query: any): string | undefined {
  return query?.SELECT?.from?.ref?.map?.((ref: string | any) => typeof ref === "string" ? ref : ref?.id ?? JSON.stringify(ref))?.join(", ") ??
    query?.SELECT?.from?.args?.map?.((arg: any) => arg?.ref?.[0])?.join?.(" join ");
}
