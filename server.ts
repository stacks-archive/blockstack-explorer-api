// const getApp = require('./app');
import * as dotenv from 'dotenv';

import getApp from './app';

dotenv.config();

const port = parseInt(process.env.PORT || '4000', 10);

getApp().then((app) => {
  app.listen(port, (err) => {
    if (err) throw err;

    console.log(`API Server listening on port ${port}`);
  });
}).catch((err) => {
  throw err;
});
