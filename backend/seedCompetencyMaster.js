const mongoose = require('mongoose');
const { CompetencyMaster } = require('./models');

mongoose.connect(process.env.MONGO_URI);

async function seed() {
  await CompetencyMaster.deleteMany({});

  await CompetencyMaster.insertMany([
    {
      code: 'critical-thinking',
      name: 'Critical Thinking',
      domain: 'cognitive',
      description: 'Ability to analyze, evaluate, and synthesize information',
      levels: ['emerging', 'developing', 'proficient', 'advanced'],
      active: true
    },
    {
      code: 'problem-solving',
      name: 'Problem Solving',
      domain: 'cognitive',
      description: 'Applying logic and reasoning to solve problems',
      levels: ['emerging', 'developing', 'proficient', 'advanced'],
      active: true
    },
    {
      code: 'scientific-temper',
      name: 'Scientific Temper',
      domain: 'scientific',
      description: 'Curiosity, experimentation, and evidence-based thinking',
      levels: ['emerging', 'developing', 'proficient', 'advanced'],
      active: true
    },
    {
      code: 'analytical-reasoning',
      name: 'Analytical Reasoning',
      domain: 'cognitive',
      description: 'Breaking down complex ideas into components',
      levels: ['emerging', 'developing', 'proficient', 'advanced'],
      active: true
    },
    {
      code: 'creativity',
      name: 'Creativity',
      domain: 'affective',
      description: 'Original thinking and idea generation',
      levels: ['emerging', 'developing', 'proficient', 'advanced'],
      active: true
    }
  ]);

  console.log('✅ Competency Master seeded');
  process.exit();
}

seed();
