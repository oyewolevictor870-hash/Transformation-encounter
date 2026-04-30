-- TRANSFORMATION ENCOUNTER GROUP - DATABASE SCHEMA
-- Run this file first to set up all tables

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(20) DEFAULT 'pending' CHECK (role IN ('pending', 'member', 'worker', 'admin')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended')),
    profile_photo VARCHAR(255),
    bio TEXT,
    birthday DATE,
    salvation_date DATE,
    baptism_date DATE,
    address TEXT,
    department VARCHAR(100),
    whatsapp_number VARCHAR(20),
    dark_mode BOOLEAN DEFAULT FALSE,
    onboarding_complete BOOLEAN DEFAULT FALSE,
    last_active TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    approved_at TIMESTAMP,
    approved_by UUID REFERENCES users(id)
);

-- POSTS / ANNOUNCEMENTS / DEVOTIONALS (HOME FEED)
CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID REFERENCES users(id) ON DELETE SET NULL,
    type VARCHAR(30) CHECK (type IN ('announcement', 'devotional', 'event_update', 'celebration', 'general', 'newsletter', 'quote')),
    title VARCHAR(255),
    content TEXT NOT NULL,
    image_url VARCHAR(255),
    is_pinned BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    scheduled_at TIMESTAMP,
    published_at TIMESTAMP DEFAULT NOW(),
    is_published BOOLEAN DEFAULT TRUE,
    read_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- POST REACTIONS
CREATE TABLE IF NOT EXISTS post_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    reaction VARCHAR(20) CHECK (reaction IN ('amen', 'praying', 'blessed', 'fire', 'like')),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);

-- POST COMMENTS
CREATE TABLE IF NOT EXISTS post_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- POST BOOKMARKS
CREATE TABLE IF NOT EXISTS post_bookmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);

-- POST READ TRACKING
CREATE TABLE IF NOT EXISTS post_reads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    read_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);

-- QUESTIONS
CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    is_anonymous BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- QUESTION ANSWERS
CREATE TABLE IF NOT EXISTS question_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- PRAYER REQUESTS
CREATE TABLE IF NOT EXISTS prayer_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    is_public BOOLEAN DEFAULT TRUE,
    is_anonymous BOOLEAN DEFAULT FALSE,
    is_emergency BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'answered', 'archived')),
    created_at TIMESTAMP DEFAULT NOW()
);

-- PRAYER INTERCESSIONS (I am praying for this)
CREATE TABLE IF NOT EXISTS prayer_intercessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prayer_id UUID REFERENCES prayer_requests(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(prayer_id, user_id)
);

-- TESTIMONIES
CREATE TABLE IF NOT EXISTS testimonies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    image_url VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- EVENTS
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP,
    location VARCHAR(255),
    virtual_link VARCHAR(500),
    is_virtual BOOLEAN DEFAULT FALSE,
    is_public BOOLEAN DEFAULT TRUE,
    flyer_url VARCHAR(255),
    max_attendees INT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- EVENT REGISTRATIONS / RSVPs
CREATE TABLE IF NOT EXISTS event_rsvps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'attending' CHECK (status IN ('attending', 'not_attending', 'maybe')),
    checked_in BOOLEAN DEFAULT FALSE,
    checked_in_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

-- FLYERS
CREATE TABLE IF NOT EXISTS flyers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    image_url VARCHAR(255) NOT NULL,
    is_public BOOLEAN DEFAULT TRUE,
    download_count INT DEFAULT 0,
    share_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- CELEBRATIONS
CREATE TABLE IF NOT EXISTS celebrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID REFERENCES users(id),
    user_id UUID REFERENCES users(id),
    type VARCHAR(30) CHECK (type IN ('birthday', 'anniversary', 'milestone', 'achievement', 'other')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    image_url VARCHAR(255),
    is_auto BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- CELEBRATION REACTIONS
CREATE TABLE IF NOT EXISTS celebration_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    celebration_id UUID REFERENCES celebrations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(celebration_id, user_id)
);

