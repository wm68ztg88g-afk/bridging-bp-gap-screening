export function emhipLabel(value: boolean | null | undefined): string {
  return value === true ? "Yes" : value === false ? "No" : "Not recorded";
}

// Counts screening records, not deduplicated people. Null historical values
// must never be merged with an explicitly recorded No.
export function countEmhip(rows: { enrolledWithEmhip?: boolean | null }[]) {
  return rows.reduce((counts, row) => {
    if (row.enrolledWithEmhip === true) counts.yes++;
    else if (row.enrolledWithEmhip === false) counts.no++;
    else counts.notRecorded++;
    return counts;
  }, { yes: 0, no: 0, notRecorded: 0 });
}
