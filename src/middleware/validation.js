export const validate = (type) => {
  return (req, res, next) => {
    // Basic validation - you can extend this with Joi or similar
    try {
      switch (type) {
        case 'register':
          if (!req.body.email || !req.body.password || !req.body.name) {
            return res.status(400).json({
              success: false,
              message: 'Email, password, and name are required'
            });
          }
          break;

        case 'login':
          if (!req.body.email || !req.body.password) {
            return res.status(400).json({
              success: false,
              message: 'Email and password are required'
            });
          }
          break;

        case 'product':
          if (!req.body.name || !req.body.normalPrice || !req.body.categoryId) {
            return res.status(400).json({
              success: false,
              message: 'Name, price, and category are required'
            });
          }
          break;

        default:
          break;
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};