#!/bin/bash
# E-Nutrition Rwanda - Module Generator Script
# Run this to generate all NestJS modules

cd "$(dirname "$0")"

echo "🚀 Generating E-Nutrition Rwanda Backend Modules..."

# Generate modules
nest g module facility
nest g module child
nest g module assessment
nest g module follow-up
nest g module referral
nest g module growth-record
nest g module activity
nest g module statistics
nest g module reports
nest g module auth

# Generate services
nest g service facility
nest g service child
nest g service assessment
nest g service follow-up
nest g service referral
nest g service growth-record
nest g service activity
nest g service statistics
nest g service reports
nest g service auth

# Generate controllers
nest g controller facility
nest g controller child
nest g controller assessment
nest g controller follow-up
nest g controller referral
nest g controller growth-record
nest g controller activity
nest g controller statistics
nest g controller reports
nest g controller auth

echo "✅ Module generation complete!"
echo "📝 Next steps:"
echo "   1. Implement DTOs in each module"
echo "   2. Add business logic to services"
echo "   3. Connect controllers to services"
echo "   4. Add validation pipes"
echo "   5. Implement guards for authentication"
