const express = require("express");
const { errorHandler } = require("./middlewares/errorMiddleware");
require("dotenv").config();
require("colors");
const app = express();

require("./config/db")();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(
    `[SERVER LISTENING] Server up and running on port ${PORT}`.cyan.underline
  )
);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// routes
app.use("/api/auth", require("./routes/authRouter"));

// error middleware
app.use(errorHandler);
