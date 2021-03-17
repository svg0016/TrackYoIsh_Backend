const jwt = require("jsonwebtoken");

function isAuth(req, res, next) {
  const authHeader = req.get("Authorization");
  if (!authHeader) {
    req.isAuth = false;
    return next();
  }
  const token = authHeader.split(" ")[1];

  if (!token || token === "") {
    req.isAuth = false;
    return next();
  }
  let decodedToken;
  try {
    decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
  } catch (err) {
    req.isAuth = false;
    return next();
  }

  if (!decodedToken) {
    req.isAuth = false;
    return next();
  }

  req.isAuth = true;
  req.userId = decodedToken.userId;
  next();
}

function authCheck(req) {
  if (!req.isAuth) {
    return false;
  } else if (req.isAuth) {
    return true;
  }
}

module.exports = { isAuth, authCheck };
