const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function testUpload() {
  try {
    const form = new FormData();
    form.append('name', 'Test Mutler');
    form.append('category', 'Clothes');
    form.append('price', '15');
    form.append('stock', '5');
    form.append('description', 'Test');
    // create a dummy file
    fs.writeFileSync('C:/React Projects/krizza-shop/server/dummy.txt', 'hello');
    form.append('image', fs.createReadStream('C:/React Projects/krizza-shop/server/dummy.txt'));

    const res = await axios.post('http://localhost:5000/api/products', form, {
      headers: form.getHeaders(),
    });
    console.log('Success:', res.data);
  } catch (err) {
    console.error('Error:', err.response ? err.response.data : err.message);
  }
}
testUpload();