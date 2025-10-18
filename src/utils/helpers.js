export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export const generateOrderNumber = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `ORD-${timestamp}-${random}`;
};

export const paginate = (page = 1, limit = 10) => {
  const skip = (page - 1) * limit;
  return { skip, take: limit };
};

export const response = (success, message, data = null) => ({
  success,
  message,
  data
});