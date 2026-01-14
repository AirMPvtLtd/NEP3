// models/ClassSection.js
/**
 * CLASS SECTION MODEL
 * Mongoose schema for class sections
 * 
 * @module models/ClassSection
 */

const mongoose = require('mongoose');
const { nanoid } = require('nanoid');
const { CLASS_LEVELS, SECTIONS, SUBJECTS } = require('../config/constants');

const classSectionSchema = new mongoose.Schema({
  // Unique Class Section Identifier
  classSectionId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    default: () => `CLS-${nanoid(8).toUpperCase()}`
  },
  
  // School & Teacher Reference
  schoolId: {
    type: String,
    required: [true, 'School ID is required'],
    ref: 'School',
    index: true
  },
  
  teacherId: {
    type: String,
    required: [true, 'Teacher ID is required'],
    ref: 'Teacher',
    index: true
  },
  
  // Class Information
  class: {
    type: Number,
    required: [true, 'Class is required'],
    enum: CLASS_LEVELS,
    min: 6,
    max: 12
  },
  
  section: {
    type: String,
    required: [true, 'Section is required'],
    enum: SECTIONS,
    uppercase: true
  },
  
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    enum: SUBJECTS
  },
  
  academicYear: {
    type: String,
    required: [true, 'Academic year is required'],
    match: /^\d{4}-\d{4}$/,
    default: () => {
      const year = new Date().getFullYear();
      return `${year}-${year + 1}`;
    }
  },
  
  // Class Details
  className: {
    type: String,
    trim: true
  },
  
  roomNumber: {
    type: String,
    trim: true
  },
  
  capacity: {
    type: Number,
    default: 40,
    min: 1,
    max: 100
  },
  
  // Schedule
  schedule: [{
    day: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      required: true
    },
    startTime: {
      type: String, // Format: "HH:MM"
      match: /^([01]\d|2[0-3]):([0-5]\d)$/
    },
    endTime: {
      type: String,
      match: /^([01]\d|2[0-3]):([0-5]\d)$/
    }
  }],
  
  // Statistics
  stats: {
    totalStudents: {
      type: Number,
      default: 0
    },
    activeStudents: {
      type: Number,
      default: 0
    },
    averagePerformance: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    totalChallenges: {
      type: Number,
      default: 0
    }
  },
  
  // Status
  active: {
    type: Boolean,
    default: true
  },
  
  // Metadata
  description: {
    type: String,
    maxlength: 500
  },
  
  tags: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ============================================================================
// INDEXES
// ============================================================================

classSectionSchema.index({ classSectionId: 1 });
classSectionSchema.index({ schoolId: 1, class: 1, section: 1, subject: 1 }, { unique: true });
classSectionSchema.index({ teacherId: 1 });
classSectionSchema.index({ academicYear: 1 });

// ============================================================================
// VIRTUALS
// ============================================================================

// Virtual for students
classSectionSchema.virtual('students', {
  ref: 'Student',
  localField: 'classSectionId',
  foreignField: 'classSectionId'
});

// Virtual for full class name
classSectionSchema.virtual('fullName').get(function() {
  return `Class ${this.class}${this.section} - ${this.subject}`;
});

// Virtual for is full
classSectionSchema.virtual('isFull').get(function() {
  return this.stats.totalStudents >= this.capacity;
});

// ============================================================================
// INSTANCE METHODS
// ============================================================================

/**
 * Check if can add student
 */
classSectionSchema.methods.canAddStudent = function() {
  return this.stats.totalStudents < this.capacity;
};

/**
 * Increment student count
 */
classSectionSchema.methods.incrementStudentCount = async function() {
  return await this.updateOne({ 
    $inc: { 
      'stats.totalStudents': 1,
      'stats.activeStudents': 1
    } 
  });
};

/**
 * Decrement student count
 */
classSectionSchema.methods.decrementStudentCount = async function() {
  return await this.updateOne({ 
    $inc: { 
      'stats.totalStudents': -1,
      'stats.activeStudents': -1
    } 
  });
};

/**
 * Update average performance
 */
classSectionSchema.methods.updateAveragePerformance = async function(averageScore) {
  this.stats.averagePerformance = averageScore;
  return await this.save();
};

/**
 * Increment challenge count
 */
classSectionSchema.methods.incrementChallengeCount = async function() {
  return await this.updateOne({ $inc: { 'stats.totalChallenges': 1 } });
};

/**
 * Add schedule entry
 */
classSectionSchema.methods.addSchedule = async function(day, startTime, endTime) {
  // Check if schedule already exists for this day
  const existing = this.schedule.findIndex(s => s.day === day);
  
  if (existing !== -1) {
    this.schedule[existing] = { day, startTime, endTime };
  } else {
    this.schedule.push({ day, startTime, endTime });
  }
  
  return await this.save();
};

/**
 * Remove schedule entry
 */
classSectionSchema.methods.removeSchedule = async function(day) {
  this.schedule = this.schedule.filter(s => s.day !== day);
  return await this.save();
};

// ============================================================================
// STATIC METHODS
// ============================================================================

/**
 * Find by class section ID
 */
classSectionSchema.statics.findByClassSectionId = function(classSectionId) {
  return this.findOne({ classSectionId });
};

/**
 * Get all sections for teacher
 */
classSectionSchema.statics.getByTeacher = function(teacherId) {
  return this.find({ teacherId, active: true });
};

/**
 * Get all sections for school
 */
classSectionSchema.statics.getBySchool = function(schoolId) {
  return this.find({ schoolId, active: true });
};

/**
 * Get sections by class and school
 */
classSectionSchema.statics.getByClass = function(schoolId, classNum) {
  return this.find({ schoolId, class: classNum, active: true });
};

/**
 * Get statistics for school
 */
classSectionSchema.statics.getSchoolStatistics = async function(schoolId) {
  const stats = await this.aggregate([
    { $match: { schoolId, active: true } },
    {
      $group: {
        _id: null,
        totalSections: { $sum: 1 },
        totalStudents: { $sum: '$stats.totalStudents' },
        totalChallenges: { $sum: '$stats.totalChallenges' },
        averagePerformance: { $avg: '$stats.averagePerformance' }
      }
    }
  ]);
  
  return stats[0] || {
    totalSections: 0,
    totalStudents: 0,
    totalChallenges: 0,
    averagePerformance: 0
  };
};

// ============================================================================
// TRANSFORM
// ============================================================================

classSectionSchema.set('toJSON', {
  transform: function(doc, ret, options) {
    delete ret.__v;
    return ret;
  }
});

// ============================================================================
// MODEL EXPORT
// ============================================================================

const ClassSection = mongoose.model('ClassSection', classSectionSchema);

module.exports = ClassSection;