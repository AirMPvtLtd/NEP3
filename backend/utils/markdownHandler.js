// utils/markdownHandler.js
/**
 * MARKDOWN HANDLER - COMPLETE PRODUCTION VERSION
 * Markdown parsing, rendering, and conversion utilities
 * 
 * @module utils/markdownHandler
 */

const marked = require('marked');
const DOMPurify = require('isomorphic-dompurify');

// ============================================================================
// MARKDOWN CONFIGURATION
// ============================================================================

const DEFAULT_OPTIONS = {
  // Marked options
  gfm: true,              // GitHub Flavored Markdown
  breaks: true,           // Convert \n to <br>
  pedantic: false,
  smartLists: true,
  smartypants: false,
  
  // Sanitization
  sanitize: true,
  allowedTags: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'br', 'hr',
    'strong', 'em', 'u', 's', 'del', 'ins',
    'ul', 'ol', 'li',
    'blockquote', 'code', 'pre',
    'a', 'img',
    'table', 'thead', 'tbody', 'tr', 'th', 'td'
  ],
  allowedAttributes: {
    'a': ['href', 'title', 'target'],
    'img': ['src', 'alt', 'title', 'width', 'height'],
    'code': ['class'],
    'pre': ['class']
  }
};

// ============================================================================
// MARKDOWN TO HTML
// ============================================================================

/**
 * Convert markdown to HTML
 * @param {String} markdown - Markdown text
 * @param {Object} options - Conversion options
 * @returns {String} HTML string
 */
const toHTML = (markdown, options = {}) => {
  if (!markdown) return '';
  
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Configure marked
  marked.setOptions({
    gfm: opts.gfm,
    breaks: opts.breaks,
    pedantic: opts.pedantic,
    smartLists: opts.smartLists,
    smartypants: opts.smartypants
  });
  
  // Convert to HTML
  let html = marked.parse(markdown);
  
  // Sanitize if enabled
  if (opts.sanitize) {
    html = sanitizeHTML(html, opts);
  }
  
  return html;
};

/**
 * Convert markdown to HTML with syntax highlighting
 * @param {String} markdown - Markdown text
 * @param {Function} highlighter - Syntax highlighter function
 * @returns {String} HTML string
 */
const toHTMLWithHighlight = (markdown, highlighter) => {
  const renderer = new marked.Renderer();
  
  renderer.code = (code, language) => {
    const highlighted = highlighter ? highlighter(code, language) : code;
    return `<pre><code class="language-${language}">${highlighted}</code></pre>`;
  };
  
  marked.setOptions({ renderer });
  
  return marked.parse(markdown);
};

/**
 * Sanitize HTML
 * @param {String} html - HTML string
 * @param {Object} options - Sanitization options
 * @returns {String} Sanitized HTML
 */
const sanitizeHTML = (html, options = {}) => {
  const config = {
    ALLOWED_TAGS: options.allowedTags || DEFAULT_OPTIONS.allowedTags,
    ALLOWED_ATTR: options.allowedAttributes || DEFAULT_OPTIONS.allowedAttributes
  };
  
  return DOMPurify.sanitize(html, config);
};

// ============================================================================
// HTML TO MARKDOWN
// ============================================================================

/**
 * Convert HTML to markdown
 * @param {String} html - HTML string
 * @returns {String} Markdown text
 */
const toMarkdown = (html) => {
  if (!html) return '';
  
  let markdown = html;
  
  // Headers
  markdown = markdown.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n');
  markdown = markdown.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n');
  markdown = markdown.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n');
  markdown = markdown.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n');
  markdown = markdown.replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n');
  markdown = markdown.replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n');
  
  // Emphasis
  markdown = markdown.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
  markdown = markdown.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
  markdown = markdown.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
  markdown = markdown.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');
  markdown = markdown.replace(/<u[^>]*>(.*?)<\/u>/gi, '_$1_');
  markdown = markdown.replace(/<del[^>]*>(.*?)<\/del>/gi, '~~$1~~');
  
  // Links
  markdown = markdown.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');
  
  // Images
  markdown = markdown.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi, '![$2]($1)');
  
  // Lists
  markdown = markdown.replace(/<ul[^>]*>(.*?)<\/ul>/gis, (match, content) => {
    return content.replace(/<li[^>]*>(.*?)<\/li>/gi, '* $1\n');
  });
  markdown = markdown.replace(/<ol[^>]*>(.*?)<\/ol>/gis, (match, content) => {
    let counter = 1;
    return content.replace(/<li[^>]*>(.*?)<\/li>/gi, () => `${counter++}. $1\n`);
  });
  
  // Code
  markdown = markdown.replace(/<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gis, '```\n$1\n```\n');
  markdown = markdown.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');
  
  // Blockquote
  markdown = markdown.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gis, (match, content) => {
    return content.split('\n').map(line => `> ${line}`).join('\n') + '\n\n';
  });
  
  // Paragraphs
  markdown = markdown.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n');
  
  // Line breaks
  markdown = markdown.replace(/<br\s*\/?>/gi, '\n');
  markdown = markdown.replace(/<hr\s*\/?>/gi, '\n---\n\n');
  
  // Clean up HTML tags
  markdown = markdown.replace(/<[^>]*>/g, '');
  
  // Clean up whitespace
  markdown = markdown.replace(/\n{3,}/g, '\n\n');
  markdown = markdown.trim();
  
  return markdown;
};

