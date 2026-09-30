/** App-wide constants. */

export const APP_NAME = 'MyStudyAI';

export const SUBJECTS = [
  'Mathematics', 'Physics', 'Chemistry', 'Biology', 'History', 'Geography', 'Literature', 'Languages',
  'Computer Science', 'Economics', 'Business', 'Psychology', 'Medicine', 'Law', 'Engineering', 'Art', 'Music',
];

export const EDUCATION_LEVELS = ['Middle School', 'High School', 'Undergraduate', 'Postgraduate', 'Professional Exam', 'Self-Study'];

export const STUDY_METHODS = ['Flashcards', 'Practice Tests', 'Reading Summaries', 'Video Summaries', 'Voice Quizzing'];

export const DIFFICULTIES = [
  { value: 'easy', label: 'Easy', hint: 'Recall and basic understanding' },
  { value: 'medium', label: 'Medium', hint: 'Apply concepts to problems' },
  { value: 'hard', label: 'Hard', hint: 'Analysis and multi-step reasoning' },
];

// Must match the backend's upload whitelist (backend/middleware/upload.js)
export const ACCEPTED_FILES = {
  accept: '.pdf,.mp4,.docx,.txt,.md,.jpg,.jpeg,.png,.webp,.gif',
  extensions: ['pdf', 'mp4', 'docx', 'txt', 'md', 'jpg', 'jpeg', 'png', 'webp', 'gif'],
  maxSizeMB: 50,
  labels: ['PDF', 'MP4', 'DOCX', 'TXT', 'Images'],
};

export const TUTOR_SUGGESTIONS = [
  { emoji: '📘', text: 'Explain photosynthesis simply' },
  { emoji: '🧮', text: 'Solve 2x² − 8x + 6 = 0 step by step' },
  { emoji: '📝', text: 'Make me a 1-week exam study plan' },
  { emoji: '💡', text: 'Give me memory tricks for the periodic table' },
];
