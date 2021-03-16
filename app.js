const express = require("express");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("./schema/user");
const PORT = process.env.PORT || 5000;
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
app.use(cors());
app.use(express.json());
// app.options("*", cors());

app.post("/", (req, res) => {
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
