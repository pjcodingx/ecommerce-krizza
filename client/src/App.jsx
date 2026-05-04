import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  // 1. Create a state variable to hold our products
  const [products, setProducts] = useState([]);

  // 2. Use an effect to fetch data when the component loads
  useEffect(() => {
    // 3. Define an async function to fetch the data
    const fetchProducts = async () => {
      try {
        // 4. Use axios to make a GET request to our API
        const response = await axios.get('http://localhost:5000/api/products');
        console.log("Data received from API:", response.data); 
        // 5. Update the state with the data from the API
        setProducts(response.data);
      } catch (error) {
        console.error("Error fetching products:", error);
      }
    };

    // 6. Call the function
    fetchProducts();
  }, []); // 7. The empty array means this effect runs only once

  // 8. Render the component's JSX
  return (
    <div>
      <h1>Krizza Shop Products</h1>
      <div className="product-list">
        {/* 9. Map over the products array and display each product's name */}
        {products.map(product => (
          <div key={product.id} className="product-item">
            <img src={product.imageUrl} alt={product.name} className="product-image" />
            <h2>{product.name}</h2>
            <p>{product.description}</p>
            <p className="price">Price: ${product.price}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
