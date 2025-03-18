const Tour = require('../models/tourModel');
const catchAsync = require('./../utils/catchAsync');
const factory = require('./handlerFactory');
const AppError = require('./../utils/appError');

exports.getTopCheapest = function (req, res, next) {
  req.query.sort = 'price -ratingsAverage';
  next();
};

exports.getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 } },
    },
    {
      $group: {
        _id: { $toUpper: '$difficulty' },
        numTours: { $sum: 1 },
        numRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
      },
    },
    {
      $sort: { avgPrice: 1 },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      stats,
    },
  });
});

exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;

  const [lat, lng] = latlng.split(',');

  if (!distance || !lat || !lng || !unit) {
    return next(
      new AppError(
        'Missing required parameters: distance, latlng, or unit.',
        400
      )
    );
  }

  let maxDistanceInMeters;
  unit === 'mi'
    ? (maxDistanceInMeters = distance * 1609.34)
    : (maxDistanceInMeters = distance * 1000);

  const nearbyLocations = await Tour.find({
    startLocation: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [lng * 1, lat * 1],
        },
        $maxDistance: maxDistanceInMeters,
      },
    },
  });

  res.status(200).json({
    status: 'success',
    results: nearbyLocations.length,
    data: {
      data: nearbyLocations,
    },
  });
});

exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;

  const [lat, lng] = latlng.split(',');

  if (!lat || !lng || !unit) {
    return next(
      new AppError('Missing required parameters: latlng or unit.', 400)
    );
  }
  const distanceMultiplier = unit === 'mi' ? 0.000621371 : 0.001;

  const distances = await Tour.aggregate([
    {
      $geoNear: {
        near: { type: 'Point', coordinates: [lng * 1, lat * 1] },
        distanceField: 'distance',
        spherical: true,
        distanceMultiplier: distanceMultiplier,
      },
    },
    {
      $project: { name: 1, distance: 1 },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      data: distances,
    },
  });
});

exports.getAllTours = factory.getAll(Tour);
exports.getTour = factory.getOne(Tour, { path: 'reviews' });
exports.createTour = factory.createOne(Tour);
exports.updateTour = factory.updateOne(Tour);
exports.deleteTour = factory.deleteOne(Tour);
