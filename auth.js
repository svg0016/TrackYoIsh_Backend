const User = require("./schema/user");
const { sign } = require("jsonwebtoken");

const createAccessToken = (user) => {
  return sign(
    {
      userId: user.id,
      email: user.email,
      firstname: user.firstname,
      lastname: user.lastname,
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "15m" }
  );
};

const createRefreshToken = (user) => {
  return sign(
    {
      userId: user.id,
      email: user.email,
      firstname: user.firstname,
      lastname: user.lastname,
    },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: "7d" }
  );
};

module.exports = { createAccessToken, createRefreshToken };
