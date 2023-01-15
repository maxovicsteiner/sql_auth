const { Sequelize, Model, DataTypes } = require("sequelize");

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USERNAME,
  process.env.DB_PASSWORD,
  {
    host: "localhost",
    dialect: "mysql",
  }
);

class User extends Model {}

User.init(
  {
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },
    first_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    last_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    timestamps: true,
    tableName: "users",
    sequelize,
    modelName: "User",
  }
);

module.exports = async () => {
  try {
    await sequelize.authenticate();
    console.log(
      "[DATABASE CONNECTED] Connection has been established successfully.".cyan
        .underline
    );
    // await sequelize.sync({ alter: true });
    // console.log("Check the workbench".cyan.underline);
  } catch (error) {
    console.error(
      "[DATABASE CONNECTION ERROR] Unable to connect to the database:".red,
      error.message
    );
    process.exit(1);
  }
};

module.exports.User = User;
