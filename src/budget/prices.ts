/** Preços de referência da lista de compras: Leroy Merlin, com IVA. */
export const PRICES_DATE = '2 de novembro de 2026'

export type Price = {
  /** € com IVA, por unidade da lista ou, com `pack`, por embalagem. */
  price: number
  /** Unidades da lista em cada embalagem (m por rolo, m² por caixa…): compra-se um número inteiro de embalagens. */
  pack?: number
  packLabel?: string
  product: string
  /** Caminho em leroymerlin.pt/produtos/. */
  path: string
  /** Vendido por outra loja, no site da Leroy Merlin. */
  partner?: boolean
  /** Média de várias peças ou um conjunto montado aqui. */
  approx?: boolean
}

export const lmProduct = (path: string) => `https://www.leroymerlin.pt/produtos/${path}`

/** Linhas com quantidade mas sem preço, e porquê. As que não têm quantidade (a medir…) dizem-no sozinhas. */
export const unpriced: Record<string, string> = {
  'Betonilha, feita em obra (o cimento e a areia estão acima)': 'O cimento e a areia já estão contados acima.',
  'Pontos de água fria, água quente e esgoto junto à bomba de calor': 'Material do canalizador, conforme a instalação.',
  'Alimentação e comando da VMC': 'Conforme a VMC.',
}

