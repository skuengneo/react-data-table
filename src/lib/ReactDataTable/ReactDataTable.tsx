/* eslint max-lines: ["error", 400] */
import { faSortDown, faSortUp, faSearch, faTimes, faSort } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Paging } from "@neolution-ch/react-pattern-ui";
import { Row, Table, flexRender } from "@tanstack/react-table";
import { Table as ReactStrapTable, Input } from "reactstrap";
import { reactDataTableTranslations } from "../translations/translations";
import { ReactDataTableProps } from "./ReactDataTableProps";
import { FilterModel } from "../types/TableState";
import { getModelFromColumnFilter } from "../utils/getModelFromColumnFilter";
import { CSSProperties, Fragment } from "react";
import { DndContext, KeyboardSensor, MouseSensor, TouchSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { DraggableRow, InternalTableRow } from "./TableRows";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { getCommonPinningStyles } from "../utils/getCommonPinningStyles";
import { getFilterValue, setFilterValue } from "../utils/customFilterMethods";
import { useVirtualizer, Virtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";

interface TableBodyProps<TData> {
  enableDragAndDrop: boolean;
  table: Table<TData>;
  rowStyle?: (row: TData) => CSSProperties;
  virtualizer: Virtualizer<any, Element>;
}

/**b
 * The table renderer for the react data table
 * @param props according to {@link ReactDataTableProps}
 */
const ReactDataTable = <TData, TFilter extends FilterModel = Record<string, never>>(props: ReactDataTableProps<TData, TFilter>) => {
  const {
    isLoading,
    isFetching,
    table,
    tableClassName,
    tableStyle,
    rowStyle,
    pageSizes,
    showPaging,
    hidePageSizeChange,
    onEnter,
    totalRecords = table.getCoreRowModel().rows.length,
    withoutHeaders = false,
    withoutHeaderFilters = false,
    dragAndDropOptions,
    noEntriesMessage,
    onRowClick,
    enableRowClick,
    isStriped = true,
    showClearSearchButton = true,
  } = props;

  const { pagination } = table.getState();
  const {
    options: { manualPagination, enableRowSelection, enableExpanding, fullRowSelectable },
    resetPageIndex,
  } = table;

  const loadingCss = `  
  @-webkit-keyframes reloadingAnimation {
    0%{
      background-position-x: 200%
    }
    100%{
      background-position-x: 0%
    }
  }`;

  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: totalRecords,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 34,
    overscan: 20,
  })

  const TableBody = <TData,>(props: TableBodyProps<TData>) => {
    const { enableDragAndDrop, table, rowStyle, virtualizer } = props;

    if (enableDragAndDrop && !table.options.getRowId) {
      throw new Error("You must provide 'getRowId()' to data-table options in order to use the drag-and-drop feature.");
    }

    console.log(`virrtaulizer oooon ${rowStyle}`);
    const {rows} = table.getRowModel();

    return enableDragAndDrop ? (
      <SortableContext items={table.getRowModel().rows.map((row) => row.id)} strategy={verticalListSortingStrategy}>
          {virtualizer.getVirtualItems().map((virtualRow, index) => {
              const row = rows[virtualRow.index]
            return (
              <DraggableRow<TData, TFilter>
            key={index}
            row={row}
            enableRowClick={enableRowClick as ReactDataTableProps<TData, TFilter>["enableRowClick"]}
            onRowClick={onRowClick as ReactDataTableProps<TData, TFilter>["onRowClick"]}
            enableRowSelection={enableRowSelection as boolean | ((row: Row<TData>) => boolean)}
            enableExpanding={enableExpanding as boolean | ((row: Row<TData>) => boolean)}
            rowStyle={{
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${
                      virtualRow.start - index * virtualRow.size
                    }px)`,
                  }}
            fullRowSelectable={fullRowSelectable}
          />
              )
            })}
      </SortableContext>
    ) : (
        <>
          {virtualizer.getVirtualItems().map((virtualRow, index) => {
            const row = rows[virtualRow.index];
            return (
              <InternalTableRow<TData, TFilter>
                key={index}
                row={row}
                enableRowClick={enableRowClick as ReactDataTableProps<TData, TFilter>["enableRowClick"]}
                onRowClick={onRowClick as ReactDataTableProps<TData, TFilter>["onRowClick"]}
                enableRowSelection={enableRowSelection as boolean | ((row: Row<TData>) => boolean)}
                enableExpanding={enableExpanding as boolean | ((row: Row<TData>) => boolean)}
                rowStyle={{
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${
                      virtualRow.start - index * virtualRow.size
                    }px)`,
                  } }
                fullRowSelectable={fullRowSelectable}
                hasPinnedColumns={table.getIsSomeColumnsPinned()}
              /> 
              )
            })}
      </>
    );
  };

  const sensors = useSensors(useSensor(MouseSensor, {}), useSensor(TouchSensor, {}), useSensor(KeyboardSensor, {}));

  return (
    <>
      <DndContext
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragEnd={dragAndDropOptions?.onDragEnd}
        sensors={sensors}
      >
        <style>{loadingCss}</style>
        <div ref={parentRef}>
          <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
        <ReactStrapTable
          striped={isStriped}
          hover
          size="sm"
          className={tableClassName}
          style={
            !isLoading && isFetching
              ? {
                  ...tableStyle,
                  background: "linear-gradient(90deg, #E8E8E8, #ffffff, #E8E8E8)",
                  backgroundSize: "200% 200%",
                  animation: "reloadingAnimation 3s linear infinite",
                }
              : tableStyle
          }
        >
          {!withoutHeaders && (
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <Fragment key={headerGroup.id}>
                  <tr key={`${headerGroup.id}-col-header`}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        onClick={header.column.getToggleSortingHandler()}
                        style={{
                          ...header.column.columnDef.meta?.headerStyle,
                          ...(header.column.getCanSort() ? { cursor: "pointer" } : {}),
                          ...(table.getIsSomeColumnsPinned()
                            ? getCommonPinningStyles(header.subHeaders.length > 0 ? header.subHeaders[0].column : header.column)
                            : {}),
                        }}
                        className={header.column.columnDef.meta?.headerClassName}
                        colSpan={header.colSpan}
                      >
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}

                        {header.column.getIsSorted() === "desc" ? (
                          <FontAwesomeIcon icon={faSortDown} className="ms-1" />
                        ) : header.column.getIsSorted() === "asc" ? (
                          <FontAwesomeIcon icon={faSortUp} className="ms-1" />
                        ) : header.column.getCanSort() ? (
                          <FontAwesomeIcon icon={faSort} className="ms-1" />
                        ) : (
                          ""
                        )}
                      </th>
                    ))}
                  </tr>
                  {!withoutHeaderFilters && !headerGroup.headers.every((x) => !!x.column.columnDef.meta?.hideHeaderFilters) && (
                    <tr key={`${headerGroup.id}-col-filters`}>
                      {headerGroup.headers.map((header) => {
                        const {
                          column: {
                            columnDef: { meta },
                          },
                        } = header;

                        return (
                          <th
                            key={`${header.id}-col-filter`}
                            style={{
                              ...header.column.columnDef.meta?.headerFilterStyle,
                              ...(table.getIsSomeColumnsPinned() ? getCommonPinningStyles(header.column) : {}),
                            }}
                          >
                            {header.index === 0 && (
                              <>
                                {onEnter && (
                                  <FontAwesomeIcon
                                    style={{ cursor: "pointer", marginBottom: "4px", marginRight: "5px" }}
                                    icon={faSearch}
                                    onClick={() => {
                                      if (manualPagination) {
                                        resetPageIndex(true);
                                      }
                                      onEnter(getModelFromColumnFilter(table.getState().columnFilters));
                                    }}
                                  />
                                )}

                                {showClearSearchButton && (
                                  <FontAwesomeIcon
                                    style={{ cursor: "pointer", marginBottom: "4px", marginRight: "5px" }}
                                    icon={faTimes}
                                    onClick={() => {
                                      if (onEnter) {
                                        onEnter(getModelFromColumnFilter(table.initialState.columnFilters));
                                      }

                                      table.setColumnFilters(table.initialState.columnFilters);
                                      if (manualPagination) {
                                        resetPageIndex(true);
                                      }
                                    }}
                                  />
                                )}
                              </>
                            )}
                            {header.column.getCanFilter() && (
                              <>
                                {meta?.customFilter ? (
                                  meta?.customFilter(
                                    getFilterValue(header.column, table),
                                    (value) => setFilterValue(header.column, table, value),
                                    table,
                                  )
                                ) : meta?.dropdownFilter ? (
                                  <Input
                                    type="select"
                                    value={(getFilterValue(header.column, table) as string) ?? ""}
                                    onChange={(e) => {
                                      setFilterValue(
                                        header.column,
                                        table,
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        meta.dropdownFilter?.options[(e.target as any as HTMLSelectElement).selectedIndex]?.value ??
                                          e.target.value,
                                      );
                                      if (!onEnter && manualPagination) {
                                        resetPageIndex(true);
                                      }
                                    }}
                                    onKeyUp={({ key }) => {
                                      if (key === "Enter" && onEnter) {
                                        if (manualPagination) {
                                          resetPageIndex(true);
                                        }
                                        onEnter(getModelFromColumnFilter(table.getState().columnFilters));
                                      }
                                    }}
                                    bsSize="sm"
                                  >
                                    {meta.dropdownFilter.options.map(({ label, value, disabled }, i) => (
                                      <option key={i} value={value} disabled={disabled}>
                                        {label}
                                      </option>
                                    ))}
                                  </Input>
                                ) : (
                                  <Input
                                    type="text"
                                    value={(getFilterValue(header.column, table) as string) ?? ""}
                                    onChange={(e) => {
                                      setFilterValue(header.column, table, e.target.value);
                                      if (!onEnter && manualPagination) {
                                        resetPageIndex(true);
                                      }
                                    }}
                                    onKeyUp={({ key }) => {
                                      if (key === "Enter" && onEnter) {
                                        if (manualPagination) {
                                          resetPageIndex(true);
                                        }
                                        onEnter(getModelFromColumnFilter(table.getState().columnFilters));
                                      }
                                    }}
                                    bsSize="sm"
                                  ></Input>
                                )}
                              </>
                            )}
                          </th>
                        );
                      })}
                    </tr>
                  )}
                </Fragment>
              ))}
            </thead>
          )}
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={table.getVisibleFlatColumns().length}>{noEntriesMessage ?? reactDataTableTranslations.noEntries}</td>
              </tr>
            ) : (
                    <TableBody<TData> table={table} enableDragAndDrop={!!dragAndDropOptions?.enableDragAndDrop} rowStyle={rowStyle} virtualizer={virtualizer} />
            )}
          </tbody>
          {table.getFooterGroups().length > 0 &&
            table.getFooterGroups().some((x) => x.headers.some((y) => !y.isPlaceholder && y.column.columnDef.footer)) && (
              <tfoot>
                {table.getFooterGroups().map((footerGroup) => (
                  <tr key={footerGroup.id}>
                    {footerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        style={header.column.columnDef.meta?.footerStyle}
                        className={header.column.columnDef.meta?.footerClassName}
                      >
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.footer, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </tfoot>
            )}
        </ReactStrapTable>
      </div>
      </div>
      </DndContext>

      {showPaging && (
        <Paging
          currentItemsPerPage={pagination.pageSize}
          currentPage={pagination.pageIndex + 1}
          totalRecords={totalRecords}
          currentRecordCount={table.getRowModel().rows.length}
          setItemsPerPage={(x) => {
            table.setPageSize(x);
          }}
          setCurrentPage={(x) => table.setPageIndex(x - 1)}
          possiblePageItemCounts={pageSizes}
          translations={{
            itemsPerPageDropdown: reactDataTableTranslations.itemsPerPageDropdown,
            showedItemsText: reactDataTableTranslations.showedItemsText,
          }}
          pagingPossible={true}
          changePageSizePossible={!hidePageSizeChange}
        />
      )}
    </>
  );
};

export { ReactDataTable, ReactDataTableProps };
