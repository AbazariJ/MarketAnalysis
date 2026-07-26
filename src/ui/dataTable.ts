import { TabulatorFull as Tabulator, type ColumnDefinition } from "tabulator-tables";
import "tabulator-tables/dist/css/tabulator.css";

export interface DataTableController<T extends object> {
  setRows(rows: T[]): void;
  setColumnTitle(field: string, title: string): void;
}

/**
 * Wraps Tabulator (MIT, https://tabulator.info) for the downloaded-data
 * view: per-column sort (header click) and filter (header input) come from
 * Tabulator itself; the free-text `searchInput` is wired to an OR filter
 * across every column.
 */
export function initDataTable<T extends object>(opts: {
  container: HTMLElement;
  searchInput: HTMLInputElement;
  countEl?: HTMLElement;
  columns: ColumnDefinition[];
  initialSort: { column: string; dir: "asc" | "desc" };
}): DataTableController<T> {
  const table = new Tabulator(opts.container, {
    data: [],
    columns: opts.columns,
    layout: "fitColumns",
    height: "24rem",
    initialSort: [opts.initialSort],
    placeholder: "داده‌ای برای نمایش وجود ندارد",
  });

  function updateCount(): void {
    if (!opts.countEl) return;
    const total = table.getDataCount();
    const visible = table.getDataCount("active");
    opts.countEl.textContent = `${visible.toLocaleString("en-US")} از ${total.toLocaleString("en-US")} ردیف`;
  }

  table.on("tableBuilt", updateCount);
  table.on("dataFiltered", updateCount);
  table.on("dataProcessed", updateCount);

  opts.searchInput.addEventListener("input", () => {
    const query = opts.searchInput.value.trim();
    if (!query) {
      table.clearFilter(false);
      return;
    }
    const fields = opts.columns.map((col) => col.field).filter((field): field is string => !!field);
    table.setFilter(fields.map((field) => [{ field, type: "like", value: query }]));
  });

  return {
    setRows(rows: T[]) {
      void table.setData(rows);
    },
    setColumnTitle(field: string, title: string) {
      void table.updateColumnDefinition(field, { title });
    },
  };
}
