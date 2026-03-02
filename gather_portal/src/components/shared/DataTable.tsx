import React from 'react';
import './DataTable.css';
import LoadingSpinner from './LoadingSpinner';

export interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  actions?: (item: T) => React.ReactNode;
}

export default function DataTable<T extends { id?: string }>({
  data,
  columns,
  loading = false,
  onRowClick,
  emptyMessage = 'No data available',
  actions,
}: DataTableProps<T>) {
  if (loading) {
    return <LoadingSpinner message="Loading data..." />;
  }

  if (data.length === 0) {
    return (
      <div className="data-table-empty">
        <p className="data-table-empty-message">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="data-table-container">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="data-table-header">
                {column.label}
              </th>
            ))}
            {actions && <th className="data-table-header">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr
              key={item.id || index}
              className={`data-table-row ${onRowClick ? 'data-table-row-clickable' : ''}`}
              onClick={() => onRowClick?.(item)}
            >
              {columns.map((column) => (
                <td key={column.key} className="data-table-cell">
                  {column.render
                    ? column.render(item)
                    : String((item as any)[column.key] ?? '-')}
                </td>
              ))}
              {actions && (
                <td
                  className="data-table-cell data-table-actions"
                  onClick={(e) => e.stopPropagation()}
                >
                  {actions(item)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

