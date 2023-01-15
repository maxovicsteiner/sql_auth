const jwt = require("jsonwebtoken");

/**
 *
 * @param {string | object | Buffer} payload
 * @returns string
 */
function generateToken(payload) {
  let token = jwt.sign(payload, process.env.JWT_SECRET.toString());
  return token;
}

module.exports = generateToken;
