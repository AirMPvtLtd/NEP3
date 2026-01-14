/**
 * MODELS INDEX
 * Central export for all Mongoose models
 * 
 * @module models
 */
/*
const School = require('./School');
const Teacher = require('./Teacher');
const ClassSection = require('./ClassSection');
const Student = require('./Student');
const Parent = require('./Parent');
const Activity = require('./Activity');
const Challenge = require('./Challenge');
const ChallengeLimit = require('./ChallengeLimit');
const NEPReport = require('./NEPReport');
const InstitutionalReport = require('./InstitutionalReport');
const EmailVerification = require('./EmailVerification');
const PasswordReset = require('./PasswordReset');
const MetaParameters = require('./MetaParameters');
const KalmanState = require('./KalmanState');
const AILog = require('./AILog');
const HelpTicket = require('./HelpTicket');

module.exports = {
  // Core Models
  School,
  Teacher,
  ClassSection,
  Student,
  Parent,
  
  // Activity & Logging
  Activity,
  AILog,
  
  // Challenge System
  Challenge,
  ChallengeLimit,
  
  // Reports
  NEPReport,
  InstitutionalReport,
  
  // Authentication & Security
  EmailVerification,
  PasswordReset,
  
  // Algorithms
  MetaParameters,
  KalmanState,
  
  // Support
  HelpTicket
};
*/

/**
 * MODELS INDEX
 * Central export for all Mongoose models
 * 
 * @module models
 */

// Core User Models
const School = require('./School');
const Teacher = require('./Teacher');
const ClassSection = require('./ClassSection');
const Student = require('./Student');
const Parent = require('./Parent');
const CompanyMember = require('./CompanyMember');

// Activity & Logging
const Activity = require('./Activity');
const AILog = require('./AILog');
const ExportLog = require('./ExportLog');

// Challenge System
const Challenge = require('./Challenge');
const ChallengeLimit = require('./ChallengeLimit');
const CreativeChallenge = require('./CreativeChallenge');
const EthicalDilemma = require('./EthicalDilemma');

// Reports
const NEPReport = require('./NEPReport');
const InstitutionalReport = require('./InstitutionalReport');

// Authentication & Security
const EmailVerification = require('./EmailVerification');
const PasswordReset = require('./PasswordReset');
const ResearchAPIKey = require('./ResearchAPIKey');

// Algorithm State Models
const MetaParameters = require('./MetaParameters');
const KalmanState = require('./KalmanState');
const AttentionMetrics = require('./AttentionMetrics');
const HMMState = require('./HMMState');
const BayesianNetwork = require('./BayesianNetwork');

// Cognitive & Thinking Data
const CognitiveProfile = require('./CognitiveProfile');
const KnowledgeGraph = require('./KnowledgeGraph');
const HumanCognitionDataset = require('./HumanCognitionDataset');

// Simulation
const SimulationSession = require('./SimulationSession');

// Innovation Tracking
const InnovationProfile = require('./InnovationProfile');
const InnovationEvent = require('./InnovationEvent');
const LongitudinalData = require('./LongitudinalData');
const PredictionValidation = require('./PredictionValidation');

const Ledger = require('./Ledger');
const CompetencyMaster = require('./CompetencyMaster');

// Support
const HelpTicket = require('./HelpTicket');

module.exports = {
  // Core User Models (6)
  School,
  Teacher,
  ClassSection,
  Student,
  Parent,
  CompanyMember,
  
  // Activity & Logging (3)
  Activity,
  AILog,
  ExportLog,
  
  // Challenge System (4)
  Challenge,
  ChallengeLimit,
  CreativeChallenge,
  EthicalDilemma,
  
  // Reports (2)
  NEPReport,
  InstitutionalReport,
  
  // Authentication & Security (3)
  EmailVerification,
  PasswordReset,
  ResearchAPIKey,
  
  // Algorithm State Models (5)
  MetaParameters,
  KalmanState,
  AttentionMetrics,
  HMMState,
  BayesianNetwork,
  
  // Cognitive & Thinking Data (3)
  CognitiveProfile,
  KnowledgeGraph,
  HumanCognitionDataset,
  
  // Simulation (1)
  SimulationSession,
  
  // Innovation Tracking (4)
  InnovationProfile,
  InnovationEvent,
  LongitudinalData,
  PredictionValidation,
  
  Ledger,
  // Support (1)
  HelpTicket,
  CompetencyMaster

};