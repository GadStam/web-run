# Receitas: como a Mia e as fotos dela foram feitas

A Mia não existe: o rosto, o corpo e as fotos foram gerados por IA, e o modelo 3D saiu dessas imagens. Aqui está o caminho, na ordem em que foi feito, para você criar a **sua** personagem (o avatar da sua marca, um mascote humanoide) ou só as fotos do túnel. Os prompts estão em inglês porque os geradores entendem melhor.

Nenhuma IA de código edita o modelo 3D que já existe: não dá para "trocar o rosto da Mia" por pedido. Uma personagem nova é um `.glb` novo, feito pelo caminho abaixo.

## Do que você precisa

- **Um gerador de imagem que aceite foto de referência**: ChatGPT (imagens), Gemini, Midjourney (com referência de imagem) ou outro. São umas 15 imagens; num plano pago desses geradores, sai na assinatura do mês.
- **Um gerador de imagem para 3D com esqueleto automático**: Tripo3D, Meshy ou outro, num plano que permita **uso comercial** (nos planos grátis o modelo costuma ficar público e sem licença comercial). Na API do Tripo, o modelo da Mia com textura e esqueleto custa em torno de US$ 2.
- Para comprimir o modelo: Node (a IA do seu editor roda o `gltf-transform`).

## Parte 1: a personagem

1. **Estilo** (`estilo.prompt.txt`). É a ficha da personagem: idade, pele, cabelo, expressão, roupa e o jeito de renderizar (luz chapada sem sombra, fundo cinza-claro liso, corpo inteiro com margem). Troque a pessoa e a roupa pela sua; mantenha o bloco "Rendering" igual, porque é ele que faz o 3D sair limpo.
2. **Frente** (`frente.prompt.txt`). Pose em A (braços retos, uns 30° afastados do corpo, palmas para as coxas), olhando para a câmera, simétrica, 3:4. Gere até o rosto ficar como você quer: essa imagem define a personagem.
3. **Lados e costas** (`lado-esquerdo`, `lado-direito`, `costas`). Anexe a imagem da frente e peça a mesma personagem virada. Confira que o cabelo, a roupa e a altura batem com a frente.
4. **Roupa final** (`regata.prompt.txt`). A Mia começou de camiseta e terminou de regata (braços livres deixam o aceno mais limpo). Para trocar só a roupa, anexe a frente e peça a mesma imagem com uma mudança só, como nesse prompt.
5. **Imagem para 3D**. No gerador, use o modo "multiview" (frente, lados e costas) ou só a frente. Peça modelo texturizado.
6. **Esqueleto**. Use o rig automático do próprio gerador (biped/humanoide, com nomes do Mixamo: `Hips`, `Spine2`, `Neck`, `Head`, `RightArm`, `RightForeArm`, `RightHand`, dedos) ou suba o modelo no Mixamo (Adobe, gratuito) e baixe sem animação. Se o rig automático recusar a malha por excesso de polígonos, reduza a malha no gerador (retopologia) e confira o rosto: a textura pode borrar.
7. **Exportar e comprimir**. Exporte `.glb` e rode `npx @gltf-transform/cli optimize modelo.glb public/models/mia.glb --compress meshopt --texture-compress webp`. Mire em até ~3 MB. O site carrega com o decodificador meshopt.
8. **No código** (o guia, seção "Personalizar", tem o detalhe): o `giro` do modelo em `src/three/mia.js` conforme o lado para onde ele olha, e as expressões (medidas no rosto da Mia: sorriso, piscada, olhar, sobrancelha) medidas de novo com `fonte/rosto.mjs` ou desligadas.

## Parte 2: as fotos do túnel (UGC)

Os nove prompts de `ugc/` têm a mesma primeira parte (a personagem, o jeito de foto de celular feita pela própria criadora, sem texto nem marca em produto nenhum) e uma linha `Scene:` que muda. Para cada foto, **anexe a imagem da frente** da personagem e troque só a cena: o seu produto (sem rótulo, ou com o rótulo real da sua marca), o lugar, a roupa.

Formato que o site espera: vertical 9:16, WebP com cerca de 640 × 1137 px e até ~100 KB, em `public/img/ugc/`, com o nome usado no `index.html`. A IA do seu editor converte (com `sharp`, `cwebp` ou o `sips` do Mac).

Se você já grava vídeos de verdade, use quadros deles no lugar das fotos geradas: é mais fiel ao que você vende.

## A palavra cromada

As letras 3D usam a Bodoni Moda (Google Fonts, licença OFL) convertida para o formato de fonte do Three só com M, I e A. Para outra palavra, `fonte/typeface.mjs` faz a conversão (o cabeçalho do arquivo diz como rodar).

## Cuidados

- Personagem gerada por IA é sinalizada como IA, no site e nos vídeos.
- Não use o rosto de uma pessoa real (nem "parecida com" uma celebridade) sem autorização por escrito dela.
