import { useNavigate } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Page } from '../navigation/AppLayout';
import { EmptyState } from '../components/Feedback';
import Button from '../components/Button';

export default function NotFoundScreen() {
  const navigate = useNavigate();
  return (
    <Page>
      <EmptyState icon={Compass} title="Page not found" message="The page you’re looking for doesn’t exist." action={<Button onClick={() => navigate('/home')}>Go to Home</Button>} />
    </Page>
  );
}
