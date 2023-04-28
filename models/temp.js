const mongoose = require("mongoose");

const tempSchema = new mongoose.Schema({
  firstName: {
    type: String,
    trim: true,
    required: true,
  },
  lastName: {
    type: String,
    trim: true,
    required: true,
  },
  phone: {
    type: String,
  },
  email: {
    type: String,
  },
  hashed_password: {
    type: String,
  },
  otp: {
    type: String,
  },
});

module.exports = mongoose.model("temp", tempSchema);
