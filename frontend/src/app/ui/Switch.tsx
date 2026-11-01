/** Interruptor liga/desliga (checkbox com papel de switch, estilizado em styles.css). */
export function Switch({
  label,
  checked,
  onChange,
  title,
  testId,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
  title?: string
  testId?: string
}) {
  return (
    <label className="switch-label" title={title}>
      <input
        type="checkbox"
        role="switch"
        className="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        data-testid={testId}
      />
      {label}
    </label>
  )
}
