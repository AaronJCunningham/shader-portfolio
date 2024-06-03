import { useState } from "react";
import { TarotCard, pickThreeUniqueCards } from "../../utilities/tarotCards";
import "../../../styles/index.scss";
import MetaDataHeader from "../metadata/MetaDataHeader";

export default function TarotReader() {
  const [question, setQuestion] = useState("Type your question here");
  const [tarotCards, setTarotCards] = useState<TarotCard[]>([]);
  const [response, setResponse] = useState<string[]>([]);
  const [loading, setLoading] = useState(false); // State to manage loading indicator

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true); // Turn on loading indicator
    const cards = pickThreeUniqueCards();

    setTarotCards(cards);
    console.log(cards[0]?.name, cards[1]?.name, cards[2]?.name);

    const splitTarotResponse = (response: string): string[] => {
      const parts = response.split(/(Past:|Present:|Future:)/);
      return [parts[2]?.trim(), parts[4]?.trim(), parts[6]?.trim()].filter(
        Boolean
      ) as string[];
    };
    setResponse([]);
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
        const splitResponse = splitTarotResponse(data.response);
        setResponse(splitResponse);
      } else {
        console.error("API request failed.");
      }
    } catch (error) {
      console.error("An error occurred:", error);
    }
    setLoading(false); // Turn off loading indicator regardless of success or error
  };

  return (
    <>
      <MetaDataHeader title={"AI Tarot Reader"} />
      <div className="project-grid" id="grid">
        <div id="bio" className="bio_content" style={{ color: "#d3d1d1" }}>
          <h2 className="bio-h2">AI TAROT READER</h2>
          <p>
            I am an AI Tarot Reader. Pose your question; three cards will reveal
            your past, present, and future. Unveil the truths hidden in the
            symbols as you tread the path of discovery
          </p>
          <form className="input-container" onSubmit={handleSubmit}>
            <input
              type="text"
              id="question"
              className="input-field"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
            <button type="submit" className="submit-button">
              Know Your Future
            </button>
          </form>
          {loading && <div>Loading...</div>}{" "}
          {/* Display loading indicator when waiting for response */}
          {!loading && response.length > 0 && (
            <div>
              <h2>Past: {tarotCards[0]?.name}</h2>
              <p>Past: {response[0]}</p>
              <h2>Present: {tarotCards[1]?.name}</h2>
              <p>Present: {response[1]}</p>
              <h2>Future: {tarotCards[2]?.name}</h2>
              <p>Future: {response[2]}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
