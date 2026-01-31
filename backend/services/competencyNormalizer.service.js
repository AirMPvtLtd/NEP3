// services/competencyNormalizer.service.js
const { NEP_12_COMPETENCIES } = require('../config/nepCompetencies');

const normalizeTo12Competencies = (derivedCompetencies = []) => {
  const map = {};

  // Step 1: Index derived competencies
  for (const c of derivedCompetencies) {
    map[c.name] = {
      name: c.name,
      score: c.score,
      status: c.status || 'stable',
      assessed: true
    };
  }

  // Step 2: Normalize to 12
  return NEP_12_COMPETENCIES.map(name => {
    if (map[name]) {
      return map[name];
    }

    // Missing competency → NEP compliant placeholder
    return {
      name,
      score: null,
      status: 'not_assessed',
      assessed: false
    };
  });
};

module.exports = {
  normalizeTo12Competencies
};
