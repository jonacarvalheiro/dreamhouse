/**
 * Câmaras dos renders, em coordenadas da planta: x a partir da face interior da parede poente, y da parede norte,
 * z acima do pavimento acabado. `lens` em mm (formato 36 mm); as câmaras ficam de nível e a altura do alvo
 * só desloca a lente, para as verticais ficarem direitas.
 */
export type View = {
  id: string
  variant: string
  label: string
  eye: [number, number, number]
  target: [number, number, number]
  lens: number
  /** Ambiente de materiais (ver STYLES em blender_render.py). */
  style: string
}

export const views: View[] = [
  // Da porta de correr, a olhar para poente: os três aparelhos no mesmo quadro (1,10 × 0,90, vidro N-S).
  { id: 'wc-porta', variant: 'a', label: 'WC partilhado · da porta', eye: [2.36, 5.75, 1.5], target: [0.4, 5.0, 1.3], lens: 14, style: 'madeira-azul' },
  { id: 'wc-lavatorio', variant: 'a', label: 'WC partilhado · do lavatório para o duche', eye: [1.48, 4.55, 1.42], target: [0.55, 6.22, 1.0], lens: 14, style: 'madeira-azul' },
  { id: 'wc-duche', variant: 'a', label: 'WC partilhado · duche', eye: [0.55, 4.55, 1.5], target: [0.55, 6.32, 1.1], lens: 14, style: 'madeira-azul' },
  { id: 'quarto2-sul', variant: 'a', label: 'Quarto 2 · a olhar para sul', eye: [1.3, 0.45, 1.5], target: [1.2, 4.3, 1.2], lens: 14, style: 'madeira-azul' },
  { id: 'quarto2-norte', variant: 'a', label: 'Quarto 2 · a olhar para norte', eye: [1.2, 3.95, 1.5], target: [1.7, 0, 1.3], lens: 14, style: 'madeira-azul' },
  { id: 'suite-sul', variant: 'a', label: 'Suite · a olhar para sul', eye: [7.3, 3.3, 1.5], target: [6.9, 6.32, 1.2], lens: 14, style: 'madeira-azul' },
  { id: 'wcsuite-duche', variant: 'a', label: 'WC da suite · duche', eye: [7.75, 0.45, 1.5], target: [7.75, 2.85, 1.2], lens: 14, style: 'madeira-azul' },
]
