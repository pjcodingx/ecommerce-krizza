

const ProductCard = ({ product, cartQty, onAddToCart }) => {
  // Determine stock level class
  const currentStock = product.stock - cartQty;

  const getStockClass = (stock) => {
    if (stock > 7) return 'stock-ok';
    if (stock > 2) return 'stock-low';
    return 'stock-crit';
  };

  // Determine badge type
  const getBadge = (category, type) => {
    if (type === 'Best Seller') {
      return <div className="badge badge-bestseller"><i className="fas fa-star" style={{color: '#f5a623'}}></i> Best Seller</div>;
    }
    if (category === 'New') {
       return <div className="badge badge-new"><i className="fas fa-star" style={{color: 'var(--purple-main)'}}></i> New</div>;
    }
     if (category === 'Trending') {
       return <div className="badge badge-trending"><i className="fas fa-star" style={{color: 'var(--purple-main)'}}></i> Trending</div>;
    }
    return null;
  };

  return (
    <div className="product-card">
      <div className="card-img-wrap">
        <div className="img-inner" style={{ background: `url(http://localhost:5000${product.imageUrl || '/uploads/placeholder.jpg'}) center center / cover` }}>
          {!product.imageUrl && '🌸'}
        </div>
        {getBadge(product.category, product.type)}
      </div>
      <div className="card-body">
        <div className="card-name">{product.name}</div>
        <div className="card-desc">{product.description}</div>
        <div className="card-footer">
          <span className="card-price">{product.price}</span>
          <div className="card-actions">
            <button 
              className="btn-cart" 
              onClick={() => onAddToCart()}
              disabled={currentStock <= 0}
            >
              <i className="fas fa-plus"></i>
            </button>
            <span className={`stock-tag ${getStockClass(currentStock)}`}>
              {currentStock > 2 ? `${currentStock} left` : (currentStock > 0 ? `${currentStock} left!` : 'Out of stock')}
            </span>
            <button className="btn-view">View Details</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
