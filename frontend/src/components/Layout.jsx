import Nav from "./Nav";
import Footer from "./Footer";
import RouteEffects from "./RouteEffects";
import BootScreen from "./BootScreen";

export default function Layout({ children }) {
  return (
    <div className="alley-app min-h-screen flex flex-col text-white">
      <div className="alley-atmosphere" aria-hidden="true">
        <div className="alley-atmosphere-brick" />
        <div className="alley-atmosphere-grain" />
        <span className="alley-lamp alley-lamp-a" />
        <span className="alley-lamp alley-lamp-b" />
        <div className="alley-rain alley-rain-global" />
      </div>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <BootScreen />
      <RouteEffects />
      <Nav />
      <main id="main-content" tabIndex={-1} className="alley-main flex-1 outline-none">
        {children}
      </main>
      <Footer />
    </div>
  );
}
