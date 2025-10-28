// findWhatsAppId.js
import axios from 'axios';

const ACCESS_TOKEN = 'EAAPnr4RXczkBP0KzAi8oANZBk2ZAfZCeWv0EFTbVaXQi1wCRKFoCIbsA6op68Qr94YEnGmKLgjjrLDMzZBhZBpWsf7eKvAiZCGz1LPQ2NhO4ZCpyGgwGAVno4kLBbWS5mo4OBQyFY5CfnMCUGYEg6ClXtnkjWTAmnQb5ljQoEsVu9GjIjeWUQrYLwnTe85UBpYXk3EYWaxThpqbvwzCjdH6RonGVrKWbzXtF3kRZApZCGoQ79NplZCb01nmpcy9dSQ4ugZD';

async function findWhatsAppNumbers() {
  try {
    console.log('🔍 Searching for your WhatsApp Business Account...\n');

    // Step 1: Get user's business accounts
    const response = await axios.get(
      `https://graph.facebook.com/v22.0/me?fields=id,name,whatsapp_business_accounts{id,name,phone_numbers{id,display_phone_number,verified_name}}`,
      {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`
        }
      }
    );

    const userData = response.data;
    console.log('👤 User Info:', {
      id: userData.id,
      name: userData.name
    });

    if (userData.whatsapp_business_accounts?.data?.length > 0) {
      const waba = userData.whatsapp_business_accounts.data[0];
      console.log('\n✅ WhatsApp Business Account Found:');
      console.log('   ID:', waba.id);
      console.log('   Name:', waba.name);

      console.log('\n📞 Available Phone Numbers:');
      waba.phone_numbers.forEach((phone, index) => {
        console.log(`   ${index + 1}. Phone Number ID: ${phone.id}`);
        console.log(`      Display: ${phone.display_phone_number}`);
        console.log(`      Verified Name: ${phone.verified_name}`);
        console.log(`      ---`);
      });

      // Test the first phone number
      if (waba.phone_numbers.length > 0) {
        const testPhoneId = waba.phone_numbers[0].id;
        console.log(`\n🧪 Testing Phone Number ID: ${testPhoneId}`);
        await testPhoneNumber(testPhoneId);
      }
    } else {
      console.log('\n❌ No WhatsApp Business Account found.');
      console.log('   Please ensure you have:');
      console.log('   1. A WhatsApp Business Account');
      console.log('   2. A phone number linked to your account');
      console.log('   3. Proper permissions for your app');
    }

  } catch (error) {
    console.error('❌ Error:', error.response?.data?.error || error.message);
    
    if (error.response?.data?.error?.code === 190) {
      console.log('\n🔑 Your access token might be expired or invalid.');
      console.log('   Please generate a new token from:');
      console.log('   https://developers.facebook.com/tools/explorer/');
    }
  }
}

async function testPhoneNumber(phoneNumberId) {
  try {
    const response = await axios.post(
      `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: '919150118554', // Your admin number without +
        type: 'text',
        text: { body: '✅ WhatsApp API Test: Your configuration is working correctly!' }
      },
      {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('🎉 Test successful! Message sent:', response.data);
    console.log('\n💡 Update your .env file with:');
    console.log(`WHATSAPP_PHONE_NUMBER_ID=${phoneNumberId}`);

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data?.error || error.message);
  }
}

// Run the discovery
findWhatsAppNumbers();