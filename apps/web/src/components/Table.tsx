import React from 'react'

export interface Column<T>{
  key: string
  label: string
  render?: (row:T)=>React.ReactNode
  sortable?: boolean
}

export interface TableProps<T>{
  columns: Column<T>[]
  data: T[]
  onRowClick?: (row:T)=>void
}

export function Table<T>({columns, data, onRowClick}: TableProps<T>){
  return (
    <div className="overflow-x-auto bg-[color:var(--color-surface)] rounded-md shadow-sm">
      <table className="min-w-full divide-y">
        <thead className="bg-[color:var(--color-bg)]">
          <tr>
            {columns.map(c=> (
              <th key={c.key} className="px-4 py-3 text-left text-sm font-medium">{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {data.map((row, idx)=> (
            <tr key={idx} className="hover:bg-[color:var(--color-primary)]/6 cursor-pointer" onClick={()=>onRowClick?.(row)}>
              {columns.map(c=> <td key={c.key} className="px-4 py-3 text-sm">{c.render ? c.render(row) : (row as any)[c.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default Table
