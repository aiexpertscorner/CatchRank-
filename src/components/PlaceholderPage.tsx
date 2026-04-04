import React from 'react';

export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="card p-12 text-center">
      <div className="w-16 h-16 bg-brand-blue-soft rounded-2xl flex items-center justify-center mx-auto mb-6">
        <Fish className="text-brand-blue w-8 h-8" />
      </div>
      <h1 className="text-2xl font-bold mb-2">{title}</h1>
      <p className="text-text-secondary">Deze module wordt momenteel ontwikkeld.</p>
    </div>
  );
}
