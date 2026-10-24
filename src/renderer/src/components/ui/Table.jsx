import { ArrowUp, ArrowDown } from 'lucide-react'
import EmptyState from './EmptyState'

export default function Table({
    columns = [],
    data = [],
    sortColumn,
    sortDirection,
    onSort,
    emptyTitle = 'No data',
    emptyDescription = 'No records found.',
    onRowClick
}) {
    if (data.length === 0) {
        return <EmptyState title={emptyTitle} description={emptyDescription} />
    }

    return (
        <div className="w-full overflow-auto border border-border rounded-md bg-card">
            <table className="w-full text-[13px] leading-5 border-collapse">
                <thead>
                    <tr className="border-b border-border bg-muted">
                        {columns.map((col, c) => (
                            <th
                                // Several columns may read the same field (e.g. _count), so keys include the position
                                key={col.id || `${col.key}-${c}`}
                                className={`
                  px-3 py-2 text-start text-xs font-semibold text-muted-foreground whitespace-nowrap
                  ${col.sortable ? 'cursor-pointer select-none hover:text-foreground' : ''}
                  ${col.className || ''}
                `}
                                onClick={() => col.sortable && onSort?.(col.key)}
                            >
                                <div className="flex items-center gap-1">
                                    {col.label}
                                    {col.sortable && sortColumn === col.key && (
                                        sortDirection === 'asc'
                                            ? <ArrowUp className="h-3.5 w-3.5" />
                                            : <ArrowDown className="h-3.5 w-3.5" />
                                    )}
                                </div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, i) => (
                        <tr
                            key={row.id || i}
                            className={`
                border-b border-border last:border-0 transition-colors duration-100
                ${onRowClick ? 'cursor-pointer hover:bg-accent' : ''}
              `}
                            onClick={() => onRowClick?.(row)}
                        >
                            {columns.map((col, c) => (
                                <td key={col.id || `${col.key}-${c}`} className={`px-3 py-[9px] align-middle ${col.className || ''}`}>
                                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
