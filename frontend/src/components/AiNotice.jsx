/**
 * Small notice shown on AI screens when the backend has no AI_API_KEY.
 * Everything else in the app keeps working without a key.
 */
import { KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Alert } from './Feedback';

export const AI_NOT_CONFIGURED_TEXT = 'AI features require an AI API key. Please configure AI_API_KEY in Backend/.env and restart the AI server.';

export default function AiNotice({ style }) {
  const { aiConfigured } = useAuth();
  if (aiConfigured) return null;
  return (
    <div style={style}>
      <Alert type="info" icon={KeyRound}>
        {AI_NOT_CONFIGURED_TEXT}
      </Alert>
    </div>
  );
}
