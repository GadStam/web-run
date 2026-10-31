# Prompt — landing page "Mia"

## Antes de começar: pergunte

Antes de escrever qualquer código, faça estas perguntas, uma por vez e em linguagem simples (a pessoa pode não ser programadora):

1. \*\*O que você quer fazer com este site?\*\*

   - \*\*Montar a demo como ela é\*\*, para ver funcionando e trocar depois.

   - \*\*Fazer o site da minha marca\*\* com esta estrutura e estas animações.

   - \*\*Usar só algumas peças\*\* (uma animação ou uma seção) num site que já tenho.

2. Se for a sua marca: o nome, o que vende e para quem, e \*\*que material já tem\*\* (logo, cores, fotos ou vídeos do trabalho, o rosto ou o mascote da marca). Avise desde já que a estrela da página é a \*\*Mia, uma personagem 3D fictícia\*\* que vem pronta em `arquivos/models/mia.glb`: ela acena, segue o cursor, vira nuvem de pontos e volta no fim. Textos, cores, preço e as nove fotos do túnel trocam só com pedido e com as fotos dela. Já pôr \*\*outra pessoa ou personagem\*\* no lugar da Mia pede um modelo 3D novo com esqueleto (`.glb` com rig humano): o guia explica como gerar um a partir de uma imagem, quanto custa e o que muda no código. Esta template não tem versão sem 3D.

3. Se forem peças: quais, e onde está o site que vai recebê-las.

Depois, em qualquer caminho, \*\*monte primeiro a demo completa como descrita abaixo\*\* e confira que ela roda: é o caminho testado e fica de referência. Só então aplique a marca ou extraia as peças, seguindo a seção "Personalizar" do guia. Termine com uma lista curta do que ainda é da demo e do que falta a pessoa mandar.

## A demo

