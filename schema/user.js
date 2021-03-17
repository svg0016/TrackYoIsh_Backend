const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const UserProfile = new Schema({
  firstname: String,
  lastname: String,
  email: String,
  password: String,
  trackingnumbers: [{ number: String, carrier: String }],
});

module.exports = mongoose.model("Users", UserProfile);
