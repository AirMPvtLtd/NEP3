// models/SPIRecord.js
const mongoose = require('mongoose');

const spiRecordSchema = new mongoose.Schema({
  studentId: { type: String, required: true, index: true },

  spi: { type: Number, required: true },
  spi_raw: { type: Number },

  grade: { type: String },
  learning_state: { type: String },

  kalman_uncertainty: { type: Number },

  concept_mastery: { type: Object },

  totalChallenges: { type: Number },

  source: {
    type: String,
    enum: ['challenge_evaluated', 'manual', 'recalculation'],
    default: 'challenge_evaluated'
  },

  calculatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('SPIRecord', spiRecordSchema);