-- CELEBRATION COMMENTS
CREATE TABLE IF NOT EXISTS celebration_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    celebration_id UUID REFERENCES celebrations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- PAYMENTS (DUES + GIVING)
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(30) CHECK (type IN ('dues', 'offering', 'tithe', 'special_project', 'general')),
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'NGN',
    reference VARCHAR(255) UNIQUE,
    paystack_reference VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'successful', 'failed')),
    project_id UUID,
    month_year VARCHAR(10),
    receipt_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    verified_at TIMESTAMP
);

-- GIVING PROJECTS (Special Projects)
CREATE TABLE IF NOT EXISTS giving_projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    goal_amount DECIMAL(12,2) NOT NULL,
    collected_amount DECIMAL(12,2) DEFAULT 0,
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- DUES SETTINGS
CREATE TABLE IF NOT EXISTS dues_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    amount DECIMAL(12,2) NOT NULL,
    month_year VARCHAR(10) NOT NULL,
    set_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- SERMONS
CREATE TABLE IF NOT EXISTS sermons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    speaker VARCHAR(150),
    description TEXT,
    audio_url VARCHAR(500),
    video_url VARCHAR(500),
    thumbnail_url VARCHAR(255),
    duration VARCHAR(20),
    series VARCHAR(150),
    tags TEXT,
    listen_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- SERMON BOOKMARKS
CREATE TABLE IF NOT EXISTS sermon_bookmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sermon_id UUID REFERENCES sermons(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(sermon_id, user_id)
);

-- SERMON NOTES
CREATE TABLE IF NOT EXISTS sermon_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sermon_id UUID REFERENCES sermons(id),
    author_id UUID REFERENCES users(id),
    title VARCHAR(255),
    content TEXT NOT NULL,
    is_published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- BIBLE READING PLAN
