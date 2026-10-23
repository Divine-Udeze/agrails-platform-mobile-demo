import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import styles from '@/src/components/cards/cards.module.css'
import { Sparkline } from '@/src/components/charts/Sparkline'
import { CropTile } from '@/src/components/common/CropTile'
import { Chip } from '@/src/components/common/Chip'
import { CROP_ICON, Icon } from '@/src/components/common/Icons'
import { t } from '@/src/i18n'
import { seriesFor } from '@/src/services/monitorService'
import type { Farm, Policy } from '@/src/types'
import { formatHa } from '@/src/utils/format'
import { healthStatus } from '@/src/utils/monitor'

export function isInsured(policies: Policy[], farmId: string): boolean {
  return policies.some((p) => p.farmId === farmId && p.status === 'active')
}

export function FarmCard({ farm, insured }: { farm: Farm; insured: boolean }) {
  const status = healthStatus(farm.healthScore)
  const trend = useMemo(
    () => seriesFor(farm).ndvi.slice(-8),
    [farm.id, farm.crop],
  )
  return (
    <Link
      to={`/farm/${farm.id}`}
      className={`card card-tap ${styles.farmCard}`}
    >
      <CropTile crop={farm.crop} status={status} />
      <div>
        <div className={styles.title}>{farm.name}</div>
        <div className={styles.meta}>
          <Icon name={CROP_ICON[farm.crop]} size={16} />
          <span className={styles.metaText}>
            {t(`crop.${farm.crop}`)} · {formatHa(farm.areaHa)} · {farm.county}
          </span>
        </div>
        <div className={styles.chips}>
          <Chip
            status={insured ? 'good' : 'neutral'}
            icon={insured ? 'shield' : undefined}
          >
            {insured ? t('farm.insured') : t('farm.notInsured')}
          </Chip>
          <Chip status={status}>
            {t('farm.health', { score: farm.healthScore })}
          </Chip>
        </div>
        <div className={styles.trend}>
          <Sparkline
            values={trend}
            status={status}
            width={120}
            height={28}
            label={t('farm.trend', { name: farm.name })}
          />
        </div>
      </div>
    </Link>
  )
}
