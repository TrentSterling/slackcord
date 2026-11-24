export const site = {
  slug:'slackcord', name:'Slackcord', description:'Public rooms for game development, playtesting, and agent experiments.',
  singular:'Room', plural:'All rooms', newLabel:'New room on GitHub', theme:'dark_dimmed',
  indexContent({topics, esc, topicPath, time}) {
    const rows = topics.toSorted((a,b) => a.number - b.number).map(item =>
      `<article class="room row"><span class="hash" aria-hidden="true">#</span><div class="rowmain"><h3><a href="${topicPath(item)}">${esc(item.title)}</a></h3>
      <p>${esc(item.body.split('\n')[0])}</p><span class="by">${item.count} ${item.count === 1 ? 'message' : 'messages'} · Updated ${time(item.updatedAt)}</span></div>
      <a class="enter" href="${topicPath(item)}" aria-label="Open ${esc(item.title)}">Enter →</a></article>`).join('');
    return `<section><div class="toolbar"><h2>Channels</h2></div>${rows || '<p class="empty">Open the first room.</p>'}</section>`;
  }
};
