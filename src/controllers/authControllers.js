const fs = require("fs");
const path = require("path");
const asyncHandler = require("express-async-handler");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");

const { User } = require("../config/db");
const hashValue = require("../utils/hashValue");
const isValid = require("../utils/validatePassword");
const generateRandomUsername = require("../utils/generateRandomUsername");
const generateToken = require("../utils/generateToken");

const TEMP_USERS_PATH = path.join(__dirname, "..", "..", "temp_users.json");
/**
 *
 * @param {fs.PathOrFileDescriptor} path
 * @returns Promise<string>
 */
function readFile(path) {
  return new Promise(function (resolve, reject) {
    fs.readFile(
      path,
      {
        encoding: "utf-8",
      },
      function (err, data) {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      }
    );
  });
}

/**
 *
 * @param {fs.PathOrFileDescriptor} path
 * @param {string | NodeJS.ArrayBufferView} data
 * @returns Promise<void>
 */
function writeFile(path, data) {
  return new Promise(function (resolve, reject) {
    fs.writeFile(path, data, "utf-8", function (err) {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

module.exports.registerUser = asyncHandler(async (req, res) => {
  let { first_name, last_name, email, password } = req.body;

  // check if all fields are provided

  if (!first_name || first_name.trim().length === 0) {
    res.status(400);
    throw new Error("Please enter your first name");
  } else {
    first_name = first_name.trim();
  }
  if (!last_name || last_name.trim().length === 0) {
    res.status(400);
    throw new Error("Please enter your last name");
  } else {
    last_name = last_name.trim();
  }
  if (!email || email.trim().length === 0) {
    res.status(400);
    throw new Error("Please enter your email");
  } else {
    email = email.trim();
  }
  if (!password || password.length < 7) {
    res.status(400);
    throw new Error("Minimum password length is 7");
  }

  // email verification
  if (!require("validator").isEmail(email)) {
    res.status(400);
    throw new Error("Please enter a valid email");
  }

  // password validation
  /*
    7 charachters or more
    2 uppercase letters or more
    1 lowercase letter or more
    numbers
    special_characters
  */
  if (!isValid(password)) {
    res.status(400);
    throw new Error(
      "Password has to have at least 2 uppercase letters, 1 lowercase letter, 1 number and 1 special character"
    );
  }

  // check if user is already registered
  const alreadyExists = await User.findOne({
    where: {
      email,
    },
  });
  if (alreadyExists) {
    res.status(400);
    throw new Error("Email already registered");
  }

  // send verification email to user

  const code = Math.floor(100000 + Math.random() * 900000);

  let transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  let details = {
    from: "inkin.verify@gmail.com",
    to: email,
    subject: "Verify your email",
    text: `Your verification code is ${code}`,
  };

  transporter.sendMail(details, function (err) {
    if (err) {
      res.status(500);
      throw new Error("Error happened while sending verification email");
    }
    console.log(`[MAIL SENT] Verification email sent to ${email}`);
  });

  // everything in order, save user in temp_users.json
  const uuid = require("crypto").randomBytes(64).toString("hex");
  const hashed_password = await hashValue(password);
  const hashed_code = await bcrypt.hash(code.toString(), 10);
  const user = {
    uuid,
    first_name,
    last_name,
    email,
    password: hashed_password,
    code: hashed_code,
  };

  const temp_users = await readFile(TEMP_USERS_PATH);

  await writeFile(
    TEMP_USERS_PATH,
    JSON.stringify([...JSON.parse(temp_users), user])
  );

  res.status(200).json({
    uuid,
  });
});

module.exports.verifyEmail = asyncHandler(async (req, res) => {
  const { code } = req.body;
  const { uuid } = req.params;

  // check if all fields are fulfilled
  if (!code || code.trim().length !== 6) {
    res.status(400);
    throw new Error("Please provide a valid 6-digit code");
  }

  // find user in temp database
  let users = await readFile(TEMP_USERS_PATH);
  let current_user = null;
  users = JSON.parse(users);
  user_loop: for (let i = 0; i < users.length; i++) {
    if (users[i].uuid === uuid) {
      current_user = users[i];
      break user_loop;
    }
  }

  if (!current_user) {
    res.status(400);
    throw new Error("Account was not found");
  }

  // compare codes
  let correct = await bcrypt.compare(code, current_user.code);

  if (!correct) {
    res.status(400);
    throw new Error("Incorrect code");
  }

  // code is correct delete them from temp_users
  users = users.filter((user) => user.uuid !== current_user.uuid);

  await writeFile(TEMP_USERS_PATH, JSON.stringify(users));

  // save current user to database

  let { first_name, last_name, email, password } = current_user;
  const user = await User.create({
    first_name,
    last_name,
    email,
    username: generateRandomUsername(),
    password,
  });

  if (!user) {
    res.status(400);
    throw new Error("Unexpected error happened");
  }

  let { user_id, email: user_email, username: user_username } = user;

  const token = generateToken({
    user_id,
    email: user_email,
    username: user_username,
  });

  res.status(200).json({ token });
});

module.exports.loginUser = asyncHandler(async (req, res) => {
  let { identifier, password } = req.body;
  let isUsername = false;
  // check if all fields are fulfilled
  if (!identifier || identifier.trim().length === 0) {
    res.status(400);
    throw new Error("Please enter your username or email");
  } else {
    identifier = identifier.trim();
  }
  if (!password || password.length === 0) {
    res.status(400);
    throw new Error("Please enter your password");
  }

  // check if identifier is email or username
  if (!identifier.includes("@")) {
    isUsername = true;
  }

  // fetch database
  let user;
  if (isUsername) {
    user = await User.findOne({
      where: {
        username: identifier,
      },
    });
  } else {
    user = await User.findOne({
      where: {
        email: identifier,
      },
    });
  }

  if (!user) {
    // account does not exist or is not verified, fetch temp_users
    let unverified_users = await readFile(TEMP_USERS_PATH);
    JSON.parse(unverified_users).forEach((user) => {
      if (user.email === identifier) {
        res.status(400);
        throw new Error("Your account is not verified");
      }
    });
    res.status(400);
    throw new Error("Your account does not exist");
  }

  // user is found in the database, compare passwords
  let correct = await bcrypt.compare(password, user.password);

  if (!correct) {
    res.status(400);
    throw new Error("Incorrect password");
  }

  const { user_id, email, username } = user;

  let token = generateToken({ user_id, email, username });

  res.status(200).json({ token });
});

module.exports.choseUsername = asyncHandler(async (req, res) => {
  const user = await User.findOne({
    where: {
      user_id: req.user,
    },
  });
  if (!user) {
    res.status(401);
    throw new Error("User not found");
  }

  // validate username

  let { new_username } = req.body;

  if (!new_username || new_username.trim().length === 0) {
    res.status(400);
    throw new Error("Please enter your username");
  } else {
    new_username = new_username.trim();
  }

  if (new_username.includes("@") || new_username.includes(" ")) {
    res.status(400);
    throw new Error("Usernames cannot contain '@' or white spaces");
  }

  // check if username is already registered
  const alreadyRegistered = await User.findOne({
    where: {
      username: new_username,
    },
  });

  if (alreadyRegistered && alreadyRegistered.user_id === req.user) {
    res.status(400);
    throw new Error("You have to chose a new username");
  } else if (alreadyRegistered) {
    res.status(400);
    throw new Error("Username already registered");
  }

  await user.update({
    username: new_username,
  });

  res.status(200).json({
    message: `Your username has been successfully updated to ${user.username}`,
  });
});
