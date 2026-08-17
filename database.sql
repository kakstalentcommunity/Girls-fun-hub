-- Girls Fun Hub reference schema.
-- The JavaScript MVP runs from data/seed.json and data/db.json.
-- Use this SQL as a migration starting point if moving to MySQL.

CREATE TABLE users (
  id VARCHAR(32) PRIMARY KEY,
  username VARCHAR(80) NOT NULL UNIQUE,
  email VARCHAR(180) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  date_of_birth DATE NOT NULL,
  adult_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  disabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_profiles (
  user_id VARCHAR(32) PRIMARY KEY,
  bio VARCHAR(300),
  profile_picture VARCHAR(300),
  favorite_categories JSON,
  games_played INT NOT NULL DEFAULT 0,
  challenges_joined INT NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE admin_users (
  id VARCHAR(32) PRIMARY KEY,
  username VARCHAR(80) NOT NULL UNIQUE,
  email VARCHAR(180) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL UNIQUE
);

CREATE TABLE games (
  id VARCHAR(80) PRIMARY KEY,
  title VARCHAR(140) NOT NULL,
  category VARCHAR(80) NOT NULL,
  description VARCHAR(300) NOT NULL,
  image_label VARCHAR(20)
);

CREATE TABLE game_prompts (
  id VARCHAR(32) PRIMARY KEY,
  game_id VARCHAR(80) NOT NULL,
  prompt_type VARCHAR(40) NOT NULL,
  prompt_text VARCHAR(500) NOT NULL,
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
  INDEX idx_game_prompts_game_type (game_id, prompt_type)
);

CREATE TABLE would_you_rather_rounds (
  id VARCHAR(32) PRIMARY KEY,
  question VARCHAR(240) NOT NULL,
  option_a VARCHAR(160) NOT NULL,
  option_b VARCHAR(160) NOT NULL,
  votes_a INT NOT NULL DEFAULT 0,
  votes_b INT NOT NULL DEFAULT 0
);

CREATE TABLE would_you_rather_votes (
  round_id VARCHAR(32) NOT NULL,
  user_id VARCHAR(32) NOT NULL,
  option_code CHAR(1) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (round_id, user_id),
  FOREIGN KEY (round_id) REFERENCES would_you_rather_rounds(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE quizzes (
  id VARCHAR(80) PRIMARY KEY,
  title VARCHAR(160) NOT NULL,
  description VARCHAR(300) NOT NULL,
  category VARCHAR(80) NOT NULL,
  image_label VARCHAR(20),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE quiz_questions (
  id VARCHAR(32) PRIMARY KEY,
  quiz_id VARCHAR(80) NOT NULL,
  question_text VARCHAR(240) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
);

CREATE TABLE quiz_answers (
  id VARCHAR(32) PRIMARY KEY,
  question_id VARCHAR(32) NOT NULL,
  answer_text VARCHAR(180) NOT NULL,
  result_key VARCHAR(60) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  FOREIGN KEY (question_id) REFERENCES quiz_questions(id) ON DELETE CASCADE
);

CREATE TABLE quiz_results (
  id VARCHAR(32) PRIMARY KEY,
  user_id VARCHAR(32),
  quiz_id VARCHAR(80) NOT NULL,
  result_key VARCHAR(60) NOT NULL,
  score INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
  INDEX idx_quiz_results_user (user_id)
);

CREATE TABLE challenges (
  id VARCHAR(32) PRIMARY KEY,
  title VARCHAR(160) NOT NULL,
  description VARCHAR(320) NOT NULL,
  category VARCHAR(80) NOT NULL,
  difficulty VARCHAR(40) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE challenge_participants (
  challenge_id VARCHAR(32) NOT NULL,
  user_id VARCHAR(32) NOT NULL,
  joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (challenge_id, user_id),
  FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE polls (
  id VARCHAR(32) PRIMARY KEY,
  question VARCHAR(220) NOT NULL,
  category VARCHAR(80) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE poll_options (
  id VARCHAR(32) PRIMARY KEY,
  poll_id VARCHAR(32) NOT NULL,
  option_text VARCHAR(160) NOT NULL,
  votes INT NOT NULL DEFAULT 0,
  FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE
);

CREATE TABLE poll_votes (
  poll_id VARCHAR(32) NOT NULL,
  option_id VARCHAR(32) NOT NULL,
  user_id VARCHAR(32) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (poll_id, user_id),
  FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE,
  FOREIGN KEY (option_id) REFERENCES poll_options(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE articles (
  id VARCHAR(32) PRIMARY KEY,
  title VARCHAR(180) NOT NULL,
  slug VARCHAR(180) NOT NULL UNIQUE,
  excerpt VARCHAR(300) NOT NULL,
  content TEXT NOT NULL,
  featured_image VARCHAR(300),
  category VARCHAR(80) NOT NULL,
  author VARCHAR(100) NOT NULL,
  published BOOLEAN NOT NULL DEFAULT TRUE,
  views INT NOT NULL DEFAULT 0,
  published_date DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_articles_slug (slug),
  INDEX idx_articles_category (category)
);

CREATE TABLE posts (
  id VARCHAR(32) PRIMARY KEY,
  user_id VARCHAR(32),
  body VARCHAR(900) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_posts_created_at (created_at)
);

CREATE TABLE comments (
  id VARCHAR(32) PRIMARY KEY,
  post_id VARCHAR(32) NOT NULL,
  user_id VARCHAR(32),
  body VARCHAR(600) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE likes (
  id VARCHAR(32) PRIMARY KEY,
  user_id VARCHAR(32) NOT NULL,
  target_type VARCHAR(40) NOT NULL,
  target_id VARCHAR(32) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_like (user_id, target_type, target_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE notifications (
  id VARCHAR(32) PRIMARY KEY,
  user_id VARCHAR(32) NOT NULL,
  message VARCHAR(240) NOT NULL,
  link VARCHAR(180),
  read_flag BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_notifications_user_read (user_id, read_flag)
);

CREATE TABLE reports (
  id VARCHAR(32) PRIMARY KEY,
  user_id VARCHAR(32) NOT NULL,
  item_type VARCHAR(40) NOT NULL,
  item_id VARCHAR(32) NOT NULL,
  reason VARCHAR(80) NOT NULL,
  details VARCHAR(600),
  reviewed BOOLEAN NOT NULL DEFAULT FALSE,
  reviewed_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_reports_reviewed (reviewed)
);

-- Demo content for the JavaScript version lives in data/seed.json.
