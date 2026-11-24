const board = document.querySelector('#board');
if (board) {
  board.closest('label').hidden = false;
  board.addEventListener('change', () => {
    for (const row of document.querySelectorAll('[data-category]')) {
      row.hidden = Boolean(board.value && row.dataset.category !== board.value);
    }
  });
}
const sort = document.querySelector('#sort');
if (sort) {
  sort.closest('label').hidden = false;
  sort.addEventListener('change', () => {
    const entries = document.querySelector('#entries');
    const rows = [...entries.children].sort((a,b) => {
      const recent = b.dataset.created.localeCompare(a.dataset.created);
      return sort.value === 'top' ? Number(b.dataset.score) - Number(a.dataset.score) || recent : recent;
    });
    entries.append(...rows);
  });
}

// Keep an open room's published message history current without disturbing its composer.
if (document.body.classList.contains('slackcord') && document.querySelector('#archive')) {
  let checking = false;
  async function refresh() {
    if (checking || document.hidden) return;
    checking = true;
    try {
      const response = await fetch('./', {cache:'no-cache'});
      if (!response.ok) return;
      const updated = new DOMParser().parseFromString(await response.text(), 'text/html').querySelector('#archive');
      const current = document.querySelector('#archive');
      if (updated && updated.dataset.revision !== current.dataset.revision) current.replaceWith(updated);
    } catch { /* Keep the last published messages available offline. */ }
    finally { checking = false; }
  }
  setInterval(refresh, 60000);
  document.addEventListener('visibilitychange', refresh);
}
