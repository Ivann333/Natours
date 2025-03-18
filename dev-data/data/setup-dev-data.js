const mongoose = require('mongoose');
const fs = require('fs');
const Tour = require('../../models/tourModel.js');
const User = require('../../models/userModel.js');
const Review = require('../../models/reviewModel.js');

require('dotenv').config({ path: `${__dirname}/../../config.env` });
(async function () {
  try {
    await mongoose.connect(
      `${process.env.DATABASE.replace(
        '<PASSWORD>',
        process.env.DATABASE_PASSWORD
      )}`
    );
    console.log('Connect successful');
  } catch (err) {
    console.error(err);
  }
})();

const tours = JSON.parse(fs.readFileSync(`${__dirname}/tours.json`));
const reviews = JSON.parse(fs.readFileSync(`${__dirname}/reviews.json`));
const users = JSON.parse(fs.readFileSync(`${__dirname}/users.json`));

const loadDbFromJSON = async function () {
  try {
    await Tour.create(tours);
    await User.create(users);
    await Review.create(reviews);

    console.log('Data successfully loaded');
  } catch (err) {
    console.error(err);
  }
  process.exit(1);
};

const clearDb = async function () {
  try {
    await User.deleteMany();
    await Tour.deleteMany();
    await Review.deleteMany();

    console.log('DB now is empty');
  } catch (err) {
    console.error(err);
  }
  process.exit(1);
};

if (process.argv[2] === '--clear') clearDb();
if (process.argv[2] === '--load') loadDbFromJSON();
