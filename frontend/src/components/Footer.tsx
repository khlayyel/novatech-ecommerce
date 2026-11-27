import Logo from './Logo';
import { useI18n } from '../i18n';

/** Pied de page : identité, liens, mentions académiques. */
const Footer = () => {
  const { t } = useI18n();

  return (
    <footer className="footer">
      <div className="container footer__grid">
        <div>
          <Logo />
          <p className="footer__tagline">{t('footer.tagline')}</p>
        </div>
        <div>
          <h3 className="footer__title">{t('footer.shop')}</h3>
          <ul className="footer__list">
            <li><a href="/#catalogue">{t('nav.catalog')}</a></li>
            <li><a href="/cart">{t('footer.cart')}</a></li>
            <li><a href="/orders">{t('footer.tracking')}</a></li>
          </ul>
        </div>
        <div>
          <h3 className="footer__title">{t('footer.project')}</h3>
          <ul className="footer__list">
            <li>{t('footer.tech')}</li>
            <li>{t('footer.api')}</li>
            <li>{t('footer.stripe')}</li>
          </ul>
        </div>
      </div>
      <div className="footer__bottom">
        <div className="container">
          <p>{t('footer.copyright', { year: new Date().getFullYear() })}</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
