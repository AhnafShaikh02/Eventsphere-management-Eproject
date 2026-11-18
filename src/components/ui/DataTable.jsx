import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

export function DataTable({
  columns,
  rows,
  emptyMessage = 'No records found.',
  onRowClick,
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-[#272732]/18 bg-[#FFFFFF] dark:border-[#2D2D3A]/38 dark:bg-[#121217]">
      <table className="w-full text-left text-xs sm:text-sm">
        <thead className="border-b border-[#272732]/16 bg-[#E6E7EE] font-mono text-[11px] font-semibold uppercase tracking-wider text-[#3E404D] dark:border-[#2D2D3A]/35 dark:bg-[#0E0E13] dark:text-[#9497A6]">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 whitespace-nowrap ${col.align === 'right' ? 'text-right' : 'text-left'}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#272732]/12 dark:divide-[#2D2D3A]/24">
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-8 text-center text-xs text-[#525463] dark:text-[#9497A6]"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={row.id}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={
                  onRowClick
                    ? 'cursor-pointer transition-colors hover:bg-[#F3F4F8] dark:hover:bg-[#E8C987]/8'
                    : 'transition-colors hover:bg-[#F3F4F8]/60 dark:hover:bg-[#E8C987]/5'
                }
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 ${col.align === 'right' ? 'text-right' : 'text-left'}`}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export const Pagination = ({ page, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-3 pt-3 text-xs">
      <span className="font-mono text-[#525463] dark:text-[#9497A6]">
        Page {page} of {totalPages}
      </span>
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          leftIcon={<ChevronLeft className="h-3.5 w-3.5" />}
        >
          Prev
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          rightIcon={<ChevronRight className="h-3.5 w-3.5" />}
        >
          Next
        </Button>
      </div>
    </div>
  );
};
