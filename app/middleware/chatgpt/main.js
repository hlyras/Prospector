const OpenAIApi = require("openai");
const fs = require("fs");
const axios = require("axios");

const openai = new OpenAIApi({
  apiKey: process.env.OPENAI_API_KEY,
  organization: "org-b3yL4hVCnKtGVieDRztus6p0"
});

const ChatGPTAPI = async (message) => {
  const completion = await openai.chat.completions.create(message);
  return completion.choices[0].message.content;
};

async function ChatGPTTranscription(filePath) {
  const transcription = await openai.audio.transcriptions.create({
    file: fs.createReadStream(filePath),
    model: "gpt-4o-transcribe",
  });

  return transcription.text;
}

const ChatGPTImage = {
  async generate(prompt, size = "1024x1024") {
    const result = await openai.images.generate({
      model: "gpt-image-1",
      prompt,
      size
    });
    return result.data[0].url;
  },

  async edits(imagePath, prompt, size = "1024x1024") {
    const result = await openai.images.edits({
      model: "gpt-image-1",
      image: fs.createReadStream(imagePath),
      prompt,
      size,
    });
    return result.data[0].url;
  },

  async variations(imagePath, variation_amount = 1, size = "1024x1024") {
    const result = await openai.images.variations({
      model: "gpt-image-1",
      image: fs.createReadStream(imagePath),
      variation_amount,
      size,
    });
    return result.data.map((img) => img.url);
  }
};

module.exports = { ChatGPTAPI, ChatGPTTranscription, ChatGPTImage };