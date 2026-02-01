const NEP_COMPETENCIES = [
  'critical-thinking',
  'problem-solving',
  'scientific-temper',
  'analytical-reasoning',
  'creativity',
  'communication',
  'collaboration',
  'digital-literacy',
  'social-responsibility',
  'innovation',
  'ethical-awareness',
  'cultural-understanding'
];

function normalizeTo12Competencies(derived = []) {
  const map = {};
  for (const c of derived) {
    map[c.name] = c;
  }

  return NEP_COMPETENCIES.map(name => {
    if (map[name]) {
      return {
        name,
        score: map[name].score,
        status: map[name].status || 'stable'
      };
    }

    // IMPORTANT: schema-safe defaults
    return {
      name,
      score: null,
      status: 'stable' // ✅ NOT `not_assessed` (schema enum!)
    };
  });
}

module.exports = {
  normalizeTo12Competencies,
  NEP_COMPETENCIES
};
