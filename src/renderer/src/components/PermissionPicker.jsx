import { useTranslation } from 'react-i18next'

/**
 * The owner's tick boxes: what one account may do. Used for a user (Settings → Users) and for a repairman's
 * login (Repairmen). `groups` comes from the API ({ work: [...], manage: [...], sensitive: [...] }), so a new
 * permission shows up here without touching this file.
 */
export default function PermissionPicker({ groups, value, onChange }) {
  const { t } = useTranslation()
  const toggle = (key) => onChange(value.includes(key) ? value.filter(k => k !== key) : [...value, key])

  return (
    <div className="space-y-3">
      {Object.entries(groups || {}).map(([group, keys]) => (
        <fieldset key={group}>
          <legend className="text-xs font-semibold text-muted-foreground uppercase tracking-[.04em] rtl:normal-case rtl:tracking-normal mb-1.5">{t(`perms.groups.${group}`)}</legend>
          <div className="grid grid-cols-2 gap-1.5">
            {keys.map(key => (
              <label key={key} className="flex gap-2 items-start p-2 rounded-md border border-border cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-primary-soft">
                <input type="checkbox" checked={value.includes(key)} onChange={() => toggle(key)} className="mt-0.5" />
                <span>
                  <span className="block text-sm font-medium text-foreground">{t(`perms.${key}`)}</span>
                  <span className="block text-xs text-muted-foreground">{t(`perms.${key}_hint`)}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  )
}
