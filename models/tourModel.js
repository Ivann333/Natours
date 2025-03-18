const mongoose = require('mongoose');

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true,
      trim: true,
      maxlength: [40, 'A tour name must be 40 characters or fewer'],
      minlength: [4, 'A tour name must be at least 4 characters long'],
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A tour must have a specified duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a maximum group size'],
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty level'],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty must be either "easy", "medium", or "difficult"',
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be at least 1.0'],
      max: [5, 'Rating must not exceed 5.0'],
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price'],
    },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function (val) {
          return val < this.price;
        },
        message:
          'Discount price ({VALUE}) must be lower than the regular price',
      },
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'A tour must have a summary'],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a cover image'],
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false,
    },
    startDates: [Date],
    startLocation: {
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'],
        required: [true, 'Start location type is required'],
      },
      coordinates: {
        type: [Number],
        required: [true, 'Start location must have coordinates'],
      },
      address: {
        type: String,
        required: [true, 'Start location must have an address'],
      },
      description: {
        type: String,
        required: [true, 'Start location must have a description'],
      },
    },
    locations: [
      {
        type: { type: String, default: 'Point', enum: ['Point'] },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],
    guides: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    __v: { type: Number, select: false },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    id: false,
  }
);

tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: '2dsphere' });

tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour',
  localField: '_id',
});

tourSchema.pre(/^find/, async function (next) {
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt -_id -role',
  });

  next();
});

tourSchema.post(
  ['findOneAndDelete', 'findByIdAndDelete'],
  async function (doc) {
    if (doc) {
      const Review = mongoose.model('Review');
      await Review.deleteMany({ tour: doc._id });
    }
  }
);

const Tour = mongoose.model('Tour', tourSchema);
module.exports = Tour;