// ============================================================================
// MARKDOWN PARSING
// ============================================================================

/**
 * Extract headings from markdown
 * @param {String} markdown - Markdown text
 * @returns {Array} Array of headings
 */
const extractHeadings = (markdown) => {
  const headings = [];
  const lines = markdown.split('\n');
  
  lines.forEach((line, index) => {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      headings.push({
        level: match[1].length,
        text: match[2].trim(),
        line: index + 1
      });
    }
  });
  
  return headings;
};

/**
 * Generate table of contents
 * @param {String} markdown - Markdown text
 * @returns {String} TOC markdown
 */
const generateTOC = (markdown) => {
  const headings = extractHeadings(markdown);
  
  if (headings.length === 0) {
    return '';
  }
  
  let toc = '## Table of Contents\n\n';
  
  headings.forEach(heading => {
    const indent = '  '.repeat(heading.level - 1);
    const slug = heading.text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
    toc += `${indent}* [${heading.text}](#${slug})\n`;
  });
  
  return toc + '\n';
};

/**
 * Extract links from markdown
 * @param {String} markdown - Markdown text
 * @returns {Array} Array of links
 */
const extractLinks = (markdown) => {
  const links = [];
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  
  let match;
  while ((match = linkRegex.exec(markdown)) !== null) {
    links.push({
      text: match[1],
      url: match[2]
    });
  }
  
  return links;
};

/**
 * Extract images from markdown
 * @param {String} markdown - Markdown text
 * @returns {Array} Array of images
 */
const extractImages = (markdown) => {
  const images = [];
  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  
  let match;
  while ((match = imageRegex.exec(markdown)) !== null) {
    images.push({
      alt: match[1],
      url: match[2]
    });
  }
  
  return images;
};

/**
 * Extract code blocks from markdown
 * @param {String} markdown - Markdown text
 * @returns {Array} Array of code blocks
 */
const extractCodeBlocks = (markdown) => {
  const codeBlocks = [];
  const codeRegex = /```(\w*)\n([\s\S]*?)```/g;
  
  let match;
  while ((match = codeRegex.exec(markdown)) !== null) {
    codeBlocks.push({
      language: match[1] || 'text',
      code: match[2].trim()
    });
  }
  
  return codeBlocks;
};

// ============================================================================
// MARKDOWN MANIPULATION
// ============================================================================

/**
 * Add heading anchors
 * @param {String} markdown - Markdown text
 * @returns {String} Modified markdown
 */
const addHeadingAnchors = (markdown) => {
  return markdown.replace(/^(#{1,6})\s+(.+)$/gm, (match, hashes, text) => {
    const slug = text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
    return `${hashes} ${text} {#${slug}}`;
  });
};

/**
 * Replace placeholders in markdown
 * @param {String} markdown - Markdown text
 * @param {Object} variables - Variables object
 * @returns {String} Processed markdown
 */
const replacePlaceholders = (markdown, variables) => {
  let result = markdown;
  
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
    result = result.replace(regex, value);
  });
  
  return result;
};

/**
 * Add line numbers to code blocks
 * @param {String} markdown - Markdown text
 * @returns {String} Modified markdown
 */
const addLineNumbers = (markdown) => {
  return markdown.replace(/```(\w*)\n([\s\S]*?)```/g, (match, language, code) => {
    const lines = code.split('\n');
    const numberedLines = lines.map((line, i) => `${i + 1} | ${line}`).join('\n');
    return `\`\`\`${language}\n${numberedLines}\n\`\`\``;
  });
};

/**
 * Strip markdown formatting
 * @param {String} markdown - Markdown text
 * @returns {String} Plain text
 */
