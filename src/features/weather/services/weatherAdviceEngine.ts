export type FishingDiscipline = 'karper' | 'roofvis' | 'algemeen';

export interface OpenWeatherHourlyLike {
  dt: number;
  temp: number;
  feels_like?: number;
  pressure?: number;
  humidity?: number;
  dew_point?: number;
  uvi?: number;
  clouds?: number;
  visibility?: number;
  wind_speed?: number;
  wind_gust?: number;
  wind_deg?: number;
  pop?: number; // 0..1
  rain?: { '1h'?: number };
  snow?: { '1h'?: number };
  weather?: Array<{ id?: number; main?: string; description?: string }>;
}

export interface OpenWeatherDailyLike {
  dt: number;
  moon_phase?: number; // 0..1
  sunrise?: number;
  sunset?: number;
  moonrise?: number;
  moonset?: number;
}

export interface FishingWeatherEngineInput {
  discipline: FishingDiscipline;
  hourly: OpenWeatherHourlyLike[];
  daily?: OpenWeatherDailyLike[];
  targetDateUnix?: number;

  // Spot / bank context
  preferredShoreBearing?: number; // direction you face from bank toward water (0-359)
  oppositeShoreBearing?: number;  // optional explicit opposite bank bearing
  waterType?: 'meer' | 'kanaal' | 'rivier' | 'polder' | 'vijver';
  depthBand?: 'ondiep' | 'middel' | 'diep';
  clarity?: 'helder' | 'troebel' | 'groen';
  vegetation?: 'geen' | 'licht' | 'zwaar';

  // Seasonal / calibration
  month?: number; // 1-12
  baseWaterTemp?: number; // optional measured water temp if available
  isNightFishing?: boolean;
}

export type ImpactDirection = 'positive' | 'negative' | 'neutral' | 'mixed';

export interface ParameterImpact {
  key:
    | 'temperature'
    | 'windSpeed'
    | 'windDirection'
    | 'pressure'
    | 'pressureTrend'
    | 'uvi'
    | 'cloudCover'
    | 'precipitation'
    | 'humidity'
    | 'visibility'
    | 'moonPhase'
    | 'daypart'
    | 'gusts';
  label: string;
  valueLabel: string;
  scoreImpact: number; // roughly -15..+15
  impact: ImpactDirection;
  summary: string;
  tips: string[];
}

export interface HourlyFishingScore {
  dt: number;
  score: number; // 0..100
  band: 'poor' | 'fair' | 'good' | 'strong' | 'peak';
  confidence: number; // 0..1
  reasons: string[];
  impacts: ParameterImpact[];
  primaryAdvice: string[];
  shoreAdvice?: {
    preferredBankScore: number;
    oppositeBankScore: number;
    recommended: 'preferred' | 'opposite' | 'neutral';
    summary: string;
  };
}

