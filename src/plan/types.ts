export type Rect = { x: number; y: number; w: number; h: number }

export type RoomTone = 'bed' | 'bath' | 'closet' | 'circ' | 'stair' | 'living' | 'service'

export type Room = {
  id: string
  name: string
  rects: Rect[]
  tone: RoomTone
  label: { x: number; y: number }
  /** Área oficial (levantamento) ou calculada. */
  area: number
  dims?: string
  note?: string
}

export type WallKind = 'existing' | 'new' | 'demolish' | 'infill'

export type Wall = Rect & {
  kind: WallKind
  /** Parede que só existe acima dos degraus (desenhada pela escada no 3D). */
  overhead?: boolean
  /** Divisória de blocos de vidro (até GLASS_BLOCK.h, não chega ao teto). */
  glassBlock?: boolean
  /** Parede baixa (p. ex. a pré-parede de uma sanita suspensa): altura acima do pavimento acabado. */
  low?: number
}

export type Dir = 'n' | 's' | 'e' | 'w'

export type Door =
  | {
      type: 'swing'
      /** Ponto da dobradiça. */
      hinge: { x: number; y: number }
      width: number
      /** Direção em que a folha fica quando fechada (ao longo da parede). */
      along: Dir
      /** Para que lado abre. */
      into: Dir
    }
  | {
      type: 'sliding'
      x: number
      y: number
      length: number
      orientation: 'h' | 'v'
      /** Embutida: a folha recolhe para dentro da parede, para o lado de x (ou y) menor. */
      pocket?: boolean
    }
  | { type: 'opening'; x: number; y: number; length: number; orientation: 'h' | 'v' }

export type Window = {
  /** Vão na parede exterior. */
  x: number
  y: number
  w: number
  h: number
  orientation: 'h' | 'v'
  kind?: 'existing' | 'new' | 'optional'
  label?: string
  /** Alturas do vão acima do pavimento acabado (por omissão, as das janelas atuais). */
  sill?: number
  head?: number
}

export type FurnitureKind =
  | 'bed'
  | 'nightstand'
  | 'wardrobe'
  | 'desk'
  | 'shower'
  | 'toilet'
  | 'sink'
  | 'washer'
  | 'shelves'
  | 'generic'

export type Furniture = Rect & {
  kind: FurnitureKind
  label?: string
  /** Cama com a cabeceira a nascente (por omissão fica a poente ou a norte). */
  headEast?: boolean
  /** Cama com a cabeceira a sul (por omissão fica a norte quando é mais comprida na direção norte–sul). */
  headSouth?: boolean
  /** Só aparece em planta (no 3D é desenhado por outro elemento, p. ex. o armário sob a escada). */
  only2d?: boolean
  /** Duche de nível: sem base, o chão continua com pendente para um ralo linear. */
  walkIn?: boolean
  /** Sanita: lado das costas, onde fica o autoclismo (por omissão, norte se encostar à parede norte, senão sul). */
  back?: Dir
}

/** Lanço reto a subir para norte. */
export type StraightStair = {
  kind?: 'straight'
  x: number
  w: number
  /** y do último espelho (chegada ao piso superior). */
  topY: number
  treads: number
  going: number
  /** Altura de corte do desenho em planta, em nº de degraus. */
  cutAt: number
  /** Arrumação por baixo dos degraus, entre y0 e y1. */
  underFill?: { y0: number; y1: number }
}

/**
 * Escada com patamar junto à fachada poente e 2.º lanço a subir para nascente.
 * O 1.º lanço sobe para norte até ao patamar (em L) ou para poente, paralelo ao 2.º (em U).
 */
export type LStair = {
  kind: 'l'
  /** Largura do 2.º lanço e do patamar (medida na direção x). */
  w: number
  /** y do lado norte do patamar e do 2.º lanço. */
  bandY: number
  /** Retângulo ocupado pelo 1.º lanço; o primeiro espelho fica no lado oposto ao patamar. */
  flight1: Rect & { dir: 'n' | 'w' }
  /** Canto da viragem: patamar ou, com `winders`, degraus em leque. */
  landing: Rect
  /** Degraus em leque no canto, em vez do patamar (só em L). */
  winders?: number
  /** Armário embutido por baixo do 2.º lanço, de x0 até x1 (ou até à chegada), na faixa y…y+h. */
  underFill?: { x0: number; x1?: number; y: number; h: number }
  treads1: number
  treads2: number
  going: number
  /** x do último espelho (chegada ao sótão). */
  xTop: number
  /** Degraus do 2.º lanço desenhados abaixo do plano de corte. */
  cutAt: number
}

export type Stair = StraightStair | LStair

export type Dimension = { x1: number; y1: number; x2: number; y2: number; text?: string }

export type Plan = {
  dimensions?: Dimension[]
  rooms: Room[]
  walls: Wall[]
  doors: Door[]
  windows: Window[]
  furniture: Furniture[]
  stair?: Stair
  ceilingOpenings?: Rect[]
  /** Pé-direito livre. */
  ceiling?: number
  /** Subida do pavimento face ao existente (baixa os peitoris relativos). */
  floorRaise?: number
}
