export type TarotCard = {
  name: string;
};

export const tarotDeck: TarotCard[] = [
  { name: "The Fool" },
  { name: "The Magician" },
  { name: "The High Priestess" },
  { name: "The Empress" },
  { name: "The Emperor" },
  { name: "The Hierophant" },
  { name: "The Lovers" },
  { name: "The Chariot" },
  { name: "Strength" },
  { name: "The Hermit" },
  { name: "Wheel of Fortune" },
  { name: "Justice" },
  { name: "The Hanged Man" },
  { name: "Death" },
  { name: "Temperance" },
  { name: "The Devil" },
  { name: "The Tower" },
  { name: "The Star" },
  { name: "The Moon" },
  { name: "The Sun" },
  { name: "Judgement" },
  { name: "The World" },

  // Minor Arcana: Cups
  { name: "Ace of Cups" },
  { name: "Two of Cups" },
  { name: "Three of Cups" },
  { name: "Four of Cups" },
  { name: "Five of Cups" },
  { name: "Six of Cups" },
  { name: "Seven of Cups" },
  { name: "Eight of Cups" },
  { name: "Nine of Cups" },
  { name: "Ten of Cups" },
  { name: "Page of Cups" },
  { name: "Knight of Cups" },
  { name: "Queen of Cups" },
  { name: "King of Cups" },

  // Minor Arcana: Pentacles
  { name: "Ace of Pentacles" },
  { name: "Two of Pentacles" },
  { name: "Three of Pentacles" },
  { name: "Four of Pentacles" },
  { name: "Five of Pentacles" },
  { name: "Six of Pentacles" },
  { name: "Seven of Pentacles" },
  { name: "Eight of Pentacles" },
  { name: "Nine of Pentacles" },
  { name: "Ten of Pentacles" },
  { name: "Page of Pentacles" },
  { name: "Knight of Pentacles" },
  { name: "Queen of Pentacles" },
  { name: "King of Pentacles" },

  // Minor Arcana: Swords
  { name: "Ace of Swords" },
  { name: "Two of Swords" },
  { name: "Three of Swords" },
  { name: "Four of Swords" },
  { name: "Five of Swords" },
  { name: "Six of Swords" },
  { name: "Seven of Swords" },
  { name: "Eight of Swords" },
  { name: "Nine of Swords" },
  { name: "Ten of Swords" },
  { name: "Page of Swords" },
  { name: "Knight of Swords" },
  { name: "Queen of Swords" },
  { name: "King of Swords" },

  // Minor Arcana: Wands
  { name: "Ace of Wands" },
  { name: "Two of Wands" },
  { name: "Three of Wands" },
  { name: "Four of Wands" },
  { name: "Five of Wands" },
  { name: "Six of Wands" },
  { name: "Seven of Wands" },
  { name: "Eight of Wands" },
  { name: "Nine of Wands" },
  { name: "Ten of Wands" },
  { name: "Page of Wands" },
  { name: "Knight of Wands" },
  { name: "Queen of Wands" },
  { name: "King of Wands" },
];

export const pickThreeUniqueCards = (): TarotCard[] => {
  const pickedCards: TarotCard[] = [];
  const deckCopy = [...tarotDeck];

  for (let i = 0; i < 3; i++) {
    const randomIndex = Math.floor(Math.random() * deckCopy.length);
    const [pickedCard] = deckCopy.splice(randomIndex, 1);
    pickedCards.push(pickedCard);
  }

  return pickedCards;
};
