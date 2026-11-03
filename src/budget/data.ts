import { bonina as boninaScope } from '@/works/bonina'

export const IVA = 0.23
/** Taxa reduzida para empreitadas de reabilitação urbana em ARU (verba 2.23 da Lista I do CIVA). */
export const IVA_ARU = 0.06
export type IvaRate = 'normal' | 'aru'
export const ivaRates: Record<IvaRate, number> = { normal: IVA, aru: IVA_ARU }
export const BUDGET = 50000

export type WindowOption = 'pvc' | 'aluminio'

/** Vãos existentes (1,17 × 1,045 m) e a janela de sacada nova. */
export const windows = [
  { id: 'N1', label: 'N1 · WC / Quarto 2', w: 1.17, h: 1.045, kind: 'janela' as const },
  { id: 'N2', label: 'N2 · WC da suite', w: 1.17, h: 1.045, kind: 'janela' as const },
  { id: 'W1', label: 'W1 · Quarto 2', w: 1.17, h: 1.045, kind: 'janela' as const },
  { id: 'E1', label: 'E1 · Suite', w: 1.17, h: 1.045, kind: 'janela' as const },
  { id: 'S1', label: 'Janela de sacada · Suite', w: 1.2, h: 2.15, kind: 'sacada' as const },
]

/** Preço por vão, com IVA, fornecimento e montagem, vidro duplo baixo-emissivo, sem estores. */
export const windowPrices: Record<WindowOption, { label: string; detail: string; janela: number; sacada: number }> = {
  pvc: {
    label: 'PVC',
    detail: 'PVC de gama média (perfil de 70 mm, 5 câmaras), oscilobatente, vidro duplo 4/16/4 baixo-emissivo com árgon.',
    janela: 580,
    sacada: 1350,
  },
  aluminio: {
    label: 'Alumínio com corte térmico',
    detail: 'Alumínio com rotura de ponte térmica (gama média), oscilobatente, mesmo vidro duplo. Mais fino à vista, mais caro.',
    janela: 780,
    sacada: 1900,
  },
}

/** Abertura do vão da sacada na parede sul: demolição, padieira, soleira e remates (pedreiro). */
export const SACADA_OPENING = 1200

export type Quote = {
  id: string
  title: string
  supplier: string
  status: 'escolhido' | 'estimativa'
  /** Valor sem IVA. Quando ivaKnown é falso, o valor é o que está na proposta e não se sabe se já inclui IVA. */
  base: number
  ivaKnown: boolean
  note: string
}

export const bonina = {
  supplier: 'Bonina Climatização (Cacia, Aveiro)',
  contact: '234 305 470 · manutenção 968 579 335 · geral@bonina.pt',
  option: 'Ar condicionado Daikin Stylish + VMC Sodeca AIRHOME + bomba de calor Olimatik',
  validUntil: '02/11/2026',
  items: [
    { label: 'Equipamentos de ar condicionado Daikin', value: 2256.0 },
    { label: 'Complementos de ar condicionado (tubagens, gás, esgotos, parte elétrica)', value: 852.2 },
    { label: 'Bomba de calor para água quente sanitária (AQS)', value: 2388.0 },
    { label: 'VMC Sodeca com condutas rígidas antibacterianas', value: 3307.41 },
    { label: 'Montagem e ensaios', value: 2007.0 },
  ],
  recirculation: { label: 'Recirculação de água quente (opcional)', value: 480.0 },
  conditions: [
    'Pagamento: 1 000 € na adjudicação; o restante é faturado à medida que a obra avança e pago depois de o trabalho ser confirmado.',
    'Garantias: 5 anos na montagem (Bonina) e 3 anos do fabricante (Daikin).',
    'Manutenção opcional: 150 € + IVA por ano (184,50 €). Assistência em menos de 24 h se faltar água quente; menos de 48 h para outras avarias, em dias úteis.',
  ],
  rooms: boninaScope.rooms,
  sizes: [
    ['Daikin FTXA25 (interior, ×2)', '798 × 295 × 189 mm', '12 kg', 'Ruído mínimo 19 dB(A)'],
    ['Daikin 2MXM50A8 (exterior)', '852 × 552 × 350 mm', '41 kg', 'Ruído 48–50 dB(A); precisa de estrutura de fixação'],
    ['Olimatik Ecosilent 300 L', 'Ø650 × 1826 mm de altura', '80 kg', 'Condutas de ar Ø150 mm; deixar 40 cm livres até ao teto'],
    [
      'Sodeca AIRHOME-150',
      'cerca de 970 × 600 × 244 mm (até 1070 × 855 com as ligações)',
      '—',
      'Montagem horizontal; bocas Ø125 mm; 150 m³/h a 100 Pa; 26 dB(A) a 1,5 m',
    ],
  ],
  features: [
    'Ar condicionado: SEER 8,53 (A+++) e SCOP 4,61 (A++), gás R32; Wi-Fi, ar distribuído pelo teto (efeito Coanda) e purificação do ar (Flash Streamer).',
    'Bomba de calor: depósito em inox Duplex 2101, gás R290, classe A+; água até 70 °C, apoio elétrico de 1,5 kW; pressão máxima de 6 bar.',
    'VMC: permutador de contracorrente sensível (80–88%), caudal constante, bypass automático, filtros F7, certificação Passive House; dimensionada para cerca de 50 m³/h.',
    'Condutas da VMC: HeatPex de 75 mm semirrígido, antibacteriano e antiestático; 2 plenums de 7 saídas, 6 plenums terminais, 6 válvulas BDOP 125 e 6 reguladores; alumínio flexível isolado de 125 mm só nas ligações ao exterior.',
  ],
  exclusions: boninaScope.exclusions,
  toConfirm: [
    'Modelo exato da VMC: AIRHOME-150, versão sensível, sem "/E". A página da proposta indica valores de modelos diferentes.',
    'Que divisões são servidas pela VMC (insuflação e extração).',
    'Atualizar a página 2 da proposta: ainda indica a unidade exterior de 4,2/4,6 kW, que é a da Mitsubishi.',
  ],
}

