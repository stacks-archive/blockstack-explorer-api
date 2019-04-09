const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const Sentry = require('@sentry/node');

if (process.env.SENTRY_DSN) {
  Sentry.init({ dsn: process.env.SENTRY_DSN });
}

const makeAPIController = require('./controllers/api-controller');
const { getAccounts } = require('./lib/addresses');

const getApp = async () => {
  const Genesis = await getAccounts();

  const app = express();

  if (process.env.SENTRY_DSN) {
    app.use(Sentry.Handlers.requestHandler());
  }

  app.get('/', () => {
    throw new Error('Home page is not available.');
  });

  if (process.env.SENTRY_DSN) {
    app.use(Sentry.Handlers.errorHandler());
  }

  app.use(cors());
  app.use(morgan('combined'));

  app.use('/api', makeAPIController(Genesis));

  // Optional fallthrough error handler
  app.use((err, req, res, next) => {
    // The error id is attached to `res.sentry` to be returned
    // and optionally displayed to the user for support.
    res.statusCode = 500;
    res.end(`Error message: ${err.message}\n`);
    next();
  });

  return app;
};

module.exports = getApp;
