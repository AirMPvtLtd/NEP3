// models/index.js
/**
 * MODELS INDEX - UPDATED
 * Central export for all models
 */

// Core Models
exports.School = require('./School');
exports.Student = require('./Student');
exports.Teacher = require('./Teacher');
exports.Parent = require('./Parent');
exports.Challenge = require('./Challenge');
exports.Activity = require('./Activity');
exports.AILog = require('./AILog');
exports.EmailVerification = require('./EmailVerification');
exports.PasswordReset = require('./PasswordReset');
exports.NEPReport = require('./NEPReport');
exports.Ledger = require('./Ledger');

// Feature Models
exports.ClassSection = require('./ClassSection');
//exports.CompetencyMaster = require('./CompetencyMaster');
exports.InstitutionalReport = require('./InstitutionalReport');
exports.ChallengeLimit = require('./ChallengeLimit');
exports.HelpTicket = require('./HelpTicket');
//exports.Notification = require('./Notification'); // ✅ ADD THIS LINE

// AI/ML Models
exports.KalmanState = require('./KalmanState');
exports.MetaParameters = require('./MetaParameters');
exports.PredictionValidation = require('./PredictionValidation'); // ✅ ADD THIS LINE
exports.AttentionMetrics = require('./AttentionMetrics');
exports.BayesianNetwork = require('./BayesianNetwork');
exports.CognitiveProfile = require('./CognitiveProfile');
exports.HMMState = require('./HMMState');
exports.KnowledgeGraph = require('./KnowledgeGraph');
exports.LongitudinalData = require('./LongitudinalData');
exports.HumanCognitionDataset = require('./HumanCognitionDataset');
exports.SPIRecord = require('./SPIRecord');   // ✅ THIS WAS MISSING

// Session & Tracking
exports.SimulationSession = require('./SimulationSession'); // ✅ ADD THIS LINE
exports.ExportLog = require('./ExportLog'); // ✅ ADD THIS LINE

// Creative Models
exports.CreativeChallenge = require('./CreativeChallenge');
exports.EthicalDilemma = require('./EthicalDilemma');
exports.InnovationProfile = require('./InnovationProfile');
exports.InnovationEvent = require('./InnovationEvent');

// Enterprise Models
exports.CompanyMember = require('./CompanyMember');
exports.ResearchAPIKey = require('./ResearchAPIKey');