Junto com este prompt vêm o guia do projeto ([`CLAUDE.md`](http://CLAUDE.md), ou [`AGENTS.md`](http://AGENTS.md) no Codex e outros agentes: design, qualidade, como conferir e como personalizar) e a pasta `arquivos/`. Leia os dois antes de começar.

---

## Parte 1 — O site

Construa a landing page da \*\*Mia\*\*, um estúdio fictício de anúncios UGC (vídeos no estilo "gente comum falando para a câmera") feitos com uma criadora de conteúdo criada por IA. Quem compra: gestores de tráfego e donos de marca de e-commerce, beleza, fitness e apps, que testam anúncio toda semana e precisam de volume de ganchos. Tom: direto, confiante, um pouco irônico ("Prazer, a criadora que…"), e sempre transparente sobre ela ser IA. Todo o texto em português do Brasil, exatamente como está abaixo.

A ideia que amarra a página: \*\*uma personagem só, num plano contínuo\*\*. A Mia em 3D tempo real (Three.js, o `.glb` com esqueleto de `arquivos/models/`) fica num `<canvas>` fixo atrás do conteúdo, e a rolagem muda o estado dela: entra andando pela direita e acena no hero, vira \*\*nuvem de pontos\*\* quando o painel escuro passa por ela, os pontos \*\*explodem e se juntam no nome "MIA" em letras cromadas\*\* que giram, e no fim ela \*\*volta inteira\*\* entre as palavras do fecho. Nada de cards genéricos de agência, ícones com bullet ou mockup de celular.

As imagens em `arquivos/conceito/` são o alvo visual de cada momento. Compare o seu resultado com elas.

### Identidade

- Creme `#efeee8` (fundo claro), tinta `#111111`, cinza `#8d8b84`. Vermelho vivo `#e5141f` (abertura, botões, fecho). Vermelho-noite `#14000a` com feixes `#7a0612` e `#ff2a3d`. Brilho do dissolve `#ff3d6e`.

- Tipos: \*\*Melodrama\*\* 300 (display; Fontshare, os `.woff2` estão em `arquivos/fonts/`, com `font-display: block`), \*\*Instrument Serif\*\* 400 (frases de destaque; `@fontsource/instrument-serif`), \*\*General Sans\*\* 400/500 (rótulos e texto pequeno, 11 a 15 px; `arquivos/fonts/`). As letras 3D usam a \*\*Bodoni Moda\*\* convertida para o formato do Three (`arquivos/fonts/bodoni-mia.typeface.json`, só os glifos M, I e A).

- Marca: "Mia" em Melodrama. Favicon: `arquivos/favicon.svg` (círculo vermelho com a estrela de quatro pontas creme).

- Botão: pílula vermelha de 36 px de altura, texto branco 13 px peso 500; no hover sobe 2 px e escurece para `#c10f19`.

- Margem lateral `clamp(18px, 4.4vw, 72px)`. Curva padrão `cubic-bezier(0.22, 1, 0.36, 1)`.

### A personagem (3D)

- `arquivos/models/mia.glb`: mulher de 24 anos, regata vermelha, calça creme, cabelo castanho comprido; malha comprimida com meshopt (carregue com `GLTFLoader().setMeshoptDecoder(MeshoptDecoder)`), esqueleto biped com nomes do Mixamo (`Head`, `Neck`, `Spine2`, `RightArm`, `RightForeArm`, `RightHand`, dedos). Ela exporta olhando para +X: gire −90° em Y.

- Escala para 1,70 m, pés em y = 0, centrada. Os braços saem da pose em A e descem para junto do corpo no carregamento (`relaxArms`).

- Câmera em perspectiva de FOV 22°, enquadrando o busto: o topo da cabeça a \~17% da altura da tela e a tela cortando na cintura. No retrato (celular) ela fica menor e mais abaixo, sob o título.

- Luz: `RoomEnvironment` como ambiente (intensidade 0,85), uma luz principal branca do alto à direita e um recorte rosado por trás. A textura já traz luz: metal zero no material (senão o cabelo fica acinzentado). Tone mapping `NeutralToneMapping`. Canvas transparente: o fundo de cada seção é o CSS.

- \*\*Dissolve\*\*: costurado no material padrão do Three (`onBeforeCompile`): ruído simplex 3D no espaço da personagem descarta os fragmentos abaixo de um limiar e acende uma borda `#ff3d6e`. Serve para a volta no fecho e para dissolver a base do corpo (abaixo de uma altura) no fecho.

- \*\*Corte em Y\*\*: abaixo de uma altura do mundo a malha some e, nessa linha, brilha um fio rosado quase branco; dali para baixo quem desenha a Mia são os pontos.

- \*\*Rosto sem blendshape\*\*: o rig não tem ossos de rosto e os olhos são pintados na textura. O sorriso desloca os cantos da boca e as bochechas no vertex shader, antes do skinning (`uSorriso`). Piscada, olhar, sobrancelha e o fundo do sorriso (cantos da boca, maçãs e pálpebra de baixo subindo) mudam \*\*onde a textura é lida\*\* no fragment shader: um mapa (z, y) → uv da frente do rosto, rasterizado no carregamento, converte o desvio medido na malha em desvio de uv sem facetas. A pálpebra de cima desce sobre o olho parado esticando a pele de cima; a íris anda dentro da abertura e os cantos ficam no lugar. Relevo e rugosidade leem do mesmo ponto deslocado, para a pálpebra fechada não ficar com o brilho do olho.

- \*\*Gravura no rastro do cursor\*\*: o cursor deixa um rastro (um canvas pequeno com um traço branco que some sozinho em \~1,5 s) e, onde o rastro está, a Mia aparece como gravura: papel quase branco com hachura vermelha `#e5141f` em duas famílias de linhas no espaço da tela, mais densa nas sombras. É uma segunda malha com o mesmo esqueleto, por cima (polygon offset), com a máscara do rastro.

- \*\*Nuvem de pontos\*\*: no carregamento, a pose atual é "assada" e amostrada na superfície (`MeshSurfaceSampler`): 30 mil pontos no desktop, 16 mil abaixo de 760 px. Cada ponto também ganha um destino na superfície das letras 3D. Pontos redondos, quase brancos, com tamanho e brilho aleatórios e um leve flutuar.

### 0. Abertura

Tela vermelha `#e5141f` cobrindo tudo, com um contador `000` no centro (General Sans 12 px, entreletra 0,12em, algarismos tabulares, branco 85%) que acompanha \*\*o carregamento real do `.glb`\*\* (nunca anda mais rápido que ele). Pronto: o contador vai a `100`, some, e o painel vermelho \*\*sobe\*\* para fora da tela (1,1 s, `expo.inOut`), as letras do título "Mia" \*\*acendem em ordem aleatória\*\* (cada letra vai de 8% a 100% de opacidade) e a linha de baixo e a nav entram subindo 14 px. A Mia não está no centro: ela \*\*entra andando\*\* (abaixo). A rolagem fica travada até ela parar.

Então a chegada, fora da linha do tempo da abertura (a rolagem não espera o aceno), começando enquanto o painel sobe. Tudo procedural, sem clipe de animação, e o que tem de parecer \*\*gente de verdade\*\*:

- \*\*Entra pela direita, fora da tela, andando\*\* num caminho curvo (de um pouco ao fundo até o centro), e chega de frente para a câmera. No retrato ela vem de mais longe, quase em direção à câmera, porque a tela é estreita.

- \*\*Caminhada\*\*: os pés pousam onde o quadril vai estar no meio do apoio (IK de duas juntas, sem escorregar), com rolagem do calcanhar à ponta, pé no ar subindo e descendo; quadril que desce no apoio duplo, vai para o lado do pé no chão, gira e inclina com a perna que avança; tronco em contrafase; braços em pêndulo com mola (atrasam um pouco e assentam quando ela para); na freada o tronco tem inércia. Os passos encurtam sozinhos na freada e os dois últimos fecham os pés na pose de repouso.

- \*\*Ela percebe que estamos olhando\*\*: andando, olha o caminho e os olhos passeiam; no meio do caminho os olhos vão até a câmera antes da cabeça, ela olha rápido, volta ao caminho e então olha de verdade, com \*\*as sobrancelhas subindo num lampejo\*\* (o cumprimento de reconhecimento) e um sorriso que nasce. Salto grande do olhar costuma vir com uma piscada.

- \*\*Para de frente e acena com a mão direita\*\*: o braço começa a subir enquanto o último passo assenta; o cotovelo sobe e o antebraço passa à frente do corpo antes de ficar em pé (a mão nunca abre esticada para o lado), palma para a frente; o ombro sobe, o tronco compensa e a cabeça inclina; no balanço (\~1,8 Hz) a mão vai e volta \*\*atrasada em relação ao antebraço\*\* e o cotovelo compensa. O sorriso chega ao máximo, com os olhos "sorrindo". No retrato o cotovelo vem à frente e a mão fica diante do ombro, para não sair do quadro.

- \*\*Depois\*\*: o braço desce pelo mesmo caminho, o sorriso fica leve, o peso vai para uma perna (o joelho da outra dobra sozinho pela IK), e o tempo todo: respiração, balanço lento, piscadas a cada 2 a 6 s (às vezes duas seguidas), olhos que chegam antes da cabeça e \*\*olhar que segue o cursor\*\* (olhando para baixo, a pálpebra acompanha).

### 1. Hero (creme) — alvo `00-hero.jpg`

- Nav fixa por cima de tudo, em branco com `mix-blend-mode: difference` (legível no creme, no escuro e no vermelho, onde fica num tom frio): "Mia" (Melodrama 26 px) à esquerda, "Estúdio de UGC com IA" ao lado (70%, some no celular), e "Reservar um lote" sublinhado à direita, que leva ao fecho.

- "Mia" \*\*enorme e centralizado\*\*, como logo de capa de revista (Melodrama 300, `clamp(64px, 30vw, 600px)`, entrelinha 0,8), \*\*atrás\*\* do canvas: a personagem passa na frente das letras.

- Linha de baixo, por cima do canvas: à esquerda, em Instrument Serif `clamp(20px, 1.9vw, 30px)`, "Prazer, a criadora que grava trinta ganchos / antes do seu café esfriar." e, embaixo de um fio, "/ Lote — 30 vídeos" e "/ a partir de R$ 4.900"; à direita, em 13 px, "Uma criadora de conteúdo feita em IA, com rosto licenciado e voz própria, para marcas que testam anúncio toda semana." e o botão "Reservar um lote".

- A gravura do cursor só vale aqui (e no fecho): some quando o painel escuro chega.

### 2. Um rosto só (vermelho-noite, presa por \~1,4 tela) — alvo `01-rosto.jpg`

O painel `#14000a` \*\*sobe de baixo\*\* e, exatamente na linha de cima dele, a malha da Mia vira pontos: acima da linha ela é a personagem, abaixo é a nuvem, com o fio brilhando no corte. Quando o painel cobre a tela, ela é toda pontos. \*\*Ela começa a girar\*\* em torno do próprio eixo quando a seção prende e \*\*não para mais\*\* até sumir na explosão da seção seguinte (uma volta e meia no total, arrancando suave e seguindo em velocidade constante, sem frear entre as duas seções presas).

- Fundo com quatro "feixes": manchas radiais vermelhas grandes (`#ff2a3d` a 55% para `#7a0612` a 35% e transparente), presas à tela enquanto o escuro dura, derivando devagar (17 a 24 s, ida e volta).

- No alto, "Um rosto só," e, alinhado à direita na linha de baixo, "mil versões dela" (Melodrama 300, `clamp(48px, 8.4vw, 160px)`, creme). No pé: "Cada vídeo sai marcado como IA, / do jeito que as plataformas pedem." (serif) à esquerda; à direita "5 dias" em serif e "do briefing ao primeiro lote / na sua pasta" em 13 px a 70%.

### 3. O que chega na sua pasta (presa por \~2,3 telas) — alvos `02-pontos.jpg` e `03-entrega.jpg`

Os pontos \*\*se espalham\*\* para cima e para os lados (início da seção), \*\*voam até a superfície das letras\*\* "MIA" com uma estrela de quatro pontas de lados côncavos sobre o I (cada ponto sai num atraso aleatório), e as letras \*\*acendem em cromo por dissolve\*\* enquanto os pontos se apagam. Na segunda metade, as letras \*\*giram uma volta inteira\*\* em Y com a rolagem.

- Letras: `TextGeometry` com bisel, \~metade da largura da tela; material físico de metal 1, aspereza 0,06, verniz; o ambiente do cromo é um estúdio escuro com faixas de luz brancas e vermelhas (feito em código com `PMREMGenerator`), para o metal refletir a página e não um cinza neutro.

- "O que chega" no alto à esquerda e "na sua pasta" à direita, um pouco mais abaixo (Melodrama 300, `clamp(40px, 6.6vw, 124px)`). No pé, à esquerda, uma lista em escada (cada item recuado 2,4em a mais): "/ Cortes em 9:16, 4:5 e 1:1", "/ Legenda em dois estilos", "/ Cinco ganchos por roteiro", "/ Voz e cenas de apoio liberadas"; à direita, em serif alinhado à direita: "Os arquivos ficam com você: tráfego pago, orgânico e afiliados, pelo tempo que quiser."

### 4. Como funciona (creme, \~3,8 telas) — alvo `04-processo.jpg`

O painel creme sobe \*\*por cima\*\* do canvas com um \*\*recorte chanfrado no topo\*\*: um entalhe no meio do painel (o escuro aparece por ele), com fundo da largura de uma coluna (`clamp(150px, 17vw, 300px)`), 15% da tela de fundo e a boca 3vw mais larga de cada lado (um `clip-path: polygon` no `::before` creme); a seção começa 15% da tela antes, por cima do fim do escuro. Ele vira um \*\*túnel em perspectiva\*\* (`perspective: 1200px`, 900 px no celular) preso à tela:

- Grade de pontinhos que some nas bordas, um brilho vermelho suave no centro, um aro fino vermelho (48vmin) e outro tracejado (76vmin).

- No centro, "Como funciona" (11 px, caixa alta, entreletra 0,4em, vermelho) e três passos que dividem a mesma célula e trocam a cada terço da viagem, com o nome acendendo letra a letra: \*\*Pauta\*\* — "Você manda o produto, a oferta e o público. Três ganchos voltam no mesmo dia."; \*\*Produção\*\* — "A Mia grava em casa, na rua, na academia: onde o seu cliente está."; \*\*Pacote\*\* — "Trinta vídeos editados, legendados e nomeados por gancho, prontos para subir." (nome em Melodrama `clamp(56px, 10vw, 180px)`; texto 13 px que entra subindo).

- Nove \*\*cartas 9:16\*\* com as fotos de `arquivos/img/ugc/` (largura `clamp(170px, 15vw, 250px)`, `clamp(120px, 34vw, 170px)` no celular; cantos de 16 px, sombra, legenda em caixa alta no pé sobre um degradê escuro): "01 / Rotina de pele" (espelho), "02 / Café da manhã" (cozinha), "03 / Na rua" (rua), "04 / Review no carro" (carro), "05 / Antes e depois" (sofá), "06 / Pós-treino" (academia), "07 / Home office" (mesa), "08 / Piquenique" (parque), "09 / Unboxing" (cama). Elas saem do fundo em \*\*espiral de ângulo áureo\*\* (137,5° entre cartas), cada uma numa fatia da viagem, e \*\*atravessam a câmera\*\* com a rolagem (de −1700 px a +500 px em z; no celular −1200 a +350), com opacidade que entra e sai nas pontas, uma leve rotação em Z e \*\*parallax no cursor\*\*. No hover, borda vermelha e a foto cresce 8%.

- O centro cresce de 0,8 a 1,25 durante a viagem e some no fim; "Role para atravessar" com um fio vermelho no pé, que some no começo.

### 5. Chama a Mia (vermelho vivo) — alvo `05-fecho.jpg`

Um bloco vermelho nasce com margem lateral de 5vw e cantos de 28 px e \*\*abre até a tela cheia\*\* enquanto sobe (o recorte fica num `::before` com `clip-path`; no próprio bloco, criaria um contexto de empilhamento e prenderia a linha de contato embaixo do canvas).

- "Chama" à esquerda e "a Mia" à direita, gigantes (Melodrama 300, `clamp(60px, 14.6vw, 280px)`, branco), e \*\*a Mia volta entre as palavras\*\*: entra por dissolve conforme o bloco sobe, acompanha a posição do bloco e tem a \*\*base do corpo dissolvendo\*\* com brilho, presa ao pé do bloco (no retrato, à linha do texto, para não brigar com ele). A gravura no cursor volta a valer.

- No pé: "Restam duas vagas em novembro." (serif) e "Conta o produto e a oferta. Em até 24 horas chegam três ganchos para você aprovar antes de pagar qualquer coisa." (13 px); à direita, uma \*\*pílula creme gigante\*\* (`clamp(260px, 34vw, 620px)` de largura) com o e-mail "[oi@chamaamia.com.br](mailto:oi@chamaamia.com.br)" em serif, que no hover cresce 3%, fica branca e o texto vermelho. É um `mailto:`.

- Rodapé no creme: "© 2026 Mia Estúdio" e "Personagem criada por IA. Rosto fictício, sinalizado em todos os vídeos." (11 px, `#6f6d66`).

### Títulos

Todo título grande é quebrado em letras e \*\*acende em ordem aleatória ao entrar e apaga ao sair\*\* (por tempo, nunca preso ao scroll): o "Mia" do hero, "Um rosto só, / mil versões dela", "O que chega / na sua pasta", "Chama / a Mia" e os nomes dos passos.

### Movimento (a régua)

- \*\*Um loop só\*\* (o ticker do GSAP): a cada quadro, lê o estado-alvo da cena a partir da rolagem (`motion/cenas.js`: corte, giro, espalhar, morph, cromo, saída, giro das letras, seguir o cursor, gravura, dissolve, base e deslocamento) e aproxima os valores que amortecem com um fator de 0,14; os que o scroll dita direto (corte e posição) vão direto.

- Lenis (lerp 0,09) no ticker do GSAP, com `lagSmoothing(0)`. Os pins do ScrollTrigger (`.rosto` por 140%, `.entrega` por 230%) são criados \*\*antes\*\* do Lenis. Links `#` rolam pelo Lenis.

- `prefers-reduced-motion`: sem abertura, sem Lenis, sem a chegada (ela já está de pé no centro, olhando para a câmera com um sorriso leve), títulos já acesos, só o primeiro passo do túnel. O 3D continua.

- Celular (390 × 844 de referência): menos pontos, DPR até 1,75, a Mia menor e abaixo do título; no hero, o título vira 34vw e a linha de baixo ganha um degradê creme por cima do corpo; no fecho, "Chama" e "a Mia" ficam em duas linhas. Nada estoura a largura (`overflow-x: clip`).

---

## Parte 2 — Stack e arquivos

- \*\*Vite sem framework\*\* (HTML, CSS e JS puros). Monte o `package.json` à mão (ou use `npm create vite@latest` com o template vanilla e apague os arquivos de exemplo: `counter.js`, `style.css`, os SVGs e o `main.js` dele), com os scripts `dev`, `build` e `preview`. Versões travadas, com `--save-exact`: `three@0.186.1`, `gsap@3.15.0`, `lenis@1.3.26`, `@fontsource/instrument-serif@5.2.8` e, em dev, `vite@8.3.3`. Sem `vite.config.js` (o `await` no topo do `main.js` já passa no alvo padrão do Vite).

- `arquivos/codigo/` traz o JavaScript do site pronto; use como está e escreva o HTML e o CSS a partir da descrição acima (os seletores que o código procura estão no guia): `main.js` (entrada: carrega tudo, liga o loop e a abertura), `three/stage.js` (renderer, câmera, luz, enquadramento), `three/mia.js` (personagem, materiais, gravura, amostragem dos pontos, piscadas), `three/corpo.js` (o esqueleto animado por código: caminhada com IK, olhar, aceno, idle), `three/rosto.js` (piscada, olhar, sobrancelha e sorriso no shader), `three/glsl.js` (ruído, dissolve e corte costurados nos materiais), `three/pontos.js` (nuvem de pontos e morph para as letras), `three/letras.js` (MIA cromado e a estrela), `three/trail.js` (rastro do cursor), `motion/intro.js` (contador e abertura), `motion/chegada.js` (a coreografia da entrada), `motion/cenas.js` (estado da cena pela rolagem e os pins), `motion/tunel.js`, `motion/split.js`, `motion/smooth.js`.

- Copie para `public/`: `arquivos/models/mia.glb` → `public/models/`, `arquivos/fonts/*` → `public/fonts/` (com as licenças), `arquivos/img/ugc/*` → `public/img/ugc/`, `arquivos/favicon.svg` → `public/`.

- No `index.html`: `lang="pt-BR"`, `theme-color` `#e5141f`, preload da `Melodrama-Light.woff2`, e o mínimo da abertura inline no `<head>` (pinta antes do CSS; o trecho está no guia), com o script que põe `intro-on` ou `rm` (movimento reduzido) e `touch` no `<html>`.

- Estrutura: entrada em `src/main.js` (o de `arquivos/codigo/`, que importa os CSS abaixo), tokens e `@font-face` em variáveis CSS (`src/styles/tokens.css`; declare a Melodrama 300 e 400 e a General Sans 400 e 500), base em `src/styles/base.css` (com o CSS do Lenis: `html.lenis, html.lenis body { height: auto }` e `.lenis.lenis-stopped { overflow: hidden }`), um CSS por seção (`src/sections/`: `loader`, `hero`, `escuro` para o rosto e a entrega, `processo`, `fecho`), 3D em `src/three/`, motion em `src/motion/`.

- Camadas: fundos das seções (z auto) &lt; canvas fixo (z 1, `pointer-events: none`) &lt; textos por cima da personagem (z 2) &lt; seção do processo (z 3, cobre o canvas) &lt; nav (z 50) &lt; abertura (z 100).

- `npm run build` gera `dist/`, HTML estático que sobe em qualquer hospedagem, na raiz do domínio (o código busca `/models/…` e `/fonts/…`; para servir numa subpasta, configure o `base` do Vite e troque esses caminhos por `import.meta.env.BASE_URL`).

Siga o guia do projeto ([`CLAUDE.md`](http://CLAUDE.md) ou [`AGENTS.md`](http://AGENTS.md)) para conferir o resultado seção por seção contra as imagens de `arquivos/conceito/`.

