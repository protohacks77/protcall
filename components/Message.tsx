
import React from 'react';
import { ChatMessage } from '../types';

interface MessageProps {
  message: ChatMessage;
}

const Message: React.FC<MessageProps> = ({ message }) => {
  const isUser = message.sender === 'user';

  if (message.isLoading) {
    return (
      <div className="flex my-2 justify-start message-anim">
        <div className="max-w-xl px-4 py-3 rounded-2xl shadow-lg bg-gray-700 text-gray-200 rounded-bl-none">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" style={{ animationDelay: '200ms' }}></div>
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" style={{ animationDelay: '400ms' }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex my-2 ${isUser ? 'justify-end' : 'justify-start'} message-anim`}>
      <div
        className={`max-w-xl px-4 py-3 rounded-2xl shadow-lg ${
          isUser
            ? 'bg-cyan-600 text-white rounded-br-none'
            : 'bg-gray-700 text-gray-200 rounded-bl-none'
        }`}
      >
        <p className="whitespace-pre-wrap">{message.text}</p>
      </div>
    </div>
  );
};

export default Message;