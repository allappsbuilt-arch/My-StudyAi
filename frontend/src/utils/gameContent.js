/** Built-in content for the learning games (used when the student has no flashcards yet). */

export const STARTER_PAIRS = [
  { term: 'Photosynthesis', definition: 'Plants turning light, water and CO₂ into glucose and oxygen' },
  { term: 'Mitochondria', definition: 'Organelle that releases energy through respiration' },
  { term: 'Osmosis', definition: 'Movement of water across a semi-permeable membrane' },
  { term: 'Velocity', definition: 'Speed in a given direction' },
  { term: 'Catalyst', definition: 'Substance that speeds up a reaction without being used up' },
  { term: 'Isotope', definition: 'Atoms of an element with different numbers of neutrons' },
  { term: 'Algorithm', definition: 'Step-by-step procedure for solving a problem' },
  { term: 'Metaphor', definition: 'Describing something as if it were something else' },
  { term: 'Democracy', definition: 'Government by the people through elected representatives' },
  { term: 'Inflation', definition: 'General rise in prices over time' },
  { term: 'Hypotenuse', definition: 'Longest side of a right-angled triangle' },
  { term: 'Ecosystem', definition: 'Community of living things and their environment' },
];

// [question, [options], correctIndex]
export const QUIZ_BANK = [
  ['What is the chemical symbol for gold?', ['Ag', 'Au', 'Gd', 'Go'], 1],
  ['How many sides does a hexagon have?', ['5', '6', '7', '8'], 1],
  ['Which planet is known as the Red Planet?', ['Venus', 'Jupiter', 'Mars', 'Mercury'], 2],
  ['What is 12 × 12?', ['124', '144', '132', '154'], 1],
  ['What gas do plants absorb from the air?', ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Helium'], 2],
  ['Who wrote "Romeo and Juliet"?', ['Charles Dickens', 'William Shakespeare', 'Jane Austen', 'Mark Twain'], 1],
  ['What is the powerhouse of the cell?', ['Nucleus', 'Ribosome', 'Mitochondria', 'Golgi body'], 2],
  ['What is the square root of 81?', ['7', '8', '9', '11'], 2],
  ['Water boils at what temperature at sea level?', ['90 °C', '100 °C', '110 °C', '120 °C'], 1],
  ['Which is the largest ocean?', ['Atlantic', 'Indian', 'Arctic', 'Pacific'], 3],
  ['What is the value of π to two decimals?', ['3.12', '3.14', '3.16', '3.41'], 1],
  ['Which organ pumps blood through the body?', ['Liver', 'Lungs', 'Heart', 'Kidney'], 2],
  ['H₂O is the formula for?', ['Hydrogen', 'Water', 'Salt', 'Oxygen'], 1],
  ['What is 15% of 200?', ['20', '25', '30', '35'], 2],
  ['Newton’s first law is about?', ['Gravity', 'Inertia', 'Energy', 'Friction'], 1],
  ['Which language runs in web browsers?', ['Python', 'C', 'JavaScript', 'Java'], 2],
  ['The speed of light is about?', ['300,000 km/s', '30,000 km/s', '3,000 km/s', '3 million km/s'], 0],
  ['Which is a prime number?', ['21', '27', '29', '33'], 2],
  ['What is the capital of Japan?', ['Seoul', 'Beijing', 'Tokyo', 'Bangkok'], 2],
  ['DNA stands for?', ['Deoxyribonucleic acid', 'Dinitrogen acid', 'Dual nucleic acid', 'Deoxy nitrogen acid'], 0],
  ['An angle of 90° is called?', ['Acute', 'Right', 'Obtuse', 'Straight'], 1],
  ['What is the freezing point of water in °F?', ['0', '32', '100', '212'], 1],
  ['Which blood cells fight infection?', ['Red', 'White', 'Platelets', 'Plasma'], 1],
  ['What is 7³?', ['243', '343', '373', '49'], 1],
];

export const SPELLING_WORDS = [
  ['necessary', 'Needed or required'],
  ['environment', 'The natural world around us'],
  ['photosynthesis', 'How plants make food from light'],
  ['definitely', 'Without any doubt'],
  ['separate', 'To divide or keep apart'],
  ['government', 'The group that rules a country'],
  ['beautiful', 'Very pleasing to look at'],
  ['experiment', 'A scientific test'],
  ['knowledge', 'Facts and understanding you have learned'],
  ['rhythm', 'A regular repeated pattern of sound'],
  ['equation', 'A statement that two expressions are equal'],
  ['vocabulary', 'The words you know and use'],
  ['molecule', 'A group of atoms bonded together'],
  ['temperature', 'How hot or cold something is'],
  ['accommodate', 'To provide space for'],
  ['conscience', 'Your inner sense of right and wrong'],
];

export const shuffle = (list) => {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
