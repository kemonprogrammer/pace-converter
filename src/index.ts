const M_IN_KM = 1000;
const KM_IN_MILE = 1.60934;
const MIN_IN_H = 60;
const SEC_IN_MIN = 60;

type SpeedKey = 'kmph' | 'minPerKm' | 'minPerMi' | 'mph';

// Helper function to query elements and guarantee non-null return
function getRequiredElement<T extends HTMLElement>(selector: string): T {
  const el = document.querySelector<T>(selector);
  if (!el) {
    throw new Error(`Required element missing from DOM: ${selector}`);
  }
  return el;
}

const minPerKmEl = getRequiredElement<HTMLInputElement>('#min-per-km');
const minPerMiEl = getRequiredElement<HTMLInputElement>('#min-per-mile');
const kmphEl = getRequiredElement<HTMLInputElement>('#km-per-h');
const mphEl = getRequiredElement<HTMLInputElement>('#mile-per-h');
const durationEl = getRequiredElement<HTMLInputElement>('#duration');
const distanceEl = getRequiredElement<HTMLInputElement>('#distance');

const distanceUnitSel = getRequiredElement<HTMLSelectElement>('#distance-unit');
const durationUnitSel = getRequiredElement<HTMLSelectElement>('#duration-unit');

const distanceBtn = getRequiredElement<HTMLInputElement>('#recalculate-distance');
const paceBtn = getRequiredElement<HTMLInputElement>('#recalculate-pace');
const durationBtn = getRequiredElement<HTMLInputElement>('#recalculate-time');

type Distance = {
  value: number;
  unit: DistanceUnit;
}

type DistanceUnit = 'km' | 'mi' | 'm';
type DurationUnit = 'hours' | 'mins';



interface SpeedConfigItem {
  el: HTMLInputElement;
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

const minPerMiToKmph = (minPerMi: string): number => {
  const parts = minPerMi.split(':');

  const min = Number(parts[0]);
  let sec = 0;
  if (parts.length === 2) {
    sec = Number(parts[1]) / 60;
  }
  const minPerMiDec = min + sec;
  return (KM_IN_MILE * MIN_IN_H) / minPerMiDec;
};

const kmphToMinPerKm = (kmph: number): string => {
  const minDec = (kmph === 0) ? 0 : MIN_IN_H / kmph;
  return minDecToStr(minDec);
};

const kmphToMinPerMi = (kmph: number): string => {
  const minDec = kmph === 0
    ? 0
    : (MIN_IN_H * KM_IN_MILE) / kmph;
  return minDecToStr(minDec);
};

const mphToKmph = (mph: number): number => {
  return mph * KM_IN_MILE;
};

const kmphToMph = (kmph: number): number => {
  return kmph / KM_IN_MILE;
};

const minPerKmToKmph = (minPerKm: string): number => {
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


const speedConversion = {
  kmph: {
    mph: kmphToMph,
    minPerKm: kmphToMinPerKm,
    minPerMi: kmphToMinPerMi,
  },
  minPerKm: {
    kmph: minPerKmToKmph,
  },
  minPerMi: {
    kmph: minPerMiToKmph,
  },
  mph: {
    kmph: mphToKmph,
  },
};

const distanceConversion = {
  km: {
    m: (km: number) => km * M_IN_KM,
    mi: (km: number) => km * KM_IN_MILE,
  },
  m: {
    km: (m: number) => m * M_IN_KM,
    mi: (m: number) => m * M_IN_KM * KM_IN_MILE,
  },
  mi: {
    m: (mi: number) => mi * M_IN_KM / KM_IN_MILE,
    km: (mi: number) => mi / KM_IN_MILE,
  },
} as const

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
        // @ts-ignore
        const converter = speedConversion[prop]?.kmph as (v: any) => number;
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
        ((obj as unknown) as Record<string, unknown>)[key] = speedConversion.kmph[key](obj.kmph);
      }

