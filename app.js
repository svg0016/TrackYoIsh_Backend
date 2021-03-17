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
mongoose.connect(
  connectionString,
  { useNewUrlParser: true },
  { useUnifiedTopology: true }
);
app.listen(PORT, function () {
  console.log(`Listening on ${PORT}`);
});
app.use(cookieParser());
app.use(isAuth);
app.use(cors());
app.use(express.json());
// app.options("*", cors());

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
        res.send({ error: err });
      } else {
        res.send(savedUser);
      }
    });
  });
});

app.get("/login", async (req, res) => {
  const { password, email } = req.body;
  let data = await login(email, password);
  let { token, cookie } = data;
  if (cookie) {
    res.cookie(cookie.cookieId, cookie.refreshToken);
    res.send(token);
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
      ok: true,
    };

    data = { token, cookie };
  }
  return data;
};

app.post("/refresh_token", async (req, res) => {
  let { userId } = req.body;
  const token = req.cookies.jid;
  if (!token) {
    return res.send({ ok: false, accessToken: "" });
  }
  let payload;
  console.log(token);

  payload = verify(token, process.env.REFRESH_TOKEN_SECRET);

  let user = await User.findOne({ _id: userId });
  if (!user) {
    return res.send({ ok: false, accessToken: "" });
  } else {
    res.send({ ok: true, accessToken: createAccessToken(user) });
  }
});

app.get("/trackingnumber", async (req, res) => {
  const tracker = new api.Tracker({
    tracking_code: "EZ4000000004",
    carrier: "UPS",
  });

  tracker.save().then(console.log);
});

app.get("/getall", (req, res) => {
  let { userId } = req.body;
  User.findOne({ _id: userId }, (err, doc) => {
    if (err) {
      res.send({ ok: false });
    } else {
      res.send({ ok: true, data: doc.trackingnumbers });
    }
  });
});

app.put("/trackingnumber", (req, res) => {
  let { userId, trackingNumber } = req.body;
  User.updateOne(
    { _id: userId },
    { $push: { trackingnumbers: trackingNumber } },
    (err, doc) => {
      if (err) {
        res.send({ ok: false });
      } else {
        res.send({ ok: true });
      }
    }
  );
});

app.delete("/trackingnumber", (req, res) => {
  let { trackingNumber, userId } = req.body;
  User.updateOne(
    { _id: userId },
    { $pull: { trackingnumbers: trackingNumber } },
    (err, doc) => {
      if (err) {
        res.send({ ok: false });
      } else {
        res.send({ ok: true });
      }
    }
  );
});
