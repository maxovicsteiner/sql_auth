const asyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");
const { User } = require("../config/db");

module.exports.protect = asyncHandler(async (req, res, next) => {
  const { authorization } = req.headers;

  if (!authorization) {
    res.status(401);
    throw new Error("Unauthorized, token not found");
  }

  const token = authorization.split(" ")[1];

  if (!token) {
    res.status(401);
    throw new Error("Unauthorized, token not found");
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  if (!decoded) {
    res.status(401);
    throw new Error("Unauthorized, invalid token");
  }

  const user = await User.findOne({
    where: {
      user_id: decoded.user_id,
    },
  });

  if (!user) {
    res.status(401);
    throw new Error("Unauthorized, user not found");
  }

  req.user = user.user_id;
  next();
});
