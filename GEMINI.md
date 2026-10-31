# Guia do projeto — Mia

(Salve como [`CLAUDE.md`](http://CLAUDE.md) na raiz do projeto se você usa o Claude Code, ou como [`AGENTS.md`](http://AGENTS.md) se usa o Codex, o Cursor ou outro agente. O conteúdo é o mesmo.)

Guia de design e qualidade desta landing page. Leia antes de codar e volte a ele ao conferir cada seção.

## A regra da página

Uma personagem, um plano: \*\*a Mia em 3D tempo real\*\*, num canvas fixo atrás do conteúdo, mudando de estado com a rolagem (entra andando e acena, vira pontos, os pontos viram o nome cromado, ela volta no fecho). Toda seção mostra a Mia de um jeito novo, ou as fotos dela no túnel. Se uma seção virar "três cards com ícone", "depoimentos em carrossel" ou "mockup de celular", está errada: refaça com a personagem.

## Tokens

\`\`\`css

--creme: #efeee8;  --tinta: #111111;  --cinza: #8d8b84;

--vermelho: #e5141f;                       /* abertura, botões, fecho */

--noite: #14000a;  --feixe: #7a0612;  --brilho: #ff2a3d;   /* rosto e entrega */

/* borda do dissolve: #ff3d6e (no 3D) */

--display: 'Melodrama', 'Italiana', serif;     /* 300, títulos */

--serif: 'Instrument Serif', 'Times New Roman', serif;   /* frases de destaque */

--sans: 'General Sans', system-ui, sans-serif; /* 400/500, 11 a 15 px */

--margem: clamp(18px, 4.4vw, 72px);

--ease: cubic-bezier(0.22, 1, 0.36, 1);

\`\`\`

- Títulos sempre em Melodrama 300, entreletra negativa (−0,015em a −0,02em), entrelinha 0,8 a 0,92. Frases de apoio em Instrument Serif `clamp(20px, 1.9vw, 30px)`. Nada de negrito em título.

- `@font-face` da Melodrama com `font-display: block` (o título não pode trocar de fonte na frente da personagem); General Sans com `swap`.

- Um vermelho só para ação. O rodapé sempre diz que a personagem é IA.

## O que o código procura no HTML

Os módulos de `src/three/` e `src/motion/` (vindos de `arquivos/codigo/`) dependem destas classes:

- `html.intro-on` (abertura rodando), `html.rm` (movimento reduzido), `html.touch`; o Lenis põe `lenis` e `lenis-stopped`.

- `.loader` &gt; `.loader__count` &gt; `.loader__num` · [`canvas.gl`](http://canvas.gl) · `.nav` · `#topo`, `#chama`.

- `[data-split]` em todo título que acende letra a letra (vira `.ch`); `.hero__title .split`, `.hero__row`.

- `.escuro` (envolve `.feixes`, `section.rosto` e `section.entrega`, cada uma com um `.pin` de uma tela); `.rosto__title .split`, `.entrega__title .split`.

- `section.processo` &gt; `.tunel` &gt; `.tunel__grade`, `.tunel__aro`, `.tunel__centro` (`.tunel__kicker` + três `.passo` com `.passo__nome` e `.small`), `.tunel__espaco` &gt; `figure.tunel__card` (img + figcaption), `.tunel__dica`. O código põe `.is-on` no passo ativo.

- `section.fecho#chama` &gt; `.fecho__bloco` (o código anima as variáveis `--inset` e `--raio` do `::before`), `.fecho__title .split`, `.fecho__row`, `a.pilula`, `footer.rodape`.

O mínimo da abertura fica inline no `<head>`, antes do CSS e do script do módulo:

\`\`\`html

&lt;style&gt;

  /* crítico: a abertura cobre a página antes do CSS carregar */

  html.intro-on .loader { display: grid; }

  .loader { display: none; position: fixed; inset: 0; z-index: 100; background: #e5141f; place-items: center; }

&lt;/style&gt;

&lt;script&gt;

  (function () {

    var d = document.documentElement;

    d.classList.add(matchMedia('(prefers-reduced-motion: reduce)').matches ? 'rm' : 'intro-on');

    if (matchMedia('(hover: none)').matches) d.classList.add('touch');

  })();

&lt;/script&gt;

\`\`\`

E no CSS: `html.intro-on body { overflow: hidden; }`, `.split .ch { display: inline-block; opacity: 0.08; }` e `html.rm .split .ch { opacity: 1; }`. Cada linha de título é um `<span class="split" data-split>` (as duas coisas no mesmo elemento). No movimento reduzido o túnel não troca de passo sozinho: `html.rm .passo:not(:first-child) { display: none; }` e o texto do primeiro já visível.

Os pins do ScrollTrigger põem `position: fixed` na `.rosto` e na `.entrega` enquanto elas estão presas, e isso cria um contexto de empilhamento: dê às duas `position: relative; z-index: 2` com fundo transparente (o fundo escuro é o do `.escuro`), senão os textos delas passam para baixo do canvas só durante o pin.

## O 3D

- \*\*Camadas\*\*: o canvas é `position: fixed` com z-index 1, entre os fundos das seções e os textos (z 2). O título do hero fica sem z-index, atrás do canvas: a Mia passa na frente das letras. O `.processo` tem z 3 e cobre o canvas inteiro; o fecho volta a mostrar a personagem.

- \*\*Um renderer, uma cena\*\*: a Mia, a malha da gravura, os pontos e as letras vivem na mesma cena; o estado de cada um sai de `[cenas.read](http://cenas.read)()` a cada quadro. Não crie um canvas por seção.

- \*\*Corte e pontos\*\*: a linha do corte é o topo do `.escuro` convertido para Y do mundo (`stage.screenToWorldY`). Os pontos acendem só abaixo dessa linha, então a fronteira malha/pontos fica exatamente na borda do painel. Se aparecer um vão ou uma faixa dupla, a conversão de tela para mundo está errada (confira o enquadramento em `stage.js`).

- \*\*O giro não freia\*\*: o ângulo é um só, do início do pin do rosto até 70% do pin da entrega, contínuo pelo vão entre os pins. Dois tweens separados dão um tranco no meio.

- \*\*Materiais\*\*: o dissolve e o corte entram por `onBeforeCompile` (`patchFade` em `glsl.js`) com `customProgramCacheKey` próprio; sem a chave, o Three reaproveita o programa de outro material e o efeito some.

- \*\*`frustumCulled = false`\*\* em todas as malhas da personagem e na nuvem: o skinning e o morph tiram os vértices da caixa calculada e o Three corta a cabeça.

- \*\*Gravura\*\*: a segunda malha usa o mesmo esqueleto (`bind(m.skeleton, m.bindMatrix)`), `depthWrite: false` e polygon offset. A tinta é escrita em sRGB direto no fim do shader.

- \*\*Corpo\*\* (`corpo.js`): toda pose sai da pose de repouso medida no espaço da raiz (frente +Z, esquerda dela +X) e girada em eixos do corpo; pernas por IK de duas juntas com o joelho para o lado do polo; o braço do aceno mira direções no espaço do mundo e o antebraço gira no próprio eixo para a palma ficar para a frente. Nunca anime ângulos locais do rig "na mão": cada rig tem eixos diferentes.

- \*\*Hierarquia\*\*: grupo (o que o scroll gira e desloca) → raiz (onde ela anda; volta à origem, de frente, quando para) → modelo. A nuvem de pontos usa a matriz do grupo, então a raiz precisa terminar na origem e o idle (peso numa perna) some no começo da rolagem (`vivo` em `cenas.js`): a nuvem é a pose neutra.

- \*\*Rosto\*\* (`rosto.js`): as medidas (olhos, pálpebras, sobrancelhas, boca) estão no espaço do atributo `position` do `mia.glb`. O desvio é aplicado a onde a textura é lida, convertido por um mapa (z, y) → uv rasterizado no carregamento; um salto de uv muito maior que o desvio é costura da textura e é ignorado.

## Motion

- Lenis (lerp 0,09) no ticker do GSAP (`gsap.ticker.add(t => lenis.raf(t * 1000))`, `lagSmoothing(0)`), criado \*\*depois\*\* dos pins do ScrollTrigger.

- \*\*Scroll dirige o contínuo\*\* (corte, giro, espalhar, morph, cromo, giro das letras, viagem do túnel, abertura do bloco do fecho, dissolve da volta). \*\*Texto por tempo\*\*: os títulos acendem ao entrar e apagam ao sair, letra a letra em ordem aleatória; nunca presos ao scroll.

- Nada de `transition` CSS em propriedade que o GSAP ou o loop animam (as cartas do túnel e o centro são escritos a cada quadro; a transição do hover fica só na sombra e na escala da foto).

- A abertura nunca finge progresso: o contador segue os bytes do `.glb` e só fecha em 100 quando tudo carregou e as fontes estão prontas.

- `prefers-reduced-motion`: sem abertura, sem Lenis, sem a chegada, títulos acesos, só o primeiro passo do túnel. O 3D fica (ele é o conteúdo), mas sem tremer.

## Mobile (tão caprichado quanto o desktop)

- 390 × 844 de referência. 16 mil pontos, DPR até 1,75. A câmera de retrato põe a Mia menor e abaixo do título.

- Hero: título 34vw, e a linha de baixo com um degradê creme por cima do corpo (o texto não pode ficar sobre a regata sem fundo).

- No retrato ela entra de mais longe, quase em direção à câmera (a tela é estreita), e o aceno fecha o braço (a mão fica diante do ombro); confira que ela aparece andando por uns dois segundos e que a mão não sai do quadro.

- Túnel: cartas menores, a espiral abre mais na horizontal, a perspectiva cai para 900 px.

- Fecho: "Chama" e "a Mia" em duas linhas, a base da Mia dissolve na linha do texto, a pílula ocupa a largura.

- Nada pode estourar a largura (`overflow-x: clip` no body).

## Como conferir

1. `npm run dev` e abra cada momento ao lado da imagem correspondente em `arquivos/conceito/`: hero, rosto (meio malha, meio pontos), pontos espalhados, MIA cromado, túnel, fecho.

2. Grave a rolagem inteira (Playwright headless com a GPU, instalado só para conferir com `npm i -D playwright` e `npx playwright install chromium`; um quadro a cada \~150 ms) em 1456 × 840 e 390 × 844 e procure: texto cortado, trecho morto sem nada mudando, a Mia cobrindo um texto, o giro freando entre o rosto e a entrega, pontos acesos acima da linha do painel, letras que não chegam a acender.

3. Recarregue no meio da página: a abertura roda, a página volta ao topo (`scrollRestoration = 'manual'`) e nada fica preso.

4. Meça os quadros por segundo no celular com a CPU 4× mais lenta (DevTools → Performance): 60 fps no hero e nos trechos presos.

5. Confira `prefers-reduced-motion` e o Safari.

6. `npm run build` sem erro e o `dist/` abrindo num servidor estático, sem erro no console.

## Personalizar

O site chega como a demo da Mia, um estúdio e uma personagem inventados. Esta seção vale sempre que a pessoa pedir uma mudança, hoje ou daqui a meses: trocar a marca, um texto, uma cor, as fotos, a personagem, ou levar uma seção para outro site.

### Antes de mexer

- Se ainda não sabe o objetivo, pergunte qual destes é (uma pergunta por vez, em linguagem simples):

  1. \*\*Ver a demo funcionando\*\* como está, para trocar depois.

  2. \*\*O site da minha marca\*\*, com esta estrutura e estas animações.

  3. \*\*Só algumas peças\*\* (uma animação ou seção) para um site que já existe.

- Para o caminho 2, pergunte o que ainda não sabe: nome da marca, o que vende e para quem, preço e condições, e-mail ou WhatsApp de contato, cores e logo (se tiver) e \*\*que material já tem\*\*: fotos ou quadros dos vídeos que ela produz, o rosto ou mascote da marca, um modelo 3D. Não peça tudo de uma vez.

- Para o caminho 3, pergunte quais peças e onde fica o site de destino. Leia o código do destino antes: se for React, Next ou outro framework, adapte os módulos de `src/three/` e `src/motion/` em vez de colar o HTML desta página. O túnel (`src/motion/tunel.js` + `src/sections/processo.css`) sai sozinho, sem 3D. A personagem com dissolve, pontos e letras depende do loop de `src/main.js` e de `cenas.js`: leve os três juntos.

- Diga com clareza o que muda só com texto e o que depende de material novo (tabela abaixo). A Mia é um modelo 3D pronto, com a roupa e o rosto pintados na textura: nem a cor da regata, nem o rosto, nem o cabelo mudam por código. Ninguém consegue "pôr a minha cara no 3D" só pedindo.

### O que muda e onde

| o quê | onde | precisa de material novo? |

|---|---|---|

| Nome, textos, preço, lista da entrega, passos, e-mail, rodapé | `index.html` (`.nav`, `.hero__title`, `.hero__row`, `.rosto`, `.entrega`, `.passo`, `.fecho`, `.pilula`, `.rodape`) | não |

| Título do hero (a palavra gigante) | `.hero__title` no `index.html`; é uma palavra curta de capa de revista (até ~5 letras no tamanho atual; mais longa, reduza o `font-size` em `src/sections/hero.css`) | não |

| Cores do site | `src/styles/tokens.css`; o vermelho também está inline no `index.html` (abertura, `theme-color`) e no favicon | não |

| Cores do 3D (borda do dissolve, tinta da gravura, faixas do cromo, luz) | `uEdge` em `src/three/mia.js` e `src/three/letras.js`, `uTinta` (sRGB 0–1) em `mia.js`, `chromeEnv` em `letras.js`, luzes em `src/three/stage.js`, cor dos pontos no `FRAG` de `src/three/pontos.js` | não |

| Palavra cromada ("MIA" e a estrela) | `PALAVRA` em `src/three/letras.js` + regerar `public/fonts/bodoni-mia.typeface.json` com `arquivos/fonte/typeface.mjs` (só tem M, I e A); a estrela fica sobre a segunda letra (`iCenter`): ajuste para a palavra nova ou tire | não |

| Fontes | `public/fonts/` + `@font-face` em `src/styles/tokens.css`; Instrument Serif pelo `@fontsource` no `package.json` e no `main.js` | não |

| Fotos do túnel | `public/img/ugc/` + as `figure.tunel__card` no `index.html` (imagem, `alt` e legenda); de 6 a 12 cartas funcionam | sim: fotos verticais 9:16 |

| Tempo de cada seção (altura dos pins, ritmo do giro, morph) | `end` dos pins e as faixas de `smoothstep` em `src/motion/cenas.js`; altura do túnel em `src/sections/processo.css` | não |

| Abertura e chegada | `src/motion/intro.js` (painel, títulos) e `src/motion/chegada.js` (de onde ela sai, quando percebe a câmera, sobrancelha, sorriso, aceno); o jeito de andar em `PASSO` no topo de `src/three/corpo.js` | não |

| Quantidade de pontos | `COUNT` em `src/main.js` | não |

| Tirar uma seção | apague o HTML e o `import` do CSS em `src/main.js`; rosto e entrega estão amarrados à nuvem de pontos em `cenas.js` (tirar a entrega pede tirar o morph para as letras) | não |

| A personagem (outra pessoa, mascote, o rosto da marca) | `public/models/mia.glb` e o começo de `src/three/mia.js` | sim: um `.glb` novo com esqueleto |

### Material da pessoa

\*\*As fotos do túnel.\*\* Nove fotos verticais 9:16 da criadora ou dos vídeos da marca, em WebP com ~640 × 1137 px (até ~100 KB cada). Quadros tirados dos vídeos reais funcionam. Sem fotos, gere com as receitas de `arquivos/receitas/ugc/` (um gerador de imagem com foto de referência, como ChatGPT, Gemini ou Midjourney), trocando a cena pelo produto dela. Fotos de pessoas reais só com autorização de uso de imagem.

\*\*A personagem.\*\* Ofereça estes caminhos, do mais simples para o mais trabalhoso:

1. \*\*Manter a Mia da demo\*\* e trocar textos, cores e fotos. O site fica pronto hoje, com uma personagem que não é da marca dela: diga isso, e lembre que a Mia é fictícia (não é uma pessoa nem pode ser apresentada como uma).

2. \*\*Uma personagem nova\*\* (o avatar da marca, um mascote humanoide). O caminho que fez a Mia, em `arquivos/receitas/[LEIA.md](http://LEIA.md)`: gerar a imagem de frente em pose A (e as vistas de lado e de costas), transformar em modelo 3D num gerador de imagem para 3D (Tripo3D, Meshy ou outro, num plano que permita \*\*uso comercial\*\*), aplicar um esqueleto humano com nomes do Mixamo (o rig automático do próprio gerador, ou o Mixamo da Adobe, gratuito), exportar `.glb` e comprimir (`npx @gltf-transform/cli optimize entrada.glb public/models/mia.glb --compress meshopt --texture-compress webp`, até \~3 MB). O que muda no código: o `giro` do `MODELO` em `mia.js` (0 se o modelo já olha para a câmera, −90° se olha para +X); as \*\*expressões\*\* são medidas no rosto da Mia (boca em `SORRISO_PARS` de `mia.js`; olhos, pálpebras e sobrancelhas em `rosto.js`): num modelo novo, meça de novo com `arquivos/fonte/rosto.mjs` (um render de frente do rosto com grade a cada 0,01; o cabeçalho diz como rodar) ou zere `sorriso` e `sobrancelha` em `chegada.js`; a caminhada e o aceno precisam dos ossos do Mixamo (`Hips`, `Spine`…`Spine2`, `Neck`, `Head`, ombros, braços, mãos com `Index1`, `Middle1` e `Pinky1`, `UpLeg`, `Leg`, `Foot` e `ToeBase`): sem eles, ela não anda e aparece parada no centro. Um `.glb` \*\*sem esqueleto\*\* também roda: o corpo inteiro acompanha o cursor e balança, sem aceno. Confira o enquadramento (altura de 1,70 m) e a nuvem de pontos depois de trocar. Para o rosto de uma pessoa real, só com autorização por escrito dela.

3. \*\*Sem 3D\*\*: esta template não tem versão sem 3D. Se a pessoa não quer personagem, esta não é a template certa; o túnel de fotos pode ir sozinho para outro site.

### Regras ao trocar

- As regras de motion acima continuam valendo: scroll dirige só o contínuo, títulos acendem por tempo, o giro não freia entre o rosto e a entrega.

- Trocou a personagem: confira a chegada (pés plantados, sem escorregar nem atravessar o chão; o olhar e a piscada no lugar certo do rosto), o aceno no desktop e no celular, a linha do corte no painel escuro, a explosão até as letras e a volta no fecho; e os 60 fps no celular com a CPU 4× mais lenta (um `.glb` pesado derruba isso).

- Transparência: a página diz que a criadora é IA (a frase do rosto e o rodapé). Mantenha isso em qualquer versão com personagem gerada.

- Nada de texto, preço, prazo, número ou depoimento inventado como se fosse da marca: o que a pessoa não informou fica marcado como `[preencher]` e entra na lista do fim. "R$ 4.900", "5 dias", "30 vídeos", "duas vagas em novembro" e o e-mail são da demo.

- Depois de cada troca, rode o "Como conferir" de novo nos trechos que mudaram, e no fim liste para a pessoa o que ficou da demo (a personagem, as fotos, os números) e o que falta ela mandar.

