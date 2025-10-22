const mongoose = require('mongoose') 

const mediaDiariaDataSchema = new mongoose.Schema({
     mediatempdiaria: String,
  mediahumdiaria: String,
  mediapmmdiaria: String,
  id: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  });

  module.exports = mongoose.model('mediaDiariaData', mediaDiariaDataSchema);