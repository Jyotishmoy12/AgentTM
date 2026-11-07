import { links } from '../../content';
import { Brand } from '../atoms/Brand';

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-top">
          <Brand />
          <nav aria-label="Footer">
            <a href={links.repo}>GitHub</a>
            <a href={links.releases}>Releases</a>
            <a href={links.docs}>Documentation</a>
            <a href={links.license}>License</a>
          </nav>
        </div>
        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} AgentTM. All rights reserved.</p>
          <p>Public repository · Proprietary license</p>
        </div>
      </div>
    </footer>
  );
}
