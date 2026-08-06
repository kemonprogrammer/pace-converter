export type DistanceUnit = 'km' | 'mi' | 'm';
export type DurationUnit = 'hours' | 'mins';


const M_IN_KM = 1000;
const KM_IN_MILE = 1.60934;
const MIN_IN_H = 60;
const SEC_IN_MIN = 60;
const KM_IN_HALF_MARATHON = 21.0975;

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

export const calculateCommonTargets = (kmph: number) => {
  const time5k = calculateDurationInS(kmph, 5)
  const time10k = time5k * 2
  const time21k = calculateDurationInS(kmph, KM_IN_HALF_MARATHON)
  const time42k = time21k * 2

  return {
      time5k: convertDuration(time5k, 'hours'),
      time10k: convertDuration(time10k, 'hours'),
      time21k: convertDuration(time21k, 'hours'),
      time42k: convertDuration(time42k, 'hours'),
  }
}

export const calculateDurationInS = (kmph: number, km: number) => {
  return km / kmph * MIN_IN_H * SEC_IN_MIN;
}

export const calculateSpeed = (km: number, sec: number) => {
  return km * SEC_IN_MIN * MIN_IN_H / sec
}

export const calculateDistance = (kmph: number, seconds: number) => {
  return kmph * seconds / (SEC_IN_MIN * MIN_IN_H)
}



// todo refactor
export const parseDuration = (durStr: string, unit: DurationUnit) => {
  let durationInS = 0
  // colon separators
  const colonParts = durStr.split(':')
  if (colonParts.length > 3) {
    return {}
  }

  if (colonParts.length === 1) {
    if (unit === 'hours') {

      const h = Number(colonParts[0])
      if (isNaN(h)) {
        return {}
      }
      durationInS = h * MIN_IN_H * SEC_IN_MIN;
    }
    if (unit === 'mins') {
      const m = Number(colonParts[0])
      if (isNaN(m)) {
        return {}
      }
      durationInS = m * SEC_IN_MIN;
    }
  }

  if (colonParts.length === 2) {
    if (unit === 'hours') {
      const h = Number(colonParts[0])
      const m = Number(colonParts[1])
      if (isNaN(h) || isNaN(m)) {
        return {}
      }
      durationInS = h * MIN_IN_H * SEC_IN_MIN + m * SEC_IN_MIN;
    }

    if (unit === 'mins') {
      const m = Number(colonParts[0])
      const s = Number(colonParts[1])
      if (isNaN(m) || isNaN(s)) {
        return {}
      }
      durationInS = m * SEC_IN_MIN + s;
    }
  }

  if (colonParts.length === 3) {
    const h = Number(colonParts[0])
    const m = Number(colonParts[1])
    const s = Number(colonParts[2])
    if (isNaN(h) || isNaN(m) || isNaN(s)) {
      return {}
    }
    durationInS = h * MIN_IN_H * SEC_IN_MIN + m * SEC_IN_MIN + s;
    unit = 'hours'
  }

  // compact time unit notation: 1h30m45s
  // todo later: try parser

  // examples:
  // 1h -> hour, 1:00:00, 1h
  // 1h30 -> hour, 1:30:00, 1h30
  // 30m -> mins, 30:00, 30m
  // 30m30s -> m, 30:30, 30m30s
  // 30m30s -> m, 30:30, 30m30s


  const hmsParts = durStr.split('m')




  return {
    durationInS,
    unit
  }
}

class DurationParser {
  #value: string;
  #i: number = 0;
  #durationInS = 0;

  constructor(value: string) {
    this.#value = value
  }

  parseHMS(): number {
    const valid = this.#validate(
      this.#opt(
        () => this.#num(),
        () => this.#char('h'),
      ),
      this.#opt(
        () => this.#num(),
        () => this.#char('m'),
      ),
      this.#opt(
        () => this.#num(),
        () => this.#char('s'),
      ),
    )
    return valid ? this.#durationInS : 0

  }

  #validate(...args: boolean[]): boolean {
    return args.indexOf(false) === -1
  }

  #num(): boolean {
    const startI = this.#i

    while (this.#i < this.#value.length
      && /\d/.test(this.#value[this.#i])
    ) {
      this.#i++
    }
    if (startI === this.#i){
      return false
    }

    this.#durationInS += Number(this.#value.substring(startI, this.#i))

    return true
  }

  #char(c: string): boolean {
    if (this.#value[this.#i] !== c) {
      return false
    }
    this.#i++
    return true
  }

  #opt(...args: Array<() => boolean>): boolean {
    const curI = this.#i

    for (const arg of args) {
      if (!arg()) {
        this.#i = curI
        break
      }
    }
    return true
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


