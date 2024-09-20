const { validationResult } = require('express-validator');

const getCoordsOfAddress = require('../helper/location');
const Franchise = require('../models/franchiseModel');
const HttpError = require('../utils/httpError');
const factory = require('./handlerFactory');
const formModel = require('../models/formModel');

const addFranchise = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const msgs = errors.array().map((error) => `${error.path}: ${error.msg}`);
      return next(new HttpError(msgs, 422));
    }
    const coordinates = await getCoordsOfAddress(req.body.address);
    const newFranchise = new Franchise({
      ...req.body,
      location: {
        type: 'Point',
        coordinates: [coordinates.lng, coordinates.lat],
      },
    });

    const addFranchise = await newFranchise.save();
    res.status(200).json({
      message: 'franchise added successfully',
      data: addFranchise,
    });
  } catch (error) {
    console.log(error);
    return next(new HttpError(error, 500));
  }
};
const getFranchiseByBusinessId = async (req, res, next) => {
  try {
    // sometimes we need all locations instead of paginated results
    // see loading locations in `View Form Submissions` for a single form on frontend
    // send all locations if page is not supplied
    if (!req.query?.page) {
      const locations = await Franchise.find({
        userId: req.userId,
        businessId: req.params.id,
        isTrue: true,
      });
      res.status(200).json({
        status: 'success',
        results: locations.length,
        totalRecords: locations.length,
        Franchise: locations,
      });
    } else {
      const filter = { businessId: req.params.id, isTrue: true };
      const page = parseInt(req?.query?.page) || 1;
      const limit = 10;
      const skip = (page - 1) * limit;
      const totalRecords = await Franchise.countDocuments(filter);
      const getFranchise = await Franchise.find(filter).skip(skip).limit(limit);
      res.status(200).json({
        data: {
          status: 'success',
          limit,
          totalRecords,
          page,
          Franchise: getFranchise,
        },
      });
    }
  } catch (error) {
    return next(new HttpError(error, 500));
  }
};
const deleteFranchise = async (req, res, next) => {
  try {
    const getFranchiseById = await Franchise.findById(req.params.id);
    if (!getFranchiseById) {
      return next(new HttpError('no Franchise found by this Id', 404));
    }
    getFranchiseById.isTrue = false;
    getFranchiseById.save();

    res.status(200).json({
      status: 'success',
      message: 'Franchise Deleted successfully',
    });
  } catch (error) {
    console.log(error);
    return next(new HttpError('Internal Server Error', 500));
  }
};
const getAllFranchise = factory.getAll(Franchise, 'businessId');
const getOneFranchise = factory.getOne(Franchise);
const updateOneFranchise = factory.updateOne(Franchise);

const addForm = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const msgs = errors.array().map((error) => `${error.path}: ${error.msg}`);
      throw new HttpError(msgs, 422);
    }
    const franchise = await Franchise.findById(req.params.id);
    if (!franchise) throw new HttpError('Franchise not found', 404);
    // update franchise
    const updated = await Franchise.findOneAndUpdate(
      { _id: franchise._id },
      {
        $push: {
          forms: req.body.forms.map((f, index) => ({
            isActive: index === 0 && franchise.forms.length === 0,
            form: f,
          })),
        },
      },
      { new: true },
    );
    res.status(200).json({
      status: 'success',
      data: updated,
    });
  } catch (error) {
    console.log(error);
    if (error instanceof HttpError) return next(error);
    return next(new HttpError('Bad Request', 500));
  }
};

const activateForm = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const msgs = errors.array().map((error) => `${error.path}: ${error.msg}`);
      throw new HttpError(msgs, 422);
    }
    const franchise = await Franchise.findById(req.params.id);
    if (!franchise) throw new HttpError('Franchise not found', 404);
    const form = await formModel.findById(req.params.formId);
    if (!form) throw new HttpError('Form not found', 404);
    // find the form in franchise `forms`
    const foundIndex = franchise.forms.findIndex(
      (f) => f.form.toString() === form._id.toString(),
    );
    // update franchise
    await Franchise.findOneAndUpdate(
      { _id: franchise._id },
      {
        $set: {
          'forms.$[].isActive': false,
        },
      },
    );
    const updated = await Franchise.findOneAndUpdate(
      { _id: franchise._id },
      {
        $set: {
          [`forms.${foundIndex}.isActive`]: true,
        },
      },
      { new: true },
    );
    res.status(200).json({
      status: 'success',
      data: updated,
    });
  } catch (error) {
    console.log(error);
    if (error instanceof HttpError) return next(error);
    return next(new HttpError('Bad Request', 500));
  }
};

module.exports = {
  addFranchise,
  getAllFranchise,
  getOneFranchise,
  getFranchiseByBusinessId,
  deleteFranchise,
  updateOneFranchise,
  addForm,
  activateForm,
};
