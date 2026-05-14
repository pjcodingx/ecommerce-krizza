import React from 'react';
import Hero from '../components/Hero';
import ProductCard from '../components/ProductCard';

const HomePage = ({ products }) => {
  return (
    <>
      <Hero />
      <div className="section-header">
        <div className="section-header-inner">
          <h2 className="section-title">Our Bouquets</h2>
        </div>
        <p className="section-subtitle">
          Beautiful blooms for every occasion <i className="fas fa-heart"></i>
        </p>
      </div>
      <section className="products-grid">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </section>
    </>
  );
};

export default HomePage;
