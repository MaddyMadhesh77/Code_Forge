import {useState} from 'react'
import PageContainer from '../components/PageContainer'
import Table from '../components/Table'
import { useProblems } from '../services/hooks/useProblems'
import { useNavigate } from 'react-router-dom'

export default function ProblemsList(){
  const [q, setQ] = useState('')
  const {data} = useProblems({q})
  const navigate = useNavigate()

  const columns = [
    {key:'title', label:'Title', render:(r:any)=> <div className="font-medium">{r.title}</div>},
    {key:'difficulty', label:'Difficulty'},
    {key:'author', label:'Author'}
  ]

  return (
    <PageContainer title="Problems" actions={<button onClick={()=>navigate('/problems/new')} className="btn">New Problem</button>}>
      <div className="mb-3">
        <input placeholder="Search problems" value={q} onChange={e=>setQ(e.target.value)} className="px-3 py-2 rounded border" />
      </div>
      <Table columns={columns} data={data.items} onRowClick={(row:any)=> navigate(`/problems/${row.id}`)} />
    </PageContainer>
  )
}