/** Por nome da linha em `src/works/materials.ts`. */
export const prices: Record<string, Price> = {
  /* ---------- Pedreiro ---------- */
  'Kit de porta de correr embutida, folha de 0,60 × 2,00 m': {
    price: 310,
    product: 'Cassete para porta de correr, parede de reboco, 60 cm',
    path: 'cassete-para-porta-de-correr-parede-de-reboco-60cm-16414804.html',
  },
  'Kit de porta de correr embutida, folha de 0,70 × 2,00 m': {
    price: 289,
    product: 'Cassete para porta de correr para reboco, 70 × 203 cm',
    path: 'cassete-para-porta-de-correr-para-reboco-700x2030x110cm-82347417.html',
  },
  'Janela de sacada: caixilharia de 1,20 × 2,15 m': {
    price: 459,
    product: 'Porta-janela de PVC oscilobatente de 2 folhas, 120 × 200 cm (medida de catálogo; à medida custa mais)',
    path: 'porta-janela-pvc-cando-oscilobatente-2-folhas-120x200-90137334.html',
  },
  'Pavimento cerâmico dos WC': {
    price: 16.19,
    pack: 1.08,
    packLabel: 'caixa de 1,08 m²',
    product: 'Pavimento cerâmico Urban branco mate 60 × 60 cm, Artens (14,99 €/m²)',
    path: 'pavimento-revestimento-ceramico-urban-branco-mate-60x60-cm-artens-95598372.html',
  },
  'Revestimento cerâmico das paredes dos duches': {
    price: 17.63,
    pack: 1.26,
    packLabel: 'caixa de 1,26 m²',
    product: 'Revestimento cerâmico Santorini branco 30 × 60 cm, Artens (13,99 €/m²)',
    path: 'revestimento-ceramico-artens-santorini-branco-30x60-cm-86619083.html',
  },
  'Revestimento do resto das paredes dos WC': {
    price: 17.63,
    pack: 1.26,
    packLabel: 'caixa de 1,26 m²',
    product: 'Revestimento cerâmico Santorini branco 30 × 60 cm, Artens (13,99 €/m²)',
    path: 'revestimento-ceramico-artens-santorini-branco-30x60-cm-86619083.html',
  },
  'Pavimento fora dos WC': {
    price: 25.5,
    pack: 1.76,
    packLabel: 'caixa de 1,76 m²',
    product: 'Pavimento vinílico SPC de encaixe Kinvarra 5 mm, com base, Artens (14,49 €/m²)',
    path: 'pavimento-vinilico-de-spc-click-flutuante-artens-kinvarra-medio-5-mm-com-base-gr115-89973248.html',
  },
  Rodapé: { price: 6.39, pack: 2.43, packLabel: 'peça de 2,43 m', product: 'Rodapé MDF branco 9 × 70 mm', path: 'rodape-mdf-branco-9x70x2430-mm-15085392.html' },
  'Tijolo furado 30×20×7': { price: 0.29, product: 'Tijolo oco 30 × 20 × 7 cm', path: 'tijolo-oco-simples-30x20x7-cm-12257483.html' },
  'Tijolo furado 30×20×11': { price: 0.42, product: 'Tijolo oco 30 × 20 × 11 cm', path: 'tijolo-oco-simples-30x20x11-cm-17612413.html' },
  'Tijolo furado 30×20×15': { price: 0.55, product: 'Tijolo oco 30 × 20 × 15 cm', path: 'tijolo-oco-simples-30x20x15-cm-12257511.html' },
  'Cimento cinzento, sacos de 25 kg': { price: 5.19, product: 'Cimento Secil, 25 kg', path: 'cimento-25kg-secil-13142325.html' },
  Areia: {
    price: 48.99,
    pack: 1 / 1.5,
    packLabel: 'big bag de 1 t, ≈ 0,67 m³',
    product: 'Areia lavada para betão, big bag de 1 000 kg (a granel num armazém costuma sair mais barata)',
    path: 'areia-lavada-para-betao-big-bag-1000kg-16009791.html',
  },
  'Rede de fibra de vidro para reboco': { price: 49.5, product: 'Malha de fibra de vidro para reboco, 150 g', path: 'malha-fibra-vidro-mi166-reboco-150gr-15307313.html' },
  Padieiras: {
    price: 4.99,
    approx: true,
    product: 'Ripa pré-esforçada Preceram R6 de 1,5 m; as mais compridas custam mais',
    path: 'ripa-r6-1-5m-preceram-sul-fdlf-17611111.html',
  },
  'Impermeabilização (argamassa flexível ou membrana líquida)': {
    price: 64.99,
    pack: 20,
    packLabel: 'saco de 20 kg',
    product: 'Argamassa de impermeabilização flexível, com fibras, Sikalastic 1K',
    path: 'argamassa-de-impermeabilizacao-com-fibras-flexivel-sikalastic-1k-20kg-cinzento-95644405.html',
  },
  'Banda de reforço para cantos e juntas': {
    price: 72.49,
    pack: 50,
    packLabel: 'rolo de 50 m',
    product: 'Banda de impermeabilização para juntas Kerakoll Aquastop, 12 cm',
    path: 'banda-de-impermeabilizacao-para-juntas-kerakoll-aquastop-50m-120mm-85826000.html',
  },
  'Cimento-cola flexível (C2)': {
    price: 15.69,
    product: 'Cimento-cola flexível SikaCeram 215 C2TE cinzento, 25 kg',
    path: 'cimento-de-cola-sikaceram-215-flexivel-cinzento-25kg-c2te-90155557.html',
  },
  'Betume de juntas': {
    price: 9.79,
    pack: 5,
    packLabel: 'saco de 5 kg',
    product: 'Betume para juntas Axton Multiplus branco',
    path: 'betume-para-juntas-5-kg-branco-axton-multiplus-85480301.html',
  },
  'Saída de telhado para a extração dos WC': { price: 99.99, product: 'Saída de telhado metálica S&P CT-125', path: 'saida-telhado-metalica-s-p-ct-125-14482055.html' },
  'Big bags para entulho (1 m³)': {
    price: 8.49,
    product: 'Big bag para entulho 90 × 90 × 90 cm, até 1 t (a recolha paga-se à parte)',
    path: 'saco-do-lixo-para-entulho-90x90x90-cm-max-1-t-big-bag-88110774.html',
  },
  'Carro de mão': { price: 46.89, product: 'Carrinho de mão em aço de 90 L, roda pneumática', path: 'carrinho-de-mao-em-aco-com-roda-pneumatica-90-l-laranja-88281618.html' },
  'Betoneira de 130 a 160 L': { price: 279, product: 'Betoneira elétrica Miral B135, 125 L', path: 'betoneira-eletrica-125-lt-miral-b135-15915795.html' },
  'Masseira ou gamela para a massa': { price: 13.99, product: 'Gamela de borracha de 35 L', path: 'gamela-borracha-64x47-5cm-35l-17615416.html' },
  'Baldes de obra': { price: 1.85, product: 'Balde de construção de 15 L', path: 'balde-para-construcao-plastico-preto-com-puxador-15-l-17615430.html' },
  'Pá quadrada': { price: 11.99, product: 'Pá quadrada com cabo de madeira', path: 'pa-quadrada-cabo-de-madeira-17434956.html' },
  Enxada: { price: 28.19, product: 'Enxada Bellota com cabo', path: 'enxada-bellota-325800-com-cabo-81905739.html' },
  'Colher de pedreiro': { price: 5.79, product: 'Colher Dexter de 220 mm', path: 'colher-dexter-220mm-82338287.html' },
  'Talocha de plástico ou de madeira': { price: 3.89, product: 'Talocha de plástico Mader n.º 3', path: 'talocha-plastico-415x260-mm-mader-n-3-17615150.html' },
  'Talocha de esponja': { price: 8.49, product: 'Talocha de esponja Dexter, 28 × 14 cm', path: 'talocha-de-esponja-para-limpeza-28x14-cm-plastico-dexter-15045534.html' },
  'Talocha dentada de 8 a 10 mm': { price: 14.69, product: 'Talocha de dentes de 10 mm, Dexter', path: 'talocha-de-dentes-para-betume-10-mm-dexter-89124072.html' },
  'Talocha de borracha': { price: 6.99, product: 'Talocha para juntas de 24 cm, Dexter', path: 'talocha-para-juntas-24-cm-dexter-89124112.html' },
  'Régua de alumínio de 2 e de 3 m': { price: 19.99, product: 'Régua de alumínio de 2 m (16,49 €) e de 3 m (23,49 €)', path: 'regua-de-aluminio-ref-10-3m-87469094.html' },
  'Nível de bolha de 1,20 m': { price: 26.65, partner: true, product: 'Régua de nível Stanley de 120 cm', path: 'regua-de-nivel-120cm-stanley-1-43-555-82690614.html' },
  'Nível laser de linhas': { price: 52.99, product: 'Nível laser em cruz, verde, autonivelante, Dexter', path: 'nivel-laser-cruz-verde-autonivelante-dexter-90835580.html' },
  'Fio de prumo': { price: 7.99, product: 'Fio de prumo de aço, 300 g, Mader', path: 'fio-prumo-de-aco-300g-5-m-mader-96246651.html' },
  'Fita métrica de 5 m': { price: 5.99, product: 'Fita métrica Dexter de 5 m', path: 'fita-metrica-5-m-19-mm-dexter-85609116.html' },
  'Esquadro de pedreiro': { price: 8.15, product: 'Esquadro de pedreiro Vito, 400 × 600 mm', path: 'esquadro-para-pedreiro-400x600-mm-vito-viep-82244649.html' },
  'Fio de marcar, com pó': { price: 12.59, product: 'Fio de marcar Vito, 30 m', path: 'fio-de-marcar-vito-vifmm-corpo-metal-30m-82244705.html' },
  'Martelo demolidor': { price: 178, product: 'Martelo demolidor SDS Max Einhell, 1050 W', path: 'martelo-demolidor-sds-max-1050-w-12-j-einhell-te-dh-81953973.html' },
  'Marreta, ponteiro e escopro': {
    price: 24.67,
    approx: true,
    product: 'Marreta de 1,5 kg Dexter (19,69 €), ponteiro e escopro (2,49 € cada)',
    path: 'marreta-1500gr-d15-mm-dexter-81968490.html',
  },
  'Rebarbadora de 230 mm, com discos de corte de pedra': {
    price: 134.29,
    product: 'Rebarbadora Makita GA9050R de 2000 W (119 €) e disco diamantado para pedra (15,29 €)',
    path: 'rebarbadora-com-fios-2000-w-230-mm-makita-ga9050r-80139228.html',
  },
  'Máquina de abrir roços': { price: 257, product: 'Máquina de abrir roços Vito, 2400 W', path: 'maquina-abre-rocos-2400-w-vito-89621867.html' },
  'Cortador de cerâmica manual': {
    price: 79.99,
    product: 'Cortador de cerâmica manual Dexter de 600 mm, com mala',
    path: 'cortador-de-ceramica-manual-600-mm-com-mala-de-transporte-dexter-gnd-600new-95593061.html',
  },
  'Misturador elétrico, ou berbequim com vareta': { price: 59.79, product: 'Misturador elétrico Practyl de 1200 W', path: 'misturador-eletrico-1200-w-0-680rpm-practyl-1200mx1-5-91177660.html' },
  Escadote: { price: 44.99, product: 'Escadote de alumínio de 5 degraus, Steptrek', path: 'escadote-de-aluminio-steptrek-moderate-5-degraus-82601029.html' },
  'Aspirador de obra (pó e água)': { price: 69.99, product: 'Aspirador de sólidos e líquidos Dexter, 1300 W, 20 L', path: 'aspirador-solidos-e-liquidos-1300-w-20l-dexter-dwd20-96058795.html' },
  'Plástico e fita de proteção': {
    price: 20.95,
    approx: true,
    product: '2 rolos de proteção para o chão de 10 × 3 m, 2 plásticos de 5 × 4 m e 3 fitas de pintor',
    path: 'rolo-dexter-protecao-para-chao-10x3m-12m-82261724.html',
  },
  'Luvas, óculos, máscaras FFP2 e proteção auditiva': {
    price: 23.64,
    approx: true,
    product: '10 máscaras FFP2, 3 pares de luvas, óculos e protetor auricular',
    path: '10-mascaras-descartaveis-dobraveis-ffp2-dexter-88035328.html',
  },

  /* ---------- Canalizador ---------- */
  'Base de duche extraplana de ~110 × 100 cm': { price: 349, product: 'Base de duche Stone 100 × 110 cm, branca', path: 'base-de-duche-100x110-cm-branco-stone-83728562.html' },
  'Resguardo de duche de ~100 cm': {
    price: 223,
    product: 'Portas de duche de bater 100 × 190 cm, Sensea Easy',
    path: 'portas-de-duche-de-bater-100x190-cm-transparente-cromado-sensea-easy-86137759.html',
  },
  'Base de duche extraplana de ~140 × 90 cm': { price: 213, product: 'Base de duche de resina 140 × 90 cm, Sensea Easy', path: 'base-de-duche-resina-140x90-cm-branco-mate-sensea-easy-v2-91835314.html' },
  'Resguardo de duche de ~140 cm': {
    price: 239,
    product: 'Portas de duche de correr 140 × 190 cm, Sensea Easy',
    path: 'portas-de-duche-de-correr-140x190-cm-transparente-cromado-sensea-easy-86134705.html',
  },
  'Conjunto de duche encastrado termostático': {
    price: 366.9,
    partner: true,
    product: 'Duche encastrado termostático IMEX Line (os de monocomando, como o Sensea, custam ~194 €)',
    path: 'imex-duche-encastrado-termostatico-em-preto-mate-cabeca-de-duche-anticalcario-25-cm-chuveiro-de-mao-e-cartucho-autolimpante-serie-line-93039645.html',
  },
  'Sanita suspensa': { price: 124, product: 'Sanita suspensa rimless Sensea Easy', path: 'sanita-suspensa-rimless-branco-sensea-easy-91427288.html' },
  'Estrutura para sanita suspensa, com autoclismo embutido': {
    price: 86.99,
    product: 'Estrutura para sanita suspensa Oli80 Simflex, 3/6 L',
    path: 'estrutura-para-sanita-suspensa-3-6lt-oli-ain-oli80-simflex-91909527.html',
  },
  'Placa de descarga': { price: 47.19, product: 'Placa de acionamento Oli Bound, branca', path: 'placa-de-acionamento-para-sanita-suspensa-23x15-cm-branco-oli-bound-16997841.html' },
  'Lavatório de pousar': { price: 49, partner: true, product: 'Lavatório de apoio REA Sami, 36 × 36 cm', path: 'lavatorio-de-apoio-rea-sami-white-36x36x11-5cm-82697913.html' },
  'Torneira de parede para lavatório, com corpo de encastrar': {
    price: 78.99,
    product: 'Torneira de lavatório de encastrar Paini Venezia',
    path: 'torneira-para-lavatorio-de-encastre-prateado-paini-venezia-19453490.html',
  },
  'Válvula de lavatório sem ladrão (clic-clac)': { price: 13.99, product: 'Válvula clic-clac Equation universal', path: 'valvula-clic-clac-equation-universal-large-lavatorio-e-bide-82261532.html' },
  'Sifão de lavatório': { price: 18.99, product: 'Sifão de garrafa cromado, Equation', path: 'sifao-lavatorio-equation-garrafa-cromado-91664575.html' },
  'Coletor de água quente e fria': {
    price: 51.12,
    approx: true,
    product: 'Coletor de 3 saídas (7,49 €) e de 2 saídas (10,39 €), 5 válvulas de esfera de ½″ (4,69 €) e caixa (9,79 €)',
    path: 'coletor-distribuicao-de-agua-3-4-macho-femea-3-s-m-1-2-88043708.html',
  },
  'Tubo multicamada Ø16': { price: 17, pack: 25, packLabel: 'rolo de 25 m', product: 'Tubo multicamada Tradesa 16 × 2', path: 'rolo-25m-tubo-multicamada-tradesa-16x2-82069866.html' },
  'Acessórios de multicamada Ø16': {
    price: 2.5,
    approx: true,
    product: 'Acessórios de cravar Tradesa Ø16: joelho a 1,70 €, tê a 2,19 €; os cotovelos de parede custam mais',
    path: 'joelho-tradesa-multicamada-cravar-16-82068974.html',
  },
  'Isolamento do tubo de água quente': { price: 0.99, pack: 2, packLabel: 'tubo de 2 m', product: 'Tubo isolante de polietileno 16 × 6 mm', path: 'tubo-isolante-polietileno-nu-16x6-2m-19792486.html' },
  'Abraçadeiras para tubo': {
    price: 1,
    pack: 10,
    packLabel: 'saco de 10',
    product: 'Abraçadeiras Equation para multicamada de 16 mm',
    path: '10-abracadeiras-equation-para-tubo-multicamada-16mm-84851047.html',
  },
  'Tubo de PVC Ø110, barras de 3 m': { price: 19.9, product: 'Tubo de PVC EN1329 Ø110, 3 m', path: 'tubo-de-pvc-en1329-d110mm-3m-92096471.html' },
  'Tubo de PVC Ø50, barras de 3 m': { price: 7.59, product: 'Tubo de PVC EN1329 Ø50, 3 m, Sival', path: 'tubo-pvc-en1329-d50-3m-sival-16995125.html' },
  'Tubo de PVC Ø40, barras de 3 m': { price: 6.09, product: 'Tubo de PVC EN1329 Ø40, 3 m, Sival', path: 'tubo-pvc-en1329-d40-3m-sival-16995090.html' },
  'Acessórios de PVC: curvas, forquilhas e uniões': {
    price: 2,
    approx: true,
    product: 'Curvas de Ø40 e Ø50 a cerca de 1 €; as de Ø110 e as forquilhas custam mais',
    path: 'curvas-d50x90g-17323642.html',
  },
  'Cola para PVC e líquido de limpeza': { price: 2.99, product: 'Cola vedante para PVC Unecol, 125 ml', path: 'cola-vedante-pvc-pressao-sem-thf-125ml-unecol-new-age-86218552.html' },
  'Fita de teflon ou linho e pasta de vedar': { price: 4.99, product: 'Fita de teflon Unecol, 50 m', path: 'fita-teflon-19x0-1-mm-50-m-unecol-85722691.html' },
  'Silicone sanitário (antifungos)': { price: 5.19, product: 'Silicone neutro antifungos Axton, 280 ml', path: 'silicone-cozinha-casa-banho-neutro-antifungos-280-ml-branco-axton-90201990.html' },
  'Conduta de extração Ø100–125': {
    price: 38.43,
    partner: true,
    product: 'Conduta de alumínio semirrígida extensível Ø125, até 3 m',
    path: 'duto-de-aluminio-semirrigido-extensivel-125-mm-flexivel-ate-3-m-conduta-de-ar-e-tubo-de-exaustao-71592517.html',
  },
  'Redutor de pressão': {
    price: 27.49,
    partner: true,
    product: 'Válvula redutora de pressão DN20 em latão, com manómetro',
    path: 'valvula-redutora-de-pressao-de-agua-ajustavel-dn20-em-latao-com-manometro-para-sistemas-de-agua-3-4-78933010.html',
  },
  'Tesoura corta-tubo para multicamada': { price: 23.29, product: 'Tesoura corta-tubos Super-Ego, até 26 mm', path: 'tesoura-corta-tubos-pvc-pex-26mm-super-ego-19732461.html' },
  'Calibrador para multicamada Ø16 e Ø20': { price: 2.89, product: 'Calibrador para multicamada Equation, 16-20-25 mm', path: 'calibrador-de-tubo-multicamada-equation-16-20-25mm-84850961.html' },
  'Alicate de prensar para multicamada': {
    price: 101.41,
    partner: true,
    product: 'Alicate de prensar manual para multicamada, Ø16 a 32',
    path: 'alicate-de-prensar-manual-para-tubos-multicamadas-16-32-mm-cabeca-giratoria-e-punho-antiderrapante-e-maleta-tekmaquinas-97201341.html',
  },
  'Mola para curvar o tubo': { price: 2.79, product: 'Mola Equation para multicamada de 16 mm', path: 'mola-equation-para-tubo-multicamada-16mm-84851148.html' },
  'Arco de serra': { price: 7.99, product: 'Arco de serra de 300 mm, com folha, Dexter', path: 'arco-de-serra-com-folha-300-mm-para-metal-24tpi-dexter-95595161.html' },
  'Chave de grifos': { price: 9.19, product: 'Chave Stillson de 300 mm, Dexter', path: 'chave-stillson-300-mm-40-mm-dexter-89193750.html' },
  'Chave inglesa': { price: 12.49, product: 'Chave ajustável de 250 mm, Dexter', path: 'chave-ajustavel-250-mm-28-mm-dexter-82612493.html' },
  'Berbequim percutor, com brocas de betão e de cerâmica': {
    price: 39.99,
    product: 'Berbequim percutor Dexter de 900 W, com saco e 5 brocas',
    path: 'berbequim-percutor-com-fio-900-w-28-nm-com-saco-e-5-brocas-dexter-93210317.html',
  },
  'Bomba de prova (teste de pressão)': {
    price: 46.98,
    partner: true,
    product: 'Bomba de teste hidrostático manual VEVOR, 25 bar',
    path: 'kit-de-bomba-de-teste-hidrostatico-vevor-de-25-bar-testador-de-pressao-hidraulica-manual-com-valvula-unica-tanque-de-agua-de-5-litros-mangueira-de-74760168.html',
  },
  'Pistola de silicone': { price: 7.95, product: 'Pistola de silicone Dexter, 310 ml', path: 'pistola-de-silicone-310-ml-dexter-88995433.html' },
  'Nível de bolha de 60 cm': { price: 9.39, product: 'Nível Dexter de 600 mm, 2 bolhas', path: 'nivel-dexter-2-bolhas-600mm-85326507.html' },

  /* ---------- Eletricista ---------- */
  'Interruptor simples': { price: 1.49, product: 'Interruptor simples Efapel Logus 90', path: 'interruptor-simples-logus-15843772.html' },
  'Interruptor duplo (comutador de lustre)': { price: 2.69, product: 'Comutador de lustre Efapel Logus 90', path: 'comutador-lustre-logus-15843800.html' },
  'Comutador de escada': { price: 2.09, product: 'Interruptor-comutador Efapel Logus 90', path: 'interruptor-comutador-logus-15843793.html' },
  Inversor: { price: 3.39, product: 'Inversor de grupo Efapel Logus 90', path: 'inversor-de-grupo-logus-15843961.html' },
  'Tomada schuko': { price: 1.85, product: 'Tomada 2P+T Efapel Logus 90', path: 'tomada-2p-t-logus-15843842.html' },
  'Tomada de dados RJ45 (cat6)': { price: 4.59, product: 'Tomada de rede RJ45 Efapel Logus 90', path: 'tomada-de-rede-rj45-logus-15843856.html' },
  'Espelhos da aparelhagem': {
    price: 1,
    approx: true,
    product: 'Espelhos Efapel Logus 90: simples a 0,64 €, duplos a 1,29 €',
    path: 'espelho-duplo-reversivel-branco-efapel-logus-90-15844864.html',
  },
  'Candeeiro ou plafon de teto': { price: 20.99, product: 'Candeeiro de teto LED Globo Matthew, 30 cm', path: 'candeeiro-de-teto-com-lampada-led-2150lm-branco-30cm-globo-matthew-95184857.html' },
  'Plafon de teto IP44': { price: 26.99, product: 'Candeeiro de teto LED IP44 Lano, 29 cm, Inspire', path: 'candeeiro-de-teto-com-lampada-led-lano-2300-lm-ip44-d29-cm-branco-inspire-91242439.html' },
  'Luz de espelho IP44': { price: 16.99, product: 'Aplique de espelho LED IP44, 30 cm, Inspire', path: 'aplique-com-lampada-espelho-led-650lm-ip44-30x13-5x4-2-cm-cinza-inspire-91242376.html' },
  'Luz da escada (LED nos degraus ou apliques)': {
    price: 38.43,
    approx: true,
    partner: true,
    product: '7 focos LED de degrau de 3 W, um a cada dois degraus (5,49 € cada)',
    path: 'foco-led-embutido-de-3-cm-e-3w-mini-foco-para-degraus-prateleiras-em-madeira-escadas-e-vitrinas-230v-3000k-85174552.html',
  },
  'Extrator de casa de banho, com temporizador': { price: 22.99, product: 'Extrator de banho Equation Q2, Ø100', path: 'extrator-de-banho-equation-q2-100mm-82014539.html' },
  'Toalheiro elétrico': { price: 99.99, product: 'Toalheiro elétrico Zeta Paris, 500 W', path: 'toalheiro-eletrico-zeta-paris-branco-500w-17871756.html' },
  'Sensor de presença': { price: 30.99, product: 'Detetor de presença de 360°, de encastrar', path: 'detetor-de-presenca-invisivel-360-82189429.html' },
  'Caixas de aparelhagem': { price: 4.99, pack: 20, packLabel: 'saco de 20', product: 'Caixas de aparelhagem redondas de 69 × 64 mm', path: '20-caixas-de-aparelhagem-redondas-69x64mm-16848181.html' },
  'Caixas de derivação': { price: 5.29, product: 'Caixa quadrada com tampa, 195 × 120 × 65 mm', path: 'caixa-de-aparelhagem-quadrada-tampa-195x120x65mm-16640764.html' },
  'Tubo anelado Ø20, com guia': { price: 19.89, pack: 100, packLabel: 'rolo de 100 m', product: 'Tubo anelado com guia Ø20', path: 'tubo-anelado-320nw-com-guia-d20mm-preto-rolo-100m-86295204.html' },
  'Tubo anelado Ø25, com guia': { price: 19.99, pack: 50, packLabel: 'rolo de 50 m', product: 'Tubo anelado com guia Ø25', path: 'tubo-anelado-320nw-com-guia-d25mm-preto-rolo-50m-86295205.html' },
  'Fio H07V-U 1,5 mm² (iluminação)': { price: 27.67, pack: 100, packLabel: 'rolo de 100 m', product: 'Fio H07V-U 1,5 mm² Revi', path: 'fio-azul-100m-1-5-az-revi-17596243.html' },
  'Fio H07V-U 2,5 mm² (tomadas)': { price: 44.83, pack: 100, packLabel: 'rolo de 100 m', product: 'Fio H07V-U 2,5 mm² Revi', path: 'fio-h07-vu-2-5-ca-100m-azul-revi-17596292.html' },
  'Cabo UTP cat6': {
    price: 35.72,
    pack: 100,
    packLabel: 'bobina de 100 m',
    partner: true,
    product: 'Cabo de rede cat6 U/UTP Gembird',
    path: 'cabo-de-rede-bobina-gembird-cat6-100m-u-utp-utp-cinza-89857922.html',
  },
  'Ligadores rápidos (tipo Wago), de 3 e de 5 entradas': {
    price: 8.39,
    pack: 50,
    packLabel: 'conjunto de 50',
    product: 'Ligadores rápidos Lexman',
    path: 'conjunto-de-50-conectores-rapidos-lexman-88878659.html',
  },
  'Fita isoladora': { price: 1.15, product: 'Fita isoladora de 20 m × 19 mm', path: 'fita-isoladora-20mx19mm-preto-88878743.html' },
  'Disjuntor de 25 A': { price: 20.39, product: 'Disjuntor 1P+N de 25 A, Schneider', path: 'disjuntor-1p-n-schneider-4500a-c-25-a-95431145.html' },
  'Disjuntor de 16 A': { price: 18.59, product: 'Disjuntor 1P+N de 16 A, Schneider', path: 'disjuntor-1p-n-schneider-4500a-c-16-a-95431001.html' },
  'Caixa de ligação do ar condicionado': { price: 1.69, product: 'Caixa quadrada de 91 × 91 × 42 mm', path: 'caixa-de-aparelhagem-quadrada-91x91x42mm-16640701.html' },
  'Berbequim percutor, com coroa de 68 mm': {
    price: 16.89,
    product: 'Coroa de Ø68 mm para tijolo e betão, encaixe SDS Plus, Dexter; o berbequim está nas ferramentas do canalizador',
    path: 'broca-craniana-para-betao-cimento-e-tijolo-sds-plus-68-mm-dexter-88693589.html',
  },
  'Guia passa-cabos de 15 a 30 m': { price: 8.09, product: 'Guia passa-cabos Lexman de 15 m', path: 'guia-passa-cabos-lexman-15-metros-88878776.html' },
  'Alicate universal, alicate de corte e descarnador': {
    price: 43.07,
    product: 'Alicate isolado (11,49 €), alicate de corte isolado (19,39 €) e descarnador isolado (12,19 €), Dexter',
    path: 'alicate-isolado-180-mm-dexter-18805368.html',
  },
  'Chaves de fendas isoladas (1000\u00a0V)': { price: 18.19, product: 'Jogo de 6 chaves isoladas, Dexter', path: 'jogo-de-6-chaves-de-parafusos-isoladas-dexter-19563194.html' },
  'Detetor de tensão': { price: 14.99, product: 'Detetor de tensão Laserliner ActiveFinder', path: 'detetor-de-tensao-laserliner-active-finder-17670373.html' },
  Multímetro: { price: 18.99, product: 'Multímetro digital Lexman LX-M-1000', path: 'multimetro-digital-lx-m-1000-vermelho-lexman-85078984.html' },
  'Ferramenta de cravar RJ45': { price: 6.49, product: 'Alicate de cravar RJ45, Dexter', path: 'alicate-de-cravar-terminais-rj12-rj45-e-rj11-200-mm-dexter-18800938.html' },
  'Nível de bolha': { price: 8.39, product: 'Nível Dexter de 400 mm, 2 bolhas', path: 'nivel-dexter-2-bolhas-400mm-85326503.html' },
}
