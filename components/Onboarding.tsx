'use client';

import { useState, useEffect } from 'react';

interface OnboardingProps {
  onComplete: () => void;
}

const slides = [
  {
    emoji: '🚀',
    title: 'Добро пожаловать в Nyxion VPN!',
    description: 'Мы используем протокол Hysteria2 — самый быстрый и надёжный VPN протокол нового поколения.',
    highlight: 'До 10x быстрее обычных VPN',
  },
  {
    emoji: '⚡',
    title: 'Почему Hysteria2?',
    description: 'В отличие от устаревших протоколов (OpenVPN, WireGuard), Hysteria2 использует протокол QUIC и обходит блокировки легче.',
    highlight: 'Работает даже в Китае и Иране',
  },
  {
    emoji: '🔐',
    title: 'Максимальная безопасность',
    description: 'Мы не храним логи подключений. Ваш трафик защищён современным шифрованием.',
    highlight: 'Zero-log политика',
  },
  {
    emoji: '📱',
    title: 'Простое подключение',
    description: 'Скопируйте ключ в разделе "Ключи" и добавьте его в приложение Hiddify или Streisand.',
    highlight: '3 шага до защиты',
  },
];

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      // Сохраняем что onboarding пройден
      localStorage.setItem('nyxion_onboarding_complete', 'true');
      setIsVisible(false);
      setTimeout(onComplete, 300);
    }
  };

  const handleSkip = () => {
    localStorage.setItem('nyxion_onboarding_complete', 'true');
    setIsVisible(false);
    setTimeout(onComplete, 300);
  };

  const slide = slides[currentSlide];

  return (
    <div 
      className={`fixed inset-0 bg-gradient-to-br from-coral via-peach to-coral z-50 flex flex-col transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Skip button */}
      <div className="flex justify-end p-4">
        <button
          onClick={handleSkip}
          className="text-white/70 text-sm px-4 py-2 active:opacity-50 transition-opacity"
        >
          Пропустить
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div 
          key={currentSlide}
          className="animate-fade-in"
        >
          <div className="text-8xl mb-6 animate-bounce-subtle">
            {slide.emoji}
          </div>
          
          <h1 className="text-2xl font-bold text-white mb-4">
            {slide.title}
          </h1>
          
          <p className="text-white/90 text-base mb-6 max-w-xs mx-auto">
            {slide.description}
          </p>
          
          <div className="inline-block bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
            <span className="text-white font-semibold text-sm">
              ✨ {slide.highlight}
            </span>
          </div>
        </div>
      </div>

      {/* Dots */}
      <div className="flex justify-center gap-2 mb-6">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
              index === currentSlide 
                ? 'bg-white w-8' 
                : 'bg-white/40'
            }`}
          />
        ))}
      </div>

      {/* Button */}
      <div className="px-8 pb-28">
        <button
          onClick={handleNext}
          className="w-full bg-white text-coral font-bold py-4 rounded-2xl text-lg shadow-lg active:scale-[0.98] transition-all duration-200"
        >
          {currentSlide < slides.length - 1 ? 'Далее' : 'Начать!'}
        </button>
      </div>
    </div>
  );
}
