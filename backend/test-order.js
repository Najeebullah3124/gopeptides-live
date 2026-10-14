const http = require('http');

const data = JSON.stringify({
  items: [{ productId: "cm032x8z50000a6g7x8y9z0a1", quantity: 1 }],
  shippingAddress: {
    firstName: "Test",
    lastName: "Test",
    street: "Street 1",
    city: "City",
    postalCode: "1234AB",
    country: "NL"
  },
  guestEmail: "test@example.com",
  paymentMethod: "stripe"
});

const req = http.request({
  hostname: 'localhost',
  port: 3001,
  path: '/api/orders/guest',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
}, (res) => {
  let responseData = '';
  res.on('data', d => responseData += d);
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Response: ${responseData}`);
  });
});

req.on('error', error => console.error(error));
req.write(data);
req.end();
