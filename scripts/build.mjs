import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync, cpSync, readdirSync, rmSync } from 'node:fs';
import { discussions } from './discussions.mjs';
import { site } from './site.mjs';

const {slug, name, description, singular, plural, newLabel, indexContent, theme} = site;
const repository = `TrentSterling/${slug}`;
const github = `https://github.com/${repository}/discussions`;
const base = `https://tront.xyz/${slug}/`;
const {repoId, topics} = discussions('TrentSterling', slug);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c =>
  ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'})[c]);
const date = value => new Intl.DateTimeFormat('en', {month:'short', day:'numeric', year:'numeric', timeZone:'UTC'}).format(new Date(value));
const time = value => `<time datetime="${esc(value)}">${esc(date(value))}</time>`;
function body(text) {
  return String(text).split(/(https?:\/\/[^\s<>"\]\)]+)/gi).map((part, i) =>
    i % 2 ? `<a href="${esc(part)}" rel="ugc nofollow noreferrer">${esc(part)}</a>` : esc(part)).join('');
}
const author = item => esc(item.author?.login ?? 'Deleted account');
const topicPath = item => `t/${Number(item.number)}/`;
const counts = item => `${item.count} ${item.count === 1 ? 'reply' : 'replies'}`;
const sourceLink = item => {
  const first = String(item.body).trim().split(/\s+/)[0];
  try { const url = new URL(first); return /^(https?:)$/.test(url.protocol) ? url : null; } catch { return null; }
};
const newTopic = `${github}/new?category=general`;
function layout({root, title, path='', content, scripts=''}) {
  const nav = [['forum','Forum'], ['reddit','Reddit'], ['slackcord','Slackcord']].map(([key,label]) =>
    `<a href="/${key}/"${key === slug ? ' aria-current="location"' : ''}>${label}</a>`).join('');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} · tront.xyz</title><meta name="description" content="${esc(description)}">
<link rel="canonical" href="${base}${path}"><link rel="alternate" type="application/json" href="${path ? 'data.json' : 'feed.json'}">
<link rel="stylesheet" href="${root}site.css"><script type="module" src="${root}site.js"></script></head>
<body class="${slug}"><a class="skip" href="#content">Skip to content</a><header><div class="bar"><a class="brand" href="/"><span class="mark" aria-hidden="true">t</span> tront.xyz</a><nav aria-label="Communities">${nav}</nav></div></header>
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
<a class="action" href="${newTopic}">${esc(newLabel)} <span aria-hidden="true">↗</span></a></section>`;
cpSync('public', 'dist', {recursive:true});
write('index.html', layout({root:'./', title:name, content:intro + indexContent(context)}));

let embed = false;
try {
  const response = await fetch(`https://giscus.app/api/discussions/categories?repo=${repository}`, {signal:AbortSignal.timeout(8000)});
  const data = await response.json();
  embed = response.ok && data.repositoryId === repoId;
  if (!embed) console.warn('Direct GitHub replies active.', data.error ?? response.status);
} catch { console.warn('Giscus availability unknown. Direct GitHub replies active.'); }

const summary = item => ({
  number:item.number, title:item.title, category:item.category.name, author:item.author?.login ?? null,
  createdAt:item.createdAt, updatedAt:item.updatedAt, upvotes:item.upvoteCount, replies:item.count,
  url:base + topicPath(item), json:base + topicPath(item) + 'data.json', github:item.url
});
write('feed.json', JSON.stringify(topics.map(summary), null, 2));
for (const item of topics) {
  const path = topicPath(item);
  const rendered = item.messages.map(comment => renderMessage(comment) + comment.replies.map(m => renderMessage(m, true)).join('')).join('');
  const revision = createHash('sha256').update(rendered).digest('hex').slice(0,16);
  const archive = `<div id="archive" data-revision="${revision}"><h2>${slug === 'slackcord' ? 'Messages' : 'Replies'} <small>${item.count}</small></h2>
    ${rendered || `<p class="empty">${slug === 'slackcord' ? 'This room is open. Send the first message.' : 'Be the first to reply.'}</p>`}</div>`;
  const reply = slug === 'slackcord' ? 'Send a message' : 'Reply';
  const compose = embed && !item.locked ? `<section class="compose"><h2>${reply}</h2><div class="giscus"></div>
    <script src="https://giscus.app/client.js" data-repo="${repository}" data-repo-id="${esc(repoId)}" data-category="${esc(item.category.name)}"
    data-category-id="${esc(item.category.id)}" data-mapping="number" data-term="${item.number}" data-reactions-enabled="1"
    data-input-position="top" data-theme="${theme}" data-lang="en" crossorigin="anonymous" async></script></section>` : '';
  const archiveArea = embed ? `<details><summary>Read the published archive</summary>${archive}</details>` : archive;
  const controls = `<div class="actions"><a class="action" href="${esc(item.url)}${item.locked ? '' : '#new_comment_field'}">${item.locked ? 'View locked discussion' : reply + ' on GitHub'} ↗</a>
    ${slug === 'reddit' ? `<a href="${esc(item.url)}">Upvote on GitHub · ${item.upvoteCount}</a>` : ''}</div>`;
  const content = `<div class="back"><a href="../../">← ${esc(plural)}</a></div><div class="thread-title"><div class="meta">${esc(singular)} / ${esc(item.category.name)}</div>
    <h1>${slug === 'slackcord' ? '#' : ''}${esc(item.title)}</h1><div class="by">${author(item)} · ${time(item.createdAt)}</div></div>
    <div class="body opener">${body(item.body)}</div>${controls}${compose}${archiveArea}`;
  write(path + 'index.html', layout({root:'../../', path, title:item.title, content}));
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
console.log(`Rendered ${topics.length} conversations. Embedded replies: ${embed}`);
