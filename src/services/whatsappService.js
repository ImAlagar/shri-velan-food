import axios from 'axios';

class WhatsAppService {
  constructor() {
    this.baseURL = 'https://graph.facebook.com/v22.0';
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    this.tokenExpiry = Date.now() + 60 * 24 * 60 * 60 * 1000; // 60 days from now
  }

  // Send simple text message
  async sendMessage(to, message) {
    if (this.isTokenExpired()) await this.refreshToken();

    try {
      const response = await axios.post(
        `${this.baseURL}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: this.formatPhoneNumber(to),
          type: 'text',
          text: { body: message }
        },
        { headers: { Authorization: `Bearer ${this.accessToken}`, 'Content-Type': 'application/json' } }
      );
      return response.data;
    } catch (error) {
      console.error('WhatsApp API Error:', error.response?.data || error.message);
      throw new Error('Failed to send WhatsApp message');
    }
  }

  // Send template message
  async sendTemplateMessage(to, templateName, parameters = []) {
    if (this.isTokenExpired()) await this.refreshToken();

    try {
      const template = {
        name: templateName,
        language: { code: 'en' },
      };

      if (parameters.length > 0) {
        template.components = [
          {
            type: 'body',
            parameters: parameters.map((p) => ({ type: 'text', text: p })),
          },
        ];
      }

      const response = await axios.post(
        `${this.baseURL}/${this.phoneNumberId}/messages`,
        { messaging_product: 'whatsapp', to: this.formatPhoneNumber(to), type: 'template', template },
        { headers: { Authorization: `Bearer ${this.accessToken}`, 'Content-Type': 'application/json' } }
      );

      return response.data;
    } catch (error) {
      console.error('WhatsApp Template Error:', error.response?.data || error.message);
      throw new Error('Failed to send WhatsApp template message');
    }
  }

  // Token handling
  isTokenExpired() {
    return Date.now() >= this.tokenExpiry;
  }

  async refreshToken() {
    try {
      const resp = await axios.get('https://graph.facebook.com/v22.0/oauth/access_token', {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: process.env.FB_APP_ID,
          client_secret: process.env.FB_APP_SECRET,
          fb_exchange_token: this.accessToken,
        },
      });

      this.accessToken = resp.data.access_token;
      this.tokenExpiry = Date.now() + resp.data.expires_in * 1000;
    } catch (err) {
      console.error('Failed to refresh WhatsApp token:', err.response?.data || err.message);
      throw err;
    }
  }

  // Format number: remove non-digit characters
  formatPhoneNumber(phone) {
    return phone.replace(/\D/g, '');
  }

  // Webhook verification
  verifyWebhook(mode, token, challenge) {
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
    if (mode && token === verifyToken) return challenge;
    throw new Error('Invalid verification token');
  }

  // Process incoming webhook message
  processWebhook(entry) {
    try {
      const changes = entry[0]?.changes?.[0];
      const value = changes?.value;
      if (!value || !value.messages) return null;

      const message = value.messages[0];
      return {
        from: message.from,
        message: message.text?.body,
        messageId: message.id,
        timestamp: message.timestamp,
        type: message.type,
      };
    } catch (error) {
      console.error('Error processing webhook:', error);
      return null;
    }
  }

  async checkMessageStatus(messageId) {
  try {
    const response = await axios.get(
      `${this.baseURL}/${messageId}`,
      { headers: { Authorization: `Bearer ${this.accessToken}` } }
    );
    return response.data;
  } catch (error) {
    console.error('Status check error:', error.response?.data);
  }
}

}

export default new WhatsAppService();
