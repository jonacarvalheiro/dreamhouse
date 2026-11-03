# Remodelação · Casa principal (R/C)

Estudo prévio interativo para remodelar o bloco principal da casa. Passa de 3 quartos para 2 quartos maiores: uma suite com closet e WC privativo à direita, e à esquerda o Quarto 2 e um WC partilhado. Inclui ainda uma escada para o sótão, com largura para passar móveis. A proposta escolhida é a C; a A e a E ficam arquivadas, só para consulta (links «Arquivadas» no topo da página, ou `?v=a` e `?v=e`):

- **Proposta C · escada em leque pela cozinha (a escolhida):** escada de 1,00 m junto à fachada poente, a sul da janela W1, a arrancar diretamente da cozinha; vira para nascente com 3 degraus em leque até ao corredor. O Quarto 2 fica com 14,10 m², com as janelas N1 e W1 e um roupeiro na parede do corredor até atrás da porta. O WC fica no sítio do atual, debaixo do 2.º lanço, com a porta atual passada a porta de correr embutida: quem entra fica de frente para o duche, com o lavatório à entrada e a sanita suspensa virada para o corredor, debaixo da parte alta da escada. A pré-parede da sanita fecha uns arrumos debaixo dos degraus mais baixos. À chegada ao sótão há cerca de 2,08 m.
- **Proposta A · escada reta (arquivada):** lanço reto encostado à parede do corredor, a subir para norte. O WC partilhado fica no lugar do WC atual.
- **Proposta E · WC a norte, closet sob a escada (arquivada):** o WC partilhado ocupa a fachada norte com 1,21 m de fundo, com a janela N1. O Quarto 2 fica ao meio, com a W1, e ganha um closet no sítio do WC atual, a que se chega por baixo dos últimos degraus. A escada em L arranca da cozinha.

A suite (quarto, closet e WC privativo) é igual nas três: do quarto entra-se no closet por um vão livre e do closet no WC por uma porta de correr embutida de 0,60 m.

Condições fixas: a entrada principal e as paredes do corredor mantêm-se, a escada não pode ir para o corredor, nenhuma janela muda de sítio, há uma janela de sacada nova na parede sul da suite, o pé-direito final é de 2,45 m (o pavimento sobe 10 cm) e o telhado não é alterado. Medidas tiradas em obra: telhado de 4 águas com 0,615 m de parede e 3,50 m no ponto mais alto (a partir da laje), laje de 9,5 cm (2,55 m piso a piso), janelas de 1,17 × 1,045 m e porta de entrada com 0,95 m.

As medidas interiores foram retiradas do levantamento da casa (em `uploads/`, que não vai para o repositório público).

## O que a app mostra

Há duas páginas, com links no topo: «Planta e 3D» e «Obra: ofícios e materiais».

A primeira tem só a planta, o 3D e o esquema da escada:

- **Vista 3D** ("casa de bonecas"), para hoje e para a proposta, com vistas predefinidas: geral, suite, Quarto 2, escada e sótão, e planta. Arrastar para rodar e usar a roda do rato para aproximar. O modo «Passear» (andar lá dentro com W A S D) começa desligado, para não prender o rato; pode abrir-se já ligado com `?walk=1`, e uma vista com `?tab=3d&cam=suite`.
- **Plantas à escala** (em SVG) do existente e da proposta, com mobiliário, cotas e uma camada de obra (demolir, construir e vãos a fechar). Passar o rato numa divisão mostra a área e o raciocínio. A opção «Entrada em baixo» (ou `?flip=1`) roda a planta 180°, com o norte para baixo e os textos direitos.
- **Escada:** com o piso a piso confirmado de 2,55 m (`FLOOR_TO_FLOOR` em `src/plan/stair.ts`), os degraus, a regra de Blondel, a abertura no teto e a altura livre, num corte com o telhado: a cheio a telha por cima da escada e a tracejado a telha mais a norte, que sobe até à cumeeira de 3,50 m.
- **Plantas em PDF** para descarregar (links no topo da página), nas duas orientações.

A página **Obra** tem um separador por ofício, cada um com o seu endereço para mandar ao profissional: `?obra=pedreiro`, `?obra=canalizador` e `?obra=eletricista` (mais `&flip=1` para a planta com a entrada em baixo).

- **Pedreiro:** a planta de obra e as tabelas de paredes, portas e vãos, abertura na laje, pavimento, janela de sacada e duches.
- **Canalizador:** a planta com os pontos numerados de água, esgoto e extração em cada WC.
- **Eletricista:** a planta com a luz, os interruptores, as tomadas e as zonas dos duches, divisão a divisão.

