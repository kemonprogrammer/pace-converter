import { calculateDistance, calculateDurationInS, calculateSpeed, convertDistance, convertDuration, parseDuration, speedConversion, type DistanceUnit, type DurationUnit } from './util.ts';

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

const distanceRecalcBtn = getRequiredElement<HTMLInputElement>('#recalculate-distance');
const speedRecalcBtn = getRequiredElement<HTMLInputElement>('#recalculate-pace');
const durationRecalcBtn = getRequiredElement<HTMLInputElement>('#recalculate-time');




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



interface SpeedState {
  kmph: number;
  minPerKm: string;
  minPerMi: string;
  mph: number;
}


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


speedRecalcBtn.addEventListener('click', () => {
  const distance = Number(distanceEl.value)
  if (isNaN(distance)) {
    return
  }
  // distance to km
  const unit = distanceUnitSel.value as DistanceUnit
  const distanceInKm = (unit === 'km')
    ? distance
    : convertDistance(distance, unit, 'km')

  const kmph = calculateSpeed(distanceInKm, duration.seconds)
  speed.kmph = kmph
  // proxy setter fires on each input event and skips changing the 
  // current input to not mess up typing. Here no input is being typed on,
  // so we need to manually set input
  kmphEl.value = Number(kmph).toFixed(2);

})


distanceEl.addEventListener('input', (e: Event) => {
  const target = e.target as HTMLInputElement;
  const distance = Number(target.value)
  const showRecalcPaceBtn = !(isNaN(distance) || distance === 0 || duration.seconds === 0)
  speedRecalcBtn.style.setProperty('visibility', showRecalcPaceBtn ? 'visible' : 'hidden')
})


const distanceUnit = new Proxy<{ previous: DistanceUnit }>({
  previous: 'km'
}, {
  set(target, prop, value) {
    if (prop === 'previous' && typeof value === 'string') {
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
    distanceUnit.previous = unit
    return
  }

  //  todo save distance as meters
  const distance = convertDistance(previousDistance, distanceUnit.previous, unit)

  if (distance !== 0) {
    distanceEl.value = String(distance.toFixed(2))
  }
  distanceUnit.previous = unit
})


distanceRecalcBtn.addEventListener('click', () => {
  if (duration.seconds === 0 || speed.kmph === 0) {
    return
  }
  const unit = distanceUnitSel.value as DistanceUnit

  const distanceInKm = calculateDistance(speed.kmph, duration.seconds)
  const distance = (unit === 'km')
    ? distanceInKm
    : convertDistance(distanceInKm, 'km', unit)
  distanceEl.value = distance.toFixed(2)
})



durationEl.addEventListener('input', (e: Event) => {
  const target = e.target as HTMLInputElement;
  const value = target.value
  const previousUnit = durationUnitSel.value as DurationUnit

  const { durationInS, unit } = parseDuration(value, previousUnit)
  duration.keepInput = true
  duration.seconds = durationInS ?? 0
  durationUnitSel.value = unit ?? previousUnit

  // hide/ show other recalc buttons
  const distance = Number(distanceEl.value)
  const showRecalcPaceBtn = !(isNaN(distance) || distance === 0 || duration.seconds === 0)
  speedRecalcBtn.style.setProperty('visibility', showRecalcPaceBtn ? 'visible' : 'hidden')

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


durationUnitSel.addEventListener('change', (e: Event) => {
  const target = e.target as HTMLInputElement;
  const unit = target.value as DurationUnit

  durationEl.value = convertDuration(duration.seconds, unit)
})


durationRecalcBtn.addEventListener('click', () => {
  const distance = Number(distanceEl.value)
  if (isNaN(distance) || distance === 0 || speed.kmph === 0) {
    return
  }
  let distanceInKm = (distanceUnitSel.value === 'km')
    ? distance
    : convertDistance(distance, 'km', 'km')

  duration.keepInput = false;
  duration.seconds = calculateDurationInS(speed.kmph, distanceInKm)
})
