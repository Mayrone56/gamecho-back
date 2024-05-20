const mongoose = require("mongoose");

// USER SCHEMA

//possibility to find all the app data of the user by associating keys
//token and password will get replaced by security types modules during creation
//avatar will need to call a CDN to let the user upload

const userSchema = mongoose.Schema({
  username: String,
  email: String,
  password: String,
  token: String,
  avatar: String,
  ratings: [{ type: mongoose.Schema.Types.ObjectId, ref: "rating" }],
  wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: "game" }],
});

const User = mongoose.model("users", userSchema);

module.exports = User;
