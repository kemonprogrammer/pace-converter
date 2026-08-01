type SpeedKey = 'kmph' | 'minPerKm' | 'minPerMi' | 'mph';

const minPerKmEl = document.querySelector<HTMLInputElement>('#min-per-km');
const minPerMiEl = document.querySelector<HTMLInputElement>('#min-per-mile');
const kmphEl = document.querySelector<HTMLInputElement>('#km-per-h');
const mphEl = document.querySelector<HTMLInputElement>('#mile-per-h');
const durationEl = document.querySelector<HTMLInputElement>('#duration');
const distanceEl = document.querySelector<HTMLInputElement>('#distance');

const KM_IN_MILE = 1.60934;
const MIN_IN_H = 60;
const SEC_IN_MIN = 60;

interface SpeedConfigItem {
  el: HTMLInputElement | null;
  key: SpeedKey;
}

const speedConfig: readonly SpeedConfigItem[] = Object.freeze([
  {
    el: minPerKmEl,
    key: 'minPerKm',
  },
  {
    el: minPerMiEl,
    key: 'minPerMi',
  },
  {
    el: kmphEl,
    key: 'kmph',
  },
  {
    el: mphEl,
    key: 'mph',
  },
]);

const minDecToStr = (minDec: number): string => {
  let min = Math.trunc(minDec);
  let sec = Math.round((minDec - min) * SEC_IN_MIN);
  if (sec === 60) {
    sec = 0;
    min += 1;
  }
  const secStr = String(sec).padStart(2, '0');
  return `${min}:${secStr}`;
};

interface DecResult {
  min: number;
  sec: number;
}

const minStrToDec = (minStr: string): DecResult | undefined => {
  const parts = minStr.split(':');
  if (parts.length > 2) {
    console.error("at most 1 ':' allowed");
    return;
  }
  if (parts.length === 0) {
    console.error('no value provided');
    return;
  }
  let min = 0;
  let sec = 0;

  min = parseInt(parts[0], 10);
  if (min < 0 || isNaN(min)) {
    console.error(`Invalid value for minutes: ${min}`);
    return { min: 0, sec };
  }
  if (parts.length === 2) {
    sec = Number(parts[1]);
    if (isNaN(sec) || sec < 0 || sec >= SEC_IN_MIN) {
      console.error(`Invalid value for seconds: ${sec}`);
      return { min, sec: 0 };
    }
    sec = sec / SEC_IN_MIN;
  }
  return { min, sec };
};

const minPerMiInKmph = (minPerMi: string): number => {
  const parts = minPerMi.split(':');

  const min = Number(parts[0]);
  let sec = 0;
  if (parts.length === 2) {
    sec = Number(parts[1]) / 60;
  }
  const minPerMiDec = min + sec;
  return (KM_IN_MILE * MIN_IN_H) / minPerMiDec;
};

const kmphInMinPerKm = (kmph: number): string => {
  const minDec = MIN_IN_H / kmph;
  return minDecToStr(minDec);
};

const kmphInMinPerMi = (kmph: number): string => {
  const minDec = (MIN_IN_H * KM_IN_MILE) / kmph;
  return minDecToStr(minDec);
};

const mphInKmph = (mph: number): number => {
  return mph * KM_IN_MILE;
};

const kmphInMph = (kmph: number): number => {
  return kmph / KM_IN_MILE;
};

const minPerKmInKmph = (minPerKm: string): number => {
  const parsed = minStrToDec(minPerKm);
  if (!parsed) return 0;
  const { min, sec } = parsed;
  const pace = min + sec;
  return pace === 0 ? 0 : MIN_IN_H / pace;
};

interface SpeedState {
  kmph: number;
  minPerKm: string;
  minPerMi: string;
  mph: number;
}

type ConversionMap = {
  kmph: {
    mph: (kmph: number) => number;
    minPerKm: (kmph: number) => string;
    minPerMi: (kmph: number) => string;
  };
  minPerKm: {
    kmph: (minPerKm: string) => number;
  };
  minPerMi: {
    kmph: (minPerMi: string) => number;
  };
  mph: {
    kmph: (mph: number) => number;
  };
};

const conversion: ConversionMap = {
  kmph: {
    mph: kmphInMph,
    minPerKm: kmphInMinPerKm,
    minPerMi: kmphInMinPerMi,
  },
  minPerKm: {
    kmph: minPerKmInKmph,
  },
  minPerMi: {
    kmph: minPerMiInKmph,
  },
  mph: {
    kmph: mphInKmph,
  },
};

const speed = new Proxy<SpeedState>(
  {
    kmph: 0,
    minPerKm: '0',
    minPerMi: '0',
    mph: 0,
  },
  {
    set<K extends keyof SpeedState>(obj: SpeedState, prop: K, val: SpeedState[K]) {
      obj[prop] = val;

      // calculate kmph
      if (prop !== 'kmph') {
        const converter = conversion[prop]?.kmph as (v: any) => number;
        if (converter) {
          obj.kmph = converter(val);
        }
      }

      const toUpdate = speedConfig.filter((s) => s.key !== prop);
      const toRecalculate = toUpdate
        .map((s) => s.key)
        .filter((k): k is 'minPerKm' | 'minPerMi' | 'mph' => k !== 'kmph');

      // update other values from kmph
      for (const key of toRecalculate) {
        // Tell TypeScript we know this dynamic assignment is safe
        ((obj as unknown) as Record<string, unknown>)[key] = conversion.kmph[key](obj.kmph);
      }

      // update DOM values
      for (const config of toUpdate) {
        if (!config.el) continue;
        let value: string | number = obj[config.key];
        if (config.key === 'mph' || config.key === 'kmph') {
          value = Number(value).toFixed(2);
        }
        config.el.value = String(value);
      }

      return true;
    },
  }
);

kmphEl?.addEventListener('input', (e: Event) => {
  const target = e.target as HTMLInputElement;
  const value = target.value;
  const kmph = parseFloat(value);
  if (isNaN(kmph)) {
    console.error(`Couldn't convert number ${value}, ${e}`);
    return;
  }

  if (kmph !== speed.kmph) {
    speed.kmph = kmph;
  }
});

mphEl?.addEventListener('input', (e: Event) => {
  const target = e.target as HTMLInputElement;
  const value = target.value;
  const mph = parseFloat(value);
  if (isNaN(mph)) {
    console.error(`Couldn't convert number ${value}, ${e}`);
    return;
  }

  if (mph !== speed.mph) {
    speed.mph = mph;
  }
});

minPerKmEl?.addEventListener('input', (e: Event) => {
  const target = e.target as HTMLInputElement;
  let value = target.value;
  if (value === '') {
    value = '0';
  }
  speed.minPerKm = value;
});

minPerMiEl?.addEventListener('input', (e: Event) => {
  const target = e.target as HTMLInputElement;
  let value = target.value;
  if (value === '') {
    value = '0';
  }
  speed.minPerMi = value;
});