      // update DOM values
      for (const config of toUpdate) {
        let value: string | number = obj[config.key];
        if (value === 0 || value === "0:00") {
          config.el.value = ''
          continue;
        }
        if (config.key === 'mph' || config.key === 'kmph') {
          value = Number(value).toFixed(2);
        }
        config.el.value = String(value);
      }

      return true;
    },
  }
);

kmphEl.addEventListener('input', (e: Event) => {
  const target = e.target as HTMLInputElement;
  const value = target.value;

  if (value === '') {
    speed.kmph = 0
    return
  }

  const kmph = parseFloat(value);
  if (isNaN(kmph)) {
    return;
  }

  if (kmph !== speed.kmph) {
    speed.kmph = kmph;
  }
});

mphEl.addEventListener('input', (e: Event) => {
  const target = e.target as HTMLInputElement;
  const value = target.value;

  if (value === '') {
    speed.mph = 0
    return
  }
  const mph = parseFloat(value);
  if (isNaN(mph)) {
    console.error(`Couldn't convert number ${value}, ${e}`);
    return;
  }

  if (mph !== speed.mph) {
    speed.mph = mph;
  }
});

minPerKmEl.addEventListener('input', (e: Event) => {
  const target = e.target as HTMLInputElement;
  let value = target.value;
  if (value === '') {
    value = '0';
  }
  speed.minPerKm = value;
});

minPerMiEl.addEventListener('input', (e: Event) => {
  const target = e.target as HTMLInputElement;
  let value = target.value;
  if (value === '') {
    value = '0';
  }
  speed.minPerMi = value;
});

distanceEl.addEventListener('input', (e: Event) => {
  const target = e.target as HTMLInputElement;
  const value = Number(target.value)


  // check value empty

  // if duration value empty
  //   calculate duration: distance * pace

  // else
  //   show buttons: recalculate pace + recalculate duration
  paceBtn?.style.setProperty('display', 'block')
  durationBtn?.style.setProperty('display', 'block')
})


interface DurationProxy {
  seconds: number;
  keepInput: boolean;
}
const duration = new Proxy<DurationProxy>(
  {
    seconds: 0,
    keepInput: false,
  },
  {
    set(target, prop, value) {
      if (prop === 'keepInput' && typeof value === 'boolean') {
        target.keepInput = value
      }
      if (prop === 'seconds' && typeof value === 'number') {
        target.seconds = value;
        if (!target.keepInput) {
          durationEl.value = convertDuration(target.seconds,
            durationUnitSel.value as DurationUnit);
        }
      }
      return true; // Proxy set traps must return a boolean indicating success
    },
  }
);

const parseDuration = (durStr: string) => {
  let durationInS = 0
  const parts = durStr.split(':')
  if (parts.length > 3) {
    return 0
  }
  if (parts.length === 1) {

    if (durationUnitSel.value === 'hours') {

      const h = Number(parts[0])
      if (isNaN(h)) {
        return 0
      }
      durationInS = h * MIN_IN_H * SEC_IN_MIN;
    }
    if (durationUnitSel.value === 'mins') {
      const m = Number(parts[0])
      if (isNaN(m)) {
        return 0
      }
      durationInS = m * SEC_IN_MIN;
    }
  }

  if (parts.length === 2) {

    if (durationUnitSel.value === 'hours') {

      const h = Number(parts[0])
      const m = Number(parts[1])
      if (isNaN(h) || isNaN(m)) {
        return 0
      }
      durationInS = h * MIN_IN_H * SEC_IN_MIN + m * SEC_IN_MIN;
    }
    if (durationUnitSel.value === 'mins') {
      const m = Number(parts[0])
      const s = Number(parts[1])
      if (isNaN(m) || isNaN(s)) {
        return 0
      }
      durationInS = m * SEC_IN_MIN + s;
    }

  }
  if (parts.length === 3) {
    durationUnitSel.value = 'hours'

    const h = Number(parts[0])
    const m = Number(parts[1])
    const s = Number(parts[2])
    if (isNaN(h) || isNaN(m) || isNaN(s)) {
      return 0
    }
    durationInS = h * MIN_IN_H * SEC_IN_MIN + m * SEC_IN_MIN + s;

  }
  return durationInS
}


