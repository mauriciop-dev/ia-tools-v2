-- Supabase Schema for IA Tools 2.0

-- Table for tracking sources
CREATE TABLE IF NOT EXISTS sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('X', 'YouTube', 'Blog', 'Other')),
    url TEXT UNIQUE NOT NULL,
    last_processed_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for storing processed news
CREATE TABLE IF NOT EXISTS news (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID REFERENCES sources(id) ON DELETE SET NULL,
    title TEXT UNIQUE NOT NULL,
    summary TEXT NOT NULL,
    technology TEXT NOT NULL,
    use_cases JSONB NOT NULL DEFAULT '[]',
    platform TEXT NOT NULL,
    is_new BOOLEAN DEFAULT TRUE,
    published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for social media publications generated
CREATE TABLE IF NOT EXISTS publications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    news_id UUID REFERENCES news(id) ON DELETE CASCADE,
    copy TEXT NOT NULL,
    image_url TEXT,
    platform TEXT NOT NULL, -- e.g., 'LinkedIn', 'Facebook'
    engagement_metrics JSONB DEFAULT '{}',
    is_published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Initial sources seed
INSERT INTO sources (name, platform, url) VALUES
('Google Gemma', 'X', 'https://x.com/googlegemma'),
('Chrome Unboxed', 'X', 'https://x.com/chromeunboxed'),
('Google Cloud', 'X', 'https://x.com/googlecloud'),
('Google Cloud Tech', 'X', 'https://x.com/googlecloudtech'),
('OpenRouter', 'X', 'https://x.com/openrouter'),
('Chromium Dev', 'X', 'https://x.com/chromiumdev'),
('Google Workspace', 'X', 'https://x.com/googleworkspace'),
('Cloudflare Dev', 'X', 'https://x.com/cloudflaredev'),
('NotebookLM', 'X', 'https://x.com/notebooklm'),
('Google DeepMind', 'X', 'https://x.com/googledeepmind')
ON CONFLICT (url) DO NOTHING;
