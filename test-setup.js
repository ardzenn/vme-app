// Create this file in your project root to test setup
// Run with: node test-setup.js

console.log('🧪 Testing VME App Setup...\n');

// Test 1: Check if all required files exist
const fs = require('fs');
const path = require('path');

const requiredFiles = [
    'controllers/viewController.js',
    'middleware/auth.js',
    'routes/views.js',
    'views/it-dashboard.ejs',
    'views/sales-manager-dashboard.ejs',
    'views/inventory-dashboard.ejs',
    'views/partials/chat-widget.ejs'
];

console.log('📁 Checking required files...');
requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`✅ ${file} - Found`);
    } else {
        console.log(`❌ ${file} - Missing!`);
    }
});

// Test 2: Check if controllers are properly exported
console.log('\n🎛️ Checking controller exports...');
try {
    const viewController = require('./controllers/viewController');
    
    const requiredMethods = [
        'getDashboard',
        'getITDashboard', 
        'getSalesManagerDashboard',
        'getInventoryDashboard',
        'getAdminDashboard',
        'getAccountingDashboard'
    ];
    
    requiredMethods.forEach(method => {
        if (typeof viewController[method] === 'function') {
            console.log(`✅ ${method} - Exported`);
        } else {
            console.log(`❌ ${method} - Missing or not a function!`);
        }
    });
} catch (error) {
    console.log('❌ Error loading viewController:', error.message);
}

// Test 3: Check middleware
console.log('\n🔐 Checking auth middleware...');
try {
    const auth = require('./middleware/auth');
    
    const requiredMiddleware = [
        'ensureAuthenticated',
        'ensureHasRole',
        'ensureAdmin',
        'ensureAccounting'
    ];
    
    requiredMiddleware.forEach(method => {
        if (typeof auth[method] === 'function') {
            console.log(`✅ ${method} - Exported`);
        } else {
            console.log(`❌ ${method} - Missing or not a function!`);
        }
    });
} catch (error) {
    console.log('❌ Error loading auth middleware:', error.message);
}

// Test 4: Check if User model has the new roles
console.log('\n👥 Checking User model roles...');
try {
    const User = require('./models/User');
    const userSchema = User.schema;
    const roleField = userSchema.paths.role;
    
    if (roleField && roleField.enumValues) {
        const roles = roleField.enumValues;
        const newRoles = ['IT', 'Sales Manager', 'Inventory'];
        
        newRoles.forEach(role => {
            if (roles.includes(role)) {
                console.log(`✅ ${role} - Found in User model`);
            } else {
                console.log(`❌ ${role} - Missing from User model!`);
            }
        });
    } else {
        console.log('❌ Could not find role enum in User model');
    }
} catch (error) {
    console.log('❌ Error loading User model:', error.message);
}

console.log('\n🎯 Test completed! Fix any ❌ issues above.\n');

// Test 5: Check if views directory structure is correct
console.log('📂 Checking views directory...');
const viewsDir = 'views';
if (fs.existsSync(viewsDir)) {
    const files = fs.readdirSync(viewsDir);
    console.log('Views found:', files.filter(f => f.endsWith('.ejs')));
} else {
    console.log('❌ Views directory not found!');
}

console.log('\n💡 Common issues to check:');
console.log('1. Make sure all .ejs files are in the views/ directory');
console.log('2. Check that your app.js includes the updated routes');
console.log('3. Verify your User model includes the new roles');
console.log('4. Test with a user that has IT, Sales Manager, or Inventory role');
console.log('5. Check browser console for JavaScript errors');
console.log('6. Make sure enhanced-chat-widget.js is in public/js/');