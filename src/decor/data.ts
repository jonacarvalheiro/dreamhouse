import { GLASS_BLOCK } from '@/plan/common'
import { DOOR_H, LAMBRIM, type RoomQuantities } from './quantities'

export type Swatch = { name: string; hex: string; where: string }

export type FinishKind = 'tile' | 'paint' | 'wood' | 'floor' | 'diagonal' | 'blocks' | 'wallpaper' | 'length'

export type Finish = {
  zone: string
  material: string
  /** m² medidos (nº de blocos para 'blocks', metros para 'length'); null quando não se aplica. */
  area: (q: RoomQuantities) => number | null
  kind: FinishKind
  /** Área de uma peça, para dizer quantas peças encomendar. */
  piece?: number
}

export type Ambiente = {
  id: string
  name: string
  mood: string
  image: string
  /** De onde foi tirada a imagem, na planta da Proposta A. */
  view: string
  /** Segunda imagem no mesmo estilo, com o que a primeira não mostra (o duche, o resto do quarto). */
  alt?: { mainLabel: string; label: string; image: string; view: string }
  /** Renders Blender a partir da planta; extra, não substituem `image`/`alt`. */
  extra?: { label: string; image: string; view: string }[]
  /** Alternativas para a parede da cabeceira; a primeira é a de `image` e `finishes`. */
  headWalls?: HeadWallOption[]
  palette: Swatch[]
  finishes: Finish[]
  fixtures: string[]
  tips: string[]
}

export type HeadWallOption = {
  id: string
  name: string
  note: string
  image: string
  /** Substituem os acabamentos com zona "Parede da cabeceira". */
  finishes: Finish[]
}

export type DecorRoom = {
  id: 'wc' | 'wcsuite' | 'suite' | 'quarto2' | 'hall'
  name: string
  /** O que a planta obriga (medidas, luz, posições) e que vale para todos os ambientes. */
  layout: string[]
  ambientes: Ambiente[]
}

const PINHO: Swatch = { name: 'Pinho do teto', hex: '#C68A4E', where: 'Teto existente, mantém-se' }

const ceiling = (): Finish => ({
  zone: 'Teto (pinho existente)',
  material: 'Limpar, lixar à mão (grão 180) e 2 demãos de verniz aquoso mate incolor, que não amarelece mais o pinho',
  area: (q) => q.floor,
  kind: 'wood',
})

const ceilingWet = (): Finish => ({
  ...ceiling(),
  material: 'Limpar, lixar à mão (grão 180) e 2 demãos de verniz aquoso mate para zonas húmidas (anti-fungos). Selar bem as juntas por cima do duche',
})

const blocks = (finish: string): Finish => ({
  zone: 'Divisória do duche',
  material: `Blocos de vidro 19×19×8 cm ${finish}, assentes com argamassa própria e varão de aço inox nas juntas, até ${GLASS_BLOCK.h.toFixed(2).replace('.', ',')} m (não tocam no teto de madeira)`,
  area: (q) => (q.glassBlocks.length ? q.glassBlocks.reduce((s, g) => s + g.blocks, 0) : null),
  kind: 'blocks',
})

const walkInFloor = (material: string): Finish => ({
  zone: 'Chão, incluindo o duche',
  material: `${material}. Duche de nível, sem base: impermeabilização com tela, pendente de 1,5 % e ralo linear de 70 cm (o pavimento novo, 10 cm mais alto, dá altura para o sifão)`,
  area: (q) => q.floor,
  kind: 'floor',
})

const showerFeature = (material: string): Finish => ({
  zone: 'Parede maior do duche',
  material,
  area: (q) => (q.shower?.sides[0] ? q.shower.sides[0] * q.height : null),
  kind: 'tile',
})
const showerRest = (material: string): Finish => ({
  zone: 'Restantes paredes do duche',
  material,
  area: (q) => (q.shower && q.shower.sides.length > 1 ? q.shower.walls - q.shower.sides[0] * q.height : null),
  kind: 'tile',
})
const showerAll = (material: string): Finish => ({
  zone: 'Paredes do duche, até ao teto',
  material,
  area: (q) => q.shower?.walls ?? null,
  kind: 'tile',
})
const paint = (zone: string, material: string, area: Finish['area']): Finish => ({ zone, material, area, kind: 'paint' })

/** Bancada do WC da suite, por baixo da janela N2. */
const SUITE_COUNTER = 1.45
const WCS_WINDOW_VIEW = 'Da zona da bancada, a olhar para norte: N2 à esquerda, a partir do canto, com a bancada por baixo e o lavatório na ponta direita; sanita no canto da direita. O duche fica atrás da câmara (segunda imagem).'
const WCS_SHOWER_VIEW = 'Do lado da bancada, a olhar para sul pelo braço do L: blocos de vidro de frente na metade nascente (à esquerda), chuveiro na parede da esquerda (nascente, a que encontra o vidro) e, nessa mesma parede, um nicho recuado de 0,30 × 0,60 m para champôs, já dentro da zona molhada. Entrada de 0,61 m à direita e banco ao fundo, do lado poente. Sem janela no duche.'
const WC_VIEW =
  'Da porta de correr, a olhar para poente: quarto pequeno de 2,43 × 1,92 m, os três aparelhos à vista. Sanita à esquerda (sul); duche num canto de 0,90 m com ecrã de blocos de vidro; lavatório à direita (norte), a começar na linha do vidro. Chuveiro na parede sul. Teto plano de pinho a 2,45 m.'
const Q2_SOUTH_VIEW =
  'Da parte norte, a olhar para sul, no braço estreito de 2,43 m. À esquerda, a parede nascente vai ao teto plano: as portas de correr dos roupeiros acompanham a escada (altas no canto em L, a descer até aos gavetões junto à cabeceira) e, por cima delas, o lambrim e o estuque fecham o triângulo — não há vazio de ar. Cama 140 ao centro; W1 à direita, ao lado da cama.'
const Q2_NORTH_VIEW =
  'Dos pés da cama, a olhar para norte. À direita, os roupeiros na face da escada, encostados à parede nascente, sem recanto, closet nem porta ao lado. Ao fundo, a N1 com a secretária; à esquerda, a estante. A porta do quarto fica na faixa norte de 3,43 m, neste quadro fora de vista. Teto plano de pinho a 2,45 m.'
const SUITE_SOUTH_VIEW =
  'Da cabeceira, a olhar para sul: sacada ao fundo, E1 na parede nascente (à esquerda) com o cadeirão no canto, porta do corredor na parede poente (à direita) e a cómoda no canto sudoeste, junto à sacada.'

