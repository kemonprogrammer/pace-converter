const minPerKmEl = document.querySelector("#min-per-km")
const minPerMiEl = document.querySelector("#min-per-mile")
const kmphEl = document.querySelector("#km-per-h")
const mphEl = document.querySelector("#mile-per-h")
const durationEl = document.querySelector("#duration")
const distanceEl = document.querySelector("#distance")

const KM_IN_MILE = 1.60934
const MIN_IN_H = 60
const SEC_IN_MIN = 60

const speedConfig = [
  {
    el: minPerKmEl,
    key: 'minPerKm',
  }, {
    el: minPerMiEl,
    key: 'minPerMi',
  }, {
    el: kmphEl,
    key: 'kmph',
  }, {
    el: mphEl,
    key: 'mph',
  },
]

Object.freeze(speedConfig)

const minDecToStr = (minDec) => {
  let min = Math.trunc(minDec)
  let sec = Math.round((minDec - min) * SEC_IN_MIN)
  if (sec === 60) {
    sec = 0
    min += 1
  }
  const secStr = String(sec).padStart(2, '0')
  return `${min}:${secStr}`
}

const minStrToDec = (minStr) => {
  const parts = minStr.split(':')
  if (parts.length > 2) {
    // todo handle 2 colons for hour and err on 3 colons
    console.error("at most 1 ':' allowed")
    return
  }
  if (parts.length === 0) {
    console.error("no value provided")
    return
  }
  let min = 0
  let sec = 0

  min = parseInt(parts[0])
  if (min < 0 || isNaN(min)) {
    console.error(`Invalid value for minutes: ${min}`)
    return { min: 0, sec }
  }
  if (parts.length === 2) {
    sec = Number(parts[1])
    if (isNaN(sec) || sec < 0 || sec >= SEC_IN_MIN) {
      console.error(`Invalid value for seconds: ${sec}`)
      return { min, sec: 0 }
    }
    sec = sec / SEC_IN_MIN
  }
  return { min, sec }
}

const minPerMiInKmph = (minPerMi) => {
  const parts = minPerMi.split(':')

  const min = Number(parts[0])
  let sec = 0
  if (parts.length === 2) {
    sec = Number(parts[1]) / 60
  }
  const minPerMiDec = min + sec
  return KM_IN_MILE * MIN_IN_H / minPerMiDec;
}

const kmphInMinPerKm = (kmph) => {
  const minDec = MIN_IN_H / kmph
  return minDecToStr(minDec)
}

const kmphInMinPerMi = (kmph) => {
  const minDec = MIN_IN_H * KM_IN_MILE / kmph
  return minDecToStr(minDec)
}
const mphInKmph = (mph) => {
  return mph * KM_IN_MILE
}

const kmphInMph = (kmph) => {
  return kmph / KM_IN_MILE
}

const minPerKmInKmph = (minPerKm) => {
  const { min, sec } = minStrToDec(minPerKm)
  const pace = min + sec
  return MIN_IN_H / pace
}

const conversion = {
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
}


const speed = new Proxy({
  kmph: 0,
  minPerKm: 0,
  minPerMi: 0,
  mph: 0,
}, {
  set(obj, prop, val) {

    obj[prop] = val
    // calculate kmph
    if (prop !== 'kmph') {
      obj.kmph = conversion[prop].kmph(val)
    }

    const toUpdate = speedConfig.filter(s => s.key !== prop)
    const toRecalculate = toUpdate.map(s => s.key).filter(k => k !== 'kmph')

    // update other values from kmph
    for (let key of toRecalculate) {
      obj[key] = conversion.kmph[key](obj.kmph)
    }

    // update DOM values
    for (let config of toUpdate) {
      let value = obj[config.key]
      if (['mph', 'kmph'].indexOf(config.key) >= 0) {
        value = Number(value).toFixed(2);
      }
      config.el.value = value
    }

    return true
  },
})

kmphEl.addEventListener('input', (e) => {
  const value = e.target.value
  const kmph = parseFloat(value)
  if (isNaN(kmph)) {
    console.error(`Couldn't convert number ${value}, ${e}`)
    return
  }

  // handle "16.", shouldn't delete the dot
  if (kmph !== speed.kmph) {
    speed.kmph = kmph
  }
})

mphEl.addEventListener('input', (e) => {
  const value = e.target.value
  const mph = parseFloat(value)
  if (isNaN(mph)) {
    console.error(`Couldn't convert number ${value}, ${e}`)
    return
  }

  if (mph !== speed.mph) {
    speed.mph = mph
  }
})


minPerKmEl.addEventListener('input', (e) => {
  let value = e.target.value
  if (value === '') {
    value = '0'
  }
  speed.minPerKm = value
})

minPerMiEl.addEventListener('input', (e) => {
  let value = e.target.value
  if (value === '') {
    value = '0'
  }
  speed.minPerMi = value
})