CREATE TABLE IF NOT EXISTS bible_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    month_year VARCHAR(10),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- BIBLE PLAN DAYS
CREATE TABLE IF NOT EXISTS bible_plan_days (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID REFERENCES bible_plans(id) ON DELETE CASCADE,
    day_number INT NOT NULL,
    reference VARCHAR(255) NOT NULL,
    passage TEXT,
    reflection TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- BIBLE PLAN PROGRESS
CREATE TABLE IF NOT EXISTS bible_plan_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID REFERENCES bible_plans(id) ON DELETE CASCADE,
    day_id UUID REFERENCES bible_plan_days(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    completed_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(day_id, user_id)
);

-- FASTING PERIODS
CREATE TABLE IF NOT EXISTS fasting_periods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    duration_days INT,
    instructions TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- FASTING PARTICIPANTS
CREATE TABLE IF NOT EXISTS fasting_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fast_id UUID REFERENCES fasting_periods(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(fast_id, user_id)
);

-- PRAYER POINTS
CREATE TABLE IF NOT EXISTS prayer_points (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID REFERENCES users(id),
    date DATE NOT NULL,
    title VARCHAR(255),
    points TEXT NOT NULL,
    scripture VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

-- PRAYER POINT CONFIRMATIONS
CREATE TABLE IF NOT EXISTS prayer_point_confirmations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    point_id UUID REFERENCES prayer_points(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    confirmed_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(point_id, user_id)
);

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    link VARCHAR(500),
    is_read BOOLEAN DEFAULT FALSE,
    sent_email BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- GROUP CHAT MESSAGES
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room VARCHAR(50) NOT NULL DEFAULT 'general',
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    image_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

-- DIRECT MESSAGES
CREATE TABLE IF NOT EXISTS direct_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- POLLS
CREATE TABLE IF NOT EXISTS polls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID REFERENCES users(id),
    question TEXT NOT NULL,
    end_date TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- POLL OPTIONS
CREATE TABLE IF NOT EXISTS poll_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    poll_id UUID REFERENCES polls(id) ON DELETE CASCADE,
    option_text VARCHAR(255) NOT NULL,
    vote_count INT DEFAULT 0
);

-- POLL VOTES
CREATE TABLE IF NOT EXISTS poll_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    poll_id UUID REFERENCES polls(id) ON DELETE CASCADE,
    option_id UUID REFERENCES poll_options(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(poll_id, user_id)
);

-- RESOURCES (PDFs, Study Materials)
CREATE TABLE IF NOT EXISTS resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_url VARCHAR(500) NOT NULL,
    file_type VARCHAR(20),
    category VARCHAR(100),
    download_count INT DEFAULT 0,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- PHOTO GALLERY
CREATE TABLE IF NOT EXISTS gallery (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    image_url VARCHAR(500) NOT NULL,
    event_id UUID REFERENCES events(id),
    is_public BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- VIDEO CONTENT
CREATE TABLE IF NOT EXISTS videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    video_url VARCHAR(500) NOT NULL,
    thumbnail_url VARCHAR(255),
    duration VARCHAR(20),
    is_public BOOLEAN DEFAULT FALSE,
    view_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- VOICE ROOMS
CREATE TABLE IF NOT EXISTS voice_rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(30) CHECK (type IN ('general_prayer', 'workers_meeting')),
    is_active BOOLEAN DEFAULT FALSE,
    started_by UUID REFERENCES users(id),
    started_at TIMESTAMP,
    ended_at TIMESTAMP,
    participant_count INT DEFAULT 0
);

-- SCRIPTURES OF THE DAY
CREATE TABLE IF NOT EXISTS scripture_of_day (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE UNIQUE NOT NULL,
    reference VARCHAR(100) NOT NULL,
    text TEXT NOT NULL,
    reflection TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- WORSHIP LYRICS
CREATE TABLE IF NOT EXISTS worship_lyrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID REFERENCES users(id),
    song_title VARCHAR(255) NOT NULL,
    artist VARCHAR(150),
    lyrics TEXT NOT NULL,
    key_signature VARCHAR(10),
    created_at TIMESTAMP DEFAULT NOW()
);

-- MINISTRY NEWSLETTER
CREATE TABLE IF NOT EXISTS newsletters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    published_at TIMESTAMP DEFAULT NOW(),
    is_published BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- SPIRITUAL GROWTH TRACKER
CREATE TABLE IF NOT EXISTS spiritual_milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) CHECK (type IN ('salvation', 'baptism', 'holy_spirit', 'testimony', 'custom')),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    milestone_date DATE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- VISITOR CONTACTS (from contact form)
CREATE TABLE IF NOT EXISTS visitor_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150),
    phone VARCHAR(20),
    message TEXT NOT NULL,
    follow_up_status VARCHAR(30) DEFAULT 'new' CHECK (follow_up_status IN ('new', 'contacted', 'resolved')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- LIVE STREAM
CREATE TABLE IF NOT EXISTS live_streams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    stream_url VARCHAR(500),
    is_live BOOLEAN DEFAULT FALSE,
    started_by UUID REFERENCES users(id),
    started_at TIMESTAMP,
    ended_at TIMESTAMP,
    viewer_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- WORKER ACTION LOG
CREATE TABLE IF NOT EXISTS worker_action_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_id UUID REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(255) NOT NULL,
    details TEXT,
    ip_address VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

-- DEPARTMENTS / UNITS
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    description TEXT,
    leader_id UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- DEPARTMENT MEMBERS
CREATE TABLE IF NOT EXISTS department_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(100),
    joined_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(department_id, user_id)
);

-- INDEXES for performance
CREATE INDEX IF NOT EXISTS idx_posts_type ON posts(type);
CREATE INDEX IF NOT EXISTS idx_posts_published ON posts(is_published, published_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_prayers_user ON prayer_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_birthday ON users(birthday);
CREATE INDEX IF NOT EXISTS idx_chat_room ON chat_messages(room, created_at);
