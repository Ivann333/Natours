const Review = require('../models/reviewModel');
const factory = require('./handlerFactory');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('../utils/appError');

exports.getAllReviews = factory.getAll(Review);
exports.getReview = factory.getOne(Review);

exports.createReview = catchAsync(async function (req, res, next) {
  let doc = req.body;
  doc.user = req.user.id;

  // Allow nested fields
  if (req.params.tourId) {
    doc.tour = req.params.tourId;
  }

  const tourId = doc.tour;
  if (!(await Review.correctTourId(tourId))) {
    return next(new AppError(`No tour found with ${tourId} ID`, 404));
  }

  const newDoc = await Review.create(doc);
  res.status(201);
  res.json({ status: 'success', data: { data: newDoc } });
});

exports.updateReview = factory.updateOne(Review);
exports.deleteReview = factory.deleteOne(Review);
