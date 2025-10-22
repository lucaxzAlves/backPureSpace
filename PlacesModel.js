const mongoose = require('mongoose') 

const PlacesSchema = new mongoose.Schema({
    id: String,
    name: String,
    desc: String,
     position: {
    top: String,
    left: String
  },
    img: String,
     MediaCounter: {type: Number, default: 0 } ,
     dailyMediaCounter: {type: Number, default: 0 },
  });

  module.exports = mongoose.model('PlacesData', PlacesSchema);