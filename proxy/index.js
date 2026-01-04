const express = require('express');
const { Storage } = require('@google-cloud/storage');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { spawn } = require('child_process');
const bodyParser = require('body-parser');
const { Resend } = require('resend');

const app = express();
const resend = new Resend(process.env.RESEND_API_KEY || 're_123'); 

// Use JSON for API, but Stripe needs raw body for signature verification
app.use((req, res, next) => {
  if (req.originalUrl === '/webhook/stripe') {
    next();
  } else {
    cors()(req, res, next);
  }
});

app.use(express.json()); 

const storage = new Storage();
const bucketName = process.env.CYBERHOUND_BUCKET || 'cyberhound-raw-intel';

const { BigQuery } = require('@google-cloud/bigquery');
const bigquery = new BigQuery();

// --- NEW: The Tracking Redirect Endpoint (/go/:dealId) ---
app.get('/go/:dealId', async (req, res) => {
    const { dealId } = req.params;
    
    // 1. Fetch Deal (Ideally from DB, here simplified to fetch from JSON/Cache)
    // For cloud native speed, we might cache this map in memory or Redis.
    // Here we download the JSON for simplicity of the demo.
    let targetUrl = 'https://cyberhound.tech'; // Safe fallback
    let brand = 'Unknown';
    
    try {
        const file = storage.bucket(bucketName).file('latest_deals.json');
        const [content] = await file.download();
        const deals = JSON.parse(content.toString());
        const deal = deals.find(d => String(d.id) === String(dealId));
        
        if (deal) {
            targetUrl = deal.url; // This is already the Affiliate Wrapped URL
            brand = deal.brand;
            
            // 2. Log to Click Vault (BigQuery)
            // Note: Ensure `cyberhound_analytics.clicks` table exists
            const row = {
                deal_id: String(dealId),
                brand: brand,
                timestamp: bigquery.datetime(new Date().toISOString()),
                user_agent: req.get('User-Agent') || 'Unknown',
                ip: req.ip // Be careful with PII regulations
            };
            
            // Async insert (Fire and forget to not slow down user)
            bigquery
                .dataset('cyberhound_analytics')
                .table('clicks')
                .insert([row])
                .catch(err => console.error('BQ Insert Error:', err));
                
            console.log(`[TRACKING] Click: ${dealId} (${brand}) -> Redirecting...`);
        }
    } catch (e) {
        console.error("Redirect Error:", e);
    }

    res.redirect(targetUrl);
});

// --- API: Activity Feed (Social Proof) ---
app.get('/api/activity', (req, res) => {
    // In prod, pull this from a 'events' table or cache.
    // For the demo, we mock live updates.
    res.json([
        { type: 'SNIPER', msg: 'New Sniper joined from Toronto', time: '2m ago' },
        { type: 'DETECT', msg: 'Cloud Brain found high-value SAAS intel', time: '8m ago' },
        { type: 'SALE', msg: 'Shopify.com upgraded to INFERNO status', time: '22m ago' },
        { type: 'BLAST', msg: 'Veo generated new ad for Adobe Creative Cloud', time: '45m ago' },
        { type: 'SYSTEM', msg: 'Nose completed crawl: 42 targets scanned', time: '1h ago' }
    ]);
});

// --- API: Get Intel (Existing) ---
app.get('/api/intel', async (req, res) => {
    try {
        const file = storage.bucket(bucketName).file('latest_deals.json');
        const [exists] = await file.exists();
        if (!exists) {
            return res.json([{ id: 1, brand: "SYSTEM", summary: "Waiting for signal...", value_score: 0, discount_amount: 0, duration_months: 0 }]);
        }
        const [content] = await file.download();
        const data = JSON.parse(content.toString());
        res.json(data);
      } catch (error) {
        console.error("Intel Failure:", error);
        res.status(500).json({ error: "INTEL_RETRIEVAL_FAILURE" });
      }
});

// --- API: Sniper Signup ---
app.post('/api/sniper/subscribe', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({error: "Email required"});
    
    try {
        const bucket = storage.bucket(bucketName);
        const file = bucket.file('snipers_list.json');
        
        let snipers = [];
        try {
            const [content] = await file.download();
            snipers = JSON.parse(content.toString());
        } catch(e) {}
        
        if (!snipers.includes(email)) {
            snipers.push(email);
            if (process.env.RESEND_API_KEY) {
                await resend.emails.send({
                    from: 'Cyberhound <intel@cyberhound.tech>',
                    to: email,
                    subject: 'Target Acquired: Sniper Access Granted',
                    html: '<p>You are now tracking high-value intel. Stay frosty. - Cyberhound HQ</p>'
                });
            }
        }
        
        await file.save(JSON.stringify(snipers));
        res.json({ status: "ACQUIRED" });
        
    } catch(e) {
        console.log(`[SNIPER] New Subscriber: ${email}`);
        res.json({ status: "ACQUIRED_LOCAL" });
    }
});

// --- API: Promote (Revenue Layer) ---
app.post('/api/promote', async (req, res) => {
    const { dealId, packageType } = req.body;
    
    // Official Stripe Price IDs created via MCP
    const priceId = packageType === 'inferno' 
        ? 'price_1Sloh8CzqBvMqSYFG6R4bX8u' // Inferno ($149)
        : 'price_1Sloh7CzqBvMqSYFKDjJKPM7'; // Flame ($49)

    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price: priceId,
                quantity: 1,
            }],
            mode: 'payment',
            success_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/success`,
            cancel_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/cancel`,
            metadata: { dealId, packageType }
        });
        
        res.json({ url: session.url });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- WEBHOOK: Stripe Listener ---
app.post('/webhook/stripe', bodyParser.raw({type: 'application/json'}), async (req, req_res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        return req_res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const { dealId, packageType } = session.metadata;

        console.log(`[$$$] Payment Received: ${packageType} for Deal ${dealId}`);

        try {
            await updateDealStatus(dealId, packageType);
        } catch(e) { console.error("Update Status Failed", e); }

        if (packageType === 'inferno') {
           console.log("[!!!] INFERNO SEQUENCE INITIATED");
           await triggerBlastSequence(dealId);
        }
    }

    req_res.json({received: true});
});

async function updateDealStatus(dealId, packageType) {
    const bucket = storage.bucket(bucketName);
    const file = bucket.file('latest_deals.json');
    const [content] = await file.download();
    let deals = JSON.parse(content.toString());

    deals = deals.map(d => {
        if (String(d.id) === String(dealId)) {
            d.promoted = true;
            d.package = packageType; 
        }
        return d;
    });

    await file.save(JSON.stringify(deals, null, 2));
    console.log(`[+] Deal ${dealId} promoted in ledger.`);
}

async function triggerBlastSequence(dealId) {
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(`triggers/blast_${dealId}_${Date.now()}.json`);
    await file.save(JSON.stringify({ action: "inferno_blast", dealId, timestamp: Date.now() }));
    console.log("[+] Blast Trigger Dropped.");
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Colony OS Proxy: Online on Port ${PORT}`));
