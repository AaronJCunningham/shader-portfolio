import { useState } from "react";
import { TarotCard, pickThreeUniqueCards } from "../../utilities/tarotCards";

import "../../../styles/index.scss"


export default function TarotReader() {
  const [question, setQuestion] = useState("");
  const [tarotCards, setTarotCards] = useState<TarotCard[]>([]);
  const [response, setResponse] = useState<string[]>([]);

  const handleSubmit = async () => {
    const cards = pickThreeUniqueCards();

    setTarotCards(cards);
    console.log(cards[0]?.name, cards[1]?.name, cards[2]?.name);
    
    const splitTarotResponse = (response: string): string[] => {
      const parts = response.split(/(Past:|Present:|Future:)/);
      return [parts[2]?.trim(), parts[4]?.trim(), parts[6]?.trim()].filter(Boolean) as string[];
    };
    setResponse([])
    try {
      const apiResponse = await fetch("/api/tarot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question,
          cards,
        }),
      });

      if (apiResponse.ok) {
        const data = await apiResponse.json();
        const splitResponse = splitTarotResponse(data.response)
 
        setResponse(splitResponse);
      } else {
        console.error("API request failed.");
      }
    } catch (error) {
      console.error("An error occurred:", error);
    }
  };

  return (
    <main id="aitarotreader">
    <div className="about_container">
      <h1>LUX INFINITA</h1>
      <div>
        <label htmlFor="question">Question:</label>
        <input
          type="text"
          id="question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
      </div>

      <button onClick={handleSubmit}>Submit</button>
      {response.length > 0 && (
        <div>
          <h2>
            Past: {tarotCards[0]?.name}
          </h2>
          <p>Past: {response[0]}</p>
          <h2>Present: {tarotCards[1]?.name}</h2>
          <p>Present: {response[1]}</p>
          <h2>Future: {tarotCards[2]?.name}</h2>
          <p>Future: {response[2]}</p>
        </div>
      )}
    </div>
    </main>
  );
}
