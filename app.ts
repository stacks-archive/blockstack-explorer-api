import * as express from 'express';
import * as cors from 'cors';
import * as Sentry from '@sentry/node';
import * as expressWinston from 'express-winston';
import * as uuid from 'uuid/v4';

// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
// @ts-ignore
import { createMiddleware as createPrometheusMiddleware } from '@promster/express';
// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
// @ts-ignore
import { createServer } from '@promster/server';

import makeAPIController from './controllers/api-controller';
import V2ApiController from './controllers/v2-controller';
import { getAccounts } from './lib/addresses';
import { winstonLogger } from './lib/utils';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENV || 'production',
    ignoreErrors: [
      'Account not found',
      'Home page is not available',
    ],
  });
}

const getApp = async () => {
  const Genesis = await getAccounts();

  const app: express.Application = express();

  if (process.env.SENTRY_DSN) {
    app.use(Sentry.Handlers.requestHandler());
  }

  app.use(createPrometheusMiddleware({ 
    app,
    options: {
      normalizePath: (path: string) => {
        if (path.startsWith('/api/stacks/addresses/SP1P72Z3704VMT3DMHPP2CB8TGQWGDBHD3RPR9GZS')) {
          return path;
        }
        if (path.startsWith('/api/stacks/addresses/')) {
          return '/api/stacks/addresses/';
        }
        return '/';
      }
    }
  }));

  // Create `/metrics` endpoint on separate server
  createServer({ port: 9152 }).then(() => console.log('@promster/server started on port 9152.'));

  app.get('/', () => {
    throw new Error('Home page is not available.');
  });

  if (process.env.SENTRY_DSN) {
    app.use(Sentry.Handlers.errorHandler());
  }

  app.use(cors());

  app.use(expressWinston.logger({
    winstonInstance: winstonLogger,
    metaField: null,
  }));

  app.use('/api', makeAPIController(Genesis));
  app.use('/api/v2', V2ApiController);

  app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (error && !res.finished) {
      const errorTag = uuid();
      Object.assign(error, { errorTag: errorTag });
      res.status(500).json({ 
        success: false, 
        errorTag: errorTag
      }).end();
    }
    next(error);
  });

  app.use(expressWinston.errorLogger({
    winstonInstance: winstonLogger,
    metaField: null,
    blacklistedMetaFields: [ 'trace', 'os', 'process' ],
  }));

  return app;
};

export default getApp;
