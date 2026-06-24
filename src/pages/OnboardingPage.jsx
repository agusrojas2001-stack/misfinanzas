import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const BG = 'radial-gradient(120% 90% at 50% 0%, #1c1633 0%, #09090b 55%)'

function Dots({ total, current }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            width: i === current ? 22 : 6,
            height: 6,
            borderRadius: 3,
            background: i === current ? '#8b5cf6' : '#3f3f46',
            transition: 'all 300ms ease',
          }}
        />
      ))}
    </div>
  )
}

function Step1({ onNext, onSkip }) {
  return (
    <div className="flex flex-col items-center text-center gap-6 px-6">
      <img
        src="/monedita/monedita-contenta.svg"
        alt="Monedita"
        className="w-32 h-32 object-contain"
        style={{ filter: 'drop-shadow(0 16px 32px rgba(139,92,246,.35))' }}
      />
      <div className="space-y-3">
        <h1 className="text-3xl font-black text-zinc-100 leading-tight">
          Bienvenido a<br />
          <span style={{ color: '#a78bfa' }}>Mis Numeritos</span>
        </h1>
        <p className="text-zinc-400 text-base leading-relaxed">
          Tu app de finanzas personales, simple y sin complicaciones.
        </p>
      </div>
      <div className="w-full space-y-3 pt-2">
        <button onClick={onNext} className="btn-primary">Empezar</button>
        <button onClick={onSkip} className="text-sm text-zinc-500 hover:text-zinc-400 transition-colors py-2">
          Ya tengo cuenta, ir a la app
        </button>
      </div>
    </div>
  )
}

function Step2({ onNext }) {
  const features = [
    { emoji: '💰', title: 'Registrá en segundos', desc: 'Anotá gastos, ingresos y ahorros con frases simples o tocando un botón.' },
    { emoji: '🎯', title: 'Creá tus metas', desc: 'Poné un objetivo de ahorro y seguí tu progreso mes a mes.' },
    { emoji: '📊', title: 'Entendé tus finanzas', desc: 'Gráficos, análisis y alertas para que nunca te agarre de sorpresa.' },
  ]
  return (
    <div className="flex flex-col gap-6 px-6 w-full">
      <div className="text-center">
        <h2 className="text-2xl font-black text-zinc-100">Ordená en segundos</h2>
        <p className="text-zinc-400 text-sm mt-2">Todo lo que necesitás para controlar tu plata.</p>
      </div>
      <div className="space-y-4">
        {features.map(f => (
          <div key={f.emoji} className="flex items-start gap-4 rounded-[18px] p-4"
               style={{ background: '#18181b', border: '1px solid #1f1f23' }}>
            <span className="text-2xl flex-shrink-0">{f.emoji}</span>
            <div>
              <p className="font-bold text-zinc-100 text-sm">{f.title}</p>
              <p className="text-zinc-400 text-xs mt-0.5 leading-relaxed">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <button onClick={onNext} className="btn-primary mt-2">Siguiente</button>
    </div>
  )
}

function Step3({ onNext }) {
  const bubbles = [
    { from: 'bot', text: '¡Hola! Soy Monedita 🪙\nRegistrá tus movimientos con frases simples.' },
    { from: 'user', text: 'gasté 5000 en super' },
    { from: 'bot', text: '¡Anotado! Gasto de $5.000 en Supermercado 🛒' },
  ]
  return (
    <div className="flex flex-col gap-6 px-6 w-full">
      <div className="text-center">
        <img src="/monedita/monedita-contenta.svg" alt="Monedita"
             className="w-16 h-16 object-contain mx-auto mb-3" />
        <h2 className="text-2xl font-black text-zinc-100">Te presento a Monedita</h2>
        <p className="text-zinc-400 text-sm mt-2">Tu asistente financiera. Siempre lista para ayudarte.</p>
      </div>
      <div className="space-y-3 rounded-[18px] p-4" style={{ background: '#18181b', border: '1px solid #1f1f23' }}>
        {bubbles.map((b, i) => (
          <div key={i} className={`flex ${b.from === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className="max-w-[80%] px-4 py-2.5 text-sm whitespace-pre-line"
                 style={b.from === 'user'
                   ? { background: 'linear-gradient(135deg,#8b5cf6,#7c3aed)', borderRadius: '18px 18px 4px 18px', color: '#fff' }
                   : { background: '#1c1c20', border: '1px solid #27272a', borderRadius: '18px 18px 18px 4px', color: '#d4d4d8' }
                 }>
              {b.text}
            </div>
          </div>
        ))}
      </div>
      <button onClick={onNext} className="btn-primary">Siguiente</button>
    </div>
  )
}

function Step4({ onFinish, onRegistrar }) {
  return (
    <div className="flex flex-col items-center text-center gap-6 px-6">
      <img
        src="/monedita/monedita-celebrando.svg"
        alt="Monedita celebrando"
        className="w-28 h-28 object-contain"
        style={{ filter: 'drop-shadow(0 12px 24px rgba(245,200,75,.3))' }}
      />
      <div className="space-y-3">
        <h2 className="text-3xl font-black text-zinc-100">Listo, arranquemos</h2>
        <p className="text-zinc-400 text-base leading-relaxed">
          Ya tenés todo para empezar. ¿Querés registrar tu primer movimiento ahora?
        </p>
      </div>
      <div className="w-full space-y-3 pt-2">
        <button onClick={onRegistrar} className="btn-primary">
          Cargar mi primer gasto
        </button>
        <button onClick={onFinish}
          className="w-full text-sm text-zinc-500 hover:text-zinc-400 transition-colors py-2">
          Ir al inicio
        </button>
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  const [step, setStep] = useState(0)
  const navigate = useNavigate()
  const TOTAL = 4

  function finish(to = '/') {
    localStorage.setItem('onboardingDone', '1')
    navigate(to, { replace: true })
  }

  const steps = [
    <Step1 key={0} onNext={() => setStep(1)} onSkip={() => finish('/')} />,
    <Step2 key={1} onNext={() => setStep(2)} />,
    <Step3 key={2} onNext={() => setStep(3)} />,
    <Step4 key={3} onFinish={() => finish('/')} onRegistrar={() => finish('/registrar')} />,
  ]

  return (
    <div className="min-h-screen flex flex-col items-center justify-center safe-top" style={{ background: BG }}>
      <div className="w-full max-w-md flex flex-col min-h-screen">
        {/* Top spacer */}
        <div className="flex-1 flex items-center justify-center py-12">
          <div className="w-full">
            {steps[step]}
          </div>
        </div>

        {/* Progress dots */}
        <div className="pb-12 pt-6">
          <Dots total={TOTAL} current={step} />
        </div>
      </div>
    </div>
  )
}
