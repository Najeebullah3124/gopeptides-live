import { prisma } from '../src/config/database';
import axios from 'axios';

async function run() {
  try {
    // 1. Get Google Places summary
    console.log('Fetching Google Places Meta...');
    const googleRes = await axios.get('http://localhost:3001/api/reviews/google-meta');
    const googleData = googleRes.data.data;
    console.log('Google Meta:', googleData);

    // 2. Fetch approved product reviews
    const dbReviews = await prisma.review.findMany({
      where: { approved: true },
      select: { rating: true }
    });

    const productCount = dbReviews.length;
    const productSum = dbReviews.reduce((sum, r) => sum + r.rating, 0);
    const productAvg = productCount > 0 ? productSum / productCount : 0;

    console.log(`Product Reviews: count=${productCount}, sum=${productSum}, avg=${productAvg}`);

    // 3. Compute weighted average
    const googleRating = Number(googleData.rating);
    const googleCount = Number(googleData.reviewCount);
    
    const combinedCount = googleCount + productCount;
    const combinedRating = combinedCount > 0
      ? (googleRating * googleCount + productSum) / combinedCount
      : googleRating;

    console.log(`Calculated Combined Rating: ((${googleRating} * ${googleCount}) + ${productSum}) / ${combinedCount} = ${combinedRating.toFixed(4)}`);
  } catch (error) {
    console.error('Error running check:', error);
  }
}

run();
