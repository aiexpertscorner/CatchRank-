import React, { useState } from 'react';
import { Cloud, Check, AlertCircle, Save } from 'lucide-react';
import { Card, Button } from '../../../components/ui/Base';
import { STORAGE_KEYS, getWeatherApiKey, setWeatherApiKey } from '../../../config/env';
import { toast } from 'sonner';

export const WeatherApiKeyInput = () => {
  const [apiKey, setApiKey] = useState(getWeatherApiKey() || '');
  const [isEditing, setIsEditing] = useState(!apiKey);

  const handleSave = () => {
    if (!apiKey.trim()) {
      toast.error('Voer een geldige API key in');
      return;
    }
    setWeatherApiKey(apiKey.trim());
    setIsEditing(false);
    toast.success('Weather API Key opgeslagen');
    // Refresh page to apply changes in weather service
    window.location.reload();
  };

  return (
    <Card className="p-4 space-y-4 border border-border-subtle bg-surface-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cloud className="w-5 h-5 text-brand" />
          <h3 className="text-sm font-bold text-text-primary uppercase tracking-tight">Weather API (OpenWeather)</h3>
        </div>
        {!isEditing && (
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="text-brand text-[10px] font-black uppercase tracking-widest">
            Wijzig
          </Button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <p className="text-xs text-text-muted">
            Voer je OpenWeather API key in voor nauwkeurige lokale weersomstandigheden.
          </p>
          <div className="flex gap-2">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="API Key..."
              className="flex-1 bg-bg-main border border-border-subtle rounded-lg px-4 py-2 text-sm text-text-primary focus:outline-none focus:border-brand"
            />
            <Button onClick={handleSave} size="sm" className="rounded-lg">
              <Save className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-[10px] text-text-dim italic">
            Geen key? De app gebruikt een standaard proxy, maar met een eigen key is het betrouwbaarder.
          </p>
        </div>
      ) : (
        <div className="flex items-center justify-between bg-bg-main/50 p-3 rounded-lg border border-border-subtle">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-success" />
            <span className="text-xs text-text-secondary">API Key is geconfigureerd</span>
          </div>
          <span className="text-[10px] text-text-dim">••••••••••••••••</span>
        </div>
      )}
    </Card>
  );
};