/** Faixa de hidráulico 20×20 do ambiente travertino. */
const BAND = 0.2
const WCS_BENCH = 'Banco embutido de 0,35 m na parede poente do duche, ao fundo, depois da entrada'

/** Lavatório do WC partilhado, na parede norte. */
const WC_SINK = 0.75

/** Área da parede da cabeceira entre duas alturas, sem as portas que lá abrem. */
const headBand = (q: RoomQuantities, from: number, to: number) =>
  q.headWall ? q.headWall * (to - from) - (q.headDoors ?? 0) * Math.max(0, Math.min(to, DOOR_H) - from) : null
const headWall = (q: RoomQuantities) => headBand(q, 0, q.height)
const otherWalls = (q: RoomQuantities) => q.wallsNet - (headWall(q) ?? 0)

/** Arco pintado atrás da cama: 2,00 m de largura, 2,10 m de altura no topo. */
const ARCH = { w: 2.0, h: 2.1 }
const archArea = ARCH.w * (ARCH.h - ARCH.w / 2) + (Math.PI * (ARCH.w / 2) ** 2) / 2
/** Altura da meia parede e do lambrim da suite. */
const DADO = 1.3
/** Rolo de papel de 0,53 × 10,05 m: dá 3 tiras de 2,45 m com o encaixe do desenho, o resto é sobra. */
const ROLL = 3 * 0.53 * 2.45

/** Treliça do corredor: quadrados de 30 cm entre réguas de 10 cm, a 45°. */
const TRELICA = { tile: 0.3, strip: 0.1 }
const trelicaShare = (TRELICA.tile * TRELICA.tile) / ((TRELICA.tile + TRELICA.strip) * (TRELICA.tile + TRELICA.strip))

