import 'dotenv/config';

async function main() {
  const id = process.env.WALLID_KEY_ID!.trim();
  const sec = process.env.WALLID_KEY_SECRET!.trim();
  const auth = {
    Authorization: 'Basic ' + Buffer.from(id + ':' + sec).toString('base64'),
    Accept: 'application/json',
  };
  const pid = '8a3b5e9f-e39e-43df-9237-7c16bd0e96a1';
  const urls = [
    `https://payment-api.wallid.co/api/payment-gw/v1/${pid}`,
    `https://payment-api.wallid.co/api/payment-gw/v1/${pid}/status`,
    `https://payment-api.wallid.co/api/payment-gw/v1/status/${pid}`,
    `https://payment-api.wallid.co/api/payment-gw/v1/payments/${pid}`,
    `https://payment-api.wallid.co/api/payment-gw/v1/get/${pid}`,
  ];
  for (const u of urls) {
    const res = await fetch(u, { headers: auth });
    console.log(res.status, u, (await res.text()).slice(0, 250));
  }
}

main().catch(console.error);
