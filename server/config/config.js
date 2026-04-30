require('dotenv').config();

module.exports = {
    jwtSecret: process.env.JWT_SECRET || 'te_secret_key_change_in_production',
    jwtExpiry: '7d',
    port: process.env.PORT || 3000,
    appUrl: process.env.APP_URL || 'http://localhost:3000',
    paystack: {
        publicKey: process.env.PAYSTACK_PUBLIC_KEY || '',
        secretKey: process.env.PAYSTACK_SECRET_KEY || '',
        baseUrl: 'https://api.paystack.co'
    },
    email: {
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: process.env.EMAIL_PORT || 587,
        user: process.env.EMAIL_USER || '',
        pass: process.env.EMAIL_PASS || '',
        from: process.env.EMAIL_FROM || 'Transformation Encounter <noreply@transformationencounter.org>'
    },
    uploads: {
        maxSize: 10 * 1024 * 1024,
        allowedImages: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        allowedAudio: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg'],
        allowedVideo: ['video/mp4', 'video/webm', 'video/avi'],
        allowedDocs: ['application/pdf']
    }
};
