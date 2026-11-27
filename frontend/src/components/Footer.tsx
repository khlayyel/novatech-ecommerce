import Logo from './Logo';
import { useI18n } from '../i18n';

/** Pied de page : identité, boutique, aide et contact. */
const Footer = () => {
  const { t } = useI18n();

  return (
    <footer className="footer">
      <div className="container footer__grid">
        <div>
          <Logo />
          <p className="footer__tagline">{t('footer.tagline')}</p>
          <p className="footer__badge">🔒 {t('footer.secure')}</p>
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
          <h3 className="footer__title">{t('footer.help')}</h3>
          <ul className="footer__list">
            <li><a href="/#catalogue">{t('footer.delivery')}</a></li>
            <li><a href="/orders">{t('footer.returns')}</a></li>
            <li><a href="mailto:contact@novatech.fr">{t('footer.contact')}</a></li>
          </ul>
        </div>

        <div>
          <h3 className="footer__title">{t('footer.contact')}</h3>
          <ul className="footer__list">
            <li><a href="mailto:contact@novatech.fr">{t('footer.email')}</a></li>
            <li>{t('footer.hours')}</li>
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
