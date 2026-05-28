const axios = require('axios');
require('dotenv').config();
// let topic = process.env.APPID_ONESIGNAL;

class oneSignalMessageBroker{
    constructor(targetPlayerId){
        this.targetPlayerId = targetPlayerId; 
    }

    sendPushToPlayer = async (message = '',sound = '') => {
        const data = {
            app_id: process.env.APPID_ONESIGNAL,
            include_player_ids: this.targetPlayerId,
            headings: { en: 'Pesan baru 🚀' },
            contents: { en: message },
            android_sound: sound == '' ? 'decide' : sound, // tanpa .mp3
            // ios_sound: "notif_laundry.wav", // dengan ekstensi
        };

        const headers = {
            'Content-Type': 'application/json; charset=utf-8',
            'Authorization': `Basic ${process.env.AUTH_ONESIGNAL}`, // penting!
        };

        try {
            const response = await axios.post(
            'https://onesignal.com/api/v1/notifications',
            data,
            { headers }
            );
            console.log('Success_oneSignalMessageBroker:', response.data);
        } catch (error) {
            console.error('Error_oneSignalMessageBroker:', error.response?.data || error.message);
        }
        };
}


module.exports = oneSignalMessageBroker;