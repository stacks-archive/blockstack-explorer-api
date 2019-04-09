const getApp = require('./app');

const port = parseInt(process.env.PORT, 10) || 4000;

getApp().then((app) => {
  app.listen(port, (err) => {
    if (err) throw err;

    console.log(`API Server listening on port ${port}`);
  });
}).catch((err) => {
  throw err;
});
