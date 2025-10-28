// createFacebookPage.js
import axios from 'axios';

const ACCESS_TOKEN = 'EAAPnr4RXczkBP0KzAi8oANZBk2ZAfZCeWv0EFTbVaXQi1wCRKFoCIbsA6op68Qr94YEnGmKLgjjrLDMzZBhZBpWsf7eKvAiZCGz1LPQ2NhO4ZCpyGgwGAVno4kLBbWS5mo4OBQyFY5CfnMCUGYEg6ClXtnkjWTAmnQb5ljQoEsVu9GjIjeWUQrYLwnTe85UBpYXk3EYWaxThpqbvwzCjdH6RonGVrKWbzXtF3kRZApZCGoQ79NplZCb01nmpcy9dSQ4ugZD';

async function createFacebookPage() {
  try {
    console.log('🚀 Creating Facebook Page for your business...\n');

    const pageResponse = await axios.post(
      `https://graph.facebook.com/v22.0/me/accounts`,
      {
        name: 'Shri Velan Food',
        category: 'FOOD_BEVERAGE',
        about: 'Traditional South Indian food restaurant',
        access_token: ACCESS_TOKEN
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Facebook Page created successfully!');
    console.log('📄 Page Details:');
    console.log('   Name:', pageResponse.data.name);
    console.log('   ID:', pageResponse.data.id);
    console.log('   Access Token:', pageResponse.data.access_token);
    
    return pageResponse.data;

  } catch (error) {
    console.error('❌ Failed to create page:', error.response?.data?.error || error.message);
    
    if (error.response?.data?.error?.code === 200) {
      console.log('\n💡 Manual setup required:');
      console.log('   1. Go to: https://www.facebook.com/pages/create');
      console.log('   2. Create a page named "Shri Velan Food"');
      console.log('   3. Choose "Business or Brand"');
      console.log('   4. Select "Restaurant" category');
    }
    
    return null;
  }
}

createFacebookPage();