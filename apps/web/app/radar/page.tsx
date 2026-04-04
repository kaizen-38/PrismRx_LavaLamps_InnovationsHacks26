// /radar → redirect to /changes (canonical route)
import { redirect } from 'next/navigation'

export default function RadarRedirectPage() {
  redirect('/changes')
}