export interface FishingForecastOutput {
  bestHours: HourlyFishingScore[];
  hourlyScores: HourlyFishingScore[];
  overallSummary: string;
  sessionAdvice: string[];
  parameterHighlights: ParameterImpact[];
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const round = (v: number, decimals = 0) => Number(v.toFixed(decimals));

function getHour(unix: number): number {
  return new Date(unix * 1000).getHours();
}

function formatDeg(deg?: number): string {
  if (deg == null) return 'onbekend';
  const dirs = ['N', 'NO', 'O', 'ZO', 'Z', 'ZW', 'W', 'NW'];
  const index = Math.round((((deg % 360) + 360) % 360) / 45) % 8;
  return `${dirs[index]} (${Math.round(deg)}°)`;
}

function scoreToBand(score: number): HourlyFishingScore['band'] {
  if (score >= 82) return 'peak';
  if (score >= 70) return 'strong';
  if (score >= 58) return 'good';
  if (score >= 44) return 'fair';
  return 'poor';
}

function describeImpact(scoreImpact: number): ImpactDirection {
  if (scoreImpact >= 3) return 'positive';
  if (scoreImpact <= -3) return 'negative';
  if (Math.abs(scoreImpact) <= 1) return 'neutral';
  return 'mixed';
}

function isNight(hour: number): boolean {
  return hour < 6 || hour >= 22;
}

function isPrimeLowLight(hour: number): boolean {
  return (hour >= 5 && hour <= 8) || (hour >= 19 && hour <= 22);
}

function estimatePressureTrend(hourly: OpenWeatherHourlyLike[], index: number): 'stijgend' | 'dalend' | 'stabiel' {
  const current = hourly[index]?.pressure;
  const prior = hourly[Math.max(0, index - 3)]?.pressure;
  if (current == null || prior == null) return 'stabiel';

  const delta = current - prior;
  if (delta >= 2.5) return 'stijgend';
  if (delta <= -2.5) return 'dalend';
  return 'stabiel';
}

function getMoonPhaseForHour(input: FishingWeatherEngineInput, hourUnix: number): number | undefined {
  if (!input.daily?.length) return undefined;
  const targetDay = new Date(hourUnix * 1000).getDate();
  const match = input.daily.find((d) => new Date(d.dt * 1000).getDate() === targetDay);
  return match?.moon_phase;
}

function scoreTemperature(
  temp: number,
  discipline: FishingDiscipline,
  month?: number,
  waterType?: string,
): ParameterImpact {
  let scoreImpact = 0;
  let summary = '';
  const tips: string[] = [];

  if (discipline === 'karper') {
    if (temp < 4) {
      scoreImpact = -12;
      summary = 'Zeer koud: karper beweegt weinig en eet kort en voorzichtig.';
      tips.push('Vis statisch en subtiel met klein haakaas of wafter.');
      tips.push('Voer minimaal en focus op warmere ondiepe zones in de middag.');
    } else if (temp < 8) {
      scoreImpact = -6;
      summary = 'Koud: trage karper, korte feedmomenten.';
      tips.push('Beste kansen rond middag of bij eerste opwarming.');
      tips.push('Klein aas, weinig voer, nauwkeurig vissen.');
    } else if (temp < 14) {
      scoreImpact = 4;
      summary = 'Koel maar goed: karper kan actief worden, zeker bij stabiel weer.';
      tips.push('Zoek overgang ondiep-diep en beschutte warmere delen.');
    } else if (temp < 20) {
      scoreImpact = 10;
      summary = 'Sterke temperatuurzone voor actieve karper.';
      tips.push('Goede allround omstandigheden voor voeren en mobiel zoeken.');
    } else if (temp < 26) {
      scoreImpact = 7;
      summary = 'Warm: vaak goed, maar zuurstof en licht worden belangrijker.';
      tips.push('Focus op ochtend, avond en wind op de kant.');
      tips.push('Zoek zuurstofrijk water, golfslag en beschaduwing.');
    } else {
      scoreImpact = -5;
      summary = 'Zeer warm: stress en laag zuurstof kunnen de aasperiodes verkorten.';
      tips.push('Vis vroeg of laat en zoek wind, instroom of dieper water.');
      tips.push('Lichter voeren en sneller inspelen op korte pieken.');
    }
  } else {
    if (temp < 3) {
      scoreImpact = -7;
      summary = 'Zeer koud: roofvis is traag en volgt vaker dan hij pakt.';
      tips.push('Langzaam vissen, diepe zones, lange pauzes.');
    } else if (temp < 8) {
      scoreImpact = -2;
      summary = 'Koud: roofvis pakt vaak traag en dicht bij de bodem.';
      tips.push('Langzame softbaits, suspending lures en pauzes werken beter.');
    } else if (temp < 16) {
      scoreImpact = 8;
      summary = 'Goede temperatuur voor actieve roofvis.';
      tips.push('Werk meerdere waterlagen af tot je activiteit vindt.');
    } else if (temp < 22) {
      scoreImpact = 10;
      summary = 'Sterke activiteitszone voor veel roofvissoorten.';
      tips.push('Zoek jagende vis bij randen, wier en windkanten.');
    } else {
      scoreImpact = 2;
      summary = 'Warm: nog visbaar, maar vaak korter piekmoment.';
      tips.push('Vroeg en laat is vaak beter dan midden op de dag.');
    }
  }

  if (month && discipline === 'karper' && month >= 3 && month <= 5 && temp >= 10 && temp <= 18) {
    scoreImpact += 2;
    tips.push('Voorjaar + oplopende temperatuur kan extra goed zijn voor ondiepe zones.');
  }

  if (waterType === 'polder' && temp >= 18) {
    scoreImpact += 1;
  }

  return {
    key: 'temperature',
    label: 'Temperatuur',
    valueLabel: `${round(temp, 1)}°C`,
    scoreImpact,
    impact: describeImpact(scoreImpact),
    summary,
    tips,
  };
}

function scoreWindSpeed(speed: number, discipline: FishingDiscipline): ParameterImpact {
  let scoreImpact = 0;
  let summary = '';
  const tips: string[] = [];

  if (discipline === 'karper') {
    if (speed < 1.5) {
      scoreImpact = -4;
      summary = 'Bijna windstil: minder waterverplaatsing en vaak minder zuurstofopbouw.';
      tips.push('Vis stiller en zoek natuurlijke routes of zones met iets meer beweging.');
    } else if (speed < 3.5) {
      scoreImpact = 2;
      summary = 'Lichte wind: prima, subtiele opbouw van activiteit.';
      tips.push('Windkant kan beter worden naarmate de dag vordert.');
    } else if (speed < 7) {
      scoreImpact = 8;
      summary = 'Mooie viswind: meer golfslag, zuurstof en vaak voedsel op de kant.';
      tips.push('Check de windkant en eerste talud op de wind.');
      tips.push('Voer actiever als je ook visactiviteit ziet.');
    } else if (speed < 11) {
      scoreImpact = 5;
      summary = 'Stevige wind: vaak nog goed, maar presentatie wordt lastiger.';
      tips.push('Gebruik zwaarder lood en vis strakker.');
      tips.push('Zoek luwere hoek als precies presenteren lastig wordt.');
    } else {
      scoreImpact = -6;
      summary = 'Harde wind: kan vis verzamelen, maar nauwkeurig vissen en beetregistratie worden lastig.';
      tips.push('Kies veiligere, beter controleerbare oever of vis beschut.');
      tips.push('Gebruik zwaardere setup en kortere worpen.');
    }
  } else {
    if (speed < 1.5) {
      scoreImpact = -2;
      summary = 'Weinig wind: roofvis kan verspreid liggen.';
      tips.push('Zoek actief naar jagende vis in plaats van blind uitkammen.');
    } else if (speed < 4) {
      scoreImpact = 3;
      summary = 'Lichte wind: prima om water af te zoeken.';
      tips.push('Werk randen en objecten systematisch af.');
    } else if (speed < 8) {
      scoreImpact = 7;
      summary = 'Goede roofviswind: aasvis clustert vaker op windinvloed.';
      tips.push('Richt je op windkanten, hoeken en wierlijnen.');
    } else if (speed < 12) {
      scoreImpact = 1;
      summary = 'Stevige wind: potentieel goed, maar controle over kunstaas daalt.';
      tips.push('Kies meer compacte, zwaardere lures en vis korter op de oever.');
    } else {
      scoreImpact = -7;
      summary = 'Te harde wind: presentatie, contact en veiligheid worden beperkend.';
      tips.push('Zoek luw water, havens, bochten of windbrekers.');
    }
  }

  return {
    key: 'windSpeed',
    label: 'Windsnelheid',
    valueLabel: `${round(speed, 1)} m/s`,
    scoreImpact,
    impact: describeImpact(scoreImpact),
    summary,
    tips,
  };
}

function angularDiff(a: number, b: number): number {
  const d = Math.abs((((a - b) % 360) + 540) % 360 - 180);
  return d;
}

function scoreWindDirection(
  windDeg: number | undefined,
  preferredShoreBearing?: number,
  oppositeShoreBearing?: number,
  discipline: FishingDiscipline = 'algemeen',
): { impact: ParameterImpact; shoreAdvice?: HourlyFishingScore['shoreAdvice'] } {
  if (windDeg == null || preferredShoreBearing == null) {
    return {
      impact: {
        key: 'windDirection',
        label: 'Windrichting',
        valueLabel: formatDeg(windDeg),
        scoreImpact: 0,
        impact: 'neutral',
        summary: 'Geen oeveradvies mogelijk zonder windrichting en stekorientatie.',
        tips: ['Geef per stek een shoreline bearing mee voor wind-op-oever advies.'],
      },
    };
  }

  const opposite = oppositeShoreBearing ?? ((preferredShoreBearing + 180) % 360);
  const diffPreferred = angularDiff(windDeg, preferredShoreBearing);
  const diffOpposite = angularDiff(windDeg, opposite);

  const isWindOnPreferred = diffPreferred <= 55;
  const isCrossPreferred = diffPreferred > 55 && diffPreferred < 125;
  const isOffPreferred = diffPreferred >= 125;

  let preferredBankScore = 0;
  let oppositeBankScore = 0;
  let summary = '';
  const tips: string[] = [];

  if (discipline === 'karper') {
    if (isWindOnPreferred) {
      preferredBankScore = 7;
      oppositeBankScore = -3;
      summary = 'Wind drukt op je gekozen oever: vaak sterk voor karper door voedselopbouw en zuurstof.';
      tips.push('Check vooral eerste talud, windkant en hoekjes waar golfslag binnenkomt.');
      tips.push('Vis niet altijd pal in de branding; 1e drop-off kan beter zijn.');
    } else if (isCrossPreferred) {
      preferredBankScore = 2;
      oppositeBankScore = 1;
      summary = 'Schuine zijwind: bruikbaar, maar minder uitgesproken oevervoordeel.';
      tips.push('Focus op wind gedreven hoeken en banen, niet alleen op één rechte oever.');
    } else if (isOffPreferred) {
      preferredBankScore = -3;
      oppositeBankScore = 5;
      summary = 'Wind van de oever af: vaak is de tegenoverliggende kant interessanter.';
      tips.push('Bij aflandige wind kan jouw kant rustiger en helderder zijn; subtieler vissen helpt.');
    }
  } else {
    if (isWindOnPreferred) {
      preferredBankScore = 5;
      oppositeBankScore = -2;
      summary = 'Wind op de oever kan aasvis en jagende roofvis concentreren.';
      tips.push('Scan randen, wierpunten en hoekjes waar prooivis wordt gedrukt.');
    } else if (isCrossPreferred) {
      preferredBankScore = 2;
      oppositeBankScore = 2;
      summary = 'Zijwind geeft vooral voordeel op structuren en hoeken.';
      tips.push('Vis bochten, bruggen en luwtes naast de winddruk.');
    } else {
      preferredBankScore = -2;
      oppositeBankScore = 4;
      summary = 'Aflandige wind: overkant heeft vaker meer leven en kleur.';
      tips.push('Aan jouw kant werken subtielere presentaties beter in rustiger water.');
    }
  }

  const scoreImpact = Math.max(preferredBankScore, oppositeBankScore);
  const recommended =
    preferredBankScore > oppositeBankScore ? 'preferred' :
    oppositeBankScore > preferredBankScore ? 'opposite' : 'neutral';

  return {
    impact: {
      key: 'windDirection',
      label: 'Windrichting',
      valueLabel: formatDeg(windDeg),
      scoreImpact,
      impact: describeImpact(scoreImpact),
      summary,
      tips,
    },
    shoreAdvice: {
      preferredBankScore,
      oppositeBankScore,
      recommended,
      summary,
    },
  };
}

function scorePressure(pressure?: number, discipline: FishingDiscipline = 'algemeen'): ParameterImpact {
  if (pressure == null) {
    return {
      key: 'pressure',
      label: 'Luchtdruk',
      valueLabel: 'onbekend',
      scoreImpact: 0,
      impact: 'neutral',
      summary: 'Geen luchtdrukdata beschikbaar.',
      tips: [],
    };
  }

  let scoreImpact = 0;
  let summary = '';
  const tips: string[] = [];

  if (pressure < 1005) {
    scoreImpact = discipline === 'karper' ? -3 : -2;
    summary = 'Lage luchtdruk: onrustig weerbeeld, vis kan grillig reageren.';
    tips.push('Zoek korte piekmomenten rond omslag of neerslagverandering.');
  } else if (pressure < 1015) {
    scoreImpact = 4;
    summary = 'Gemiddelde luchtdruk: vaak een bruikbare basisconditie.';
    tips.push('Laat trend zwaarder meewegen dan absolute waarde.');
  } else if (pressure < 1024) {
    scoreImpact = 6;
    summary = 'Vrij hoge stabiele luchtdruk: vaak prettig en visbaar, mits niet steriel helder.';
    tips.push('Combineert goed met lichte wind of bewolking.');
  } else {
    scoreImpact = discipline === 'karper' ? -1 : -2;
    summary = 'Zeer hoge luchtdruk: kan bij kraakhelder stil weer taai worden.';
    tips.push('Zoek schemer, dieper water of meer beschutting.');
  }

  return {
    key: 'pressure',
    label: 'Luchtdruk',
    valueLabel: `${Math.round(pressure)} hPa`,
    scoreImpact,
    impact: describeImpact(scoreImpact),
    summary,
    tips,
  };
}

function scorePressureTrend(trend: 'stijgend' | 'dalend' | 'stabiel', discipline: FishingDiscipline): ParameterImpact {
  let scoreImpact = 0;
  let summary = '';
  const tips: string[] = [];

  if (trend === 'stijgend') {
    scoreImpact = discipline === 'karper' ? 6 : 5;
    summary = 'Stijgende luchtdruk: vaak een verbeterende, actievere fase.';
    tips.push('Goed moment om actiever te zoeken of iets meer voer te brengen.');
  } else if (trend === 'stabiel') {
    scoreImpact = 3;
    summary = 'Stabiele luchtdruk: voorspelbare omstandigheden.';
    tips.push('Consistente aanpak werkt beter dan te veel wisselen.');
  } else {
    scoreImpact = discipline === 'karper' ? -5 : -6;
    summary = 'Dalende luchtdruk: vaak lastiger en wisselvalliger beetgedrag.';
    tips.push('Vis compacter, trager en wacht op korte activiteitspieken.');
  }

  return {
    key: 'pressureTrend',
    label: 'Druktrend',
    valueLabel: trend,
    scoreImpact,
    impact: describeImpact(scoreImpact),
    summary,
    tips,
  };
}

function scoreUV(uvi = 0, hour = 12, discipline: FishingDiscipline = 'algemeen'): ParameterImpact {
  let scoreImpact = 0;
  let summary = '';
  const tips: string[] = [];

  if (isPrimeLowLight(hour)) {
    scoreImpact += 3;
  }

  if (uvi < 1.5) {
    scoreImpact += 4;
    summary = 'Lage UV: vriendelijker licht, vooral goed voor ondiepe en heldere situaties.';
    tips.push('Sterke tijd voor ondiepe stekken en vis die lichtschuw is.');
  } else if (uvi < 4) {
    scoreImpact += 2;
    summary = 'Matige UV: meestal goed werkbaar.';
  } else if (uvi < 6.5) {
    scoreImpact += discipline === 'karper' ? -1 : -2;
    summary = 'Vrij felle zonkracht: vis zoekt vaker schaduw, diepte of structuur.';
    tips.push('Vis schaduw, overhangende bomen, wier, bruggen of dieper talud.');
  } else {
    scoreImpact += discipline === 'karper' ? -5 : -4;
    summary = 'Hoge UV: midden op de dag kan taai zijn, zeker bij helder water.';
    tips.push('Focus op ochtend/avond of ga hoger/dieper afhankelijk van soort en water.');
  }

  return {
    key: 'uvi',
    label: 'UV-index',
    valueLabel: round(uvi, 1).toString(),
    scoreImpact,
    impact: describeImpact(scoreImpact),
    summary,
    tips,
  };
}

function scoreCloudCover(clouds = 0, discipline: FishingDiscipline): ParameterImpact {
  let scoreImpact = 0;
  let summary = '';
  const tips: string[] = [];

  if (clouds < 15) {
    scoreImpact = discipline === 'karper' ? -2 : -1;
    summary = 'Vrijwel onbewolkt: veel lichtdruk.';
    tips.push('Subtieler vissen of structuur/schaduw opzoeken helpt.');
  } else if (clouds < 45) {
    scoreImpact = 2;
    summary = 'Licht bewolkt: vaak prima balans tussen licht en activiteit.';
  } else if (clouds < 80) {
    scoreImpact = 5;
    summary = 'Mooi bewolkt: vaak gunstig voor langere actieve periodes.';
    tips.push('Goed moment om mobiel te zoeken of breder te vissen.');
  } else {
    scoreImpact = 3;
    summary = 'Sterk bewolkt: vaak goed, mits wind en neerslag niet te extreem zijn.';
  }

  return {
    key: 'cloudCover',
    label: 'Bewolking',
    valueLabel: `${Math.round(clouds)}%`,
    scoreImpact,
    impact: describeImpact(scoreImpact),
    summary,
    tips,
  };
}

function scorePrecipitation(pop = 0, rain1h = 0, discipline: FishingDiscipline = 'algemeen'): ParameterImpact {
  let scoreImpact = 0;
  let summary = '';
  const tips: string[] = [];

  if (rain1h <= 0.1 && pop < 0.2) {
    scoreImpact = 1;
    summary = 'Droog of bijna droog: stabiele visomstandigheden.';
  } else if (rain1h <= 1.2) {
    scoreImpact = 4;
    summary = 'Lichte regen of motregen: vaak positief door minder licht en extra zuurstof.';
    tips.push('Juist tijdens de eerste lichte regen kan de activiteit pieken.');
  } else if (rain1h <= 3.5) {
    scoreImpact = 1;
    summary = 'Matige regen: kan nog goed zijn, maar zicht en comfort nemen af.';
    tips.push('Zoek afwatering, instroom of luwere zones.');
  } else {
    scoreImpact = discipline === 'karper' ? -4 : -5;
    summary = 'Harde regen: presentatie en veiligheid worden beperkend.';
    tips.push('Kies beschut of wacht op de fase net voor/na de zware bui.');
  }

  return {
    key: 'precipitation',
    label: 'Neerslag',
    valueLabel: `${round(rain1h, 1)} mm/u • ${Math.round(pop * 100)}% kans`,
    scoreImpact,
    impact: describeImpact(scoreImpact),
    summary,
    tips,
  };
}

function scoreHumidity(humidity?: number): ParameterImpact {
  if (humidity == null) {
    return {
      key: 'humidity',
      label: 'Luchtvochtigheid',
      valueLabel: 'onbekend',
      scoreImpact: 0,
      impact: 'neutral',
      summary: 'Geen luchtvochtigheidsdata beschikbaar.',
      tips: [],
    };
  }

  let scoreImpact = 0;
  let summary = '';
  const tips: string[] = [];

  if (humidity < 45) {
    scoreImpact = -1;
    summary = 'Droge lucht: vaak gekoppeld aan helderder, harder weer.';
  } else if (humidity < 75) {
    scoreImpact = 2;
    summary = 'Gebalanceerde luchtvochtigheid: neutraal tot licht positief.';
  } else {
    scoreImpact = 3;
    summary = 'Hogere luchtvochtigheid: vaak zachter weerbeeld en gunstiger licht.';
    tips.push('Combineert vaak goed met bewolking en lichte wind.');
  }

  return {
    key: 'humidity',
    label: 'Luchtvochtigheid',
    valueLabel: `${Math.round(humidity)}%`,
    scoreImpact,
    impact: describeImpact(scoreImpact),
    summary,
    tips,
  };
}

function scoreVisibility(visibility?: number, clarity?: string, discipline: FishingDiscipline = 'algemeen'): ParameterImpact {
  if (visibility == null) {
    return {
      key: 'visibility',
      label: 'Zicht',
      valueLabel: 'onbekend',
      scoreImpact: 0,
      impact: 'neutral',
      summary: 'Geen zichtdata beschikbaar.',
      tips: [],
    };
  }

  const km = visibility / 1000;
  let scoreImpact = 0;
  let summary = '';
  const tips: string[] = [];

  if (km < 2) {
    scoreImpact = -2;
    summary = 'Erg slecht zicht door mist/neerslag: visbaar, maar praktisch lastig.';
    tips.push('Veiligheid en presentatie gaan voor; kies eenvoudiger water.');
  } else if (km < 6) {
    scoreImpact = 2;
    summary = 'Gedempt zicht: kan positief werken door zachter lichtbeeld.';
  } else {
    scoreImpact = clarity === 'helder' && discipline === 'karper' ? -1 : 1;
    summary = 'Goed zicht: neutraal tot licht positief, afhankelijk van helderheid van het water.';
  }

  return {
    key: 'visibility',
    label: 'Zicht',
    valueLabel: `${round(km, 1)} km`,
    scoreImpact,
    impact: describeImpact(scoreImpact),
    summary,
    tips,
  };
}

function scoreMoonPhase(moonPhase?: number, isNightFishing?: boolean): ParameterImpact {
  if (moonPhase == null) {
    return {
      key: 'moonPhase',
      label: 'Maanfase',
      valueLabel: 'onbekend',
      scoreImpact: 0,
      impact: 'neutral',
      summary: 'Geen maanfase beschikbaar.',
      tips: [],
    };
  }

  const moonLightPct = Math.abs(0.5 - moonPhase) * 200;
  let scoreImpact = 0;
  let summary = '';
  const tips: string[] = [];

  if (!isNightFishing) {
    summary = 'Maanfase weegt overdag beperkt mee.';
  } else if (moonLightPct > 80) {
    scoreImpact = 4;
    summary = 'Veel maanlicht: kan de oriëntatie en activiteit tijdens de nacht helpen.';
    tips.push('Nachtstekken met open water en zichtlijnen kunnen sterker zijn.');
  } else if (moonLightPct > 35) {
    scoreImpact = 2;
    summary = 'Gemiddeld maanlicht: lichte positieve invloed voor nachtvissen.';
  } else {
    scoreImpact = -1;
    summary = 'Donkere maan: minder licht, vis kan voorzichtiger of lokaler actief zijn.';
    tips.push('Vertrouw meer op wind, druktrend en timing dan op maanlicht.');
  }

  return {
    key: 'moonPhase',
    label: 'Maanfase',
    valueLabel: `${Math.round(moonLightPct)}% lichtindruk`,
    scoreImpact,
    impact: describeImpact(scoreImpact),
    summary,
    tips,
  };
}

function scoreDaypart(hour: number, discipline: FishingDiscipline, temp: number): ParameterImpact {
  let scoreImpact = 0;
  let summary = '';
  const tips: string[] = [];

  if (isPrimeLowLight(hour)) {
    scoreImpact = 8;
    summary = 'Schemerperiode: vaak de sterkste natuurlijke aasperiode.';
    tips.push('Topmoment om actief te voeren, te verkassen of meerdere stekken te testen.');
  } else if (hour >= 10 && hour <= 16) {
    if (temp < 8 && discipline === 'karper') {
      scoreImpact = 3;
      summary = 'Middagwarmte helpt in koude omstandigheden.';
      tips.push('Zoek ondiep water dat opwarmt.');
    } else if (temp > 22) {
      scoreImpact = -4;
      summary = 'Warmste dagdeel: kan taai worden bij fel licht en hoge temperatuur.';
      tips.push('Zoek schaduw, diepte of ga later opnieuw.');
    } else {
      scoreImpact = 0;
      summary = 'Normaal dagdeel: minder uitgesproken piekmoment.';
    }
  } else if (isNight(hour)) {
    scoreImpact = discipline === 'karper' ? 2 : -1;
    summary = discipline === 'karper'
      ? 'Nacht kan voor karper interessant zijn, vooral in rustiger of warmer weer.'
      : 'Nacht is alleen selectief interessant voor roofvis; overdag/schemer is vaak beter.';
  } else {
    scoreImpact = 1;
    summary = 'Overgangsuur: bruikbaar, maar niet de sterkste natuurlijke piek.';
  }

  return {
    key: 'daypart',
    label: 'Tijdvak',
    valueLabel: `${hour}:00`,
    scoreImpact,
    impact: describeImpact(scoreImpact),
    summary,
    tips,
  };
}

function scoreGusts(gust?: number, windSpeed?: number): ParameterImpact {
  if (gust == null || windSpeed == null) {
    return {
      key: 'gusts',
      label: 'Windstoten',
      valueLabel: 'onbekend',
      scoreImpact: 0,
      impact: 'neutral',
      summary: 'Geen gustdata beschikbaar.',
      tips: [],
    };
  }

  const delta = gust - windSpeed;
  let scoreImpact = 0;
  let summary = '';
  const tips: string[] = [];

  if (delta < 2) {
    scoreImpact = 1;
    summary = 'Rustig windbeeld zonder sterke stoten.';
  } else if (delta < 5) {
    scoreImpact = 0;
    summary = 'Enkele windstoten, maar meestal nog prima controleerbaar.';
  } else {
    scoreImpact = -3;
    summary = 'Grote verschillen tussen gemiddelde wind en stoten maken presentatie lastiger.';
    tips.push('Kies een beter controleerbare stek of zwaardere presentatie.');
  }

  return {
    key: 'gusts',
    label: 'Windstoten',
    valueLabel: `${round(gust, 1)} m/s`,
    scoreImpact,
    impact: describeImpact(scoreImpact),
    summary,
    tips,
  };
}

function buildPrimaryAdvice(impacts: ParameterImpact[], discipline: FishingDiscipline): string[] {
  const positives = impacts.filter((x) => x.scoreImpact >= 4).sort((a, b) => b.scoreImpact - a.scoreImpact);
  const negatives = impacts.filter((x) => x.scoreImpact <= -4).sort((a, b) => a.scoreImpact - b.scoreImpact);
  const tips = new Set<string>();

  for (const item of positives.slice(0, 3)) {
    item.tips.slice(0, 2).forEach((t) => tips.add(t));
  }
  for (const item of negatives.slice(0, 3)) {
    item.tips.slice(0, 2).forEach((t) => tips.add(t));
  }

  if (!tips.size) {
    tips.add(
      discipline === 'karper'
        ? 'Begin rustig, observeer wateractiviteit en schaal pas op bij duidelijke signalen.'
        : 'Werk meerdere dieptes en structuren af tot je een patroon vindt.'
    );
  }

  return [...tips].slice(0, 6);
}

function buildReasons(impacts: ParameterImpact[]): string[] {
  return impacts
    .filter((x) => Math.abs(x.scoreImpact) >= 4)
    .sort((a, b) => Math.abs(b.scoreImpact) - Math.abs(a.scoreImpact))
    .slice(0, 4)
    .map((x) => `${x.label}: ${x.summary}`);
}

export function scoreFishingForecast(input: FishingWeatherEngineInput): FishingForecastOutput {
  const hourly = input.hourly.slice(0, 48);

  const hourlyScores: HourlyFishingScore[] = hourly.map((hour, index) => {
    const tempImpact = scoreTemperature(hour.temp, input.discipline, input.month, input.waterType);
    const windSpeedImpact = scoreWindSpeed(hour.wind_speed ?? 0, input.discipline);
    const windDirResult = scoreWindDirection(
      hour.wind_deg,
      input.preferredShoreBearing,
      input.oppositeShoreBearing,
      input.discipline,
    );
    const pressureImpact = scorePressure(hour.pressure, input.discipline);
    const pressureTrendImpact = scorePressureTrend(estimatePressureTrend(hourly, index), input.discipline);
    const uvImpact = scoreUV(hour.uvi ?? 0, getHour(hour.dt), input.discipline);
    const cloudImpact = scoreCloudCover(hour.clouds ?? 0, input.discipline);
    const precipImpact = scorePrecipitation(hour.pop ?? 0, hour.rain?.['1h'] ?? 0, input.discipline);
    const humidityImpact = scoreHumidity(hour.humidity);
    const visibilityImpact = scoreVisibility(hour.visibility, input.clarity, input.discipline);
    const moonImpact = scoreMoonPhase(getMoonPhaseForHour(input, hour.dt), input.isNightFishing && isNight(getHour(hour.dt)));
    const daypartImpact = scoreDaypart(getHour(hour.dt), input.discipline, hour.temp);
    const gustImpact = scoreGusts(hour.wind_gust, hour.wind_speed);

    const impacts: ParameterImpact[] = [
      tempImpact,
      windSpeedImpact,
      windDirResult.impact,
      pressureImpact,
      pressureTrendImpact,
      uvImpact,
      cloudImpact,
      precipImpact,
      humidityImpact,
      visibilityImpact,
      moonImpact,
      daypartImpact,
      gustImpact,
    ];

    const weightedRaw = impacts.reduce((sum, item) => sum + item.scoreImpact, 50);

    let confidence = 0.65;
    if (hour.pressure != null) confidence += 0.05;
    if (hour.wind_deg != null && input.preferredShoreBearing != null) confidence += 0.05;
    if (hour.uvi != null) confidence += 0.03;
    if (hour.visibility != null) confidence += 0.02;
    if (input.daily?.length) confidence += 0.05;
    confidence = clamp(confidence, 0.55, 0.9);

    const score = clamp(Math.round(weightedRaw), 0, 100);

    return {
      dt: hour.dt,
      score,
      band: scoreToBand(score),
      confidence: round(confidence, 2),
      reasons: buildReasons(impacts),
      impacts,
      primaryAdvice: buildPrimaryAdvice(impacts, input.discipline),
      shoreAdvice: windDirResult.shoreAdvice,
    };
  });

  const bestHours = [...hourlyScores]
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .sort((a, b) => a.dt - b.dt);

  const topImpactMap = new Map<string, ParameterImpact>();
  for (const hour of bestHours) {
    for (const impact of hour.impacts) {
      const existing = topImpactMap.get(impact.key);
      if (!existing || Math.abs(impact.scoreImpact) > Math.abs(existing.scoreImpact)) {
        topImpactMap.set(impact.key, impact);
      }
    }
  }

  const parameterHighlights = [...topImpactMap.values()]
    .sort((a, b) => Math.abs(b.scoreImpact) - Math.abs(a.scoreImpact))
    .slice(0, 8);

  const avgScore = round(hourlyScores.reduce((sum, h) => sum + h.score, 0) / Math.max(hourlyScores.length, 1), 0);
  const bestHour = bestHours[0];

  const sessionAdviceSet = new Set<string>();
  bestHours.forEach((h) => h.primaryAdvice.forEach((tip) => sessionAdviceSet.add(tip)));

  if (bestHour?.shoreAdvice?.recommended === 'preferred') {
    sessionAdviceSet.add('Jouw gekozen oever ligt momenteel gunstiger op de wind.');
  } else if (bestHour?.shoreAdvice?.recommended === 'opposite') {
    sessionAdviceSet.add('De overkant lijkt op basis van de windrichting gunstiger dan je huidige oever.');
  }

  const overallSummary =
    avgScore >= 75
      ? 'Sterke forecast: meerdere parameters vallen gunstig samen en er zijn duidelijke piekuren.'
      : avgScore >= 60
        ? 'Goede forecast: er zijn bruikbare kansen, vooral als je timing en stekkeuze strak zijn.'
        : avgScore >= 45
          ? 'Wisselvallige forecast: visbaar, maar selectieve uren en aanpassingen zijn belangrijk.'
          : 'Moeilijke forecast: focus op korte piekmomenten, beschutting en nauwkeurige presentatie.';

  return {
    bestHours,
    hourlyScores,
    overallSummary,
    sessionAdvice: [...sessionAdviceSet].slice(0, 10),
    parameterHighlights,
  };
}

export function getTopFishingWindows(
  forecast: FishingForecastOutput,
  count = 3,
): Array<{ startDt: number; endDt: number; avgScore: number }> {
  const windows: Array<{ startDt: number; endDt: number; avgScore: number }> = [];
  const hours = forecast.hourlyScores;

  for (let i = 0; i < hours.length - 1; i++) {
    const current = hours[i];
    const next = hours[i + 1];
    if (current.score >= 65 && next.score >= 65) {
      const block = [current, next];
      let j = i + 2;
      while (j < hours.length && hours[j].score >= 62) {
        block.push(hours[j]);
        j++;
      }
      windows.push({
        startDt: block[0].dt,
        endDt: block[block.length - 1].dt,
        avgScore: round(block.reduce((s, x) => s + x.score, 0) / block.length, 0),
      });
      i = j - 1;
    }
  }

  return windows.sort((a, b) => b.avgScore - a.avgScore).slice(0, count);
}

export function mergeWithStaticAdvice<TStaticAdvice>(
  forecast: FishingForecastOutput,
  staticAdvice: TStaticAdvice,
) {
  return {
    forecast,
    staticAdvice,
    recommendedNow: forecast.bestHours[0],
    nextWindows: getTopFishingWindows(forecast, 3),
  };
}
