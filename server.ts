import * as dotenv from 'dotenv';

import getApp from './app';
import { getCurrentGitTag, isDevEnv } from './lib/utils';

dotenv.config();

if (!isDevEnv) {
  const gitTag = getCurrentGitTag();
  if (!gitTag) {
    throw new Error('Production requires the GIT_TAG env var to be set');
  }
}

const port = parseInt(process.env.PORT || '4000', 10);

getApp().then((app) => {
  app.listen(port, (err) => {
    if (err) throw err;

    console.log(`API Server listening on port ${port}`);
  });
}).catch((err) => {
  throw err;
});
