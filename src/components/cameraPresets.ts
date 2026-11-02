export type CameraPreset = 'geral' | 'suite' | 'quarto2' | 'escada' | 'topo'

export const cameraPresets: Record<CameraPreset, { label: string; pos: [number, number, number]; target: [number, number, number] }> = {
  geral: { label: 'Vista geral', pos: [10.8, 11.5, 12.2], target: [4.2, 0, 3.6] },
  suite: { label: 'Suite', pos: [11.2, 7.2, 9.2], target: [6.6, 0.3, 3.0] },
  quarto2: { label: 'Quarto 2 e WC', pos: [-4.6, 8.2, -3.2], target: [2.0, 0.2, 3.2] },
  escada: { label: 'Escada e sótão', pos: [-5.2, 6.4, 10.8], target: [3.0, 1.9, 3.3] },
  topo: { label: 'Planta', pos: [4.23, 15.5, 3.25], target: [4.23, 0, 3.2] },
}
