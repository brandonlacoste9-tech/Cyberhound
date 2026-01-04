const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const { Storage } = require('@google-cloud/storage');

// NOTE: This usually runs in a separate Cloud Function or Worker Node
// It needs valid OAuth2 tokens for YouTube.

const storage = new Storage();
const bucketName = process.env.CYBERHOUND_BUCKET;

const OAUTH2_CLIENT = new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET,
    process.env.YOUTUBE_REDIRECT_URI
);

// Load saved tokens (In prod: Fetch from DB/Secret Manager)
OAUTH2_CLIENT.setCredentials({
    refresh_token: process.env.YOUTUBE_REFRESH_TOKEN
});

const youtube = google.youtube({
    version: 'v3',
    auth: OAUTH2_CLIENT
});

async function uploadShort(deal) {
    const videoFilename = `ad_${deal.id}_${deal.brand}.mp4`;
    const localPath = `/tmp/${videoFilename}`;
    
    console.log(`[SOCIAL] Fetching video for ${deal.brand}...`);
    
    // 1. Download Video from Bucket
    try {
        await storage.bucket(bucketName).file(`videos/${videoFilename}`).download({ destination: localPath });
    } catch(e) {
        console.error("Video not found in storage:", e);
        return;
    }

    // 2. Upload to YouTube Shorts
    console.log(`[SOCIAL] Uploading to YouTube Shorts...`);
    try {
        const res = await youtube.videos.insert({
            part: 'snippet,status',
            requestBody: {
                snippet: {
                    title: `🔥 ${deal.brand} Deal Alert! #Shorts #TechDeals`,
                    description: `Get the deal here: ${deal.affiliate_url}\n\nCyberhound Intelligence: ${deal.value_score}V Detected.\n#Cyberhound`,
                    tags: ['tech', 'deals', 'software', deal.brand.toLowerCase()],
                    categoryId: '28' // Science & Technology
                },
                status: {
                    privacyStatus: 'public', // Set to 'private' for testing
                    selfDeclaredMadeForKids: false
                }
            },
            media: {
                body: fs.createReadStream(localPath)
            }
        });
        
        console.log(`[SOCIAL] Upload Complete! Video ID: ${res.data.id}`);
        // Optionally update DB with video link
        
    } catch (e) {
        console.error("YouTube Upload Failed:", e.message);
    }
}

// Simple trigger wrapper for Colony OS Integration
async function handleDistributionBlast(dealId) {
    // Ideally, fetch FULL deal object from DB/JSON
    const deal = { 
        id: dealId, 
        brand: 'SYSTEM_TEST', 
        value_score: 999, 
        affiliate_url: 'https://cyberhound.tech' 
    }; 
    await uploadShort(deal);
}

// Allow standalone execution
if (require.main === module) {
    const args = process.argv.slice(2);
    if (args.length > 0) {
        handleDistributionBlast(args[0]);
    }
}

module.exports = { uploadShort };
