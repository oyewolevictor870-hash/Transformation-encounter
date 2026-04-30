const nodemailer = require('nodemailer');
const { email: emailConfig } = require('../config/config');

let transporter;

const getTransporter = () => {
    if (!transporter) {
        transporter = nodemailer.createTransport({
            host: emailConfig.host,
            port: emailConfig.port,
            secure: false,
            auth: { user: emailConfig.user, pass: emailConfig.pass },
        });
    }
    return transporter;
};

const sendEmail = async (to, subject, text, html = null) => {
    if (!emailConfig.user || !emailConfig.pass) {
        console.log(`📧 Email skipped (no config): To: ${to}, Subject: ${subject}`);
        return;
    }
    try {
        await getTransporter().sendMail({
            from: emailConfig.from,
            to,
            subject,
            text,
            html: html || `<p>${text}</p>`,
        });
    } catch (err) {
        console.error('Email error:', err.message);
    }
};

module.exports = { sendEmail };
