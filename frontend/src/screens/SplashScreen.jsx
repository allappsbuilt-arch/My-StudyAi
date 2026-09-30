/** Splash screen - logo tile + name, shown while the saved session is restored. */
import { LogoMark } from '../components/Brand';

export default function SplashScreen() {
  return (
    <div className="splash-v2" role="status" aria-label="Loading MyStudyAI">
      <div className="splash-tile">
        <LogoMark size={128} className="" />
      </div>
      <div className="splash-name">MyStudyAI</div>
      <div className="splash-dots" aria-hidden="true"><span /><span /><span /></div>
    </div>
  );
}
