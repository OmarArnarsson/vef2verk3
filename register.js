const xss = require('xss');
const express = require('express');
const { check, validationResult } = require('express-validator/check');
const { sanitize } = require('express-validator/filter');
const bcrypt = require('bcrypt');

const { insertUser } = require('./db');

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
 * Hjálparfall sem XSS hreinsar reit í formi eftir heiti.
 *
 * @param {string} fieldName Heiti á reit
 * @returns {function} Middleware sem hreinsar reit ef hann finnst
 */
function sanitizeXss(fieldName) {
  return (req, res, next) => {
    if (!req.body) {
      next();
    }

    const field = req.body[fieldName];

    if (field) {
      req.body[fieldName] = xss(field);
    }

    next();
  };
}

const router = express.Router();

// Fylki af öllum validations fyrir umsókn
const validations = [
  check('name')
    .isLength({ min: 1 })
    .withMessage('Nafn má ekki vera tómt'),

  check('email')
    .isLength({ min: 1 })
    .withMessage('Netfang má ekki vera tómt'),

  check('email')
    .isEmail()
    .withMessage('Netfang verður að vera netfang'),

  check('username')
    .isLength({ min: 1 })
    .withMessage('Notendanafn má ekki vera tómt'),

  check('password')
    .isLength({ min: 8 })
    .withMessage('Lykilorð verður að vera a.m.k. 8 stafir'),

  check('password').exists(),
  check('password2', 'Lykilorð verða að vera eins')
    .exists()
    .custom((value, { req }) => value === req.body.password),

];

// Fylki af öllum hreinsunum fyrir umsókn
const sanitazions = [
  sanitize('name').trim().escape(),
  sanitizeXss('name'),

  sanitizeXss('email'),
  sanitize('email').trim().normalizeEmail(),

  sanitizeXss('username'),
  sanitize('username')
    .trim().escape(),

  sanitizeXss('password'),
  sanitize('password').trim().escape(),

  sanitizeXss('password2'),
  sanitize('password2').trim().escape(),

];

/**
 * Route handler fyrir form umsóknar.
 *
 * @param {object} req Request hlutur
 * @param {object} res Response hlutur
 * @returns {string} Formi fyrir umsókn
 */
function nyskra(req, res) {
  const data = {
    title: 'Nýskráning',
    name: '',
    email: '',
    username: '',
    password: '',
    password2: '',
    errors: [],
  };
  res.render('nyskra', data);
}

/**
 * Route handler sem athugar stöðu á umsókn og birtir villur ef einhverjar,
 * sendir annars áfram í næsta middleware.
 *
 * @param {object} req Request hlutur
 * @param {object} res Response hlutur
 * @param {function} next Næsta middleware
 * @returns Næsta middleware ef í lagi, annars síðu með villum
 */
function showErrors(req, res, next) {
  const {
    body: {
      name = '',
      email = '',
      username = '',
      password = '',
      password2 = '',
    } = {},
  } = req;

  const data = {
    name,
    email,
    username,
    password,
    password2,
  };

  const validation = validationResult(req);

  if (!validation.isEmpty()) {
    const errors = validation.array();
    data.errors = errors;
    data.title = 'Nýskráning – vandræði';

    return res.render('nyskra', data);
  }

  return next();
}

/**
 * Ósamstilltur route handler sem vistar gögn í gagnagrunn og sendir
 * á þakkarsíðu
 *
 * @param {object} req Request hlutur
 * @param {object} res Response hlutur
 */
async function nyskraPost(req, res) {
  const {
    body: {
      name = '',
      email = '',
      username = '',
      password = '',
    } = {},
  } = req;

  const data = {
    name,
    email,
    username,
    password,
  };

  data.password = await bcrypt.hash(data.password, 11);

  await insertUser(data);

  return res.redirect('/register/thanks2');
}

/**
 * Route handler fyrir þakkarsíðu.
 *
 * @param {object} req Request hlutur
 * @param {object} res Response hlutur
 */
function thanks2(req, res) {
  return res.render('thanks2', { title: 'Takk fyrir að nýskrá þig' });
}

router.get('/', nyskra);
router.get('/thanks2', thanks2);

router.post(
  '/',
  // Athugar hvort form sé í lagi
  validations,
  // Ef form er ekki í lagi, birtir upplýsingar um það
  showErrors,
  // Öll gögn í lagi, hreinsa þau
  sanitazions,
  // Senda gögn í gagnagrunn
  catchErrors(nyskraPost),
);

module.exports = router;
