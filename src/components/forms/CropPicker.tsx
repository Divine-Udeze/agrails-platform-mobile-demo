import { Icon, CROP_ICON } from '@/src/components/common/Icons'
import styles from '@/src/components/forms/forms.module.css'
import { CROP_LIST } from '@/src/data/cropConfig'
import { t } from '@/src/i18n'
import type { Crop } from '@/src/types'

interface Props {
  value: Crop | null
  onChange: (c: Crop) => void
  label: string
}

export function CropPicker({ value, onChange, label }: Props) {
  return (
    <div role='radiogroup' aria-label={label} className={styles.cropGrid}>
      {CROP_LIST.map((crop) => (
        <button
          key={crop}
          type='button'
          role='radio'
          aria-checked={value === crop}
          className={styles.cropTile}
          onClick={() => onChange(crop)}
        >
          <Icon name={CROP_ICON[crop]} size={36} />
          {t(`crop.${crop}`)}
        </button>
      ))}
    </div>
  )
}
