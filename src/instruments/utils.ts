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
  return query?.SELECT?.from?.ref?.[0] ??
    query?.SELECT?.from?.args?.map?.((arg: any) => arg?.ref?.[0])?.join?.(" join ") ??
    query?.INSERT?.into ??
    query?.UPDATE?.entity ??
    query?.DELETE?.from;
}
