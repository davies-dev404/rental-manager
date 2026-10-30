const PDFDocument = require('pdfkit');

/**
 * Generates a professional, corporate-style Lease Agreement PDF
 * @param {Object} tenant - Populated tenant object
 * @param {Object} unit - Populated unit object
 * @param {Object} property - Property object with name, location
 * @param {Object} settings - System settings (orgName, orgEmail, etc.)
 * @param {Object} options - Extra options { leaseTermMonths, specialTerms }
 * @returns {Promise<Buffer>} - PDF Buffer
 */
const generateLeasePDF = (tenant, unit, property, settings, options = {}) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: 'A4',
                margins: { top: 60, bottom: 60, left: 60, right: 60 },
                autoFirstPage: true,
                bufferPages: true
            });
            const buffers = [];

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                const pdfData = Buffer.concat(buffers);
                resolve(pdfData);
            });
            doc.on('error', (err) => reject(err));

            // ─── BRANDING ───
            const primaryColor = '#0f172a';
            const secondaryColor = '#475569';
            const accentColor = '#10b981';
            const mutedColor = '#94a3b8';
            const borderColor = '#cbd5e1';
            const lightBg = '#f8fafc';

            const companyName = settings?.orgName || property?.name || 'Property Management';
            const companyEmail = settings?.orgEmail || '';
            const companyPhone = settings?.orgPhone || '';
            const companyAddress = settings?.orgAddress || '';
            const propertyName = property?.name || 'The Property';
            const propertyLocation = property?.location || '';
            const currency = settings?.currency || 'KES';
            const taxId = settings?.taxId || '';

            const tenantName = tenant?.name || 'Tenant';
            const tenantEmail = tenant?.email || '';
            const tenantPhone = tenant?.phone || '';
            const tenantNationalId = tenant?.nationalId || '';
            const tenantIdType = tenant?.idType || 'national_id';
            const unitNumber = unit?.unitNumber || 'N/A';
            const unitType = unit?.type || '1 Bedroom';
            const rentAmount = tenant?.rentAmount || unit?.rentAmount || 0;
            const depositAmount = tenant?.deposit || 0;
            const utilities = Array.isArray(tenant?.utilities) ? tenant.utilities : [];

            const leaseStart = tenant?.leaseStart ? new Date(tenant.leaseStart) : new Date();
            const leaseEnd = tenant?.leaseEnd
                ? new Date(tenant.leaseEnd)
                : new Date(leaseStart.getTime() + (options.leaseTermMonths || 12) * 30 * 24 * 60 * 60 * 1000);

            const formatDate = (d) => d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
            const today = formatDate(new Date());

            const pageWidth = 595.28 - 120; // A4 width minus margins

            // ═══════════════════════════════════════════════════════
            // HELPER: Draw section header
            // ═══════════════════════════════════════════════════════
            const sectionHeader = (title, number) => {
                checkPageBreak(40);
                doc.moveDown(0.8);
                doc.fontSize(11).font('Helvetica-Bold').fillColor(accentColor)
                   .text(`${number}.`, { continued: true })
                   .fillColor(primaryColor)
                   .text(`  ${title.toUpperCase()}`, { underline: false });
                doc.moveDown(0.4);
                doc.strokeColor(accentColor).lineWidth(0.5)
                   .moveTo(60, doc.y).lineTo(535, doc.y).stroke();
                doc.moveDown(0.5);
            };

            const bodyText = (text) => {
                checkPageBreak(30);
                doc.fontSize(9.5).font('Helvetica').fillColor(secondaryColor)
                   .text(text, { lineGap: 4, align: 'justify' });
                doc.moveDown(0.3);
            };

            const bulletPoint = (text) => {
                checkPageBreak(25);
                doc.fontSize(9.5).font('Helvetica').fillColor(secondaryColor)
                   .text(`    •  ${text}`, { lineGap: 3, indent: 10 });
                doc.moveDown(0.15);
            };

            const boldLabel = (label, value) => {
                checkPageBreak(20);
                doc.fontSize(9.5).font('Helvetica-Bold').fillColor(primaryColor)
                   .text(label, { continued: true })
                   .font('Helvetica').fillColor(secondaryColor)
                   .text(`  ${value}`);
                doc.moveDown(0.15);
            };

            // Track page count for smart breaks
            let currentPage = 1;
            const checkPageBreak = (requiredSpace) => {
                if (doc.y + requiredSpace > 770) {
                    doc.addPage();
                    currentPage++;
                    drawPageBorder();
                }
            };

            const drawPageBorder = () => {
                // Subtle inner border
                doc.save();
                doc.rect(45, 45, 505, 752).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
                doc.restore();
            };

            // ═══════════════════════════════════════════════════════
            // PAGE 1: COVER / HEADER
            // ═══════════════════════════════════════════════════════
            drawPageBorder();

            // Top accent bar
            doc.rect(45, 45, 505, 6).fill(accentColor);

            let y = 70;

            // Company Logo attempt
            const logoPath = require('path').join(__dirname, '../assets/logo.png');
            try {
                doc.image(logoPath, 60, y, { width: 55 });
            } catch (e) {
                // Fallback: round accent dot
                doc.circle(80, y + 18, 12).fill(accentColor);
                doc.fontSize(14).font('Helvetica-Bold').fillColor('#ffffff')
                   .text(companyName.charAt(0).toUpperCase(), 73, y + 11);
            }

            // Company header text (right side)
            doc.fontSize(16).font('Helvetica-Bold').fillColor(primaryColor)
               .text(companyName, 250, y, { align: 'right', width: 285 });
            y += 22;
            if (companyAddress) {
                doc.fontSize(8).font('Helvetica').fillColor(mutedColor)
                   .text(companyAddress, 250, y, { align: 'right', width: 285 });
                y += 12;
            }
            if (companyEmail) {
                doc.fontSize(8).font('Helvetica').fillColor(mutedColor)
                   .text(companyEmail, 250, y, { align: 'right', width: 285 });
                y += 12;
            }
            if (companyPhone) {
                doc.fontSize(8).font('Helvetica').fillColor(mutedColor)
                   .text(companyPhone, 250, y, { align: 'right', width: 285 });
                y += 12;
            }
            if (taxId) {
                doc.fontSize(8).font('Helvetica').fillColor(mutedColor)
                   .text(`Tax ID: ${taxId}`, 250, y, { align: 'right', width: 285 });
                y += 12;
            }

            // Horizontal rule
            y = Math.max(y, 130);
            doc.strokeColor(borderColor).lineWidth(1)
               .moveTo(60, y).lineTo(535, y).stroke();
            y += 25;

            // ── TITLE ──
            doc.fontSize(22).font('Helvetica-Bold').fillColor(primaryColor)
               .text('RESIDENTIAL LEASE AGREEMENT', 60, y, { align: 'center', width: pageWidth, characterSpacing: 1 });
            y += 30;

            // ── Property Name Subtitle ──
            doc.fontSize(12).font('Helvetica').fillColor(accentColor)
               .text(propertyName, 60, y, { align: 'center', width: pageWidth });
            y += 18;
            if (propertyLocation) {
                doc.fontSize(9).font('Helvetica').fillColor(mutedColor)
                   .text(propertyLocation, 60, y, { align: 'center', width: pageWidth });
                y += 14;
            }

            // ── Date ──
            doc.fontSize(9).font('Helvetica').fillColor(mutedColor)
               .text(`Executed on: ${today}`, 60, y, { align: 'center', width: pageWidth });
            y += 30;

            // ── PARTIES INFO BOX ──
            doc.rect(60, y, pageWidth, 95).fill(lightBg).strokeColor(borderColor).lineWidth(0.5).stroke();
            const boxY = y + 12;

            // Landlord column
            doc.fontSize(8).font('Helvetica-Bold').fillColor(accentColor).text('LANDLORD / MANAGEMENT', 80, boxY);
            doc.fontSize(10).font('Helvetica-Bold').fillColor(primaryColor).text(companyName, 80, boxY + 15);
            doc.fontSize(8).font('Helvetica').fillColor(secondaryColor);
            let landlordY = boxY + 28;
            if (companyEmail) { doc.text(companyEmail, 80, landlordY); landlordY += 12; }
            if (companyPhone) { doc.text(companyPhone, 80, landlordY); landlordY += 12; }

            // Tenant column
            const rightColX = 320;
            doc.fontSize(8).font('Helvetica-Bold').fillColor(accentColor).text('TENANT', rightColX, boxY);
            doc.fontSize(10).font('Helvetica-Bold').fillColor(primaryColor).text(tenantName, rightColX, boxY + 15);
            doc.fontSize(8).font('Helvetica').fillColor(secondaryColor);
            let tenantY = boxY + 28;
            if (tenantEmail) { doc.text(tenantEmail, rightColX, tenantY); tenantY += 12; }
            if (tenantPhone) { doc.text(tenantPhone, rightColX, tenantY); tenantY += 12; }

            const idLabel = tenantIdType === 'passport' ? 'Passport' : tenantIdType === 'driving_license' ? "Driver's License" : 'National ID';
            if (tenantNationalId) { doc.text(`${idLabel}: ${tenantNationalId}`, rightColX, tenantY); tenantY += 12; }

            y += 110;
            doc.y = y;

            // ═══════════════════════════════════════════════════════
            // AGREEMENT BODY
            // ═══════════════════════════════════════════════════════

            // PREAMBLE
            bodyText(
                `This Residential Lease Agreement ("Agreement") is entered into on ${today}, by and between ` +
                `${companyName} (hereinafter referred to as the "Landlord") and ${tenantName} (hereinafter ` +
                `referred to as the "Tenant"), collectively referred to as the "Parties."`
            );

            bodyText(
                `WHEREAS the Landlord is the owner and/or authorized manager of the property known as ` +
                `${propertyName}, located at ${propertyLocation || 'the address on record'}, and the Tenant ` +
                `desires to lease a portion thereof; NOW THEREFORE, in consideration of the mutual covenants ` +
                `and agreements contained herein, the Parties agree as follows:`
            );

            // ── SECTION 1: PREMISES ──
            sectionHeader('PREMISES', 1);
            bodyText(
                `The Landlord hereby leases to the Tenant, and the Tenant hereby leases from the Landlord, ` +
                `the residential unit described as:`
            );
            boldLabel('Property:', `${propertyName}${propertyLocation ? ', ' + propertyLocation : ''}`);
            boldLabel('Unit Number:', unitNumber);
            boldLabel('Unit Type:', unitType);
            bodyText(
                `The premises shall be used exclusively for residential purposes. Any change of use requires ` +
                `prior written consent from the Landlord.`
            );

            // ── SECTION 2: TERM ──
            sectionHeader('TERM OF LEASE', 2);
            boldLabel('Commencement Date:', formatDate(leaseStart));
            boldLabel('Expiry Date:', formatDate(leaseEnd));
            bodyText(
                `The lease term shall commence on ${formatDate(leaseStart)} and expire on ${formatDate(leaseEnd)}, ` +
                `unless terminated earlier in accordance with the terms of this Agreement. The Tenant shall ` +
                `vacate the premises upon expiration unless a renewal is mutually agreed upon in writing at ` +
                `least thirty (30) days before the expiry date.`
            );

            // ── SECTION 3: RENT ──
            sectionHeader('RENT', 3);
            boldLabel('Monthly Rent:', `${currency} ${Number(rentAmount).toLocaleString()}`);
            bodyText(
                `The Tenant agrees to pay a monthly rent of ${currency} ${Number(rentAmount).toLocaleString()} ` +
                `payable on or before the 5th day of each calendar month. Rent shall be paid through authorized ` +
                `payment channels as specified by the Landlord (bank transfer, mobile money, or cash at the ` +
                `management office).`
            );
            bodyText(
                `Late Payment: A penalty of 10% of the monthly rent shall be charged for payments received ` +
                `after the 10th day of the month. Persistent late payments (3 or more consecutive months) ` +
                `may constitute grounds for termination of this Agreement.`
            );

            // ── SECTION 4: SECURITY DEPOSIT ──
            sectionHeader('SECURITY DEPOSIT', 4);
            boldLabel('Deposit Amount:', `${currency} ${Number(depositAmount).toLocaleString()}`);
            bodyText(
                `The Tenant has deposited ${currency} ${Number(depositAmount).toLocaleString()} as a security ` +
                `deposit against damage to the premises, unpaid rent, or any breach of this Agreement. The ` +
                `deposit, less any deductions for damages or outstanding balances, shall be refunded within ` +
                `thirty (30) days of the Tenant vacating the premises and surrendering all keys.`
            );

            // ── SECTION 5: UTILITIES ──
            sectionHeader('UTILITIES & SERVICE CHARGES', 5);
            if (utilities.length > 0) {
                bodyText('The following utilities and service charges apply to this tenancy:');
                utilities.forEach(u => {
                    const billingLabel = u.billingType === 'postpay_metered' ? '(metered)' : '(fixed)';
                    const included = u.isIncluded ? ' — included in rent' : '';
                    bulletPoint(`${u.name}: ${currency} ${Number(u.amount).toLocaleString()} ${billingLabel}${included}`);
                });
                doc.moveDown(0.3);
                bodyText(
                    `Metered utilities shall be billed based on actual consumption as recorded by the property's ` +
                    `sub-meters. Fixed utility charges are due together with the monthly rent.`
                );
            } else {
                bodyText(
                    `The Tenant shall be responsible for all utility charges including but not limited to ` +
                    `electricity, water, and garbage collection, based on the property's sub-meter readings ` +
                    `or as billed by the relevant utility providers.`
                );
            }

            // ── SECTION 6: USE OF PREMISES ──
            sectionHeader('USE OF PREMISES', 6);
            bodyText(
                `The Tenant shall use the premises solely for lawful residential purposes and shall not ` +
                `engage in any activity that may constitute a nuisance to neighboring tenants or contravene ` +
                `any applicable law, by-law, or regulation. The Tenant shall not:`
            );
            bulletPoint('Sub-let, assign, or transfer this lease without the Landlord\'s written consent.');
            bulletPoint('Make structural alterations without prior written approval from the Landlord.');
            bulletPoint('Keep pets on the premises unless expressly permitted in writing.');
            bulletPoint('Use the premises for commercial, industrial, or illegal activities.');

            // ── SECTION 7: MAINTENANCE & REPAIRS ──
            sectionHeader('MAINTENANCE & REPAIRS', 7);
            bodyText(
                `The Tenant shall maintain the premises in a clean and habitable condition. Minor repairs ` +
                `arising from normal wear and tear shall be the responsibility of the Landlord. The Tenant ` +
                `shall be liable for any damage caused by negligence, misuse, or actions of guests.`
            );
            bodyText(
                `The Tenant shall promptly report any maintenance issues, leaks, electrical faults, or ` +
                `structural defects to the Landlord or property management office.`
            );

            // ── SECTION 8: TERMINATION ──
            sectionHeader('TERMINATION', 8);
            bodyText(
                `Either party may terminate this Agreement by giving the other party not less than thirty (30) ` +
                `days' written notice. In the event of termination:`
            );
            bulletPoint('The Tenant shall surrender the premises in the condition received, normal wear excepted.');
            bulletPoint('All outstanding rent, utility charges, and damages shall be settled before departure.');
            bulletPoint('The Landlord shall conduct a move-out inspection within seven (7) days of vacating.');
            bodyText(
                `The Landlord reserves the right to terminate this Agreement immediately in the event of ` +
                `non-payment of rent for a period exceeding thirty (30) days, illegal use of the premises, ` +
                `or any material breach of this Agreement.`
            );

            // ── SECTION 9: GOVERNING LAW ──
            sectionHeader('GOVERNING LAW & DISPUTE RESOLUTION', 9);
            bodyText(
                `This Agreement shall be governed by and construed in accordance with the laws of the ` +
                `Republic of Kenya. Any dispute arising from this Agreement shall first be referred to ` +
                `mediation. Failing amicable resolution, the matter may be referred to a court of competent ` +
                `jurisdiction.`
            );

            // ── SECTION 10: GENERAL PROVISIONS ──
            sectionHeader('GENERAL PROVISIONS', 10);
            bulletPoint('This Agreement constitutes the entire understanding between the Parties.');
            bulletPoint('Amendments to this Agreement must be in writing and signed by both Parties.');
            bulletPoint('The Landlord\'s waiver of any breach shall not constitute a waiver of subsequent breaches.');
            bulletPoint('Notices shall be delivered in person, by email, or by registered mail to the addresses above.');

            // Special terms
            if (options.specialTerms) {
                sectionHeader('SPECIAL TERMS & CONDITIONS', 11);
                bodyText(options.specialTerms);
            }

            // ═══════════════════════════════════════════════════════
            // SIGNATURE BLOCK
            // ═══════════════════════════════════════════════════════
            checkPageBreak(180);
            doc.moveDown(1.5);
            
            // Signature divider
            doc.strokeColor(accentColor).lineWidth(1)
               .moveTo(60, doc.y).lineTo(535, doc.y).stroke();
            doc.moveDown(1);

            doc.fontSize(11).font('Helvetica-Bold').fillColor(primaryColor)
               .text('IN WITNESS WHEREOF', 60, doc.y, { align: 'center', width: pageWidth });
            doc.moveDown(0.3);
            doc.fontSize(9).font('Helvetica').fillColor(secondaryColor)
               .text('The Parties have executed this Agreement as of the date first written above.', 60, doc.y, { align: 'center', width: pageWidth });
            doc.moveDown(1.5);

            const sigY = doc.y;
            const sigLineWidth = 180;

            // Landlord signature
            doc.strokeColor(borderColor).lineWidth(0.5)
               .moveTo(60, sigY + 40).lineTo(60 + sigLineWidth, sigY + 40).stroke();
            doc.fontSize(9).font('Helvetica-Bold').fillColor(primaryColor)
               .text('LANDLORD / AUTHORIZED AGENT', 60, sigY + 48);
            doc.fontSize(8).font('Helvetica').fillColor(mutedColor)
               .text(companyName, 60, sigY + 60);
            doc.text(`Date: ${today}`, 60, sigY + 72);

            // Tenant signature
            const sigRightX = 535 - sigLineWidth;
            doc.strokeColor(borderColor).lineWidth(0.5)
               .moveTo(sigRightX, sigY + 40).lineTo(535, sigY + 40).stroke();
            doc.fontSize(9).font('Helvetica-Bold').fillColor(primaryColor)
               .text('TENANT', sigRightX, sigY + 48);
            doc.fontSize(8).font('Helvetica').fillColor(mutedColor)
               .text(tenantName, sigRightX, sigY + 60);
            doc.text(`Date: ________________`, sigRightX, sigY + 72);

            // ═══════════════════════════════════════════════════════
            // FOOTER ON ALL PAGES
            // ═══════════════════════════════════════════════════════
            const pages = doc.bufferedPageRange();
            for (let i = pages.start; i < pages.start + pages.count; i++) {
                doc.switchToPage(i);
                // Page number
                doc.fontSize(7).font('Helvetica').fillColor(mutedColor)
                   .text(
                       `${companyName} — ${propertyName} Lease Agreement  |  Page ${i + 1} of ${pages.count}`,
                       60, 782, { align: 'center', width: pageWidth }
                   );
            }

            doc.end();
        } catch (error) {
            console.error("Lease PDF Generation Error:", error);
            reject(error);
        }
    });
};

module.exports = { generateLeasePDF };
