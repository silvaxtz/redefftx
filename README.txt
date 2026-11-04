# FTTH Manager — Projetos separados

Aplicativo web estático para GitHub Pages, com múltiplos projetos FTTH independentes.

## Arquivos
- `index.html`: estrutura do aplicativo.
- `styles.css`: interface e estilos.
- `app.js`: mapa, projetos, equipamentos, cabos, áreas, importação/exportação e armazenamento local.

## Publicar no GitHub Pages
1. Extraia o ZIP.
2. Envie os três arquivos para a raiz do repositório (mesma pasta).
3. Faça commit/push.
4. Em Settings > Pages, selecione a branch e a pasta `/ (root)` se ainda não estiver configurado.

## Recursos incluídos
- Vários projetos separados, com criar, trocar, renomear e excluir.
- Mapa satélite Esri, mapa de ruas OSM e camadas de rótulos.
- Cadastro de CTO, CEO, splitter e cliente clicando no mapa.
- Desenho de cabos com vários pontos, cor, espessura e quantidade de fibras.
- Desenho de áreas de atendimento.
- Edição/exclusão de equipamentos, cabos e áreas.
- Associação de clientes a portas de CTO.
- Sequência de 12 cores de identificação de fibras.
- Importação KML/KMZ, exportação KML.
- Backup geral e backup por projeto.
- Salvamento automático em `localStorage`.

## Limitações importantes
- O armazenamento é local ao navegador/dispositivo; não há sincronização entre computadores ou usuários.
- O catálogo de fibras mostra o padrão de 12 cores, mas o gerenciamento de fusões, continuidade ponta a ponta e OTDR ainda precisa ser implementado em uma próxima etapa.
- A importação KML atual lê pontos, linhas e polígonos comuns; estilos avançados e estruturas KML complexas podem não ser preservados.
- As bibliotecas Leaflet e JSZip são carregadas por CDN, portanto é necessária conexão com a internet.
- O aplicativo foi preparado como base funcional para GitHub Pages; teste os fluxos no seu navegador e faça backup antes de usar em operação real.
