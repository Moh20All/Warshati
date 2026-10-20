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
        <div className="w-full overflow-auto border border-border rounded-lg">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-border bg-muted/50">
                        {columns.map((col, c) => (
                            <th
                                // Several columns may read the same field (e.g. _count), so keys include the position
                                key={col.id || `${col.key}-${c}`}
                                className={`
                  px-4 py-3 text-left font-medium text-muted-foreground
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
                border-b border-border last:border-0
                hover:bg-muted/50 transition-colors duration-100
                ${onRowClick ? 'cursor-pointer' : ''}
              `}
                            onClick={() => onRowClick?.(row)}
                        >
                            {columns.map((col, c) => (
                                <td key={col.id || `${col.key}-${c}`} className={`px-4 py-3 ${col.className || ''}`}>
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
