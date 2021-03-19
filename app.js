const express = require("express");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("./schema/user");
const PORT = process.env.PORT || 5000;
const { isAuth, authCheck } = require("./middleware/isAuth");
require("dotenv").config();
const { createAccessToken, createRefreshToken } = require("./auth");
const { verify } = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const Easypost = require("@easypost/api");
const api = new Easypost(process.env.EASYPOST_API);
const connectionString =
  "mongodb+srv://treyv:test123@cluster0.chs8q." +
  "mongodb.net/TrackYoIsh?retryWrites=true&w=majority";

const protectedPaths = {
  getTrackingData: "/trackingnumber/:trackingNumber/:carrier",
  getAllTrackingData: "/getall/:userId",
  insertTrackingData: "/trackingnumber",
  deleteTrackingData: "/trackingnumber",
};
mongoose.connect(
  connectionString,
  { useNewUrlParser: true },
  { useUnifiedTopology: true }
);

const whitelist = [
  "https://heroku.com",
  "https://svg0016.github.io",
  "http://localhost",
];
const corsOptions = {
  credentials: true,
  origin: (origin, callback) => {
    if (whitelist.includes(origin)) return callback(null, true);
    callback(new Error("Not allowed by CORS"));
  },
};

app.use(cors(corsOptions));

app.listen(PORT, function () {
  console.log(`Listening on ${PORT}`);
});
app.use(cookieParser());
app.use(isAuth);
app.use(express.json());

Object.values(protectedPaths).forEach((path) => {
  app.use(path, (req, res, next) => {
    if (!authCheck(req)) {
      return res.send({ ok: false, message: "Not authorized." });
    }
    next();
  });
});

app.post("/signup", (req, res) => {
  const { firstname, lastname, email, password } = req.body;
  bcrypt.hash(password, 10, (err, hash) => {
    if (err) {
      console.error(err);
      return;
    }

    const newUser = new User({
      firstname,
      lastname,
      email,
      password: hash,
    });

    newUser.save((err, savedUser) => {
      if (err) {
        res.send({ ok: false, message: "Could not save user" });
      } else {
        res.send({ ok: true, user: savedUser });
      }
    });
  });
});

app.post("/login", async (req, res) => {
  const { password, email } = req.body;
  let data = await login(email, password);
  let { token, cookie, userId } = data;
  if (cookie) {
    res.cookie(cookie.cookieId, cookie.refreshToken);
    res.send({ accessToken: token.accessToken, userId, ok: true });
  } else {
    res.send(data);
  }
});

const login = async (email, password) => {
  let data;
  let valid;
  const user = await User.findOne({ email });
  if (user) valid = await bcrypt.compare(password, user.password);

  if (!user) {
    data = { ok: false, error: "Could not find the user" };
  } else if (!valid) {
    data = { ok: false, error: "wrong password" };
  } else {
    let cookie = {
      cookieId: "jid",
      refreshToken: createRefreshToken(user),
    };
    let token = {
      accessToken: createAccessToken(user),
    };

    data = { token, cookie, userId: user.id };
  }
  return data;
};

app.post("/refresh-token", async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin);
  res.header("Access-Control-Allow-Credentials", true);
  let { userId } = req.body;
  const token = req.cookies.jid;
  if (!token) {
    return res.send({ ok: false, accessToken: "" });
  }
  let payload;

  payload = verify(token, process.env.REFRESH_TOKEN_SECRET);

  let user = await User.findOne({ _id: userId });
  if (!user) {
    return res.send({ ok: false, accessToken: "" });
  } else {
    res.send({
      ok: true,
      userId: user.id,
      accessToken: createAccessToken(user),
    });
  }
});

app.get(protectedPaths.getTrackingData, async (req, res) => {
  let { trackingNumber, carrier } = req.params;
  const tracker = new api.Tracker({
    tracking_code: trackingNumber,
    carrier: carrier,
  });

  tracker
    .save()
    .then((data) => res.send({ ok: true, data }))
    .catch((err) => res.send({ ok: false, message: err.error }));
});

app.get(protectedPaths.getAllTrackingData, (req, res) => {
  let { userId } = req.params;
  User.findOne({ _id: userId }, (err, doc) => {
    if (err) {
      res.send({ ok: false, message: "Unable to find user." });
    } else {
      res.send({ ok: true, trackingNumbers: doc.trackingnumbers });
    }
  });
});

app.put(protectedPaths.insertTrackingData, (req, res) => {
  let { userId, trackingNumber, carrier } = req.body;
  User.updateOne(
    { _id: userId },
    { $push: { trackingnumbers: { number: trackingNumber, carrier } } },
    (err, doc) => {
      if (err) {
        res.send({ ok: false });
      } else {
        res.send({ ok: true });
      }
    }
  );
});

app.delete(protectedPaths.deleteTrackingData, (req, res) => {
  let { trackingNumber, userId } = req.body;
  User.updateOne(
    { _id: userId },
    { $pull: { trackingnumbers: { number: trackingNumber } } },
    (err, doc) => {
      if (err) {
        res.send({ ok: false, err });
      } else {
        res.send({ ok: true });
      }
    }
  );
});
