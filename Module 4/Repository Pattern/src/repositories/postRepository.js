// Replacing this Map with Prisma changes this repository only.
// The five-method contract and the service remain unchanged.
const posts = new Map([
  [1, { id: 1, title: 'First post', body: 'Repository boundaries protect change.', authorId: 7 }],
  [2, { id: 2, title: 'Second post', body: 'Services should speak in domain language.', authorId: 8 }],
]);

let nextId = 3;

function findAll() {
  return Array.from(posts.values(), (post) => ({ ...post }));
}

function findById(id) {
  const post = posts.get(Number(id));
  return post ? { ...post } : null;
}

function create(fields) {
  const post = { id: nextId++, ...fields };
  posts.set(post.id, post);
  return { ...post };
}

function update(id, patch) {
  const post = posts.get(Number(id));
  if (!post) return null;

  const updated = { ...post, ...patch, id: post.id };
  posts.set(post.id, updated);
  return { ...updated };
}

function remove(id) {
  return posts.delete(Number(id));
}

module.exports = { findAll, findById, create, update, remove };
