export default function Header({ title, subtitle, right }) {
  return (
    <header className="px-4 pt-4 pb-2 safe-top">
      <div className="flex items-center justify-between max-w-lg mx-auto">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">{title}</h1>
          {subtitle && (
            <p className="text-sm text-zinc-500 mt-0.5">{subtitle}</p>
          )}
        </div>
        {right && <div>{right}</div>}
      </div>
    </header>
  )
}
