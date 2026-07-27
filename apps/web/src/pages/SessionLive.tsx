import { useParams } from 'react-router-dom'
import PageContainer from '../components/PageContainer'
import Card from '../components/Card'

export default function SessionLive(){
  const { id, sessionId } = useParams()
  const sessionKey = id ?? sessionId ?? ''
  return (
    <PageContainer title={`Session ${sessionKey}`}>
      <Card>
        <div>Live session UI placeholder for {sessionKey}</div>
      </Card>
    </PageContainer>
  )
}
