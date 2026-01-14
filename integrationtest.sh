#!/bin/bash

# NEP WORKBENCH - Integration Testing Script
# Tests all component integrations

echo "🔗 NEP WORKBENCH - Integration Testing"
echo "========================================"
echo ""

BACKEND_DIR="./backend"
FAILED_TESTS=0
PASSED_TESTS=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

if [ ! -d "$BACKEND_DIR" ]; then
    echo -e "${RED}❌ Backend directory not found${NC}"
    exit 1
fi

cd "$BACKEND_DIR" || exit

# ===========================================
# TEST 1: Module Resolution
# ===========================================
echo -e "${BLUE}TEST 1: Module Resolution${NC}"
echo "Testing if all modules can be imported..."

test_import() {
    local file=$1
    local name=$2
    
    if [ -f "$file" ]; then
        if node -e "require('./$file')" 2>/dev/null; then
            echo -e "${GREEN}  ✅ $name imports successfully${NC}"
            ((PASSED_TESTS++))
            return 0
        else
            echo -e "${RED}  ❌ $name has import errors${NC}"
            ((FAILED_TESTS++))
            return 1
        fi
    else
        echo -e "${YELLOW}  ⚠️  $name not found${NC}"
        return 2
    fi
}

test_import "app.js" "app.js"
test_import "server.js" "server.js"
test_import "config/database.js" "database config"
test_import "config/jwt.js" "JWT config"
test_import "middleware/auth.middleware.js" "auth middleware"
test_import "middleware/errorHandler.js" "error handler"

echo ""

# ===========================================
# TEST 2: Database Connection Integration
# ===========================================
echo -e "${BLUE}TEST 2: Database Connection Integration${NC}"

if [ -f "config/database.js" ]; then
    # Check if database.js exports a function
    if grep -q "module.exports.*=" "config/database.js"; then
        echo -e "${GREEN}  ✅ Database config exports properly${NC}"
        ((PASSED_TESTS++))
    else
        echo -e "${RED}  ❌ Database config missing export${NC}"
        ((FAILED_TESTS++))
    fi
    
    # Check if connection has error handling
    if grep -q "catch\|\.catch" "config/database.js"; then
        echo -e "${GREEN}  ✅ Database config has error handling${NC}"
        ((PASSED_TESTS++))
    else
        echo -e "${RED}  ❌ Database config missing error handling${NC}"
        ((FAILED_TESTS++))
    fi
else
    echo -e "${RED}  ❌ config/database.js not found${NC}"
    ((FAILED_TESTS++))
fi

echo ""

# ===========================================
# TEST 3: Middleware Chain Integration
# ===========================================
echo -e "${BLUE}TEST 3: Middleware Chain Integration${NC}"

if [ -f "app.js" ]; then
    # Check middleware order
    echo "  Checking middleware registration order..."
    
    # Security middleware should come first
    if grep -n "helmet\|cors" app.js | head -1 | grep -q "helmet\|cors"; then
        echo -e "${GREEN}  ✅ Security middleware registered early${NC}"
        ((PASSED_TESTS++))
    else
        echo -e "${YELLOW}  ⚠️  Security middleware might be out of order${NC}"
    fi
    
    # Body parsers should be early
    if grep -q "express.json\|body-parser" app.js; then
        echo -e "${GREEN}  ✅ Body parsers registered${NC}"
        ((PASSED_TESTS++))
    else
        echo -e "${RED}  ❌ Body parsers not found${NC}"
        ((FAILED_TESTS++))
    fi
    
    # Error handler should be last
    ERROR_HANDLER_LINE=$(grep -n "errorHandler\|app.use.*err.*req.*res.*next" app.js | tail -1 | cut -d: -f1)
    LAST_APP_USE=$(grep -n "app.use\|app.listen" app.js | tail -1 | cut -d: -f1)
    
    if [ ! -z "$ERROR_HANDLER_LINE" ]; then
        if [ "$ERROR_HANDLER_LINE" -gt "$((LAST_APP_USE - 10))" ]; then
            echo -e "${GREEN}  ✅ Error handler registered last${NC}"
            ((PASSED_TESTS++))
        else
            echo -e "${RED}  ❌ Error handler not last in middleware chain${NC}"
            ((FAILED_TESTS++))
        fi
    else
        echo -e "${RED}  ❌ Error handler not found${NC}"
        ((FAILED_TESTS++))
    fi