Em cada separador há o link direto (botão «Copiar» e, no telemóvel, «Partilhar»), o link para a folha desse ofício no PDF e os **materiais previstos**, calculados a partir da planta: o que é para escolher e comprar (normalmente pelo dono da obra), o material de obra (normalmente do profissional) e as **ferramentas e equipamento** (carro de mão, betoneira, talochas, corta-tubos, detetor de tensão…), cada linha com uma pesquisa na Leroy Merlin. O material de obra vem na unidade em que se compra: sacos de cimento de 25 kg e m³ de areia (pelas argamassas, o reboco e a betonilha), tijolos, barras de PVC de 3 m, metros e rolos de tubo anelado e de fio (medidos na planta, do quadro às caixas de derivação e daí a cada ponto). As quantidades são estimativas, para confirmar em obra antes de encomendar. O link copiado usa o endereço onde o site está aberto: para o mandar a alguém, copiem-no no site publicado e não em `localhost`.

Ao lado da Obra há **Compras** (materiais e ferramentas, preços de referência, o que já se pagou) e **Orçamentos** (propostas recebidas e as contas). As duas pedem um código à primeira vez neste navegador. Com `npm run dev`, o que se marca fica em `dados/compras.json` e `dados/orcamento.json` (o telemóvel na mesma rede vê o mesmo ficheiro). No site publicado, fica neste navegador. Os JSON da pasta `dados/` não vão para o repositório público.

A decoração saiu da página e vai voltar como página própria. O código continua no repositório (`src/components/Decor.tsx` e `src/decor/`), tal como a tabela de medidas para a obra (`src/components/SetOut.tsx`). O que as folhas dos ofícios usam da proposta da Bonina (o que ela instala e o que fica para os outros ofícios) está em `src/works/bonina.ts`.

## Correr localmente

```bash
npm install
npm run dev
```

Abre em http://localhost:4317.

Para gerar as plantas em PDF (A3, existente e Proposta C, mobiladas e de obra), com o Google Chrome instalado:

```bash
npm run plantas
```

Saem dois ficheiros em `public/plantas/`, que o site serve nos links de download: `plantas-proposta-c.pdf` (norte em cima) e `plantas-proposta-c-entrada-em-baixo.pdf` (rodado 180°, com a entrada em baixo; não é um espelho). Depois de mudar a geometria, voltem a correr o comando para os PDFs acompanharem o site. Além das plantas, há folhas para a obra: escada (degraus, implantação, abertura na laje e corte), pedreiro (paredes, vãos, abertura na laje, pavimento e duches), canalizador (pontos de água, esgoto e extração em cada WC) e eletricista (luz, interruptores, tomadas e zonas dos WC). As medidas saem da geometria em `src/plan/`; as alturas de instalação são valores de referência. O código está em `scripts/plantas.tsx` e `scripts/plantas-obra.tsx`; o conteúdo das folhas dos ofícios e os materiais estão em `src/works/`, partilhados com a página Obra (`src/content.tsx` tem o número da folha de cada ofício, que o script confirma).

## Renders no Blender

A geometria da proposta (paredes, teto de pinho, duche em blocos de vidro, móveis) sai de `src/plan/` para JSON; um script Python no Blender monta a casa e renderiza com Cycles. Por omissão faz as vistas do WC partilhado no ambiente madeira-azul.

```bash
# Se o Blender 4.x ainda não estiver instalado:
brew install --cask blender

npm run render
```

O script procura o binário em `/Applications/Blender.app`, `/usr/local/bin/blender` ou `BLENDER=...`. Sem Blender, exporta só o JSON (`render/scene-a.json`, `render/views.json`) e indica o comando de instalação. As imagens ficam em `render/out/`.

```bash
# só exportar o JSON, sem renderizar
npm run render -- --dry-run

# mais amostras, outra vista, ou a casa toda
npm run render -- --only wc-duche --samples 96 --width 1920
npm run render -- --only all --variant a
```

## Publicar (GitHub Pages)

```bash
npm run publicar
# ou com uma mensagem
npm run publicar -- "Corrige as quantidades do eletricista"
```

Publica o que está na pasta, incluindo o que ainda não está em commit, num commit novo no `main` do remote `github` (o repositório público). Não mexe nos branches nem nos commits locais, e assina com o email privado do GitHub (`<id>+<utilizador>@users.noreply.github.com`). Ficam de fora o levantamento (`uploads/`) e os JSON da pasta `dados/` (o que já se pagou, gravado localmente). A lista está em `scripts/publicar.mjs`. Precisa do `gh` com sessão iniciada (`gh auth login`).

A seguir, o workflow `.github/workflows/deploy.yml` compila e publica o site no GitHub Pages (**Settings → Pages → Source: GitHub Actions**), em `https://<utilizador>.github.io/<repositório>/`, em 1 a 2 minutos. O site pede aos motores de busca para não o indexarem (`noindex` no `index.html`), mas qualquer pessoa com o link o vê, e o repositório é público.

## Stack

Vite, React, TypeScript, Tailwind CSS v4 e shadcn/ui.

A geometria está em `src/plan/` (coordenadas em metros, com origem no canto interior noroeste). O cálculo das duas escadas está em `src/plan/stair.ts`; as plantas em `proposal.ts` (A), `proposalC.ts` (C), `proposalE.ts` (E), `lstair.ts` (escada em L) e `suite.ts` (parte comum). Os textos de cada proposta estão em `src/content.tsx`.
