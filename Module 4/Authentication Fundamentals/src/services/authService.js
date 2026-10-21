const bcrypt = require('bcryptjs');
const repo = require('../repositories/userRepository');

class AppError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function validate(body, fields) {
  if (!body || typeof body !== 'object' || Array.isArray(body) ||
      fields.some(field => typeof body[field] !== 'string' || !body[field].trim())) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Required fields must be non-empty strings');
  }
}

function safeUser(user) {
  return { id: user.id, name: user.name, email: user.email };
}

async function register(body) {
  validate(body, ['name', 'email', 'password']);
  const name = body.name.trim();
  const email = body.email.trim().toLowerCase();
  const parsedCost = Number.parseInt(process.env.BCRYPT_COST || '12', 10);
  const cost = Number.isInteger(parsedCost) && parsedCost >= 4 && parsedCost <= 31 ? parsedCost : 12;
  const passwordHash = await bcrypt.hash(body.password, cost);

  try {
    return safeUser(await repo.createUser({ name, email, passwordHash }));
  } catch (error) {
    if (error && error.code === 'P2002') {
      throw new AppError(409, 'EMAIL_ALREADY_EXISTS', 'An account with this email already exists');
    }
    throw error;
  }
}

async function login(body) {
  validate(body, ['email', 'password']);
  const user = await repo.findUserByEmail(body.email.trim().toLowerCase());

  if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  return safeUser(user);
}

module.exports = { register, login, AppError };
