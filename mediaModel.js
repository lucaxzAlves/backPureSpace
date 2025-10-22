const mongoose = require('mongoose') 

const mediaDataSchema = new mongoose.Schema({
    mediatemp: String,
    mediahum: String,
    mediappm: String,
    id: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  });

  module.exports = mongoose.model('mediaData', mediaDataSchema);