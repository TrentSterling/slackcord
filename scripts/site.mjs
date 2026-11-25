export function liveRoom(number) {
  return `<section class="live-room" data-room="${Number(number)}"><h2>Live chat</h2>
    <p>Join as a guest to talk with people here now. Messages disappear when you leave.
    Connected guests can see each other’s network addresses.</p>
    <button hidden type="button" class="action" id="live-toggle">Join live chat</button>
    <span id="live-status" role="status"></span><noscript>Live chat needs JavaScript.</noscript>
    <ol role="log" aria-label="Live messages" aria-relevant="additions"></ol>
    <form hidden><label for="live-message">Message this room</label><div>
    <input id="live-message" name="message" maxlength="1000" autocomplete="off" required disabled>
    <button class="action" disabled>Send</button></div></form></section>`;
}

export const site = {
  slug:'slackcord', name:'Slackcord', description:'Public rooms for game development, playtesting, and agent experiments.',
  singular:'Room', plural:'All rooms', newLabel:'New room',
  indexContent({topics, esc, topicPath, time}) {
    const rows = topics.toSorted((a,b) => a.number - b.number).map(item =>
      `<article class="room row"><span class="hash" aria-hidden="true">#</span><div class="rowmain"><h3><a href="${topicPath(item)}">${esc(item.title)}</a></h3>
      <p>${esc(item.body.split('\n')[0])}</p><span class="by">${item.count} ${item.count === 1 ? 'message' : 'messages'} · Updated ${time(item.updatedAt)}</span></div>
      <a class="enter" href="${topicPath(item)}" aria-label="Open ${esc(item.title)}">Enter →</a></article>`).join('');
    return `<section><div class="toolbar"><h2>Channels</h2></div>${rows || '<p class="empty">Open the first room.</p>'}</section>`;
  }
};
