var mongoose = require("mongoose");

console.log("-- MODELS --");

mongoose.connect("mongodb://localhost/RollingPaper");
require("./user")(mongoose);

console.log("-- MODELS --");

module.exports = mongoose;
