const { PrismaClient } = require('@prisma/client');
const http = require('http');

const prisma = new PrismaClient();

async function main() {
  const product = await prisma.product.findFirst({
    where: { isActive: true, stock: { gt: 0 } }
  });

  if (!product) {
    console.log("No valid product found.");
    return;
  }

  const data = JSON.stringify({
    items: [{ productId: product.id, quantity: 1 }],
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
      'Content-Length': Buffer.byteLength(data)
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
}

main().catch(console.error).finally(() => prisma.$disconnect());
