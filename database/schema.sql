-- Cyberhound Database Schema
-- Operational Order #11 (Updated for Sniper Layer)

CREATE TABLE IF NOT EXISTS sites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    reputation_score REAL DEFAULT 1.0, 
    status TEXT DEFAULT 'active', 
    process_status TEXT DEFAULT 'idle', 
    raw_content TEXT, 
    last_checked DATETIME
);

CREATE TABLE IF NOT EXISTS deals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id INTEGER,
    brand TEXT,
    code TEXT,
    discount_amount REAL, 
    duration_months INTEGER,
    value_score REAL,
    summary TEXT,
    raw_text TEXT,
    detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'active',
    url TEXT, 
    FOREIGN KEY(site_id) REFERENCES sites(id)
);

CREATE TABLE IF NOT EXISTS snipers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    status TEXT DEFAULT 'active', -- active, unsubscribed
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    deal_id INTEGER,
    recipient_email TEXT,
    channel TEXT DEFAULT 'email', 
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(deal_id) REFERENCES deals(id)
);
