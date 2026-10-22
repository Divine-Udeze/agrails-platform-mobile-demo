import { Screen } from '@/src/components/common/Screen'

export function Placeholder({ title }: { title: string }) {
  return (
    <Screen>
      <h1 className='h1'>{title}</h1>
    </Screen>
  )
}
