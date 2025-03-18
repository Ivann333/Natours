const AppError = require('../utils/appError');
const APIFeatures = require('./../utils/apiFeatures');
const catchAsync = require('./../utils/catchAsync');

exports.deleteOne = Model =>
  catchAsync(async function (req, res, next) {
    const deletedDoc = await Model.findByIdAndDelete(req.params.id);
    if (!deletedDoc)
      return next(
        new AppError(`No document found with ${req.params.id} ID`, 404)
      );

    res.status(204).json({
      status: 'success',
      data: null,
    });
  });

exports.updateOne = Model =>
  catchAsync(async function (req, res, next) {
    const updatedDoc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updatedDoc)
      return next(
        new AppError(`No document found with ${req.params.id} ID`, 404)
      );

    res.json({
      status: 'success',
      data: { data: updatedDoc },
    });
  });

exports.createOne = Model =>
  catchAsync(async function (req, res, next) {
    let doc = req.body;

    const newDoc = await Model.create(doc);
    res.status(201);
    res.json({ status: 'success', data: { data: newDoc } });
  });

exports.getOne = (Model, populateOptions) =>
  catchAsync(async function (req, res, next) {
    let query = Model.findById(req.params.id);

    if (populateOptions) query = query.populate(populateOptions);

    const doc = await query;

    if (!doc)
      return next(
        new AppError(`No document found with ${req.params.id} ID`, 404)
      );

    res.json({
      status: 'success',
      data: { data: doc },
    });
  });

exports.getAll = Model =>
  catchAsync(async function (req, res, next) {
    // Allow nested fields
    let filter = {};
    if (req.params.tourId) {
      filter = { tour: req.params.tourId };
    }

    const features = new APIFeatures(Model.find(filter), req.query)
      .applyQueryFilters()
      .sort()
      .limitFields()
      .paginate();

    const docs = await features.query;
    res.json({ status: 'success', results: docs.length, data: { docs } });
  });