export const decorRooms: DecorRoom[] = [
  {
    id: 'wc',
    name: 'WC partilhado',
    layout: [
      'É um retângulo compacto de 2,43 × 1,92 m (~4,7 m²), não um corredor. Sem janela: só luz artificial e extração mecânica. Os blocos de vidro deixam passar a luz do teto para dentro do duche.',
      'Entra-se pela porta de correr na parede nascente (do átrio da escada). Os três aparelhos cabem no mesmo quadro: sanita suspensa na parede sul, duche de 1,10 × 0,90 m no canto sudoeste e lavatório de 0,75 m na parede norte, a começar na linha dos blocos de vidro (1,10 m da parede poente).',
      'O duche é um canto aberto de 90 cm, não um túnel: ecrã de blocos de vidro (0,80 m a partir da sul, 4 × 10), sem moldura de parede, chuveiro de braço na parede sul (a que encontra o vidro) e nicho recuado de 0,30 × 0,60 m já dentro da zona molhada. O vidro e o extremo poente do tampo estão no mesmo plano; ao meio fica a entrada (~0,67 m).',
    ],
    ambientes: [
      {
        id: 'madeira-azul',
        name: 'Madeira e hidráulico azul',
        mood: 'A primeira referência nova: tampo flutuante de madeira maciça com lavatório de pedra, hidráulico azul-acinzentado e creme atrás do lavatório e no duche, espelho em arco e lanternas pretas. O chão claro, efeito travertino, dá luz a um WC sem janela.',
        image: '/decor/wc-madeira-azul-v24.jpg',
        view: WC_VIEW,
        palette: [
          PINHO,
          { name: 'Cal quente', hex: '#ECE3D3', where: 'Paredes' },
          { name: 'Azul-acinzentado', hex: '#55697A', where: 'Hidráulico' },
          { name: 'Travertino', hex: '#D8CBB5', where: 'Chão' },
          { name: 'Carvalho velho', hex: '#8A6440', where: 'Tampo do lavatório' },
          { name: 'Latão escovado', hex: '#B08D57', where: 'Torneiras' },
        ],
        finishes: [
          showerAll('Hidráulico 20×20 azul-acinzentado e creme (ou porcelânico com o mesmo desenho, sem manutenção)'),
          { zone: 'Lambrim atrás do lavatório', material: 'O mesmo hidráulico, até 1,20 m, à largura do tampo mais 0,20 m de cada lado', area: () => (WC_SINK + 0.4) * LAMBRIM, kind: 'tile' },
          blocks('incolor ondulado'),
          paint('Outras paredes', 'Tinta acrílica para WC, anti-humidade, cor cal quente (mate lavável) ou estuque à cal', (q) => q.wallsNet - (WC_SINK + 0.4) * LAMBRIM),
          walkInFloor('Porcelânico 60×60 efeito travertino amaciado, antiderrapante R10 (R11 dentro do duche)'),
          ceilingWet(),
        ],
        fixtures: [
          'Tampo flutuante de carvalho maciço oleado, 0,75 × 0,45 m e 8 cm de espessura, com lavatório de pousar em pedra creme',
          'Torneira de parede e misturadora do duche em latão escovado; chuveiro de braço na parede sul, a que encontra os blocos de vidro (não no teto de madeira)',
          'Nicho recuado de 0,30 × 0,60 m na parede do duche (zona molhada), forrado com o mesmo hidráulico, para champôs',
          'Espelho em arco com moldura de carvalho e duas lanternas pretas de parede IP44',
          'Sanita suspensa com autoclismo embutido e placa em latão; cesto de vime',
        ],
        tips: [
          'Num WC sem janela, a luz é toda artificial: ponham uma luz geral quente (2700 K) e as lanternas só para ambiente. Um extrator com temporizador protege o teto de madeira.',
          'O hidráulico verdadeiro é poroso: precisa de selante antes de assentar e uma vez por ano.',
        ],
      },
      {
        id: 'terrazzo',
        name: 'Terrazzo e barro',
        mood: 'A segunda referência nova: terrazzo creme com pedrinhas terracota no duche e no tampo, blocos de vidro e chão de mosaico irregular cor de barro.',
        image: '/decor/wc-terrazzo-v24.jpg',
        view: WC_VIEW,
        palette: [
          PINHO,
          { name: 'Terrazzo creme', hex: '#E6DACB', where: 'Duche e tampo' },
          { name: 'Barro vermelho', hex: '#9E4A2F', where: 'Chão' },
          { name: 'Cal', hex: '#F1EBE1', where: 'Paredes' },
          { name: 'Latão', hex: '#B08D57', where: 'Torneiras' },
        ],
        finishes: [
          showerAll('Terrazzo creme com pedrinhas terracota e cinza (placas de 60×60 ou porcelânico efeito terrazzo)'),
          blocks('incolor liso'),
          paint('Outras paredes', 'Estuque liso cor de cal com tinta para WC', (q) => q.wallsNet),
          walkInFloor('Mosaico irregular de barro vidrado vermelho-acastanhado, em malha (antiderrapante pelas juntas)'),
          ceilingWet(),
        ],
        fixtures: [
          'Tampo flutuante de terrazzo de 0,75 m com lavatório branco retangular e torneira de latão',
          'Nicho recuado de 0,30 × 0,60 m na parede do duche (zona molhada), forrado a terrazzo, para champôs',
          'Espelho redondo simples; sanita suspensa com placa branca',
          'Jarra de cerâmica com erva-das-pampas',
        ],
        tips: ['O mosaico pequeno no chão tem muitas juntas: usem betume epóxi no duche, que não ganha manchas.'],
      },
      {
        id: 'amarelo',
        name: 'Mostarda e hidráulico',
        mood: 'Uma variante amarela: zellige mostarda no duche, por trás dos blocos de vidro, e chão hidráulico creme, mostarda e terracota. Com o pinho por cima, fica um WC quente mesmo sem janela.',
        image: '/decor/wc-amarelo-v24.jpg',
        view: WC_VIEW,
        palette: [
          PINHO,
          { name: 'Mostarda', hex: '#D19A2E', where: 'Zellige do duche' },
          { name: 'Branco quente', hex: '#F4EFE6', where: 'Paredes' },
          { name: 'Terracota', hex: '#C0623B', where: 'Chão' },
          { name: 'Latão', hex: '#B08D57', where: 'Torneiras e espelho' },
        ],
        finishes: [
          showerAll('Zellige ou azulejo artesanal 10×10 amarelo-mostarda, brilhante, junta clara'),
          blocks('incolor ondulado'),
          paint('Outras paredes', 'Tinta acrílica para WC, branco quente mate', (q) => q.wallsNet),
          walkInFloor('Hidráulico 20×20 (ou porcelânico) com padrão geométrico creme, mostarda e terracota'),
          ceilingWet(),
        ],
        fixtures: [
          'Móvel suspenso de carvalho com lavatório branco e torneira de latão',
          'Nicho recuado de 0,30 × 0,60 m na parede do duche (zona molhada), forrado a zellige mostarda, para champôs',
          'Espelho redondo com moldura de latão e aplique IP44 em latão',
          'Sanita suspensa com placa em latão; chuveiro de braço na parede sul, junto ao vidro',
        ],
        tips: ['O zellige é irregular de propósito: peçam junta de 1,5–2 mm e não exijam planeza perfeita.'],
      },
      {
        id: 'hidraulico',
        name: 'Hidráulico terracota',
        mood: 'A referência do Pinterest: rosetas terracota e verde-salva na parede maior do duche, paredes cor de cal, chão de barro e bronze escuro.',
        image: '/decor/wc-hidraulico-v24.jpg',
        view: WC_VIEW,
        palette: [
          PINHO,
          { name: 'Cal creme', hex: '#EEE3D0', where: 'Paredes' },
          { name: 'Terracota', hex: '#C0623B', where: 'Hidráulico e chão' },
          { name: 'Verde-salva', hex: '#8E9C7A', where: 'Hidráulico' },
          { name: 'Bronze escuro', hex: '#4A3426', where: 'Torneiras' },
        ],
        finishes: [
          showerFeature('Hidráulico 20×20 com rosetas terracota, verde e creme (ou porcelânico efeito hidráulico)'),
          showerRest('Azulejo liso creme 7,5×30 ou zellige creme, junta cor de areia'),
          blocks('incolor ondulado'),
          paint('Outras paredes', 'Tinta acrílica para WC, anti-humidade, cor cal creme', (q) => q.wallsNet),
          walkInFloor('Tijoleira de barro 20×20 tratada, ou porcelânico efeito barro R10'),
          ceilingWet(),
        ],
        fixtures: [
          'Misturadora termostática e chuveiro de braço na parede sul, junto ao vidro, em bronze escuro',
          'Nicho recuado de 0,30 × 0,60 m na parede do duche (zona molhada), forrado ao hidráulico, para champôs',
          'Móvel de madeira maciça com lavatório branco e torneira em bronze; espelho redondo',
        ],
        tips: ['Comprem o hidráulico de uma só vez e do mesmo lote; as rosetas só fecham se o assentamento começar ao centro da parede.'],
      },
    ],
  },
  {
    id: 'wcsuite',
    name: 'WC da suite',
    layout: [
      'Luz natural só pela janela N2, na fachada norte: 1,17 m de largura × 1,045 m de altura (mais larga do que alta), peitoril a 0,975 m e topo a 2,02 m, 43 cm abaixo do teto. Começa no canto poente e ocupa metade da parede norte (2,34 m).',
      `Bancada de ${SUITE_COUNTER.toFixed(2).replace('.', ',')} m por baixo da N2 (fica ~12 cm abaixo do peitoril) e sanita suspensa no canto nordeste. O espelho não cabe por cima da janela: vai na parede poente, em braço extensível, ou numa faixa estreita à direita da janela.`,
      'Em L: ao fundo, a sul, o duche a toda a largura (1,41 × 0,90 m), sem base e sem janela. Os blocos de vidro fecham a frente do duche na metade nascente (0,80 m). O chuveiro fica na parede nascente, a que encontra o vidro; nessa parede, já dentro da zona molhada, um nicho recuado de 0,30 × 0,60 m para champôs e sabonetes. A entrada de 0,61 m fica do lado poente.',
      'Entra-se do closet por uma porta de correr embutida de 0,60 m, na parede poente, encostada à parede sul da zona da bancada; a folha recolhe para dentro da parede.',
    ],
    ambientes: [
      {
        id: 'madeira-ocre',
        name: 'Madeira e hidráulico ocre',
        mood: 'O exemplo escolhido: tampo flutuante de carvalho maciço por baixo da janela, lavatório de pedra, hidráulico ocre e creme até 1,20 m, paredes a cal quente e lanterna preta. O duche leva o mesmo hidráulico até ao teto, com um banco de carvalho.',
        image: '/decor/wcs-madeira-ocre-janela.jpg',
        view: WCS_WINDOW_VIEW,
        alt: { mainLabel: 'Bancada e janela', label: 'Duche', image: '/decor/wcs-madeira-ocre-duche-v4.jpg', view: WCS_SHOWER_VIEW },
        palette: [
          PINHO,
          { name: 'Ocre', hex: '#D2A13B', where: 'Hidráulico' },
          { name: 'Cal quente', hex: '#EDE3D1', where: 'Paredes' },
          { name: 'Carvalho velho', hex: '#8A6440', where: 'Tampo e banco' },
          { name: 'Travertino', hex: '#D8CBB5', where: 'Chão' },
          { name: 'Latão', hex: '#B08D57', where: 'Torneiras e chuveiro' },
        ],
        finishes: [
          showerAll('Hidráulico 20×20 ocre e creme até ao teto (ou porcelânico com o mesmo desenho)'),
          { zone: 'Lambrim fora do duche', material: 'O mesmo hidráulico até 1,20 m', area: (q) => q.lambrim, kind: 'tile' },
          blocks('incolor ondulado'),
          paint('Paredes acima de 1,20 m', 'Estuque à cal ou tinta para WC, cal quente', (q) => Math.max(0, q.wallsNet - q.lambrim)),
          walkInFloor('Porcelânico 60×60 efeito travertino, R10 (R11 no duche)'),
          ceilingWet(),
        ],
        fixtures: [
          `Tampo flutuante de carvalho maciço oleado, ${SUITE_COUNTER.toFixed(2).replace('.', ',')} × 0,50 m e 8 cm de espessura, 12 cm abaixo do peitoril; lavatório de pedra creme na ponta direita`,
          'Torneira de parede em latão escovado, logo à direita da janela; lanterna preta IP44 entre a janela e a sanita',
          'Espelho de braço extensível em latão na parede poente (por cima da bancada só há janela)',
          `${WCS_BENCH}, com tampo de carvalho oleado; chuveiro de braço na parede nascente, junto ao vidro, e misturadora em latão`,
          'Nicho recuado de 0,30 × 0,60 m na parede do duche (zona molhada), forrado com o mesmo hidráulico, para champôs e sabonetes',
          'Sanita suspensa com placa em latão',
        ],
        tips: [
          'A madeira junto ao lavatório e no banco tem de levar óleo de bancada (tipo hardwax) e voltar a ser oleada uma vez por ano.',
          'A janela fica a 12 cm da bancada: o peitoril leva o mesmo hidráulico ou uma pedra, com pendente para fora, porque vai molhar.',
        ],
      },
      {
        id: 'travertino',
        name: 'Travertino e hidráulico',
        mood: 'Bancada de travertino por baixo da janela, zellige creme até 1,20 m, uma faixa de hidráulico terracota e verde à altura do peitoril e chão de barro. No duche, zellige creme até ao teto com a mesma faixa.',
        image: '/decor/wcs-travertino-janela.jpg',
        view: WCS_WINDOW_VIEW,
        alt: { mainLabel: 'Bancada e janela', label: 'Duche', image: '/decor/wcs-travertino-duche-v3.jpg', view: WCS_SHOWER_VIEW },
        palette: [
          PINHO,
          { name: 'Travertino', hex: '#D9C7AA', where: 'Bancada e banco' },
          { name: 'Creme', hex: '#EADFCB', where: 'Zellige e paredes' },
          { name: 'Terracota', hex: '#C0623B', where: 'Faixa e chão' },
          { name: 'Bronze escuro', hex: '#4A3426', where: 'Torneiras' },
        ],
        finishes: [
          {
            zone: 'Paredes do duche, até ao teto',
            material: 'Zellige creme 10×10, sem a faixa',
            area: (q) => (q.shower ? q.shower.walls - BAND * q.shower.sides.reduce((s, v) => s + v, 0) : null),
            kind: 'tile',
          },
          { zone: 'Lambrim fora do duche', material: 'O mesmo zellige creme até 1,20 m, sem a faixa', area: (q) => q.lambrim * (1 - BAND / LAMBRIM), kind: 'tile' },
          {
            zone: 'Faixa de hidráulico',
            material: 'Uma fiada de hidráulico 20×20 entre a bancada e o peitoril da N2, a toda a volta e também dentro do duche',
            area: (q) => BAND * (q.lambrim / LAMBRIM + (q.shower?.sides.reduce((s, v) => s + v, 0) ?? 0)),
            kind: 'tile',
          },
          blocks('incolor ondulado'),
          paint('Paredes acima de 1,20 m', 'Tinta acrílica para WC, creme mate', (q) => Math.max(0, q.wallsNet - q.lambrim)),
          walkInFloor('Tijoleira de barro 20×20 tratada, ou porcelânico efeito barro R10'),
          ceilingWet(),
        ],
        fixtures: [
          `Bancada flutuante de travertino amaciado e selado, ${SUITE_COUNTER.toFixed(2).replace('.', ',')} × 0,50 m, com um lavatório de pousar na ponta direita`,
          'Torneira de parede em bronze escuro, logo à direita da janela',
          'Espelho de braço extensível em bronze na parede poente',
          `${WCS_BENCH}, com tampo de travertino`,
          'Sanita suspensa com placa em bronze; chuveiro de braço na parede nascente, junto ao vidro',
          'Nicho recuado de 0,30 × 0,60 m na parede do duche (zona molhada), forrado a zellige, para champôs e sabonetes',
        ],
        tips: ['O travertino tem de ir preenchido e selado (amaciado) para não guardar água; a bancada fica a 12 cm do peitoril, por isso o peitoril leva a mesma pedra.'],
      },
      {
        id: 'terrazzo',
        name: 'Terrazzo e barro',
        mood: 'Terrazzo creme com pedrinhas terracota na bancada, no lambrim e no duche inteiro, com banco; blocos de vidro lisos e chão de mosaico de barro desde a porta até ao ralo.',
        image: '/decor/wcs-terrazzo-janela.jpg',
        view: WCS_WINDOW_VIEW,
        alt: { mainLabel: 'Bancada e janela', label: 'Duche', image: '/decor/wcs-terrazzo-duche-v2.jpg', view: WCS_SHOWER_VIEW },
        palette: [
          PINHO,
          { name: 'Terrazzo creme', hex: '#E6DACB', where: 'Bancada, lambrim, duche e banco' },
          { name: 'Barro vermelho', hex: '#9E4A2F', where: 'Chão' },
          { name: 'Cal', hex: '#F1EBE1', where: 'Paredes' },
          { name: 'Latão', hex: '#B08D57', where: 'Torneiras' },
        ],
        finishes: [
          showerAll('Terrazzo creme com pedrinhas terracota, até ao teto'),
          { zone: 'Lambrim fora do duche', material: 'O mesmo terrazzo até 1,20 m', area: (q) => q.lambrim, kind: 'tile' },
          blocks('incolor liso'),
          paint('Paredes acima de 1,20 m', 'Estuque liso cor de cal com tinta para WC', (q) => Math.max(0, q.wallsNet - q.lambrim)),
          walkInFloor('Mosaico irregular de barro vidrado vermelho-acastanhado'),
          ceilingWet(),
        ],
        fixtures: [
          `Bancada de terrazzo de ${SUITE_COUNTER.toFixed(2).replace('.', ',')} m por baixo da N2, com lavatório branco retangular na ponta direita`,
          'Torneira de parede e espelho extensível em latão escovado',
          `${WCS_BENCH}, em terrazzo`,
          'Misturadora e chuveiro de braço na parede nascente, junto ao vidro, em latão escovado; sanita suspensa com placa branca',
          'Nicho recuado de 0,30 × 0,60 m na parede do duche (zona molhada), forrado a terrazzo, para champôs e sabonetes',
        ],
        tips: ['O banco come 0,35 m dos 1,41 m do duche; se preferirem mais espaço, façam-no rebatível em madeira de teca.'],
      },
    ],
  },
  {
    id: 'suite',
    name: 'Quarto suite',
    layout: [
      'Luz natural pela janela de sacada nova (1,20 × 2,15 m) na parede sul, em frente aos pés da cama, e pela janela E1 (1,17 × 1,045 m) na parede nascente.',
      'Cama de 160×200 com a cabeceira na parede norte (do closet e do WC); porta do corredor na parede poente, junto ao canto sul.',
      'Cómoda no canto sudoeste e cadeirão no canto sudeste, por baixo da E1.',
    ],
    ambientes: [
      {
        id: 'terracota',
        name: 'Linho e terracota',
        mood: 'Parede da cabeceira em terracota suave, cabeceira estofada em linho e cortinas de linho cru na sacada.',
        image: '/decor/suite-terracota.jpg',
        alt: { mainLabel: 'Lado da cama', label: 'Resto do quarto', image: '/decor/suite-terracota-sul.jpg', view: SUITE_SOUTH_VIEW },
        view: 'Da porta do corredor, a olhar para nascente: cabeceira à esquerda, E1 ao fundo, sacada à direita.',
        palette: [
          PINHO,
          { name: 'Terracota suave', hex: '#B9644A', where: 'Parede da cabeceira' },
          { name: 'Branco cal', hex: '#F4EFE6', where: 'Outras paredes' },
          { name: 'Linho cru', hex: '#DCD2C0', where: 'Cabeceira e cortinas' },
          { name: 'Carvalho claro', hex: '#C9A57A', where: 'Chão' },
        ],
        finishes: [
          paint('Parede da cabeceira', 'Tinta mate terracota suave (ou tinta à cal pigmentada)', headWall),
          paint('Outras paredes', 'Tinta mate branco cal', otherWalls),
          { zone: 'Chão', material: 'Soalho ou flutuante de carvalho natural claro, mate, tábua larga', area: (q) => q.floor, kind: 'floor' },
          ceiling(),
        ],
        fixtures: [
          'Cabeceira estofada em linho natural; roupa de cama de linho branco com manta terracota',
          'Mesas de cabeceira de carvalho com candeeiros de cerâmica',
          'Cortinas de linho cru até ao chão na sacada, com varão à altura do teto',
          'Candeeiro suspenso de linho no ponto de luz existente; tapete de juta',
          'Cadeirão verde-salva por baixo da E1',
        ],
        tips: ['Uma parede inteira em terracota é forte com o pinho por cima: testem 1 m² com a luz da tarde, que entra pela sacada.'],
      },
      {
        id: 'salvia',
        name: 'Verde-salva e carvalho',
        mood: 'Mais sereno: parede da cabeceira verde-salva, cabeceira de carvalho, apliques de latão e candeeiro de vime.',
        image: '/decor/suite-salvia.jpg',
        alt: { mainLabel: 'Lado da cama', label: 'Resto do quarto', image: '/decor/suite-salvia-sul.jpg', view: SUITE_SOUTH_VIEW },
        view: 'Da porta do corredor, a olhar para nascente.',
        palette: [
          PINHO,
          { name: 'Verde-salva', hex: '#9AA88F', where: 'Parede da cabeceira' },
          { name: 'Branco quente', hex: '#F3EEE4', where: 'Outras paredes' },
          { name: 'Linho natural', hex: '#D8CDB8', where: 'Cortinas' },
          { name: 'Latão', hex: '#B08D57', where: 'Apliques' },
        ],
        finishes: [
          paint('Parede da cabeceira', 'Tinta mate verde-salva', headWall),
          paint('Outras paredes', 'Tinta mate branco quente', otherWalls),
          { zone: 'Chão', material: 'Soalho ou flutuante de carvalho natural claro, mate', area: (q) => q.floor, kind: 'floor' },
          ceiling(),
        ],
        fixtures: [
          'Cama com cabeceira de carvalho maciço; linho verde-salva e creme',
          'Dois apliques de latão de braço, um de cada lado da cama (pontos de luz na parede, sem mexer no teto)',
          'Candeeiro suspenso de vime; cadeira de palhinha por baixo da E1',
        ],
        tips: ['Os apliques de parede libertam as mesas de cabeceira e evitam roços no teto de madeira.'],
      },
      {
        id: 'ocre',
        name: 'Ocre e linho',
        mood: 'A variante amarela: parede da cabeceira em tinta à cal ocre, manta mostarda e almofadas terracota. Com a luz da sacada ao fim da tarde, o quarto fica dourado.',
        image: '/decor/suite-ocre.jpg',
        alt: { mainLabel: 'Lado da cama', label: 'Resto do quarto', image: '/decor/suite-ocre-sul.jpg', view: SUITE_SOUTH_VIEW },
        view: 'Da porta do corredor, a olhar para nascente.',
        headWalls: [
          {
            id: 'cal',
            name: 'Cal ocre inteira',
            note: 'A parede toda em tinta à cal ocre, com nuvem de trincha. A mais simples e a mais quente.',
            image: '/decor/suite-ocre.jpg',
            finishes: [paint('Parede da cabeceira', 'Tinta à cal ocre, aplicada à trincha em cruz para dar nuvem', headWall)],
          },
          {
            id: 'meia',
            name: 'Meia parede com prateleira',
            note: `Ocre até ${DADO.toFixed(2).replace('.', ',')} m e creme por cima, com uma prateleira fina de carvalho na junta para quadros e jarras. Baixa o peso do amarelo e dá apoio por cima da cabeceira.`,
            image: '/decor/suite-ocre-meia.jpg',
            finishes: [
              paint('Cabeceira, até 1,30 m', 'Tinta à cal ocre, com nuvem de trincha', (q) => headBand(q, 0, DADO)),
              paint('Cabeceira, acima de 1,30 m', 'Tinta à cal creme', (q) => headBand(q, DADO, q.height)),
              { zone: 'Prateleira', material: 'Ripa de carvalho maciço 12 × 3 cm a 1,30 m, do vão do closet até ao canto, fixa com esquadros escondidos', area: (q) => (q.headWall ? q.headWall - (q.headDoors ?? 0) : null), kind: 'length' },
            ],
          },
          {
            id: 'arco',
            name: 'Arco pintado',
            note: `Parede creme com um arco ocre de ${ARCH.w.toFixed(2).replace('.', ',')} m de largura e ${ARCH.h.toFixed(2).replace('.', ',')} m de altura, centrado na cama. Faz de cabeceira sem obra; risca-se com um fio e um lápis a partir do centro.`,
            image: '/decor/suite-ocre-arco.jpg',
            finishes: [
              paint('Arco atrás da cama', 'Tinta à cal ocre, com nuvem de trincha', () => archArea),
              paint('Resto da parede da cabeceira', 'Tinta à cal creme', (q) => {
                const a = headWall(q)
                return a === null ? null : a - archArea
              }),
            ],
          },
          {
            id: 'lambrim',
            name: 'Lambrim de madeira',
            note: `Lambrim de tábua macheada de 10 cm até ${DADO.toFixed(2).replace('.', ',')} m, pintado mostarda, com remate de madeira; creme por cima. Protege a parede da cabeceira e lembra o teto sem o repetir.`,
            image: '/decor/suite-ocre-lambrim.jpg',
            finishes: [
              { zone: 'Lambrim da cabeceira', material: 'Tábua macheada de pinho 10 cm na vertical, sobre ripado, com remate superior', area: (q) => headBand(q, 0, DADO), kind: 'wood' },
              paint('Pintura do lambrim', 'Esmalte aquoso acetinado mostarda, 2 demãos sobre primário', (q) => headBand(q, 0, DADO)),
              paint('Cabeceira, acima do lambrim', 'Tinta à cal creme', (q) => headBand(q, DADO, q.height)),
            ],
          },
          {
            id: 'papel',
            name: 'Papel de parede floral',
            note: 'Papel mate com ramagens ocre e terracota sobre creme, do chão ao teto. É a mais decorativa: o resto do quarto fica liso.',
            image: '/decor/suite-ocre-papel.jpg',
            finishes: [
              { zone: 'Parede da cabeceira', material: 'Papel de parede mate não tecido, desenho floral ocre e terracota (rolos de 0,53 × 10 m)', area: headWall, kind: 'wallpaper', piece: ROLL },
            ],
          },
        ],
        palette: [
          PINHO,
          { name: 'Ocre', hex: '#D7A53E', where: 'Parede da cabeceira' },
          { name: 'Branco quente', hex: '#F4EFE6', where: 'Outras paredes' },
          { name: 'Mostarda', hex: '#C9962F', where: 'Manta' },
          { name: 'Terracota', hex: '#C0623B', where: 'Almofadas' },
          { name: 'Carvalho claro', hex: '#C9A57A', where: 'Chão' },
        ],
        finishes: [
          paint('Parede da cabeceira', 'Tinta à cal ocre, aplicada à trincha em cruz para dar nuvem', headWall),
          paint('Outras paredes', 'Tinta mate branco quente', otherWalls),
          { zone: 'Chão', material: 'Soalho ou flutuante de carvalho natural claro, mate', area: (q) => q.floor, kind: 'floor' },
          ceiling(),
        ],
        fixtures: [
          'Cabeceira de carvalho e palhinha; linho creme com manta mostarda e almofadas terracota',
          'Cortinas de linho natural na sacada; tapete creme às riscas',
          'Cadeirão bouclé creme por baixo da E1',
        ],
        tips: ['A tinta à cal pede parede mineral (estuque ou reboco); sobre tinta plástica antiga é preciso um primário próprio.'],
      },
    ],
  },
  {
    id: 'quarto2',
    name: 'Quarto 2',
    layout: [
      'O quarto é em L. A norte, 3,43 × 1,72 m (secretária sob a N1, estante e porta). A sul, só 2,43 m de largura: a escada come 0,90 m a partir do canto em L (a 1,72 m da parede norte).',
      'A porta do corredor tem 0,70 m e fica no alvéolo norte, na parede nascente (y 0,69–1,39). Entre a porta e o canto da escada há só 33 cm; a folha abre 70 cm para dentro, por isso a cómoda é de 0,60 × 0,40 m, no fundo do alvéolo, e não encosta à porta.',
      'Luz natural pela N1 (1,17 × 1,045 m) sobre a secretária e pela W1 (1,17 × 1,045 m) ao lado da cama.',
      'Cama de 140×190 com a cabeceira na parede do WC, a sul: 0,51 m livres até à W1 e 0,52 m até aos roupeiros.',
      'Roupeiros debaixo da escada, 0,90 m de fundo, abertos para o quarto na parede nascente do braço sul: as portas acompanham a escada (~2,05 m no canto em L, a descer até ~0,30 m nos gavetões junto à cabeceira). Por cima das portas a parede segue até ao teto plano — não há um prisma triangular com ar por cima. Não há closet nem recanto ao lado do armário: a porta de 0,70 m está na parede nascente da faixa norte, no mesmo quarto.',
    ],
    ambientes: [
      {
        id: 'salvia',
        name: 'Verde-salva e pinho',
        mood: 'Para crescer com ele: lambrim verde-salva com uma ripa de pinho a 1,20 m, cama e roupeiros de pinho, linho verde e creme.',
        image: '/decor/q2-salvia-v25.jpg',
        alt: { mainLabel: 'Lado da cama', label: 'Secretária', image: '/decor/q2-salvia-norte-v25.jpg', view: Q2_NORTH_VIEW },
        view: Q2_SOUTH_VIEW,
        palette: [
          PINHO,
          { name: 'Verde-salva', hex: '#8FA184', where: 'Lambrim até 1,20 m' },
          { name: 'Branco quente', hex: '#F3EEE4', where: 'Parede de cima' },
          { name: 'Creme', hex: '#E8DECB', where: 'Têxteis e tapete' },
          { name: 'Carvalho claro', hex: '#C9A57A', where: 'Chão' },
        ],
        finishes: [
          paint(`Lambrim pintado até ${LAMBRIM.toFixed(2).replace('.', ',')} m`, 'Esmalte aquoso acetinado verde-salva (lavável)', (q) => q.lambrim),
          paint('Parede acima do lambrim', 'Tinta mate branco quente', (q) => Math.max(0, q.wallsNet - q.lambrim)),
          { zone: 'Chão', material: 'Flutuante de carvalho claro AC4 (resistente a riscos)', area: (q) => q.floor, kind: 'floor' },
          ceiling(),
        ],
        fixtures: [
          'Cama 140×190 em pinho maciço com cabeceira baixa; uma mesa de cabeceira de 0,35 m de cada lado',
          'Roupeiros sob a escada com portas de correr em pinho, o topo a acompanhar a escada; acima das portas a parede vai ao teto',
          'Secretária de madeira por baixo da N1; cómoda de 0,60 × 0,40 m no fundo do alvéolo da porta, para a folha abrir',
          'Tapete redondo creme lavável; candeeiro suspenso simples no ponto de luz existente',
        ],
        tips: ['O lambrim em esmalte acetinado aguenta pés, bolas e cadeiras; o mate fica só por cima.'],
      },
      {
        id: 'azul',
        name: 'Azul petróleo e ocre',
        mood: 'Meia parede e roupeiros em azul petróleo, a cor complementar do pinho, com cortinas e almofadas ocre e um mapa-mundo por cima da cama.',
        image: '/decor/q2-azul-v25.jpg',
        alt: { mainLabel: 'Lado da cama', label: 'Secretária', image: '/decor/q2-azul-norte-v25.jpg', view: Q2_NORTH_VIEW },
        view: Q2_SOUTH_VIEW,
        palette: [
          PINHO,
          { name: 'Azul petróleo', hex: '#24506B', where: 'Lambrim e roupeiros' },
          { name: 'Branco quente', hex: '#F3EEE4', where: 'Parede de cima' },
          { name: 'Ocre', hex: '#D4A53A', where: 'Cortinas e almofadas' },
          { name: 'Carvalho claro', hex: '#C9A57A', where: 'Chão e cama' },
        ],
        finishes: [
          paint(`Lambrim pintado até ${LAMBRIM.toFixed(2).replace('.', ',')} m`, 'Esmalte aquoso acetinado azul petróleo', (q) => q.lambrim),
          paint('Parede acima do lambrim', 'Tinta mate branco quente', (q) => Math.max(0, q.wallsNet - q.lambrim)),
          { zone: 'Chão', material: 'Flutuante de carvalho claro AC4', area: (q) => q.floor, kind: 'floor' },
          ceiling(),
        ],
        fixtures: [
          'Cama 140×190 em carvalho; roupa de cama azul petróleo com almofadas ocre',
          'Portas de correr dos roupeiros lacadas no mesmo azul',
          'Cortinas de algodão ocre na W1 e na N1; tapete às riscas',
          'Secretária de carvalho por baixo da N1, estante estreita na parede poente e cómoda de 0,60 × 0,40 m no fundo do alvéolo da porta',
          'Mapa-mundo emoldurado por cima da cama',
        ],
        tips: ['O azul fica só até 1,20 m e nos roupeiros: com o teto de madeira por cima, uma parede inteira azul tornava o quarto escuro.'],
      },
      {
        id: 'amarelo',
        name: 'Amarelo-manteiga e oliva',
        mood: 'A variante amarela: lambrim amarelo-manteiga, roupeiros verde-oliva, manta girassol. Alegre sem ser infantil.',
        image: '/decor/q2-amarelo-v25.jpg',
        alt: { mainLabel: 'Lado da cama', label: 'Secretária', image: '/decor/q2-amarelo-norte-v25.jpg', view: Q2_NORTH_VIEW },
        view: Q2_SOUTH_VIEW,
        palette: [
          PINHO,
          { name: 'Amarelo-manteiga', hex: '#E8CC7A', where: 'Lambrim até 1,20 m' },
          { name: 'Verde-oliva', hex: '#7D8656', where: 'Roupeiros e roupa de cama' },
          { name: 'Girassol', hex: '#E0A82E', where: 'Manta e almofadas' },
          { name: 'Branco quente', hex: '#F3EEE4', where: 'Parede de cima' },
        ],
        finishes: [
          paint(`Lambrim pintado até ${LAMBRIM.toFixed(2).replace('.', ',')} m`, 'Esmalte aquoso acetinado amarelo-manteiga', (q) => q.lambrim),
          paint('Parede acima do lambrim', 'Tinta mate branco quente', (q) => Math.max(0, q.wallsNet - q.lambrim)),
          { zone: 'Chão', material: 'Flutuante de carvalho claro AC4', area: (q) => q.floor, kind: 'floor' },
          ceiling(),
        ],
        fixtures: [
          'Cama 140×190 em madeira natural; linho creme e oliva com manta girassol',
          'Portas de correr dos roupeiros lacadas verde-oliva',
          'Cortinas de algodão branco na W1 e na N1; tapete de juta redondo',
          'Secretária, estante e cómoda de 0,60 × 0,40 m em madeira natural, no fundo do alvéolo da porta',
        ],
        tips: ['Amarelo e pinho são da mesma família: mantenham o amarelo pálido (manteiga), senão a parede e o teto confundem-se.'],
      },
    ],
  },
  {
    id: 'hall',
    name: 'Corredor',
    layout: [
      'Sem janelas: a luz natural vem da porta de entrada, a norte, e do vão da cozinha, ao fundo a sul (0,69 m).',
      '1,23 × 6,32 m. Parede poente: porta do Quarto 2 junto à entrada e vão do átrio da escada ao fundo. Parede nascente: porta da suite ao fundo.',
      'Chão em treliça a 45°: réguas efeito madeira de 10 cm a enquadrar quadrados de 30 cm, como na fotografia de referência.',
    ],
    ambientes: [
      {
        id: 'trelica',
        name: 'Treliça e hidráulico floral',
        mood: 'Como na fotografia: réguas cor de madeira em treliça diagonal e quadrados creme com uma grinalda verde e uma flor terracota.',
        image: '/decor/corredor-trelica.jpg',
        view: 'Da porta de entrada, a olhar para sul até à cozinha.',
        palette: [
          PINHO,
          { name: 'Madeira média', hex: '#9C6B3F', where: 'Réguas do chão' },
          { name: 'Creme', hex: '#EFE6D3', where: 'Quadrados do chão' },
          { name: 'Verde-folha', hex: '#3F5A3A', where: 'Desenho' },
          { name: 'Terracota', hex: '#C0623B', where: 'Flor' },
          { name: 'Branco quente', hex: '#F4EFE6', where: 'Paredes' },
        ],
        finishes: [
          { zone: 'Quadrados do chão', material: 'Porcelânico ou hidráulico 30×30 creme com grinalda verde e flor terracota', area: (q) => q.floor * trelicaShare, kind: 'diagonal', piece: TRELICA.tile * TRELICA.tile },
          { zone: 'Réguas do chão', material: 'Porcelânico efeito madeira em réguas de 10 cm, cortadas a 40 cm', area: (q) => q.floor * (1 - trelicaShare), kind: 'diagonal', piece: TRELICA.strip * (TRELICA.tile + TRELICA.strip) },
          paint('Paredes', 'Tinta mate branco quente, lavável (zona de passagem)', (q) => q.wallsNet),
          { zone: 'Rodapé', material: 'Rodapé de madeira de 7 cm, tom das réguas', area: () => null, kind: 'wood' },
          ceiling(),
        ],
        fixtures: [
          'Apliques de parede simples a cada ~2 m, em vez de focos no teto de madeira',
          'Portas interiores em madeira com o tom das réguas',
        ],
        tips: [
          'A treliça a 45° gasta mais em cortes (contem 15 %) e deve arrancar ao eixo do corredor, para os meios quadrados ficarem iguais nas duas paredes.',
          'O corredor é a passagem para todas as divisões: assentem-no antes dos quartos e façam as soleiras ao mesmo nível (o pavimento sobe 10 cm em todo o bloco).',
        ],
      },
      {
        id: 'trelica-amarela',
        name: 'Treliça com amarelo',
        mood: 'A mesma treliça, com os quadrados creme desenhados a amarelo-mostarda e azul suave. Liga com os amarelos dos WC e dos quartos.',
        image: '/decor/corredor-amarelo.jpg',
        view: 'Da porta de entrada, a olhar para sul até à cozinha.',
        palette: [
          PINHO,
          { name: 'Madeira média', hex: '#9C6B3F', where: 'Réguas do chão' },
          { name: 'Creme', hex: '#EFE6D3', where: 'Quadrados do chão' },
          { name: 'Mostarda', hex: '#D19A2E', where: 'Desenho' },
          { name: 'Azul suave', hex: '#7E9BB5', where: 'Desenho' },
          { name: 'Branco quente', hex: '#F4EFE6', where: 'Paredes' },
        ],
        finishes: [
          { zone: 'Quadrados do chão', material: 'Porcelânico ou hidráulico 30×30 creme com desenho floral mostarda e azul', area: (q) => q.floor * trelicaShare, kind: 'diagonal', piece: TRELICA.tile * TRELICA.tile },
          { zone: 'Réguas do chão', material: 'Porcelânico efeito madeira em réguas de 10 cm, cortadas a 40 cm', area: (q) => q.floor * (1 - trelicaShare), kind: 'diagonal', piece: TRELICA.strip * (TRELICA.tile + TRELICA.strip) },
          paint('Paredes', 'Tinta mate branco quente, lavável', (q) => q.wallsNet),
          ceiling(),
        ],
        fixtures: ['Apliques de latão a cada ~2 m', 'Portas interiores em madeira'],
        tips: ['A treliça a 45° gasta mais em cortes (contem 15 %) e deve arrancar ao eixo do corredor.'],
      },
    ],
  },
]

