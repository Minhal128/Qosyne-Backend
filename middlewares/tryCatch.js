const tryCatch = (controller) => async (req, res, next) => {
  try {
    await controller(req, res, next);
  } catch (error) {
    console.log("error in try catch" ,error);
    next(error);
  }
};
module.exports = tryCatch;
