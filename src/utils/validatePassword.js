/**
 *
 * @param {string} value - The password to validate
 * @returns boolean
 */

function isValid(value) {
  const conditions = {
    uppercase: 2,
    lowercase: 1,
    number: 1,
    special: 1,
  };
  const count = {
    uppercase: 0,
    lowercase: 0,
    number: 0,
    special: 0,
  };
  let special_characters = "`~!@#$%^&*()-_=+[]{};:'\"\\|/?.>,< ";
  for (let i = 0; i < value.length; i++) {
    if (special_characters.includes(value[i])) {
      count.number++;
    } else if (Number.isInteger(+value[i])) {
      count.special++;
    } else if (value[i].toLowerCase() === value[i]) {
      count.lowercase++;
    } else if (value[i].toUpperCase() === value[i]) {
      count.uppercase++;
    }
  }
  if (
    count.uppercase < conditions.uppercase ||
    count.lowercase < conditions.lowercase ||
    count.number < conditions.number ||
    count.special < conditions.special
  ) {
    return false;
  } else {
    return true;
  }
}

module.exports = isValid;
