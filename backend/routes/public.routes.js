/**
 * PUBLIC CLASS TOOLS ROUTES
 * No auth required — IP-based rate limit: 10 uses per day.
 * These mirror the teacher studio endpoints for guest (home-page) access.
 */

const express = require('express');
const router  = express.Router();
const { callMistralAPI } = require('../services/mistral.service');
const { freeClassTools } = require('../middleware/rateLimiter');
const logger = require('../utils/logger');

// ── Notes Builder ────────────────────────────────────────────────────────────
router.post('/class-tools/notes', freeClassTools, async (req, res) => {
  try {
    const { subject, grade, topic, format } = req.body;
    if (!subject || !grade || !topic) {
      return res.status(400).json({ success: false, message: 'subject, grade, and topic are required' });
    }

    const formatInstructions = {
      detailed:  'Write comprehensive, detailed notes with full explanations for each section. Include rich content, multiple examples, and thorough coverage of each concept.',
      summary:   'Write concise bullet-point summary notes. Each section should have short, crisp points (1-2 sentences each). Keep content minimal and easy to revise quickly.',
      vocational:'Focus on real-world industry and vocational applications of the topic. Emphasize practical skills, workplace relevance, career connections, and hands-on examples aligned to NEP 2020 vocational education.',
      mindmap:   'Organise content as a mind-map-friendly outline. Each section heading is a main branch; content is a comma-separated list of short sub-nodes or keywords (not full sentences).'
    };
    const formatGuide = formatInstructions[format] || formatInstructions.detailed;

    const messages = [
      { role: 'system', content: 'You are an expert Indian school teacher content generator following NEP 2020. Return ONLY valid JSON — no markdown, no prose, no code fences.' },
      { role: 'user',   content: `Generate lesson notes for a Class ${grade} ${subject} lesson on "${topic}".\n\nFormat style: "${format || 'detailed'}" — ${formatGuide}\n\nReturn JSON exactly matching this schema: { "title": string, "objectives": [string], "sections": [{ "heading": string, "content": string }], "formulas": [string], "applications": [string], "misconceptions": [string] }` }
    ];

    let mistralRes;
    try {
      mistralRes = await callMistralAPI({ messages, maxTokens: 1500, operation: 'public_class_tools_notes' });
    } catch (err) {
      return res.status(503).json({ success: false, message: 'AI service unavailable' });
    }

    let notes;
    try {
      const raw = mistralRes.content.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/, '');
      notes = JSON.parse(raw);
    } catch (e) {
      return res.status(502).json({ success: false, message: 'AI response malformed' });
    }

    return res.json({ success: true, notes });
  } catch (error) {
    logger.error('public generateSmartNotes error:', error);
    return res.status(500).json({ success: false, message: 'Error generating notes' });
  }
});

// ── Question Builder ─────────────────────────────────────────────────────────
router.post('/class-tools/questions', freeClassTools, async (req, res) => {
  try {
    const { subject, grade, questionType, topic, difficulty, count } = req.body;
    if (!subject || !grade || !questionType) {
      return res.status(400).json({ success: false, message: 'subject, grade, and questionType are required' });
    }

    const numQuestions = Math.min(parseInt(count) || 1, 5);
    const topicStr      = topic      ? ` on "${topic}"`        : '';
    const difficultyStr = difficulty ? ` at ${difficulty} difficulty` : '';

    const messages = [
      { role: 'system', content: 'You are an expert Indian school examiner following NEP 2020 and Bloom\'s taxonomy. Return ONLY valid JSON — no markdown, no prose, no code fences.' },
      { role: 'user',   content: `Generate ${numQuestions} ${questionType} question(s) for Class ${grade} ${subject}${topicStr}${difficultyStr}. Return JSON matching: { "questions": [{ "questionText": string, "options": [string], "correctAnswer": string, "explanation": string, "marks": number, "bloomsLevel": string }] }. For non-MCQ types, options should be an empty array.` }
    ];

    let mistralRes;
    try {
      mistralRes = await callMistralAPI({ messages, maxTokens: 800, operation: 'public_class_tools_questions' });
    } catch (err) {
      return res.status(503).json({ success: false, message: 'AI service unavailable' });
    }

    let parsed;
    try {
      const raw = mistralRes.content.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/, '');
      parsed = JSON.parse(raw);
    } catch (e) {
      return res.status(502).json({ success: false, message: 'AI response malformed' });
    }

    return res.json({ success: true, questions: parsed.questions || [] });
  } catch (error) {
    logger.error('public generateQuestion error:', error);
    return res.status(500).json({ success: false, message: 'Error generating questions' });
  }
});

