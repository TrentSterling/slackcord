const panel = document.querySelector('.live-room');
const toggle = panel.querySelector('#live-toggle');
const status = panel.querySelector('#live-status');
const form = panel.querySelector('form');
const input = form.elements.message;
const send = form.querySelector('button');
const log = panel.querySelector('[role=log]');
let session;

function presence(current) {
  const count = current.peers.size;
  status.textContent = count ? count + (count === 1 ? ' other guest connected.' : ' other guests connected.')
    : 'Looking for other guests. Share this room link with a friend.';
  input.disabled = !count;
  send.disabled = !count;
}

function appendMessage(label, message) {
  const row = document.createElement('li');
  const author = document.createElement('b');
  author.textContent = label;
  row.append(author, document.createTextNode(message));
  const nearBottom = log.scrollHeight - log.clientHeight - log.scrollTop < 32;
  log.append(row);
  if (log.children.length > 100) log.firstElementChild.remove();
  if (nearBottom) log.scrollTop = log.scrollHeight;
}

async function leave() {
  const previous = session;
  session = undefined;
  toggle.disabled = true;
  form.hidden = true;
  form.reset();
  input.disabled = true;
  send.disabled = true;
  log.replaceChildren();
  status.textContent = '';
  try { await previous?.room?.leave(); }
  finally { toggle.textContent = 'Join live chat'; toggle.disabled = false; }
}

async function join() {
  const current = {peers:new Map()};
  session = current;
  toggle.disabled = true;
  status.textContent = 'Connecting…';
  try {
    const {joinRoom, selfId} = await import('./vendor/trystero.js');
    if (current !== session) return;
    const room = joinRoom({appId:'xyz.tront.slackcord.v1', maxReceiveBytes:8192},
      location.origin + '/slackcord/' + panel.dataset.room);
    current.room = room;
    current.self = selfId;
    current.action = room.makeAction('chat');
    current.action.onMessage = (message, {peerId}) => {
      if (session !== current || !current.peers.has(peerId) || typeof message !== 'string' ||
          !message.trim() || message.length > 1000) return;
      const now = performance.now();
      const recent = current.peers.get(peerId).filter(time => now - time < 3000);
      if (recent.length >= 8) return;
      current.peers.set(peerId, [...recent, now]);
      appendMessage('Guest ' + peerId.slice(0, 6), message);
    };
    room.onPeerJoin = id => {
      if (session !== current) return;
      current.peers.set(id, []);
      presence(current);
    };
    room.onPeerLeave = id => {
      if (session !== current) return;
      current.peers.delete(id);
      presence(current);
    };
    toggle.textContent = 'Leave live chat';
    toggle.disabled = false;
    form.hidden = false;
    presence(current);
  } catch {
    if (session !== current) return;
    await leave();
    status.textContent = 'Couldn’t connect. Try again or post to Room history below.';
  }
}

toggle.hidden = false;
toggle.onclick = () => session ? leave() : join();
window.addEventListener('pagehide', () => { if (session) void leave(); });
form.onsubmit = async event => {
  event.preventDefault();
  const current = session;
  const message = input.value.trim();
  if (!current?.peers.size || !message || message.length > 1000 || send.disabled) return;
  send.disabled = true;
  try {
    await current.action.send(message);
    if (session !== current) return;
    appendMessage('You · ' + current.self.slice(0, 6), message);
    if (input.value.trim() === message) input.value = '';
    input.focus();
  } catch {
    if (session === current) status.textContent = 'Send failed. Your message is still in the box.';
  } finally {
    if (session === current) send.disabled = !current.peers.size;
  }
};
