// models/HelpTicket.js
/**
 * HELP TICKET MODEL
 * Student help requests
 * 
 * @module models/HelpTicket
 */

const mongoose = require('mongoose');
const { nanoid } = require('nanoid');

const helpTicketSchema = new mongoose.Schema({
  ticketId: {
    type: String,
    required: true,
    unique: true,
    default: () => `TICKET-${nanoid(8).toUpperCase()}`
  },
  
  studentId: {
    type: String,
    required: true,
    ref: 'Student',
    index: true
  },
  
  teacherId: {
    type: String,
    ref: 'Teacher',
    index: true
  },
  
  schoolId: {
    type: String,
    required: true,
    ref: 'School',
    index: true
  },
  
  challengeId: {
    type: String,
    ref: 'Challenge'
  },
  
  subject: {
    type: String,
    required: true,
    trim: true
  },
  
  description: {
    type: String,
    required: true
  },
  
  category: {
    type: String,
    enum: ['technical', 'content', 'general', 'other'],
    default: 'general'
  },
  
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
    index: true
  },
  
  status: {
    type: String,
    enum: ['open', 'in-progress', 'resolved', 'closed'],
    default: 'open',
    index: true
  },
  
  response: {
    type: String
  },
  
  respondedBy: {
    type: String,
    ref: 'Teacher'
  },
  
  respondedAt: {
    type: Date
  },
  
  resolvedAt: {
    type: Date
  },
  
  closedAt: {
    type: Date
  }
}, {
  timestamps: true
});

helpTicketSchema.index({ ticketId: 1 });
helpTicketSchema.index({ studentId: 1, createdAt: -1 });
helpTicketSchema.index({ status: 1, priority: -1 });

helpTicketSchema.statics.createTicket = async function(data) {
  return await this.create(data);
};

helpTicketSchema.methods.respond = async function(teacherId, response) {
  this.response = response;
  this.respondedBy = teacherId;
  this.respondedAt = new Date();
  this.status = 'in-progress';
  return await this.save();
};

helpTicketSchema.methods.resolve = async function() {
  this.status = 'resolved';
  this.resolvedAt = new Date();
  return await this.save();
};

helpTicketSchema.methods.close = async function() {
  this.status = 'closed';
  this.closedAt = new Date();
  return await this.save();
};

const HelpTicket = mongoose.model('HelpTicket', helpTicketSchema);

module.exports = HelpTicket;