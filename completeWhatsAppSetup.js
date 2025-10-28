// completeWhatsAppSetup.js
import axios from 'axios';

const ACCESS_TOKEN = 'EAAPnr4RXczkBP0KzAi8oANZBk2ZAfZCeWv0EFTbVaXQi1wCRKFoCIbsA6op68Qr94YEnGmKLgjjrLDMzZBhZBpWsf7eKvAiZCGz1LPQ2NhO4ZCpyGgwGAVno4kLBbWS5mo4OBQyFY5CfnMCUGYEg6ClXtnkjWTAmnQb5ljQoEsVu9GjIjeWUQrYLwnTe85UBpYXk3EYWaxThpqbvwzCjdH6RonGVrKWbzXtF3kRZApZCGoQ79NplZCb01nmpcy9dSQ4ugZD';

async function completeWhatsAppSetup() {
  try {
    console.log('🔍 Step 1: Checking your Facebook Pages...\n');

    // Get all pages you manage
    const pagesResponse = await axios.get(
      `https://graph.facebook.com/v22.0/me/accounts?fields=id,name,access_token`,
      {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`
        }
      }
    );

    if (pagesResponse.data.data.length === 0) {
      console.log('❌ No Facebook Pages found.');
      console.log('💡 Please create a Facebook Page first at: https://www.facebook.com/pages/create');
      return;
    }

    console.log('✅ Found Pages:');
    pagesResponse.data.data.forEach((page, index) => {
      console.log(`   ${index + 1}. ${page.name} (ID: ${page.id})`);
    });

    // Use the first page
    const page = pagesResponse.data.data[0];
    console.log(`\n🔧 Using page: ${page.name} (${page.id})`);

    // Step 2: Check if page has WhatsApp connected
    console.log('\n🔍 Step 2: Checking WhatsApp connection...');
    
    const pageDetails = await axios.get(
      `https://graph.facebook.com/v22.0/${page.id}?fields=connected_whatsapp_account`,
      {
        headers: {
          'Authorization': `Bearer ${page.access_token}`
        }
      }
    );

    if (pageDetails.data.connected_whatsapp_account) {
      console.log('✅ WhatsApp is connected to this page!');
      console.log('   WhatsApp Account ID:', pageDetails.data.connected_whatsapp_account.id);
    } else {
      console.log('❌ WhatsApp not connected to this page.');
      console.log('💡 Connect WhatsApp:');
      console.log('   1. Go to your Facebook Page');
      console.log('   2. Click "Settings"');
      console.log('   3. Click "WhatsApp" in left menu');
      console.log('   4. Connect your phone number');
    }

    // Step 3: Get WhatsApp phone numbers
    console.log('\n🔍 Step 3: Finding WhatsApp phone numbers...');
    
    try {
      const wabaResponse = await axios.get(
        `https://graph.facebook.com/v22.0/${page.id}?fields=whatsapp_business_account{phone_numbers{id,display_phone_number,verified_name}}`,
        {
          headers: {
            'Authorization': `Bearer ${page.access_token}`
          }
        }
      );

      const waba = wabaResponse.data.whatsapp_business_account;
      if (waba) {
        console.log('✅ WhatsApp Business Account found!');
        console.log('📞 Phone Numbers:');
        waba.phone_numbers.data.forEach((phone, index) => {
          console.log(`   ${index + 1}. ID: ${phone.id}`);
          console.log(`      Number: ${phone.display_phone_number}`);
          console.log(`      Name: ${phone.verified_name}`);
        });

        // Update environment variable
        const phoneNumberId = waba.phone_numbers.data[0].id;
        console.log(`\n💡 Update your .env file with:`);
        console.log(`WHATSAPP_PHONE_NUMBER_ID=${phoneNumberId}`);

      } else {
        console.log('❌ No WhatsApp Business Account linked to this page.');
      }

    } catch (error) {
      console.log('❌ Cannot access WhatsApp Business Account:', error.response?.data?.error?.message);
    }

  } catch (error) {
    console.error('❌ Setup failed:', error.response?.data?.error || error.message);
  }
}

completeWhatsAppSetup();