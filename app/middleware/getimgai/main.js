const axios = require("axios");
const fs = require("fs");

const GetImgAIAPI = {
  async generate(prompt, size = "1024x1024") {
    try {
      const response = await axios.post(
        "https://api.getimg.ai/v1/stable-diffusion/text-to-image",
        {
          model: "stable-diffusion-v1-5",
          prompt,
          width: parseInt(size.split("x")[0]),
          height: parseInt(size.split("x")[1]),
          steps: 30,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.GETIMG_API_KEY}`,
            "Content-Type": "application/json",
          },
          responseType: "arraybuffer",
        }
      );

      const outputPath = `getimg_${Date.now()}.png`;
      fs.writeFileSync(outputPath, response.data);
      return outputPath;
    } catch (err) {
      console.error("Erro ao gerar imagem:", err.response?.data || err.message);
      throw err;
    }
  },
  async edit(imagePath, prompt) {
    try {
      const imageBase64 = fs.readFileSync(imagePath, { encoding: "base64" });

      const response = await axios.post(
        "https://api.getimg.ai/v1/stable-diffusion/image-to-image",
        {
          model: "stable-diffusion-v1-5",
          prompt,
          image: imageBase64,
          strength: 0.6, // controle de quão diferente será a edição
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.GETIMG_API_KEY}`,
            "Content-Type": "application/json",
          },
          responseType: "arraybuffer",
        }
      );

      const outputPath = `getimg_edit_${Date.now()}.png`;
      fs.writeFileSync(outputPath, response.data);
      return outputPath;
    } catch (err) {
      console.error("Erro ao editar imagem:", err.response?.data || err.message);
      throw err;
    }
  },
  async variations(imagePath, prompt = "", count = 2) {
    const results = [];
    const imageBase64 = fs.readFileSync(imagePath, { encoding: "base64" });

    for (let i = 0; i < count; i++) {
      try {
        const response = await axios.post(
          "https://api.getimg.ai/v1/stable-diffusion/image-to-image",
          {
            model: "stable-diffusion-v1-5",
            prompt: prompt || "variação da imagem original",
            image: imageBase64,
            strength: 0.7,
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.GETIMG_API_KEY}`,
              "Content-Type": "application/json",
            },
            responseType: "arraybuffer",
          }
        );

        const outputPath = `getimg_variation_${Date.now()}_${i}.png`;
        fs.writeFileSync(outputPath, response.data);
        results.push(outputPath);
      } catch (err) {
        console.error("Erro ao gerar variação:", err.response?.data || err.message);
      }
    }

    return results;
  },
};

module.exports = GetImgAIAPI;