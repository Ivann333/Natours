const User = require('../models/userModel');
const factory = require('./handlerFactory');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');

exports.getUser = factory.getOne(User);
exports.getAllUsers = factory.getAll(User);

exports.deleteUser = catchAsync(async function (req, res, next) {
  const user = await User.findById(req.params.id);
  if (!user)
    return next(new AppError(`No User found with ${req.params.id} ID`, 404));

  user.active = false;
  await user.save();

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.updateUser = factory.updateOne(User);
