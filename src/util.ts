export type DistanceUnit = 'km' | 'mi' | 'm';
export type DurationUnit = 'hours' | 'mins';


const M_IN_KM = 1000;
const KM_IN_MILE = 1.60934;
const MIN_IN_H = 60;
const SEC_IN_MIN = 60;

export const minDecToStr = (minDec: number): string => {
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

export const minStrToDec = (minStr: string): DecResult | undefined => {
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

export const speedConversion = {
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

export const distanceConversion = {
  km: {
    m: (km: number) => km * M_IN_KM,
    mi: (km: number) => km / KM_IN_MILE,
  },
  m: {
    km: (m: number) => m / M_IN_KM,
    mi: (m: number) => m / (M_IN_KM * KM_IN_MILE),
  },
  mi: {
    m: (mi: number) => mi * M_IN_KM * KM_IN_MILE,
    km: (mi: number) => mi * KM_IN_MILE,
  },
} as const


export const convertDistance = (distance: number, sourceUnit: DistanceUnit, targetUnit: DistanceUnit) => {
  // @ts-ignore
  return distanceConversion[sourceUnit][targetUnit](distance)
}

export const calculateDurationInS = (kmph: number, km: number) => {
  return km / kmph * MIN_IN_H * SEC_IN_MIN;
}

export const calculateSpeed = (km: number, sec: number)=>{
  return km * SEC_IN_MIN * MIN_IN_H / sec
}

export const calculateDistance = (kmph: number, seconds: number) => {
  return kmph * seconds / (SEC_IN_MIN * MIN_IN_H)
}



// todo refactor
export const parseDuration = (durStr: string, unit: DurationUnit) => {
  let durationInS = 0
  const parts = durStr.split(':')
  if (parts.length > 3) {
    return {}
  }

  if (parts.length === 1) {
    if (unit === 'hours') {

      const h = Number(parts[0])
      if (isNaN(h)) {
        return {}
      }
      durationInS = h * MIN_IN_H * SEC_IN_MIN;
    }
    if (unit === 'mins') {
      const m = Number(parts[0])
      if (isNaN(m)) {
        return {}
      }
      durationInS = m * SEC_IN_MIN;
    }
  }

  if (parts.length === 2) {
    if (unit === 'hours') {
      const h = Number(parts[0])
      const m = Number(parts[1])
      if (isNaN(h) || isNaN(m)) {
        return {}
      }
      durationInS = h * MIN_IN_H * SEC_IN_MIN + m * SEC_IN_MIN;
    }

    if (unit === 'mins') {
      const m = Number(parts[0])
      const s = Number(parts[1])
      if (isNaN(m) || isNaN(s)) {
        return {}
      }
      durationInS = m * SEC_IN_MIN + s;
    }
  }

  if (parts.length === 3) {
    const h = Number(parts[0])
    const m = Number(parts[1])
    const s = Number(parts[2])
    if (isNaN(h) || isNaN(m) || isNaN(s)) {
      return {}
    }
    durationInS = h * MIN_IN_H * SEC_IN_MIN + m * SEC_IN_MIN + s;
    unit = 'hours'
  }
  return {
    durationInS,
    unit
  }
}


// todo refactor and replace minDecToStr
export const convertDuration = (seconds: number, unit: DurationUnit) => {
  if (seconds === 0) {
    return ''
  }

  if (unit === "hours") {
    const SEC_IN_H = SEC_IN_MIN * MIN_IN_H;

    const h = Math.trunc(seconds / SEC_IN_H)

    seconds = seconds % SEC_IN_H
    const m = Math.trunc(seconds / SEC_IN_MIN)
    seconds = Math.round(seconds % SEC_IN_MIN)

    const minStr = String(m).padStart(2, '0');
    const secStr = String(seconds).padStart(2, '0');

    return `${h}:${minStr}:${secStr}`
  } else if (unit === "mins") {

    const m = Math.trunc(seconds / SEC_IN_MIN)
    seconds = Math.round(seconds % SEC_IN_MIN)

    const secStr = String(seconds).padStart(2, '0');

    return `${m}:${secStr}`
  }
  return ''
}
