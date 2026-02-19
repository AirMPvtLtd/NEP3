// models/QuestionBank.js
const mongoose = require('mongoose');

const questionBankSchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      required: true
    },
    schoolId: {
      type: String,
      required: true
    },
    subject: {
      type: String,
      required: true
    },
    grade: {
      type: String,
      required: true
    },
    topic: {
      type: String
    },
    questionType: {
      type: String,
      enum: ['mcq', 'short', 'long', 'diagram', 'numerical', 'problem'],
      required: true
    },
    questionText: {
      type: String,
      required: true
    },
    options: {
      type: [String],
      default: []
    },
    correctAnswer: {
      type: String
    },
    marks: {
      type: Number,
      default: 1
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium'
    },
    bloomsLevel: {
      type: String,
      enum: ['remember', 'understand', 'apply', 'analyse', 'evaluate', 'create']
    },
    aiGenerated: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('QuestionBank', questionBankSchema);
