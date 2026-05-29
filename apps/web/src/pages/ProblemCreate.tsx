import PageContainer from '../components/PageContainer'
import Card from '../components/Card'
import { Button } from '../components/Button'

export default function ProblemCreate(){
  return (
    <PageContainer title="Create Problem">
      <Card>
        <form>
          <div className="grid grid-cols-1 gap-3">
            <label className="flex flex-col">
              <span className="text-sm text-[color:var(--color-muted)]">Title</span>
              <input className="border p-2 rounded" />
            </label>
            <label className="flex flex-col">
              <span className="text-sm text-[color:var(--color-muted)]">Statement</span>
              <textarea className="border p-2 rounded h-40" />
            </label>
            <div className="flex gap-2">
              <Button variant="primary">Create</Button>
              <Button variant="ghost">Cancel</Button>
            </div>
          </div>
        </form>
      </Card>
    </PageContainer>
  )
}
