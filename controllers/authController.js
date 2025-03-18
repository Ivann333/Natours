const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const crypto = require('crypto');
const AppError = require('../utils/appError');
const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const sendEmail = require('./../utils/email');

exports.signup = catchAsync(async function (req, res, next) {
  const userData = {
    name: req.body.name,
    email: req.body.email,
    photo: req.body.photo,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangedAt: req.body.passwordChangedAt,
  };

  const newUser = await User.create(userData);

  createSendToken(newUser, 201, res);
});

const createSendToken = function (user, statusCode, res) {
  const token = signToken(user._id);
  user.password = undefined;

  const cookieOptions = {
    maxAge: process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
    httpOnly: true,
  };
  res.cookie('jwt', token, cookieOptions);
  res
    .status(statusCode)
    .json({ status: 'success', token, data: { user: user } });
};

const signToken = function (id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES,
  });
};

exports.login = catchAsync(async function (req, res, next) {
  const { email, password } = req.body;
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  user.password = undefined;

  createSendToken(user, 201, res);
});

exports.protect = catchAsync(async function (req, res, next) {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(
      new AppError('You are not logged in. Please log in to get access.', 401)
    );
  }

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  const freshUser = await User.findById(decoded.id).select(
    '+passwordChangedAt'
  );

  if (!freshUser) {
    return next(
      new AppError('The user belonging to this token does no longer exist', 401)
    );
  }
  if (freshUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password. Please log in again.', 401)
    );
  }
  req.user = freshUser;

  next();
});

exports.restrictTo = function (...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }
    next();
  };
};

exports.forgotPassword = catchAsync(async function (req, res, next) {
  const user = await User.findOne({ email: req.body.email });
  if (!req.body.email) {
    return next(new AppError('No email provided', 404));
  }
  if (!user) {
    return next(new AppError('No user found with that email', 404));
  }
  const resetToken = user.createPasswordResetToken();

  await user.save({ validateBeforeSave: false });

  const resetUrl = `${req.protocol}://${req.get(
    'host'
  )}/api/v1/users/resetPassword/${resetToken}`;

  const message = `You are receiving this email because you (or someone else)
    has requested a password reset for your account.\n\nSubmit a PATCH
    request with your new password and passwordConfirm to:\n\n${resetUrl}\n\nIf you did not request this,
    please ignore this email and your password will remain unchanged.\n`;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Your password reset token (valid for 10 min)',
      message: message,
    });

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!',
    });
  } catch (err) {
    user.resetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError('There was an error sending the email. Try again later!'),
      500
    );
  }
});

exports.resetPassword = catchAsync(async function (req, res, next) {
  const resetToken = crypto
    .createHash('sha256')
    .update(req.params.resetToken)
    .digest('hex');

  const user = await User.findOne({
    resetToken: resetToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user || user.passwordResetExpires < Date.now()) {
    return next(new AppError('Token is invalid or has expired', 400));
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async function (req, res, next) {
  const user = await User.findById(req.user.id).select('+password');

  if (!(await user.correctPassword(req.body.currentPassword, user.password))) {
    return next(new AppError('Wrong password', 401));
  }

  user.password = req.body.newPassword;
  user.passwordConfirm = req.body.newPasswordConfirm;
  await user.save();

  createSendToken(user, 200, res);
});

exports.updateMe = catchAsync(async function (req, res, next) {
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'Cannot update password through this route. Please use /updatePassword',
        400
      )
    );
  }
  const filteredBody = filterObject(req.body, 'name', 'email');
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: 'success',
    data: { user: updatedUser },
  });
});

const filterObject = function (obj, ...fields) {
  const filteredObj = {};
  fields.forEach(field => {
    if (obj.hasOwnProperty(field)) {
      filteredObj[field] = obj[field];
    }
  });
  return filteredObj;
};

exports.deleteMe = catchAsync(async function (req, res, next) {
  const user = await User.findById(req.user.id).select('+password');
  if (!(await user.correctPassword(req.body.password, user.password))) {
    return next(new AppError('Wrong password', 401));
  }
  user.active = false;
  await user.save();
  res.status(204).json({ status: 'success', message: 'User deleted' });
});

exports.getMe = function (req, res, next) {
  req.params.id = req.user.id;
  next();
};
