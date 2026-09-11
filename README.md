# MyDramaList Wrapped — Gerador Pessoal

Ferramenta local que gera uma imagem "Wrapped" (estilo AniList Wrapped) a
partir da página de year-in-review de qualquer usuário do MyDramaList.
Você roda no seu computador, sob demanda, e envia o PNG pronto pra quem
pediu. Não é um site nem uma extensão — não fica hospedado em lugar nenhum
nem precisa que a outra pessoa instale ou faça nada.

## Arquivos da pasta

- `generate-wrapped.js` — script principal. Abre a página do MDL, extrai
  os dados e gera a imagem.
- `mdl-wrapped-template.html` — o template visual (o "layout" do card).
  Pode ser aberto direto no navegador pra visualizar/ajustar o design com
  dados de exemplo, sem precisar rodar o script.
- `mdl-wrapped-extractor.js` — versão do extrator pra colar manualmente no
  console do navegador (F12), caso quiira só conferir os dados de alguém
  sem gerar a imagem.
- `package.json` — lista a dependência necessária (Puppeteer).

## Requisitos (só uma vez)

1. Instalar o [Node.js](https://nodejs.org) (qualquer versão LTS).
2. Abrir o terminal dentro desta pasta e rodar:
   ```
   npm install
   ```
   Isso baixa o Puppeteer (um Chrome headless controlado por código), que é
   o que faz o script conseguir abrir a página do MDL sozinho.

## Como gerar um Wrapped

```
node generate-wrapped.js <username> <ano> <cor>
```

Exemplos:
```
node generate-wrapped.js cuscuzcomleite 2025
node generate-wrapped.js cuscuzcomleite 2024 blue
node generate-wrapped.js outro-usuario 2025 gold
```

Se o ano for omitido, o script assume 2025 por padrão. Se a cor for
omitida, assume roxo (`purple`). Cores disponíveis: `purple`, `blue`,
`rose`, `green`, `gold`.

O resultado é salvo na mesma pasta como `<username>-wrapped-<ano>.png`,
pronto pra enviar pra quem pediu.

## Anos anteriores e anos futuros

O ano é só um parâmetro — não tem nada fixo no código amarrado a 2025.
Funciona da mesma forma para:

- **Anos anteriores** (2024, 2023...), desde que a pessoa tenha tido
  atividade suficiente naquele ano pra a MDL gerar a página de
  year-in-review dela.
- **Anos futuros** (2026 em diante), assim que a MyDramaList publicar a
  página daquele ano — normalmente isso sai pouco depois da virada do ano.
  Não precisa mudar nada no script, só usar o novo número.

## Possíveis problemas (não relacionados ao ano)

- **A MDL redesenhar a página:** se em algum momento a MyDramaList mudar a
  estrutura/classes CSS da página de year-in-review, os seletores usados
  no `generate-wrapped.js` podem parar de bater com o HTML real, e o
  script vai precisar de ajuste. Isso não tem como prever com antecedência.
- **Ano com pouca atividade:** se a pessoa assistiu pouco naquele ano,
  algumas seções (ex. top atores, top filmes) podem vir vazias. O script
  não trava nesse caso, mas o card final pode ficar com algum painel sem
  conteúdo.
- **Perfil ou página bloqueada:** o script depende da página
  `mydramalist.com/profile/<user>/year/<ano>` ser pública (acessível sem
  login). Isso foi confirmado funcionando em setembro de 2026. Se um dia
  parar de funcionar sem estar logado, o script vai avisar no terminal em
  vez de travar silenciosamente.

## Detalhes técnicos (caso precise mexer no futuro)

- As imagens (pôsteres e fotos de elenco) passam por um proxy gratuito
  (`images.weserv.nl`) só pra ganhar cabeçalho CORS — sem isso, o
  screenshot final sairia com as imagens em branco. Pôsteres de drama são
  recortados em proporção fixa (2:3) porque encaixam bem assim; fotos de
  atores/atrizes NÃO são recortadas à força — usam a proporção natural que
  o próprio MDL já fornece, porque forçar um recorte quadrado nelas ficava
  ruim.
- A seção "Top Rated Movies" só aparece se a pessoa tiver pelo menos 6
  filmes avaliados (mesma quantidade mostrada em Top Rated Dramas) —
  senão fica escondida de propósito, pra não sobrar uma fileira pela
  metade.
- O template tem uma barra de cores no topo da página (não aparece na
  imagem final) pra trocar o tom de destaque — só serve pra visualização
  manual no navegador, o script de geração automática não usa isso.
