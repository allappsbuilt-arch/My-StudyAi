/** Languages offered by the Translate tools (name for the AI, BCP-47 code for speech, flag). */
export const TRANSLATE_LANGUAGES = [
  { name: 'English', code: 'en-US', flag: '🇬🇧' },
  { name: 'Hindi', code: 'hi-IN', flag: '🇮🇳' },
  { name: 'Spanish', code: 'es-ES', flag: '🇪🇸' },
  { name: 'French', code: 'fr-FR', flag: '🇫🇷' },
  { name: 'German', code: 'de-DE', flag: '🇩🇪' },
  { name: 'Bengali', code: 'bn-IN', flag: '🇧🇩' },
  { name: 'Tamil', code: 'ta-IN', flag: '🇮🇳' },
  { name: 'Telugu', code: 'te-IN', flag: '🇮🇳' },
  { name: 'Marathi', code: 'mr-IN', flag: '🇮🇳' },
  { name: 'Urdu', code: 'ur-PK', flag: '🇵🇰' },
  { name: 'Arabic', code: 'ar-SA', flag: '🇸🇦' },
  { name: 'Chinese', code: 'zh-CN', flag: '🇨🇳' },
  { name: 'Japanese', code: 'ja-JP', flag: '🇯🇵' },
  { name: 'Korean', code: 'ko-KR', flag: '🇰🇷' },
  { name: 'Portuguese', code: 'pt-BR', flag: '🇧🇷' },
  { name: 'Russian', code: 'ru-RU', flag: '🇷🇺' },
  { name: 'Italian', code: 'it-IT', flag: '🇮🇹' },
];

export const langByName = (name) => TRANSLATE_LANGUAGES.find((l) => l.name === name) || TRANSLATE_LANGUAGES[0];
