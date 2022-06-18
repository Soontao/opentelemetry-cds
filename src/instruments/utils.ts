export function getEntityNameFromQuery(query: any): string | undefined {
  return query?.SELECT?.from?.ref?.[0] ??
    query?.INSERT?.into ??
    query?.UPDATE?.entity ??
    query?.DELETE?.from;
}
