import Logo from './Logo';

/** Pied de page : identité, liens, mentions académiques. */
const Footer = () => (
  <footer className="footer">
    <div className="container footer__grid">
      <div>
        <Logo />
        <p className="footer__tagline">
          Le matériel informatique, en toute confiance. Paiement sécurisé par Stripe, commandes suivies en temps réel.
        </p>
      </div>
      <div>
        <h3 className="footer__title">Boutique</h3>
        <ul className="footer__list">
          <li><a href="/#catalogue">Catalogue</a></li>
          <li><a href="/cart">Mon panier</a></li>
          <li><a href="/orders">Suivi de commande</a></li>
        </ul>
      </div>
      <div>
        <h3 className="footer__title">Projet</h3>
        <ul className="footer__list">
          <li>React + TypeScript + Vite</li>
          <li>Node.js + Express + MongoDB</li>
          <li>Stripe — paiements en mode test</li>
        </ul>
      </div>
    </div>
    <div className="footer__bottom">
      <div className="container">
        <p>© {new Date().getFullYear()} NovaTech — Projet académique (workshop e-commerce fullstack). Aucune vente réelle.</p>
      </div>
    </div>
  </footer>
);

export default Footer;
