# 🔐 VisaBuddy Security Guide

**Last Updated**: January 2025  
**Status**: Active Security Policies

---

## 🚨 CRITICAL SECURITY RULES

### ❌ NEVER Commit These to Git

- `.env` files (any environment)
- `.env.local`, `.env.production`, `.env.*.local`
- API keys, secrets, passwords
- Firebase service account JSON files
- Database connection strings with passwords
- JWT secrets
- Private keys (`.pem`, `.key`, `.crt`)
- Android keystore files and passwords
- OAuth client secrets

### ✅ Always Commit These

- `.env.example` files (templates without secrets)
- Configuration templates
- Documentation
- Public keys (if needed)

---

## 🔑 Credential Management

### Environment Variables

All secrets must be stored in environment variables, never hardcoded in code.

**Backend** (`apps/backend/.env`):
- `JWT_SECRET` - Must be 32+ characters
- `DATABASE_URL` - PostgreSQL connection string
- `GOOGLE_CLIENT_SECRET` - OAuth secret
- `STRIPE_SECRET_KEY` - Payment gateway key
- `OPENAI_API_KEY` - AI service key
- All other API keys and secrets

**Frontend** (`apps/frontend/.env`):
- Only public variables with `EXPO_PUBLIC_` prefix
- Never store secrets in frontend

**AI Service** (`apps/ai-service/.env`):
- `OPENAI_API_KEY` - AI service key

### Generating Secrets

Use the provided scripts to generate secure secrets:

```bash
# Linux/Mac
./scripts/generate-secrets.sh

# Windows
.\scripts\generate-secrets.ps1
```

Or manually:
```bash
# Using OpenSSL
openssl rand -base64 32

# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🔄 Credential Rotation

### When to Rotate

- **Immediately**: If credentials are exposed or compromised
- **Regularly**: Every 90 days for production secrets
- **After incidents**: Security breaches, employee departures
- **Scheduled**: Quarterly rotation for critical secrets

### Rotation Checklist

1. **Generate New Secrets**
   ```bash
   ./scripts/generate-secrets.sh
   ```

2. **Update Environment Variables**
   - Update in all environments (dev, staging, production)
   - Update in deployment platforms (Railway, Heroku, etc.)

3. **Update Services**
   - Database: Update connection strings
   - OAuth: Update client secrets in Google Cloud Console
   - Payment Gateways: Update API keys in provider dashboards
   - Firebase: Update service account keys

4. **Test**
   - Verify all services work with new credentials
   - Test authentication flows
   - Test payment processing
   - Test external service integrations

5. **Document**
   - Record rotation date
   - Update team members
   - Update deployment documentation

---

## 🛡️ Security Best Practices

### 1. Environment Variables

✅ **DO**:
- Use `.env` files for local development
- Use platform environment variables for production
- Validate all required variables on startup
- Use strong, random secrets (32+ characters)

❌ **DON'T**:
- Commit `.env` files
- Use default or weak secrets
- Share secrets via email or chat
- Store secrets in code comments

### 2. Database Security

✅ **DO**:
- Use strong database passwords
- Restrict database access by IP
- Use SSL/TLS for database connections
- Regularly backup databases
- Rotate database passwords

❌ **DON'T**:
- Expose database credentials
- Use default database passwords
- Allow public database access
- Store database passwords in code

### 3. API Keys

✅ **DO**:
- Store API keys in environment variables
- Set usage limits on API keys
- Monitor API key usage
- Rotate API keys regularly
- Use different keys for dev/staging/production

❌ **DON'T**:
- Commit API keys to git
- Share API keys publicly
- Use same keys across environments
- Leave unused API keys active

### 4. Authentication

✅ **DO**:
- Use strong JWT secrets (32+ characters)
- Set appropriate token expiration
- Implement refresh tokens
- Validate all authentication tokens
- Use HTTPS in production

❌ **DON'T**:
- Use weak JWT secrets
- Expose JWT secrets
- Allow long-lived tokens
- Skip token validation
- Use HTTP in production

### 5. CORS Configuration

✅ **DO**:
- Specify exact allowed origins in production
- Use HTTPS for production origins
- Validate CORS on every request
- Restrict to necessary methods and headers

❌ **DON'T**:
- Use `*` for CORS in production
- Allow all origins
- Skip CORS validation
- Expose sensitive headers

---

## 🚨 Incident Response

### If Credentials Are Exposed

1. **Immediately**:
   - Rotate ALL exposed credentials
   - Revoke compromised API keys
   - Change database passwords
   - Review access logs

2. **Within 1 Hour**:
   - Notify team members
   - Assess scope of exposure
   - Document the incident
   - Update security measures

3. **Within 24 Hours**:
   - Complete credential rotation
   - Verify all services work
   - Review security practices
   - Update documentation

### Reporting Security Issues

If you discover a security vulnerability:

1. **DO NOT** create a public issue
2. Email security concerns privately
3. Include:
   - Description of the issue
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

---

## 📋 Security Checklist

### Before Deployment

- [ ] All `.env` files are in `.gitignore`
- [ ] No secrets in code or comments
- [ ] All secrets are 32+ characters
- [ ] CORS is configured for production
- [ ] HTTPS is enabled
- [ ] Database uses SSL/TLS
- [ ] API keys have usage limits
- [ ] Error messages don't expose secrets
- [ ] Logs don't contain sensitive data
- [ ] Security headers are configured

### Regular Maintenance

- [ ] Rotate secrets every 90 days
- [ ] Review access logs monthly
- [ ] Update dependencies regularly
- [ ] Monitor for security advisories
- [ ] Test security measures quarterly
- [ ] Update security documentation

---

## 🔍 Security Validation

### Validate Environment Variables

```bash
# Linux/Mac
./scripts/validate-env.sh all

# Windows
.\scripts\validate-env.ps1 all
```

### Check for Exposed Secrets

```bash
# Search for potential secrets in code
grep -r "password\|secret\|key" --include="*.ts" --include="*.js" apps/backend/src

# Check git history (if needed)
git log --all --full-history --source -- "*.env"
```

---

## 📚 Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [React Native Security](https://reactnative.dev/docs/security)

---

## 📞 Security Contacts

For security concerns or questions:
- Review this document first
- Check existing security documentation
- Contact the development team

---

**Remember**: Security is everyone's responsibility. When in doubt, ask!








