const app = require('./app.js');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config({ path: './config.env' });

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

mongoose.connect(DB).then(con => {
  console.log('DB connection succesful');
});

const port = 3000;
const server = app.listen(port, () =>
  console.log(`App is runnings on port: ${port}`)
);

process.on('unhandledRejection', err => {
  console.log('UNHANDLEDREJECTION');
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});
