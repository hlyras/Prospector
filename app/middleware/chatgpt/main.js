const OpenAIApi = require("openai");

const openai = new OpenAIApi({
  apiKey: process.env.OPENAI_API_KEY
});

const ChatGPTAPI = async (message) => {
  const completion = await openai.chat.completions.create({
    messages: [{
      role: "system",
      content: message
    }],
    model: "gpt-4o",
    // model: "gpt-3.5-turbo",
    // temperature: 0.7
  });

  return completion.choices[0].message.content;
};

module.exports = ChatGPTAPI;