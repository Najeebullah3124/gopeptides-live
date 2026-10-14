import { syncProductsToMerchant } from '../src/services/merchantService';

async function run() {
  try {
    console.log('Starting Merchant Sync...');
    const result = await syncProductsToMerchant();
    console.log('Sync Complete! Result:', result);
  } catch (error) {
    console.error('Sync Error:', error);
  }
}

run();
