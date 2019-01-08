'use strict';
const database = require('./database');
const createError = require('http-errors');
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const autobahn = require('autobahn');
const uuidv4 = require('uuid/v4');
const datastore = require('./datastore');

// env
const ws_host = process.env.WS_HOST || 'iot.lucasantarella.com';
const ws_realm = process.env.WS_REALM || 'com.lucasantarella.iot';
const ws_port = process.env.WS_PORT || '9443';
const ws_wss = process.env.WS_WSS || 'wss';

const indexRouter = require('./routes/index');
const googleApp = require('./routes/googleService');
const oauthRouter = require('./routes/oauth');

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Parsers
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

// MongoDB
let db;
database.getConnection().then(client => {
  db = client
});
app.use(function (req, res, next) {
  req.db = db;
  next();
});

// Session
app.use(session({
  secret: 'test123',
  resave: false,
  saveUninitialized: true,
  cookie: {
    httpOnly: false
  },
  genid: function () {
    return uuidv4()
  },
}));

// attach websocket
let connection = new autobahn.Connection({
  url: ws_wss + '://' + ws_host + ':' + ws_port + '/',
  realm: ws_realm,
  tlsConfiguration: {}
});
connection.onopen = function (session) {
  session.subscribe('com.lucasantarella.iot.devices')
};
app.use(function (req, res, next) {
  req.ws_connection = connection;
  next();
});

// attach datastore
app.use(function (req, res, next) {
  req.datastore = datastore;
  next();
});

app.use('/', indexRouter);
app.use('/auth', oauthRouter);

// Fullfillment
app.post('/fullfillment', googleApp);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;