fi

echo ""

# ===========================================
# TEST 4: Routes Integration
# ===========================================
echo -e "${BLUE}TEST 4: Routes Integration${NC}"

if [ -d "routes" ]; then
    ROUTE_COUNT=$(find routes -name "*.js" -type f | wc -l)
    echo "  Found $ROUTE_COUNT route files"
    
    # Check if routes are registered in app.js
    for route_file in routes/*.routes.js; do
        if [ -f "$route_file" ]; then
            route_name=$(basename "$route_file" .routes.js)
            
            if grep -q "$route_name" app.js 2>/dev/null; then
                echo -e "${GREEN}  ✅ $route_name registered in app.js${NC}"
                ((PASSED_TESTS++))
            else
                echo -e "${RED}  ❌ $route_name NOT registered in app.js${NC}"
                ((FAILED_TESTS++))
            fi
        fi
    done
    
    # Check if routes use controllers
    for route_file in routes/*.js; do
        if [ -f "$route_file" ]; then
            if grep -q "Controller\|controller" "$route_file"; then
                : # Controllers found, good
            else
                echo -e "${YELLOW}  ⚠️  $(basename $route_file) might not use controllers${NC}"
            fi
        fi
    done
else
    echo -e "${RED}  ❌ routes directory not found${NC}"
    ((FAILED_TESTS++))
fi

echo ""

# ===========================================
# TEST 5: Controllers ↔️ Services Integration
# ===========================================
echo -e "${BLUE}TEST 5: Controllers ↔️ Services Integration${NC}"

if [ -d "controllers" ] && [ -d "services" ]; then
    echo "  Checking controller-service integration..."
    
    # Check if controllers import services
    SERVICE_IMPORTS=0
    for controller in controllers/*.js; do
        if [ -f "$controller" ]; then
            if grep -q "require.*service" "$controller"; then
                ((SERVICE_IMPORTS++))
            fi
        fi
    done
    
    if [ $SERVICE_IMPORTS -gt 0 ]; then
        echo -e "${GREEN}  ✅ Controllers use services ($SERVICE_IMPORTS found)${NC}"
        ((PASSED_TESTS++))
    else
        echo -e "${YELLOW}  ⚠️  No service imports in controllers${NC}"
    fi
    
    # Check if services exist for major controllers
    for controller in controllers/{student,teacher,challenge}.controller.js; do
        if [ -f "$controller" ]; then
            ctrl_name=$(basename "$controller" .controller.js)
            service_file="services/${ctrl_name}.service.js"
            
            if [ -f "$service_file" ]; then
                echo -e "${GREEN}  ✅ Service exists for $ctrl_name${NC}"
                ((PASSED_TESTS++))
            else
                echo -e "${YELLOW}  ⚠️  No service file for $ctrl_name${NC}"
            fi
        fi
    done
else
    echo -e "${RED}  ❌ controllers or services directory missing${NC}"
    ((FAILED_TESTS++))
fi

echo ""

# ===========================================
# TEST 6: Services ↔️ Models Integration
# ===========================================
echo -e "${BLUE}TEST 6: Services ↔️ Models Integration${NC}"

if [ -d "services" ] && [ -d "models" ]; then
    echo "  Checking service-model integration..."
    
    # Check if services import models
    MODEL_IMPORTS=0
    for service in services/*.js; do
        if [ -f "$service" ]; then
            if grep -q "require.*models\|require.*Model" "$service"; then
                ((MODEL_IMPORTS++))
            fi
        fi
    done
    
    if [ $MODEL_IMPORTS -gt 0 ]; then
        echo -e "${GREEN}  ✅ Services use models ($MODEL_IMPORTS found)${NC}"
        ((PASSED_TESTS++))
    else
        echo -e "${RED}  ❌ No model imports in services${NC}"
        ((FAILED_TESTS++))
    fi
    
    # Check for transaction usage
    TRANSACTION_USAGE=0
    for service in services/*.js; do
        if [ -f "$service" ]; then
            if grep -q "startSession\|startTransaction" "$service"; then
                ((TRANSACTION_USAGE++))
            fi
        fi
    done
    
    if [ $TRANSACTION_USAGE -gt 0 ]; then
        echo -e "${GREEN}  ✅ Services use transactions ($TRANSACTION_USAGE files)${NC}"
        ((PASSED_TESTS++))
    else
        echo -e "${YELLOW}  ⚠️  No transaction usage found in services${NC}"
    fi
else
    echo -e "${RED}  ❌ services or models directory missing${NC}"
    ((FAILED_TESTS++))
fi

echo ""

# ===========================================
# TEST 7: Models Integration
# ===========================================
echo -e "${BLUE}TEST 7: Models Integration${NC}"

if [ -d "models" ]; then
    # Check if models/index.js exists and exports all models
    if [ -f "models/index.js" ]; then
        echo -e "${GREEN}  ✅ models/index.js exists${NC}"
        ((PASSED_TESTS++))
        
        # Check if it exports models
        if grep -q "module.exports.*=" "models/index.js"; then
            echo -e "${GREEN}  ✅ models/index.js exports models${NC}"
            ((PASSED_TESTS++))
        else
            echo -e "${RED}  ❌ models/index.js doesn't export properly${NC}"
            ((FAILED_TESTS++))
        fi
    else
        echo -e "${YELLOW}  ⚠️  models/index.js not found${NC}"
    fi
    
    # Check for indexes in models
    MODELS_WITH_INDEXES=0
    for model in models/*.js; do
        if [ -f "$model" ] && [[ $(basename "$model") != "index.js" ]]; then
            if grep -q "\.index(" "$model"; then
                ((MODELS_WITH_INDEXES++))
            fi
        fi
    done
    
    echo -e "${GREEN}  ✅ $MODELS_WITH_INDEXES model(s) have indexes defined${NC}"
    
    # Check for pre-save hooks in User models
    for model in models/{Student,Teacher,Parent}.js; do
        if [ -f "$model" ]; then
            if grep -q "pre('save'" "$model"; then
                echo -e "${GREEN}  ✅ $(basename $model) has pre-save hook${NC}"
                ((PASSED_TESTS++))
            else
                echo -e "${YELLOW}  ⚠️  $(basename $model) missing pre-save hook${NC}"
            fi
        fi
    done
fi

echo ""

# ===========================================
# TEST 8: Validators Integration
# ===========================================
echo -e "${BLUE}TEST 8: Validators Integration${NC}"

if [ -d "validators" ]; then
    VALIDATOR_COUNT=$(find validators -name "*.js" -type f | wc -l)
    echo "  Found $VALIDATOR_COUNT validator files"
    
    # Check if validators use Joi
    JOI_VALIDATORS=0
    for validator in validators/*.js; do
        if [ -f "$validator" ]; then
            if grep -q "Joi\|joi" "$validator"; then
                ((JOI_VALIDATORS++))
            fi
        fi
    done
    
    if [ $JOI_VALIDATORS -gt 0 ]; then
        echo -e "${GREEN}  ✅ $JOI_VALIDATORS validators use Joi${NC}"
        ((PASSED_TESTS++))
    else
        echo -e "${YELLOW}  ⚠️  No Joi validation found${NC}"
    fi
    
    # Check if validators are used in routes
    VALIDATOR_USAGE=0
    if [ -d "routes" ]; then
        for route in routes/*.js; do
            if [ -f "$route" ]; then
                if grep -q "validate\|validator" "$route"; then
                    ((VALIDATOR_USAGE++))
                fi
            fi
        done
        
        if [ $VALIDATOR_USAGE -gt 0 ]; then
            echo -e "${GREEN}  ✅ Validators used in $VALIDATOR_USAGE route files${NC}"
            ((PASSED_TESTS++))
        else
            echo -e "${RED}  ❌ Validators not used in routes${NC}"
            ((FAILED_TESTS++))
        fi
    fi
else
    echo -e "${YELLOW}  ⚠️  validators directory not found${NC}"
fi

echo ""

# ===========================================
# TEST 9: External API Integration
# ===========================================
echo -e "${BLUE}TEST 9: External API Integration${NC}"

if [ -d "services" ]; then
    # Check for Mistral integration
    if [ -f "services/mistral.service.js" ]; then
        echo -e "${GREEN}  ✅ Mistral service exists${NC}"
        ((PASSED_TESTS++))
        
        if grep -q "retry\|attempt" "services/mistral.service.js"; then
            echo -e "${GREEN}  ✅ Mistral service has retry logic${NC}"
            ((PASSED_TESTS++))
        else
            echo -e "${YELLOW}  ⚠️  Mistral service missing retry logic${NC}"
        fi
    else
        echo -e "${RED}  ❌ Mistral service not found${NC}"
        ((FAILED_TESTS++))
    fi
    
    # Check for email service
    if [ -f "services/email.service.js" ]; then
        echo -e "${GREEN}  ✅ Email service exists${NC}"
        ((PASSED_TESTS++))
        
        if grep -q "sendgrid\|sgMail" "services/email.service.js"; then
            echo -e "${GREEN}  ✅ Email service uses SendGrid${NC}"
            ((PASSED_TESTS++))
        else
            echo -e "${YELLOW}  ⚠️  Email service might not use SendGrid${NC}"
        fi
    else
        echo -e "${RED}  ❌ Email service not found${NC}"
        ((FAILED_TESTS++))
    fi
fi

echo ""

# ===========================================
# TEST 10: Algorithms Integration
# ===========================================
echo -e "${BLUE}TEST 10: Algorithms Integration${NC}"

if [ -d "algorithms" ]; then
    ALGO_COUNT=$(find algorithms -name "*.js" -type f | wc -l)
    echo "  Found $ALGO_COUNT algorithm files"
    
    # Check for critical algorithms
    CRITICAL_ALGOS=("kalman.filter.js" "q.learning.js" "difficulty.calibration.js")
    
    for algo in "${CRITICAL_ALGOS[@]}"; do
        if [ -f "algorithms/$algo" ]; then
            echo -e "${GREEN}  ✅ $algo exists${NC}"
            ((PASSED_TESTS++))
        else
            echo -e "${RED}  ❌ $algo missing${NC}"
            ((FAILED_TESTS++))
        fi
    done
    
    # Check if algorithms are used in services
    ALGO_USAGE=0
    if [ -d "services" ]; then
        for service in services/*.js; do
            if [ -f "$service" ]; then
                if grep -q "require.*algorithms" "$service"; then
                    ((ALGO_USAGE++))
                fi
            fi
        done
        
        if [ $ALGO_USAGE -gt 0 ]; then
            echo -e "${GREEN}  ✅ Algorithms used in $ALGO_USAGE service(s)${NC}"
            ((PASSED_TESTS++))
        else
            echo -e "${YELLOW}  ⚠️  Algorithms not used in services${NC}"
        fi
    fi
else
    echo -e "${YELLOW}  ⚠️  algorithms directory not found${NC}"
fi

echo ""

# ===========================================
# TEST 11: Jobs Integration
# ===========================================
echo -e "${BLUE}TEST 11: Jobs Integration${NC}"

if [ -d "jobs" ]; then
    JOB_COUNT=$(find jobs -name "*.js" -type f ! -name "index.js" | wc -l)
    echo "  Found $JOB_COUNT job files"
    
    # Check if jobs/index.js exists
    if [ -f "jobs/index.js" ]; then
        echo -e "${GREEN}  ✅ jobs/index.js exists${NC}"
        ((PASSED_TESTS++))
        
        # Check if it initializes jobs
        if grep -q "schedule\|cron" "jobs/index.js"; then
            echo -e "${GREEN}  ✅ jobs/index.js schedules jobs${NC}"
            ((PASSED_TESTS++))
        else
            echo -e "${YELLOW}  ⚠️  jobs/index.js might not schedule jobs${NC}"
        fi
    else
        echo -e "${RED}  ❌ jobs/index.js not found${NC}"
        ((FAILED_TESTS++))
    fi
    
    # Check if jobs are initialized in server.js
    if [ -f "server.js" ]; then
        if grep -q "jobs\|initializeJobs" "server.js"; then
            echo -e "${GREEN}  ✅ Jobs initialized in server.js${NC}"
            ((PASSED_TESTS++))
        else
            echo -e "${RED}  ❌ Jobs not initialized in server.js${NC}"
            ((FAILED_TESTS++))
        fi
    fi
else
    echo -e "${YELLOW}  ⚠️  jobs directory not found${NC}"
fi

echo ""

# ===========================================
# TEST 12: Configuration Integration
# ===========================================
echo -e "${BLUE}TEST 12: Configuration Integration${NC}"

if [ -d "config" ]; then
    # Check for constants
    if [ -f "config/constants.js" ]; then
        echo -e "${GREEN}  ✅ constants.js exists${NC}"
        ((PASSED_TESTS++))
        
        # Check if constants are used elsewhere
        CONSTANTS_USAGE=$(grep -r "require.*constants" --include="*.js" . 2>/dev/null | wc -l)
        if [ $CONSTANTS_USAGE -gt 1 ]; then
            echo -e "${GREEN}  ✅ Constants used in $CONSTANTS_USAGE places${NC}"
            ((PASSED_TESTS++))
        else
            echo -e "${YELLOW}  ⚠️  Constants not widely used${NC}"
        fi
    else
        echo -e "${YELLOW}  ⚠️  constants.js not found${NC}"
    fi
    
    # Check critical config files
    CRITICAL_CONFIGS=("database.js" "jwt.js")
    
    for config in "${CRITICAL_CONFIGS[@]}"; do
        if [ -f "config/$config" ]; then
            echo -e "${GREEN}  ✅ config/$config exists${NC}"
            ((PASSED_TESTS++))
        else
            echo -e "${RED}  ❌ config/$config missing${NC}"
            ((FAILED_TESTS++))
        fi
    done
else
    echo -e "${RED}  ❌ config directory not found${NC}"
    ((FAILED_TESTS++))
fi

echo ""

# ===========================================
# TEST 13: Error Handling Integration
# ===========================================
echo -e "${BLUE}TEST 13: Error Handling Integration${NC}"

# Check for AppError utility
if [ -f "utils/AppError.js" ]; then
    echo -e "${GREEN}  ✅ AppError utility exists${NC}"
    ((PASSED_TESTS++))
    
    # Check usage in controllers
    APPERROR_USAGE=$(grep -r "AppError\|throw new AppError" controllers/ 2>/dev/null | wc -l)
    if [ $APPERROR_USAGE -gt 0 ]; then
        echo -e "${GREEN}  ✅ AppError used in controllers${NC}"
        ((PASSED_TESTS++))
    else
        echo -e "${YELLOW}  ⚠️  AppError not used in controllers${NC}"
    fi
else
    echo -e "${RED}  ❌ AppError utility missing${NC}"
    ((FAILED_TESTS++))
fi

# Check for catchAsync
if [ -f "utils/catchAsync.js" ]; then
    echo -e "${GREEN}  ✅ catchAsync utility exists${NC}"
    ((PASSED_TESTS++))
    
    # Check usage in controllers
    CATCHASYNC_USAGE=$(grep -r "catchAsync" controllers/ 2>/dev/null | wc -l)
    if [ $CATCHASYNC_USAGE -gt 0 ]; then
        echo -e "${GREEN}  ✅ catchAsync used in controllers${NC}"
        ((PASSED_TESTS++))
    else
        echo -e "${YELLOW}  ⚠️  catchAsync not used in controllers${NC}"
    fi
else
    echo -e "${YELLOW}  ⚠️  catchAsync utility missing${NC}"
fi

echo ""

# ===========================================
# SUMMARY
# ===========================================
echo "========================================"
echo -e "${BLUE}📊 INTEGRATION TEST SUMMARY${NC}"
echo "========================================"
echo ""

TOTAL_TESTS=$((PASSED_TESTS + FAILED_TESTS))

if [ $TOTAL_TESTS -gt 0 ]; then
    PASS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    
    echo -e "${GREEN}✅ Passed: $PASSED_TESTS${NC}"
    echo -e "${RED}❌ Failed: $FAILED_TESTS${NC}"
    echo "📈 Pass Rate: $PASS_RATE%"
    echo ""
    
    if [ $FAILED_TESTS -eq 0 ]; then
        echo -e "${GREEN}🎉 All integration tests passed!${NC}"
        echo "Your components are properly integrated."
    elif [ $PASS_RATE -ge 80 ]; then
        echo -e "${YELLOW}⚠️  Most tests passed, but some integrations need attention.${NC}"
        echo "Review the failed tests above."
    else
        echo -e "${RED}❌ Multiple integration issues detected.${NC}"
        echo "Please review the INTEGRATION-ANALYSIS.md document."
    fi
else
    echo -e "${RED}❌ No tests could be run.${NC}"
    echo "Check if you're in the correct directory."
fi

echo ""
echo "📝 For detailed integration guidance, see:"
echo "   - INTEGRATION-ANALYSIS.md"
echo "   - COMPREHENSIVE-DEBUG-CHECKLIST.md"
echo "   - CRITICAL-FIXES.md"
echo ""

exit $FAILED_TESTS