// checkAppAccess.js
import axios from 'axios';

const ACCESS_TOKEN = 'EAAPnr4RXczkBP0KzAi8oANZBk2ZAfZCeWv0EFTbVaXQi1wCRKFoCIbsA6op68Qr94YEnGmKLgjjrLDMzZBhZBpWsf7eKvAiZCGz1LPQ2NhO4ZCpyGgwGAVno4kLBbWS5mo4OBQyFY5CfnMCUGYEg6ClXtnkjWTAmnQb5ljQoEsVu9GjIjeWUQrYLwnTe85UBpYXk3EYWaxThpqbvwzCjdH6RonGVrKWbzXtF3kRZApZCGoQ79NplZCb01nmpcy9dSQ4ugZD';

async function checkAppAccess() {
  try {
    console.log('🔍 Checking app access and permissions...\n');

    // Check basic user info
    const userInfo = await axios.get(
      `https://graph.facebook.com/v22.0/me?fields=id,name,accounts{id,name,access_token}`,
      {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`
        }
      }
    );

    console.log('👤 User Info:', {
      id: userInfo.data.id,
      name: userInfo.data.name
    });

    // Check available pages/businesses
    if (userInfo.data.accounts?.data?.length > 0) {
      console.log('\n📄 Pages/Businesses you manage:');
      userInfo.data.accounts.data.forEach((account, index) => {
        console.log(`   ${index + 1}. ${account.name} (ID: ${account.id})`);
      });
    } else {
      console.log('\n❌ No pages or businesses found for this user.');
    }

    // Check token permissions
    const debugToken = await axios.get(
      `https://graph.facebook.com/debug_token?input_token=${ACCESS_TOKEN}&access_token=${ACCESS_TOKEN}`
    );

    console.log('\n🔑 Token Permissions:');
    console.log('   Scopes:', debugToken.data.data.scopes);
    console.log('   Type:', debugToken.data.data.type);
    console.log('   Is Valid:', debugToken.data.data.is_valid);
    console.log('   Expires at:', new Date(debugToken.data.data.expires_at * 1000));

  } catch (error) {
    console.error('❌ Error:', error.response?.data?.error || error.message);
  }
}

checkAppAccess();