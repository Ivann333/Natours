const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'A review is required. It cannot be empty.'],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    rating: {
      type: Number,
      min: [1, 'Rating must be at least 1.'],
      max: [5, 'Rating cannot be more than 5.'],
    },
    tour: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tour',
      required: [true, 'Every review must be associated with a tour.'],
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Every review must be associated with a user.'],
    },
    __v: { type: Number, select: false },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    id: false,
  }
);

reviewSchema.index({ user: 1, tour: 1 }, { unique: true });

reviewSchema.pre(/^find/, function (next) {
  this.populate({ path: 'user', select: '-__v -passwordChangedAt -_id -role' });
  next();
});

reviewSchema.statics.calculateAverageRating = async tourId => {
  const stats = await Review.aggregate([
    { $match: { tour: tourId } },
    {
      $group: {
        _id: '$tour',
        numOfRatings: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);
  const Tour = mongoose.model('Tour');
  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsAverage: stats[0].avgRating,
      ratingsQuantity: stats[0].numOfRatings,
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsAverage: 4.5,
      ratingsQuantity: 0,
    });
  }
};

reviewSchema.statics.correctTourId = async function (tourId) {
  const Tour = mongoose.model('Tour');
  const tour = await Tour.findById(tourId);
  return tour ? true : false;
};

reviewSchema.post('save', async function () {
  await this.constructor.calculateAverageRating(this.tour);
});

reviewSchema.post(/^findOneAnd/, async function (doc) {
  if (doc) await doc.constructor.calculateAverageRating(doc.tour);
});

const Review = mongoose.model('Review', reviewSchema);
module.exports = Review;
