import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync, cpSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { discussions } from './discussions.mjs';
import { liveRoom, site } from './site.mjs';

const {slug, name, description, singular, plural, newLabel, indexContent} = site;
const repository = `TrentSterling/${slug}`;
const github = `https://github.com/${repository}/discussions`;
const base = `https://tront.xyz/${slug}/`;
const {repoId, topics, categories} = discussions('TrentSterling', slug);
const boards = categories.filter(board => ['general','ideas','show-and-tell','q-a'].includes(board.slug));
const general = boards.find(board => board.slug === 'general');
if (!general) throw new Error('Missing General discussion category');
const esc = value => String(value ?? '').replace(/[&<>"']/g, c =>
  ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'})[c]);
const date = value => new Intl.DateTimeFormat('en', {month:'short', day:'numeric', year:'numeric', timeZone:'UTC'}).format(new Date(value));
const time = value => `<time datetime="${esc(value)}">${esc(date(value))}</time>`;
function body(text) {
  return String(text).split(/(https?:\/\/[^\s<>"\]\)]+)/gi).map((part, i) =>
    i % 2 ? `<a href="${esc(part)}" rel="ugc nofollow noreferrer">${esc(part)}</a>` : esc(part)).join('');
}
const author = item => item.fromComposer ? 'Community' : esc(item.author?.login ?? 'Deleted account');
const topicPath = item => `t/${Number(item.number)}/`;
const counts = item => `${item.count} ${item.count === 1 ? 'reply' : 'replies'}`;
const sourceLink = item => {
  const first = String(item.body).trim().split(/\s+/)[0];
  try { const url = new URL(first); return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url : null; } catch { return null; }
};
const newTopic = 'new/';
function versionedAsset(filename) {
  const digest = createHash('sha256').update(readFileSync(`public/${filename}`)).digest('hex').slice(0, 12);
  return `${filename}?v=${digest}`;
}
const themeScript = versionedAsset('theme.js');
const stylesheet = versionedAsset('site.css');
function layout({root, title, path='', content, scripts=''}) {
  const nav = [['forum','Forum'], ['reddit','Reddit'], ['slackcord','Slackcord']].map(([key,label]) =>
    `<a href="/${key}/"${key === slug ? ' aria-current="location"' : ''}>${label}</a>`).join('');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} · tront.xyz</title><meta name="description" content="${esc(description)}">
<link rel="canonical" href="${base}${path}">${path === 'new/' ? '' : `<link rel="alternate" type="application/json" href="${path ? 'data.json' : 'feed.json'}">`}
<meta name="color-scheme" content="light dark"><script src="${root}${themeScript}"></script>
<link rel="stylesheet" href="${root}${stylesheet}"><script type="module" src="${root}site.js"></script></head>
<body class="${slug}"><a class="skip" href="#content">Skip to content</a><header><div class="bar"><a class="brand" href="/"><span class="mark" aria-hidden="true">t</span> tront.xyz</a><nav aria-label="Communities">${nav}</nav>
<label class="theme-picker" hidden>Theme <select id="theme"><option value="system">System</option><option value="dark">Dark</option><option value="light">Light</option></select></label></div></header>
<main id="content">${content}</main><footer><a href="${root}">${esc(name)}</a><span><a href="${root}feed.json">JSON feed</a><a href="${github}">GitHub Discussions</a></span></footer>${scripts}</body></html>`;
}
function write(path, contents) {
  mkdirSync(`dist/${path.slice(0, path.lastIndexOf('/') + 1)}`, {recursive:true});
  writeFileSync(`dist/${path}`, contents);
}
function renderMessage(message, nested=false) {
  const anchor = new URL(message.url).hash.slice(1);
  return `<article class="message${nested ? ' nested' : ''}" id="${esc(anchor)}">
  <div class="by"><b>${author(message)}</b> <a href="#${esc(anchor)}">${time(message.createdAt)}</a></div>
  <div class="body">${body(message.body)}</div></article>`;
}
const context = {topics, esc, time, author, topicPath, counts, sourceLink, newTopic, base};
const intro = `<section class="intro"><div><h1>${esc(name)}</h1><p>${esc(description)}</p></div>
<a class="action" href="${newTopic}">${esc(newLabel)}</a></section>`;
cpSync('public', 'dist', {recursive:true});
// giscus creates a numbered Discussion on the first contribution to a draft URL.
// Match the exact title and our own backlink before removing its internal identifier.
for (const item of topics) {
  if (!['giscus','giscus[bot]'].includes(item.author?.login)) continue;
  const backlink = item.body.split('\n').find(line => line.startsWith(base + 'new/?'));
  if (!backlink) continue;
  let draft;
  try { draft = new URL(backlink.trim()); } catch { continue; }
  const title = draft.searchParams.get('title');
  const id = draft.searchParams.get('id');
  if (!title || !/^[0-9a-f-]{36}$/i.test(id) || item.title !== `${title} [${id}]`) continue;
  item.title = title;
  item.body = draft.searchParams.get('url') || '';
  item.fromComposer = true;
}
write('index.html', layout({root:'./', title:name, content:intro + indexContent(context)}));

function widget(mapping, term, category) {
  return `<div class="giscus" data-repo="${repository}" data-repo-id="${esc(repoId)}"
    data-category="${esc(category.name)}" data-category-id="${esc(category.id)}"
    data-mapping="${mapping}" data-term="${esc(term)}" data-strict="1" data-emit-metadata="1"
    data-reactions-enabled="1" data-input-position="top" data-lang="en"></div>`;
}
const boardOptions = (slug === 'forum' ? boards : [general]).map(board =>
  `<option value="${esc(board.slug)}" data-id="${esc(board.id)}"${board === general ? ' selected' : ''}>${esc(board.name)}</option>`).join('');
const newContent = `<div class="back"><a href="../">← ${esc(plural)}</a></div><h1>${esc(newLabel)}</h1>
  <form id="setup" class="new-form" hidden><label>${slug === 'slackcord' ? 'Room name' : 'Title'}<input name="title" required maxlength="110"></label>
  ${slug === 'reddit' ? '<label>Link (optional)<input type="url" name="url" maxlength="1500" placeholder="https://"></label>' : ''}
  <label${slug === 'forum' ? '' : ' hidden'}>Board<select name="board">${boardOptions}</select></label>
  <button class="action">Continue to message</button></form>
  <section id="draft" hidden><h2 id="draft-title"></h2><p id="draft-link"></p>
  <p id="publish-status" role="status">Post the first message below to publish.</p><div id="write"></div></section>
  <template id="new-widget">${widget('specific','',general)}</template>
  <noscript><a href="${github}/new?category=general">Create on GitHub</a></noscript>`;
write('new/index.html', layout({root:'../',path:'new/',title:newLabel,content:newContent,
  scripts:`<script defer src="../${versionedAsset('new.js')}"></script>`}));

const summary = item => ({
  number:item.number, title:item.title, category:item.category.name, author:item.author?.login ?? null,
  createdAt:item.createdAt, updatedAt:item.updatedAt, upvotes:item.upvoteCount, likes:item.likes.totalCount, replies:item.count,
  url:base + topicPath(item), json:base + topicPath(item) + 'data.json', github:item.url
});
write('feed.json', JSON.stringify(topics.map(summary), null, 2));
for (const item of topics) {
  const path = topicPath(item);
  const rendered = item.messages.map(comment => renderMessage(comment) + comment.replies.map(m => renderMessage(m, true)).join('')).join('');
  const revision = createHash('sha256').update(rendered).digest('hex').slice(0,16);
  const archive = `<div id="archive" data-revision="${revision}"><h2>${slug === 'slackcord' ? 'Messages' : 'Replies'} <small>${item.count}</small></h2>
    ${rendered || `<p class="empty">${slug === 'slackcord' ? 'This room is open. Send the first message.' : 'Be the first to reply.'}</p>`}</div>`;
  const reply = slug === 'slackcord' ? 'Room history' : 'Discussion';
  const compose = item.locked ? '<p>This discussion is locked.</p>' : `<section class="compose" id="write"><h2>${reply}</h2>
    ${widget('number',item.number,item.category)}</section>`;
  const archiveArea = item.locked ? archive : `<details><summary>Read the published archive</summary>${archive}</details>`;
  const controls = `<p class="by"><a href="${esc(item.url)}">View on GitHub ↗</a></p>`;
  const content = `<div class="back"><a href="../../">← ${esc(plural)}</a></div><div class="thread-title"><div class="meta">${esc(singular)} / ${esc(item.category.name)}</div>
    <h1>${slug === 'slackcord' ? '#' : ''}${esc(item.title)}</h1><div class="by">${item.fromComposer ? 'Community post' : author(item)} · ${time(item.createdAt)}</div></div>
    ${item.body ? `<div class="body opener">${body(item.body)}</div>` : ''}${item.locked ? '' : liveRoom(item.number)}${compose}${archiveArea}${controls}`;
  const scripts = item.locked ? '' : `<script type="module" src="../../${versionedAsset('live.js')}"></script>`;
  write(path + 'index.html', layout({root:'../../', path, title:item.title, content, scripts}));
  write(path + 'data.json', JSON.stringify({...summary(item), body:item.body, messages:item.messages}, null, 2));
}
// A local rebuild can reuse dist. Remove stale published files after a topic is deleted.
const published = new Set(topics.map(item => String(item.number)));
mkdirSync('dist/t', {recursive:true});
for (const entry of readdirSync('dist/t', {withFileTypes:true})) {
  if (entry.isDirectory() && /^\d+$/.test(entry.name) && !published.has(entry.name)) {
    for (const file of ['index.html','data.json']) rmSync(`dist/t/${entry.name}/${file}`, {force:true});
  }
}
console.log(`Rendered ${topics.length} conversations and on-site composer.`);
