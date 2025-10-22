const mongoose = require('mongoose') 

const SensorDataSchema = new mongoose.Schema({
    temp: String,
    hum: String,
    ppm: String,
    id: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  });

  module.exports = mongoose.model('SensorData', SensorDataSchema);

