require('dotenv').config();

const path = require('path');

const express = require('express');
const session = require('express-session');

const { Strategy } = require('passport-local');
const passport = require('passport');

const users = require('./users');
const apply = require('./apply');
const register = require('./register');
const admin = require('./admin');
const applications = require('./applications');

const sessionSecret = process.env.SESSION_SECRET;

const app = express();

/* todo stilla session og passport */
app.use(express.urlencoded({ extended: true }));
app.use(session({
  name: 'counter.sid',
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
}));

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.static(path.join(__dirname, 'public')));

async function strat(username, password, done) {
  try {
    const user = await users.findByUsername(username);

    if (!user) {
      return done(null, false);
    }

    const passwordValid = await users.comparePasswords(password, user);

    return done(null, passwordValid);
  } catch (err) {
    return done(err);
  }
}

passport.use(new Strategy(strat));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await users.findById(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

app.use(passport.initialize());
app.use(passport.session());

function ensureLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }

  return res.redirect('/innskra');
}

app.use((req, res, next) => {
  if (req.isAuthenticated()) {
    // getum núna notað user í viewum
    res.locals.user = req.user;
    res.locals.login = req.isAuthenticated();
    res.locals.isAdmin = req.user.admin;
    res.locals.username = req.user.username;
  }

  next();
});

/**
 * Hjálparfall til að athuga hvort reitur sé gildur eða ekki.
 *
 * @param {string} field Middleware sem grípa á villur fyrir
 * @param {array} errors Fylki af villum frá express-validator pakkanum
 * @returns {boolean} `true` ef `field` er í `errors`, `false` annars
 */
function isInvalid(field, errors) {
  return Boolean(errors.find(i => i.param === field));
}

app.locals.isInvalid = isInvalid;

/* todo setja upp login og logout virkni */

app.post(
  '/innskra',
  passport.authenticate('local', {
    failureMessage: 'Notandi eða lykilorð vitlaust',
    failureRedirect: '/innskra',
  }),
  (req, res) => {
    res.redirect('admin');
  },
);

app.get('/logout', (req, res) => {
  req.logout();
  res.redirect('/');
});

app.get('/innskra', (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect('/');
  }

  let message = '';

  // Athugum hvort einhver skilaboð séu til í session, ef svo er birtum þau
  // og hreinsum skilaboð
  if (req.session.messages && req.session.messages.length > 0) {
    message = req.session.messages.join(', ');
    req.session.messages = [];
  }

  const data = {
    title: 'Innskráning',
    username: '',
    password: '',
  };

  return res.render('innskra', data, message);
});

app.use('/', apply);
app.use('/register', register);
app.use('/applications', ensureLoggedIn, applications);
app.use('/admin', ensureLoggedIn, admin);

function notFoundHandler(req, res, next) { // eslint-disable-line
  res.status(404).render('error', { page: 'error', title: '404', error: '404 fannst ekki' });
}

function errorHandler(error, req, res, next) { // eslint-disable-line
  console.error(error);
  res.status(500).render('error', { page: 'error', title: 'Villa', error });
}

app.use(notFoundHandler);
app.use(errorHandler);

const {
  HOST: hostname = '127.0.0.1',
  PORT: port = 3000,
} = process.env;

app.listen(port, () => {
  console.info(`Server running at http://${hostname}:${port}/`);
});
