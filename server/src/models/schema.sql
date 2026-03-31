CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS syllabi (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  course_title VARCHAR(255) NOT NULL,
  course_code VARCHAR(100),
  department VARCHAR(255),
  duration INTEGER, -- Total hours
  description TEXT,
  objectives TEXT,
  syllabus_json JSONB, -- Storing full syllabus structure as JSON
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS question_banks (
  id SERIAL PRIMARY KEY,
  syllabus_id INTEGER REFERENCES syllabi(id),
  difficulty VARCHAR(50),
  questions JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS course_notes (
  id SERIAL PRIMARY KEY,
  syllabus_id INTEGER REFERENCES syllabi(id) ON DELETE CASCADE,
  notes_json JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
