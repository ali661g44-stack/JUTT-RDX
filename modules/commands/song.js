const fs = require("fs");
const path = require("path");
const axios = require("axios");
const ytSearch = require("yt-search");

module.exports.config = {
    name: "song",
    aliases: ["songs"],
    version: "1.0.0",
    hasPrefix: true,
    permission: 'PUBLIC',
    credit: "𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭",
    description: "Search and download music from YouTube",
    category: "MEDIA",
    usages: "[song name]",
    cooldown: 5,
};

module.exports.run = async function ({ api, message, args }) {
    const { threadID, messageID, senderID } = message;
    const input = args.join(" ");

    if (!input) {
        return api.sendMessage("❌ Please enter a song name.", threadID, messageID);
    }

    try {
        // Removed "Searching..." message as requested

        const searchResults = await ytSearch(input);
        if (!searchResults || !searchResults.videos.length) {
            return api.sendMessage("❌ No results found.", threadID, messageID);
        }

        const results = searchResults.videos.slice(0, 6);
        const thumbDir = path.join(__dirname, "temporary");
        if (!fs.existsSync(thumbDir)) fs.mkdirSync(thumbDir, { recursive: true });

        let msg = "🎧 Top 6 results:\n\n";
        const attachments = [];
        const thumbnailPaths = [];

        for (let i = 0; i < results.length; i++) {
            const video = results[i];
            const thumbURL = video.thumbnail;
            const thumbPath = path.join(thumbDir, `thumb-${video.videoId}-${Date.now()}.jpg`);

            try {
                const thumbData = await axios.get(thumbURL, { responseType: "arraybuffer" });
                fs.writeFileSync(thumbPath, thumbData.data);
                attachments.push(fs.createReadStream(thumbPath));
                thumbnailPaths.push(thumbPath);
            } catch (e) {
                console.error("Error downloading thumbnail:", e);
            }

            msg += `${i + 1}. ${video.title} (${video.timestamp})\n`;
            msg += `📻 ${video.author.name} | 👁 ${video.views}\n\n`;
        }

        msg += "👉 Reply with the number to download.";

        api.sendMessage(
            {
                body: msg,
                attachment: attachments,
            },
            threadID,
            (err, info) => {
                if (err) return console.error("Send failed:", err);

                global.client.replies.set(threadID, [
                    ...(global.client.replies.get(threadID) || []),
                    {
                        command: this.config.name,
                        messageID: info.messageID,
                        expectedSender: senderID,
                        data: {
                            results,
                            messageIDToDelete: info.messageID,
                            thumbnailPaths
                        }
                    }
                ]);

                // Cleanup thumbnails after sending (give some time for the message to be sent)
                setTimeout(() => {
                    thumbnailPaths.forEach(p => {
                        if (fs.existsSync(p)) fs.unlink(p, () => { });
                    });
                }, 60 * 1000);
            },
            messageID
        );

    } catch (error) {
        console.error("Error in songv2 command:", error);
        api.sendMessage("❌ An error occurred.", threadID, messageID);
    }
};

module.exports.handleReply = async function ({ api, message, replyData }) {
    const { threadID, messageID, body } = message;
    const index = parseInt(body.trim());

    if (!replyData.results || isNaN(index) || index < 1 || index > replyData.results.length) {
        return api.sendMessage("❌ Please reply with a valid number.", threadID, messageID);
    }

    const video = replyData.results[index - 1];
    const videoUrl = video.url;
    const apiKey = global.config.apiKeys?.priyanshuApi;

    if (!apiKey) {
        return api.sendMessage("❌ API key not found in config.", threadID, messageID);
    }

    // Unsend the list message
    if (replyData.messageIDToDelete) {
        api.unsendMessage(replyData.messageIDToDelete);
    }

    const processingMsg = await api.sendMessage(`⏳ Processing: ${video.title}...`, threadID, messageID);

    try {
        // Call the API
        const apiUrl = "https://priyanshuapi.xyz/api/runner/youtube-downloader-v2/download";
        const response = await axios.post(
            apiUrl,
            {
                link: videoUrl,
                format: "mp3",
                videoQuality: "360",
            },
            {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                },
