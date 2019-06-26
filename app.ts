import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import * as Sentry from '@sentry/node';

import makeAPIController from './controllers/api-controller';
import V2ApiController from './controllers/v2-controller';
import { getAccounts } from './lib/addresses';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENV || 'production',
  });
}

const getApp = async () => {
  const Genesis = await getAccounts();

  const app: express.Application = express();

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
  app.use('/api/v2', V2ApiController);

  // Optional fallthrough error handler
  app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    // The error id is attached to `res.sentry` to be returned
    // and optionally displayed to the user for support.
    res.statusCode = 500;
    res.end(`Error message: ${err.message}\n`);
    next();
  });

  return app;
};

export default getApp;
