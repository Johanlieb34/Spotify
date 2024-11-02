require('dotenv').config(); // Load environment variables

const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

// Initialize the bot with your token
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

let spotifyAccessToken = '';

// Function to get Spotify access token
const getSpotifyAccessToken = async () => {
    const authOptions = {
        method: 'POST',
        url: 'https://accounts.spotify.com/api/token',
        headers: {
            'Authorization': 'Basic ' + Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        data: 'grant_type=client_credentials'
    };

    try {
        const response = await axios(authOptions);
        spotifyAccessToken = response.data.access_token;
    } catch (error) {
        console.error('Failed to retrieve Spotify access token:', error.response ? error.response.data : error.message);
    }
};

// Get access token at startup
getSpotifyAccessToken();

// Command to play a song
bot.onText(/\/play (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const songName = match[1];

    try {
        // Get a fresh access token if it's not set
        if (!spotifyAccessToken) await getSpotifyAccessToken();

        // Search for the song on Spotify
        const response = await axios.get(`https://api.spotify.com/v1/search`, {
            headers: { 'Authorization': `Bearer ${spotifyAccessToken}` },
            params: { q: songName, type: 'track', limit: 1 }
        });

        const track = response.data.tracks.items[0];
        if (track) {
            const audioUrl = track.preview_url; // Spotify's preview URL
            if (audioUrl) {
                bot.sendAudio(chatId, audioUrl);
            } else {
                bot.sendMessage(chatId, "No preview available for this song.");
            }
        } else {
            bot.sendMessage(chatId, "Could not find the requested song.");
        }
    } catch (error) {
        console.error('Error fetching song:', error);
        bot.sendMessage(chatId, "An error occurred while searching for the song.");
    }
});

// Start command
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "Welcome! Use /play <song name> to play a song.");
});

// Help command
bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "Commands:\n/play <song name> - Play a song preview\n/start - Start the bot\n/help - Show this help message");
});
