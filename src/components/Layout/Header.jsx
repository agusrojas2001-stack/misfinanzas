export default function Header({ title, subtitle, right }) {
  return (
    <header className="px-4 pt-4 pb-2 safe-top">
      <div className="flex items-center justify-between max-w-lg mx-auto">
        <div>
          <h1 className="text-3xl font-black text-zinc-100">{title}</h1>
          {subtitle && (
            <p className="text-sm font-normal text-zinc-400 mt-0.5">{subtitle}</p>
          )}
        </div>
        {right && <div>{right}</div>}
      </div>
    </header>
  )
}
