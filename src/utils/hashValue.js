const bcrypt = require("bcrypt");

/**
 *
 * @param {string | Buffer} value
 * @returns Promise<string>
 */
module.exports = async function (value) {
  const salt = await bcrypt.genSalt(10);
  const hashed_value = await bcrypt.hash(value, salt);
  return hashed_value;
};
