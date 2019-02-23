const express = require('express');

const { selectUser } = require('./db');

const router = express.Router();

/**
 * Higher-order fall sem umlykur async middleware með villumeðhöndlun.
 *
 * @param {function} fn Middleware sem grípa á villur fyrir
 * @returns {function} Middleware með villumeðhöndlun
 */
function catchErrors(fn) {
  return (req, res, next) => fn(req, res, next).catch(next);
}

/**
   * Ósamstilltur route handler fyrir umsóknarlista.
   *
   * @param {object} req Request hlutur
   * @param {object} res Response hlutur
   * @returns {string} Lista af umsóknum
   */
async function admin(req, res) {
  const list = await selectUser();

  const data = {
    title: 'Notendur',
    list,
  };

  return res.render('admin', data);
}

router.get('/', catchErrors(admin));

module.exports = router;
