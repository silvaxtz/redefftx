# FTTH Manager

Aplicação web para organização de redes FTTH/FTTx, pronta para GitHub Pages.

## Recursos
- Importação de KML e KMZ do Google Earth.
- Mapa Google com modo híbrido/satélite.
- Cadastro de CTOs com 8, 16, 24 ou 32 portas.
- Visualização de portas livres e ocupadas.
- Cadastro e vínculo de clientes à CTO/porta.
- Cadastro de caixas, DIOs, CEOs e caixas de emenda.
- Desenho de cabos por pontos no mapa.
- Exportação KML e backup JSON.
- Armazenamento local no navegador (localStorage).

## Publicar no GitHub Pages
1. Crie um repositório no GitHub (por exemplo `ftth-manager`).
2. Envie o arquivo `index.html` para a raiz do repositório.
3. Abra **Settings → Pages**.
4. Em **Build and deployment**, escolha **Deploy from a branch**.
5. Selecione a branch `main` e a pasta `/ (root)`, depois salve.
6. Aguarde o endereço publicado pelo GitHub Pages.

## Configurar Google Maps
O Google Maps JavaScript API exige uma chave de API e, normalmente, uma conta de faturamento habilitada no Google Cloud.
1. Acesse https://console.cloud.google.com/
2. Crie ou selecione um projeto.
3. Ative **Maps JavaScript API**.
4. Crie uma API key e restrinja-a ao seu domínio do GitHub Pages (e localhost durante testes).
5. Abra o app → Ajustes → cole a chave → **Salvar e carregar Google Maps**.

A chave é guardada no localStorage do navegador. Não publique uma chave irrestrita em repositório público.

## Armazenamento e segurança
Os dados são guardados somente no navegador/dispositivo atual. Não há sincronização entre dispositivos nem banco de dados. Faça backup JSON e exportação KML periodicamente. Limpar os dados do navegador pode apagar os dados do app.

## Importação
Importa elementos KML comuns (pontos, linhas e polígonos simples) e KMZ contendo um arquivo KML. Para exportação, os elementos cadastrados e os principais elementos importados são gravados em KML.

## Observação
Este é um MVP operacional para inventário e desenho básico de rede. Não substitui projeto óptico profissional nem calcula perdas, orçamento óptico, fusões ou continuidade topológica automaticamente.
