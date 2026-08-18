'use client';

export function StreamCaret() {
  return (
    <span
      className="inline-block w-0.5 h-5 bg-teal-500 ml-0.5 align-text-bottom"
      style={{ animation: 'caret-blink 1s step-end infinite' }}
      aria-hidden="true"
    />
  );
}
