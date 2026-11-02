/** Controle segmentado (escolha única), p. ex. a unidade das paredes. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  testId,
}: {
  label: string
  value: T
  options: readonly T[]
  onChange: (v: T) => void
  testId?: string
}) {
  return (
    <span
      className="segmented"
      role="radiogroup"
      aria-label={label}
      data-testid={testId}
      data-value={value}
    >
      {options.map((o) => (
        <button
          key={o}
          type="button"
          role="radio"
          aria-checked={o === value}
          onClick={() => onChange(o)}
          data-testid={testId && `${testId}-${o}`}
        >
          {o}
        </button>
      ))}
    </span>
  )
}
