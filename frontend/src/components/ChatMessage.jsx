import React, { useState, useEffect } from 'react';

export default function ChatMessage({ role, text, animate = false }) {
  const isUser = role === 'user';
  const [shown, setShown] = useState(animate ? '' : text);

  useEffect(() => {
    if (!animate) return;
    setShown('');
    let i = 0;
    const speed = 15; // ms per character
    const interval = setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) clearInterval(interval);
    }, speed);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once per mounted message

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-line leading-relaxed ${
          isUser
            ? 'bg-brand-600 text-white rounded-br-sm'
            : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'
        }`}
      >
        {shown}
      </div>
    </div>
  );
}