const stripFormatting = (markdown) => {
  let text = markdown;
  
  // Remove code blocks
  text = text.replace(/```[\s\S]*?```/g, '');
  
  // Remove inline code
  text = text.replace(/`[^`]+`/g, '');
  
  // Remove images
  text = text.replace(/!\[[^\]]*\]\([^)]+\)/g, '');
  
  // Remove links but keep text
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  
  // Remove emphasis
  text = text.replace(/[*_~]{1,2}([^*_~]+)[*_~]{1,2}/g, '$1');
  
  // Remove headings
  text = text.replace(/^#{1,6}\s+/gm, '');
  
  // Remove blockquotes
  text = text.replace(/^>\s+/gm, '');
  
  // Remove list markers
  text = text.replace(/^[\*\-\+]\s+/gm, '');
  text = text.replace(/^\d+\.\s+/gm, '');
  
  // Clean up whitespace
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.trim();
  
  return text;
};

/**
 * Get word count from markdown
 * @param {String} markdown - Markdown text
 * @returns {Number} Word count
 */
const getWordCount = (markdown) => {
  const text = stripFormatting(markdown);
  const words = text.split(/\s+/).filter(word => word.length > 0);
  return words.length;
};

/**
 * Get reading time estimate
 * @param {String} markdown - Markdown text
 * @param {Number} wordsPerMinute - Reading speed
 * @returns {Number} Minutes
 */
const getReadingTime = (markdown, wordsPerMinute = 200) => {
  const wordCount = getWordCount(markdown);
  return Math.ceil(wordCount / wordsPerMinute);
};

// ============================================================================
// MARKDOWN VALIDATION
// ============================================================================

/**
 * Validate markdown syntax
 * @param {String} markdown - Markdown text
 * @returns {Object} Validation result
 */
const validate = (markdown) => {
  const errors = [];
  const warnings = [];
  
  // Check for unclosed code blocks
  const codeBlockCount = (markdown.match(/```/g) || []).length;
  if (codeBlockCount % 2 !== 0) {
    errors.push('Unclosed code block detected');
  }
  
  // Check for invalid heading levels
  const lines = markdown.split('\n');
  let lastHeadingLevel = 0;
  
  lines.forEach((line, index) => {
    const match = line.match(/^(#{1,6})\s+/);
    if (match) {
      const level = match[1].length;
      
      if (level > lastHeadingLevel + 1 && lastHeadingLevel !== 0) {
        warnings.push(`Line ${index + 1}: Skipped heading level (from h${lastHeadingLevel} to h${level})`);
      }
      
      lastHeadingLevel = level;
    }
  });
  
  // Check for broken links
  const links = extractLinks(markdown);
  links.forEach(link => {
    if (!link.url || link.url.trim() === '') {
      errors.push(`Empty URL in link: "${link.text}"`);
    }
  });
  
  // Check for broken images
  const images = extractImages(markdown);
  images.forEach(image => {
    if (!image.url || image.url.trim() === '') {
      errors.push(`Empty URL in image: "${image.alt}"`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
};

// ============================================================================
// MARKDOWN TEMPLATES
// ============================================================================

/**
 * Generate NEP report markdown template
 * @param {Object} data - Report data
 * @returns {String} Markdown template
 */
const generateNEPReportTemplate = (data) => {
  return `
# NEP Report - ${data.studentName}

**Period:** ${data.period.start} to ${data.period.end}

## Summary

${data.summary}

## Strengths

${data.strengths.map(s => `* ${s}`).join('\n')}

## Areas for Improvement

${data.areasForImprovement.map(a => `* ${a}`).join('\n')}

## Competency Analysis

${Object.entries(data.competencies).map(([comp, score]) => `
### ${comp}

**Score:** ${score}/100

**Level:** ${getCompetencyLevel(score)}
`).join('\n')}

## Recommendations

${data.recommendations.map(r => `* ${r}`).join('\n')}

---

*Generated on ${new Date().toLocaleDateString()}*
  `.trim();
};

/**
 * Get competency level label
 * @param {Number} score - Competency score
 * @returns {String} Level label
 */
const getCompetencyLevel = (score) => {
  if (score >= 85) return 'Advanced';
  if (score >= 70) return 'Proficient';
  if (score >= 55) return 'Developing';
  return 'Beginning';
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Conversion
  toHTML,
  toHTMLWithHighlight,
  toMarkdown,
  sanitizeHTML,
  
  // Parsing
  extractHeadings,
  generateTOC,
  extractLinks,
  extractImages,
  extractCodeBlocks,
  
  // Manipulation
  addHeadingAnchors,
  replacePlaceholders,
  addLineNumbers,
  stripFormatting,
  getWordCount,
  getReadingTime,
  
  // Validation
  validate,
  
  // Templates
  generateNEPReportTemplate,
  
  // Configuration
  DEFAULT_OPTIONS
};