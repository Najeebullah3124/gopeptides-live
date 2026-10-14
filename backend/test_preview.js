import fetch from 'node-fetch';

async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/admin/labels/preview', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        variantId: '1', // whatever, just need an error message
        layout: 'tiff',
        fullBackground: true
      })
    });
    console.log(res.status, await res.text());
  } catch (e) {
    console.error(e);
  }
}

test();
