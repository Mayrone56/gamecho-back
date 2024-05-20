const mongoose = require("mongoose");

// RATING SCHEMA

//each rating is unique and created by one user targeted by a key
//each rating evaluates one specific game targeted by a key

//if the first rate doesn't indicate any category, considered as a general rating

//many categories hence the array

const ratingSchema = mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
  game: { type: mongoose.Schema.Types.ObjectId, ref: "game" },
  category: { type: [String], default: ["general"] },
  rating: Number,
  ratingMode: String,
  comment: String,
  ratingDate: Date,
});

const Rating = mongoose.model("ratings", ratingSchema);

module.exports = Rating;