// ── Simulator Builder ────────────────────────────────────────────────────────
router.post('/class-tools/simulator', freeClassTools, async (req, res) => {
  try {
    const { topic, grade, subject, simulationType, interactionType, visualStyle, variables } = req.body;
    if (!topic || !grade || !subject) {
      return res.status(400).json({ success: false, message: 'topic, grade, and subject are required' });
    }

    const typeInstructions = {
      interactive: `Build an INTERACTIVE DIAGRAM simulator:\n- Render the core concept visually using SVG or Canvas\n- Labelled parts that highlight or animate on hover/click\n- Sliders or number inputs to change key parameters and see the diagram update live\n- Display calculated values updating in real time`,
      virtuallab:  `Build a VIRTUAL LAB simulator:\n- Simulate a real laboratory experiment for the topic\n- Include a "lab bench" layout with apparatus drawn via SVG/Canvas\n- Step-by-step experiment flow: setup → run → observe → record\n- Show measurable outputs that change as user adjusts variables\n- Include a Results section that populates after the experiment runs`,
      stepprocess: `Build a STEP-BY-STEP PROCESS simulator:\n- Break the topic into 4–7 clearly numbered steps\n- Show one step at a time with a large visual and explanation text\n- "Previous" and "Next" navigation buttons\n- Progress bar at the top showing current step\n- Each step must include an interactive element before proceeding`,
      realscenario:`Build a REAL-WORLD SCENARIO simulator:\n- Present a realistic workplace or daily-life scenario applying the topic\n- Give the student a role and a problem to solve\n- Provide input controls to make decisions\n- Show consequence of each decision visually and numerically\n- End with a score or evaluation summary`
    };
    const interactionInstructions = {
      dragdrop:    'Use drag-and-drop interactions as the primary control mechanism.',
      clickreveal: 'Use click-to-reveal interactions — clicking elements uncovers labels, values, or next steps.',
      sliders:     'Use HTML range sliders as the primary controls. Every slider change must instantly update visuals and output values.',
      stepnav:     'Use Previous/Next buttons for step navigation as the primary interaction.'
    };
    const visualInstructions = {
      minimal:      'Keep visuals minimal and clean — simple shapes, monochrome lines, maximum whitespace.',
      detailed:     'Use detailed, richly labelled visuals with colour-coded components, legends, and annotations.',
      animated:     'Add CSS or JS animations — moving particles, flowing arrows, pulsing elements.',
      diagrammatic: 'Use clean diagrammatic style: technical drawing conventions, precise labels, dimension lines.'
    };

    const typeGuide        = typeInstructions[simulationType]  || typeInstructions.interactive;
    const interactionGuide = interactionInstructions[interactionType] || '';
    const visualGuide      = visualInstructions[visualStyle]   || '';
    const variablesHint    = variables ? `The key variables/parameters to include are: ${variables}.` : '';

    const messages = [
      { role: 'system', content: 'You are an expert educational simulation developer. Output ONLY raw HTML — no markdown, no code fences, no explanation. The HTML must be a complete self-contained page.' },
      { role: 'user',   content: `Create a complete interactive HTML simulator for Class ${grade} ${subject} topic: "${topic}".\n\nSIMULATION TYPE — follow this strictly:\n${typeGuide}\n\nINTERACTION STYLE:\n${interactionGuide}\n\nVISUAL STYLE:\n${visualGuide}\n\n${variablesHint}\n\nUNIVERSAL REQUIREMENTS:\n- Full HTML page with <html>, <head>, <body> tags\n- Dark background (#1e1e1e), text color #ffffff\n- Inline <style> and <script> only — no external CDN, no libraries\n- Vanilla JS only\n- Real scientific/mathematical behaviour aligned to NEP 2020\n- Blue/cyan accent colours (#007acc / #00d4ff)\n- Responsive layout that fills the viewport height\n- Output ONLY the raw HTML` }
    ];

    let mistralRes;
    try {
      mistralRes = await callMistralAPI({ messages, maxTokens: 3000, operation: 'public_class_tools_simulator' });
    } catch (err) {
      return res.status(503).json({ success: false, message: 'AI service unavailable' });
    }

    let htmlContent = mistralRes.content.trim();
    htmlContent = htmlContent.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/, '').trim();

    return res.json({ success: true, htmlContent });
  } catch (error) {
    logger.error('public generateSimulator error:', error);
    return res.status(500).json({ success: false, message: 'Error generating simulator' });
  }
});

module.exports = router;
