const express = require('express');
const expressWs = require('express-ws');
const app = express();
expressWs(app);

const session = require('express-session');

// const webpush = require("web-push");

// const keys = webpush.generateVAPIDKeys();

// console.log("VAPID_PUBLIC=", keys.publicKey);
// console.log("VAPID_PRIVATE=", keys.privateKey);

require('dotenv').config();

const bodyParser = require('body-parser');
const flash = require('connect-flash');
const passport = require('./config/passport');

app.use(flash());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.set('views', 'app/view');
app.set('view engine', 'ejs');

app.use(express.static('public'));

app.use(session({
  secret: 'vidyapathaisalwaysrunning',
  resave: true,
  saveUninitialized: true,
  cookie: { maxAge: 24 * 60 * 60 * 1000 },
  rolling: true
}));

app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
  if ((req.headers["x-forwarded-proto"] || "").endsWith("http")) {
    res.redirect(`https://${req.hostname}${req.originalUrl}`);
  } else {
    next();
  }
});

app.use(session({
  secret: 'vidyapathaisalwaysrunning',
  resave: true,
  saveUninitialized: true,
  cookie: { maxAge: 24 * 60 * 60 * 1000 },
  rolling: true
}));

app.use('/', require('./app/route/index'));

app.use(function (req, res, next) {
  res.status(404);

  res.format({
    html: function () {
      res.render('404', { url: req.url });
    },
    json: function () {
      res.json({ error: 'Not found' });
    },
    default: function () {
      res.type('txt').send('Not found');
    }
  })
});

module.exports = app;