export type Inspiration = { title: string; source: string; url: string; why: string }

export const bathInspiration: Inspiration[] = [
  {
    title: 'Duches com blocos de vidro',
    source: 'Pinterest',
    url: 'https://www.pinterest.com/innovatebuild/glass-block-showers/',
    why: 'Quase 900 duches com divisórias de blocos de vidro, retas e curvas, com e sem base.',
  },
  {
    title: 'Glass block shower wall',
    source: 'Pinterest',
    url: 'https://www.pinterest.com/sunnybunchchery/glass-block-shower-wall/',
    why: 'Meias-paredes de blocos a fechar o duche, com remates e juntas brancas.',
  },
  {
    title: 'Lavatório de pousar em madeira',
    source: 'Pinterest',
    url: 'https://www.pinterest.com/ideas/bathroom-bowl-sink-ideas-wood-vanity/949494246681/',
    why: 'Tampos flutuantes de madeira maciça com lavatório de pedra, como na vossa primeira imagem.',
  },
  {
    title: 'Paredes de duche em terrazzo',
    source: 'Pinterest',
    url: 'https://dk.pinterest.com/ideas/terrazzo-tile-shower-wall/960827726868/',
    why: 'Terrazzo no duche com barro e latão, na linha da imagem dos blocos de vidro.',
  },
  {
    title: 'Hidráulico com aspeto de cimento',
    source: 'Pinterest',
    url: 'https://www.pinterest.com/ideas/encaustic-look-porcelain-tile/928343988141/',
    why: 'Porcelânico com desenho de hidráulico: o mesmo efeito, sem selar todos os anos.',
  },
  {
    title: 'Madeira com hidráulico azul e terracota',
    source: 'DecorPad',
    url: 'https://www.decorpad.com/photo.htm?photoId=225224',
    why: 'Tampo de madeira com o canto natural, lavatório de pedra e hidráulico até ao teto.',
  },
  {
    title: 'Azulejo amarelo e blocos de vidro',
    source: 'Houzz',
    url: 'https://www.houzz.com/magazine/plain-primary-bathroom-transformed-into-a-warm-retreat-stsetivw-vs~185336778',
    why: 'Duche sem base, azulejo amarelo-manteiga, nogueira e blocos de vidro a deixar passar a luz.',
  },
  {
    title: 'Hidráulico em casas de banho pequenas',
    source: 'Para tu reforma',
    url: 'https://www.paratureforma.com/blog/pt-pt/banho/7-ideias-chave-para-decorar-casas-de-banho-pequenas-com-azulejos-hidraulicos/',
    why: 'Em português: o desenho só no duche ou atrás do lavatório, para o WC não parecer mais pequeno.',
  },
]

/** Quebras e cortes a somar ao medido. */
export const WASTE: Record<FinishKind, number> = { tile: 0.1, floor: 0.1, diagonal: 0.15, paint: 0, wood: 0, blocks: 0.05, wallpaper: 0.15, length: 0 }
/** Tinta: 2 demãos a ~10 m²/L. */
export const paintLitres = (m2: number) => (m2 * 2) / 10
