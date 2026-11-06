/**
 * Reads every row of a query, page by page. Supabase returns at most 1,000 rows
 * per request (and silently ignores a bigger .range()), so totals built from one
 * request undercount once a table passes 1,000 rows.
 */
type Page<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;

export async function fetchAll<T>(
  page: (from: number, to: number) => Page<T>,
  { pageSize = 1000, maxRows = 100_000 } = {},
): Promise<{ data: T[]; error: { message: string } | null }> {
  const rows: T[] = [];
  for (let from = 0; from < maxRows; from += pageSize) {
    const { data, error } = await page(from, from + pageSize - 1);
    if (error) return { data: rows, error };
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }
  return { data: rows, error: null };
}
