import { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai"; 

export default async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    // Get the user's question and tarot cards (you mentioned you'll handle this)
    const { question, cards } = req.body;
    console.log("API", cards);

    // Create a prompt that includes the user's question and tarot cards
    const prompt = `Please read my tarot cards in a hermetic and thelemic way. I am using a spread of past, present, future. Read each card and answer for all three. ${question} the cards are Past: ${cards[0].name} Present: ${cards[1].name} Future: ${cards[2].name}  \n`;

    // Initialize the OpenAI API client with your API key

    const apiKey = process.env.OPENAI_API_KEY;

    const openai = new OpenAI({
      apiKey: apiKey, // Replace with your actual API key
    });

    // Call the ChatGPT API to get a response
    const response = await openai.completions.create({
      model: "gpt-3.5-turbo-instruct",
      prompt,
      max_tokens: 500, // You can adjust this based on your desired response length
    });

    // Return the response from ChatGPT
    res.status(200).json({ response: response.choices[0]?.text });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "An error occurred while processing your request.",
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
};
