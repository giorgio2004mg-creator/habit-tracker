import {
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react'

const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(' ')
export { cx }

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 shadow-sm',
  secondary:
    'bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700',
  ghost: 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
  danger: 'bg-red-600 text-white hover:bg-red-700',
}

export function Button({
  variant = 'secondary',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      className={cx(
        'inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition select-none disabled:pointer-events-none disabled:opacity-40',
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  )
}

export function IconButton({
  label,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx(
        'inline-flex size-9 shrink-0 items-center justify-center rounded-full text-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:pointer-events-none disabled:opacity-30 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100',
        className,
      )}
      {...props}
    />
  )
}

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  size = 'md',
  className,
}: {
  value: T | undefined
  options: { value: T; label: ReactNode }[]
  onChange: (v: T) => void
  size?: 'sm' | 'md'
  className?: string
}) {
  return (
    <div className={cx('flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800', className)} role="radiogroup">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'flex-1 rounded-lg font-medium transition',
            size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm',
            value === o.value
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-600 dark:text-white'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function ProgressBar({ value, color, glow = false }: { value: number; color: string; glow?: boolean }) {
  return (
    <div className={cx('h-2 rounded-full bg-slate-100', glow ? 'dark:bg-white/[0.07]' : 'overflow-hidden dark:bg-slate-800')}>
      <div
        className="h-full rounded-full transition-[width] duration-300"
        style={{
          width: `${Math.min(100, Math.max(0, value * 100))}%`,
          backgroundColor: color,
          boxShadow: glow && value > 0 ? `0 0 12px ${color}88` : undefined,
        }}
      />
    </div>
  )
}

/** Anello di avanzamento (0–1) con contenuto al centro. */
export function ProgressRing({
  value,
  color,
  size = 44,
  stroke = 4,
  dashed = false,
  label,
  className,
  children,
}: {
  value: number
  color: string
  size?: number
  stroke?: number
  /** Traccia tratteggiata (giorni futuri) */
  dashed?: boolean
  label?: string
  className?: string
  children?: ReactNode
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const v = Math.min(1, Math.max(0, value))
  return (
    <span
      className={cx('relative inline-flex shrink-0 items-center justify-center', className)}
      style={{ width: size, height: size }}
      role={label ? 'img' : undefined}
      aria-label={label}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeDasharray={dashed ? '2 3' : undefined}
          className="stroke-slate-200 dark:stroke-white/10"
        />
        {v > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - v)}
            style={{ transition: 'stroke-dashoffset 0.4s ease' }}
          />
        )}
      </svg>
      <span className="relative flex items-center justify-center">{children}</span>
    </span>
  )
}

export function HabitIcon({ icon, color, size = 'md' }: { icon: string; color: string; size?: 'sm' | 'md' }) {
  return (
    <span
      className={cx(
        'inline-flex shrink-0 items-center justify-center rounded-xl',
        size === 'sm' ? 'size-7 text-base' : 'size-10 text-xl',
      )}
      style={{ backgroundColor: `${color}22` }}
      aria-hidden="true"
    >
      {icon}
    </span>
  )
}

/**
 * Input di testo che salva dopo una breve pausa, all'uscita dal campo
 * e prima di essere smontato: niente salvataggi a ogni tasto.
 */
export function CommitInput({
  value,
  onCommit,
  className,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & {
  value: string
  onCommit: (v: string) => void
}) {
  const [draft, setDraft] = useState(value)
  const pending = useRef<string | null>(null)
  const commitRef = useRef(onCommit)
  commitRef.current = onCommit

  useEffect(() => {
    if (pending.current === null) setDraft(value)
  }, [value])

  const flush = () => {
    if (pending.current !== null) {
      const v = pending.current
      pending.current = null
      commitRef.current(v)
    }
  }

  useEffect(() => {
    if (pending.current === null) return
    const t = setTimeout(flush, 600)
    return () => clearTimeout(t)
  }, [draft])

  useEffect(() => flush, [])

  return (
    <input
      {...props}
      className={cx('field', className)}
      value={draft}
      onChange={(e) => {
        pending.current = e.target.value
        setDraft(e.target.value)
      }}
      onBlur={flush}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
      }}
    />
  )
}

/** Input numerico (accetta anche la virgola) che salva all'uscita dal campo. */
export function NumberInput({
  value,
  onCommit,
  className,
  min = 0,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'min'> & {
  value: number | undefined
  onCommit: (v: number | undefined) => void
  min?: number
}) {
  const format = (n: number | undefined) => (n === undefined ? '' : String(n).replace('.', ','))
  const [draft, setDraft] = useState(format(value))
  const focused = useRef(false)

  useEffect(() => {
    if (!focused.current) setDraft(format(value))
  }, [value])

  const commit = () => {
    focused.current = false
    const n = draft.trim() === '' ? undefined : Number(draft.replace(',', '.'))
    if (n !== undefined && (Number.isNaN(n) || n < min)) {
      setDraft(format(value))
      return
    }
    if (n !== value) onCommit(n)
  }

  return (
    <input
      {...props}
      type="text"
      inputMode="decimal"
      className={cx('field', className)}
      value={draft}
      onFocus={(e) => {
        focused.current = true
        e.target.select()
      }}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
      }}
    />
  )
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-5 flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
    </header>
  )
}

export function SectionTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h2
      className={cx(
        'mb-2 text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400',
        className,
      )}
    >
      {children}
    </h2>
  )
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{hint}</span>}
    </label>
  )
}
