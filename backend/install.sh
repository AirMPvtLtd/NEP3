#!/bin/bash

# ============================================================================
# NEP WORKBENCH - DEPENDENCY INSTALLATION SCRIPT
# Installs all required NPM packages for the backend
# ============================================================================

echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║                                                                   ║"
echo "║         NEP WORKBENCH - INSTALLING DEPENDENCIES                  ║"
echo "║                                                                   ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✓ Node.js version: $(node --version)"
echo "✓ npm version: $(npm --version)"
echo ""

# ============================================================================
# CORE DEPENDENCIES
# ============================================================================

echo "📦 Installing Core Dependencies..."
npm install express@^4.18.2
npm install mongoose@^8.0.0
npm install dotenv@^16.3.1

# ============================================================================
# SECURITY PACKAGES
# ============================================================================

echo "🔐 Installing Security Packages..."
npm install helmet@^7.1.0
npm install cors@^2.8.5
npm install bcryptjs@^2.4.3
npm install jsonwebtoken@^9.0.2
npm install express-mongo-sanitize@^2.2.0
npm install xss-clean@^0.1.4
npm install hpp@^0.2.3
npm install express-rate-limit@^7.1.5
npm install express-validator@^7.0.1
npm install joi@^17.11.0
npm install validator@^13.11.0

# ============================================================================
# MIDDLEWARE PACKAGES
# ============================================================================

echo "⚙️  Installing Middleware Packages..."
npm install compression@^1.7.4
npm install morgan@^1.10.0
npm install cookie-parser@^1.4.6
npm install body-parser@^1.20.2
npm install multer@^1.4.5-lts.1

# ============================================================================
# LOGGING PACKAGES
# ============================================================================

echo "📝 Installing Logging Packages..."
npm install winston@^3.11.0
npm install winston-daily-rotate-file@^4.7.1

# ============================================================================
# JOB SCHEDULING
# ============================================================================

echo "⏰ Installing Job Scheduling Packages..."
npm install node-cron@^3.0.3
npm install bull@^4.12.0
npm install ioredis@^5.3.2

# ============================================================================
# EMAIL SERVICE
# ============================================================================

echo "📧 Installing Email Service Packages..."
npm install @sendgrid/mail@^7.7.0
npm install nodemailer@^6.9.7

# ============================================================================
# AI/ML PACKAGES
# ============================================================================

echo "🤖 Installing AI/ML Packages..."
npm install @mistralai/mistralai@^0.1.3
npm install openai@^4.20.1
npm install axios@^1.6.2

# ============================================================================
# FILE PROCESSING
# ============================================================================

echo "📄 Installing File Processing Packages..."
npm install pdfkit@^0.14.0
npm install exceljs@^4.4.0
npm install csv-parser@^3.0.0
npm install json2csv@^6.0.0
npm install sharp@^0.33.1
npm install pdf-parse@^1.1.1

# ============================================================================
# DATA VALIDATION & TRANSFORMATION
# ============================================================================

echo "✅ Installing Validation Packages..."
npm install lodash@^4.17.21
npm install moment@^2.30.1
npm install date-fns@^3.0.6

# ============================================================================
# DOCUMENTATION
# ============================================================================

echo "📚 Installing Documentation Packages..."
npm install swagger-jsdoc@^6.2.8
npm install swagger-ui-express@^5.0.0

# ============================================================================
# TESTING PACKAGES (DEV DEPENDENCIES)
# ============================================================================

echo "🧪 Installing Testing Packages..."
npm install --save-dev jest@^29.7.0
npm install --save-dev supertest@^6.3.3
npm install --save-dev @types/jest@^29.5.11
npm install --save-dev nodemon@^3.0.2
npm install --save-dev eslint@^8.56.0
npm install --save-dev prettier@^3.1.1

# ============================================================================
# UTILITY PACKAGES
# ============================================================================

echo "🛠️  Installing Utility Packages..."
npm install uuid@^9.0.1
npm install nanoid@^5.0.4
npm install crypto-js@^4.2.0
npm install fast-csv@^5.0.1
npm install archiver@^6.0.1
npm install unzipper@^0.11.6

# ============================================================================
# PROCESS MANAGEMENT
# ============================================================================

echo "🔄 Installing Process Management..."
npm install --save-dev pm2@^5.3.0

# ============================================================================
# OPTIONAL: DATABASE TOOLS
# ============================================================================

echo "💾 Installing Database Tools..."
npm install mongodb@^6.3.0
npm install mongoose-paginate-v2@^1.8.0
npm install mongoose-aggregate-paginate-v2@^1.0.7

# ============================================================================
# VERIFICATION
# ============================================================================

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "✅ DEPENDENCY INSTALLATION COMPLETE"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

# Count installed packages
PACKAGE_COUNT=$(node -p "Object.keys(require('./package.json').dependencies || {}).length")
DEV_PACKAGE_COUNT=$(node -p "Object.keys(require('./package.json').devDependencies || {}).length")

echo "📦 Production Dependencies: $PACKAGE_COUNT"
echo "🔧 Development Dependencies: $DEV_PACKAGE_COUNT"
echo "📊 Total Packages: $((PACKAGE_COUNT + DEV_PACKAGE_COUNT))"
echo ""

# Check for vulnerabilities
echo "🔍 Checking for vulnerabilities..."
npm audit --production

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "🎉 ALL DEPENDENCIES INSTALLED SUCCESSFULLY!"
echo "═══════════════════════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "  1. Configure environment variables in .env file"
echo "  2. Set up MongoDB connection"
echo "  3. Run 'npm start' to start the server"
echo "  4. Run 'npm test' to run tests"
echo "  5. Run 'npm run dev' for development with nodemon"
echo ""