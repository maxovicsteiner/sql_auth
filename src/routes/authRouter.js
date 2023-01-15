const { Router } = require("express");
const {
  registerUser,
  verifyEmail,
  loginUser,
  choseUsername,
} = require("../controllers/authControllers");
const { protect } = require("../middlewares/authMiddleware");

const router = new Router();

router.post("/register", registerUser);
router.post("/verify/:uuid", verifyEmail);
router.post("/login", loginUser);
router.patch("/username", protect, choseUsername);

module.exports = router;