durationEl.addEventListener('input', (e: Event) => {

  const target = e.target as HTMLInputElement;
  const value = target.value

  const durationInS = parseDuration(value)
  duration.keepInput = true
  duration.seconds = durationInS
})

const convertDistance = (distance: Distance, targetUnit: DistanceUnit) => {
  // @ts-ignore
  return distanceConversion[distance.unit][targetUnit](distance.value)
}


durationUnitSel.addEventListener('change', (e: Event) => {
  const target = e.target as HTMLInputElement;
  const unit = target.value as DurationUnit

  durationEl.value = convertDuration(duration.seconds, unit)
})

const convertDuration = (seconds: number, unit: DurationUnit) => {
  if (seconds === 0) {
    return ''
  }

  if (unit === "hours") {
    const SEC_IN_H = SEC_IN_MIN * MIN_IN_H;

    const h = Math.trunc(seconds / SEC_IN_H)

    seconds = seconds % SEC_IN_H
    const m = Math.trunc(seconds / SEC_IN_MIN)
    seconds = seconds % SEC_IN_MIN

    const minStr = String(m).padStart(2, '0');
    const secStr = String(seconds).padStart(2, '0');

    return `${h}:${minStr}:${secStr}`
  } else if (unit === "mins") {

    const m = Math.trunc(seconds / SEC_IN_MIN)
    seconds = seconds % SEC_IN_MIN

    const secStr = String(seconds).padStart(2, '0');

    return `${m}:${secStr}`
  }
  return ''
}

const distanceUnit = new Proxy<{ previousValue: DistanceUnit }>({
  previousValue: 'km'
}, {
  set(target, prop, value) {
    if (prop === 'previousValue' && typeof value === 'string') {
      target[prop] = value as DistanceUnit
    }
    return true
  }
})

distanceUnitSel.addEventListener('change', (e: Event) => {
  const target = e.target as HTMLInputElement;
  const unit = target.value as DistanceUnit

  const previousDistance = Number(distanceEl.value)
  if (isNaN(previousDistance)) {
    distanceUnit.previousValue = unit
    return
  }

  //  todo save distance as meters
  const distance = convertDistance({
    value: previousDistance,
    unit: distanceUnit.previousValue
  }, unit)

  if (distanceEl) {
    distanceEl.value = String(distance.toFixed(2))
  }
  distanceUnit.previousValue = unit
})


distanceBtn.addEventListener('click', (e) => {
  if (duration.seconds === 0 || speed.kmph === 0) {
    return
  }
  const unit = distanceUnitSel.value as DistanceUnit

  const newDistanceInKm = speed.kmph * duration.seconds / (SEC_IN_MIN * MIN_IN_H)
  const newDistance = (unit === 'km')
    ? newDistanceInKm
    : convertDistance({ value: newDistanceInKm, unit: 'km' }, unit)
  distanceEl.value = newDistance
})

durationBtn.addEventListener('click', (e) => {
  const distance = Number(distanceEl.value)
  if (isNaN(distance) || distance === 0 || speed.kmph === 0) {
    return
  }
  let distanceInKm = (distanceUnitSel.value === 'km')
    ? distance
    : convertDistance({ value: distance, unit: 'km' }, 'km')

  duration.keepInput = false;
  duration.seconds = calculateDurationInS(speed.kmph, distanceInKm)
})

const calculateDurationInS = (kmph: number, km: number) => {
  return km / kmph * MIN_IN_H * SEC_IN_MIN;
}

// if (distance.value !== 0 && speed.kmph !== 0 && paceBtn) {
//   paceBtn.disabled = false
// }
