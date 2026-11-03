# FTTH Manager — GitHub Pages

Aplicativo web para gestão e desenho básico de rede FTTH/FTTx.

## Recursos
- Mapa interativo Leaflet com alternância entre satélite Esri World Imagery e ruas OpenStreetMap.
- Importação KML/KMZ (pontos, linhas e polígonos simples).
- Cadastro de CTOs com 8, 16, 24 ou 32 portas e ocupação por cliente.
- Cadastro de clientes com vínculo à CTO/porta, plano, telefone, endereço e status.
- Cadastro de caixas e emendas.
- Desenho de cabos no mapa por cliques.
- Exportação KML e backup JSON.
- Armazenamento local no navegador (localStorage), sem backend.

## Publicar
1. Extraia o ZIP.
2. Crie um repositório GitHub `ftth-manager`.
3. Envie `index.html` e `README.md` para a raiz.
4. Em Settings → Pages, escolha Deploy from a branch, `main` e `/(root)`.
5. Salve e aguarde a publicação.

## Satélite sem chave Google
O satélite usa Esri World Imagery; ruas usam OpenStreetMap. Os créditos são exibidos no mapa. A cobertura e resolução variam por localidade. O uso dos serviços deve respeitar os termos e limites dos provedores.

## Armazenamento
Os dados ficam somente no navegador/dispositivo atual. Não há sincronização ou servidor. Faça backup JSON regularmente. Limpar os dados do navegador pode apagar o projeto.

## Limitações
Ferramenta de inventário e desenho operacional básico. Não calcula orçamento óptico, perdas, potência ou valida automaticamente fusões e continuidade topológica.
