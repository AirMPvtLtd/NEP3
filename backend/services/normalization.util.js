exports.normalizeScore = (rawScore) => {
  if (typeof rawScore !== 'number') return 0;
  return Math.min(1, Math.max(0, rawScore / 100));
};
