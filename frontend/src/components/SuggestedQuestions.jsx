import React from 'react';

const CATEGORIES = [
  {
    title: 'Profile',
    questions: ['What is my employee ID?', 'Who is my manager?', 'Which department am I in?', 'When did I join the company?']
  },
  {
    title: 'Leave',
    questions: ['How many casual leaves do I have left?', 'What is my earned leave balance?', 'How many leaves are pending approval for me?']
  },
  {
    title: 'Policies',
    questions: ["What is the company's work-from-home policy?", 'When is the next company holiday?', 'What are the safety regulations?']
  },
  {
    title: 'Payroll',
    questions: ['What is my current base salary?', 'What is my CTC?', 'How much is my PF deduction?']
  }
];

export default function SuggestedQuestions({ onPick }) {
  return (
    <div className="space-y-5">
      {CATEGORIES.map((cat) => (
        <div key={cat.title}>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{cat.title}</p>
          <div className="space-y-1.5">
            {cat.questions.map((q) => (
              <button
                key={q}
                onClick={() => onPick(q)}
                className="w-full text-left text-xs px-3 py-2 rounded-lg bg-gray-50 hover:bg-brand-50 hover:text-brand-700 text-gray-600 transition"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