export const painting: Quote = {
  id: 'pintura',
  title: 'Capoto e pintura interior',
  supplier: 'Nuno Jesus (Tocha), proposta de 03/10/2026',
  status: 'escolhido',
  base: 3850,
  ivaKnown: false,
  note: 'Sistema de capoto em todas as paredes indicadas em obra; uma demão de primário e três de tinta plástica em todas as paredes. A proposta não diz se inclui IVA.',
}

export const doors: Quote = {
  id: 'portas',
  title: 'Portas interiores (4, com aro)',
  supplier: 'Orçamento recebido',
  status: 'escolhido',
  base: 4 * 350,
  ivaKnown: false,
  note: '4 portas a 350 € cada, com aro. Não sabemos se o valor inclui IVA.',
}

export type Scenario = 'baixo' | 'medio' | 'alto'

/** Trabalhos ainda sem orçamento, com IVA. Valores indicativos para a zona de Aveiro em 2026. */
/** fullIva: serviços que não são empreitada e pagam sempre 23%. */
export const pending: { title: string; min: number; max: number; note: string; fullIva?: boolean }[] = [
  {
    title: 'Demolições, paredes novas e entulho',
    min: 3000,
    max: 6000,
    note: 'Paredes dos 3 quartos, despensa e WC atual; paredes novas em tijolo ou gesso cartonado com isolamento acústico.',
  },
  {
    title: 'Abertura na laje para a escada',
    min: 2500,
    max: 5000,
    note: 'Projeto de estabilidade, corte, bordaduras e reforço. Depende muito do tipo de laje.',
  },
  {
    title: 'Escada para o sótão (0,90 m)',
    min: 3000,
    max: 7000,
    note: '14 a 15 degraus. Escada em kit (metal e madeira) no valor baixo; carpintaria por medida no alto.',
  },
  { title: 'Canalização e esgotos', min: 2500, max: 4500, note: '2 WC e as ligações de água e esgoto à bomba de calor (excluídas da Bonina).' },
  {
    title: 'Eletricidade',
    min: 3000,
    max: 5500,
    note: 'Circuitos, tomadas e iluminação dos quartos e WC, e as linhas do ar condicionado e da bomba de calor (excluídas da Bonina).',
  },
  {
    title: 'Subir o pavimento 10 cm e pavimento novo',
    min: 3500,
    max: 6500,
    note: 'Betonilha e pavimento (vinílico, flutuante ou cerâmico) em cerca de 55 m², com rodapés.',
  },
  {
    title: 'Loiças, duches e revestimentos dos 2 WC',
    min: 4500,
    max: 8500,
    note: 'Sanitas, lavatórios com móvel, bases de duche, resguardos, torneiras e cerâmica.',
  },
  { title: 'Tetos, estuque e remates', min: 1500, max: 3000, note: 'Tapar roços (excluído da Bonina), tetos e remates de paredes novas.' },
  { title: 'Roupeiros, closet e arrumação sob a escada', min: 3000, max: 7000, note: 'Módulos em kit no valor baixo; carpintaria por medida no alto.' },
  { title: '5.ª porta e caixilhos de correr', min: 900, max: 1500, note: 'A planta tem 5 portas interiores (3 de correr). O orçamento recebido é de 4.' },
  {
    title: 'Projeto e licenciamento',
    min: 1500,
    max: 4000,
    note: 'A abertura da sacada e da laje mexem na fachada e na estrutura: arquitetura, estabilidade e comunicação à Câmara. Serviços de projeto pagam sempre IVA a 23%.',
    fullIva: true,
  },
]

export const scenarioLabel: Record<Scenario, string> = { baixo: 'Baixo', medio: 'Médio', alto: 'Alto' }
export const scenarioFactor: Record<Scenario, number> = { baixo: 0, medio: 0.5, alto: 1 }
