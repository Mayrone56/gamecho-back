const mongoose = require("mongoose");


// SUBDOCUMENT SCHEMA related to expansion/DLC type of content

const expandedContentListSchema = mongoose.Schema({
  description: String,
  name: String,
  releasedDate: Date,
  ratingsID: [{ type: mongoose.Schema.Types.ObjectId, ref: "ratings" }],
  imageGame: String,
  ratingSummary: {
    averageRating: { type: Number },
    numberOfRatings: { type: Number },
  },
});

// GAME SCHEMA

    //ratingSummary allows the perfomance to relieve by using a simpler calculation each time a percentage is generated

    //trace all the ratings with the "rating" key in order to display data
    //as there's potentially many ratings, usage of an array to call the key

const gameSchema = mongoose.Schema({
  description: String,
  name: String,
  developer: String,
  publisher: String,
  releasedDate: Date,
  platforms: String,
  genre: String,
  isMultiplayer: Boolean,
  isOnline: Boolean,
  isExpandedContent: Boolean,
  expandedContentList: [expandedContentListSchema],
  ratingsID: [{ type: mongoose.Schema.Types.ObjectId, ref: "ratings" }],
  imageGame: String,
  ratingSummary: {
    averageRating: { type: Number },
    numberOfRatings: { type: Number },
  },
});

const Game = mongoose.model("games", gameSchema);

module.exports = Game;
