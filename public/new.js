(() => {
  const form = document.getElementById('setup');
  const params = new URLSearchParams(location.search);
  const board = form.elements.board;
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  function webLink(value) {
    try {
      const url = new URL(value);
      if (['https:', 'http:'].includes(url.protocol) && !url.username && !url.password) return url.href;
    } catch { /* Show a validation error for incomplete links. */ }
    return null;
  }
  form.hidden = false;
  form.onsubmit = event => {
    event.preventDefault();
    const title = form.elements.title.value.trim();
    if (!title) { form.elements.title.focus(); return; }
    const url = new URL(location.pathname, location.origin);
    url.searchParams.set('id', crypto.randomUUID());
    url.searchParams.set('title', title);
    url.searchParams.set('board', board.value);
    const field = form.elements.url;
    if (field?.value) {
      const link = webLink(field.value);
      if (!link) { field.setCustomValidity('Enter an http or https link.'); field.reportValidity(); return; }
      url.searchParams.set('url', link);
    }
    location.assign(url);
  };
  form.oninput = () => form.elements.url?.setCustomValidity('');
  const id = params.get('id');
  const title = params.get('title')?.trim();
  if (!uuid.test(id || '') || !title || title.length > 110 || /[\x00-\x1f]/.test(title)) return;
  const category = [...board.options].find(o => o.value === params.get('board'));
  if (!category) return;
  form.hidden = true;
  document.getElementById('draft').hidden = false;
  document.getElementById('draft-title').textContent = title;
  const link = form.elements.url && webLink(params.get('url'));
  if (link) {
    const a = document.createElement('a');
    a.href = link; a.textContent = link; a.rel = 'ugc nofollow noreferrer';
    document.getElementById('draft-link').append(a);
  }
  const widget = document.getElementById('new-widget').content.firstElementChild.cloneNode(true);
  Object.assign(widget.dataset, {term:`${title} [${id}]`, category:category.text, categoryId:category.dataset.id, reactionsEnabled:'0'});
  document.getElementById('write').append(widget);
  document.querySelector('meta[name="description"]').content = link || title;

  let confirmed = false;
  window.addEventListener('message', async event => {
    if (confirmed || event.origin !== 'https://giscus.app' ||
        event.source !== widget.querySelector('iframe')?.contentWindow) return;
    const discussion = event.data?.giscus?.discussion;
    const parts = discussion?.url?.split('/');
    if (!parts || parts.slice(0,-1).join('/') !== 'https://github.com/' + widget.dataset.repo + '/discussions' ||
        !/^[1-9]\d*$/.test(parts.at(-1)) || !discussion.totalCommentCount) return;
    confirmed = true;
    const status = document.getElementById('publish-status');
    status.textContent = 'Published. This page is shareable while the archive updates.';
    const page = new URL('../t/' + parts.at(-1) + '/', location.href);
    for (let check = 0; check < 16; check++) {
      try {
        const response = await fetch(new URL('data.json',page), {cache:'no-store'});
        if (response.ok && (await response.json()).number === Number(parts.at(-1))) {
          const a = document.createElement('a');
          a.href = page.href; a.textContent = 'Open permanent discussion';
          status.replaceChildren('Published. ', a); break;
        }
      } catch { /* The public HTML may still be deploying. */ }
      await new Promise(resolve => setTimeout(resolve, 6000));
    }
  });
})();
