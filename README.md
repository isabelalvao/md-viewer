# Visualizador de Markdown

Aplicação web estática (sem build) para visualizar ficheiros `.md` com formatação correta.

## Funcionalidades
- Arrastar e largar um ou vários ficheiros `.md` (cada um abre num separador), botão **Abrir ficheiro** e **Colar texto** (ou Ctrl+V)
- GitHub Flavored Markdown: tabelas, listas de tarefas, riscado, notas de rodapé
- Realce de sintaxe (highlight.js), fórmulas KaTeX (`$...$`, `$$...$$`), diagramas Mermaid
- HTML sanitizado com DOMPurify
- Tema claro/escuro (github-markdown-css), índice automático, impressão/exportação PDF
- Parâmetro opcional `?url=https://.../ficheiro.md` (o servidor tem de permitir CORS)
- Os ficheiros são processados apenas no navegador; nada é enviado para servidores

## Executar localmente
```bash
python3 -m http.server 8000   # abrir http://localhost:8000
```

## Publicar no Vercel
**Opção A – CLI**
```bash
npm i -g vercel
cd md-viewer
vercel          # primeira vez: login e configuração (Framework: Other, sem build command)
vercel --prod   # publicar em produção → https://<nome>.vercel.app
```
**Opção B – GitHub**
1. Criar um repositório com estes ficheiros e fazer push.
2. Em https://vercel.com/new importar o repositório.
3. Framework Preset: **Other**; Build Command e Output Directory vazios.
4. Clicar **Deploy**.

**Opção C – Arrastar a pasta** em https://vercel.com/new (upload direto).

## Ficheiros
`index.html`, `style.css`, `app.js`, `vercel.json`, `sample.md` (exemplo de teste).
