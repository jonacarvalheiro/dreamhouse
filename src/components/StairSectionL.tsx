import { CEILING, HEADROOM, ROOF, roofHeight, type LStairCalc } from '@/plan/stair'
import { winderXs } from '@/plan/winders'

const fmt = (v: number, d = 2) => v.toFixed(d).replace('.', ',')

/** Arrumos debaixo dos primeiros degraus do 2.º lanço, de x = s.w até x1, fechados por uma pré-parede baixa (w × h). */
type Store = { x1: number; w: number; h: number }

/**
 * Corte poente–nascente pelo patamar (ou leque) e pelo 2.º lanço (poente à esquerda), até à parede nascente do corredor.
 * A escada fica debaixo da água sul, por isso o telhado cortado é plano; por trás vê-se o telhado mais a norte, até à cumeeira.
 */
export function StairSectionL({ s, underLabel = 'WC', store }: { s: LStairCalc; underLabel?: string; store?: Store }) {
  const H = s.floorToFloor
  const top = H + ROOF.ridge + 0.35
  const Z = (z: number) => top - z
  const X1 = 5.0
  const w = s.w
  const yMid = s.bandY + w / 2
  const yRidge = ROOF.D / 2
  const cutsW1 = yMid > 2.84 && yMid < 4.01
  const cutsDoor = (yMid > 3.07 && yMid < 3.77) || (yMid > 5.17 && yMid < 5.87)
  const slab = H - CEILING
  const short = s.roofAtTop < HEADROOM - 1e-3
  const head = 1.92
  const sill = head - 1.045

  const xs = [0, ...(s.winders ? winderXs({ x: 0, y: s.bandY, w, h: w }, s.winders, yMid) : []), w]
  const steps = xs.slice(1).map((x1, j) => ({ x0: xs[j], x1, z: s.landingH + j * s.riser }))
  for (let k = 1; k <= s.treads2; k++) steps.push({ x0: w + (k - 1) * s.going, x1: w + k * s.going, z: s.cornerTop + k * s.riser })
  const profile = `${steps.map((st, i) => `${i ? 'L' : 'M'} ${st.x0} ${Z(st.z)} L ${st.x1} ${Z(st.z)}`).join(' ')} L ${s.xTop} ${Z(H)}`
  const under = `L ${s.xTop} ${Z(H - 0.3)} L ${w} ${Z(s.cornerTop - 0.15)} L ${w} ${Z(0)} L 0 ${Z(0)} Z`

  const roofLine = (y: number) => {
    const pts: string[] = []
    for (let x = 0; x <= X1 + 1e-6; x += 0.04) pts.push(`${x.toFixed(2)},${Z(H + roofHeight(x, y)).toFixed(3)}`)
    return pts.join(' ')
  }
  const roofCut = roofLine(yMid)
  const roofBeyond = roofLine(yRidge)
  const overStair = roofHeight(X1, yMid)
  const wcX = store ? (store.x1 + store.w + 3.43) / 2 : 2.4

  return (
    <svg viewBox={`-0.55 -0.1 ${X1 + 1.3} ${top + 0.45}`} className="h-auto w-full" role="img" aria-label="Corte pela escada">
      <defs>
        <pattern id="slabL" width="0.1" height="0.1" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="0.1" height="0.1" fill="#e7e5e4" />
          <line x1="0" y1="0" x2="0" y2="0.1" stroke="#a8a29e" strokeWidth="0.02" />
        </pattern>
      </defs>

      <polygon points={`0,${Z(H)} ${roofBeyond} ${X1},${Z(H)}`} fill="#fff7ed" stroke="none" />
      <polygon points={`0,${Z(H)} ${roofCut} ${X1},${Z(H)}`} fill="#ffedd5" stroke="none" />
      <polyline points={roofBeyond} fill="none" stroke="#c2410c" strokeWidth={0.02} strokeDasharray="0.08 0.05" strokeLinejoin="round" />
      <polyline points={roofCut} fill="none" stroke="#c2410c" strokeWidth={0.03} strokeLinejoin="round" />
      <text x={(yRidge + X1) / 2} y={Z(H + ROOF.ridge) - 0.1} fontSize={0.15} fill="#9a3412" textAnchor="middle">
        cumeeira, {fmt(yMid - yRidge)} m mais a norte
      </text>
      <text x={(s.xTop + X1) / 2} y={Z(H + overStair) + 0.22} fontSize={0.15} fill="#9a3412" textAnchor="middle">
        telha por cima da escada
      </text>
      <text x={0.08} y={Z(H + ROOF.knee / 2) + 0.06} fontSize={0.15} fill="#9a3412">
        {fmt(ROOF.knee, 3)}
      </text>

      {cutsW1 ? (
        <>
          <rect x={-0.36} y={Z(H + ROOF.knee)} width={0.36} height={H + ROOF.knee - head} fill="#d6d3d1" />
          <rect x={-0.36} y={Z(sill)} width={0.36} height={sill} fill="#d6d3d1" />
          <rect x={-0.36} y={Z(head)} width={0.36} height={head - sill} fill="#e0f2fe" stroke="#0ea5e9" strokeWidth={0.015} />
          <text x={-0.18} y={Z((sill + head) / 2) + 0.05} fontSize={0.13} fill="#0369a1" textAnchor="middle">
            W1
          </text>
        </>
      ) : (
        <rect x={-0.36} y={Z(H + ROOF.knee)} width={0.36} height={H + ROOF.knee} fill="#d6d3d1" />
      )}
      <text x={-0.18} y={Z(-0.22)} fontSize={0.16} textAnchor="middle" fill="#78716c">
        O
      </text>
      <text x={X1 + 0.08} y={Z(-0.22)} fontSize={0.16} textAnchor="middle" fill="#78716c">
        E
      </text>

      <rect x={s.xTop} y={Z(H)} width={X1 - s.xTop} height={slab} fill="url(#slabL)" />
      <rect x={3.43} y={Z(CEILING)} width={0.17} height={cutsDoor ? CEILING - 2.05 : CEILING} fill="#d6d3d1" />
      <rect x={4.83} y={Z(CEILING)} width={0.17} height={CEILING} fill="#d6d3d1" />

      <path d={`${profile} ${under}`} fill="#d9e7d1" stroke="none" />
      <path d={profile} fill="none" stroke="#3f6212" strokeWidth={0.025} strokeLinejoin="round" />
      <text x={w / 2} y={Z(s.cornerTop) - 0.08} fontSize={0.14} fill="#3f6212" textAnchor="middle">
        {s.winders ? 'leque' : `patamar ${fmt(s.landingH)}`}
      </text>
      {cutsW1 && (
        <>
          <line x1={0} y1={Z(s.landingH + 1.0)} x2={w} y2={Z(s.landingH + 1.0)} stroke="#3f6212" strokeWidth={0.015} strokeDasharray="0.05 0.03" />
          <text x={w / 2} y={Z(s.landingH + 1.0) - 0.06} fontSize={0.12} fill="#3f6212" textAnchor="middle">
            guarda
          </text>
        </>
      )}

      <line x1={w} y1={Z(s.cornerTop + HEADROOM)} x2={s.xTop} y2={Z(H + HEADROOM)} stroke="#2563eb" strokeWidth={0.015} strokeDasharray="0.06 0.04" />
      <text x={1.15} y={Z(s.cornerTop + HEADROOM - 0.3)} fontSize={0.16} fill="#2563eb">
        mín. {fmt(s.minHeadroom)} m livres
      </text>

      <line x1={s.xTop} y1={Z(H)} x2={s.xTop} y2={Z(H + s.roofAtTop)} stroke={short ? '#dc2626' : '#16a34a'} strokeWidth={0.03} />
      <text x={s.xTop + 0.1} y={Z(H + s.roofAtTop / 2)} fontSize={0.18} fill={short ? '#b91c1c' : '#15803d'} fontWeight={600}>
        {fmt(s.roofAtTop)} m
      </text>
      <text x={s.xTop + 0.1} y={Z(H + s.roofAtTop / 2) + 0.22} fontSize={0.14} fill={short ? '#b91c1c' : '#15803d'}>
        à chegada
      </text>

      {store && (
        <>
          <rect x={store.x1} y={Z(store.h)} width={store.w} height={store.h} fill="#d6d3d1" />
          <text x={(w + store.x1) / 2} y={Z(0.3)} fontSize={0.13} fill="#57534e" textAnchor="middle">
            arrumos
          </text>
        </>
      )}
      <text x={wcX} y={Z(0.3)} fontSize={0.16} fill={underLabel === 'WC' ? '#0369a1' : '#57534e'} textAnchor="middle">
        {underLabel}
      </text>
      {cutsDoor && (
        <text x={3.515} y={Z(1.0)} fontSize={0.12} fill="#57534e" textAnchor="middle" transform={`rotate(-90 3.515 ${Z(1.0)})`}>
          porta
        </text>
      )}
      <text x={4.215} y={Z(0.3)} fontSize={0.15} fill="#57534e" textAnchor="middle">
        corredor
      </text>

      <line x1={-0.36} y1={Z(0)} x2={X1} y2={Z(0)} stroke="#292524" strokeWidth={0.03} />

      <g stroke="#78716c" strokeWidth={0.012}>
        <line x1={X1 + 0.35} y1={Z(0)} x2={X1 + 0.35} y2={Z(H + ROOF.ridge)} />
        {[0, H, H + ROOF.ridge].map((z) => (
          <line key={z} x1={X1 + 0.28} y1={Z(z)} x2={X1 + 0.42} y2={Z(z)} />
        ))}
      </g>
      <text x={X1 + 0.55} y={Z(H / 2)} fontSize={0.2} fill="#57534e" transform={`rotate(-90 ${X1 + 0.55} ${Z(H / 2)})`} textAnchor="middle">
        {fmt(H)} m
      </text>
      <text x={X1 + 0.55} y={Z(H + ROOF.ridge / 2)} fontSize={0.2} fill="#9a3412" transform={`rotate(-90 ${X1 + 0.55} ${Z(H + ROOF.ridge / 2)})`} textAnchor="middle">
        {fmt(ROOF.ridge)} m
      </text>
    </svg>
  )
}
