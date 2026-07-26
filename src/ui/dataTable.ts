export interface DataTableColumn<T> {
  key: string;
  /** Static text, or a function re-evaluated on each render (for labels that depend on external state). */
  label: string | (() => string);
  /** Rendered cell text. */
  format: (row: T) => string;
  /** Value used for sorting and searching — numbers sort numerically, strings alphabetically. */
  value: (row: T) => number | string;
}

interface SortState {
  key: string;
  dir: 1 | -1;
}

export interface DataTableController<T> {
  setRows(rows: T[]): void;
}

/**
 * Renders an interactive table into `table`: click a header to sort by it
 * (click again to reverse), type in `searchInput` to filter rows by any
 * column's value. Re-binds header listeners on every render since the
 * header markup is regenerated each time.
 */
export function initDataTable<T>(opts: {
  table: HTMLTableElement;
  searchInput: HTMLInputElement;
  countEl?: HTMLElement;
  columns: DataTableColumn<T>[];
  initialSort: SortState;
}): DataTableController<T> {
  let rows: T[] = [];
  let sort: SortState = opts.initialSort;
  let query = "";

  function render(): void {
    const filtered = query
      ? rows.filter((row) => opts.columns.some((col) => String(col.value(row)).toLowerCase().includes(query)))
      : rows;

    const sortCol = opts.columns.find((col) => col.key === sort.key)!;
    const sorted = filtered.slice().sort((a, b) => {
      const av = sortCol.value(a);
      const bv = sortCol.value(b);
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * sort.dir;
      return String(av).localeCompare(String(bv), "fa") * sort.dir;
    });

    opts.table.innerHTML = `
      <thead>
        <tr>
          ${opts.columns
            .map((col) => {
              const isActive = col.key === sort.key;
              const arrow = isActive ? (sort.dir === 1 ? "▲" : "▼") : "";
              const label = typeof col.label === "function" ? col.label() : col.label;
              return `<th data-key="${col.key}" class="${isActive ? "sorted" : ""}" aria-sort="${
                isActive ? (sort.dir === 1 ? "ascending" : "descending") : "none"
              }">${label}<span class="sort-arrow">${arrow}</span></th>`;
            })
            .join("")}
        </tr>
      </thead>
      <tbody>
        ${sorted
          .map((row) => `<tr>${opts.columns.map((col) => `<td>${col.format(row)}</td>`).join("")}</tr>`)
          .join("")}
      </tbody>`;

    if (opts.countEl) {
      opts.countEl.textContent = `${sorted.length.toLocaleString("fa-IR")} از ${rows.length.toLocaleString("fa-IR")} ردیف`;
    }

    for (const th of opts.table.querySelectorAll<HTMLTableCellElement>("th[data-key]")) {
      th.addEventListener("click", () => {
        const key = th.dataset.key!;
        sort = sort.key === key ? { key, dir: sort.dir === 1 ? -1 : 1 } : { key, dir: 1 };
        render();
      });
    }
  }

  opts.searchInput.addEventListener("input", () => {
    query = opts.searchInput.value.trim().toLowerCase();
    render();
  });

  return {
    setRows(newRows: T[]) {
      rows = newRows;
      render();
    },
  };
}
