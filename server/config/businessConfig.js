/**
 * Centralized Business Contact & Platform Defaults
 */
const BUSINESS_CONFIG = {
  name: process.env.BUSINESS_NAME || 'MakaziFlow',
  phone: process.env.BUSINESS_PHONE || '0790264792',
  email: process.env.BUSINESS_EMAIL || 'info@afrinextech.co.ke',
  address: process.env.BUSINESS_ADDRESS || 'Busia, Kenya',
  defaultCurrency: 'KES',
  defaultTimezone: 'Africa/Nairobi',
  defaultVatRate: Number(process.env.ETIMS_DEFAULT_VAT_RATE || 16)
};

module.exports = BUSINESS_CONFIG;
