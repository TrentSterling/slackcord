import { execFileSync } from 'node:child_process';

const pageFields = 'pageInfo { hasNextPage endCursor }';
const messageFields = 'id author { login } body createdAt url isMinimized';
const discussionFields = `id number title body createdAt updatedAt url upvoteCount locked author { login }
  category { id name slug } comments { totalCount }
  likes: reactions(content:THUMBS_UP) { totalCount }`;

function query(document, variables) {
  const input = JSON.stringify({query: document, variables});
  const raw = execFileSync('gh', ['api', 'graphql', '--input', '-'], {
    input, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024
  });
  const response = JSON.parse(raw);
  if (response.errors) throw new Error(JSON.stringify(response.errors));
  return response.data;
}

function pages(get) {
  const items = [];
  let cursor = null;
  do {
    const result = get(cursor);
    items.push(...result.nodes.filter(Boolean));
    cursor = result.pageInfo.hasNextPage ? result.pageInfo.endCursor : null;
  } while (cursor);
  return items;
}

function messages(id, type, field) {
  const fields = type === 'Discussion' ? messageFields + ' replies { totalCount }' : messageFields;
  const document = `query($id:ID!, $cursor:String) {
    node(id:$id) { ... on ${type} { ${field}(first:100, after:$cursor) { nodes { ${fields} } ${pageFields} } } }
  }`;
  return pages(cursor => query(document, {id, cursor}).node[field])
    .filter(message => !message.isMinimized);
}

export function discussions(owner, name) {
  const document = `query($owner:String!,$name:String!,$cursor:String) {
    repository(owner:$owner,name:$name) {
      id discussionCategories(first:25) { nodes { id name slug } }
      discussions(first:100,after:$cursor,orderBy:{field:CREATED_AT,direction:ASC}) {
        nodes { ${discussionFields} } ${pageFields}
      }
    }
  }`;
  let repoId;
  let categories;
  const topics = pages(cursor => {
    const repo = query(document, {owner, name, cursor}).repository;
    repoId = repo.id;
    categories = repo.discussionCategories.nodes;
    return repo.discussions;
  });
  for (const topic of topics) {
    topic.messages = topic.comments.totalCount ? messages(topic.id, 'Discussion', 'comments') : [];
    for (const comment of topic.messages) {
      comment.replies = comment.replies.totalCount ? messages(comment.id, 'DiscussionComment', 'replies') : [];
    }
    topic.count = topic.messages.reduce((n, comment) => n + 1 + comment.replies.length, 0);
  }
  return {repoId, topics, categories};
}
