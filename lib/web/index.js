var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var routes = require('./routes/index');
var app = express();
var session = require('express-session');

app.use(session({
  secret: 'awo83yxmo',
  resave: false,
  saveUninitialized: true
}));

module.exports = function (db, project) {

  // view engine setup
  app.set('views', path.join(__dirname, 'views'));
  app.set('view engine', 'ejs');

  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(cookieParser());
  app.use(require('node-compass')({ mode: 'expanded', project: path.join(__dirname, 'public') }));
  app.use(express.static(path.join(__dirname, 'public')));

  app.use(function(req, res, next) {
    req.db            = db;
    req.project       = project;
    next();
  });

  app.use('/', routes);

  this.start = function (port) {

    console.log("Starting web application at the address http://localhost:"+port+"/ ...");

    app.listen(port, function () {
      // done!
    });
  };
};
