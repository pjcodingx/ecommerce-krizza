

const Header = () => {
  return (
    <nav className="navbar">
      <ul className="nav-links">
        <li><a href="#" className="active">Home</a></li>
        <li><a href="#">About</a></li>
        <li><a href="#">Albums</a></li>
        <li><a href="#">Reviews</a></li>
        <li><a href="#">Login</a></li>
      </ul>
      <div className="cart-icon">
        <i className="fas fa-shopping-bag"></i>
        <span className="cart-badge">0</span>
      </div>
    </nav>
  );
};

export default Header;
