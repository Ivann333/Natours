const AppError = require('./../utils/appError');

module.exports = function (err, req, res, next) {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV === 'production') {
    console.error(err);

    let error = { ...err, message: err.message };

    if (err.name === 'CastError') error = handleCastErrorDB(error);
    if (err.code === 11000 && err.keyPattern.user && err.keyPattern.tour)
      error = handleDuplicateReviewError();
    if (err.code === 11000 && err.keyValue.name)
      error = handleDuplicateFieldsDB(error);
    if (err.name === 'ValidationError') error = handleValidationErrorDB();
    if (err.name === 'JsonWebTokenError') error = handleJsonWebTokenError();
    if (err.name === 'TokenExpiredError') error = handleJsonWebTokenExpired();

    if (error.statusCode === 500)
      error.message = 'Something went wrong. Please try again later.';

    sendErrorProd(error, res);
  }
};

const sendErrorDev = function (err, res) {
  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorProd = function (err, res) {
  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
  });
};

const handleCastErrorDB = function (err) {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const handleDuplicateReviewError = function () {
  const message = `You can only submit one review per tour. If you'd like to update your existing review, please edit it instead.`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = function (err) {
  const message = `Duplicate field value: ${err.keyValue.name}. Please use another value!`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = function () {
  const message = `Ivanlid input data.`;
  return new AppError(message, 400);
};

const handleJsonWebTokenError = function () {
  const message = 'Invalid token. Please log in again!';
  return new AppError(message, 401);
};

const handleJsonWebTokenExpired = function () {
  const message = 'Expired token. Please log in again!';
  return new AppError(message, 401);
};
