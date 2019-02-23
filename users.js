const bcrypt = require('bcrypt');
const { selectUser } = require('./db');

async function comparePasswords(password, user) {
  const ok = await bcrypt.compare(password, user.password);

  if (ok) {
    return user;
  }

  return false;
}

async function findByUsername(username) {
  const db = await selectUser();

  for (let i = 0; i < db.length; i += 1) {
    if (username === db[i].username) {
      return db[i];
    }
  }

  return null;
}

async function findById(id) {
  const db = await selectUser();

  for (let i = 0; i < db.length; i += 1) {
    if (id === db[i].id) {
      return db[i];
    }
  }


  return null;
}

module.exports = {
  comparePasswords,
  findByUsername,
  findById,
};
