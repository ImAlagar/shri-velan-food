import axios from 'axios';

class WhatsAppService {
  constructor() {
    this.baseURL = 'https://graph.facebook.com/v22.0';
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  }

  async sendMessage(to, message) {
    try {
      const response = await axios.post(
        `${this.baseURL}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: this.formatPhoneNumber(to),
          type: 'text',
          text: { body: message }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('WhatsApp API Error:', error.response?.data || error.message);
      throw new Error('Failed to send WhatsApp message');
    }
  }

  async sendTemplateMessage(to, templateName, parameters = []) {
    try {
      const template = {
        name: templateName,
        language: { code: 'en' }
      };

      if (parameters.length > 0) {
        template.components = [
          {
            type: 'body',
            parameters: parameters.map(param => ({
              type: 'text',
              text: param
            }))
          }
        ];
      }

      const response = await axios.post(
        `${this.baseURL}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: this.formatPhoneNumber(to),
          type: 'template',
          template: template
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('WhatsApp Template Error:', error.response?.data || error.message);
      throw new Error('Failed to send WhatsApp template message');
    }
  }

  formatPhoneNumber(phone) {
    // Remove all non-digit characters and ensure proper format
    return phone.replace(/\D/g, '');
  }

  // Verify webhook from Facebook
  verifyWebhook(mode, token, challenge) {
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
    
    if (mode && token === verifyToken) {
      return challenge;
    }
    throw new Error('Invalid verification token');
  }

  // Process incoming webhook messages
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
        type: message.type
      };
    } catch (error) {
      console.error('Error processing webhook:', error);
      return null;
    }
  }
}

export default new WhatsAppService();