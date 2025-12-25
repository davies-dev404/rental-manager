require('dotenv').config();
const mongoose = require('mongoose');
const Settings = require('../server/models/Settings');

const cleanSettings = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to DB");

        const settings = await Settings.findOne();
        if (settings) {
            let changed = false;
            // Check for placeholder values and clear them
            if (settings.integrations?.email?.smtp?.host === 'smtp.example.com') {
                settings.integrations.email.smtp.host = '';
                changed = true;
                console.log("Cleared placeholder SMTP Host");
            }
            if (settings.integrations?.email?.smtp?.user === 'user@example.com') {
                settings.integrations.email.smtp.user = '';
                changed = true;
                console.log("Cleared placeholder SMTP User");
            }

            if (changed) {
                await settings.save();
                console.log("Settings cleaned successfully.");
            } else {
                console.log("No placeholders found.");
            }
        } else {
            console.log("No settings document found.");
        }
        process.exit(0);
    } catch (error) {
        console.error("Error cleaning settings:", error);
        process.exit(1);
    }
};

cleanSettings();
