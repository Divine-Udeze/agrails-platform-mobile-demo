import { useNavigate } from 'react-router-dom'
import { Button } from '@/src/components/common/Button'
import { ErrorState } from '@/src/components/common/ErrorStates'
import { Header } from '@/src/components/common/Header'
import { Screen } from '@/src/components/common/Screen'
import { t } from '@/src/i18n'

export default function NotFound() {
  const navigate = useNavigate()
  return (
    <Screen header={<Header back />}>
      <ErrorState
        kind='notFound'
        action={
          <Button block onClick={() => navigate('/home')}>
            {t('notFound.cta')}
          </Button>
        }
      />
    </Screen>
  )
}
