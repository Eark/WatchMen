module.exports = {
  'notifications' : {
    enabled: false, //if disabled, no notifications will be sent
    to: ['support@nodejitsu.com'],
    postmark : {
      from: 'ivan@iloire.com',
      api_key : 'your-postmark-key-here'
    }
  }
};
