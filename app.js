(() => {
  const $ = s => document.querySelector(s);
  const content = $('#content'), tocUl = $('#toc ul'), tabsEl = $('#tabs');
  let docs = [], active = -1;
  let theme = localStorage.getItem('mdv-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

  // ---- Math extension for marked ($...$ and $$...$$) ----
  const renderTex = (tex, display) => {
    try { return katex.renderToString(tex, { displayMode: display, throwOnError: false, output: 'html' }); }
    catch (e) { return `<code>${tex}</code>`; }
  };
  const mathExt = {
    extensions: [
      { name: 'blockMath', level: 'block',
        start: s => s.match(/\$\$/)?.index,
        tokenizer(src) { const m = /^\$\$([\s\S]+?)\$\$(?:\n|$)/.exec(src); if (m) return { type: 'blockMath', raw: m[0], text: m[1].trim() }; },
        renderer: t => `<div class="math-block">${renderTex(t.text, true)}</div>` },
      { name: 'inlineMath', level: 'inline',
        start: s => s.match(/\$/)?.index,
        tokenizer(src) { const m = /^\$\$([^$]+?)\$\$/.exec(src) || /^\$(?!\s)([^$\n]+?)(?<!\s)\$(?!\d)/.exec(src);
          if (m) return { type: 'inlineMath', raw: m[0], text: m[1], display: m[0].startsWith('$$') }; },
        renderer: t => renderTex(t.text, t.display) }
    ]
  };
  const slugCounts = {};
  const slug = t => { let s = t.toLowerCase().replace(/<[^>]+>/g,'').replace(/[^\p{L}\p{N}\s-]/gu,'').trim().replace(/\s+/g,'-') || 'sec';
    if (slugCounts[s] != null) s += '-' + (++slugCounts[s]); else slugCounts[s] = 0; return s; };
  marked.use({ gfm: true, breaks: false });
  if (window.markedFootnote) marked.use(markedFootnote({ description: 'Notas' }));
  marked.use(mathExt);
  marked.use({ renderer: {
    code(code, lang) {
      // marked v12 signature (code, infostring)
      if (typeof code === 'object') { lang = code.lang; code = code.text; }
      lang = (lang || '').split(/\s/)[0];
      const esc = code.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      if (lang === 'mermaid') return `<pre class="mermaid">${esc}</pre>`;
      let html = esc;
      try { html = lang && hljs.getLanguage(lang) ? hljs.highlight(code, { language: lang }).value : hljs.highlightAuto(code).value; } catch {}
      return `<pre><code class="hljs language-${lang || 'plaintext'}">${html}</code></pre>`;
    },
    heading(text, level) {
      if (typeof text === 'object') { level = text.depth; text = this.parser.parseInline(text.tokens); }
      return `<h${level} id="${slug(text)}">${text}</h${level}>`;
    }
  }});

  function applyTheme() {
    document.documentElement.dataset.theme = theme;
    $('#gh-css').href = `https://cdn.jsdelivr.net/npm/github-markdown-css@5.8.1/github-markdown-${theme}.css`;
    $('#hl-css').href = `https://cdn.jsdelivr.net/npm/highlight.js@11.10.0/styles/github${theme === 'dark' ? '-dark' : ''}.min.css`;
    $('#theme').textContent = theme === 'dark' ? '☀️' : '🌙';
    mermaid.initialize({ startOnLoad: false, theme: theme === 'dark' ? 'dark' : 'default', securityLevel: 'strict' });
  }

  async function render() {
    renderTabs();
    if (active < 0) return;
    const d = docs[active];
    for (const k in slugCounts) delete slugCounts[k];
    const raw = marked.parse(d.text);
    content.innerHTML = DOMPurify.sanitize(raw, { ADD_TAGS: ['semantics','annotation'], ADD_ATTR: ['aria-hidden','encoding'] });
    content.querySelectorAll('input[type=checkbox]').forEach(c => c.disabled = true);
    content.querySelectorAll('a[href^="http"]').forEach(a => { a.target = '_blank'; a.rel = 'noopener'; });
    $('#filename').textContent = '📄 ' + d.name;
    document.title = d.name + ' — Visualizador de Markdown';
    buildToc();
    const nodes = content.querySelectorAll('pre.mermaid');
    if (nodes.length) { try { await mermaid.run({ nodes }); } catch (e) { console.warn('Mermaid:', e); } }
    window.scrollTo(0, 0);
    document.body.dataset.rendered = '1';
  }

  function buildToc() {
    tocUl.innerHTML = '';
    content.querySelectorAll('h1,h2,h3,h4').forEach(h => {
      const li = document.createElement('li'), a = document.createElement('a');
      a.href = '#' + h.id; a.textContent = h.textContent; a.className = 'l' + h.tagName[1];
      a.onclick = e => { e.preventDefault(); h.scrollIntoView({ behavior: 'smooth' }); history.replaceState(null, '', '#' + h.id); };
      li.appendChild(a); tocUl.appendChild(li);
    });
  }

  function renderTabs() {
    tabsEl.innerHTML = '';
    docs.forEach((d, i) => {
      const t = document.createElement('div'); t.className = 'tab' + (i === active ? ' active' : '');
      t.textContent = d.name; t.title = d.name; t.onclick = () => { active = i; render(); };
      const x = document.createElement('button'); x.className = 'x'; x.textContent = '×'; x.title = 'Fechar';
      x.onclick = e => { e.stopPropagation(); docs.splice(i, 1); if (active >= docs.length) active = docs.length - 1;
        if (!docs.length) location.reload(); else render(); };
      t.appendChild(x); tabsEl.appendChild(t);
    });
  }

  function addDoc(name, text) { docs.push({ name, text }); active = docs.length - 1; render(); }
  async function addFiles(files) {
    for (const f of files) {
      if (!/\.(md|markdown|mdown|mkd|txt)$/i.test(f.name) && !f.type.startsWith('text')) { alert(`"${f.name}" não parece ser um ficheiro Markdown.`); continue; }
      addDoc(f.name, await f.text());
    }
  }
  window.mdvLoad = addDoc; // útil para testes

  // Drag & drop
  let depth = 0;
  addEventListener('dragenter', e => { e.preventDefault(); depth++; document.body.classList.add('dragging'); });
  addEventListener('dragleave', e => { if (--depth <= 0) { depth = 0; document.body.classList.remove('dragging'); } });
  addEventListener('dragover', e => e.preventDefault());
  addEventListener('drop', e => { e.preventDefault(); depth = 0; document.body.classList.remove('dragging'); addFiles([...e.dataTransfer.files]); });

  $('#file').onchange = e => { addFiles([...e.target.files]); e.target.value = ''; };
  $('#paste').onclick = () => { $('#paste-text').value = ''; $('#paste-dlg').showModal(); };
  $('#paste-dlg').addEventListener('close', () => { const v = $('#paste-text').value;
    if ($('#paste-dlg').returnValue === 'ok' && v.trim()) addDoc('texto-colado.md', v); });
  addEventListener('paste', e => { if (e.target.closest('dialog,textarea,input')) return;
    const t = e.clipboardData.getData('text'); if (t.trim()) addDoc('texto-colado.md', t); });
  $('#theme').onclick = () => { theme = theme === 'dark' ? 'light' : 'dark'; localStorage.setItem('mdv-theme', theme); applyTheme(); render(); };
  $('#toggle-toc').onclick = () => document.body.classList.toggle('toc-hidden');
  $('#print').onclick = () => window.print();
  addEventListener('beforeprint', () => { if (theme === 'dark') { theme = 'light'; applyTheme(); theme = 'dark'; } });
  addEventListener('afterprint', () => applyTheme());

  applyTheme();
  // ?url=... permite abrir um .md remoto (CORS necessário)
  const u = new URLSearchParams(location.search).get('url');
  if (u) fetch(u).then(r => r.text()).then(t => addDoc(u.split('/').pop() || 'remoto.md', t)).catch(() => alert('Não foi possível carregar o URL.'));
})();
