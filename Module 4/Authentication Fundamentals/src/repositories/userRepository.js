const prisma = require('../db/prisma');

async function createUser(data) {
  return prisma.user.create({
    data,
    select: { id: true, name: true, email: true }
  });
}

async function findUserByEmail(email) {
  return prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, passwordHash: true }
  });
}

module.exports = { createUser, findUserByEmail };
